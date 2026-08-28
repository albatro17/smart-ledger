import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import type { Category, Transaction, FilterState, ParsedTransaction, ExpenseNature } from '../types';
import { DEFAULT_CATEGORIES, getInitialTransactions, inferExpenseNature } from '../lib/defaultData';
import { getCurrentMonth, generateUUID } from '../lib/utils';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import { autoClassifyTransaction } from '../lib/autoClassifier';

export interface ToastMessage {
  id: string;
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  message: string;
}

interface LedgerContextType {
  categories: Category[];
  transactions: Transaction[];
  filters: FilterState;
  toasts: ToastMessage[];
  isRealtimeConnected: boolean;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  resetFilters: () => void;
  
  // Transaction actions
  addTransactions: (rows: ParsedTransaction[]) => Promise<{ addedCount: number; duplicateCount: number }>;
  addSingleTransaction: (txData: Partial<Transaction>) => Promise<boolean>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<boolean>;
  toggleExpenseNature: (id: string) => Promise<boolean>;
  deleteTransaction: (id: string) => Promise<boolean>;
  bulkDeleteTransactions: (ids: string[]) => Promise<boolean>;
  
  // Category actions
  addCategory: (cat: Omit<Category, 'id' | 'created_at'>) => Promise<boolean>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<boolean>;
  deleteCategory: (id: string, reassignCategoryId?: string) => Promise<boolean>;
  updateCategoryKeywords: (categoryId: string, keywords: string[]) => Promise<boolean>;
  reRunAutoClassification: () => void;
  
  // Toast notifications
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  
  // Demo reset
  resetToSampleData: () => void;
}

const LedgerContext = createContext<LedgerContextType | undefined>(undefined);

const STORAGE_CAT_KEY = 'voca_ledger_categories_v2';
const STORAGE_TX_KEY = 'voca_ledger_transactions_v2';

