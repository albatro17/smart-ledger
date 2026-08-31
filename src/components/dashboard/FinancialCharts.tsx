import React, { useMemo } from 'react';
import type { Transaction, Category } from '../../types';
import { formatWon } from '../../lib/utils';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';
import { PieChart as PieIcon, TrendingUp, Lock } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface FinancialChartsProps {
  transactions: Transaction[];
  categories: Category[];
}

export const FinancialCharts: React.FC<FinancialChartsProps> = ({ transactions, categories }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

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

  const categoryColorMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach(c => map.set(c.name, c.color));
    return map;
  }, [categories]);

  // 1. Donut Chart Data: Category Expenses (excluding categories marked as is_excluded_from_total)
  const categoryExpenseData = useMemo(() => {
    const expenses = transactions.filter(t => {
      if (t.flow_type !== '지출' && t.flow_type !== '이체') return false;
      const isExcluded = excludedCatMap.has(t.category) || (t.category_id && excludedCatMap.has(t.category_id));
      return !isExcluded;
    });

    const catMap = new Map<string, number>();

    expenses.forEach(t => {
      const catName = t.category || '미분류';
      catMap.set(catName, (catMap.get(catName) || 0) + t.amount);
    });

    const result: Array<{ name: string; value: number; color: string }> = [];
    catMap.forEach((val, name) => {
      result.push({
        name,
        value: val,
        color: categoryColorMap.get(name) || '#94A3B8',
      });
    });

    return result.sort((a, b) => b.value - a.value);
  }, [transactions, categoryColorMap, excludedCatMap]);

  // 2. Fixed vs Variable Expense Breakdown Chart Data (excluding categories marked as is_excluded_from_total)
  const expenseNatureData = useMemo(() => {
    const expenses = transactions.filter(t => {
      if (t.flow_type !== '지출' && t.flow_type !== '이체') return false;
      const isExcluded = excludedCatMap.has(t.category) || (t.category_id && excludedCatMap.has(t.category_id));
      return !isExcluded;
    });

    let fixed = 0;
    let variable = 0;

    expenses.forEach(t => {
      if (t.expense_nature === '고정비') fixed += t.amount;
      else variable += t.amount;
    });

    return [
      { name: '고정비 (통신·월세·저축 등)', value: fixed, color: '#A855F7' },
      { name: '단발성 (식비·쇼핑 등)', value: variable, color: '#F59E0B' },
    ];
  }, [transactions, excludedCatMap]);

  // 3. Area Chart Data: Daily Spend & Income Trend (excluding categories marked as is_excluded_from_total)
  const dailyTrendData = useMemo(() => {
    const dateMap = new Map<string, { date: string; income: number; expense: number }>();

    transactions.forEach(t => {
      const dateStr = t.transaction_date;
      if (!dateStr) return;

      const isExcluded = excludedCatMap.has(t.category) || (t.category_id && excludedCatMap.has(t.category_id));

      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, { date: dateStr, income: 0, expense: 0 });
      }
      const entry = dateMap.get(dateStr)!;
      if (t.flow_type === '수입') {
        entry.income += t.amount;
      } else if ((t.flow_type === '지출' || t.flow_type === '이체') && !isExcluded) {
        entry.expense += t.amount;
      }
    });

    return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [transactions, excludedCatMap]);

  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? '#334155' : '#e2e8f0';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Chart 1: Donut Chart - Category Expense Breakdown */}
      <div className="p-5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-sm">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                <PieIcon className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">카테고리별 지출 비율</h4>
            </div>
            <span className="text-xs text-slate-400">당월 지출</span>
          </div>

          <div className="h-64 relative">
            {categoryExpenseData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                지출 데이터가 없습니다.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryExpenseData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryExpenseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke={isDark ? '#1e293b' : '#ffffff'} strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [formatWon(Number(val) || 0), '지출액']}
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

        {/* Legend */}
        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 max-h-28 overflow-y-auto space-y-1.5">
          {categoryExpenseData.slice(0, 5).map((item) => (
            <div key={item.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-slate-700 dark:text-slate-300 font-medium">{item.name}</span>
              </div>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{formatWon(item.value)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart 2: Fixed vs Variable Expense Breakdown */}
      <div className="p-5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-sm">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
                <Lock className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">고정비 vs 단발성 지출 구조</h4>
            </div>
            <span className="text-xs text-slate-400">성격별 분오</span>
          </div>

          <div className="h-64 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expenseNatureData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {expenseNatureData.map((entry, index) => (
                    <Cell key={`nature-cell-${index}`} fill={entry.color} stroke={isDark ? '#1e293b' : '#ffffff'} strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [formatWon(Number(val) || 0), '지출액']}
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
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
          {expenseNatureData.map((item) => (
            <div key={item.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-slate-700 dark:text-slate-300 font-bold">{item.name}</span>
              </div>
              <span className="font-mono font-extrabold text-slate-900 dark:text-slate-100">{formatWon(item.value)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart 3: Area Chart - Daily Cashflow Trend */}
      <div className="p-5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">일별 지출 & 수입 추이</h4>
          </div>
          <span className="text-xs text-slate-400">일자별 흐름</span>
        </div>

        <div className="h-72">
          {dailyTrendData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              데이터가 없습니다.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="date" tickFormatter={(d) => d.slice(8)} tick={{ fill: textColor, fontSize: 10 }} />
                <YAxis tickFormatter={(val) => `${Math.round(val / 10000)}만`} tick={{ fill: textColor, fontSize: 10 }} />
                <Tooltip
                  formatter={(val: any, name: any) => [formatWon(Number(val) || 0), name === 'expense' ? '지출' : '수입']}
                  contentStyle={{
                    backgroundColor: isDark ? '#0f172a' : '#ffffff',
                    borderColor: isDark ? '#334155' : '#cbd5e1',
                    borderRadius: '12px',
                    color: isDark ? '#ffffff' : '#0f172a',
                    fontSize: '12px',
                  }}
                />
                <Area type="monotone" dataKey="expense" name="지출" stroke="#EF4444" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={2} />
                <Area type="monotone" dataKey="income" name="수입" stroke="#10B981" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};
