import type { Category, Transaction, ExpenseNature } from '../types';
import { generateTransactionHash } from './deduplication';
import { generateUUID } from './utils';

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: '식비',
    type: '지출',
    icon: '🍔',
    color: '#F59E0B',
    keywords: ['스타벅스', '배달의민족', '배민', '식당', '초밥', '김밥', '올리브영간식', '마라탕', '카페', '투썸', '이디야', '맥도날드', '버거킹', '치킨', 'CU', 'GS25', '세븐일레븐', '한식', '중식', '일식'],
    is_default: true,
    default_expense_nature: '변동비',
    is_excluded_from_total: false,
    created_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    name: '교통/차량',
    type: '지출',
    icon: '🚗',
    color: '#3B82F6',
    keywords: ['버스', '지하철', '택시', '카카오T', '주유', 'K-패스', 'K패스', '하이패스', '철도', '코레일', 'SRT', '티머니'],
    is_default: true,
    default_expense_nature: '고정비',
    is_excluded_from_total: false,
    created_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    name: '주거/통신',
    type: '지출',
    icon: '🏠',
    color: '#8B5CF6',
    keywords: ['관리비', '월세', '전기요금', '가스요금', 'KT', 'SKT', 'LGU+', '인터넷', '수도요금'],
    is_default: true,
    default_expense_nature: '고정비',
    is_excluded_from_total: false,
    created_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    name: '쇼핑/생활',
    type: '지출',
    icon: '🛍️',
    color: '#EC4899',
    keywords: ['쿠팡', '네이버페이', '11번가', 'G마켓', '무신사', '올리브영', '백화점', '이마트', '홈플러스', '다이소', '지그재그'],
    is_default: true,
    default_expense_nature: '변동비',
    is_excluded_from_total: false,
    created_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000005',
    name: '취미/여가',
    type: '지출',
    icon: '🎮',
    color: '#10B981',
    keywords: ['넷플릭스', '유튜브', '영화', 'CGV', '메가박스', '스포티파이', '헬스', '운동', '도서', '교보문고', '스팀', '밀리의서재'],
    is_default: true,
    default_expense_nature: '고정비',
    is_excluded_from_total: false,
    created_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000006',
    name: '의료/건강',
    type: '지출',
    icon: '🏥',
    color: '#EF4444',
    keywords: ['병원', '약국', '치과', '의원', '내과', '한의원', '안과', '영양제'],
    is_default: true,
    default_expense_nature: '변동비',
    is_excluded_from_total: false,
    created_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000007',
    name: '급여/월급',
    type: '수입',
    icon: '💰',
    color: '#10B981',
    keywords: ['급여', '월급', '상여금', '주식배당', '이자', '환급금', '퇴직금'],
    is_default: true,
    is_excluded_from_total: false,
    created_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000008',
    name: '부수입/용돈',
    type: '수입',
    icon: '✨',
    color: '#06B6D4',
    keywords: ['용돈', '당근마켓', '중고나라', '선물', '포인트', '캐시백', '이벤트'],
    is_default: true,
    is_excluded_from_total: false,
    created_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000009',
    name: '이체/저축',
    type: '이체',
    icon: '🏦',
    color: '#64748B',
    keywords: ['이체', '적금', '예금', '청약', '주식투자', '자산이전', '토스송금'],
    is_default: true,
    default_expense_nature: '고정비',
    is_excluded_from_total: true, // 🚫 기본값: 총 지출 집계에서 제외 (자산 이동)
    created_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000010',
    name: '미분류',
    type: '지출',
    icon: '❓',
    color: '#94A3B8',
    keywords: [],
    is_default: true,
    default_expense_nature: '변동비',
    is_excluded_from_total: false,
    created_at: new Date().toISOString(),
  },
];

// Determine expense nature based on category name or hints
export function inferExpenseNature(categoryName: string, description = ''): ExpenseNature {
  const cat = categoryName || '';
  const desc = description || '';

  if (
    cat.includes('주거') ||
    cat.includes('통신') ||
    cat.includes('교통') ||
    cat.includes('이체') ||
    cat.includes('저축') ||
    desc.includes('관리비') ||
    desc.includes('월세') ||
    desc.includes('넷플릭스') ||
    desc.includes('유튜브') ||
    desc.includes('보험')
  ) {
    return '고정비';
  }
  return '변동비';
}

