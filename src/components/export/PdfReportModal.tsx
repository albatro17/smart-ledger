import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLedger } from '../../context/LedgerContext';
import type { AssetItem, AssetCategory } from '../../types';
import { formatWon, formatCurrency } from '../../lib/utils';
import {
  X,
  Printer,
  FileText,
  Calendar,
  Building2,
  ListFilter,
  LayoutDashboard,
} from 'lucide-react';

interface PdfReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ASSETS_STORAGE_KEY = 'voca_ledger_user_assets_v1';

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

export const PdfReportModal: React.FC<PdfReportModalProps> = ({ isOpen, onClose }) => {
  const { transactions, categories, filters } = useLedger();

  // Selected Month for report (defaults to active filter month or current month)
  const [reportMonth, setReportMonth] = useState<string>(
    filters.month || new Date().toISOString().slice(0, 7)
  );

  // Inclusion options for the 4 core sections
  const [includeDashboard, setIncludeDashboard] = useState<boolean>(true);
  const [includeCalendar, setIncludeCalendar] = useState<boolean>(true);
  const [includeAssets, setIncludeAssets] = useState<boolean>(true);
  const [includeTransactions, setIncludeTransactions] = useState<boolean>(true);

  // Load assets from localStorage or fallback
  const assets = useMemo<AssetItem[]>(() => {
    try {
      const saved = localStorage.getItem(ASSETS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_SAMPLE_ASSETS;
  }, []);

  // Filter transactions for report month
  const monthTransactions = useMemo(() => {
    return transactions.filter(
      (t) => t.transaction_date && t.transaction_date.startsWith(reportMonth)
    );
  }, [transactions, reportMonth]);

  // Excluded category map
  const excludedCatMap = useMemo(() => {
    const set = new Set<string>();
    categories.forEach((c) => {
      if (c.is_excluded_from_total) {
        set.add(c.name);
        set.add(c.id);
      }
    });
    return set;
  }, [categories]);

  // 1. Dashboard Financial Metrics Calculation
  const financialMetrics = useMemo(() => {
    let income = 0;
    let expense = 0;
    let fixedExpense = 0;
    let variableExpense = 0;

    const categoryMap = new Map<string, { name: string; icon: string; count: number; amount: number }>();

    monthTransactions.forEach((t) => {
      const isExcluded =
        excludedCatMap.has(t.category) || (t.category_id && excludedCatMap.has(t.category_id));

      if (t.flow_type === '수입') {
        income += t.amount;
      } else if (t.flow_type === '지출' || t.flow_type === '이체') {
        if (!isExcluded) {
          expense += t.amount;
          if (t.expense_nature === '고정비') {
            fixedExpense += t.amount;
          } else {
            variableExpense += t.amount;
          }

          // Category aggregation
          const catName = t.category || '미분류';
          if (!categoryMap.has(catName)) {
            const catObj = categories.find((c) => c.name === catName || c.id === t.category_id);
            categoryMap.set(catName, {
              name: catName,
              icon: catObj?.icon || '🏷️',
              count: 0,
              amount: 0,
            });
          }
          const catEntry = categoryMap.get(catName)!;
          catEntry.count += 1;
          catEntry.amount += t.amount;
        }
      }
    });

    const fixedRatio = expense > 0 ? Math.round((fixedExpense / expense) * 100) : 0;
    const variableRatio = expense > 0 ? Math.round((variableExpense / expense) * 100) : 0;

    const sortedCategories = Array.from(categoryMap.values()).sort((a, b) => b.amount - a.amount);

    return {
      income,
      expense,
      netProfit: income - expense,
      fixedExpense,
      variableExpense,
      fixedRatio,
      variableRatio,
      sortedCategories,
    };
  }, [monthTransactions, excludedCatMap, categories]);

  // 2. Calendar Ledger Data Calculation
  const calendarData = useMemo(() => {
    const [y, m] = reportMonth.split('-').map(Number);
    const firstDay = new Date(y, m - 1, 1).getDay(); // 0 = Sun
    const totalDays = new Date(y, m, 0).getDate();

    const dailyMap = new Map<number, { income: number; expense: number; count: number }>();

    monthTransactions.forEach((t) => {
      const isExcluded =
        excludedCatMap.has(t.category) || (t.category_id && excludedCatMap.has(t.category_id));
      const dayNum = Number(t.transaction_date.slice(8, 10));
      if (!dailyMap.has(dayNum)) {
        dailyMap.set(dayNum, { income: 0, expense: 0, count: 0 });
      }
      const entry = dailyMap.get(dayNum)!;
      entry.count += 1;
      if (t.flow_type === '수입') {
        entry.income += t.amount;
      } else if ((t.flow_type === '지출' || t.flow_type === '이체') && !isExcluded) {
        entry.expense += t.amount;
      }
    });

    let expenseDaysCount = 0;
    dailyMap.forEach((d) => {
      if (d.expense > 0) expenseDaysCount++;
    });

    const avgDailyExpense =
      expenseDaysCount > 0 ? Math.round(financialMetrics.expense / expenseDaysCount) : 0;

    return {
      year: y,
      month: m,
      firstDay,
      totalDays,
      dailyMap,
      expenseDaysCount,
      avgDailyExpense,
    };
  }, [reportMonth, monthTransactions, excludedCatMap, financialMetrics.expense]);

  // 3. Overall Assets Calculation
  const assetMetrics = useMemo(() => {
    let totalAssets = 0;
    let totalLiabilities = 0;

    assets.forEach((item) => {
      if (item.isLiability || item.category === '대출') {
        totalLiabilities += item.amount;
      } else {
        totalAssets += item.amount;
      }
    });

    const netWorth = totalAssets - totalLiabilities;
    const debtRatio = totalAssets > 0 ? Math.round((totalLiabilities / totalAssets) * 100) : 0;

    const categoryBreakdown: Record<AssetCategory, number> = {
      부동산: 0,
      자동차: 0,
      개인연금: 0,
      대출: 0,
      '예적금/현금': 0,
      기타: 0,
    };

    assets.forEach((item) => {
      categoryBreakdown[item.category] = (categoryBreakdown[item.category] || 0) + item.amount;
    });

    return {
      totalAssets,
      totalLiabilities,
      netWorth,
      debtRatio,
      categoryBreakdown,
    };
  }, [assets]);

  // Handle trigger print
  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  const [yearStr, monthStr] = reportMonth.split('-');

  // Reusable Printable Report JSX Content
  const reportContent = (
    <div className="space-y-8 font-sans text-slate-900 leading-normal">
      {/* 1. Header Banner */}
      <div className="border-b-2 border-slate-900 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-600 text-white">
                공식 재무 결산서
              </span>
              <span className="text-xs font-semibold text-slate-500">진영 현미 스마트 가계부 PRO</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 mt-2">
              {yearStr}년 {monthStr}월 가계부 & 자산 종합 결산 보고서
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              결산 기준월: {yearStr}년 {monthStr}월 | 출력 일시: {new Date().toLocaleDateString('ko-KR')}{' '}
              {new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-slate-400">내 순 자산 (Net Worth)</div>
            <div className="text-xl font-black text-emerald-600 font-mono">
              {formatWon(assetMetrics.netWorth)}
            </div>
            <div className="text-[11px] text-slate-500">부채비율 {assetMetrics.debtRatio}%</div>
          </div>
        </div>

        {/* 4 Major High-Level KPI Summary Bar */}
        <div className="grid grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-200 text-center items-stretch">
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex flex-col justify-between">
            <div className="text-[11px] font-bold text-emerald-800 whitespace-nowrap">당월 총 수입</div>
            <div className="text-base sm:text-lg font-black text-emerald-700 font-mono mt-0.5 whitespace-nowrap">
              {formatCurrency(financialMetrics.income, '수입')}
            </div>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 flex flex-col justify-between">
            <div className="text-[11px] font-bold text-rose-800 whitespace-nowrap">당월 총 지출</div>
            <div className="text-base sm:text-lg font-black text-rose-700 font-mono mt-0.5 whitespace-nowrap">
              {formatCurrency(financialMetrics.expense, '지출')}
            </div>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 flex flex-col justify-between">
            <div className="text-[11px] font-bold text-blue-800 whitespace-nowrap">총 자산 평가액</div>
            <div className="text-base sm:text-lg font-black text-blue-700 font-mono mt-0.5 whitespace-nowrap">
              {formatWon(assetMetrics.totalAssets)}
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
            <div className="text-[11px] font-bold text-slate-700 whitespace-nowrap">당월 잉여금(순이익)</div>
            <div
              className={`text-base sm:text-lg font-black font-mono mt-0.5 whitespace-nowrap ${
                financialMetrics.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {formatCurrency(
                financialMetrics.netProfit,
                financialMetrics.netProfit >= 0 ? '수입' : '지출'
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. SECTION 1: 자산 대시보드 요약 (Dashboard Summary) */}
      {includeDashboard && (
        <section className="space-y-4 page-break-inside-avoid">
          <div className="flex items-center gap-2 border-b border-slate-300 pb-2">
            <LayoutDashboard className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-black text-slate-900">1. 당월 손익 및 지출 분석 (자산 대시보드)</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-stretch">
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
              <span className="text-xs font-bold text-slate-500 whitespace-nowrap">당월 총 수입</span>
              <div className="text-lg font-black text-emerald-600 font-mono mt-1 whitespace-nowrap">
                {formatCurrency(financialMetrics.income, '수입')}
              </div>
            </div>
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
              <span className="text-xs font-bold text-slate-500 whitespace-nowrap">당월 총 지출</span>
              <div className="text-lg font-black text-rose-600 font-mono mt-1 whitespace-nowrap">
                {formatCurrency(financialMetrics.expense, '지출')}
              </div>
            </div>
            <div className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/50 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-bold text-purple-700 gap-1">
                <span className="whitespace-nowrap">고정비 지출</span>
                <span className="whitespace-nowrap">{financialMetrics.fixedRatio}%</span>
              </div>
              <div className="text-lg font-black text-slate-900 font-mono mt-1 whitespace-nowrap">
                {formatCurrency(financialMetrics.fixedExpense, '지출')}
              </div>
            </div>
            <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-bold text-amber-700 gap-1">
                <span className="whitespace-nowrap">단발성 지출</span>
                <span className="whitespace-nowrap">{financialMetrics.variableRatio}%</span>
              </div>
              <div className="text-lg font-black text-slate-900 font-mono mt-1 whitespace-nowrap">
                {formatCurrency(financialMetrics.variableExpense, '지출')}
              </div>
            </div>
          </div>

          {/* Category Breakdown Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">
              카테고리별 지출 순위 & 비중
            </h3>
            <table className="w-full text-xs text-left border border-slate-200 border-collapse table-fixed">
              <colgroup>
                <col />
                <col style={{ width: '70px' }} />
                <col style={{ width: '130px' }} />
                <col style={{ width: '110px' }} />
              </colgroup>
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-2 px-3 whitespace-nowrap">카테고리명</th>
                  <th className="py-2 px-3 text-center whitespace-nowrap">건수</th>
                  <th className="py-2 px-3 text-right whitespace-nowrap">지출 금액 (원)</th>
                  <th className="py-2 px-3 text-right whitespace-nowrap">전체 지출 대비 비중</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {financialMetrics.sortedCategories.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-slate-400">
                      당월 지출 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  financialMetrics.sortedCategories.map((c) => {
                    const pct =
                      financialMetrics.expense > 0
                        ? Math.round((c.amount / financialMetrics.expense) * 100)
                        : 0;
                    return (
                      <tr key={c.name} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-bold flex items-center gap-1.5 whitespace-nowrap truncate">
                          <span>{c.icon}</span>
                          <span>{c.name}</span>
                        </td>
                        <td className="py-2 px-3 text-center font-mono text-slate-600 whitespace-nowrap">{c.count}건</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          {formatWon(c.amount)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-700 whitespace-nowrap">
                          {pct}%
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 3. SECTION 2: 달력 가계부 (Monthly Calendar Ledger) */}
      {includeCalendar && (
        <section className="space-y-4 page-break-inside-avoid">
          <div className="flex items-center justify-between border-b border-slate-300 pb-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-black text-slate-900">
                2. 월간 달력 가계부 ({yearStr}년 {monthStr}월 일자별 수입 & 지출)
              </h2>
            </div>
            <div className="text-xs text-slate-600 font-semibold">
              지출 일수: {calendarData.expenseDaysCount}일 | 1일 평균: {formatWon(calendarData.avgDailyExpense)}
            </div>
          </div>

          {/* 7-column Calendar Grid */}
          <div className="border border-slate-300 rounded-lg overflow-hidden">
            <div className="grid grid-cols-7 bg-slate-100 border-b border-slate-300 text-center font-bold text-xs py-1.5">
              <span className="text-rose-600">일</span>
              <span>월</span>
              <span>화</span>
              <span>수</span>
              <span>목</span>
              <span>금</span>
              <span className="text-blue-600">토</span>
            </div>
            <div className="grid grid-cols-7 text-xs divide-x divide-y divide-slate-200">
              {/* Empty leading cells */}
              {Array.from({ length: calendarData.firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="h-16 bg-slate-50/50 p-1" />
              ))}

              {/* Day cells */}
              {Array.from({ length: calendarData.totalDays }).map((_, i) => {
                const day = i + 1;
                const data = calendarData.dailyMap.get(day);
                const dayOfWeek = (calendarData.firstDay + i) % 7;
                const isSunday = dayOfWeek === 0;
                const isSaturday = dayOfWeek === 6;

                return (
                  <div key={`day-${day}`} className="h-16 p-1 flex flex-col justify-between bg-white">
                    <span
                      className={`font-mono font-bold text-[11px] ${
                        isSunday ? 'text-rose-600' : isSaturday ? 'text-blue-600' : 'text-slate-700'
                      }`}
                    >
                      {day}
                    </span>

                    <div className="space-y-0.5 text-right font-mono text-[10px] leading-tight">
                      {data && data.income > 0 && (
                        <div className="text-emerald-600 font-bold truncate">
                          +{formatWon(data.income)}
                        </div>
                      )}
                      {data && data.expense > 0 && (
                        <div className="text-rose-600 font-bold truncate">
                          -{formatWon(data.expense)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 4. SECTION 3: 전체 자산 현황 (Overall Net Worth & Assets) */}
      {includeAssets && (
        <section className="space-y-4 page-break-inside-avoid">
          <div className="flex items-center justify-between border-b border-slate-300 pb-2">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-black text-slate-900">
                3. 전체 자산 & 부채 종합 현황 (순자산 평가)
              </h2>
            </div>
            <div className="text-xs font-bold text-slate-600">
              등록 자산 항목: 총 {assets.length}건
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-stretch">
            <div className="p-3 rounded-xl border border-emerald-300 bg-emerald-50 flex flex-col justify-between">
              <div className="text-xs font-bold text-emerald-800 whitespace-nowrap">내 순 자산 (Net Worth)</div>
              <div className="text-lg font-black text-emerald-700 font-mono mt-0.5 whitespace-nowrap">
                {formatWon(assetMetrics.netWorth)}
              </div>
            </div>
            <div className="p-3 rounded-xl border border-blue-300 bg-blue-50 flex flex-col justify-between">
              <div className="text-xs font-bold text-blue-800 whitespace-nowrap">총 자산 (Total Assets)</div>
              <div className="text-lg font-black text-blue-700 font-mono mt-0.5 whitespace-nowrap">
                {formatWon(assetMetrics.totalAssets)}
              </div>
            </div>
            <div className="p-3 rounded-xl border border-rose-300 bg-rose-50 flex flex-col justify-between">
              <div className="text-xs font-bold text-rose-800 whitespace-nowrap">총 대출 및 부채</div>
              <div className="text-lg font-black text-rose-700 font-mono mt-0.5 whitespace-nowrap">
                -{formatWon(assetMetrics.totalLiabilities)}
              </div>
            </div>
            <div className="p-3 rounded-xl border border-purple-300 bg-purple-50 flex flex-col justify-between">
              <div className="text-xs font-bold text-purple-800 whitespace-nowrap">부채 비율 (%)</div>
              <div className="text-lg font-black text-purple-700 font-mono mt-0.5 whitespace-nowrap">
                {assetMetrics.debtRatio}%
              </div>
            </div>
          </div>

          {/* Asset Category Quick Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs items-stretch">
            {(['부동산', '자동차', '개인연금', '대출', '예적금/현금'] as const).map((cat) => (
              <div key={cat} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex flex-col justify-between">
                <div className="font-bold text-slate-600 whitespace-nowrap">{cat}</div>
                <div className="font-mono font-black text-slate-900 mt-1 whitespace-nowrap">
                  {cat === '대출'
                    ? `-${formatWon(assetMetrics.categoryBreakdown[cat])}`
                    : formatWon(assetMetrics.categoryBreakdown[cat])}
                </div>
              </div>
            ))}
          </div>

          {/* Assets Items Breakdown Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">
              세부 자산 & 대출 항목 명세표
            </h3>
            <table className="w-full text-xs text-left border border-slate-200 border-collapse table-fixed">
              <colgroup>
                <col style={{ width: '90px' }} />
                <col style={{ width: '210px' }} />
                <col />
                <col style={{ width: '130px' }} />
              </colgroup>
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-2 px-3 whitespace-nowrap">구분</th>
                  <th className="py-2 px-3 whitespace-nowrap">자산 / 부채 항목명</th>
                  <th className="py-2 px-3 whitespace-nowrap">비고 / 메모</th>
                  <th className="py-2 px-3 text-right whitespace-nowrap">평가 금액 (원)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {assets.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-bold text-slate-700 whitespace-nowrap">{item.category}</td>
                    <td className="py-2 px-3 font-bold text-slate-900 whitespace-nowrap truncate">{item.name}</td>
                    <td className="py-2 px-3 text-slate-500 truncate">{item.memo || '-'}</td>
                    <td
                      className={`py-2 px-3 text-right font-mono font-black whitespace-nowrap ${
                        item.isLiability ? 'text-rose-600' : 'text-slate-900'
                      }`}
                    >
                      {item.isLiability ? `-${formatWon(item.amount)}` : formatWon(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 5. SECTION 4: 세부 거래 내역 (Transaction History) */}
      {includeTransactions && (
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-300 pb-2">
            <div className="flex items-center gap-2">
              <ListFilter className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-black text-slate-900">
                4. {yearStr}년 {monthStr}월 세부 거래 장부 내역
              </h2>
            </div>
            <div className="text-xs text-slate-600 font-bold">
              총 {monthTransactions.length}건
            </div>
          </div>

          <table className="w-full text-xs text-left border border-slate-200 border-collapse table-fixed">
            <colgroup>
              <col style={{ width: '62px' }} /> {/* 일자: 09.15 */}
              <col style={{ width: '46px' }} /> {/* 유형: 지출/수입 */}
              <col style={{ width: '50px' }} /> {/* 성격: 고정/단발 */}
              <col />                            {/* 거래내역명: 최대 넓이 확장! */}
              <col style={{ width: '100px' }} />{/* 카테고리 */}
              <col style={{ width: '72px' }} /> {/* 결제수단: 축소 슬림화! */}
              <col style={{ width: '100px' }} />{/* 금액 (원) */}
            </colgroup>
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-2 px-1 text-center whitespace-nowrap">일자</th>
                <th className="py-2 px-1 text-center whitespace-nowrap">유형</th>
                <th className="py-2 px-1 text-center whitespace-nowrap">성격</th>
                <th className="py-2 px-2.5 whitespace-nowrap">거래내역명</th>
                <th className="py-2 px-1.5 whitespace-nowrap">카테고리</th>
                <th className="py-2 px-1 text-center whitespace-nowrap">결제수단</th>
                <th className="py-2 px-2 text-right whitespace-nowrap">금액 (원)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {monthTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400">
                    해당 월에 등록된 거래 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                monthTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50">
                    <td className="py-1.5 px-1 font-mono text-center text-slate-600 whitespace-nowrap text-[11px]">
                      {tx.transaction_date.slice(5)}
                    </td>
                    <td className="py-1.5 px-1 text-center whitespace-nowrap">
                      <span
                        className={`px-1 py-0.5 rounded text-[10px] font-bold ${
                          tx.flow_type === '수입'
                            ? 'bg-emerald-100 text-emerald-800'
                            : tx.flow_type === '지출'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {tx.flow_type}
                      </span>
                    </td>
                    <td className="py-1.5 px-1 text-center whitespace-nowrap text-[10px] font-bold text-slate-600">
                      {tx.expense_nature || '-'}
                    </td>
                    <td className="py-1.5 px-2.5 font-bold text-slate-900 break-keep leading-tight">
                      {tx.description}
                    </td>
                    <td className="py-1.5 px-1.5 text-slate-700 whitespace-nowrap truncate text-[11px]">
                      {tx.category}
                    </td>
                    <td className="py-1.5 px-1 text-center text-slate-500 whitespace-nowrap truncate text-[10.5px]" title={tx.payment_method}>
                      {tx.payment_method}
                    </td>
                    <td
                      className={`py-1.5 px-2 text-right font-mono font-black whitespace-nowrap text-xs ${
                        tx.flow_type === '수입' ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {formatCurrency(tx.amount, tx.flow_type)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {monthTransactions.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 font-bold text-xs border-t-2 border-slate-300">
                  <td colSpan={3} className="py-2.5 px-1 text-center whitespace-nowrap text-[11px] text-slate-600">
                    총 {monthTransactions.length}건
                  </td>
                  <td className="py-2.5 px-2.5 font-bold text-slate-800 whitespace-nowrap">
                    월간 누적 합계
                  </td>
                  <td colSpan={3} className="py-2.5 px-2 text-right font-mono whitespace-nowrap space-x-3 text-xs">
                    <span className="text-emerald-700">
                      수입: +{formatWon(financialMetrics.income)}
                    </span>
                    <span className="text-rose-700">
                      지출: -{formatWon(financialMetrics.expense)}
                    </span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </section>
      )}

      {/* 6. Footer Disclaimer */}
      <div className="pt-6 border-t border-slate-300 text-center text-xs text-slate-400">
        <p>본 문서는 진영 현미 가계부 스마트 자산관리 시스템에 의해 실시간 데이터 기반으로 자동 생성되었습니다.</p>
        <p className="mt-0.5">© 2026 JinYoung & HyunMi Smart Financial Ledger. All rights reserved.</p>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Modal Overlay for Preview & Customization */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  가계부 & 자산 종합 결산 PDF 내보내기
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  자산 대시보드, 달력 가계부, 전체 자산 현황, 거래내역을 A4 규격 PDF로 한번에 변환합니다.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Control Bar: Month Selector & Section Toggles */}
          <div className="p-4 sm:px-6 bg-slate-100/70 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Month Picker */}
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700 dark:text-slate-300">결산 기준월:</span>
              <input
                type="month"
                value={reportMonth}
                onChange={(e) => setReportMonth(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
              />
            </div>

            {/* Section Checkbox Toggles */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap font-bold text-slate-700 dark:text-slate-300">
              <label className="flex items-center gap-1.5 cursor-pointer hover:text-purple-600">
                <input
                  type="checkbox"
                  checked={includeDashboard}
                  onChange={(e) => setIncludeDashboard(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
                <span>자산대시보드</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer hover:text-purple-600">
                <input
                  type="checkbox"
                  checked={includeCalendar}
                  onChange={(e) => setIncludeCalendar(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
                <span>달력가계부</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer hover:text-purple-600">
                <input
                  type="checkbox"
                  checked={includeAssets}
                  onChange={(e) => setIncludeAssets(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
                <span>전체자산현황</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer hover:text-purple-600">
                <input
                  type="checkbox"
                  checked={includeTransactions}
                  onChange={(e) => setIncludeTransactions(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
                <span>세부거래내역</span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs shadow-lg shadow-purple-500/25 transition-all active:scale-95 cursor-pointer"
                title="인쇄 대화상자에서 'PDF로 저장'을 선택하세요"
              >
                <Printer className="w-4 h-4" />
                <span>PDF 파일로 저장 / 인쇄하기</span>
              </button>
            </div>
          </div>

          {/* Quick Notice Tip */}
          <div className="px-6 py-2 bg-purple-50 dark:bg-purple-950/30 border-b border-purple-100 dark:border-purple-900/40 text-[11px] text-purple-700 dark:text-purple-300 flex items-center justify-between">
            <span>
              💡 <strong>PDF 저장 팁:</strong> 상단 [PDF 파일로 저장 / 인쇄하기] 클릭 후 열리는 인쇄 창에서{' '}
              <strong>대상: 'PDF로 저장'</strong>을 선택하시면 글자가 깨지지 않는 초고화질 A4 PDF 파일로 즉시 저장됩니다!
            </span>
          </div>

          {/* Live Report Preview Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200/60 dark:bg-slate-950/70">
            <div className="max-w-[800px] mx-auto bg-white p-8 sm:p-12 rounded-2xl shadow-xl border border-slate-200/80">
              {reportContent}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Isolated Print Portal for Native Browser Print Engine */}
      {typeof document !== 'undefined' &&
        createPortal(
          <div id="pdf-report-print-container">
            <div className="p-8 max-w-[800px] mx-auto bg-white text-slate-900">{reportContent}</div>
          </div>,
          document.body
        )}
    </>
  );
};
