import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import type { ColumnMapping, ParsedTransaction, Category } from '../types';
import { generateTransactionHash } from './deduplication';
import { autoClassifyTransaction } from './autoClassifier';
import { inferExpenseNature } from './defaultData';

const DATE_HEADERS = ['날짜', '거래일자', '승인일자', '거래일', '이용일자', '일자', 'date', 'Date', '년월일'];
const TIME_HEADERS = ['시간', '거래시간', '승인시간', '이용시간', 'time', 'Time'];
const DESC_HEADERS = ['거래내역', '가맹점명', '가맹점', '거래내용', '내역', '적요', '내용', '상호명', 'description', 'Description'];
const AMOUNT_HEADERS = ['금액', '이용금액', '승인금액', '거래금액', '출금금액', '입금금액', 'amount', 'Amount'];
const FLOW_HEADERS = ['분류', '유형', '구분', '수입/지출', '수입지출', '거래유형', 'type', 'Type'];
const METHOD_HEADERS = ['거래수단/출금처', '거래수단', '출금처', '결제수단', '카드/계좌', '이용카드', '계좌명', '수단', '카드명', 'payment_method'];
const PAYMENT_TYPE_HEADERS = ['결제구분', '결제방식', '할부', '일시불/할부'];
const APPROVAL_STATUS_HEADERS = ['승인상태', '상태', '처리상태'];

export function detectColumnMapping(headers: string[]): ColumnMapping {
  const findMatch = (candidates: string[]): string => {
    for (const cand of candidates) {
      const found = headers.find(h => h && h.trim().toLowerCase() === cand.toLowerCase());
      if (found) return found;
    }
    for (const cand of candidates) {
      const found = headers.find(h => h && h.trim().toLowerCase().includes(cand.toLowerCase()));
      if (found) return found;
    }
    return '';
  };

  return {
    date: findMatch(DATE_HEADERS) || headers[0] || '',
    time: findMatch(TIME_HEADERS),
    description: findMatch(DESC_HEADERS) || headers[1] || '',
    amount: findMatch(AMOUNT_HEADERS) || headers[2] || '',
    flowType: findMatch(FLOW_HEADERS),
    paymentMethod: findMatch(METHOD_HEADERS),
    paymentType: findMatch(PAYMENT_TYPE_HEADERS),
    approvalStatus: findMatch(APPROVAL_STATUS_HEADERS),
  };
}

export async function parseFinancialFile(
  file: File,
  categories: Category[],
  existingHashes: Set<string>,
  customMapping?: ColumnMapping
): Promise<{ rows: ParsedTransaction[]; rawHeaders: string[]; mappedColumns: ColumnMapping }> {
  return new Promise((resolve, reject) => {
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.csv')) {
      Papa.parse(file, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const matrix = results.data as string[][];
            const { headers, dataRows } = findHeaderAndDataRows(matrix);
            const mappedColumns = customMapping || detectColumnMapping(headers);
            const processedRows = processRawRows(dataRows, mappedColumns, categories, existingHashes);
            resolve({ rows: processedRows, rawHeaders: headers, mappedColumns });
          } catch (err) {
            reject(err);
          }
        },
        error: (err) => reject(err),
      });
    } else {
      // Excel file (.xlsx, .xls)
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          const rawMatrix = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });

          if (rawMatrix.length === 0) {
            resolve({ rows: [], rawHeaders: [], mappedColumns: { date: '', description: '', amount: '' } });
            return;
          }

          const { headers, dataRows } = findHeaderAndDataRows(rawMatrix);
          const mappedColumns = customMapping || detectColumnMapping(headers);
          const processedRows = processRawRows(dataRows, mappedColumns, categories, existingHashes);
          resolve({ rows: processedRows, rawHeaders: headers, mappedColumns });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    }
  });
}