// Generate realistic mock transactions for testing out-of-the-box UI
export function getInitialTransactions(): Transaction[] {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');

  const rawList = [
    {
      date: `${year}-${month}-01`,
      time: '09:00:00',
      flow: '수입',
      payment: '우리급여 저축예금',
      desc: '8월분 주식회사 에이아이 급여입금',
      amount: 4500000,
      category: '급여/월급',
      catId: '00000000-0000-0000-0000-000000000007',
      account: '계좌',
      nature: '변동비' as ExpenseNature,
    },
    {
      date: `${year}-${month}-02`,
      time: '12:30:00',
      flow: '지출',
      payment: '우리 K-패스',
      desc: '스타벅스 강남 R점',
      amount: 6800,
      category: '식비',
      catId: '00000000-0000-0000-0000-000000000001',
      account: '카드',
      nature: '변동비' as ExpenseNature,
    },
    {
      date: `${year}-${month}-03`,
      time: '19:40:00',
      flow: '지출',
      payment: '현대 ZERO 카드',
      desc: '배달의민족 (마라탕 & 계란볶음밥)',
      amount: 24500,
      category: '식비',
      catId: '00000000-0000-0000-0000-000000000001',
      account: '카드',
      nature: '변동비' as ExpenseNature,
    },
    {
      date: `${year}-${month}-05`,
      time: '08:15:00',
      flow: '지출',
      payment: '우리 K-패스',
      desc: '서울교통공사 버스지하철 K-패스 환급',
      amount: 62000,
      category: '교통/차량',
      catId: '00000000-0000-0000-0000-000000000002',
      account: '카드',
      nature: '고정비' as ExpenseNature,
    },
    {
      date: `${year}-${month}-08`,
      time: '14:20:00',
      flow: '지출',
      payment: '네이버페이(신한)',
      desc: '쿠팡 로켓프레시 장보기',
      amount: 58900,
      category: '쇼핑/생활',
      catId: '00000000-0000-0000-0000-000000000004',
      account: '카드',
      nature: '변동비' as ExpenseNature,
    },
    {
      date: `${year}-${month}-10`,
      time: '10:00:00',
      flow: '지출',
      payment: '우리급여 저축예금',
      desc: '아파트 관리비 자동이체',
      amount: 215000,
      category: '주거/통신',
      catId: '00000000-0000-0000-0000-000000000003',
      account: '계좌',
      nature: '고정비' as ExpenseNature,
    },
    {
      date: `${year}-${month}-12`,
      time: '18:00:00',
      flow: '지출',
      payment: '현대 ZERO 카드',
      desc: '넷플릭스 프리미엄 월간 결제',
      amount: 17000,
      category: '취미/여가',
      catId: '00000000-0000-0000-0000-000000000005',
      account: '카드',
      nature: '고정비' as ExpenseNature,
    },
    {
      date: `${year}-${month}-15`,
      time: '15:30:00',
      flow: '지출',
      payment: '우리 K-패스',
      desc: '올리브영 강남본점',
      amount: 34200,
      category: '쇼핑/생활',
      catId: '00000000-0000-0000-0000-000000000004',
      account: '카드',
      nature: '변동비' as ExpenseNature,
    },
    {
      date: `${year}-${month}-18`,
      time: '11:45:00',
      flow: '지출',
      payment: '현대 ZERO 카드',
      desc: '서울내과의원 진료비',
      amount: 15400,
      category: '의료/건강',
      catId: '00000000-0000-0000-0000-000000000006',
      account: '카드',
      nature: '변동비' as ExpenseNature,
    },
    {
      date: `${year}-${month}-20`,
      time: '16:00:00',
      flow: '수입',
      payment: '카카오뱅크',
      desc: '당근마켓 중고 모니터 판매',
      amount: 120000,
      category: '부수입/용돈',
      catId: '00000000-0000-0000-0000-000000000008',
      account: '계좌',
      nature: '변동비' as ExpenseNature,
    },
    {
      date: `${year}-${month}-22`,
      time: '20:10:00',
      flow: '지출',
      payment: '우리 K-패스',
      desc: '스시히로바 초밥 식사',
      amount: 87000,
      category: '식비',
      catId: '00000000-0000-0000-0000-000000000001',
      account: '카드',
      nature: '변동비' as ExpenseNature,
    },
    {
      date: `${year}-${month}-25`,
      time: '13:00:00',
      flow: '이체',
      payment: '카카오뱅크',
      desc: '청년희망적금 8월분 자동이체',
      amount: 500000,
      category: '이체/저축',
      catId: '00000000-0000-0000-0000-000000000009',
      account: '계좌',
      nature: '고정비' as ExpenseNature,
    },
  ];

  return rawList
    .map((item) => {
      const hash = generateTransactionHash(
        item.date,
        item.time,
        item.payment,
        item.amount,
        item.desc
      );
      return {
        id: generateUUID(),
        category_id: item.catId,
        category: item.category,
        transaction_date: item.date,
        transaction_time: item.time,
        flow_type: item.flow as any,
        expense_nature: item.nature,
        account_type: item.account,
        payment_method: item.payment,
        description: item.desc,
        amount: item.amount,
        payment_type: '일시불',
        approval_status: '정상',
        memo: '기본 샘플 내역',
        unique_hash: hash,
        created_at: new Date().toISOString(),
      };
    })
    .sort((a, b) => {
      const d = b.transaction_date.localeCompare(a.transaction_date);
      if (d !== 0) return d;
      return (b.transaction_time || '').localeCompare(a.transaction_time || '');
    });
}
