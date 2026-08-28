import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { useLedger } from '../../context/LedgerContext';
import type { FlowType, ExpenseNature } from '../../types';
import { PlusCircle, Sparkles, Lock, Zap } from 'lucide-react';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({ isOpen, onClose }) => {
  const { addSingleTransaction, categories } = useLedger();

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [flowType, setFlowType] = useState<FlowType>('지출');
  const [expenseNature, setExpenseNature] = useState<ExpenseNature>('변동비');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('우리 K-패스');
  const [categoryId, setCategoryId] = useState('');
  const [memo, setMemo] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) return;

    const selectedCat = categories.find(c => c.id === categoryId);

    const success = await addSingleTransaction({
      transaction_date: date,
      flow_type: flowType,
      expense_nature: expenseNature,
      description,
      amount: Number(amount),
      payment_method: paymentMethod,
      category_id: categoryId || undefined,
      category: selectedCat ? selectedCat.name : undefined,
      memo,
    });

    if (success) {
      setDescription('');
      setAmount('');
      setMemo('');
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="모바일 퀵 거래내역 수기 등록"
      subtitle="현금 결제나 영수증 내역을 즉시 수기 등록하세요. (고정비/변동비 지정 가능)"
      icon={<PlusCircle className="w-5 h-5 text-emerald-500" />}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Flow Type Switch */}
        <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          {(['지출', '수입', '이체'] as FlowType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setFlowType(type)}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                flowType === type
                  ? type === '지출'
                    ? 'bg-rose-500 text-white shadow'
                    : type === '수입'
                    ? 'bg-emerald-500 text-white shadow'
                    : 'bg-cyan-500 text-white shadow'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Expense Nature Switcher */}
        {flowType === '지출' && (
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              지출 성격 구분
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
            거래내역 / 가맹점명 <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="예: 스타벅스 강남점, 아파트 관리비, 버스요금"
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            금액 (원) <span className="text-rose-500">*</span>
          </label>
          <input
            type="number"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="예: 12500"
            className="w-full px-3 py-2 text-base font-mono font-bold text-slate-900 dark:text-slate-100 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              결제 수단
            </label>
            <input
              type="text"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              placeholder="예: 우리 K-패스, 현금"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
              <span>카테고리</span>
              <span className="text-[10px] text-emerald-500 font-normal">자동 매칭</span>
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            >
              <option value="">[자동 키워드 매칭 사용]</option>
              {categories
                .filter(c => c.type === flowType)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            메모
          </label>
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="간단한 추가 메모를 입력하세요."
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            취소
          </button>
          <button
            type="submit"
            className="flex items-center gap-1.5 px-6 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/25 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            수기 등록 완료
          </button>
        </div>
      </form>
    </Modal>
  );
};
