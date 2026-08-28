import React, { useState, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { useLedger } from '../../context/LedgerContext';
import { parseFinancialFile } from '../../lib/parser';
import type { ColumnMapping, ParsedTransaction } from '../../types';
import { ColumnMappingStep } from './ColumnMappingStep';
import { ImportPreviewTable } from './ImportPreviewTable';
import { UploadCloud, FileSpreadsheet, AlertCircle, RefreshCw } from 'lucide-react';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({ isOpen, onClose }) => {
  const { categories, transactions, addTransactions } = useLedger();

  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Parsing Results
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({ date: '', description: '', amount: '' });
  const [parsedRows, setParsedRows] = useState<ParsedTransaction[]>([]);

  // Existing hashes set
  const existingHashes = useMemo(() => {
    return new Set(transactions.map(t => t.unique_hash));
  }, [transactions]);

  const handleReset = () => {
    setStep('upload');
    setSelectedFile(null);
    setIsParsing(false);
    setErrorMessage(null);
    setRawHeaders([]);
    setParsedRows([]);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const processFile = async (file: File) => {
    setSelectedFile(file);
    setIsParsing(true);
    setErrorMessage(null);

    try {
      const res = await parseFinancialFile(file, categories, existingHashes);
      setRawHeaders(res.rawHeaders);
      setMapping(res.mappedColumns);
      setParsedRows(res.rows);
      setIsParsing(false);
      setStep('mapping');
    } catch (err: any) {
      console.error('File parsing error', err);
      setIsParsing(false);
      setErrorMessage(err?.message || '엑셀/CSV 파일 파싱 중 오류가 발생했습니다. 올바른 파일인지 확인해주세요.');
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.match(/\.(xlsx|xls|csv)$/i)) {
        processFile(file);
      } else {
        setErrorMessage('지원되는 파일 형식은 .xlsx, .xls, .csv 입니다.');
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleReParseWithMapping = async () => {
    if (!selectedFile) return;
    setIsParsing(true);
    try {
      const res = await parseFinancialFile(selectedFile, categories, existingHashes, mapping);
      setParsedRows(res.rows);
      setIsParsing(false);
      setStep('preview');
    } catch (err: any) {
      setIsParsing(false);
      setErrorMessage(err?.message || '열 매핑 적용 중 오류가 발생했습니다.');
    }
  };

  const handleUpdateCategoryInPreview = (index: number, categoryId: string, categoryName: string) => {
    setParsedRows(prev =>
      prev.map((row, idx) =>
        idx === index
          ? { ...row, category_id: categoryId, category: categoryName, is_auto_classified: false }
          : row
      )
    );
  };

  const handleFinalSubmit = async () => {
    if (parsedRows.length === 0) return;
    await addTransactions(parsedRows);
    handleClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="스마트 엑셀/CSV 일괄 등록 엔진"
      subtitle="금융기관(카드사, 은행) 엑셀 내역을 드래그하여 중복 방지 및 키워드 자동 분류 후 등록하세요."
      icon={<FileSpreadsheet className="w-5 h-5 text-emerald-500" />}
      maxWidth="4xl"
    >
      <div className="space-y-4">
        {/* Step Indicator */}
        <div className="flex items-center justify-between px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
          <div className={`flex items-center gap-2 ${step === 'upload' ? 'text-emerald-500 font-bold' : 'text-slate-500'}`}>
            <span className="w-5 h-5 rounded-full bg-current text-white flex items-center justify-center text-[10px]">1</span>
            파일 선택 및 드래그
          </div>
          <div className="w-8 h-[1px] bg-slate-300 dark:bg-slate-700" />
          <div className={`flex items-center gap-2 ${step === 'mapping' ? 'text-emerald-500 font-bold' : 'text-slate-500'}`}>
            <span className="w-5 h-5 rounded-full bg-current text-white flex items-center justify-center text-[10px]">2</span>
            열 매핑 확인
          </div>
          <div className="w-8 h-[1px] bg-slate-300 dark:bg-slate-700" />
          <div className={`flex items-center gap-2 ${step === 'preview' ? 'text-emerald-500 font-bold' : 'text-slate-500'}`}>
            <span className="w-5 h-5 rounded-full bg-current text-white flex items-center justify-center text-[10px]">3</span>
            검증 & 등록 확정
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {errorMessage}
          </div>
        )}

        {/* Step 1: Upload Drag & Drop UI */}
        {step === 'upload' && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleFileDrop}
            className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all ${
              isDragOver
                ? 'border-emerald-500 bg-emerald-500/10 scale-[1.01]'
                : 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 hover:border-slate-400 dark:hover:border-slate-600'
            }`}
          >
            {isParsing ? (
              <div className="flex flex-col items-center justify-center py-6">
                <RefreshCw className="w-10 h-10 text-emerald-500 animate-spin mb-3" />
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  엑셀/CSV 데이터를 분석 중입니다...
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  SHA-256 중복 검증 및 키워드 자동 분류 엔진을 실행하고 있습니다.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="p-4 rounded-full bg-emerald-500/10 text-emerald-500 shadow-inner">
                  <UploadCloud className="w-10 h-10" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    가계부 엑셀 또는 CSV 파일을 드래그하여 놓으세요
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    우리카드, 현대카드, 신한카드, 국민카드, 카카오뱅크, 토스 등 모든 엑셀/CSV 지원
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <label className="cursor-pointer px-5 py-2.5 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 transition-all">
                    내 컴퓨터에서 파일 탐색
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 w-full max-w-md">
                  <span className="text-[11px] text-slate-400">
                    💡 <strong>지원 알고리즘</strong>: SHA-256 거래 고유 해시 중복 제외 + 사용자 지정 키워드 룰셋 자동 분류
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Column Mapping */}
        {step === 'mapping' && (
          <ColumnMappingStep
            rawHeaders={rawHeaders}
            mapping={mapping}
            onChangeMapping={setMapping}
            onConfirm={handleReParseWithMapping}
            onCancel={handleReset}
          />
        )}

        {/* Step 3: Preview & Confirm */}
        {step === 'preview' && (
          <ImportPreviewTable
            rows={parsedRows}
            categories={categories}
            onUpdateCategory={handleUpdateCategoryInPreview}
            onConfirm={handleFinalSubmit}
            onBack={() => setStep('mapping')}
          />
        )}
      </div>
    </Modal>
  );
};
