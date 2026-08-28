import React from 'react';
import type { ColumnMapping } from '../../types';
import { Columns, ArrowRight } from 'lucide-react';

interface ColumnMappingStepProps {
  rawHeaders: string[];
  mapping: ColumnMapping;
  onChangeMapping: (mapping: ColumnMapping) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ColumnMappingStep: React.FC<ColumnMappingStepProps> = ({
  rawHeaders,
  mapping,
  onChangeMapping,
  onConfirm,
  onCancel,
}) => {
  const handleChange = (field: keyof ColumnMapping, value: string) => {
    onChangeMapping({
      ...mapping,
      [field]: value,
    });
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-start gap-3">
        <Columns className="w-5 h-5 text-cyan-500 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-slate-700 dark:text-slate-300">
          <h4 className="font-bold text-slate-900 dark:text-white mb-1">엑셀/CSV 열 매핑 확인</h4>
          업로드하신 파일의 항목 이름이 자동으로 감지되었습니다. 필요 시 아래 드롭다운에서 정확한 열을 선택해주세요.
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Date Field */}
        <div>
          <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
            거래일자 <span className="text-rose-500">*</span>
          </label>
          <select
            value={mapping.date}
            onChange={(e) => handleChange('date', e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
          >
            {rawHeaders.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>

        {/* Description Field */}
        <div>
          <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
            거래내역 / 가맹점명 <span className="text-rose-500">*</span>
          </label>
          <select
            value={mapping.description}
            onChange={(e) => handleChange('description', e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
          >
            {rawHeaders.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>

        {/* Amount Field */}
        <div>
          <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
            금액 <span className="text-rose-500">*</span>
          </label>
          <select
            value={mapping.amount}
            onChange={(e) => handleChange('amount', e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
          >
            {rawHeaders.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>

        {/* Payment Method Field */}
        <div>
          <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
            결제수단 (카드/계좌명)
          </label>
          <select
            value={mapping.paymentMethod || ''}
            onChange={(e) => handleChange('paymentMethod', e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
          >
            <option value="">[선택 안함 - 통합 결제수단 지정]</option>
            {rawHeaders.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>

        {/* Time Field */}
        <div>
          <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
            거래시간
          </label>
          <select
            value={mapping.time || ''}
            onChange={(e) => handleChange('time', e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
          >
            <option value="">[선택 안함]</option>
            {rawHeaders.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>

        {/* Flow Type Field */}
        <div>
          <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
            수입/지출/이체 구분
          </label>
          <select
            value={mapping.flowType || ''}
            onChange={(e) => handleChange('flowType', e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
          >
            <option value="">[선택 안함 - 기본 지출로 지정]</option>
            {rawHeaders.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          취소
        </button>
        <button
          onClick={onConfirm}
          className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-md transition-all"
        >
          다음: 파싱 데이터 검증 & 미리보기
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
