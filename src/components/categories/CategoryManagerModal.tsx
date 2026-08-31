import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { useLedger } from '../../context/LedgerContext';
import type { Category, FlowType } from '../../types';
import { KeywordRuleEditor } from './KeywordRuleEditor';
import { Settings, Plus, Edit2, Trash2, Palette, Check, ShieldAlert, Ban } from 'lucide-react';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EMOJI_OPTIONS = ['🍔', '🚗', '🏠', '🛍️', '🎮', '🏥', '💰', '✨', '🏦', '✈️', '☕', '💡', '📚', '🐶', '🎁', '❓'];
const COLOR_OPTIONS = ['#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#EF4444', '#06B6D4', '#64748B', '#F97316', '#84CC16', '#6366F1', '#D946EF'];

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({ isOpen, onClose }) => {
  const { categories, addCategory, updateCategory, deleteCategory } = useLedger();

  const [activeTab, setActiveTab] = useState<FlowType>('지출');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reassignTargetId, setReassignTargetId] = useState<string>('');

  // Dynamically derive the selectedCategory from latest global categories array
  const selectedCategory = categories.find(c => c.id === selectedCategoryId) || null;

  // Form State
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<FlowType>('지출');
  const [formIcon, setFormIcon] = useState('🏷️');
  const [formColor, setFormColor] = useState('#3B82F6');
  const [formIsExcludedFromTotal, setFormIsExcludedFromTotal] = useState(false);

  const filteredCategories = categories.filter(c => c.type === activeTab);

  const startCreate = () => {
    setFormName('');
    setFormType(activeTab);
    setFormIcon('🏷️');
    setFormColor('#10B981');
    setFormIsExcludedFromTotal(false);
    setIsAdding(true);
    setIsEditing(false);
  };

  const startEdit = (cat: Category) => {
    setSelectedCategoryId(cat.id);
    setFormName(cat.name);
    setFormType(cat.type);
    setFormIcon(cat.icon);
    setFormColor(cat.color);
    setFormIsExcludedFromTotal(cat.is_excluded_from_total || false);
    setIsEditing(true);
    setIsAdding(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (isAdding) {
      await addCategory({
        name: formName.trim(),
        type: formType,
        icon: formIcon,
        color: formColor,
        keywords: [],
        is_default: false,
        is_excluded_from_total: formIsExcludedFromTotal,
      });
      setIsAdding(false);
    } else if (isEditing && selectedCategory) {
      await updateCategory(selectedCategory.id, {
        name: formName.trim(),
        type: formType,
        icon: formIcon,
        color: formColor,
        is_excluded_from_total: formIsExcludedFromTotal,
      });
      setIsEditing(false);
    }
  };

  const handleToggleCategoryExclusion = async (cat: Category, e: React.MouseEvent) => {
    e.stopPropagation();
    await updateCategory(cat.id, {
      is_excluded_from_total: !cat.is_excluded_from_total,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!selectedCategory) return;
    await deleteCategory(selectedCategory.id, reassignTargetId || undefined);
    setIsDeleting(false);
    setSelectedCategoryId(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="카테고리 & 키워드 룰 관리"
      subtitle="지출/수입 카테고리를 설정하고, 당월 총지출 계산 집계 제외 카테고리를 관리하세요."
      icon={<Settings className="w-5 h-5 text-emerald-500" />}
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Flow Type Switcher Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex gap-2">
            {(['지출', '수입', '이체'] as FlowType[]).map((type) => (
              <button
                key={type}
                onClick={() => {
                  setActiveTab(type);
                  setSelectedCategoryId(null);
                  setIsEditing(false);
                  setIsAdding(false);
                }}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                  activeTab === type
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {type} 카테고리
              </button>
            ))}
          </div>

          <button
            onClick={startCreate}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            신규 카테고리
          </button>
        </div>

        {/* Form Modal/Section for Add/Edit */}
        {(isAdding || isEditing) && (
          <form onSubmit={handleSave} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {isAdding ? '새 카테고리 생성' : `'${selectedCategory?.name}' 정보 수정`}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  카테고리 이름
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="예: 외식비, 카페/간식"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  유형 구분
                </label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as FlowType)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="지출">지출</option>
                  <option value="수입">수입</option>
                  <option value="이체">이체</option>
                </select>
              </div>
            </div>

            {/* Total Expense Exclusion Checkbox */}
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <input
                type="checkbox"
                id="is_excluded_from_total_cb"
                checked={formIsExcludedFromTotal}
                onChange={(e) => setFormIsExcludedFromTotal(e.target.checked)}
                className="w-4 h-4 text-emerald-500 rounded focus:ring-emerald-500 cursor-pointer"
              />
              <label htmlFor="is_excluded_from_total_cb" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer select-none">
                🚫 당월 총 지출 계산 시 제외 (예: 이체/저축, 경비대납, 환급금 등)
              </label>
            </div>

            {/* Icon Picker */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                이모지 / 아이콘 선택
              </label>
              <div className="flex flex-wrap gap-2">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setFormIcon(emoji)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-base transition-transform ${
                      formIcon === emoji
                        ? 'bg-emerald-500/20 border-2 border-emerald-500 scale-110'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Palette Picker */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Palette className="w-3.5 h-3.5 text-emerald-500" />
                차트 표시용 시각화 색상
              </label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => setFormColor(hex)}
                    style={{ backgroundColor: hex }}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform ${
                      formColor === hex ? 'ring-4 ring-emerald-500/40 scale-110' : 'hover:scale-105'
                    }`}
                  >
                    {formColor === hex && <Check className="w-4 h-4 text-white drop-shadow" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setIsEditing(false);
                }}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white shadow-md"
              >
                저장하기
              </button>
            </div>
          </form>
        )}

        {/* Delete Options Modal Overlay */}
        {isDeleting && selectedCategory && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/40 space-y-3">
            <div className="flex items-center gap-2 text-rose-500 font-bold text-sm">
              <ShieldAlert className="w-5 h-5" />
              '{selectedCategory.name}' 카테고리 삭제 Confirmation
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              이 카테고리를 삭제하면 기존 거래내역들의 카테고리를 어떻게 변경할지 선택해야 합니다.
            </p>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                기존 내역 이전 대상 카테고리 선택
              </label>
              <select
                value={reassignTargetId}
                onChange={(e) => setReassignTargetId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                <option value="">미분류(기본값)로 이동</option>
                {categories
                  .filter(c => c.id !== selectedCategory.id)
                  .map(c => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name} ({c.type})
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsDeleting(false)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                취소
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-md"
              >
                삭제 및 이전 확정
              </button>
            </div>
          </div>
        )}

        {/* Categories Grid List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
          {filteredCategories.map((cat) => (
            <div
              key={cat.id}
              onClick={() => setSelectedCategoryId(cat.id)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                selectedCategoryId === cat.id
                  ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-md ring-1 ring-emerald-500'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-lg shadow-sm"
                    style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                  >
                    {cat.icon}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{cat.name}</span>
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: cat.color }}
                        title={`Visual color: ${cat.color}`}
                      />
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        키워드 {cat.keywords?.length || 0}개
                      </span>
                      {cat.is_excluded_from_total && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-300 flex items-center gap-0.5">
                          <Ban className="w-2.5 h-2.5" />
                          총지출 제외됨
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {/* 1-Click Total Expense Exclusion Toggle */}
                  <button
                    type="button"
                    onClick={(e) => handleToggleCategoryExclusion(cat, e)}
                    className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
                      cat.is_excluded_from_total
                        ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/30'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title={cat.is_excluded_from_total ? '클릭 시 당월 총지출 집계에 다시 포함' : '클릭 시 당월 총지출 집계에서 제외'}
                  >
                    <Ban className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startEdit(cat);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="카테고리 수정"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {cat.name !== '미분류' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCategoryId(cat.id);
                        setIsDeleting(true);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="카테고리 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Keywords Preview */}
              <div className="flex flex-wrap gap-1 mt-1">
                {cat.keywords && cat.keywords.length > 0 ? (
                  cat.keywords.slice(0, 3).map((kw) => (
                    <span
                      key={kw}
                      className="px-1.5 py-0.5 text-[10px] rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    >
                      #{kw}
                    </span>
                  ))
                ) : (
                  <span className="text-[10px] text-slate-400 italic">등록 키워드 없음</span>
                )}
                {cat.keywords && cat.keywords.length > 3 && (
                  <span className="text-[10px] text-slate-400">+{cat.keywords.length - 3}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Selected Category Keyword Rule Editor Pane */}
        {selectedCategory && (
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <KeywordRuleEditor category={selectedCategory} />
          </div>
        )}
      </div>
    </Modal>
  );
};
