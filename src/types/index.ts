export type FlowType = '지출' | '수입' | '이체';
export type AccountType = '카드' | '계좌' | '현금' | '기타';
export type PaymentType = '일시불' | '할부' | '기타';
export type ApprovalStatus = '정상' | '취소' | '승인';
export type ExpenseNature = '고정비' | '변동비';

export interface Category {
  id: string;
  user_id?: string;
  name: string;
  type: FlowType;
  icon: string;
  color: string;
  keywords: string[];
  is_default: boolean;
  default_expense_nature?: ExpenseNature;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id?: string;
  category_id?: string | null;
  category: string;
  transaction_date: string; // YYYY-MM-DD
  transaction_time?: string; // HH:mm:ss
  flow_type: FlowType;
  expense_nature?: ExpenseNature; // '고정비' | '변동비'
  account_type: AccountType | string;
  payment_method: string; // e.g. "우리 K-패스", "우리급여 저축예금"
  description: string;
  amount: number;
  payment_type?: PaymentType | string;
  approval_status?: ApprovalStatus | string;
  memo?: string;
  unique_hash: string;
  created_at: string;
}

export interface ParsedTransaction {
  transaction_date: string;
  transaction_time?: string;
  flow_type: FlowType;
  expense_nature?: ExpenseNature;
  account_type: string;
  payment_method: string;
  description: string;
  amount: number;
  payment_type: string;
  approval_status: string;
  memo?: string;
  category_id?: string | null;
  category: string;
  unique_hash: string;
  is_duplicate: boolean;
  is_auto_classified: boolean;
  raw_row?: Record<string, any>;
}

export interface DateRangeFilter {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

export interface FilterState {
  month: string; // YYYY-MM
  dateRange: DateRangeFilter | null;
  flowType: 'ALL' | FlowType;
  expenseNature: 'ALL' | ExpenseNature;
  paymentMethod: string;
  categoryId: string;
  searchQuery: string;
  sortBy: 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';
}

export interface ColumnMapping {
  date: string;
  time?: string;
  description: string;
  amount: string;
  flowType?: string;
  paymentMethod?: string;
  paymentType?: string;
  approvalStatus?: string;
  memo?: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
}
