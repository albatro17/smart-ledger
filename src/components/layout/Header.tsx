import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon, Upload, Lock, Database, LogOut, FileText } from 'lucide-react';

interface HeaderProps {
  onOpenImport: () => void;
  onOpenSecurity: () => void;
  onOpenMigration: () => void;
  onOpenPdfExport: () => void;
  onLockNow: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenImport,
  onOpenSecurity,
  onOpenMigration,
  onOpenPdfExport,
  onLockNow,
}) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 w-full glass-panel border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 transition-all">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Brand / Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white font-black text-lg">
            진
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              진영 현미 가계부
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                PRO v2.5
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
              실시간 금융 엑셀 파서 & 스마트 자산관리 가계부
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          {/* Instant Lock Button */}
          <button
            onClick={onLockNow}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-500/30 transition-all active:scale-95"
            title="즉시 보안 잠금 화면으로 전환"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-500" />
            <span className="hidden sm:inline">즉시 잠금</span>
          </button>

          {/* Data Migration & Backup Button */}
          <button
            onClick={onOpenMigration}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold border border-amber-500/30 transition-all"
            title="데이터 백업, 복원 및 기존 도메인 이전 도구"
          >
            <Database className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">데이터 복구/백업</span>
          </button>

          {/* Security Settings Lock Button */}
          <button
            onClick={onOpenSecurity}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700 transition-all"
            title="접속 보안 & 비밀번호 설정"
          >
            <Lock className="w-3.5 h-3.5 text-emerald-500" />
            <span className="hidden sm:inline">보안 설정</span>
          </button>

          {/* Excel Upload Quick Action */}
          <button
            onClick={onOpenImport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-extrabold shadow-md shadow-emerald-500/20 transition-all"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">엑셀 업로드</span>
          </button>

          {/* PDF Export Report Button */}
          <button
            onClick={onOpenPdfExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-extrabold border border-purple-500/30 transition-all active:scale-95 shadow-xs"
            title="자산대시보드, 달력가계부, 전체자산, 거래내역 종합 PDF 변환 및 인쇄"
          >
            <FileText className="w-3.5 h-3.5 text-purple-500" />
            <span className="hidden sm:inline">PDF 출력</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="다크/라이트 모드 전환"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
        </div>
      </div>
    </header>
  );
};
