import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Building2,
  Printer,
  X,
  Download,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Calendar,
  Users,
  ShieldCheck,
  FileSpreadsheet,
  TrendingDown,
  Percent,
} from 'lucide-react';
import { UserProfile, MonthlyEmployeeLateSummary } from '../types';
import { formatSalaryCurrency, formatMinutesHuman } from '../utils/payrollUtils';
import { printHtmlDocument, exportElementToPdf } from '../utils/printUtils';

interface AllEmployeesLateReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  summaries: MonthlyEmployeeLateSummary[];
  selectedMonth: string;
  departmentFilter?: string;
  lang: 'ar' | 'en';
}

export const AllEmployeesLateReportModal: React.FC<AllEmployeesLateReportModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  summaries,
  selectedMonth,
  departmentFilter = 'all',
  lang,
}) => {
  const isAr = lang === 'ar';
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [activeView, setActiveView] = useState<'summary' | 'detailed_punches'>('summary');
  const reportCardRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  // Compute Overall Totals
  const totalEmployees = summaries.length;
  const lateEmployees = summaries.filter((s) => s.totalLateOccurrences > 0);
  const lateEmployeesCount = lateEmployees.length;
  const perfectAttendanceCount = totalEmployees - lateEmployeesCount;
  const totalLateMinutes = summaries.reduce((acc, s) => acc + (s.totalLateMinutes || 0), 0);
  const totalLateHours = Math.round((totalLateMinutes / 60) * 10) / 10;
  const totalExcessHours = summaries.reduce((acc, s) => acc + (s.excessLateHours || 0), 0);
  const totalLateDeductions = summaries.reduce((acc, s) => acc + (s.lateDeductionAmount || 0), 0);
  const complianceRate = totalEmployees > 0 ? Math.round((perfectAttendanceCount / totalEmployees) * 100) : 100;

  // Flatten all late records with employee name
  const allLatePunches = summaries.flatMap((s) =>
    (s.lateRecords || []).map((r) => ({
      ...r,
      employeeName: s.userName,
      department: s.department,
      hourlyRate: s.hourlyRate,
    }))
  );

  // Print Handler
  const handlePrint = () => {
    const formattedDate = new Date().toLocaleDateString(isAr ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const masterRowsHtml = summaries
      .map(
        (s, idx) => `
      <tr style="background: ${s.totalLateOccurrences === 0 ? '#F0FDF4' : s.excessLateHours > 0 ? '#FEF2F2' : '#FFF'};">
        <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
        <td>
          <div style="font-weight: bold; color: #1F2937;">${s.userName}</div>
          <div style="font-size: 10px; color: #6B7280;">${s.department}</div>
        </td>
        <td style="text-align: center; font-weight: bold;">${s.totalLateOccurrences} مرات</td>
        <td style="text-align: center; color: #B91C1C; font-weight: bold;">${formatMinutesHuman(s.totalLateMinutes, lang)}</td>
        <td style="text-align: center;">${s.allowedGraceHours || 4} ساعات</td>
        <td style="text-align: center; color: #5E7153; font-weight: bold;">${formatMinutesHuman(s.usedGraceMinutes, lang)}</td>
        <td style="text-align: center; color: #047857;">${formatMinutesHuman(s.remainingGraceMinutes, lang)}</td>
        <td style="text-align: center; font-weight: bold; color: ${s.excessLateHours > 0 ? '#B91C1C' : '#047857'};">
          ${s.excessLateHours > 0 ? `${s.excessLateHours}س` : '0 (ضمن السماحية)'}
        </td>
        <td style="text-align: left; font-weight: bold; color: ${s.lateDeductionAmount > 0 ? '#B91C1C' : '#047857'};">
          ${s.lateDeductionAmount > 0 ? `-${formatSalaryCurrency(s.lateDeductionAmount)}` : '0.00 ر.س'}
        </td>
      </tr>
    `
      )
      .join('');

    const punchesRowsHtml =
      allLatePunches.length === 0
        ? `<tr><td colspan="8" style="text-align: center; padding: 14px; color: #047857; font-weight: bold;">لا توجد أي بصمات تأخير مسجلة في هذا الشهر لجميع الموظفين.</td></tr>`
        : allLatePunches
            .map(
              (p, idx) => `
          <tr style="background: ${p.isLateDeductionWaived ? '#F0FDF4' : '#FFF'};">
            <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
            <td style="font-weight: bold;">${p.employeeName}</td>
            <td style="color: #6B7280;">${p.department}</td>
            <td style="text-align: center; font-weight: bold;">${p.date}</td>
            <td style="text-align: center; color: #5E7153; font-weight: bold;">${p.checkInTime || '-'}</td>
            <td style="text-align: center; color: #B91C1C; font-weight: bold;">${p.lateMinutes} دقيقة</td>
            <td>${p.deviceName || 'جهاز البصمة'}</td>
            <td style="text-align: center;">
              ${
                p.isLateDeductionWaived
                  ? `<span style="color: #047857; font-weight: bold; background: #DCFCE7; padding: 2px 6px; border-radius: 4px; font-size: 10px;">معفى بقرار</span>`
                  : `<span style="color: #B45309; font-weight: bold; background: #FEF3C7; padding: 2px 6px; border-radius: 4px; font-size: 10px;">مطبق</span>`
              }
            </td>
          </tr>
        `
            )
            .join('');

    const contentHtml = `
      <div class="header-box">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="background: #5E7153; color: white; width: 44px; height: 44px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: bold;">
            🏢
          </div>
          <div>
            <h2 style="margin: 0; font-size: 18px; color: #1F2937;">شركة التقنية والحلول الذكية</h2>
            <p style="margin: 2px 0 0; font-size: 11px; color: #5E7153; font-weight: bold;">التقرير الشامل لرصد تأخيرات البصمة وسماحية الـ 4 ساعات لكافة الموظفين</p>
          </div>
        </div>
        <div style="text-align: left;">
          <div style="font-size: 15px; font-weight: bold; color: #1F2937;">كشف تأخيرات شهر: ${selectedMonth}</div>
          <div style="font-size: 10px; color: #6B7280; margin-top: 2px;">تاريخ الاعتماد: ${formattedDate}</div>
        </div>
      </div>

      <!-- KPI Overview Cards -->
      <table style="margin-bottom: 14px; background: #F9FAFB;">
        <tr>
          <th>إجمالي الكادر الوظيفي</th>
          <th>الموظفون المتأخرون</th>
          <th>إجمالي ساعات التأخير</th>
          <th>الساعات الزائدة الخاضعة للخصم</th>
          <th style="background: #5E7153; color: white;">إجمالي خصومات التأخير</th>
        </tr>
        <tr>
          <td style="text-align: center; font-weight: bold; font-size: 14px;">${totalEmployees} موظف</td>
          <td style="text-align: center; color: #B91C1C; font-weight: bold; font-size: 14px;">${lateEmployeesCount} موظف</td>
          <td style="text-align: center; color: #B45309; font-weight: bold; font-size: 14px;">${totalLateHours} ساعة</td>
          <td style="text-align: center; color: #B91C1C; font-weight: bold; font-size: 14px;">${totalExcessHours} ساعة</td>
          <td style="text-align: center; color: #5E7153; font-weight: 900; font-size: 16px; background: #F4F6F2;">
            ${totalLateDeductions > 0 ? `-${formatSalaryCurrency(totalLateDeductions)}` : '0.00 ر.س'}
          </td>
        </tr>
      </table>

      <!-- Section 1: Employees Summary Table -->
      <div style="font-weight: bold; margin-bottom: 6px; font-size: 13px; color: #374151;">أولاً: جدول ملخص احتساب التأخير والسماحية لكل موظف:</div>
      <table style="margin-bottom: 18px;">
        <thead>
          <tr style="background: #E5E7EB; color: #1F2937;">
            <th style="width: 25px; text-align: center;">#</th>
            <th>الموظف والقسم</th>
            <th style="text-align: center;">مرات التأخير</th>
            <th style="text-align: center;">إجمالي التأخير</th>
            <th style="text-align: center;">سماحية الشهر</th>
            <th style="text-align: center;">المستهلك</th>
            <th style="text-align: center;">المتبقي</th>
            <th style="text-align: center;">الساعات المخصومة</th>
            <th style="text-align: left;">خصم التأخير</th>
          </tr>
        </thead>
        <tbody>
          ${masterRowsHtml}
        </tbody>
        <tfoot>
          <tr style="background: #F3F4F6; font-weight: bold;">
            <td colspan="2" style="text-align: center;">الإجمالي العام المعتمد</td>
            <td style="text-align: center;">${allLatePunches.length} تسجيل</td>
            <td style="text-align: center; color: #B91C1C;">${totalLateHours}س</td>
            <td style="text-align: center;">-</td>
            <td style="text-align: center;">-</td>
            <td style="text-align: center;">-</td>
            <td style="text-align: center; color: #B91C1C;">${totalExcessHours}س</td>
            <td style="text-align: left; color: #B91C1C; font-size: 14px;">${formatSalaryCurrency(totalLateDeductions)}</td>
          </tr>
        </tfoot>
      </table>

      <!-- Section 2: Detailed Punch Logs -->
      <div style="font-weight: bold; margin-bottom: 6px; font-size: 13px; color: #374151;">ثانياً: سجل البصمات اليومية المسجلة للتأخير:</div>
      <table style="margin-bottom: 18px;">
        <thead>
          <tr style="background: #E5E7EB; color: #1F2937;">
            <th style="width: 25px; text-align: center;">#</th>
            <th>اسم الموظف</th>
            <th>القسم</th>
            <th style="text-align: center;">التاريخ</th>
            <th style="text-align: center;">وقت البصمة</th>
            <th style="text-align: center;">دقائق التأخير</th>
            <th>جهاز البصمة</th>
            <th style="text-align: center;">الحالة</th>
          </tr>
        </thead>
        <tbody>
          ${punchesRowsHtml}
        </tbody>
      </table>

      <!-- Signatures Grid -->
      <div class="signatures-grid">
        <div class="sig-box">
          <div style="font-size: 11px; font-weight: bold; color: #4B5563;">إعداد مسؤول البصمة والحضور</div>
          <div style="height: 48px; display: flex; align-items: center; justify-content: center; margin: 4px 0;">
            <span style="font-size: 10px; color: #059669; font-weight: bold;">✓ تم الرصد والتدقيق</span>
          </div>
          <div style="font-size: 10px; color: #6B7280;">شؤون الموظفين • دوامي</div>
        </div>

        <div class="sig-box">
          <div style="font-size: 11px; font-weight: bold; color: #4B5563;">اعتماد مدير الموارد البشرية</div>
          <div style="height: 48px; display: flex; align-items: center; justify-content: center; margin: 4px 0;">
            ${
              currentUser.signatureDataUrl
                ? `<img src="${currentUser.signatureDataUrl}" class="sig-img" alt="Manager Signature" />`
                : `<div class="stamp-box">معتمد</div>`
            }
          </div>
          <div style="font-size: 10px; color: #6B7280;">${currentUser.name} (${currentUser.title})</div>
        </div>

        <div class="sig-box">
          <div style="font-size: 11px; font-weight: bold; color: #4B5563;">اعتماد الإدارة المالية والتنفيذية</div>
          <div style="height: 48px; display: flex; align-items: center; justify-content: center; margin: 4px 0;">
            <div class="stamp-box">صُرِف</div>
          </div>
          <div style="font-size: 10px; color: #6B7280;">صالح للتطبيق في مسير الرواتب الرسمي</div>
        </div>
      </div>
    `;

    printHtmlDocument({
      title: `تقرير تأخيرات البصمة وسماحية التأخير الشامل - شهر ${selectedMonth}`,
      contentHtml,
      landscape: true,
    });
  };

  // PDF Export Handler
  const handleExportPdf = async () => {
    if (!reportCardRef.current) return;
    try {
      setIsExportingPdf(true);
      await exportElementToPdf({
        element: reportCardRef.current,
        fileName: `All-Employees-Late-Report-${selectedMonth}.pdf`,
        landscape: true,
      });
    } catch (err) {
      console.error('Failed to export all employees late report PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Excel Export Handler
  const handleExportExcel = () => {
    try {
      // Sheet 1: Summary by Employee
      const summaryData = summaries.map((s, idx) => ({
        [isAr ? 'م' : 'No']: idx + 1,
        [isAr ? 'اسم الموظف' : 'Employee Name']: s.userName,
        [isAr ? 'القسم' : 'Department']: s.department,
        [isAr ? 'مرات التأخير' : 'Late Occurrences']: s.totalLateOccurrences,
        [isAr ? 'إجمالي التأخير (دقيقة)' : 'Total Late (Mins)']: s.totalLateMinutes,
        [isAr ? 'سماحية التأخير الشهرية (ساعة)' : 'Grace Hours']: s.allowedGraceHours || 4,
        [isAr ? 'المستهلك من السماحية (ساعة)' : 'Used Grace (Hours)']:
          Math.round((s.usedGraceMinutes / 60) * 100) / 100,
        [isAr ? 'المتبقي من السماحية (ساعة)' : 'Remaining Grace (Hours)']: s.remainingGraceHours,
        [isAr ? 'الساعات الزائدة الخاضعة للخصم' : 'Excess Deductible Hours']: s.excessLateHours,
        [isAr ? 'أجر الساعة' : 'Hourly Rate']: s.hourlyRate,
        [isAr ? 'مبلغ خصم التأخير المستحق (ر.س)' : 'Late Deduction (SAR)']: s.lateDeductionAmount,
      }));

      // Sheet 2: All Punch Records
      const punchData = allLatePunches.map((p, idx) => ({
        [isAr ? 'م' : 'No']: idx + 1,
        [isAr ? 'اسم الموظف' : 'Employee Name']: p.employeeName,
        [isAr ? 'القسم' : 'Department']: p.department,
        [isAr ? 'التاريخ' : 'Date']: p.date,
        [isAr ? 'وقت البصمة' : 'Check-In Time']: p.checkInTime || '-',
        [isAr ? 'مدة التأخير (دقيقة)' : 'Late Duration (Mins)']: p.lateMinutes,
        [isAr ? 'جهاز البصمة' : 'Device']: p.deviceName || 'جهاز البصمة',
        [isAr ? 'الملاحظات / العذر' : 'Notes']: p.notes || '-',
        [isAr ? 'حالة الخصم' : 'Status']: p.isLateDeductionWaived ? 'معفى بقرار إداري' : 'خاضع للخصم',
        [isAr ? 'المسؤول الذي رفع الخصم' : 'Waived By']: p.waivedBy || '-',
        [isAr ? 'سبب الإعفاء' : 'Waiver Reason']: p.waivedReason || '-',
      }));

      const wb = XLSX.utils.book_new();
      const ws1 = XLSX.utils.json_to_sheet(summaryData);
      const ws2 = XLSX.utils.json_to_sheet(punchData);
      XLSX.utils.book_append_sheet(wb, ws1, isAr ? 'ملخص الموظفين' : 'Employees Summary');
      XLSX.utils.book_append_sheet(wb, ws2, isAr ? 'سجلات البصمات' : 'Punch Details');
      XLSX.writeFile(wb, `Dawamy-Late-Punches-Report-${selectedMonth}.xlsx`);
    } catch (err) {
      console.error('Failed to export late report excel:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#E5E2D9] max-w-5xl w-full overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-[#FAF9F6] border-b border-[#E5E2D9] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#5E7153]/10 text-[#5E7153]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#2D3628]">
                {isAr ? 'التقرير الشامل لرصد تأخيرات البصمة لكافة الموظفين' : 'All Employees Late Punch Audit Report'}
              </h3>
              <p className="text-xs text-[#65635E]">
                {isAr
                  ? `شهر: ${selectedMonth} • عدد الموظفين: ${totalEmployees} موظف • القسم: ${departmentFilter === 'all' ? 'جميع الأقسام' : departmentFilter}`
                  : `Month: ${selectedMonth} • Employees: ${totalEmployees} • Dept: ${departmentFilter}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#E5E2D9] text-[#2D3628] font-bold text-xs hover:bg-[#FAF9F6] shadow-sm transition-all"
              title={isAr ? 'تصدير إكسل' : 'Export Excel'}
            >
              <FileSpreadsheet className="w-4 h-4 text-[#5E7153]" />
              <span className="hidden sm:inline">{isAr ? 'إكسل' : 'Excel'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#E5E2D9] text-[#2D3628] font-bold text-xs hover:bg-[#FAF9F6] shadow-sm transition-all"
              title={isAr ? 'طباعة التقرير الشامل' : 'Print All'}
            >
              <Printer className="w-4 h-4 text-[#5E7153]" />
              <span className="hidden sm:inline">{isAr ? 'طباعة' : 'Print'}</span>
            </button>

            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5E7153] text-white font-bold text-xs hover:bg-[#4D5E44] shadow-sm transition-all disabled:opacity-50"
              title={isAr ? 'تصدير ملف PDF' : 'Download PDF'}
            >
              {isExportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span className="hidden sm:inline">{isAr ? 'تصدير PDF' : 'Export PDF'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#8C887B] hover:text-[#2D3628] hover:bg-white border border-transparent hover:border-[#E5E2D9] transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View Switcher Bar */}
        <div className="bg-[#FAF9F6]/80 px-4 py-2 border-b border-[#E5E2D9] flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveView('summary')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                activeView === 'summary'
                  ? 'bg-white text-[#2D3628] shadow-sm border border-[#E5E2D9]'
                  : 'text-[#65635E] hover:text-[#2D3628]'
              }`}
            >
              {isAr ? 'ملخص احتساب الموظفين' : 'Employees Summary'}
            </button>
            <button
              onClick={() => setActiveView('detailed_punches')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                activeView === 'detailed_punches'
                  ? 'bg-white text-[#2D3628] shadow-sm border border-[#E5E2D9]'
                  : 'text-[#65635E] hover:text-[#2D3628]'
              }`}
            >
              {isAr ? `كافة بصمات التأخير اليومية (${allLatePunches.length})` : `All Daily Punches (${allLatePunches.length})`}
            </button>
          </div>

          <div className="text-[#8C887B] text-[11px] hidden sm:block">
            {isAr ? 'يتضمن احتساب سماحية الـ 4 ساعات التراكمية' : 'Includes 4-Hour Cumulative Grace Calculation'}
          </div>
        </div>

        {/* Modal Printable Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5" ref={reportCardRef}>
          {/* Official Printable Header */}
          <div className="flex items-start justify-between border-b-2 border-[#5E7153] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#5E7153] text-white flex items-center justify-center font-bold text-xl shadow-sm">
                🏢
              </div>
              <div>
                <h4 className="font-bold text-[#2D3628] text-base">شركة التقنية والحلول الذكية</h4>
                <p className="text-xs text-[#5E7153] font-bold">
                  {isAr ? 'إدارة الموارد البشرية والرواتب • التقرير المالي المجمع للتأخيرات' : 'HR & Payroll Dept • Dawamy'}
                </p>
              </div>
            </div>

            <div className="text-left">
              <span className="inline-block px-3 py-1 rounded-lg bg-[#FAF9F6] border border-[#E5E2D9] text-[#2D3628] font-bold text-xs">
                {isAr ? `تقرير شهر: ${selectedMonth}` : `Report: ${selectedMonth}`}
              </span>
              <p className="text-[10px] text-[#8C887B] mt-1">
                {new Date().toLocaleDateString(isAr ? 'ar-SA' : 'en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>

          {/* Overview Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 bg-[#FAF9F6] rounded-xl border border-[#E5E2D9]">
              <span className="text-[11px] text-[#65635E] block">{isAr ? 'إجمالي الموظفين' : 'Total Employees'}</span>
              <span className="text-lg font-bold text-[#2D3628] mt-0.5 block">{totalEmployees} موظف</span>
            </div>

            <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200">
              <span className="text-[11px] text-amber-800 font-semibold block">{isAr ? 'المتأخرون' : 'Late Staff'}</span>
              <span className="text-lg font-bold text-amber-900 mt-0.5 block">{lateEmployeesCount} موظف</span>
            </div>

            <div className="p-3 bg-white rounded-xl border border-[#E5E2D9]">
              <span className="text-[11px] text-[#65635E] block">{isAr ? 'إجمالي ساعات التأخير' : 'Total Delay Hours'}</span>
              <span className="text-lg font-bold text-[#2D3628] mt-0.5 block">{totalLateHours} ساعة</span>
            </div>

            <div className="p-3 bg-rose-50/70 rounded-xl border border-rose-200">
              <span className="text-[11px] text-rose-800 font-semibold block">{isAr ? 'الساعات المخصومة' : 'Deductible Hours'}</span>
              <span className="text-lg font-bold text-rose-900 mt-0.5 block">{totalExcessHours} ساعة</span>
            </div>

            <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 col-span-2 sm:col-span-1">
              <span className="text-[11px] text-emerald-800 font-semibold block">{isAr ? 'إجمالي الخصم المستحق' : 'Total Deductions'}</span>
              <span className="text-lg font-bold text-emerald-900 mt-0.5 block">
                {totalLateDeductions > 0 ? `-${formatSalaryCurrency(totalLateDeductions)}` : '0.00 ر.س'}
              </span>
            </div>
          </div>

          {/* View 1: Summary Table by Employee */}
          {activeView === 'summary' && (
            <div className="space-y-3">
              <h5 className="font-bold text-[#2D3628] text-xs sm:text-sm flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#5E7153]" />
                  {isAr ? 'جدول ملخص التأخير والسماحية لكل موظف:' : 'Employee Grace & Late Summary Table:'}
                </span>
                <span className="text-xs text-[#8C887B] font-normal">
                  {isAr ? `إجمالي السجلات: ${summaries.length} موظف` : `Total: ${summaries.length} employees`}
                </span>
              </h5>

              <div className="overflow-x-auto rounded-xl border border-[#E5E2D9]">
                <table className="w-full text-xs text-right bg-white">
                  <thead className="bg-[#FAF9F6] border-b border-[#E5E2D9] text-[#65635E] font-bold">
                    <tr>
                      <th className="p-2.5 text-center w-8">#</th>
                      <th className="p-2.5">{isAr ? 'الموظف' : 'Employee'}</th>
                      <th className="p-2.5">{isAr ? 'القسم' : 'Department'}</th>
                      <th className="p-2.5 text-center">{isAr ? 'مرات التأخير' : 'Count'}</th>
                      <th className="p-2.5 text-center">{isAr ? 'إجمالي التأخير' : 'Total Late'}</th>
                      <th className="p-2.5 text-center">{isAr ? 'المستهلك من السماحية' : 'Used Grace'}</th>
                      <th className="p-2.5 text-center">{isAr ? 'المتبقي' : 'Remaining'}</th>
                      <th className="p-2.5 text-center">{isAr ? 'الساعات المخصومة' : 'Deductible'}</th>
                      <th className="p-2.5 text-left">{isAr ? 'خصم التأخير' : 'Deduction'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E2D9]">
                    {summaries.map((s, idx) => {
                      const isClean = s.totalLateOccurrences === 0;
                      const hasExcess = s.excessLateHours > 0;
                      return (
                        <tr
                          key={s.userId}
                          className={isClean ? 'bg-emerald-50/30' : hasExcess ? 'bg-rose-50/20 hover:bg-rose-50/40' : 'hover:bg-[#FAF9F6]'}
                        >
                          <td className="p-2.5 text-center font-bold text-[#8C887B]">{idx + 1}</td>
                          <td className="p-2.5 font-bold text-[#2D3628] whitespace-nowrap">{s.userName}</td>
                          <td className="p-2.5 text-[#65635E] whitespace-nowrap">{s.department}</td>
                          <td className="p-2.5 text-center font-bold text-[#2D3628]">{s.totalLateOccurrences}</td>
                          <td className="p-2.5 text-center font-bold text-rose-800 whitespace-nowrap">
                            {formatMinutesHuman(s.totalLateMinutes, lang)}
                          </td>
                          <td className="p-2.5 text-center text-[#5E7153] font-bold whitespace-nowrap">
                            {formatMinutesHuman(s.usedGraceMinutes, lang)} / {s.allowedGraceHours || 4}س
                          </td>
                          <td className="p-2.5 text-center text-emerald-700 whitespace-nowrap">
                            {formatMinutesHuman(s.remainingGraceMinutes, lang)}
                          </td>
                          <td className="p-2.5 text-center font-bold whitespace-nowrap">
                            {hasExcess ? (
                              <span className="text-rose-700 font-bold">{s.excessLateHours}س</span>
                            ) : (
                              <span className="text-emerald-700">0</span>
                            )}
                          </td>
                          <td className="p-2.5 text-left font-bold whitespace-nowrap">
                            {s.lateDeductionAmount > 0 ? (
                              <span className="text-rose-700">-{formatSalaryCurrency(s.lateDeductionAmount)}</span>
                            ) : (
                              <span className="text-emerald-700">0.00 ر.س</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#FAF9F6] font-bold border-t-2 border-[#E5E2D9]">
                      <td colSpan={3} className="p-2.5 text-center text-[#2D3628]">
                        {isAr ? 'الإجمالي العام المعتمد' : 'Total'}
                      </td>
                      <td className="p-2.5 text-center text-[#2D3628]">{allLatePunches.length}</td>
                      <td className="p-2.5 text-center text-rose-800">{totalLateHours}س</td>
                      <td colSpan={2} className="p-2.5 text-center text-[#8C887B]">
                        -
                      </td>
                      <td className="p-2.5 text-center text-rose-800">{totalExcessHours}س</td>
                      <td className="p-2.5 text-left text-rose-800">{formatSalaryCurrency(totalLateDeductions)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* View 2: All Punches Table */}
          {activeView === 'detailed_punches' && (
            <div className="space-y-3">
              <h5 className="font-bold text-[#2D3628] text-xs sm:text-sm flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#5E7153]" />
                  {isAr ? 'سجل كافة بصمات التأخير اليومية لجميع الموظفين:' : 'All Employees Daily Late Punch Logs:'}
                </span>
                <span className="text-xs text-[#8C887B] font-normal">
                  {isAr ? `إجمالي الحالات: ${allLatePunches.length} حالة` : `Total: ${allLatePunches.length} punches`}
                </span>
              </h5>

              {allLatePunches.length === 0 ? (
                <div className="p-8 text-center bg-[#FAF9F6] rounded-xl border border-[#E5E2D9]">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-1.5" />
                  <p className="font-bold text-emerald-800 text-sm">
                    {isAr ? 'لا توجد أي بصمات تأخير مسجلة في هذا الشهر' : 'No late attendance recorded this month'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[#E5E2D9]">
                  <table className="w-full text-xs text-right bg-white">
                    <thead className="bg-[#FAF9F6] border-b border-[#E5E2D9] text-[#65635E] font-bold">
                      <tr>
                        <th className="p-2.5 text-center w-8">#</th>
                        <th className="p-2.5">{isAr ? 'الموظف' : 'Employee'}</th>
                        <th className="p-2.5">{isAr ? 'القسم' : 'Department'}</th>
                        <th className="p-2.5 text-center">{isAr ? 'التاريخ' : 'Date'}</th>
                        <th className="p-2.5 text-center">{isAr ? 'وقت البصمة' : 'Check-In'}</th>
                        <th className="p-2.5 text-center">{isAr ? 'مدة التأخير' : 'Duration'}</th>
                        <th className="p-2.5">{isAr ? 'جهاز البصمة' : 'Device'}</th>
                        <th className="p-2.5">{isAr ? 'السبب / الملاحظات' : 'Notes'}</th>
                        <th className="p-2.5 text-center">{isAr ? 'حالة الخصم' : 'Status'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E2D9]">
                      {allLatePunches.map((p, idx) => {
                        const isWaived = p.isLateDeductionWaived;
                        return (
                          <tr key={`${p.id}-${idx}`} className={isWaived ? 'bg-emerald-50/40' : 'hover:bg-[#FAF9F6]'}>
                            <td className="p-2.5 text-center font-bold text-[#8C887B]">{idx + 1}</td>
                            <td className="p-2.5 font-bold text-[#2D3628] whitespace-nowrap">{p.employeeName}</td>
                            <td className="p-2.5 text-[#65635E] whitespace-nowrap">{p.department}</td>
                            <td className="p-2.5 text-center font-bold text-[#2D3628] whitespace-nowrap">{p.date}</td>
                            <td className="p-2.5 text-center font-mono font-bold text-[#5E7153] whitespace-nowrap">
                              {p.checkInTime || '-'}
                            </td>
                            <td className="p-2.5 text-center font-bold text-rose-800 whitespace-nowrap">
                              {p.lateMinutes} {isAr ? 'دقيقة' : 'mins'}
                            </td>
                            <td className="p-2.5 text-[#65635E] whitespace-nowrap">{p.deviceName || 'جهاز البصمة'}</td>
                            <td className="p-2.5 text-[#4B5563] max-w-xs">{p.notes || '-'}</td>
                            <td className="p-2.5 text-center whitespace-nowrap">
                              {isWaived ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                  <CheckCircle2 className="w-3 h-3" />
                                  {isAr ? 'معفى بقرار' : 'Waived'}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                                  <AlertTriangle className="w-3 h-3" />
                                  {isAr ? 'مطبق' : 'Active'}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Official Signatures Grid */}
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-dashed border-[#D1D5DB] text-center text-xs">
            <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E5E2D9]">
              <span className="font-bold text-[#65635E] block text-[11px]">
                {isAr ? 'إعداد مسؤول البصمة والحضور' : 'HR Officer'}
              </span>
              <div className="h-10 flex items-center justify-center my-1">
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  ✓ {isAr ? 'تم التدقيق والمطابقة' : 'Verified'}
                </span>
              </div>
              <span className="text-[10px] text-[#8C887B]">شؤون الموظفين • دوامي</span>
            </div>

            <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E5E2D9]">
              <span className="font-bold text-[#65635E] block text-[11px]">
                {isAr ? 'اعتماد مدير الموارد البشرية' : 'HR Manager'}
              </span>
              <div className="h-10 flex items-center justify-center my-1">
                {currentUser.signatureDataUrl ? (
                  <img src={currentUser.signatureDataUrl} alt="Manager Signature" className="max-h-9 object-contain" />
                ) : (
                  <div className="w-12 h-8 rounded border border-dashed border-[#5E7153] flex items-center justify-center text-[10px] text-[#5E7153] font-bold">
                    معتمد
                  </div>
                )}
              </div>
              <span className="text-[10px] text-[#8C887B]">{currentUser.name}</span>
            </div>

            <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E5E2D9]">
              <span className="font-bold text-[#65635E] block text-[11px]">
                {isAr ? 'اعتماد الإدارة العامة والمالية' : 'Executive Approval'}
              </span>
              <div className="h-10 flex items-center justify-center my-1">
                <div className="w-12 h-8 rounded border border-dashed border-[#5E7153] flex items-center justify-center text-[10px] text-[#5E7153] font-bold">
                  صُرِف
                </div>
              </div>
              <span className="text-[10px] text-[#8C887B]">صالح للتحويل المالي المعتمد</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#FAF9F6] border-t border-[#E5E2D9] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-[#8C887B] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#5E7153]" />
            <span>{isAr ? 'تقرير رسمي معتمد لإدارة الرواتب والالتزام الوظيفي' : 'Official HR Compliance Report'}</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end w-full sm:w-auto">
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2 rounded-xl bg-white border border-[#E5E2D9] text-[#2D3628] font-bold text-xs hover:bg-[#FAF9F6] shadow-sm transition-all flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#5E7153]" />
              <span>{isAr ? 'تصدير إكسل' : 'Excel'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-white border border-[#E5E2D9] text-[#2D3628] font-bold text-xs hover:bg-[#FAF9F6] shadow-sm transition-all flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4 text-[#5E7153]" />
              <span>{isAr ? 'طباعة الكشف' : 'Print'}</span>
            </button>
            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="px-4 py-2 rounded-xl bg-[#5E7153] text-white font-bold text-xs hover:bg-[#4D5E44] shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {isExportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>{isAr ? 'تصدير PDF' : 'Export PDF'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#EFECE4] hover:bg-[#E5E2D9] text-[#2D3628] font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <X className="w-4 h-4 text-[#8C887B]" />
              <span>{isAr ? 'إغلاق ومغادرة' : 'Close'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
