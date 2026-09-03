import React, { useState } from 'react';
import type { Transaction, Category } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { useLedger } from '../../context/LedgerContext';
import { Edit2, Trash2, CheckSquare, Square, CreditCard, Lock, Zap } from 'lucide-react';
import { TransactionEditModal } from './TransactionEditModal';

interface TransactionTableProps {
  transactions: Transaction[];
  categories: Category[];
}

export const TransactionTable: React.FC<TransactionTableProps> = ({ transactions, categories }) => {
  const { updateTransaction, toggleExpenseNature, deleteTransaction, bulkDeleteTransactions } = useLedger();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const categoryMap = React.useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach(c => map.set(c.id, c));
    return map;
  }, [categories]);

  const handleSelectAll = () => {
    if (selectedIds.length === transactions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(transactions.map(t => t.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]));
  };

  const handleSingleDelete = async (id: string, description: string) => {
    if (window.confirm(`'${description}' 거래내역을 정말 삭제하시겠습니까?`)) {
      await deleteTransaction(id);
      setSelectedIds(prev => prev.filter(i => i !== id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`선택한 ${selectedIds.length}건의 거래내역을 일괄 삭제하시겠습니까?`)) {
      await bulkDeleteTransactions(selectedIds);
      setSelectedIds([]);
    }
  };

  const handleInlineCategoryChange = async (transactionId: string, newCatId: string) => {
    const targetCat = categories.find(c => c.id === newCatId);
    await updateTransaction(transactionId, {
      category_id: newCatId,
      category: targetCat ? targetCat.name : '미분류',
    });
  };

  return (
    <div className="space-y-3">
      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs font-semibold">
          <span className="text-emerald-600 dark:text-emerald-400">
            총 {selectedIds.length}개 내역 선택됨
          </span>
          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            선택항목 일괄 삭제
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 1. MOBILE RESPONSIVE CARD VIEW (Visible only on < sm screens)   */}
      {/* No horizontal scrolling needed! Fits 100% of mobile screen.   */}
      {/* ------------------------------------------------------------- */}
      <div className="block sm:hidden space-y-2.5">
        {transactions.length === 0 ? (
          <div className="p-8 text-center glass-panel border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400">
            <p className="text-sm font-semibold">조건에 일치하는 거래내역이 없습니다.</p>
            <p className="text-xs mt-1">상단 필터를 조정하거나 엑셀을 업로드 해보세요.</p>
          </div>
        ) : (
          transactions.map((tx) => {
            const catObj = tx.category_id ? categoryMap.get(tx.category_id) : undefined;
            const isSelected = selectedIds.includes(tx.id);
            const isFixed = (tx.expense_nature || (catObj?.default_expense_nature)) === '고정비';

            return (
              <div
                key={tx.id}
                className={`p-3.5 rounded-2xl border transition-all glass-panel shadow-sm space-y-2.5 ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10 ring-1 ring-emerald-500'
                    : 'border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80'
                }`}
              >
                {/* Header Row: Checkbox, Date/Time, Flow Tag, Fixed/Variable Badge */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleSelect(tx.id)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                    >
                      {isSelected ? <CheckSquare className="w-4 h-4 text-emerald-500" /> : <Square className="w-4 h-4" />}
                    </button>
                    <div className="font-mono text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <span>{tx.transaction_date}</span>
                      {tx.transaction_time && (
                        <span className="text-[10px] text-slate-400">({tx.transaction_time})</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        tx.flow_type === '지출'
                          ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                          : tx.flow_type === '수입'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/20'
                      }`}
                    >
                      {tx.flow_type}
                    </span>

                    {tx.flow_type === '지출' && (
                      <button
                        onClick={() => toggleExpenseNature(tx.id)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                          isFixed
                            ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30'
                            : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {isFixed ? <Lock className="w-3 h-3 text-purple-500" /> : <Zap className="w-3 h-3 text-amber-500" />}
                        {isFixed ? '고정비' : '단발성'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Main Body Row: Description & Amount */}
                <div className="flex items-start justify-between gap-3 pt-0.5">
                  <div className="flex-1 min-w-0">
                    <h4
                      onClick={() => setEditingTransaction(tx)}
                      className="text-sm font-bold text-slate-900 dark:text-white cursor-pointer hover:text-emerald-500 break-keep leading-snug"
                    >
                      {tx.description}
                    </h4>

                    {/* Payment Method info */}
                    <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
                      <CreditCard className="w-3 h-3 text-slate-400" />
                      <span>{tx.payment_method}</span>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="font-mono font-black text-right text-base whitespace-nowrap pt-0.5">
                    <span
                      className={
                        tx.flow_type === '수입'
                          ? 'text-emerald-500 drop-shadow-sm'
                          : 'text-rose-500 dark:text-rose-400 drop-shadow-sm'
                      }
                    >
                      {formatCurrency(tx.amount, tx.flow_type)}
                    </span>
                  </div>
                </div>

                {/* Bottom Row: Category Selector & Action Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                  <div className="flex items-center gap-1.5 flex-1">
                    <span
                      className="w-5 h-5 rounded-md flex items-center justify-center text-xs flex-shrink-0"
                      style={{ backgroundColor: `${catObj?.color || '#94A3B8'}20` }}
                    >
                      {catObj?.icon || '🏷️'}
                    </span>
                    <select
                      value={tx.category_id || ''}
                      onChange={(e) => handleInlineCategoryChange(tx.id, e.target.value)}
                      className="px-2 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-emerald-500 max-w-[150px]"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.icon} {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingTransaction(tx)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="상세 수정"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleSingleDelete(tx.id, tx.description)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                      title="즉시 삭제"
                    >
                      <Trash2 className="w-4 h-4 text-rose-500/80 hover:text-rose-500" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. DESKTOP TABLE VIEW (Zero Horizontal Scroll Auto-Fit)       */}
      {/* ------------------------------------------------------------- */}
      <div className="hidden sm:block border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden glass-panel shadow-sm">
        <div className="w-full">
          <table className="w-full text-left text-xs table-auto">
            <thead className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-2.5 px-2 w-8 text-center whitespace-nowrap">
                  <button onClick={handleSelectAll} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    {selectedIds.length > 0 && selectedIds.length === transactions.length ? (
                      <CheckSquare className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-2.5 px-2 w-[85px] whitespace-nowrap">거래일자</th>
                <th className="py-2.5 px-2 w-[55px] text-center whitespace-nowrap">유형</th>
                <th className="py-2.5 px-2 w-[75px] text-center whitespace-nowrap">지출성격</th>
                <th className="py-2.5 px-2 whitespace-nowrap">거래내역명</th>
                <th className="py-2.5 px-2 w-[110px] text-right whitespace-nowrap">금액 (원)</th>
                <th className="py-2.5 px-2 w-[125px] whitespace-nowrap">카테고리</th>
                <th className="py-2.5 px-2 w-[110px] whitespace-nowrap">결제수단</th>
                <th className="py-2.5 px-2 w-16 text-center whitespace-nowrap">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white/50 dark:bg-slate-900/50">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-semibold">조건에 일치하는 거래내역이 없습니다.</p>
                    <p className="text-xs mt-1">상단 필터를 조정하거나 엑셀을 업로드 해보세요.</p>
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const catObj = tx.category_id ? categoryMap.get(tx.category_id) : undefined;
                  const isSelected = selectedIds.includes(tx.id);
                  const isFixed = (tx.expense_nature || (catObj?.default_expense_nature)) === '고정비';

                  return (
                    <tr
                      key={tx.id}
                      className={`hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-colors ${
                        isSelected ? 'bg-emerald-500/5 dark:bg-emerald-500/10' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-2.5 px-2 text-center">
                        <button onClick={() => handleToggleSelect(tx.id)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                          {isSelected ? <CheckSquare className="w-4 h-4 text-emerald-500" /> : <Square className="w-4 h-4" />}
                        </button>
                      </td>

                      {/* Date */}
                      <td className="py-2.5 px-2 whitespace-nowrap font-mono text-slate-600 dark:text-slate-400 text-xs">
                        <div>{tx.transaction_date}</div>
                        {tx.transaction_time && (
                          <div className="text-[10px] text-slate-400 font-mono">{tx.transaction_time}</div>
                        )}
                      </td>

                      {/* Flow Type */}
                      <td className="py-2.5 px-2 whitespace-nowrap text-center">
                        <span
                          className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                            tx.flow_type === '지출'
                              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                              : tx.flow_type === '수입'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/20'
                          }`}
                        >
                          {tx.flow_type}
                        </span>
                      </td>

                      {/* Expense Nature Interactive Badge */}
                      <td className="py-2.5 px-2 whitespace-nowrap text-center">
                        {tx.flow_type === '수입' ? (
                          <span className="text-[10px] text-slate-400 italic">-</span>
                        ) : (
                          <button
                            onClick={() => toggleExpenseNature(tx.id)}
                            title="클릭하여 고정비/단발성(변동비) 성격 변경"
                            className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold transition-transform active:scale-95 border ${
                              isFixed
                                ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30 hover:bg-purple-500/25'
                                : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/25'
                            }`}
                          >
                            {isFixed ? <Lock className="w-2.5 h-2.5 text-purple-500" /> : <Zap className="w-2.5 h-2.5 text-amber-500" />}
                            {isFixed ? '고정비' : '단발성'}
                          </button>
                        )}
                      </td>

                      {/* Description */}
                      <td
                        onClick={() => setEditingTransaction(tx)}
                        className="py-2.5 px-2 font-semibold text-slate-900 dark:text-white cursor-pointer hover:text-emerald-500 break-keep leading-snug"
                      >
                        {tx.description}
                      </td>

                      {/* Amount */}
                      <td className="py-2.5 px-2 font-mono font-black text-right whitespace-nowrap text-sm sm:text-base">
                        <span
                          className={
                            tx.flow_type === '수입'
                              ? 'text-emerald-500 drop-shadow-sm'
                              : 'text-rose-500 dark:text-rose-400 drop-shadow-sm'
                          }
                        >
                          {formatCurrency(tx.amount, tx.flow_type)}
                        </span>
                      </td>

                      {/* Category Selector */}
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-1">
                          <span
                            className="w-5 h-5 rounded-md flex items-center justify-center text-xs flex-shrink-0"
                            style={{ backgroundColor: `${catObj?.color || '#94A3B8'}20` }}
                          >
                            {catObj?.icon || '🏷️'}
                          </span>
                          <select
                            value={tx.category_id || ''}
                            onChange={(e) => handleInlineCategoryChange(tx.id, e.target.value)}
                            className="px-1.5 py-0.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-emerald-500 w-full max-w-[110px]"
                          >
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.icon} {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>

                      {/* Payment Method */}
                      <td className="py-2.5 px-2 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        <div className="flex items-center gap-1 truncate max-w-[105px]">
                          <CreditCard className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{tx.payment_method}</span>
                        </div>
                      </td>

                      {/* Direct Trash Delete Action */}
                      <td className="py-2.5 px-2 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setEditingTransaction(tx)}
                            className="p-1 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="상세 수정"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleSingleDelete(tx.id, tx.description)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                            title="즉시 삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500/80 hover:text-rose-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <TransactionEditModal
        isOpen={Boolean(editingTransaction)}
        onClose={() => setEditingTransaction(null)}
        transaction={editingTransaction}
      />
    </div>
  );
};