const LEGACY_CAT_ID_MAP: Record<string, string> = {
  'cat-food': '00000000-0000-0000-0000-000000000001',
  'cat-transport': '00000000-0000-0000-0000-000000000002',
  'cat-housing': '00000000-0000-0000-0000-000000000003',
  'cat-shopping': '00000000-0000-0000-0000-000000000004',
  'cat-culture': '00000000-0000-0000-0000-000000000005',
  'cat-medical': '00000000-0000-0000-0000-000000000006',
  'cat-salary': '00000000-0000-0000-0000-000000000007',
  'cat-extra-income': '00000000-0000-0000-0000-000000000008',
  'cat-transfer': '00000000-0000-0000-0000-000000000009',
  'cat-uncategorized': '00000000-0000-0000-0000-000000000010',
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sanitizeCategory(c: Category): Category {
  let validId = c.id;
  if (LEGACY_CAT_ID_MAP[c.id]) {
    validId = LEGACY_CAT_ID_MAP[c.id];
  } else if (!UUID_REGEX.test(c.id)) {
    validId = generateUUID();
  }
  return { ...c, id: validId };
}

function sanitizeTransaction(t: Transaction): Transaction {
  let validId = t.id;
  if (!UUID_REGEX.test(t.id)) {
    validId = generateUUID();
  }
  let validCatId = t.category_id;
  if (validCatId && LEGACY_CAT_ID_MAP[validCatId]) {
    validCatId = LEGACY_CAT_ID_MAP[validCatId];
  } else if (validCatId && !UUID_REGEX.test(validCatId)) {
    validCatId = null;
  }
  return { ...t, id: validId, category_id: validCatId };
}

export const LedgerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem(STORAGE_CAT_KEY);
    if (saved) {
      try {
        const parsed: Category[] = JSON.parse(saved);
        return parsed.map(sanitizeCategory);
      } catch (e) {
        console.error('Failed to parse saved categories', e);
      }
    }
    return DEFAULT_CATEGORIES;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem(STORAGE_TX_KEY);
    if (saved) {
      try {
        const parsed: Transaction[] = JSON.parse(saved);
        return parsed.map(sanitizeTransaction);
      } catch (e) {
        console.error('Failed to parse saved transactions', e);
      }
    }
    return getInitialTransactions();
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(false);

  const [filters, setFilters] = useState<FilterState>({
    month: getCurrentMonth(),
    dateRange: null,
    flowType: 'ALL',
    expenseNature: 'ALL',
    paymentMethod: 'ALL',
    categoryId: 'ALL',
    searchQuery: '',
    sortBy: 'date_desc',
  });

  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts(prev => [...prev, { ...toast, id }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_CAT_KEY, JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem(STORAGE_TX_KEY, JSON.stringify(transactions));
  }, [transactions]);

  // Initial Sync & Realtime Channel Listener
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsRealtimeConnected(false);
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) return;

    const syncWithCloud = async () => {
      try {
        // Fetch categories
        const { data: cloudCats, error: catErr } = await supabase.from('categories').select('*');
        if (catErr) {
          console.warn('Supabase categories fetch error:', catErr);
        } else if (cloudCats && cloudCats.length > 0) {
          setCategories(cloudCats.map(sanitizeCategory));
        } else {
          // If cloud has 0 categories, seed current local categories into Supabase
          await supabase.from('categories').upsert(categories.map(sanitizeCategory));
        }

        // Fetch transactions
        const { data: cloudTxs, error: txErr } = await supabase.from('transactions').select('*').order('transaction_date', { ascending: false });
        if (txErr) {
          console.warn('Supabase transactions fetch error:', txErr);
        } else if (cloudTxs && cloudTxs.length > 0) {
          setTransactions(cloudTxs.map(sanitizeTransaction));
        } else if (transactions.length > 0) {
          // If cloud has 0 transactions, seed current local transactions into Supabase
          await supabase.from('transactions').upsert(transactions.map(sanitizeTransaction));
        }
      } catch (err) {
        console.warn('Supabase initial sync error:', err);
      }
    };

    syncWithCloud();

    // Supabase Realtime Subscription Channel
    const channel = supabase.channel('voca_realtime_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, (payload) => {
        setIsRealtimeConnected(true);
        if (payload.eventType === 'INSERT') {
          const newTx = sanitizeTransaction(payload.new as Transaction);
          setTransactions(prev => [newTx, ...prev.filter(t => t.id !== newTx.id && t.unique_hash !== newTx.unique_hash)]);
        } else if (payload.eventType === 'UPDATE') {
          const updatedTx = sanitizeTransaction(payload.new as Transaction);
          setTransactions(prev => prev.map(t => (t.id === updatedTx.id ? updatedTx : t)));
        } else if (payload.eventType === 'DELETE') {
          const deletedId = payload.old.id;
          setTransactions(prev => prev.filter(t => t.id !== deletedId));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, (payload) => {
        setIsRealtimeConnected(true);
        if (payload.eventType === 'INSERT') {
          const newCat = sanitizeCategory(payload.new as Category);
          setCategories(prev => [...prev.filter(c => c.id !== newCat.id), newCat]);
        } else if (payload.eventType === 'UPDATE') {
          const updatedCat = sanitizeCategory(payload.new as Category);
          setCategories(prev => prev.map(c => (c.id === updatedCat.id ? updatedCat : c)));
        } else if (payload.eventType === 'DELETE') {
          const deletedId = payload.old.id;
          setCategories(prev => prev.filter(c => c.id !== deletedId));
        }
      })
      .subscribe((status) => {
        setIsRealtimeConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const resetFilters = () => {
    setFilters({
      month: getCurrentMonth(),
      dateRange: null,
      flowType: 'ALL',
      expenseNature: 'ALL',
      paymentMethod: 'ALL',
      categoryId: 'ALL',
      searchQuery: '',
      sortBy: 'date_desc',
    });
  };

  const existingHashes = useMemo(() => {
    return new Set(transactions.map(t => t.unique_hash));
  }, [transactions]);

  const addTransactions = async (rows: ParsedTransaction[]) => {
    let addedCount = 0;
    let duplicateCount = 0;
    const newTxs: Transaction[] = [];

    rows.forEach((row) => {
      if (existingHashes.has(row.unique_hash)) {
        duplicateCount++;
      } else {
        addedCount++;
        const nature = row.expense_nature || inferExpenseNature(row.category, row.description);
        let validCatId = row.category_id || null;
        if (validCatId && LEGACY_CAT_ID_MAP[validCatId]) {
          validCatId = LEGACY_CAT_ID_MAP[validCatId];
        } else if (validCatId && !UUID_REGEX.test(validCatId)) {
          validCatId = null;
        }

        const newTx: Transaction = {
          id: generateUUID(),
          category_id: validCatId,
          category: row.category || '미분류',
          transaction_date: row.transaction_date,
          transaction_time: row.transaction_time || '12:00:00',
          flow_type: row.flow_type,
          expense_nature: nature,
          account_type: row.account_type || '카드',
          payment_method: row.payment_method || '통합 결제수단',
          description: row.description,
          amount: row.amount,
          payment_type: row.payment_type || '일시불',
          approval_status: row.approval_status || '정상',
          memo: row.memo || '',
          unique_hash: row.unique_hash,
          created_at: new Date().toISOString(),
        };
        newTxs.push(newTx);
      }
    });

    if (newTxs.length > 0) {
      setTransactions(prev => [...newTxs, ...prev]);

      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          const { error } = await supabase.from('transactions').upsert(newTxs);
          if (error) {
            console.error('Supabase upsert failed:', error);
            addToast({ type: 'warning', title: 'Supabase DB 저장 경고', message: `Supabase DB 오류: ${error.message}` });
          }
        } catch (e) {
          console.error('Supabase bulk upsert failed', e);
        }
      }
    }

    addToast({
      type: addedCount > 0 ? 'success' : 'info',
      title: '엑셀/CSV 업로드 완료',
      message: `신규 ${addedCount}건이 등록되었고, 중복 ${duplicateCount}건은 제외되었습니다.`,
    });

    return { addedCount, duplicateCount };
  };

  const addSingleTransaction = async (txData: Partial<Transaction>): Promise<boolean> => {
    if (!txData.description || !txData.amount || !txData.transaction_date) {
      addToast({ type: 'error', title: '입력 오류', message: '날짜, 거래내역, 금액은 필수 입력 항목입니다.' });
      return false;
    }

    const flowType = txData.flow_type || '지출';
    const classification = autoClassifyTransaction(txData.description, categories, flowType);
    const catName = txData.category || classification.categoryName || '미분류';
    const nature = txData.expense_nature || inferExpenseNature(catName, txData.description);

    let validCatId = txData.category_id || classification.categoryId || null;
    if (validCatId && LEGACY_CAT_ID_MAP[validCatId]) {
      validCatId = LEGACY_CAT_ID_MAP[validCatId];
    } else if (validCatId && !UUID_REGEX.test(validCatId)) {
      validCatId = null;
    }

    const newTx: Transaction = {
      id: generateUUID(),
      category_id: validCatId,
      category: catName,
      transaction_date: txData.transaction_date,
      transaction_time: txData.transaction_time || '12:00:00',
      flow_type: flowType,
      expense_nature: nature,
      account_type: txData.account_type || '카드',
      payment_method: txData.payment_method || '현금/기타',
      description: txData.description,
      amount: Number(txData.amount),
      payment_type: txData.payment_type || '일시불',
      approval_status: txData.approval_status || '정상',
      memo: txData.memo || '',
      unique_hash: txData.unique_hash || `manual-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      created_at: new Date().toISOString(),
    };

    setTransactions(prev => [newTx, ...prev]);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { error } = await supabase.from('transactions').upsert([newTx]);
        if (error) {
          console.error('Supabase insert error:', error);
          addToast({ type: 'warning', title: '클라우드 저장 경고', message: `Supabase DB 저장 실패: ${error.message}` });
        }
      } catch (e) {
        console.error('Supabase single insert error', e);
      }
    }

    addToast({ type: 'success', title: '등록 완료', message: `'${newTx.description}' 거래내역이 추가되었습니다.` });
    return true;
  };

  const updateTransaction = async (id: string, updates: Partial<Transaction>): Promise<boolean> => {
    const existingTx = transactions.find(t => t.id === id);
    const updatedTx = sanitizeTransaction(existingTx ? { ...existingTx, ...updates } : ({ id, ...updates } as Transaction));

    setTransactions(prev => prev.map(t => (t.id === id ? updatedTx : t)));

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { error } = await supabase.from('transactions').upsert([updatedTx]);
        if (error) {
          console.error('Supabase upsert error:', error);
          addToast({ type: 'warning', title: '클라우드 수정 경고', message: `Supabase DB 수정 실패: ${error.message}` });
        }
      } catch (e) {
        console.error('Supabase update error', e);
      }
    }

    addToast({ type: 'info', title: '수정 완료', message: '거래내역 정보가 업데이트되었습니다.' });
    return true;
  };

  const toggleExpenseNature = async (id: string): Promise<boolean> => {
    const target = transactions.find(t => t.id === id);
    if (!target) return false;

    const newNature: ExpenseNature = target.expense_nature === '고정비' ? '변동비' : '고정비';
    const updatedTx = sanitizeTransaction({ ...target, expense_nature: newNature });

    setTransactions(prev => prev.map(t => (t.id === id ? updatedTx : t)));

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { error } = await supabase.from('transactions').upsert([updatedTx]);
        if (error) {
          console.error('Supabase toggle nature error:', error);
          addToast({ type: 'warning', title: '클라우드 변경 경고', message: `Supabase DB 변경 실패: ${error.message}` });
        }
      } catch (e) {
        console.error('Supabase toggle expense nature error', e);
      }
    }

    addToast({
      type: 'info',
      title: '지출 성격 변경',
      message: `'${target.description}' 항목이 [${newNature}](으)로 변경되었습니다.`,
    });

    return true;
  };

  const deleteTransaction = async (id: string): Promise<boolean> => {
    const target = transactions.find(t => t.id === id);
    setTransactions(prev => prev.filter(t => t.id !== id));

    const supabase = getSupabaseClient();
    if (supabase && target && UUID_REGEX.test(id)) {
      try {
        const { error } = await supabase.from('transactions').delete().eq('id', id);
        if (error) {
          console.error('Supabase delete error:', error);
          addToast({ type: 'warning', title: '클라우드 삭제 경고', message: `Supabase DB 삭제 실패: ${error.message}` });
        }
      } catch (e) {
        console.error('Supabase delete error', e);
      }
    }

    addToast({ type: 'info', title: '삭제 완료', message: `'${target?.description || '선택한 내역'}' 항목이 삭제되었습니다.` });
    return true;
  };

  const bulkDeleteTransactions = async (ids: string[]): Promise<boolean> => {
    setTransactions(prev => prev.filter(t => !ids.includes(t.id)));

    const validUuids = ids.filter(id => UUID_REGEX.test(id));
    const supabase = getSupabaseClient();
    if (supabase && validUuids.length > 0) {
      try {
        const { error } = await supabase.from('transactions').delete().in('id', validUuids);
        if (error) {
          console.error('Supabase bulk delete error:', error);
        }
      } catch (e) {
        console.error('Supabase bulk delete error', e);
      }
    }

    addToast({ type: 'info', title: '일괄 삭제 완료', message: `${ids.length}건의 거래내역이 삭제되었습니다.` });
    return true;
  };

  const addCategory = async (cat: Omit<Category, 'id' | 'created_at'>): Promise<boolean> => {
    const newCat: Category = {
      ...cat,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };

    setCategories(prev => [...prev, newCat]);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('categories').upsert([newCat]);
      } catch (e) {
        console.error('Supabase add category error', e);
      }
    }

    addToast({ type: 'success', title: '카테고리 추가', message: `'${newCat.name}' 카테고리가 생성되었습니다.` });
    return true;
  };

  const updateCategory = async (id: string, updates: Partial<Category>): Promise<boolean> => {
    const existingCat = categories.find(c => c.id === id);
    const updatedCat = sanitizeCategory(
      existingCat
        ? { ...existingCat, ...updates }
        : {
            id,
            name: updates.name || '',
            type: updates.type || '지출',
            icon: '🏷️',
            color: '#3B82F6',
            keywords: [],
            is_default: false,
            created_at: new Date().toISOString(),
          }
    );

    setCategories(prev => prev.map(c => (c.id === id ? updatedCat : c)));

    if (updates.name) {
      setTransactions(prev => prev.map(t => (t.category_id === id ? { ...t, category: updates.name! } : t)));
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { error } = await supabase.from('categories').upsert([updatedCat]);
        if (error) {
          console.error('Supabase update category error:', error);
          addToast({ type: 'warning', title: '카테고리 수정 경고', message: `Supabase DB 수정 실패: ${error.message}` });
        } else if (updates.name && UUID_REGEX.test(updatedCat.id)) {
          await supabase.from('transactions').update({ category: updates.name }).eq('category_id', updatedCat.id);
        }
      } catch (e) {
        console.error('Supabase update category error', e);
      }
    }

    addToast({ type: 'info', title: '카테고리 수정', message: '카테고리 정보가 업데이트되었습니다.' });
    return true;
  };

  const deleteCategory = async (id: string, reassignCategoryId?: string): Promise<boolean> => {
    const catToDelete = categories.find(c => c.id === id);
    if (!catToDelete) return false;

    let targetCatName = '미분류';
    let targetCatId: string | null = null;

    if (reassignCategoryId) {
      const targetCat = categories.find(c => c.id === reassignCategoryId);
      if (targetCat) {
        targetCatName = targetCat.name;
        targetCatId = targetCat.id;
      }
    } else {
      const uncategorized = categories.find(c => c.name === '미분류');
      if (uncategorized) {
        targetCatId = uncategorized.id;
      }
    }

    setTransactions(prev =>
      prev.map(t => {
        if (t.category_id === id || t.category === catToDelete.name) {
          return { ...t, category_id: targetCatId, category: targetCatName };
        }
        return t;
      })
    );

    setCategories(prev => prev.filter(c => c.id !== id));

    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(id)) {
      try {
        if (targetCatId && UUID_REGEX.test(targetCatId)) {
          await supabase.from('transactions').update({ category_id: targetCatId, category: targetCatName }).eq('category_id', id);
        }
        await supabase.from('categories').delete().eq('id', id);
      } catch (e) {
        console.error('Supabase delete category error', e);
      }
    }

    addToast({
      type: 'warning',
      title: '카테고리 삭제',
      message: `'${catToDelete.name}' 카테고리가 삭제되었으며, 관련 내역은 '${targetCatName}'(으)로 이동되었습니다.`,
    });

    return true;
  };

  const updateCategoryKeywords = async (categoryId: string, keywords: string[]): Promise<boolean> => {
    const cleanKws = keywords.map(k => k.trim()).filter(Boolean);
    return updateCategory(categoryId, { keywords: cleanKws });
  };

  const reRunAutoClassification = () => {
    let reclassifiedCount = 0;
    setTransactions(prev =>
      prev.map(tx => {
        if (!tx.category_id || tx.category === '미분류') {
          const res = autoClassifyTransaction(tx.description, categories, tx.flow_type);
          if (res.isAutoClassified) {
            reclassifiedCount++;
            return {
              ...tx,
              category_id: res.categoryId,
              category: res.categoryName,
              expense_nature: inferExpenseNature(res.categoryName, tx.description),
            };
          }
        }
        return tx;
      })
    );

    addToast({
      type: 'success',
      title: '자동 재분류 완료',
      message: `${reclassifiedCount}건의 내역이 새 키워드 룰셋에 따라 카테고리로 자동 분류되었습니다.`,
    });
  };

  const resetToSampleData = () => {
    setCategories(DEFAULT_CATEGORIES);
    setTransactions(getInitialTransactions());
    localStorage.removeItem(STORAGE_CAT_KEY);
    localStorage.removeItem(STORAGE_TX_KEY);

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.from('categories').upsert(DEFAULT_CATEGORIES);
      supabase.from('transactions').upsert(getInitialTransactions());
    }

    addToast({ type: 'info', title: '샘플 데이터 복원', message: '초기 시연용 샘플 데이터로 복원 및 클라우드 동기화되었습니다.' });
  };

  return (
    <LedgerContext.Provider
      value={{
        categories,
        transactions,
        filters,
        toasts,
        isRealtimeConnected,
        setFilters,
        resetFilters,
        addTransactions,
        addSingleTransaction,
        updateTransaction,
        toggleExpenseNature,
        deleteTransaction,
        bulkDeleteTransactions,
        addCategory,
        updateCategory,
        deleteCategory,
        updateCategoryKeywords,
        reRunAutoClassification,
        addToast,
        removeToast,
        resetToSampleData,
      }}
    >
      {children}
    </LedgerContext.Provider>
  );
};

export const useLedger = () => {
  const context = useContext(LedgerContext);
  if (!context) {
    throw new Error('useLedger must be used within a LedgerProvider');
  }
  return context;
};
