import React from 'react';
import type { ParsedTransaction, Category } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { CheckCircle2, AlertTriangle, HelpCircle, ArrowRight, ShieldCheck } from 'lucide-react';

interface ImportPreviewTableProps {
  rows: ParsedTransaction[];
  categories: Category[];
  onUpdateCategory: (index: number, categoryId: string, categoryName: string) => void;
  onConfirm: () => void;
  onBack: () => void;
}

export const ImportPreviewTable: React.FC<ImportPreviewTableProps> = ({
  rows,
  categories,
  onUpdateCategory,
  onConfirm,
  onBack,
}) => {
  const newCount = rows.filter(r => !r.is_duplicate).length;
  const duplicateCount = rows.filter(r => r.is_duplicate).length;
  const autoClassifiedCount = rows.filter(r => !r.is_duplicate && r.is_auto_classified).length;

  return (
    <div className="space-y-4">
      {/* Summary KPI Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0" />
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">신규 추가 예정</div>
            <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
              {newCount}건 등록
            </div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0" />
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">중복 데이터 (자동 제외)</div>
            <div className="text-base font-extrabold text-amber-600 dark:text-amber-400">
              {duplicateCount}건 제외
            </div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-cyan-500 flex-shrink-0" />
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">키워드 자동 분류</div>
            <div className="text-base font-extrabold text-cyan-600 dark:text-cyan-400">
              {autoClassifiedCount}건 성공
            </div>
          </div>
        </div>
      </div>

      <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
        <span>파싱 결과 미리보기 (총 {rows.length}개)</span>
        <span className="text-[11px] text-slate-400">
          * SHA-256 해시로 검증된 중복 데이터는 저장 시 자동으로 스킵됩니다.
        </span>
      </div>

      {/* Preview Table Container */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-[380px] overflow-y-auto">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="py-2.5 px-3">상태</th>
              <th className="py-2.5 px-3">일자</th>
              <th className="py-2.5 px-3">거래내역명</th>
              <th className="py-2.5 px-3">금액</th>
              <th className="py-2.5 px-3">결제수단</th>
              <th className="py-2.5 px-3">카테고리 (자동 지정 / 수동)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
            {rows.map((row, idx) => (
              <tr
                key={idx}
                className={row.is_duplicate ? 'opacity-50 bg-amber-500/5 dark:bg-amber-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}
              >
                <td className="py-2 px-3 whitespace-nowrap">
                  {row.is_duplicate ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      <AlertTriangle className="w-3 h-3" />
                      중복 제외
                    </span>
                  ) : row.is_auto_classified ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3" />
                      키워드 분류
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                      <HelpCircle className="w-3 h-3" />
                      미분류
                    </span>
                  )}
                </td>
                <td className="py-2 px-3 whitespace-nowrap font-mono text-slate-600 dark:text-slate-400">
                  {row.transaction_date}
                </td>
                <td className="py-2 px-3 font-medium text-slate-900 dark:text-white max-w-[160px] truncate" title={row.description}>
                  {row.description}
                </td>
                <td className={`py-2 px-3 font-mono font-bold whitespace-nowrap ${row.flow_type === '수입' ? 'text-emerald-500' : 'text-slate-900 dark:text-slate-100'}`}>
                  {formatCurrency(row.amount)}
                </td>
                <td className="py-2 px-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {row.payment_method}
                </td>
                <td className="py-2 px-3">
                  <select
                    disabled={row.is_duplicate}
                    value={row.category_id || ''}
                    onChange={(e) => {
                      const selectedCat = categories.find(c => c.id === e.target.value);
                      onUpdateCategory(idx, e.target.value, selectedCat ? selectedCat.name : '미분류');
                    }}
                    className="w-full px-2 py-1 text-[11px] rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
        <button
          onClick={onBack}
          className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          이전 단계
        </button>
        <button
          onClick={onConfirm}
          disabled={newCount === 0}
          className="flex items-center gap-1.5 px-6 py-2.5 text-xs font-extrabold rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50"
        >
          {newCount}건 가계부에 최종 등록하기
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
