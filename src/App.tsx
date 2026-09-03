import React, { useState, useMemo, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { LedgerProvider, useLedger } from './context/LedgerContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { BottomNav } from './components/layout/BottomNav';
import { ToastContainer } from './components/ui/Toast';

import { SummaryCards } from './components/dashboard/SummaryCards';
import { FinancialCharts } from './components/dashboard/FinancialCharts';
import { FilterToolbar } from './components/dashboard/FilterToolbar';
import { TransactionTable } from './components/transactions/TransactionTable';
import { FinancialCalendar } from './components/calendar/FinancialCalendar';
import { AssetManager } from './components/assets/AssetManager';

import { BulkImportModal } from './components/importer/BulkImportModal';
import { CategoryManagerModal } from './components/categories/CategoryManagerModal';
import { AuthModal } from './components/auth/AuthModal';
import { QuickAddModal } from './components/transactions/QuickAddModal';
import { SecurityGate, isSecurityLockEnabled } from './components/auth/SecurityGate';
import { SecuritySettingsModal } from './components/auth/SecuritySettingsModal';
import { DataMigrationModal } from './components/importer/DataMigrationModal';

import { Plus, Settings, Database } from 'lucide-react';

const AppContent: React.FC = () => {
  const { transactions, categories, filters } = useLedger();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'calendar' | 'assets' | 'transactions' | 'categories'>('dashboard');

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isMigrationOpen, setIsMigrationOpen] = useState(false);

  // Security Gate State
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    if (!isSecurityLockEnabled()) return true;
    const sessionVal = sessionStorage.getItem('voca_session_unlocked') || localStorage.getItem('voca_session_unlocked');
    return sessionVal === 'true';
  });

  useEffect(() => {
    if (isSecurityLockEnabled() && !isUnlocked) {
      const sessionVal = sessionStorage.getItem('voca_session_unlocked') || localStorage.getItem('voca_session_unlocked');
      if (sessionVal === 'true') {
        setIsUnlocked(true);
      }
    }
  }, [isUnlocked]);

  const prevMonthStr = useMemo(() => {
    const [y, m] = filters.month.split('-').map(Number);
    const date = new Date(y, m - 2, 1);
    const py = date.getFullYear();
    const pm = String(date.getMonth() + 1).padStart(2, '0');
    return `${py}-${pm}`;
  }, [filters.month]);

  const currentMonthTransactions = useMemo(() => {
    return transactions.filter(t => t.transaction_date && t.transaction_date.startsWith(filters.month));
  }, [transactions, filters.month]);

  const previousMonthTransactions = useMemo(() => {
    return transactions.filter(t => t.transaction_date && t.transaction_date.startsWith(prevMonthStr));
  }, [transactions, prevMonthStr]);

  const filteredTransactions = useMemo(() => {
    let result = [...transactions];

    if (filters.month) {
      result = result.filter(t => t.transaction_date && t.transaction_date.startsWith(filters.month));
    }

    if (filters.flowType !== 'ALL') {
      result = result.filter(t => t.flow_type === filters.flowType);
    }

    if (filters.expenseNature !== 'ALL') {
      result = result.filter(t => t.expense_nature === filters.expenseNature);
    }

    if (filters.categoryId !== 'ALL') {
      result = result.filter(t => t.category_id === filters.categoryId || t.category === filters.categoryId);
    }

    if (filters.paymentMethod !== 'ALL') {
      result = result.filter(t => t.payment_method === filters.paymentMethod);
    }

    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.trim().toLowerCase();
      result = result.filter(t =>
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.payment_method.toLowerCase().includes(q) ||
        (t.memo && t.memo.toLowerCase().includes(q)) ||
        t.amount.toString().includes(q)
      );
    }

    result.sort((a, b) => {
      if (filters.sortBy === 'date_desc') {
        const d = (b.transaction_date || '').localeCompare(a.transaction_date || '');
        if (d !== 0) return d;
        const t = (b.transaction_time || '').localeCompare(a.transaction_time || '');
        if (t !== 0) return t;
        return (b.created_at || '').localeCompare(a.created_at || '');
      }
      if (filters.sortBy === 'date_asc') {
        const d = (a.transaction_date || '').localeCompare(b.transaction_date || '');
        if (d !== 0) return d;
        const t = (a.transaction_time || '').localeCompare(b.transaction_time || '');
        if (t !== 0) return t;
        return (a.created_at || '').localeCompare(b.created_at || '');
      }
      if (filters.sortBy === 'amount_desc') return b.amount - a.amount;
      if (filters.sortBy === 'amount_asc') return a.amount - b.amount;
      return 0;
    });

    return result;
  }, [transactions, filters]);

  // If Security Lock is enabled and not unlocked, display Security Gate Lock Screen
  if (isSecurityLockEnabled() && !isUnlocked) {
    return <SecurityGate onUnlock={() => setIsUnlocked(true)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors selection:bg-emerald-500 selection:text-white">
      <ToastContainer />

      <Header
        onOpenImport={() => setIsImportOpen(true)}
        onOpenSecurity={() => setIsSecurityModalOpen(true)}
        onOpenMigration={() => setIsMigrationOpen(true)}
        onLockNow={() => setIsUnlocked(false)}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto pb-24 lg:pb-8">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenImport={() => setIsImportOpen(true)}
          onOpenSecurity={() => setIsSecurityModalOpen(true)}
          onOpenMigration={() => setIsMigrationOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {activeTab === 'dashboard' && '자산 & 지출 대시보드'}
                {activeTab === 'calendar' && '달력형 일별 수입·지출 가계부'}
                {activeTab === 'assets' && '전체 자산 & 부채 종합 현황'}
                {activeTab === 'transactions' && '가계부 거래내역 관리'}
                {activeTab === 'categories' && '카테고리 & 키워드 룰셋 관리'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {activeTab === 'dashboard' && '월별 지출 흐름, 고정비 vs 단발성 지출 비중 및 카테고리 시각화'}
                {activeTab === 'calendar' && '달력 그리드에서 일별 지출/수입 손익 현황 조회 및 클릭하여 상세 내역 확인'}
                {activeTab === 'assets' && '부동산, 자동차, 개인연금, 대출 현황 실시간 집계 및 순자산 분석'}
                {activeTab === 'transactions' && '검색, 필터, 수기 등록, 무손실 레이아웃 및 엑셀 일괄 관리'}
                {activeTab === 'categories' && '사용자 정의 키워드 매핑 룰과 카테고리 색상/아이콘 설정'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsQuickAddOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 transition-all"
              >
                <Plus className="w-4 h-4" />
                수기 거래 등록
              </button>
            </div>
          </div>

          {/* Quick Domain Data Migration Banner */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs shadow-xs">
            <div className="flex items-center gap-2 font-bold">
              <Database className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span>💡 기존 주소(smart-ledger-wine)에서 작성하셨던 가계부 데이터 원복 및 이전이 필요하신가요?</span>
            </div>
            <button
              onClick={() => setIsMigrationOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-xs transition-all text-xs flex items-center justify-center gap-1.5 flex-shrink-0"
            >
              기존 데이터 원클릭 복구 & 이전하기
            </button>
          </div>

          <FilterToolbar />

          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <SummaryCards
                currentMonthTransactions={currentMonthTransactions}
                previousMonthTransactions={previousMonthTransactions}
              />
              <FinancialCharts
                transactions={currentMonthTransactions}
                categories={categories}
              />
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  최근 거래 내역 ({filteredTransactions.length}건)
                </h3>
                <TransactionTable
                  transactions={filteredTransactions.slice(0, 10)}
                  categories={categories}
                />
              </div>
            </div>
          )}

          {activeTab === 'calendar' && (
            <FinancialCalendar
              transactions={filteredTransactions}
              categories={categories}
            />
          )}

          {activeTab === 'assets' && <AssetManager />}

          {activeTab === 'transactions' && (
            <div className="space-y-4">
              <TransactionTable
                transactions={filteredTransactions}
                categories={categories}
              />
            </div>
          )}

          {activeTab === 'categories' && (
            <div className="p-6 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">카테고리 관리</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    아래 버튼을 눌러 카테고리 색상/아이콘 및 키워드 룰을 변경하세요.
                  </p>
                </div>
                <button
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-md"
                >
                  <Settings className="w-4 h-4" />
                  카테고리 설정 모달 열기
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenQuickAdd={() => setIsQuickAddOpen(true)}
        onOpenImport={() => setIsImportOpen(true)}
        onOpenCategories={() => setIsCategoryModalOpen(true)}
      />

      <BulkImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
      />

      <CategoryManagerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />

      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
      />

      <SecuritySettingsModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
        onLockNow={() => setIsUnlocked(false)}
      />

      <DataMigrationModal
        isOpen={isMigrationOpen}
        onClose={() => setIsMigrationOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <LedgerProvider>
        <AppContent />
      </LedgerProvider>
    </ThemeProvider>
  );
}
