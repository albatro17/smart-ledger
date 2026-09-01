import React, { useState, useEffect, useMemo } from 'react';
import type { AssetItem, AssetCategory } from '../../types';
import { formatWon, generateUUID } from '../../lib/utils';
import { getSupabaseClient } from '../../lib/supabase';
import {
  Building2,
  Car,
  PiggyBank,
  CreditCard,
  Wallet,
  Plus,
  Edit2,
  Trash2,
  ShieldCheck,
  PieChart as PieIcon,
  TrendingUp,
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
    amount: 850000000,
    isLiability: false,
    memo: '서울 성동구 아파트',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'asset-2',
    name: '제네시스 GV70 (중고 시세)',
    category: '자동차',
    amount: 45000000,
    isLiability: false,
    memo: '2023년식 무사고',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'asset-3',
    name: '개인연금저축 & IRP 계좌',
    category: '개인연금',
    amount: 32000000,
    isLiability: false,
    memo: '세액공제 연금 펀드 계좌',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'asset-4',
    name: '주택담보대출',
    category: '대출',
    amount: 250000000,
    isLiability: true,
    memo: '변동금리 3.85%',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'asset-5',
    name: '마이너스 통장 & 신용대출',
    category: '대출',
    amount: 20000000,
    isLiability: true,
    memo: '시중은행 신용대출',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'asset-6',
    name: '주거래은행 예적금 & 비상금',
    category: '예적금/현금',
    amount: 15000000,
    isLiability: false,
    memo: '파킹통장 및 정기예금',
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

  const getCategoryIcon = (cat: AssetCategory) => {
    switch (cat) {
      case '부동산':
        return <Building2 className="w-5 h-5 text-blue-500" />;
      case '자동차':
        return <Car className="w-5 h-5 text-emerald-500" />;
      case '개인연금':
        return <PiggyBank className="w-5 h-5 text-purple-500" />;
      case '대출':
        return <CreditCard className="w-5 h-5 text-rose-500" />;
      case '예적금/현금':
        return <Wallet className="w-5 h-5 text-amber-500" />;
      default:
        return <ShieldCheck className="w-5 h-5 text-slate-400" />;
    }
  };

  const CATEGORY_LIST: Array<{ key: AssetCategory; title: string; desc: string }> = [
    { key: '부동산', title: '🏠 부동산 (아파트·전세보증금 등)', desc: '소유 아파트, 주택, 자가 및 전월세 보증금' },
    { key: '자동차', title: '🚗 자동차 (차량 시세)', desc: '현재 소유 차량 시세 가치' },
    { key: '개인연금', title: '📈 개인연금 & 투자 (IRP·연금저축 등)', desc: '개인연금저축, IRP, 펀드, 주식 평가액' },
    { key: '대출', title: '🏦 대출 & 부채 현황 (주담대·신용대출)', desc: '주택담보대출, 신용대출, 카드론 등 차입금' },
    { key: '예적금/현금', title: '💰 예적금 & 현금 자산', desc: '은행 예적금, 파킹통장, 입출금 현금' },
  ];

  return (
    <div className="space-y-6">
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

      {/* Asset Allocation Chart & Summary Banner Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Asset Distribution Donut Chart */}
        <div className="p-5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                  <PieIcon className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">자산 구성 포트폴리오</h4>
              </div>
              <span className="text-xs text-slate-400">자산 비중</span>
            </div>

            <div className="h-60 relative">
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
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
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
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
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

        {/* Detailed Category Items Cards (2 Columns Layout) */}
        <div className="lg:col-span-2 space-y-4">
          {CATEGORY_LIST.map((catConfig) => {
            const catItems = assets.filter((a) => a.category === catConfig.key);
            const totalCatAmount = catItems.reduce((acc, curr) => acc + curr.amount, 0);

            return (
              <div
                key={catConfig.key}
                className="p-4 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(catConfig.key)}
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                        {catConfig.title}
                      </h4>
                      <p className="text-[11px] text-slate-400">{catConfig.desc}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                      {catConfig.key === '대출' ? `-${formatWon(totalCatAmount)}` : formatWon(totalCatAmount)}
                    </span>

                    <button
                      onClick={() => handleOpenAddModal(catConfig.key)}
                      className="p-1 rounded-lg text-emerald-500 hover:bg-emerald-500/10 border border-emerald-500/20 transition-all text-xs font-bold flex items-center gap-1 px-2"
                      title="추가"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      등록
                    </button>
                  </div>
                </div>

                {/* Items List */}
                {catItems.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2 text-center">
                    등록된 {catConfig.key} 항목이 없습니다. 우측 [등록] 버튼을 눌러 추가하세요.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {catItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            {item.name}
                            {item.isLiability && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-500/15 text-rose-500 font-bold">
                                대출/부채
                              </span>
                            )}
                          </div>
                          {item.memo && <div className="text-[11px] text-slate-400 mt-0.5">💬 {item.memo}</div>}
                        </div>

                        <div className="flex items-center gap-3">
                          <span className={`font-mono font-black text-sm ${item.isLiability ? 'text-rose-500' : 'text-slate-900 dark:text-slate-100'}`}>
                            {item.isLiability ? `-${formatWon(item.amount)}` : formatWon(item.amount)}
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                              title="수정"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1 text-slate-400 hover:text-rose-500"
                              title="삭제"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
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
                    placeholder="예: 서울 아파트 시세, 제네시스 GV70, 주택담보대출"
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
                    placeholder="예: 금리 3.8%, 2023년 매수 등"
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
