import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { useLedger } from '../../context/LedgerContext';
import {
  getSavedPin,
  savePin,
  isSecurityLockEnabled,
  setSecurityLockEnabled,
} from './SecurityGate';
import { ShieldCheck, Lock, KeyRound, Check, LogOut, ShieldAlert } from 'lucide-react';

interface SecuritySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLockNow: () => void;
}

export const SecuritySettingsModal: React.FC<SecuritySettingsModalProps> = ({
  isOpen,
  onClose,
  onLockNow,
}) => {
  const { addToast } = useLedger();

  const [enabled, setEnabled] = useState(isSecurityLockEnabled());
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');

  const currentPin = getSavedPin();

  const handleToggleEnable = (newVal: boolean) => {
    setEnabled(newVal);
    setSecurityLockEnabled(newVal);
    addToast({
      type: 'info',
      title: '보안 잠금 설정',
      message: newVal ? '보안 잠금 기능이 활성화되었습니다.' : '보안 잠금 기능이 비활성화되었습니다.',
    });
  };

  const handleChangePin = (e: React.FormEvent) => {
    e.preventDefault();

    if (currentPinInput !== currentPin) {
      addToast({ type: 'error', title: '비밀번호 오류', message: '현재 비밀번호가 일치하지 않습니다.' });
      return;
    }

    if (!newPinInput.trim()) {
      addToast({ type: 'error', title: '입력 오류', message: '새 비밀번호를 입력해주세요.' });
      return;
    }

    if (newPinInput !== confirmPinInput) {
      addToast({ type: 'error', title: '비밀번호 불일치', message: '새 비밀번호와 확인 입력이 일치하지 않습니다.' });
      return;
    }

    savePin(newPinInput.trim());
    setCurrentPinInput('');
    setNewPinInput('');
    setConfirmPinInput('');

    addToast({ type: 'success', title: '비밀번호 변경 완료', message: '접속 보안 비밀번호가 변경되었습니다.' });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="접속 보안 & 비밀번호 설정"
      subtitle="가계부 앱 접속 시 사용할 비밀번호를 설정하거나 보안을 관리합니다."
      icon={<ShieldCheck className="w-5 h-5 text-emerald-500" />}
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Toggle Security ON/OFF */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${enabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-200 text-slate-500'}`}>
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">보안 잠금 게이트 활성화</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                앱 접속 시 비밀번호 입력창을 노출하여 타인의 접근을 방지합니다.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => handleToggleEnable(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
          </label>
        </div>

        {/* Change Password Form */}
        <form onSubmit={handleChangePin} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <KeyRound className="w-4 h-4 text-emerald-500" />
            비밀번호 / PIN 번호 변경
          </h4>

          <div>
            <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
              현재 비밀번호
            </label>
            <input
              type="password"
              required
              value={currentPinInput}
              onChange={(e) => setCurrentPinInput(e.target.value)}
              placeholder="현재 비밀번호 입력"
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
              새 비밀번호 (숫자 PIN 또는 문자열)
            </label>
            <input
              type="password"
              required
              value={newPinInput}
              onChange={(e) => setNewPinInput(e.target.value)}
              placeholder="새 비밀번호 입력 (예: 1234 또는 smart2026!)"
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
              새 비밀번호 재확인
            </label>
            <input
              type="password"
              required
              value={confirmPinInput}
              onChange={(e) => setConfirmPinInput(e.target.value)}
              placeholder="새 비밀번호 한번 더 입력"
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="flex items-center gap-1 px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white shadow-md transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              비밀번호 변경 저장
            </button>
          </div>
        </form>

        {/* Lock Now Action */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-rose-500/10 border border-rose-500/30">
          <div className="flex items-center gap-2 text-xs font-bold text-rose-600 dark:text-rose-400">
            <ShieldAlert className="w-4 h-4" />
            즉시 화면 잠금
          </div>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem('voca_session_unlocked');
              sessionStorage.removeItem('voca_session_unlocked');
              onLockNow();
              onClose();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-md transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            지금 화면 잠그기
          </button>
        </div>
      </div>
    </Modal>
  );
};
