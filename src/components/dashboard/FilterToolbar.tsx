import React from 'react';
import { useLedger } from '../../context/LedgerContext';
import { Calendar, Search, RefreshCcw, Download, Lock, Zap } from 'lucide-react';
import { exportTransactionsToExcel } from '../../lib/utils';

export const FilterToolbar: React.FC = () => {
  const { filters, setFilters, resetFilters, categories, transactions } = useLedger();

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

  return (
    <div className="p-4 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Month Selector & Flow Type Chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700">
            <Calendar className="w-4 h-4 text-emerald-500" />
            <input
              type="month"
              value={filters.month}
              onChange={(e) => setFilters(prev => ({ ...prev, month: e.target.value }))}
              className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer"
            />
          </div>

          {/* Flow Type Chips */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1 border border-slate-200 dark:border-slate-700">
            {(['ALL', '지출', '수입', '이체'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilters(prev => ({ ...prev, flowType: type }))}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  filters.flowType === type
                    ? 'bg-emerald-500 text-white shadow'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {type === 'ALL' ? '전체' : type}
              </button>
            ))}
          </div>

          {/* Expense Nature Filter Chips */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1 border border-slate-200 dark:border-slate-700">
            {(['ALL', '고정비', '변동비'] as const).map((nature) => (
              <button
                key={nature}
                onClick={() => setFilters(prev => ({ ...prev, expenseNature: nature }))}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  filters.expenseNature === nature
                    ? nature === '고정비'
                      ? 'bg-purple-500 text-white shadow'
                      : nature === '변동비'
                      ? 'bg-amber-500 text-white shadow'
                      : 'bg-emerald-500 text-white shadow'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {nature === '고정비' && <Lock className="w-3 h-3" />}
                {nature === '변동비' && <Zap className="w-3 h-3" />}
                {nature === 'ALL' ? '성격 전체' : nature === '변동비' ? '단발성' : nature}
              </button>
            ))}
          </div>

          <button
            onClick={resetFilters}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="필터 초기화"
          >
            <RefreshCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input & Export Button */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
              placeholder="내역명, 금액, 키워드 검색..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors"
            title="엑셀 다운로드"
          >
            <Download className="w-4 h-4 text-emerald-500" />
            <span className="hidden sm:inline">엑셀 저장</span>
          </button>
        </div>
      </div>

      {/* Advanced Secondary Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
        <div>
          <select
            value={filters.categoryId}
            onChange={(e) => setFilters(prev => ({ ...prev, categoryId: e.target.value }))}
            className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
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
          <select
            value={filters.paymentMethod}
            onChange={(e) => setFilters(prev => ({ ...prev, paymentMethod: e.target.value }))}
            className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
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
          <select
            value={filters.sortBy}
            onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
            className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
          >
            <option value="date_desc">최신 일자순 (기본)</option>
            <option value="date_asc">과거 일자순</option>
            <option value="amount_desc">높은 금액순</option>
            <option value="amount_asc">낮은 금액순</option>
          </select>
        </div>
      </div>
    </div>
  );
};
