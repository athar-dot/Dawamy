import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  UploadCloud,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
  RefreshCw,
  HelpCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { UserProfile, BulkBalanceImportRow, BulkImportSummary } from '../types';

interface BulkBalanceImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  allUsers: UserProfile[];
  onApplyBatch: (
    updates: { userId: string; balances: UserProfile['balances'] }[]
  ) => Promise<void>;
  lang: 'ar' | 'en';
}

export const BulkBalanceImportModal: React.FC<BulkBalanceImportModalProps> = ({
  isOpen,
  onClose,
  allUsers,
  onApplyBatch,
  lang,
}) => {
  const isAr = lang === 'ar';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<BulkBalanceImportRow[]>([]);
  const [summary, setSummary] = useState<BulkImportSummary | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'valid' | 'invalid'>('all');

  if (!isOpen) return null;

  // 1. Download ready-to-use Excel Template with current employees
  const handleDownloadTemplate = () => {
    const templateData = allUsers.map((u) => ({
      employee_id: u.id,
      email: u.email,
      employee_name: u.name,
      department: u.department,
      annual_leave_total: u.balances.annualLeaveTotal,
      annual_leave_used: u.balances.annualLeaveUsed,
      sick_leave_used: u.balances.sickLeaveUsed,
      emergency_leave_used: u.balances.emergencyLeaveUsed,
      wfh_monthly_total: u.balances.wfhMonthlyTotal,
      wfh_monthly_used: u.balances.wfhMonthlyUsed,
    }));

    const worksheet = XLSX.utils.json_to_sheet(templateData);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 14 }, // employee_id
      { wch: 28 }, // email
      { wch: 22 }, // employee_name
      { wch: 20 }, // department
      { wch: 18 }, // annual_leave_total
      { wch: 18 }, // annual_leave_used
      { wch: 16 }, // sick_leave_used
      { wch: 20 }, // emergency_leave_used
      { wch: 18 }, // wfh_monthly_total
      { wch: 18 }, // wfh_monthly_used
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Leave_Balances');

    // Generate buffer & download
    XLSX.writeFile(workbook, `Dawamy_Leave_Balances_Template_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // 2. Parse uploaded Excel / CSV file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file: File) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setFileName(file.name);
    setIsProcessing(true);

    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });

        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          throw new Error(isAr ? 'الملف فارغ أو لا يحتوي على أوراق عمل' : 'File has no sheets');
        }

        const worksheet = workbook.Sheets[firstSheetName];
        const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (rawRows.length === 0) {
          throw new Error(isAr ? 'لم يتم العثور على أية صفوف بيانات في الملف' : 'No data rows found');
        }

        // Process and validate rows
        const rows: BulkBalanceImportRow[] = [];
        let valid = 0;
        let invalid = 0;

        rawRows.forEach((raw, idx) => {
          const rowNum = idx + 2; // +1 for 0-index, +1 for header
          // Detect identifier: employee_id or email
          const idCandidate = String(raw.employee_id || raw.id || raw['رقم الموظف'] || '').trim();
          const emailCandidate = String(raw.email || raw['البريد الإلكتروني'] || raw['الايميل'] || '').trim().toLowerCase();
          const nameCandidate = String(raw.employee_name || raw.name || raw['اسم الموظف'] || '').trim();

          const identifier = emailCandidate || idCandidate;

          if (!identifier) {
            invalid++;
            rows.push({
              rowNumber: rowNum,
              identifier: isAr ? `سطر ${rowNum}` : `Row ${rowNum}`,
              employeeName: nameCandidate || '-',
              status: 'invalid',
              validationMessage: isAr ? 'معرف الموظف (البريد أو الرقم الوظيفي) مفقود' : 'Missing email or employee ID',
            });
            return;
          }

          // Find matching user in system
          const matched = allUsers.find(
            (u) =>
              (emailCandidate && u.email.toLowerCase() === emailCandidate) ||
              (idCandidate && u.id.toLowerCase() === idCandidate.toLowerCase())
          );

          if (!matched) {
            invalid++;
            rows.push({
              rowNumber: rowNum,
              identifier,
              employeeName: nameCandidate || '-',
              status: 'invalid',
              validationMessage: isAr ? 'الموظف غير مسجل في قاعدة بيانات النظام' : 'User not found in system',
            });
            return;
          }

          // Parse balance fields with fallback to existing values if blank
          const parseNum = (val: any, fallback: number) => {
            if (val === undefined || val === null || val === '') return fallback;
            const parsed = Number(val);
            return isNaN(parsed) ? fallback : parsed;
          };

          const annualTotal = parseNum(raw.annual_leave_total ?? raw['إجمالي الإجازة السنوية'], matched.balances.annualLeaveTotal);
          const annualUsed = parseNum(raw.annual_leave_used ?? raw['المستهلك من السنوية'], matched.balances.annualLeaveUsed);
          const sickUsed = parseNum(raw.sick_leave_used ?? raw['الإجازات المرضية'], matched.balances.sickLeaveUsed);
          const emergencyUsed = parseNum(raw.emergency_leave_used ?? raw['الاضطرارية'], matched.balances.emergencyLeaveUsed);
          const wfhTotal = parseNum(raw.wfh_monthly_total ?? raw['إجمالي العمل عن بعد'], matched.balances.wfhMonthlyTotal);
          const wfhUsed = parseNum(raw.wfh_monthly_used ?? raw['المستهلك من العمل عن بعد'], matched.balances.wfhMonthlyUsed);

          let rowStatus: 'valid' | 'warning' = 'valid';
          let warningMsg = '';

          if (annualUsed > annualTotal) {
            rowStatus = 'warning';
            warningMsg = isAr ? 'تنبيه: الرصيد السنوي المستهلك يتجاوز الرصيد الإجمالي' : 'Warning: Used annual exceeds total';
          }

          valid++;
          rows.push({
            rowNumber: rowNum,
            identifier,
            employeeName: matched.name,
            matchedUser: matched,
            annualLeaveTotal: annualTotal,
            annualLeaveUsed: annualUsed,
            sickLeaveUsed: sickUsed,
            emergencyLeaveUsed: emergencyUsed,
            wfhMonthlyTotal: wfhTotal,
            wfhMonthlyUsed: wfhUsed,
            status: rowStatus,
            validationMessage: warningMsg || (isAr ? 'تمت المطابقة بنجاح' : 'Matched successfully'),
          });
        });

        setParsedRows(rows);
        setSummary({
          totalRows: rawRows.length,
          validCount: valid,
          invalidCount: invalid,
          updatedCount: 0,
        });
      } catch (err: any) {
        console.error('Excel parse error:', err);
        setErrorMsg(err.message || (isAr ? 'فشل تحليل ملف الإكسيل، تأكد من سلامة التنسيق' : 'Failed to parse Excel file'));
      } finally {
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      setErrorMsg(isAr ? 'حدث خطأ أثناء قراءة الملف من الجهاز' : 'Error reading file');
      setIsProcessing(false);
    };

    reader.readAsBinaryString(file);
  };

  // 3. Apply all verified balances to Firestore & state
  const handleApplyImport = async () => {
    const validRows = parsedRows.filter((r) => r.matchedUser && (r.status === 'valid' || r.status === 'warning'));
    if (validRows.length === 0) {
      setErrorMsg(isAr ? 'لا توجد صفوف صالحة للتطبيق' : 'No valid rows to apply');
      return;
    }

    try {
      setIsApplying(true);
      setErrorMsg(null);

      const updates = validRows.map((r) => ({
        userId: r.matchedUser!.id,
        balances: {
          annualLeaveTotal: r.annualLeaveTotal ?? r.matchedUser!.balances.annualLeaveTotal,
          annualLeaveUsed: r.annualLeaveUsed ?? r.matchedUser!.balances.annualLeaveUsed,
          sickLeaveUsed: r.sickLeaveUsed ?? r.matchedUser!.balances.sickLeaveUsed,
          emergencyLeaveUsed: r.emergencyLeaveUsed ?? r.matchedUser!.balances.emergencyLeaveUsed,
          wfhMonthlyTotal: r.wfhMonthlyTotal ?? r.matchedUser!.balances.wfhMonthlyTotal,
          wfhMonthlyUsed: r.wfhMonthlyUsed ?? r.matchedUser!.balances.wfhMonthlyUsed,
        },
      }));

      await onApplyBatch(updates);

      setSuccessMsg(
        isAr
          ? `تم تحديث أرصدة إجازات (${updates.length}) موظف بنجاح في النظام وFirestore!`
          : `Successfully updated balances for (${updates.length}) employees in Firestore!`
      );

      // Refresh summary
      if (summary) {
        setSummary({
          ...summary,
          updatedCount: updates.length,
        });
      }

      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: any) {
      console.error('Batch apply error:', err);
      setErrorMsg(isAr ? 'حدث خطأ أثناء حفظ الأرصدة في السيرفر' : 'Failed to save balances to server');
    } finally {
      setIsApplying(false);
    }
  };

  // Filter rows for preview
  const displayedRows = parsedRows.filter((r) => {
    if (activeFilter === 'valid') return r.status === 'valid' || r.status === 'warning';
    if (activeFilter === 'invalid') return r.status === 'invalid';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        id="bulk-balance-modal"
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#FAF9F6] rounded-2xl shadow-2xl border border-[#E5E2D9] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-[#E5E2D9] bg-white">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-[#E9EDD9] text-[#2D3628] border border-[#D9E0D2]">
              <FileSpreadsheet className="w-6 h-6 text-[#5E7153]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#2D3628]">
                  {isAr ? 'استيراد رصيد الإجازات دفعة واحدة عبر إكسيل' : 'Bulk Leave Balances Excel Import'}
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-[#E9EDD9] text-[#2D3628]">
                  {isAr ? 'الموارد البشرية' : 'HR Portal'}
                </span>
              </div>
              <p className="text-xs text-[#65635E]">
                {isAr
                  ? 'قم برفع ملف إكسيل (.xlsx / .csv) لتحديث أرصدة كافة الموظفين مرة واحدة بدلاً من الإدخال الفردي'
                  : 'Upload an Excel/CSV spreadsheet to update all employee leave balances in bulk'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[#65635E] hover:text-[#2D3628] hover:bg-[#F2EFE9] rounded-xl transition-colors"
            title={isAr ? 'إغلاق' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Notifications */}
          {errorMsg && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-[#FDF0EE] text-[#9E3B30] border border-[#F5C4BE] text-xs sm:text-sm">
              <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-[#E9EDD9] text-[#2D3628] border border-[#D9E0D2] text-xs sm:text-sm">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-[#5E7153]" />
              <div className="flex-1 font-medium">{successMsg}</div>
            </div>
          )}

          {/* Step 1: Download Template Box & Upload Dropzone */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Left box: Instructions & Template download */}
            <div className="md:col-span-1 p-4 rounded-xl bg-white border border-[#E5E2D9] flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-2 mb-2 font-bold text-sm text-[#2D3628]">
                  <HelpCircle className="w-4 h-4 text-[#5E7153]" />
                  <span>{isAr ? 'الخطوة 1: تحميل النموذج' : 'Step 1: Download Template'}</span>
                </div>
                <p className="text-xs text-[#65635E] leading-relaxed">
                  {isAr
                    ? 'حمّل نموذج الإكسيل المجهز مسبقاً بقائمة موظفي الشركة ومعرّفاتهم الرسمية، ثم قم بتعديل الأرصدة وإعادة رفعه.'
                    : 'Download the pre-populated template with existing employee IDs and emails, edit balances, and re-upload.'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#FAF9F6] hover:bg-[#F2EFE9] border border-[#D9E0D2] text-xs font-semibold text-[#2D3628] transition-colors shadow-xs"
              >
                <Download className="w-4 h-4 text-[#5E7153]" />
                <span>{isAr ? 'تحميل نموذج الموظفين (.xlsx)' : 'Download Template (.xlsx)'}</span>
              </button>
            </div>

            {/* Right box: Drag and Drop Upload Area */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="md:col-span-2 p-6 rounded-xl border-2 border-dashed border-[#D9E0D2] hover:border-[#5E7153] bg-white hover:bg-[#FAF9F6] transition-all cursor-pointer flex flex-col items-center justify-center text-center group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
              />

              <div className="w-12 h-12 rounded-2xl bg-[#E9EDD9] text-[#5E7153] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <UploadCloud className="w-6 h-6" />
              </div>

              <div className="font-semibold text-sm text-[#2D3628] mb-1">
                {isProcessing
                  ? (isAr ? 'جاري تحليل وقراءة الملف...' : 'Reading spreadsheet...')
                  : fileName
                  ? (isAr ? `الملف المحدد: ${fileName}` : `Selected: ${fileName}`)
                  : (isAr ? 'اسحب ملف الإكسيل هنا أو انقر للاختيار' : 'Drag & drop Excel file here or click to browse')}
              </div>

              <p className="text-xs text-[#8C8984]">
                {isAr
                  ? 'يدعم ملفات Microsoft Excel (.xlsx, .xls) والملفات المجدولة (.csv)'
                  : 'Supports Microsoft Excel (.xlsx, .xls) and CSV (.csv)'}
              </p>
            </div>
          </div>

          {/* Step 2: Summary Badges & Filter Tabs */}
          {summary && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-white border border-[#E5E2D9]">
                <div className="flex items-center gap-2 sm:gap-4 text-xs font-medium">
                  <span className="text-[#65635E]">
                    {isAr ? 'إجمالي السجلات:' : 'Total Rows:'}{' '}
                    <strong className="text-[#2D3628]">{summary.totalRows}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1 text-[#2D3628]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#5E7153]" />
                    {isAr ? 'صالح للمطابقة:' : 'Ready:'}{' '}
                    <strong>{summary.validCount}</strong>
                  </span>
                  {summary.invalidCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-[#9E3B30]">
                      <XCircle className="w-3.5 h-3.5 text-[#9E3B30]" />
                      {isAr ? 'غير مطابق:' : 'Invalid:'}{' '}
                      <strong>{summary.invalidCount}</strong>
                    </span>
                  )}
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1 bg-[#FAF9F6] p-1 rounded-lg border border-[#E5E2D9] text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveFilter('all')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                      activeFilter === 'all' ? 'bg-[#2D3628] text-white shadow-xs' : 'text-[#65635E]'
                    }`}
                  >
                    {isAr ? 'الكل' : 'All'} ({parsedRows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilter('valid')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                      activeFilter === 'valid' ? 'bg-[#5E7153] text-white shadow-xs' : 'text-[#65635E]'
                    }`}
                  >
                    {isAr ? 'الصالح فقط' : 'Valid'} ({summary.validCount})
                  </button>
                  {summary.invalidCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveFilter('invalid')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                        activeFilter === 'invalid' ? 'bg-[#9E3B30] text-white shadow-xs' : 'text-[#65635E]'
                      }`}
                    >
                      {isAr ? 'الأخطاء' : 'Errors'} ({summary.invalidCount})
                    </button>
                  )}
                </div>
              </div>

              {/* Data Preview Table */}
              <div className="overflow-x-auto rounded-xl border border-[#E5E2D9] bg-white shadow-xs max-h-72">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#FAF9F6] text-[#65635E] border-b border-[#E5E2D9] sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3">{isAr ? 'السطر' : 'Row'}</th>
                      <th className="py-2.5 px-3">{isAr ? 'الموظف في النظام' : 'Matched Employee'}</th>
                      <th className="py-2.5 px-3">{isAr ? 'السنوية (إجمالي/مستهلك)' : 'Annual (Total/Used)'}</th>
                      <th className="py-2.5 px-3">{isAr ? 'المرضية' : 'Sick'}</th>
                      <th className="py-2.5 px-3">{isAr ? 'الاضطرارية' : 'Emergency'}</th>
                      <th className="py-2.5 px-3">{isAr ? 'العمل عن بعد' : 'WFH (Mo/Used)'}</th>
                      <th className="py-2.5 px-3">{isAr ? 'الحالة' : 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E2D9]">
                    {displayedRows.map((row) => {
                      const matched = row.matchedUser;
                      const hasAnnualTotalChanged = matched && row.annualLeaveTotal !== matched.balances.annualLeaveTotal;
                      const hasAnnualUsedChanged = matched && row.annualLeaveUsed !== matched.balances.annualLeaveUsed;

                      return (
                        <tr
                          key={row.rowNumber}
                          className={`hover:bg-[#FAF9F6] transition-colors ${
                            row.status === 'invalid' ? 'bg-[#FDF0EE]/40' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 font-mono text-[#8C8984]">{row.rowNumber}</td>
                          
                          <td className="py-2.5 px-3">
                            {matched ? (
                              <div className="flex items-center gap-2">
                                <img
                                  src={matched.avatar}
                                  alt={matched.name}
                                  className="w-6 h-6 rounded-full object-cover border border-[#E5E2D9]"
                                />
                                <div>
                                  <div className="font-semibold text-[#2D3628]">{matched.name}</div>
                                  <div className="text-[10px] text-[#8C8984]">{matched.email}</div>
                                </div>
                              </div>
                            ) : (
                              <div className="text-[#9E3B30] font-medium">
                                {row.identifier}
                              </div>
                            )}
                          </td>

                          {/* Annual Leave (Total / Used) */}
                          <td className="py-2.5 px-3 font-mono">
                            {row.status === 'invalid' ? (
                              <span className="text-[#8C8984]">-</span>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className={hasAnnualTotalChanged ? 'text-[#5E7153] font-bold' : 'text-[#2D3628]'}>
                                  {row.annualLeaveTotal}
                                </span>
                                <span className="text-[#8C8984]">/</span>
                                <span className={hasAnnualUsedChanged ? 'text-[#9E3B30] font-bold' : 'text-[#65635E]'}>
                                  {row.annualLeaveUsed}
                                </span>
                                {matched && (hasAnnualTotalChanged || hasAnnualUsedChanged) && (
                                  <span className="text-[10px] text-[#5E7153] bg-[#E9EDD9] px-1 rounded">
                                    {isAr ? 'معدل' : 'Modified'}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Sick */}
                          <td className="py-2.5 px-3 font-mono">
                            {row.status === 'invalid' ? '-' : row.sickLeaveUsed}
                          </td>

                          {/* Emergency */}
                          <td className="py-2.5 px-3 font-mono">
                            {row.status === 'invalid' ? '-' : row.emergencyLeaveUsed}
                          </td>

                          {/* WFH */}
                          <td className="py-2.5 px-3 font-mono">
                            {row.status === 'invalid' ? (
                              '-'
                            ) : (
                              <span>
                                {row.wfhMonthlyTotal} / {row.wfhMonthlyUsed}
                              </span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-2.5 px-3">
                            {row.status === 'valid' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#5E7153] bg-[#E9EDD9] px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3" />
                                {isAr ? 'مطابق' : 'Valid'}
                              </span>
                            )}
                            {row.status === 'warning' && (
                              <span
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#B25E00] bg-[#FFF4E5] px-2 py-0.5 rounded-full"
                                title={row.validationMessage}
                              >
                                <AlertTriangle className="w-3 h-3" />
                                {isAr ? 'تحذير' : 'Warning'}
                              </span>
                            )}
                            {row.status === 'invalid' && (
                              <span
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#9E3B30] bg-[#FDF0EE] px-2 py-0.5 rounded-full"
                                title={row.validationMessage}
                              >
                                <XCircle className="w-3 h-3" />
                                {row.validationMessage}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#E5E2D9] bg-white">
          <div className="text-xs text-[#65635E]">
            {summary && summary.validCount > 0 ? (
              <span className="text-[#2D3628] font-medium">
                {isAr
                  ? `جاهز لاعتماد وتطبيق الأرصدة على (${summary.validCount}) موظف فوراً.`
                  : `Ready to apply balances for (${summary.validCount}) verified employees.`}
              </span>
            ) : (
              <span>{isAr ? 'يرجى تحميل النموذج أو رفع ملف إكسيل للبدء' : 'Please upload a spreadsheet to begin'}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#65635E] hover:text-[#2D3628] hover:bg-[#F2EFE9] transition-colors"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>

            <button
              type="button"
              onClick={handleApplyImport}
              disabled={!summary || summary.validCount === 0 || isApplying}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-md ${
                !summary || summary.validCount === 0 || isApplying
                  ? 'bg-[#8C8984] opacity-50 cursor-not-allowed'
                  : 'bg-[#5E7153] hover:bg-[#4E5E44] active:scale-98 shadow-[#5E7153]/20'
              }`}
            >
              {isApplying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{isAr ? 'جاري التحديث والمزامنة...' : 'Applying updates...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {isAr
                      ? `اعتماد وتطبيق الأرصدة (${summary?.validCount || 0}) موظف`
                      : `Apply Balances (${summary?.validCount || 0} users)`}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
