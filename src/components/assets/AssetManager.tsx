import React, { useState, useEffect, useMemo } from 'react';
import type { AssetItem, AssetCategory } from '../../types';
import { formatWon, generateUUID } from '../../lib/utils';
import { getSupabaseClient } from '../../lib/supabase';
import {
  Building2,
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  ShieldCheck,
  PieChart as PieIcon,
  TrendingUp,
  Filter,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useTheme } from '../../context/ThemeContext';

const ASSETS_STORAGE_KEY = 'voca_ledger_user_assets_v1';
const SYSTEM_ASSETS_CAT_ID = '00000000-0000-0000-0000-000000000001';

const DEFAULT_SAMPLE_ASSETS: AssetItem[] = [
  {
    id: 'asset-1',
    name: '아파트 (시세 감정가)',
    category: '부동산',
    amount: 1270000000,
    isLiability: false,
    memo: '경기도 미사강변 리슈빌 아파트',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'asset-2',
    name: '싼타페 (중고 시세)',
    category: '자동차',
    amount: 19000000,
    isLiability: false,
    memo: '2018년식 무사고',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'asset-3',
    name: '우체국 개인연금',
    category: '개인연금',
    amount: 53180000,
    isLiability: false,
    memo: '우체국 개인연금 (대출 이용)',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'asset-4',
    name: '삼성증권 펀드/주식',
    category: '개인연금',
    amount: 52780000,
    isLiability: false,
    memo: '연금저축 펀드 계좌',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'asset-5',
    name: '신용대출 1차',
    category: '대출',
    amount: 59200000,
    isLiability: true,
    memo: '변동금리 4.47%',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'asset-6',
    name: '신용대출 2차',
    category: '대출',
    amount: 10000000,
    isLiability: true,
    memo: '고정금리 4.24%',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'asset-7',
    name: '주거래 은행 비상금',
    category: '예적금/현금',
    amount: 9900000,
    isLiability: false,
    memo: '파킹통장 현금',
    updated_at: new Date().toISOString(),
  },
];

