import React, { useState } from 'react';
import { useLedger, getExcludedCatIdsFromStorage } from '../../context/LedgerContext';
import { getSavedPin, isSecurityLockEnabled } from '../auth/SecurityGate';
import { getSupabaseClient } from '../../lib/supabase';
import {
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  Database,
  CloudUpload,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DataMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DataMigrationModal: React.FC<DataMigrationModalProps> = ({ isOpen, onClose }) => {
  const { transactions, categories, addToast } = useLedger();

  const [isUploadingCloud, setIsUploadingCloud] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  if (!isOpen) return null;

  // 1. Export Full Backup JSON File
  const handleExportBackupJSON = () => {
    try {
      let assets = [];
      try {
        const savedAssets = localStorage.getItem('voca_ledger_user_assets_v1');
        if (savedAssets) assets = JSON.parse(savedAssets);
      } catch (e) {}

      const backupObject = {
        version: '2.5',
        exportedAt: new Date().toISOString(),
        domain: window.location.hostname,
        transactions,
        categories,
        assets,
        security: {
          pin: getSavedPin(),
          enabled: isSecurityLockEnabled(),
          excludedCategories: Array.from(getExcludedCatIdsFromStorage()),
        },
      };

      const jsonStr = JSON.stringify(backupObject, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `진영현미가계부_전체백업_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addToast({
        type: 'success',
        title: '백업 파일 생성 완료',
        message: '가계부 전체 데이터 백업 JSON 파일이 성공적으로 다운로드되었습니다.',
      });
    } catch (e: any) {
      console.error('Backup export failed', e);
      addToast({
        type: 'error',
        title: '백업 실패',
        message: `백업 파일 생성 중 오류가 발생했습니다: ${e.message}`,
      });
    }
  };

  // 2. Import Full Backup JSON File
  const handleImportBackupJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const content = evt.target?.result as string;
        const backupData = JSON.parse(content);

        if (!backupData || typeof backupData !== 'object') {
          throw new Error('올바른 백업 JSON 파일 형식이 아닙니다.');
        }

        // Restore Transactions
        if (Array.isArray(backupData.transactions) && backupData.transactions.length > 0) {
          localStorage.setItem('voca_ledger_transactions_v1', JSON.stringify(backupData.transactions));
        }

        // Restore Categories
        if (Array.isArray(backupData.categories) && backupData.categories.length > 0) {
          localStorage.setItem('voca_ledger_categories_v1', JSON.stringify(backupData.categories));
        }

        // Restore Assets
        if (Array.isArray(backupData.assets) && backupData.assets.length > 0) {
          localStorage.setItem('voca_ledger_user_assets_v1', JSON.stringify(backupData.assets));
        }

        // Restore Security Settings
        if (backupData.security) {
          if (backupData.security.pin) {
            localStorage.setItem('voca_security_pin', backupData.security.pin);
          }
          if (backupData.security.enabled !== undefined) {
            localStorage.setItem('voca_security_enabled', backupData.security.enabled ? 'true' : 'false');
          }
          if (Array.isArray(backupData.security.excludedCategories)) {
            localStorage.setItem('voca_ledger_excluded_categories_v1', JSON.stringify(backupData.security.excludedCategories));
          }
        }

        // Upload Restored Data to Supabase Cloud DB immediately
        const supabase = getSupabaseClient();
        if (supabase) {
          if (Array.isArray(backupData.categories) && backupData.categories.length > 0) {
            await supabase.from('categories').upsert(backupData.categories);
          }
          if (Array.isArray(backupData.transactions) && backupData.transactions.length > 0) {
            await supabase.from('transactions').upsert(backupData.transactions);
          }
        }

        addToast({
          type: 'success',
          title: '데이터 복구 완료!',
          message: '모든 거래내역, 카테고리, 자산 현황 및 보안 설정이 복구되었습니다. 페이지를 새로고침합니다.',
        });

        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } catch (err: any) {
        console.error('Import backup failed', err);
        addToast({
          type: 'error',
          title: '복구 실패',
          message: `백업 파일 처리 중 오류가 발생했습니다: ${err.message}`,
        });
      }
    };
    reader.readAsText(file);
  };

  // 3. Upload All Current Local Data to Supabase Cloud DB
  const handleUploadAllLocalToCloud = async () => {
    setIsUploadingCloud(true);
    setStatusMsg('클라우드 DB에 데이터를 업로드 중입니다...');

    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase 클라이언트 연결 설정이 올바르지 않습니다.');
      }

      // 1. Categories
      if (categories.length > 0) {
        await supabase.from('categories').upsert(categories);
      }

      // 2. Transactions
      if (transactions.length > 0) {
        const { error: txErr } = await supabase.from('transactions').upsert(transactions);
        if (txErr && txErr.code === '23503') {
          const fallbackTxs = transactions.map(t => ({ ...t, category_id: null }));
          await supabase.from('transactions').upsert(fallbackTxs);
        }
      }

      // 3. Assets
      let assets = [];
      try {
        const savedAssets = localStorage.getItem('voca_ledger_user_assets_v1');
        if (savedAssets) assets = JSON.parse(savedAssets);
      } catch (e) {}

      if (assets.length > 0) {
        await supabase.from('categories').upsert([
          {
            id: '00000000-0000-0000-0000-000000000001',
            name: 'system_user_assets',
            type: '이체',
            icon: '🏛️',
            color: '#10B981',
            keywords: [JSON.stringify(assets)],
            is_default: false,
          },
        ]);
      }

      // 4. Security & Excluded Categories
      let excludedArr = Array.from(getExcludedCatIdsFromStorage());
      await supabase.from('categories').upsert([
        {
          id: '00000000-0000-0000-0000-000000000000',
          name: 'system_security_settings',
          type: '이체',
          icon: '🔒',
          color: '#000000',
          keywords: [getSavedPin(), isSecurityLockEnabled() ? 'true' : 'false', JSON.stringify(excludedArr)],
          is_default: false,
        },
      ]);

      addToast({
        type: 'success',
        title: '클라우드 전역 동기화 완료!',
        message: '모든 데이터가 Supabase 서버에 정상 동기화되었습니다. 새로운 주소에서도 자동으로 로드됩니다.',
      });
      setStatusMsg('✅ 클라우드 동기화 완료!');
    } catch (e: any) {
      console.error('Cloud upload error', e);
      addToast({
        type: 'error',
        title: '클라우드 업로드 실패',
        message: `클라우드 저장 실패: ${e.message}`,
      });
      setStatusMsg('❌ 업로드 중 오류 발생');
    } finally {
      setIsUploadingCloud(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-lg p-6 rounded-3xl glass-panel bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6 text-slate-900 dark:text-slate-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black tracking-tight">
                  데이터 백업, 복원 및 도메인 이전 도구
                </h3>
                <p className="text-[11px] text-slate-400">
                  기존 주소(smart-ledger-wine) 데이터 원클릭 이전 및 JSON 파일 백업/복원
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              ✕
            </button>
          </div>

          {/* Domain Isolation Warning Notice Box */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span>기존 주소에서 새 주소(jinyoung-ledger)로 데이터 옮기는 방법</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              웹 브라우저는 도메인(주소)별로 데이터 저장소가 독립적으로 나뉩니다. 기존 주소(smart-ledger-wine) 접속 기기에서 백업 받으신 후 새 주소에서 [복원] 하시거나 [클라우드 동기화]를 누르시면 1초 만에 100% 복구됩니다!
            </p>
          </div>

          {/* Migration Actions List */}
          <div className="space-y-3">
            {/* Step 1: Open Previous Site */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-black">1</span>
                  기존 주소(smart-ledger-wine)로 접속하기
                </span>
                <a
                  href="https://smart-ledger-wine.vercel.app/"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-xs transition-all"
                >
                  기존 사이트 열기
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <p className="text-[11px] text-slate-400">
                기존에 사용하시던 기기에서 접속 후 아래 [백업 다운로드] 버튼을 누르세요.
              </p>
            </div>

            {/* Step 2: Export & Import JSON */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Export JSON */}
              <button
                onClick={handleExportBackupJSON}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-left transition-all space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 group-hover:scale-110 transition-transform">
                    <Download className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-extrabold text-blue-500">JSON 내보내기</span>
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white">전체 백업 다운로드</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">모든 거래·자산·설정을 JSON 파일로 백업</div>
                </div>
              </button>

              {/* Import JSON */}
              <label className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-left transition-all space-y-2 group cursor-pointer block">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackupJSON}
                  className="hidden"
                />
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 group-hover:scale-110 transition-transform">
                    <Upload className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-extrabold text-emerald-500">JSON 가져오기</span>
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white">백업 파일로 복원</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">다운로드받은 JSON 파일 선택하여 즉시 복구</div>
                </div>
              </label>
            </div>

            {/* Step 3: Cloud Sync Upload */}
            <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <CloudUpload className="w-4 h-4 text-emerald-500" />
                    Supabase 클라우드 전체 동기화
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    현재 기기의 로컬 데이터를 클라우드 서버로 업로드하여 모든 주소 및 기기에 적용합니다.
                  </p>
                </div>

                <button
                  onClick={handleUploadAllLocalToCloud}
                  disabled={isUploadingCloud}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-bold shadow-md transition-all flex-shrink-0"
                >
                  {isUploadingCloud ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  클라우드 업로드
                </button>
              </div>

              {statusMsg && (
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  {statusMsg}
                </p>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>⚡ 현재 접속 도메인: {window.location.hostname}</span>
            <button
              onClick={onClose}
              className="font-bold text-slate-600 dark:text-slate-200 hover:underline"
            >
              창 닫기
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
