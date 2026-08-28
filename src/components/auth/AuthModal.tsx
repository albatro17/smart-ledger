import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { useLedger } from '../../context/LedgerContext';
import { saveSupabaseCredentials, clearSupabaseCredentials, getSupabaseCredentials } from '../../lib/supabase';
import { Cloud, Key, Database, Copy, Check, Zap } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SQL_DDL_SCRIPT = `-- 1. categories table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('지출', '수입', '이체')),
    icon TEXT NOT NULL DEFAULT '🏷️',
    color TEXT NOT NULL DEFAULT '#3B82F6',
    keywords TEXT[] DEFAULT '{}',
    is_default BOOLEAN DEFAULT false,
    default_expense_nature TEXT DEFAULT '변동비',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_category_name_type UNIQUE (user_id, name, type)
);

-- 2. transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    category TEXT,
    transaction_date DATE NOT NULL,
    transaction_time TIME,
    flow_type TEXT NOT NULL CHECK (flow_type IN ('지출', '수입', '이체')),
    expense_nature TEXT DEFAULT '변동비' CHECK (expense_nature IN ('고정비', '변동비')),
    account_type TEXT DEFAULT '카드',
    payment_method TEXT NOT NULL,
    description TEXT NOT NULL,
    amount BIGINT NOT NULL,
    payment_type TEXT DEFAULT '일시불',
    approval_status TEXT DEFAULT '정상',
    memo TEXT,
    unique_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_transaction_hash UNIQUE (user_id, unique_hash)
);

-- 3. Enable Supabase Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;`;

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { isRealtimeConnected, addToast } = useLedger();
  const currentCreds = getSupabaseCredentials();

  const [url, setUrl] = useState(currentCreds.url);
  const [anonKey, setAnonKey] = useState(currentCreds.anonKey);
  const [copied, setCopied] = useState(false);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !anonKey.trim()) {
      addToast({ type: 'error', title: '입력 오류', message: 'Supabase URL과 Anon Key를 모두 입력해주세요.' });
      return;
    }
    saveSupabaseCredentials(url, anonKey);
    addToast({ type: 'success', title: '클라우드 동기화 설정 완료', message: '페이지를 새로고침하여 Supabase Realtime을 연결합니다.' });
    setTimeout(() => {
      window.location.reload();
    }, 1200);
  };

  const handleDisconnect = () => {
    clearSupabaseCredentials();
    setUrl('');
    setAnonKey('');
    addToast({ type: 'info', title: '연결 해제', message: '로컬 데모 오프라인 모드로 전환되었습니다.' });
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(SQL_DDL_SCRIPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Supabase 클라우드 & 다중 기기 실시간 동기화"
      subtitle="Supabase PostgreSQL 연동으로 모바일/PC 간 데이터가 새로고침 없이 즉각 동기화됩니다."
      icon={<Cloud className="w-5 h-5 text-cyan-500" />}
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Status Card */}
        <div className={`p-4 rounded-xl border flex items-center justify-between ${
          isRealtimeConnected
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'
        }`}>
          <div className="flex items-center gap-3">
            <Zap className={`w-6 h-6 ${isRealtimeConnected ? 'text-emerald-500 animate-pulse' : 'text-slate-400'}`} />
            <div>
              <div className="text-xs font-semibold">현재 연결 상태</div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                {isRealtimeConnected
                  ? '⚡ Supabase Realtime 클라우드 동기화 가동 중 (다중 기기 실시간 sync)'
                  : '💻 로컬 지속성 데모 모드 가동 중 (브라우저 LocalStorage에 세션 저장)'}
              </div>
            </div>
          </div>

          {isRealtimeConnected && (
            <button
              onClick={handleDisconnect}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-500/20 text-rose-500 hover:bg-rose-500/30 transition-colors"
            >
              연결 해제
            </button>
          )}
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSaveConfig} className="space-y-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Key className="w-4 h-4 text-emerald-500" />
            Supabase Project API 설정
          </h4>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Supabase Project URL
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-project.supabase.co"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Supabase Anon Public API Key
            </label>
            <input
              type="password"
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-md transition-all"
            >
              API Key 저장 및 Realtime 연결
            </button>
          </div>
        </form>

        {/* SQL DDL Script */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-cyan-500" />
              Supabase PostgreSQL DDL 생성 스크립트 (SQL Editor 전용)
            </h4>
            <button
              onClick={copySqlToClipboard}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? '복사됨!' : 'SQL 복사'}
            </button>
          </div>

          <pre className="p-3 rounded-xl bg-slate-950 text-slate-300 font-mono text-[11px] max-h-48 overflow-y-auto border border-slate-800 leading-relaxed">
            {SQL_DDL_SCRIPT}
          </pre>
        </div>
      </div>
    </Modal>
  );
};
