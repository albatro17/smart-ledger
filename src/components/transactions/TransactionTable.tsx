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

      {/* Main Table Container (No truncation, wrapping layout) */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden glass-panel shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-3 w-10 text-center">
                  <button onClick={handleSelectAll} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    {selectedIds.length > 0 && selectedIds.length === transactions.length ? (
                      <CheckSquare className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-3 min-w-[95px]">거래일자</th>
                <th className="py-3 px-3 min-w-[70px]">유형</th>
                <th className="py-3 px-3 min-w-[90px]">지출성격</th>
                <th className="py-3 px-3 min-w-[200px]">거래내역명 (무손실)</th>
                <th className="py-3 px-3 min-w-[130px] text-right">금액 (원)</th>
                <th className="py-3 px-3 min-w-[150px]">카테고리</th>
                <th className="py-3 px-3 min-w-[150px]">결제수단</th>
                <th className="py-3 px-3 min-w-[120px]">메모</th>
                <th className="py-3 px-3 w-20 text-center">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white/50 dark:bg-slate-900/50">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
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
                      <td className="py-3.5 px-3 text-center">
                        <button onClick={() => handleToggleSelect(tx.id)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                          {isSelected ? <CheckSquare className="w-4 h-4 text-emerald-500" /> : <Square className="w-4 h-4" />}
                        </button>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-3 whitespace-nowrap font-mono text-slate-600 dark:text-slate-400">
                        <div>{tx.transaction_date}</div>
                        {tx.transaction_time && (
                          <div className="text-[10px] text-slate-400 font-mono">{tx.transaction_time}</div>
                        )}
                      </td>

                      {/* Flow Type */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
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
                      </td>

                      {/* Expense Nature Interactive Badge */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {tx.flow_type === '수입' ? (
                          <span className="text-[10px] text-slate-400 italic">-</span>
                        ) : (
                          <button
                            onClick={() => toggleExpenseNature(tx.id)}
                            title="클릭하여 고정비/단발성(변동비) 성격 변경"
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold transition-transform active:scale-95 border ${
                              isFixed
                                ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30 hover:bg-purple-500/25'
                                : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/25'
                            }`}
                          >
                            {isFixed ? <Lock className="w-3 h-3 text-purple-500" /> : <Zap className="w-3 h-3 text-amber-500" />}
                            {isFixed ? '고정비' : '단발성'}
                          </button>
                        )}
                      </td>

                      {/* Description (No Truncation - Full wrapping) */}
                      <td
                        onClick={() => setEditingTransaction(tx)}
                        className="py-3.5 px-3 font-semibold text-slate-900 dark:text-white cursor-pointer hover:text-emerald-500 break-keep whitespace-normal leading-snug"
                      >
                        {tx.description}
                      </td>

                      {/* Amount (Maximized Visibility & Bold Typography) */}
                      <td className="py-3.5 px-3 font-mono font-black text-right whitespace-nowrap text-base sm:text-lg">
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
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-6 h-6 rounded-md flex items-center justify-center text-xs flex-shrink-0"
                            style={{ backgroundColor: `${catObj?.color || '#94A3B8'}20` }}
                          >
                            {catObj?.icon || '🏷️'}
                          </span>
                          <select
                            value={tx.category_id || ''}
                            onChange={(e) => handleInlineCategoryChange(tx.id, e.target.value)}
                            className="px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-emerald-500 max-w-[130px]"
                          >
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.icon} {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>

                      {/* Payment Method (No Truncation) */}
                      <td className="py-3.5 px-3 text-slate-700 dark:text-slate-300 break-keep whitespace-normal">
                        <div className="flex items-center gap-1">
                          <CreditCard className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span>{tx.payment_method}</span>
                        </div>
                      </td>

                      {/* Memo (No Truncation) */}
                      <td className="py-3.5 px-3 text-slate-500 dark:text-slate-400 break-keep whitespace-normal">
                        {tx.memo || '-'}
                      </td>

                      {/* Direct Trash Delete Action */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
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
