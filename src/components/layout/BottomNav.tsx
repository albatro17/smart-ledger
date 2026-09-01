import React from 'react';
import { LayoutDashboard, Calendar, ListFilter, Plus, UploadCloud, Settings } from 'lucide-react';

interface BottomNavProps {
  activeTab: 'dashboard' | 'calendar' | 'transactions' | 'categories';
  setActiveTab: (tab: 'dashboard' | 'calendar' | 'transactions' | 'categories') => void;
  onOpenQuickAdd: () => void;
  onOpenImport: () => void;
  onOpenCategories: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenQuickAdd,
  onOpenImport,
  onOpenCategories,
}) => {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass-panel border-t border-slate-200 dark:border-slate-800 px-2 py-2">
      <div className="flex items-center justify-around max-w-md mx-auto relative">
        {/* Dashboard Tab */}
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all ${
            activeTab === 'dashboard'
              ? 'text-emerald-500 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px]">대시보드</span>
        </button>

        {/* Calendar Tab */}
        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all ${
            activeTab === 'calendar'
              ? 'text-emerald-500 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[10px]">달력</span>
        </button>

        {/* Transactions Tab */}
        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all ${
            activeTab === 'transactions'
              ? 'text-emerald-500 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <ListFilter className="w-5 h-5" />
          <span className="text-[10px]">내역관리</span>
        </button>

        {/* Mobile Quick Add Floating Action Button (FAB) */}
        <div className="relative -top-5">
          <button
            onClick={onOpenQuickAdd}
            className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/40 hover:scale-105 active:scale-95 transition-transform"
            title="빠른 수기 등록"
          >
            <Plus className="w-6 h-6 stroke-[3]" />
          </button>
        </div>

        {/* Excel Upload Tab */}
        <button
          onClick={onOpenImport}
          className="flex flex-col items-center gap-1 p-1.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
        >
          <UploadCloud className="w-5 h-5" />
          <span className="text-[10px]">엑셀등록</span>
        </button>

        {/* Category Config Tab */}
        <button
          onClick={onOpenCategories}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all ${
            activeTab === 'categories'
              ? 'text-emerald-500 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px]">카테고리</span>
        </button>
      </div>
    </nav>
  );
};
