import React, { useState, useMemo } from 'react';
import type { Transaction, Category } from '../../types';
import { formatWon, formatCurrency } from '../../lib/utils';
import { useLedger } from '../../context/LedgerContext';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';

interface FinancialCalendarProps {
  transactions: Transaction[];
  categories: Category[];
}

export const FinancialCalendar: React.FC<FinancialCalendarProps> = ({ transactions, categories }) => {
  const { filters, setFilters } = useLedger();
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  // Map of excluded categories
  const excludedCatMap = useMemo(() => {
    const set = new Set<string>();
    categories.forEach(c => {
      if (c.is_excluded_from_total) {
        set.add(c.name);
        set.add(c.id);
      }
    });
    return set;
  }, [categories]);

  // Current year & month from filters.month (YYYY-MM)
  const { year, month } = useMemo(() => {
    const [y, m] = (filters.month || new Date().toISOString().slice(0, 7)).split('-').map(Number);
    return { year: y, month: m };
  }, [filters.month]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    const date = new Date(year, month - 2, 1);
    const py = date.getFullYear();
    const pm = String(date.getMonth() + 1).padStart(2, '0');
    setFilters(prev => ({ ...prev, month: `${py}-${pm}` }));
  };

  const handleNextMonth = () => {
    const date = new Date(year, month, 1);
    const ny = date.getFullYear();
    const nm = String(date.getMonth() + 1).padStart(2, '0');
    setFilters(prev => ({ ...prev, month: `${ny}-${nm}` }));
  };

  // Group transactions by date for the active month
  const dailyDataMap = useMemo(() => {
    const map = new Map<string, { income: number; expense: number; count: number; items: Transaction[] }>();

    transactions.forEach(t => {
      if (!t.transaction_date || !t.transaction_date.startsWith(filters.month)) return;

      const dateKey = t.transaction_date;
      if (!map.has(dateKey)) {
        map.set(dateKey, { income: 0, expense: 0, count: 0, items: [] });
      }

      const entry = map.get(dateKey)!;
      entry.items.push(t);
      entry.count += 1;

      const isExcluded = excludedCatMap.has(t.category) || (t.category_id && excludedCatMap.has(t.category_id));

      if (t.flow_type === '수입') {
        entry.income += t.amount;
      } else if ((t.flow_type === '지출' || t.flow_type === '이체') && !isExcluded) {
        entry.expense += t.amount;
      }
    });

    return map;
  }, [transactions, filters.month, excludedCatMap]);

  // Calculate monthly overall totals for the calendar header
  const monthSummary = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    let daysWithExpenseCount = 0;

    dailyDataMap.forEach((data) => {
      totalIncome += data.income;
      totalExpense += data.expense;
      if (data.expense > 0) daysWithExpenseCount++;
    });

    const daysInMonth = new Date(year, month, 0).getDate();
    const dailyAverage = daysWithExpenseCount > 0 ? Math.round(totalExpense / daysWithExpenseCount) : 0;

    return {
      totalIncome,
      totalExpense,
      net: totalIncome - totalExpense,
      daysInMonth,
      dailyAverage,
    };
  }, [dailyDataMap, year, month]);

  // Generate calendar days grid (including padding days for preceding and next month)
  const calendarGrid = useMemo(() => {
    const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0 = Sun
    const totalDaysInMonth = new Date(year, month, 0).getDate();

    const grid: Array<{ dateStr: string; dayNum: number; isCurrentMonth: boolean }> = [];

    // Preceding month padding days
    const prevMonthDaysCount = new Date(year, month - 1, 0).getDate();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthDaysCount - i;
      const pm = month - 1 === 0 ? 12 : month - 1;
      const py = month - 1 === 0 ? year - 1 : year;
      const dateStr = `${py}-${String(pm).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      grid.push({ dateStr, dayNum, isCurrentMonth: false });
    }

    // Current month days
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      grid.push({ dateStr, dayNum: d, isCurrentMonth: true });
    }

    // Next month padding days to fill 7-column grid
    const remainingSlots = (7 - (grid.length % 7)) % 7;
    for (let n = 1; n <= remainingSlots; n++) {
      const nm = month + 1 === 13 ? 1 : month + 1;
      const ny = month + 1 === 13 ? year + 1 : year;
      const dateStr = `${ny}-${String(nm).padStart(2, '0')}-${String(n).padStart(2, '0')}`;
      grid.push({ dateStr, dayNum: n, isCurrentMonth: false });
    }

    return grid;
  }, [year, month]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

  // Detail drawer items for selected date
  const selectedDayItems = useMemo(() => {
    if (!selectedDateStr) return [];
    const entry = dailyDataMap.get(selectedDateStr);
    return entry ? entry.items : [];
  }, [selectedDateStr, dailyDataMap]);

  return (
    <div className="space-y-4">
      {/* Month Navigator Header & Quick Monthly KPI Bar */}
      <div className="p-4 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                {year}년 {String(month).padStart(2, '0')}월 달력 가계부
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                일자별 수입·지출 내역을 달력에서 한눈에 확인하고 터치해 상세 관리하세요.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="이전 달"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-extrabold font-mono text-slate-800 dark:text-slate-200 px-2">
              {year}.{String(month).padStart(2, '0')}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="다음 달"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Monthly Summary Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
            <span className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              월간 총 수입
            </span>
            <span className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
              +{formatWon(monthSummary.totalIncome)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
            <span className="font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1">
              <TrendingDown className="w-4 h-4 text-rose-500" />
              월간 총 지출
            </span>
            <span className="font-mono font-black text-sm text-rose-600 dark:text-rose-400">
              -{formatWon(monthSummary.totalExpense)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <span className="font-bold text-slate-700 dark:text-slate-300">
              월간 손익 / 일평균 지출
            </span>
            <div className="text-right font-mono">
              <div className={`font-black ${monthSummary.net >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {monthSummary.net >= 0 ? '+' : ''}{formatWon(monthSummary.net)}
              </div>
              <div className="text-[10px] text-slate-400">
                일평균 {formatWon(monthSummary.dailyAverage)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Calendar Grid */}
      <div className="p-3 sm:p-5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1 text-center border-b border-slate-200 dark:border-slate-800 pb-2">
          {WEEKDAYS.map((day, idx) => (
            <span
              key={day}
              className={`text-xs font-black ${
                idx === 0 ? 'text-rose-500' : idx === 6 ? 'text-blue-500' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {day}
            </span>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {calendarGrid.map((cell) => {
            const dayData = dailyDataMap.get(cell.dateStr);
            const isToday = cell.dateStr === todayStr;
            const isSelected = selectedDateStr === cell.dateStr;
            const dateObj = new Date(cell.dateStr);
            const isSunday = dateObj.getDay() === 0;
            const isSaturday = dateObj.getDay() === 6;

            return (
              <motion.div
                key={cell.dateStr}
                whileHover={{ scale: 1.02 }}
                onClick={() => {
                  if (cell.isCurrentMonth) {
                    setSelectedDateStr(cell.dateStr);
                  }
                }}
                className={`min-h-[75px] sm:min-h-[95px] p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  !cell.isCurrentMonth
                    ? 'opacity-30 bg-slate-100/40 dark:bg-slate-900/20 border-transparent cursor-default'
                    : isSelected
                    ? 'border-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/15 ring-2 ring-emerald-500 shadow-md'
                    : isToday
                    ? 'border-emerald-500/50 bg-emerald-500/5 dark:bg-emerald-500/10'
                    : 'border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Cell Header: Day Number */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-black px-1.5 py-0.5 rounded-md font-mono ${
                      isToday
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : isSunday
                        ? 'text-rose-500 font-bold'
                        : isSaturday
                        ? 'text-blue-500 font-bold'
                        : cell.isCurrentMonth
                        ? 'text-slate-800 dark:text-slate-200'
                        : 'text-slate-400'
                    }`}
                  >
                    {cell.dayNum}
                  </span>

                  {dayData && dayData.count > 0 && (
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1 rounded-full">
                      {dayData.count}건
                    </span>
                  )}
                </div>

                {/* Cell Amount Badges */}
                <div className="space-y-0.5 mt-1 font-mono text-[10px] sm:text-xs">
                  {dayData && dayData.income > 0 && (
                    <div className="px-1.5 py-0.5 rounded font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 truncate">
                      +{formatWon(dayData.income)}
                    </div>
                  )}

                  {dayData && dayData.expense > 0 && (
                    <div className="px-1.5 py-0.5 rounded font-black bg-rose-500/15 text-rose-600 dark:text-rose-400 truncate">
                      -{formatWon(dayData.expense)}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Transaction Drawer / Modal Pane */}
      {selectedDateStr && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl glass-panel border border-emerald-500/40 space-y-4 shadow-lg bg-emerald-500/5 dark:bg-emerald-500/10"
        >
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500 text-white font-bold text-xs font-mono">
                {selectedDateStr}
              </span>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                일별 거래내역 ({selectedDayItems.length}건)
              </h4>
            </div>

            <button
              onClick={() => setSelectedDateStr(null)}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              닫기 ✕
            </button>
          </div>

          {selectedDayItems.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              선택한 날짜에 등록된 거래 내역이 없습니다.
            </p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {selectedDayItems.map((tx) => (
                <div
                  key={tx.id}
                  className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        tx.flow_type === '지출'
                          ? 'bg-rose-500/15 text-rose-500'
                          : tx.flow_type === '수입'
                          ? 'bg-emerald-500/15 text-emerald-500'
                          : 'bg-slate-500/15 text-slate-400'
                      }`}
                    >
                      {tx.flow_type}
                    </span>
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">{tx.description}</div>
                      <div className="text-[10px] text-slate-400">
                        🏷️ {tx.category} | 💳 {tx.payment_method}
                      </div>
                    </div>
                  </div>

                  <div className="font-mono font-black text-sm">
                    <span className={tx.flow_type === '수입' ? 'text-emerald-500' : 'text-rose-500'}>
                      {formatCurrency(tx.amount, tx.flow_type)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};
