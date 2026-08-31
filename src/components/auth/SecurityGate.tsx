import React, { useState } from 'react';
import { ShieldCheck, Lock, Eye, EyeOff, KeyRound, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface SecurityGateProps {
  onUnlock: () => void;
}

const DEFAULT_PIN = '1234';

export function getSavedPin(): string {
  return localStorage.getItem('voca_security_pin') || DEFAULT_PIN;
}

export function savePin(newPin: string) {
  localStorage.setItem('voca_security_pin', newPin);
}

export function isSecurityLockEnabled(): boolean {
  const val = localStorage.getItem('voca_security_enabled');
  return val !== 'false'; // Default enabled
}

export function setSecurityLockEnabled(enabled: boolean) {
  localStorage.setItem('voca_security_enabled', enabled ? 'true' : 'false');
}

export const SecurityGate: React.FC<SecurityGateProps> = ({ onUnlock }) => {
  const [pinInput, setPinInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepUnlocked, setKeepUnlocked] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  const correctPin = getSavedPin();

  const handleUnlock = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pinInput === correctPin) {
      if (keepUnlocked) {
        localStorage.setItem('voca_session_unlocked', 'true');
      } else {
        sessionStorage.setItem('voca_session_unlocked', 'true');
      }
      onUnlock();
    } else {
      setErrorMsg('비밀번호가 일치하지 않습니다. 다시 확인해주세요.');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    }
  };

  const handleKeypadPress = (num: string) => {
    if (pinInput.length < 20) {
      const next = pinInput + num;
      setPinInput(next);
      setErrorMsg('');
    }
  };

  const handleBackspace = () => {
    setPinInput(prev => prev.slice(0, -1));
    setErrorMsg('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 text-slate-100">
      <motion.div
        animate={isShaking ? { x: [-10, 10, -10, 10, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-6 text-center"
      >
        {/* Header Branding */}
        <div className="flex flex-col items-center gap-3">
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-lg shadow-emerald-500/10">
            <ShieldCheck className="w-10 h-10 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
              <Lock className="w-5 h-5 text-emerald-400" />
              스마트 자산관리 보안 잠금
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              가계부 데이터 보호를 위해 비밀번호를 입력해주세요.
            </p>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleUnlock} className="space-y-4">
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
              <KeyRound className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              autoFocus
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value);
                setErrorMsg('');
              }}
              placeholder="비밀번호 또는 PIN 번호 입력"
              className="w-full pl-10 pr-10 py-3 text-center text-lg font-mono font-bold tracking-widest rounded-xl border border-slate-700 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword(prev => !prev)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {errorMsg && (
            <p className="text-xs font-bold text-rose-400 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
              {errorMsg}
            </p>
          )}

          {/* Quick Keypad for 4-digit PIN */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeypadPress(num)}
                className="py-3 text-lg font-mono font-bold rounded-xl bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-white transition-all border border-slate-700/50"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPinInput('')}
              className="py-3 text-xs font-bold rounded-xl bg-slate-800/50 hover:bg-slate-700 active:scale-95 text-slate-400 transition-all border border-slate-700/50"
            >
              C (전체취소)
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress('0')}
              className="py-3 text-lg font-mono font-bold rounded-xl bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-white transition-all border border-slate-700/50"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="py-3 text-xs font-bold rounded-xl bg-slate-800/50 hover:bg-slate-700 active:scale-95 text-slate-400 transition-all border border-slate-700/50"
            >
              ← (지우기)
            </button>
          </div>

          {/* Remember Option */}
          <div className="flex items-center justify-center gap-2 pt-1 text-xs text-slate-400">
            <input
              type="checkbox"
              id="keep_unlocked"
              checked={keepUnlocked}
              onChange={(e) => setKeepUnlocked(e.target.checked)}
              className="w-4 h-4 text-emerald-500 rounded focus:ring-emerald-500 cursor-pointer"
            />
            <label htmlFor="keep_unlocked" className="cursor-pointer select-none">
              이 기기 브라우저에서 잠금 해제 상태 유지
            </label>
          </div>

          <button
            type="submit"
            className="w-full py-3 text-sm font-bold rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-[0.99] text-white shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            잠금 해제 및 가계부 입장
          </button>
        </form>

        {/* Initial Setup Hint */}
        <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-500">
          💡 초기 기본 비밀번호: <span className="font-mono font-bold text-emerald-400">1234</span> (입장 후 상단 🔒 보안 설정에서 변경 가능)
        </div>
      </motion.div>
    </div>
  );
};
