import React, { useState } from 'react';
import { useLedger } from '../../context/LedgerContext';
import { Calendar, Search, RefreshCcw, Download, Lock, Zap, SlidersHorizontal, ChevronDown, X } from 'lucide-react';
import { exportTransactionsToExcel } from '../../lib/utils';

export const FilterToolbar: React.FC = () => {
  const { filters, setFilters, resetFilters, categories, transactions } = useLedger();
  const [showDetailedFilters, setShowDetailedFilters] = useState(false);

  const paymentMethods = React.useMemo(() => {
    const set = new Set<string>();
    transactions.forEach(t => {
      if (t.payment_method) set.add(t.payment_method);
    });
    return Array.from(set);
  }, [transactions]);

  const handleExportExcel = () => {
    exportTransactionsToExcel(transactions, `가계부_거래내역_${filters.month}`);
  };

  const hasActiveSubFilters =
    filters.categoryId !== 'ALL' ||
    filters.paymentMethod !== 'ALL' ||
    filters.sortBy !== 'date_desc' ||
    filters.expenseNature !== 'ALL';

  return (
    <div className="p-3 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-2">
      {/* Primary Compact Filter Row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Left: Date & Main Flow Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Month Picker */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 text-xs font-bold shadow-xs">
            <Calendar className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
            <input
              type="month"
              value={filters.month}
              onChange={(e) => setFilters(prev => ({ ...prev, month: e.target.value }))}
              className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer text-slate-800 dark:text-slate-200"
            />
          </div>

          {/* Flow Type Segmented Chips */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-900 p-0.5 border border-slate-200 dark:border-slate-800 text-xs font-semibold">
            {(['ALL', '지출', '수입', '이체'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilters(prev => ({ ...prev, flowType: type }))}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  filters.flowType === type
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {type === 'ALL' ? '전체' : type}
              </button>
            ))}
          </div>

          {/* Expense Nature Chips (Fixed vs Variable) */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-900 p-0.5 border border-slate-200 dark:border-slate-800 text-xs font-semibold">
            {(['ALL', '고정비', '변동비'] as const).map((nature) => (
              <button
                key={nature}
                onClick={() => setFilters(prev => ({ ...prev, expenseNature: nature }))}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  filters.expenseNature === nature
                    ? nature === '고정비'
                      ? 'bg-purple-500 text-white shadow-xs'
                      : nature === '변동비'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-emerald-500 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {nature === '고정비' && <Lock className="w-3 h-3" />}
                {nature === '변동비' && <Zap className="w-3 h-3" />}
                {nature === 'ALL' ? '성격전체' : nature === '변동비' ? '단발성' : nature}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Search, Filter Toggle & Excel */}
        <div className="flex items-center gap-1.5 flex-1 max-w-xs justify-end">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[140px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
              placeholder="검색..."
              className="w-full pl-8 pr-7 py-1 text-xs rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            {filters.searchQuery && (
              <button
                onClick={() => setFilters(prev => ({ ...prev, searchQuery: '' }))}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Toggle Detail Filters Dropdown */}
          <button
            onClick={() => setShowDetailedFilters(prev => !prev)}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-xl border transition-all ${
              hasActiveSubFilters || showDetailedFilters
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="상세 필터 (카테고리/결제수단/정렬)"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">상세필터</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${showDetailedFilters ? 'rotate-180' : ''}`} />
          </button>

          {/* Excel Export */}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
            title="엑셀 다운로드"
          >
            <Download className="w-3.5 h-3.5 text-emerald-500" />
            <span className="hidden sm:inline">엑셀</span>
          </button>

          {/* Reset */}
          <button
            onClick={resetFilters}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="필터 초기화"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expandable Secondary Filter Row (Category, Payment Method, Sort) */}
      {showDetailedFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-0.5">카테고리</label>
            <select
              value={filters.categoryId}
              onChange={(e) => setFilters(prev => ({ ...prev, categoryId: e.target.value }))}
              className="w-full px-2.5 py-1 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            >
              <option value="ALL">전체 카테고리 ({categories.length}개)</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name} ({c.type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-0.5">결제수단</label>
            <select
              value={filters.paymentMethod}
              onChange={(e) => setFilters(prev => ({ ...prev, paymentMethod: e.target.value }))}
              className="w-full px-2.5 py-1 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            >
              <option value="ALL">전체 결제수단</option>
              {paymentMethods.map((pm) => (
                <option key={pm} value={pm}>
                  💳 {pm}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-0.5">정렬 순서</label>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
              className="w-full px-2.5 py-1 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            >
              <option value="date_desc">최신 일자순 (기본)</option>
              <option value="date_asc">과거 일자순</option>
              <option value="amount_desc">높은 금액순</option>
              <option value="amount_asc">낮은 금액순</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};