function findHeaderAndDataRows(matrix: any[][]): { headers: string[]; dataRows: Record<string, any>[] } {
  let headerRowIdx = 0;

  for (let r = 0; r < Math.min(matrix.length, 25); r++) {
    const row = matrix[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    const rowText = row.map(cell => String(cell || '').trim()).join(' ');
    const hasDate = DATE_HEADERS.some(h => rowText.includes(h));
    const hasDesc = DESC_HEADERS.some(h => rowText.includes(h));
    const hasAmount = AMOUNT_HEADERS.some(h => rowText.includes(h));

    if (hasDate && (hasDesc || hasAmount)) {
      headerRowIdx = r;
      break;
    }
  }

  const rawHeaderRow = matrix[headerRowIdx] || [];
  const headers: string[] = rawHeaderRow.map((cell, idx) => {
    const str = String(cell || '').trim();
    return str || `Column_${idx + 1}`;
  });

  const dataRows: Record<string, any>[] = [];
  for (let r = headerRowIdx + 1; r < matrix.length; r++) {
    const row = matrix[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    const rowObj: Record<string, any> = {};
    let hasValue = false;

    headers.forEach((headerName, colIdx) => {
      const val = row[colIdx] !== undefined && row[colIdx] !== null ? String(row[colIdx]).trim() : '';
      rowObj[headerName] = val;
      if (val) hasValue = true;
    });

    if (hasValue) {
      dataRows.push(rowObj);
    }
  }

  return { headers, dataRows };
}

function processRawRows(
  rawData: any[],
  mapping: ColumnMapping,
  categories: Category[],
  existingHashes: Set<string>
): ParsedTransaction[] {
  return rawData.map((row) => {
    let rawDateStr = String(row[mapping.date] || '').trim();

    if (/^\d{5}$/.test(rawDateStr)) {
      const parsedExcelDate = XLSX.SSF.parse_date_code(Number(rawDateStr));
      if (parsedExcelDate) {
        rawDateStr = `${parsedExcelDate.y}-${String(parsedExcelDate.m).padStart(2, '0')}-${String(parsedExcelDate.d).padStart(2, '0')}`;
      }
    }
    const cleanDate = rawDateStr.replace(/[./]/g, '-').slice(0, 10) || new Date().toISOString().slice(0, 10);

    const time = mapping.time ? String(row[mapping.time] || '').trim() : '';
    const description = String(row[mapping.description] || '').trim() || '내역 없음';
    
    const rawAmtStr = String(row[mapping.amount] || '0').replace(/[^0-9.-]/g, '');
    const numAmount = Math.abs(parseFloat(rawAmtStr) || 0);

    let flowType: '지출' | '수입' | '이체' = '지출';
    if (mapping.flowType && row[mapping.flowType]) {
      const rawFlow = String(row[mapping.flowType]).trim();
      if (rawFlow.includes('수입') || rawFlow.includes('입금')) flowType = '수입';
      else if (rawFlow.includes('이체') || rawFlow.includes('송금')) flowType = '이체';
      else flowType = '지출';
    } else {
      if (parseFloat(rawAmtStr) < 0 || String(row[mapping.amount] || '').includes('-')) {
        flowType = '지출';
      }
    }

    const paymentMethod = mapping.paymentMethod ? String(row[mapping.paymentMethod] || '미지정 수단').trim() : '통합 결제수단';
    const paymentType = mapping.paymentType ? String(row[mapping.paymentType] || '일시불').trim() : '일시불';
    const approvalStatus = mapping.approvalStatus ? String(row[mapping.approvalStatus] || '정상').trim() : '정상';
    const memo = mapping.memo ? String(row[mapping.memo] || '').trim() : '';

    const uniqueHash = generateTransactionHash(cleanDate, time, paymentMethod, numAmount, description);
    const isDuplicate = existingHashes.has(uniqueHash);

    const classification = autoClassifyTransaction(description, categories, flowType);
    const expenseNature = inferExpenseNature(classification.categoryName, description);

    return {
      transaction_date: cleanDate,
      transaction_time: time,
      flow_type: flowType,
      expense_nature: expenseNature,
      account_type: paymentMethod.includes('계좌') || paymentMethod.includes('예금') ? '계좌' : '카드',
      payment_method: paymentMethod,
      description,
      amount: numAmount,
      payment_type: paymentType,
      approval_status: approvalStatus,
      memo,
      category_id: classification.categoryId,
      category: classification.categoryName,
      unique_hash: uniqueHash,
      is_duplicate: isDuplicate,
      is_auto_classified: classification.isAutoClassified,
      raw_row: row,
    };
  });
}
