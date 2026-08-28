import React, { useState } from 'react';
import type { Category } from '../../types';
import { useLedger } from '../../context/LedgerContext';
import { Tag, Plus, X, Sparkles, AlertCircle } from 'lucide-react';

interface KeywordRuleEditorProps {
  category: Category;
}

export const KeywordRuleEditor: React.FC<KeywordRuleEditorProps> = ({ category }) => {
  const { updateCategoryKeywords, reRunAutoClassification } = useLedger();
  const [newTag, setNewTag] = useState('');

  const handleAddTag = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const rawInput = newTag.trim();
    if (!rawInput) return;

    // Support comma or space separated input (e.g. "마라탕, 배민, 스타벅스")
    const tagsToAdd = rawInput
      .split(/[,;\n]+/)
      .map(t => t.trim())
      .filter(t => t.length > 0);

    if (tagsToAdd.length === 0) return;

    const currentKeywords = category.keywords || [];
    const newUniqueTags = tagsToAdd.filter(t => !currentKeywords.includes(t));

    if (newUniqueTags.length === 0) {
      setNewTag('');
      return;
    }

    const updated = [...currentKeywords, ...newUniqueTags];
    await updateCategoryKeywords(category.id, updated);
    setNewTag('');
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    const currentKeywords = category.keywords || [];
    const updated = currentKeywords.filter(k => k !== tagToRemove);
    await updateCategoryKeywords(category.id, updated);
  };

  return (
    <div className="space-y-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-emerald-500" />
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            자동 분류 키워드 룰셋 (`{category.name}`)
          </h4>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
          총 {category.keywords?.length || 0}개 키워드
        </span>
      </div>

      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
        엑셀/CSV 업로드 시 거래내역 텍스트에 아래 키워드가 포함되면 자동으로 <strong>'{category.name}'</strong> 카테고리로 지정됩니다.
      </p>

      {/* Add tag form */}
      <form onSubmit={handleAddTag} className="flex gap-2">
        <input
          type="text"
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          placeholder="예: 마라탕, 스타벅스, 배민 (쉼표로 여러 개 동시 추가 가능)"
          className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          type="submit"
          className="flex items-center gap-1 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white shadow-md transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          추가
        </button>
      </form>

      {/* Tags Cloud */}
      <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pt-1">
        {!category.keywords || category.keywords.length === 0 ? (
          <div className="flex items-center gap-1.5 text-xs text-slate-400 italic py-2">
            <AlertCircle className="w-3.5 h-3.5" />
            등록된 키워드가 없습니다. 상단에서 키워드를 추가해보세요!
          </div>
        ) : (
          category.keywords.map((kw) => (
            <span
              key={kw}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 group border border-slate-300 dark:border-slate-600"
            >
              #{kw}
              <button
                type="button"
                onClick={() => handleRemoveTag(kw)}
                className="text-slate-400 hover:text-rose-500 ml-0.5"
                title="키워드 삭제"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))
        )}
      </div>

      <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 flex justify-end">
        <button
          type="button"
          onClick={reRunAutoClassification}
          className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
          이 키워드 룰을 미분류 내역에 즉시 적용하기
        </button>
      </div>
    </div>
  );
};
