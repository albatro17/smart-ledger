import React, { useMemo } from 'react';
import type { Transaction } from '../../types';
import { formatCurrency, formatWon } from '../../lib/utils';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Lock, Zap, Ban } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLedger } from '../../context/LedgerContext';

interface SummaryCardsProps {
  currentMonthTransactions: Transaction[];
  previousMonthTransactions: Transaction[];
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  currentMonthTransactions,
  previousMonthTransactions,
}) => {
  const { categories } = useLedger();

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

  const excludedCategoryNames = useMemo(() => {
    return categories.filter(c => c.is_excluded_from_total).map(c => c.name);
  }, [categories]);

  // Per-excluded-category breakdown (amounts & counts)
  const excludedCategoryBreakdown = useMemo(() => {
    const map = new Map<string, { amount: number; count: number }>();

    categories.forEach(c => {
      if (c.is_excluded_from_total) {
        map.set(c.id, { amount: 0, count: 0 });
        map.set(c.name, { amount: 0, count: 0 });
      }
    });

    currentMonthTransactions.forEach(t => {
      const isExcluded = excludedCatMap.has(t.category) || (t.category_id && excludedCatMap.has(t.category_id));
      if (isExcluded && (t.flow_type === '지출' || t.flow_type === '이체')) {
        const key = t.category_id && map.has(t.category_id) ? t.category_id : t.category;
        const entry = map.get(key);
        if (entry) {
          entry.amount += t.amount;
          entry.count += 1;
        }
      }
    });

    const seenNames = new Set<string>();
    const result: Array<{ id: string; name: string; icon: string; color: string; amount: number; count: number }> = [];

    categories.forEach(c => {
      if (c.is_excluded_from_total && !seenNames.has(c.name)) {
        seenNames.add(c.name);
        const entry = map.get(c.id) || map.get(c.name);
        result.push({
          id: c.id,
          name: c.name,
          icon: c.icon || '🏷️',
          color: c.color || '#F59E0B',
          amount: entry ? entry.amount : 0,
          count: entry ? entry.count : 0,
        });
      }
    });

    return result;
  }, [categories, currentMonthTransactions, excludedCatMap]);

  const currentMetrics = useMemo(() => {
    let income = 0;
    let expense = 0;
    let excludedExpense = 0;
    let fixedExpense = 0;
    let variableExpense = 0;

    currentMonthTransactions.forEach(t => {
      const isExcluded = excludedCatMap.has(t.category) || (t.category_id && excludedCatMap.has(t.category_id));

      if (t.flow_type === '수입') {
        income += t.amount;
      } else if (t.flow_type === '지출' || t.flow_type === '이체') {
        if (isExcluded) {
          excludedExpense += t.amount;
        } else {
          expense += t.amount;
          if (t.expense_nature === '고정비') {
            fixedExpense += t.amount;
          } else {
            variableExpense += t.amount;
          }
        }
      }
    });

    const fixedRatio = expense > 0 ? Math.round((fixedExpense / expense) * 100) : 0;
    const variableRatio = expense > 0 ? Math.round((variableExpense / expense) * 100) : 0;

    return {
      income,
      expense,
      excludedExpense,
      net: income - expense,
      fixedExpense,
      variableExpense,
      fixedRatio,
      variableRatio,
    };
  }, [currentMonthTransactions, excludedCatMap]);

  const prevMetrics = useMemo(() => {
    let income = 0;
    let expense = 0;
    previousMonthTransactions.forEach(t => {
      const isExcluded = excludedCatMap.has(t.category) || (t.category_id && excludedCatMap.has(t.category_id));
      if (t.flow_type === '수입') {
        income += t.amount;
      } else if ((t.flow_type === '지출' || t.flow_type === '이체') && !isExcluded) {
        expense += t.amount;
      }
    });
    return { income, expense, net: income - expense };
  }, [previousMonthTransactions, excludedCatMap]);

  const expenseMoM = useMemo(() => {
    if (prevMetrics.expense === 0) return 0;
    return Math.round(((currentMetrics.expense - prevMetrics.expense) / prevMetrics.expense) * 100);
  }, [currentMetrics.expense, prevMetrics.expense]);

  const incomeMoM = useMemo(() => {
    if (prevMetrics.income === 0) return 0;
    return Math.round(((currentMetrics.income - prevMetrics.income) / prevMetrics.income) * 100);
  }, [currentMetrics.income, prevMetrics.income]);

  return (
    <div className="space-y-4">
      {/* Primary KPI Metrics Grid (4 Clean Balanced Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        {/* 1. 당월 총 수입 Card */}
        <motion.div
          whileHover={{ y: -3 }}
          className="p-5 rounded-2xl glass-panel relative overflow-hidden group border-l-4 border-l-emerald-500 shadow-md flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">당월 총 수입</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 flex-shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight font-mono whitespace-nowrap">
              {formatCurrency(currentMetrics.income, '수입')}
            </h3>
            <div className="flex items-center gap-1.5 mt-2 text-xs whitespace-nowrap">
              {incomeMoM >= 0 ? (
                <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-bold">
                  <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                  +{incomeMoM}%
                </span>
              ) : (
                <span className="inline-flex items-center text-rose-500 font-bold">
                  <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                  {incomeMoM}%
                </span>
              )}
              <span className="text-slate-500 dark:text-slate-400">전월 대비</span>
            </div>
          </div>
        </motion.div>

        {/* 2. 당월 총 지출 Card */}
        <motion.div
          whileHover={{ y: -3 }}
          className="p-5 rounded-2xl glass-panel relative overflow-hidden group border-l-4 border-l-rose-500 shadow-md flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
              당월 총 지출 {excludedCategoryNames.length > 0 && <span className="text-[10px] text-amber-500 font-bold">(제외 반영)</span>}
            </span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500 flex-shrink-0">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight font-mono whitespace-nowrap">
              {formatCurrency(currentMetrics.expense, '지출')}
            </h3>

            <div className="flex items-center justify-between mt-2 text-xs whitespace-nowrap">
              <div className="flex items-center gap-1.5">
                {expenseMoM <= 0 ? (
                  <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-bold">
                    <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                    {expenseMoM}% (절약)
                  </span>
                ) : (
                  <span className="inline-flex items-center text-rose-500 font-bold">
                    <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                    +{expenseMoM}% (증가)
                  </span>
                )}
                <span className="text-slate-500 dark:text-slate-400">전월 대비</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 3. 고정비 합계 (비중 %) Card */}
        <motion.div
          whileHover={{ y: -3 }}
          className="p-5 rounded-2xl glass-panel relative overflow-hidden group border-l-4 border-l-purple-500 shadow-md flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 whitespace-nowrap">
              <Lock className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
              고정비 지출
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-purple-500/20 text-purple-600 dark:text-purple-300 whitespace-nowrap flex-shrink-0">
              {currentMetrics.fixedRatio}% 비중
            </span>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight font-mono whitespace-nowrap">
              {formatCurrency(currentMetrics.fixedExpense, '지출')}
            </h3>
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-purple-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${currentMetrics.fixedRatio}%` }}
              />
            </div>
          </div>
        </motion.div>

        {/* 4. 단발성(변동비) 지출 합계 (비중 %) Card */}
        <motion.div
          whileHover={{ y: -3 }}
          className="p-5 rounded-2xl glass-panel relative overflow-hidden group border-l-4 border-l-amber-500 shadow-md flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 whitespace-nowrap">
              <Zap className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              단발성 지출
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-amber-500/20 text-amber-600 dark:text-amber-300 whitespace-nowrap flex-shrink-0">
              {currentMetrics.variableRatio}% 비중
            </span>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight font-mono whitespace-nowrap">
              {formatCurrency(currentMetrics.variableExpense, '지출')}
            </h3>
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${currentMetrics.variableRatio}%` }}
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Single Clean Excluded Categories Summary Banner (Rendered only when excluded items exist) */}
      {excludedCategoryBreakdown.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs shadow-sm">
          <div className="flex items-center gap-2 font-bold">
            <Ban className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span>당월 집계 제외 항목 요약 ({excludedCategoryBreakdown.length}개 카테고리):</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {excludedCategoryBreakdown.map((item) => (
              <span
                key={item.id}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-500/20 shadow-xs font-medium text-[11px]"
              >
                <span>{item.icon}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{item.name}</span>
                <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">
                  ({item.amount > 0 ? `-${formatWon(item.amount)}` : '0원'})
                </span>
              </span>
            ))}

            <span className="font-mono font-black text-xs text-amber-600 dark:text-amber-400 bg-amber-500/20 px-2.5 py-1 rounded-xl border border-amber-500/30">
              총 -{formatWon(currentMetrics.excludedExpense)} 제외
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