export const AssetManager: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [assets, setAssets] = useState<AssetItem[]>(() => {
    try {
      const saved = localStorage.getItem(ASSETS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_SAMPLE_ASSETS;
  });

  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'ALL' | AssetCategory>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AssetItem | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    category: AssetCategory;
    amount: string;
    isLiability: boolean;
    memo: string;
  }>({
    name: '',
    category: '부동산',
    amount: '',
    isLiability: false,
    memo: '',
  });

  // Save to LocalStorage & Supabase Cloud
  const persistAssets = async (newAssets: AssetItem[]) => {
    setAssets(newAssets);
    localStorage.setItem(ASSETS_STORAGE_KEY, JSON.stringify(newAssets));

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('categories').upsert([
          {
            id: SYSTEM_ASSETS_CAT_ID,
            name: 'system_user_assets',
            type: '이체',
            icon: '🏛️',
            color: '#10B981',
            keywords: [JSON.stringify(newAssets)],
            is_default: false,
          },
        ]);
      } catch (e) {
        console.error('Failed to sync assets to cloud', e);
      }
    }
  };

  // Sync from Cloud on mount
  useEffect(() => {
    const syncCloudAssets = async () => {
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          const { data } = await supabase
            .from('categories')
            .select('*')
            .eq('id', SYSTEM_ASSETS_CAT_ID)
            .maybeSingle();

          if (data && data.keywords && data.keywords[0]) {
            const cloudAssets = JSON.parse(data.keywords[0]);
            if (Array.isArray(cloudAssets) && cloudAssets.length > 0) {
              setAssets(cloudAssets);
              localStorage.setItem(ASSETS_STORAGE_KEY, JSON.stringify(cloudAssets));
            }
          }
        } catch (e) {}
      }
    };
    syncCloudAssets();
  }, []);

  // Total Metrics Calculations
  const metrics = useMemo(() => {
    let totalAssets = 0;
    let totalLiabilities = 0;

    assets.forEach((item) => {
      if (item.isLiability) {
        totalLiabilities += item.amount;
      } else {
        totalAssets += item.amount;
      }
    });

    const netWorth = totalAssets - totalLiabilities;
    const debtRatio = totalAssets > 0 ? Math.round((totalLiabilities / totalAssets) * 100) : 0;

    return {
      totalAssets,
      totalLiabilities,
      netWorth,
      debtRatio,
    };
  }, [assets]);

  // Donut Chart Data
  const chartData = useMemo(() => {
    const map = new Map<AssetCategory, number>();
    assets.forEach((item) => {
      if (!item.isLiability && item.amount > 0) {
        map.set(item.category, (map.get(item.category) || 0) + item.amount);
      }
    });

    const categoryColors: Record<AssetCategory, string> = {
      부동산: '#3B82F6',
      자동차: '#10B981',
      개인연금: '#A855F7',
      대출: '#EF4444',
      '예적금/현금': '#F59E0B',
      기타: '#64748B',
    };

    return Array.from(map.entries()).map(([cat, val]) => ({
      name: cat,
      value: val,
      color: categoryColors[cat] || '#94A3B8',
    }));
  }, [assets]);

  // Filtered Assets List
  const filteredAssets = useMemo(() => {
    if (activeCategoryFilter === 'ALL') return assets;
    return assets.filter((a) => a.category === activeCategoryFilter);
  }, [assets, activeCategoryFilter]);

  // Modal Open Handlers
  const handleOpenAddModal = (defaultCat: AssetCategory = '부동산') => {
    setEditingItem(null);
    setFormData({
      name: '',
      category: defaultCat,
      amount: '',
      isLiability: defaultCat === '대출',
      memo: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: AssetItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      amount: item.amount.toString(),
      isLiability: item.isLiability,
      memo: item.memo || '',
    });
    setIsModalOpen(true);
  };

  const handleDeleteItem = (id: string) => {
    if (confirm('이 자산 항목을 삭제하시겠습니까?')) {
      const next = assets.filter((a) => a.id !== id);
      persistAssets(next);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.amount) return;

    const numAmount = Math.abs(Number(formData.amount));
    if (isNaN(numAmount)) return;

    if (editingItem) {
      const updated = assets.map((item) =>
        item.id === editingItem.id
          ? {
              ...item,
              name: formData.name.trim(),
              category: formData.category,
              amount: numAmount,
              isLiability: formData.category === '대출' ? true : formData.isLiability,
              memo: formData.memo.trim(),
              updated_at: new Date().toISOString(),
            }
          : item
      );
      persistAssets(updated);
    } else {
      const newItem: AssetItem = {
        id: generateUUID(),
        name: formData.name.trim(),
        category: formData.category,
        amount: numAmount,
        isLiability: formData.category === '대출' ? true : formData.isLiability,
        memo: formData.memo.trim(),
        updated_at: new Date().toISOString(),
      };
      persistAssets([...assets, newItem]);
    }

    setIsModalOpen(false);
  };

  const getCategoryBadge = (cat: AssetCategory) => {
    switch (cat) {
      case '부동산':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">🏠 부동산</span>;
      case '자동차':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">🚗 자동차</span>;
      case '개인연금':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">📈 개인연금</span>;
      case '대출':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">🏦 대출/부채</span>;
      case '예적금/현금':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">💰 예적금</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">🏷️ 기타</span>;
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            🏛️ 순자산 & 자산종합 현황 대시보드
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            부동산, 자동차, 개인연금, 대출 현황을 직접 등록하여 총 자산과 순자산을 실시간으로 관리하세요.
          </p>
        </div>

        <button
          onClick={() => handleOpenAddModal('부동산')}
          className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 transition-all"
        >
          <Plus className="w-4 h-4" />
          신규 자산/부채 추가
        </button>
      </div>

      {/* Primary KPI Cards Grid (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. 순 자산 (Net Worth) */}
        <motion.div
          whileHover={{ y: -3 }}
          className="p-5 rounded-2xl glass-panel border-l-4 border-l-emerald-500 shadow-md relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">내 순 자산 (Net Worth)</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className={`text-2xl font-black tracking-tight font-mono ${metrics.netWorth >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
              {formatWon(metrics.netWorth)}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">총 자산에서 부채를 뺀 실질 자산</p>
          </div>
        </motion.div>

        {/* 2. 총 자산 (Total Assets) */}
        <motion.div
          whileHover={{ y: -3 }}
          className="p-5 rounded-2xl glass-panel border-l-4 border-l-blue-500 shadow-md relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">총 자산 (Total Assets)</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tight font-mono">
              {formatWon(metrics.totalAssets)}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">부동산·연금·차량·현금 합계</p>
          </div>
        </motion.div>

        {/* 3. 총 부채/대출 (Total Liabilities) */}
        <motion.div
          whileHover={{ y: -3 }}
          className="p-5 rounded-2xl glass-panel border-l-4 border-l-rose-500 shadow-md relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">총 대출 & 부채</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight font-mono">
              -{formatWon(metrics.totalLiabilities)}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">주담대·신용대출 총잔액</p>
          </div>
        </motion.div>

        {/* 4. 부채 비율 (Debt Ratio) */}
        <motion.div
          whileHover={{ y: -3 }}
          className="p-5 rounded-2xl glass-panel border-l-4 border-l-purple-500 shadow-md relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">부채 비율 (%)</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-purple-500/20 text-purple-600 dark:text-purple-300">
              {metrics.debtRatio}%
            </span>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
              {metrics.debtRatio}%
            </h3>
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-purple-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, metrics.debtRatio)}%` }}
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Balanced Portfolio & Category Summary Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Compact Portfolio Chart (4 cols) */}
        <div className="lg:col-span-4 p-5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                <PieIcon className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">자산 구성 비중</h4>
            </div>
            <span className="text-xs text-slate-400">포트폴리오</span>
          </div>

          <div className="h-48 relative">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                등록된 자산이 없습니다.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartData.map((entry, idx) => (
                      <Cell key={`asset-cell-${idx}`} fill={entry.color} stroke={isDark ? '#1e293b' : '#ffffff'} strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [formatWon(Number(val) || 0), '평가액']}
                    contentStyle={{
                      backgroundColor: isDark ? '#0f172a' : '#ffffff',
                      borderColor: isDark ? '#334155' : '#cbd5e1',
                      borderRadius: '12px',
                      color: isDark ? '#ffffff' : '#0f172a',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1 text-xs">
            {chartData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{item.name}</span>
                </div>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{formatWon(item.value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Category Quick Summary Badges (8 cols) */}
        <div className="lg:col-span-8 p-5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              카테고리별 자산/대출 요약
            </h4>
            <span className="text-xs text-slate-400">총 {assets.length}개 항목</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {(['부동산', '자동차', '개인연금', '대출', '예적금/현금'] as const).map((cat) => {
              const catItems = assets.filter((a) => a.category === cat);
              const sum = catItems.reduce((acc, curr) => acc + curr.amount, 0);

              return (
                <div
                  key={cat}
                  onClick={() => setActiveCategoryFilter(activeCategoryFilter === cat ? 'ALL' : cat)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    activeCategoryFilter === cat
                      ? 'border-emerald-500 bg-emerald-500/10 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {getCategoryBadge(cat)}
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                      ({catItems.length}건)
                    </span>
                  </div>
                  <span className={`font-mono font-black text-xs ${cat === '대출' ? 'text-rose-500' : 'text-slate-900 dark:text-slate-100'}`}>
                    {cat === '대출' ? `-${formatWon(sum)}` : formatWon(sum)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Unified Balanced Assets & Liabilities Management Table */}
      <div className="p-5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-emerald-500" />
              세부 자산 & 부채 항목 관리 목록
            </h4>
            <span className="text-xs text-slate-400 font-mono">({filteredAssets.length}건)</span>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1 flex-wrap text-xs">
            {(['ALL', '부동산', '자동차', '개인연금', '대출', '예적금/현금'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                  activeCategoryFilter === cat
                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {cat === 'ALL' ? '전체' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Clean Items Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/70 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                <th className="py-3 px-4 w-28">구분</th>
                <th className="py-3 px-4">자산 / 부채 항목명</th>
                <th className="py-3 px-4 hidden md:table-cell">비고 / 메모</th>
                <th className="py-3 px-4 text-right">평가 금액 (원)</th>
                <th className="py-3 px-4 text-center w-20">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    등록된 항목이 없습니다. 상단 [+ 신규 자산/부채 추가] 버튼을 눌러보세요.
                  </td>
                </tr>
              ) : (
                filteredAssets.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4">{getCategoryBadge(item.category)}</td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {item.name}
                      </span>
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell text-slate-500 dark:text-slate-400">
                      {item.memo || '-'}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-black text-sm">
                      <span className={item.isLiability ? 'text-rose-500' : 'text-slate-900 dark:text-slate-100'}>
                        {item.isLiability ? `-${formatWon(item.amount)}` : formatWon(item.amount)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          title="수정"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Asset Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md p-6 rounded-3xl glass-panel bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  {editingItem ? '자산/부채 항목 수정' : '신규 자산/부채 항목 등록'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    카테고리 구분
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => {
                      const cat = e.target.value as AssetCategory;
                      setFormData((prev) => ({
                        ...prev,
                        category: cat,
                        isLiability: cat === '대출',
                      }));
                    }}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold"
                  >
                    <option value="부동산">🏠 부동산 (아파트/주택/전세보증금)</option>
                    <option value="자동차">🚗 자동차 (차량 시세)</option>
                    <option value="개인연금">📈 개인연금 (IRP/연금저축)</option>
                    <option value="대출">🏦 대출 & 부채 (주담대/신용대출)</option>
                    <option value="예적금/현금">💰 예적금 & 현금</option>
                    <option value="기타">🏷️ 기타 자산</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    자산 / 대출 항목명
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="예: 경기도 미사강변 리슈빌 아파트, 싼타페, 신용대출"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    금액 (원)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="10000"
                    value={formData.amount}
                    onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                    placeholder="금액 입력 (원)"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {formData.amount && (
                    <p className="text-[11px] text-emerald-500 font-mono font-bold mt-1">
                      = {formatWon(Number(formData.amount))}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    비고 / 메모 (선택)
                  </label>
                  <input
                    type="text"
                    value={formData.memo}
                    onChange={(e) => setFormData((prev) => ({ ...prev, memo: e.target.value }))}
                    placeholder="예: 변동금리 4.47%, 2018년식 무사고 등"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-500/25"
                  >
                    {editingItem ? '수정 완료' : '등록 완료'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
