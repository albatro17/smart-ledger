import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import type { Transaction, FlowType, ExpenseNature } from '../../types';
import { useLedger } from '../../context/LedgerContext';
import { Edit3, Trash2, Lock, Zap } from 'lucide-react';

interface TransactionEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
}

export const TransactionEditModal: React.FC<TransactionEditModalProps> = ({
  isOpen,
  onClose,
  transaction,
}) => {
  const { updateTransaction, deleteTransaction, categories } = useLedger();

  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number | string>('');
  const [flowType, setFlowType] = useState<FlowType>('지출');
  const [expenseNature, setExpenseNature] = useState<ExpenseNature>('변동비');
  const [categoryId, setCategoryId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [memo, setMemo] = useState('');

  useEffect(() => {
    if (transaction) {
      setDate(transaction.transaction_date || '');
      setDescription(transaction.description || '');
      setAmount(transaction.amount || '');
      setFlowType(transaction.flow_type || '지출');
      setExpenseNature(transaction.expense_nature || '변동비');
      setCategoryId(transaction.category_id || '');
      setPaymentMethod(transaction.payment_method || '');
      setMemo(transaction.memo || '');
    }
  }, [transaction]);

  if (!transaction) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedCat = categories.find(c => c.id === categoryId);

    await updateTransaction(transaction.id, {
      transaction_date: date,
      description,
      amount: Number(amount),
      flow_type: flowType,
      expense_nature: expenseNature,
      category_id: categoryId || null,
      category: selectedCat ? selectedCat.name : '미분류',
      payment_method: paymentMethod,
      memo,
    });
    onClose();
  };

  const handleDelete = async () => {
    if (window.confirm(`'${transaction.description}' 내역을 정말 삭제하시겠습니까?`)) {
      await deleteTransaction(transaction.id);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="거래내역 상세 수정"
      subtitle="카테고리, 고정비/변동비 성격, 금액 및 메모를 수정하세요."
      icon={<Edit3 className="w-5 h-5 text-emerald-500" />}
      maxWidth="lg"
    >
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              거래일자
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              유형 구분
            </label>
            <select
              value={flowType}
              onChange={(e) => setFlowType(e.target.value as FlowType)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            >
              <option value="지출">지출</option>
              <option value="수입">수입</option>
              <option value="이체">이체</option>
            </select>
          </div>
        </div>

        {/* Expense Nature Switch */}
        {flowType === '지출' && (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              지출 성격 (고정비 vs 단발성)
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setExpenseNature('변동비')}
                className={`flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  expenseNature === '변동비'
                    ? 'bg-amber-500 text-white shadow'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Zap className="w-3 h-3" />
                단발성 (변동비)
              </button>

              <button
                type="button"
                onClick={() => setExpenseNature('고정비')}
                className={`flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  expenseNature === '고정비'
                    ? 'bg-purple-500 text-white shadow'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Lock className="w-3 h-3" />
                고정비
              </button>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            거래내역명
          </label>
          <input
            type="text"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              금액(원)
            </label>
            <input
              type="number"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 text-base font-mono font-bold text-slate-900 dark:text-slate-100 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              카테고리 지정
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name} ({c.type})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            결제수단 (카드/계좌)
          </label>
          <input
            type="text"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            placeholder="예: 우리 K-패스, 토스뱅크"
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            메모
          </label>
          <textarea
            rows={2}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="필요한 추가 설명이나 영수증 메모를 입력하세요."
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            내역 삭제
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-md transition-all"
            >
              수정 완료
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
