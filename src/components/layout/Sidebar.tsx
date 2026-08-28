import React from 'react';
import { LayoutDashboard, ListFilter, Settings, UploadCloud, Cloud, RefreshCw } from 'lucide-react';
import { useLedger } from '../../context/LedgerContext';

interface SidebarProps {
  activeTab: 'dashboard' | 'transactions' | 'categories';
  setActiveTab: (tab: 'dashboard' | 'transactions' | 'categories') => void;
  onOpenImport: () => void;
  onOpenAuth: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenImport,
  onOpenAuth,
}) => {
  const { isRealtimeConnected, resetToSampleData } = useLedger();

  const navItems = [
    {
      id: 'dashboard',
      label: '자산 대시보드',
      icon: LayoutDashboard,
    },
    {
      id: 'transactions',
      label: '거래내역 관리',
      icon: ListFilter,
    },
    {
      id: 'categories',
      label: '카테고리 & 키워드 룰',
      icon: Settings,
    },
  ] as const;

  return (
    <aside className="hidden lg:flex flex-col w-64 glass-panel border-r border-slate-200 dark:border-slate-800 p-4 h-[calc(100vh-61px)] sticky top-[61px] justify-between">
      <div className="space-y-6">
        {/* Navigation Section */}
        <div>
          <div className="px-3 text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
            Main Menu
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Quick Actions Section */}
        <div>
          <div className="px-3 text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
            Quick Actions
          </div>
          <div className="space-y-1.5">
            <button
              onClick={onOpenImport}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all"
            >
              <UploadCloud className="w-4 h-4" />
              엑셀/CSV 일괄 업로드
            </button>

            <button
              onClick={onOpenAuth}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20 transition-all"
            >
              <Cloud className="w-4 h-4" />
              Supabase 클라우드 설정
            </button>
          </div>
        </div>
      </div>

      {/* Footer Info Widget */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 space-y-2">
        <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-xs">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">데이터 저장 상태</div>
          <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
            {isRealtimeConnected ? '⚡ PostgreSQL Realtime' : '💻 LocalStorage 지속성'}
          </div>
        </div>

        <button
          onClick={resetToSampleData}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          샘플 데이터 초기화
        </button>
      </div>
    </aside>
  );
};
