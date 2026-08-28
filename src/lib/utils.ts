import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import * as XLSX from 'xlsx';
import type { Transaction } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Generate valid RFC4122 v4 UUID string for Supabase PostgreSQL UUID primary key compat
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Format numbers as Korean Won with explicit + / - sign for clarity
export function formatCurrency(amount: number, flowType?: string, showSymbol = true): string {
  const formatted = new Intl.NumberFormat('ko-KR').format(Math.abs(amount));
  if (!showSymbol) return formatted;
  
  if (flowType === '수입') {
    return `+₩${formatted}`;
  } else if (flowType === '지출') {
    return `-₩${formatted}`;
  }
  return amount < 0 ? `-₩${formatted}` : `₩${formatted}`;
}

export function formatWon(amount: number): string {
  const formatted = new Intl.NumberFormat('ko-KR').format(Math.abs(amount));
  return `${amount < 0 ? '-' : ''}${formatted}원`;
}

// Date helpers
export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// Export transactions to Excel (.xlsx) file
export function exportTransactionsToExcel(transactions: Transaction[], fileName = '가계부_거래내역') {
  const exportData = transactions.map((t, idx) => ({
    'No.': idx + 1,
    '거래일자': t.transaction_date,
    '거래시간': t.transaction_time || '',
    '유형': t.flow_type,
    '지출성격': t.expense_nature || (t.flow_type === '지출' ? '변동비' : '-'),
    '카테고리': t.category,
    '거래내역': t.description,
    '금액(원)': t.amount,
    '결제수단': t.payment_method,
    '결제방식': t.payment_type || '일시불',
    '승인상태': t.approval_status || '정상',
    '메모': t.memo || '',
    '고유해시': t.unique_hash,
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '거래내역');
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 6 },  // No.
    { wch: 12 }, // 일자
    { wch: 10 }, // 시간
    { wch: 8 },  // 유형
    { wch: 10 }, // 지출성격
    { wch: 14 }, // 카테고리
    { wch: 28 }, // 내역
    { wch: 14 }, // 금액
    { wch: 18 }, // 결제수단
    { wch: 10 }, // 결제방식
    { wch: 10 }, // 승인상태
    { wch: 20 }, // 메모
    { wch: 20 }, // 해시
  ];

  XLSX.writeFile(workbook, `${fileName}_${getCurrentMonth()}.xlsx`);
}
