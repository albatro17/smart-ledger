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
      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. 당월 총 수입 Card */}
        <motion.div
          whileHover={{ y: -3 }}
          className="p-5 rounded-2xl glass-panel relative overflow-hidden group border-l-4 border-l-emerald-500 shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">당월 총 수입</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight font-mono">
              {formatCurrency(currentMetrics.income, '수입')}
            </h3>
            <div className="flex items-center gap-1.5 mt-2 text-xs">
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

        {/* 2. 당월 총 지출 Card (Custom Excluded Category Filter Applied) */}
        <motion.div
          whileHover={{ y: -3 }}
          className="p-5 rounded-2xl glass-panel relative overflow-hidden group border-l-4 border-l-rose-500 shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              당월 총 지출 {excludedCategoryNames.length > 0 && <span className="text-[10px] text-amber-500 font-normal">(제외 적용됨)</span>}
            </span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight font-mono">
              {formatCurrency(currentMetrics.expense, '지출')}
            </h3>

            <div className="flex items-center justify-between mt-2 text-xs">
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

            {/* Excluded Category Notice & Tooltip */}
            {excludedCategoryNames.length > 0 && (
              <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-amber-600 dark:text-amber-400 flex items-center justify-between font-medium">
                <span className="flex items-center gap-1 truncate" title={`제외 카테고리: ${excludedCategoryNames.join(', ')}`}>
                  <Ban className="w-3 h-3 flex-shrink-0" />
                  제외: {excludedCategoryNames.join(', ')}
                </span>
                <span className="font-mono font-bold flex-shrink-0">
                  -{formatWon(currentMetrics.excludedExpense)}
                </span>
              </div>
            )}
          </div>
        </motion.div>

        {/* 3. 고정비 합계 (비중 %) Card */}
        <motion.div
          whileHover={{ y: -3 }}
          className="p-5 rounded-2xl glass-panel relative overflow-hidden group border-l-4 border-l-purple-500 shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-purple-500" />
              고정비 합계 (통신·월세·저축 등)
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-purple-500/20 text-purple-600 dark:text-purple-300">
              {currentMetrics.fixedRatio}% 비중
            </span>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
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
          className="p-5 rounded-2xl glass-panel relative overflow-hidden group border-l-4 border-l-amber-500 shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              단발성(변동비) 지출 (식비·쇼핑 등)
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-amber-500/20 text-amber-600 dark:text-amber-300">
              {currentMetrics.variableRatio}% 비중
            </span>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
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

      {/* Expense Nature Ratio Progress Gauge Bar */}
      <div className="p-4 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
        <div className="flex items-center justify-between text-xs font-bold flex-wrap gap-2">
          <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            📊 지출 성격 비중 분석 (고정비 vs 단발성)
          </span>
          <div className="flex items-center gap-3">
            <span className="text-purple-600 dark:text-purple-400 font-extrabold">
              🔒 고정비: {formatWon(currentMetrics.fixedExpense)} ({currentMetrics.fixedRatio}%)
            </span>
            <span className="text-amber-600 dark:text-amber-400 font-extrabold">
              ⚡ 단발성: {formatWon(currentMetrics.variableExpense)} ({currentMetrics.variableRatio}%)
            </span>
          </div>
        </div>

        <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full flex overflow-hidden p-0.5 shadow-inner">
          <div
            className="bg-purple-500 h-full rounded-l-full transition-all duration-500"
            style={{ width: `${currentMetrics.fixedRatio}%` }}
            title={`고정비: ${currentMetrics.fixedRatio}%`}
          />
          <div
            className="bg-amber-500 h-full rounded-r-full transition-all duration-500"
            style={{ width: `${currentMetrics.variableRatio}%` }}
            title={`단발성: ${currentMetrics.variableRatio}%`}
          />
        </div>
      </div>
    </div>
  );
};
