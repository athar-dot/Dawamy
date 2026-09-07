import React, { useRef, useState } from 'react';
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
  User,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { UserProfile, MonthlyEmployeeLateSummary } from '../types';
import { formatSalaryCurrency, formatMinutesHuman } from '../utils/payrollUtils';
import { printHtmlDocument, exportElementToPdf } from '../utils/printUtils';

interface EmployeeLateReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: UserProfile;
  currentUser: UserProfile;
  summary: MonthlyEmployeeLateSummary;
  selectedMonth: string;
  lang: 'ar' | 'en';
}

export const EmployeeLateReportModal: React.FC<EmployeeLateReportModalProps> = ({
  isOpen,
  onClose,
  employee,
  currentUser,
  summary,
  selectedMonth,
  lang,
}) => {
  const isAr = lang === 'ar';
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const reportCardRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !employee || !summary) return null;

  const employeeSig = employee.signatureDataUrl;
  const approverSig = currentUser.signatureDataUrl;
  const lateRecords = summary.lateRecords || [];

  // Print Handler
  const handlePrint = () => {
    const formattedDate = new Date().toLocaleDateString(isAr ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const recordsRowsHtml =
      lateRecords.length === 0
        ? `<tr><td colspan="7" style="text-align: center; color: #047857; padding: 14px; font-weight: bold;">لا يوجد أي تسجيل تأخير لهذا الموظف خلال شهر ${selectedMonth} (سجل حضور مثالي 100%)</td></tr>`
        : lateRecords
            .map(
              (rec, idx) => `
          <tr style="background: ${rec.isLateDeductionWaived ? '#F0FDF4' : '#FFF'};">
            <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
            <td style="font-weight: bold;">${rec.date}</td>
            <td style="text-align: center; color: #5E7153; font-weight: bold;">${rec.checkInTime || '-'}</td>
            <td style="text-align: center;">09:00 ص</td>
            <td style="text-align: center; color: #B91C1C; font-weight: bold;">${rec.lateMinutes} دقيقة</td>
            <td>${rec.deviceName || 'جهاز البصمة الرئيسي'}</td>
            <td>${rec.notes || '-'}</td>
            <td style="text-align: center;">
              ${
                rec.isLateDeductionWaived
                  ? `<span style="color: #047857; font-weight: bold; background: #DCFCE7; padding: 3px 8px; border-radius: 6px; font-size: 11px;">✓ معفى بقرار إداري</span>`
                  : `<span style="color: #B45309; font-weight: bold; background: #FEF3C7; padding: 3px 8px; border-radius: 6px; font-size: 11px;">خاضع للخصم</span>`
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
            <p style="margin: 2px 0 0; font-size: 11px; color: #5E7153; font-weight: bold;">إدارة الموارد البشرية والرواتب • منظومة دوامي</p>
          </div>
        </div>
        <div style="text-align: left;">
          <div style="font-size: 16px; font-weight: bold; color: #1F2937;">تقرير تفاصيل سجلات تأخير البصمة</div>
          <div style="font-size: 11px; color: #6B7280; margin-top: 2px;">الشهر المستحق: <strong>${selectedMonth}</strong></div>
          <div style="font-size: 10px; color: #9CA3AF;">تاريخ الإصدار: ${formattedDate}</div>
        </div>
      </div>

      <!-- Employee Info Grid -->
      <table style="margin-bottom: 14px;">
        <tr style="background: #F9FAFB;">
          <th style="width: 25%;">اسم الموظف</th>
          <td style="width: 25%; font-weight: bold; color: #1F2937;">${summary.userName}</td>
          <th style="width: 25%;">الرقم الوظيفي / البصمة</th>
          <td style="width: 25%;">${employee.biometricEnrollId || employee.id}</td>
        </tr>
        <tr>
          <th>المسمى الوظيفي</th>
          <td>${employee.title || 'موظف'}</td>
          <th>القسم / الإدارة</th>
          <td>${summary.department}</td>
        </tr>
        <tr style="background: #F9FAFB;">
          <th>الراتب الأساسي</th>
          <td style="font-weight: bold;">${formatSalaryCurrency(summary.baseSalary)}</td>
          <th>أجر ساعة العمل</th>
          <td>${formatSalaryCurrency(summary.hourlyRate)} / ساعة</td>
        </tr>
      </table>

      <!-- 4-Hour Grace Calculation Summary -->
      <table style="margin-bottom: 16px; background: #F4F6F2; border: 1.5px solid #5E7153;">
        <tr style="background: #5E7153; color: white;">
          <th colspan="4" style="text-align: center; color: white; font-size: 13px; padding: 6px;">ملخص احتساب سماحية التأخير الشهرية (سماحية الـ ${summary.allowedGraceHours || 4} ساعات)</th>
        </tr>
        <tr>
          <td style="text-align: center; width: 25%;">
            <div style="font-size: 11px; color: #4B5563;">مرات التأخير</div>
            <div style="font-size: 14px; font-weight: bold; color: #1F2937; margin-top: 2px;">${summary.totalLateOccurrences} مرات</div>
          </td>
          <td style="text-align: center; width: 25%;">
            <div style="font-size: 11px; color: #4B5563;">إجمالي وقت التأخير</div>
            <div style="font-size: 14px; font-weight: bold; color: #B91C1C; margin-top: 2px;">${formatMinutesHuman(summary.totalLateMinutes, lang)}</div>
          </td>
          <td style="text-align: center; width: 25%;">
            <div style="font-size: 11px; color: #4B5563;">المستهلك من السماحية</div>
            <div style="font-size: 14px; font-weight: bold; color: #5E7153; margin-top: 2px;">${formatMinutesHuman(summary.usedGraceMinutes, lang)} / ${summary.allowedGraceHours || 4}س</div>
          </td>
          <td style="text-align: center; width: 25%;">
            <div style="font-size: 11px; color: #4B5563;">الساعات الزائدة الخاضعة للخصم</div>
            <div style="font-size: 14px; font-weight: bold; color: ${summary.excessLateHours > 0 ? '#B91C1C' : '#047857'}; margin-top: 2px;">
              ${summary.excessLateHours > 0 ? `${summary.excessLateHours} ساعة` : '0 (ضمن المسموح)'}
            </div>
          </td>
        </tr>
        <tr>
          <td colspan="3" style="font-weight: bold; color: #374151;">صافي مبلغ خصم التأخير المحتسب في مسير الراتب:</td>
          <td style="text-align: center; font-size: 15px; font-weight: 900; color: ${summary.lateDeductionAmount > 0 ? '#B91C1C' : '#047857'};">
            ${summary.lateDeductionAmount > 0 ? `-${formatSalaryCurrency(summary.lateDeductionAmount)}` : '0.00 ر.س'}
          </td>
        </tr>
      </table>

      <!-- Detailed Daily Punch Log -->
      <div style="font-weight: bold; margin-bottom: 6px; font-size: 13px; color: #374151;">جدول تفاصيل البصمات اليومية المسجلة للتأخير:</div>
      <table style="margin-bottom: 16px;">
        <thead>
          <tr style="background: #E5E7EB; color: #1F2937;">
            <th style="width: 30px; text-align: center;">#</th>
            <th>التاريخ</th>
            <th style="text-align: center;">وقت البصمة</th>
            <th style="text-align: center;">الموعد الرسمي</th>
            <th style="text-align: center;">مدة التأخير</th>
            <th>جهاز البصمة</th>
            <th>الملاحظات / العذر</th>
            <th style="text-align: center;">حالة الخصم</th>
          </tr>
        </thead>
        <tbody>
          ${recordsRowsHtml}
        </tbody>
      </table>

      <!-- Signatures Grid -->
      <div class="signatures-grid">
        <div class="sig-box">
          <div style="font-size: 11px; font-weight: bold; color: #4B5563;">إعداد مسؤول البصمة والحضور</div>
          <div style="height: 48px; display: flex; align-items: center; justify-content: center; margin: 4px 0;">
            <span style="font-size: 10px; color: #059669; font-weight: bold;">✓ تم الرصد والتدقيق</span>
          </div>
          <div style="font-size: 10px; color: #6B7280;">منظومة دوامي الذكية</div>
        </div>

        <div class="sig-box">
          <div style="font-size: 11px; font-weight: bold; color: #4B5563;">اعتماد مدير الموارد البشرية</div>
          <div style="height: 48px; display: flex; align-items: center; justify-content: center; margin: 4px 0;">
            ${
              approverSig
                ? `<img src="${approverSig}" class="sig-img" alt="Manager Signature" />`
                : `<div class="stamp-box">معتمد</div>`
            }
          </div>
          <div style="font-size: 10px; color: #6B7280;">${currentUser.name} (${currentUser.title})</div>
        </div>

        <div class="sig-box">
          <div style="font-size: 11px; font-weight: bold; color: #4B5563;">توقيع واطلاع الموظف</div>
          <div style="height: 48px; display: flex; align-items: center; justify-content: center; margin: 4px 0;">
            ${
              employeeSig
                ? `<img src="${employeeSig}" class="sig-img" alt="Employee Signature" />`
                : `<span style="font-size: 10px; color: #9CA3AF; font-style: italic;">بانتظار توقيع الموظف</span>`
            }
          </div>
          <div style="font-size: 10px; color: #6B7280;">${employee.name}</div>
        </div>
      </div>
    `;

    printHtmlDocument({
      title: `تقرير تأخيرات البصمة - ${employee.name} - شهر ${selectedMonth}`,
      contentHtml,
      landscape: false,
    });
  };

  // PDF Export Handler
  const handleExportPdf = async () => {
    if (!reportCardRef.current) return;
    try {
      setIsExportingPdf(true);
      await exportElementToPdf({
        element: reportCardRef.current,
        fileName: `Late-Report-${employee.name.replace(/\s+/g, '_')}-${selectedMonth}.pdf`,
        landscape: false,
      });
    } catch (err) {
      console.error('Failed to export employee late report PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#E5E2D9] max-w-3xl w-full overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-[#FAF9F6] border-b border-[#E5E2D9] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#5E7153]/10 text-[#5E7153]">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#2D3628]">
                {isAr ? 'كشف تفاصيل سجلات التأخير بالبصمة' : 'Detailed Late Punch Report'}
              </h3>
              <p className="text-xs text-[#65635E]">
                {isAr ? `للموظف: ${employee.name} • شهر: ${selectedMonth}` : `${employee.name} • Month: ${selectedMonth}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#E5E2D9] text-[#2D3628] font-bold text-xs hover:bg-[#FAF9F6] shadow-sm transition-all"
              title={isAr ? 'طباعة الكشف' : 'Print Report'}
            >
              <Printer className="w-4 h-4 text-[#5E7153]" />
              <span className="hidden sm:inline">{isAr ? 'طباعة' : 'Print'}</span>
            </button>

            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5E7153] text-white font-bold text-xs hover:bg-[#4D5E44] shadow-sm transition-all disabled:opacity-50"
              title={isAr ? 'تحميل ملف PDF' : 'Download PDF'}
            >
              {isExportingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
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

        {/* Modal Printable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5" ref={reportCardRef}>
          {/* Printable Report Header */}
          <div className="flex items-start justify-between border-b-2 border-[#5E7153] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#5E7153] text-white flex items-center justify-center font-bold text-xl shadow-sm">
                🏢
              </div>
              <div>
                <h4 className="font-bold text-[#2D3628] text-base">شركة التقنية والحلول الذكية</h4>
                <p className="text-xs text-[#5E7153] font-bold">
                  {isAr ? 'إدارة الموارد البشرية والرواتب • منظومة دوامي' : 'HR & Payroll Management • Dawamy'}
                </p>
              </div>
            </div>

            <div className="text-left">
              <span className="inline-block px-3 py-1 rounded-lg bg-[#FAF9F6] border border-[#E5E2D9] text-[#2D3628] font-bold text-xs">
                {isAr ? `كشف تأخيرات شهر: ${selectedMonth}` : `Late Report: ${selectedMonth}`}
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

          {/* Employee Card */}
          <div className="bg-[#FAF9F6] rounded-xl p-4 border border-[#E5E2D9] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-[#8C887B] block text-[11px]">{isAr ? 'اسم الموظف:' : 'Employee:'}</span>
              <strong className="text-[#2D3628] font-bold text-sm block mt-0.5">{summary.userName}</strong>
            </div>
            <div>
              <span className="text-[#8C887B] block text-[11px]">{isAr ? 'القسم / الإدارة:' : 'Department:'}</span>
              <strong className="text-[#2D3628] block mt-0.5">{summary.department}</strong>
            </div>
            <div>
              <span className="text-[#8C887B] block text-[11px]">{isAr ? 'الراتب الأساسي:' : 'Base Salary:'}</span>
              <strong className="text-[#2D3628] block mt-0.5">{formatSalaryCurrency(summary.baseSalary)}</strong>
            </div>
            <div>
              <span className="text-[#8C887B] block text-[11px]">{isAr ? 'أجر الساعة:' : 'Hourly Rate:'}</span>
              <strong className="text-[#5E7153] block mt-0.5">{formatSalaryCurrency(summary.hourlyRate)}/ساعة</strong>
            </div>
          </div>

          {/* Monthly Grace Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-white rounded-xl border border-[#E5E2D9]">
              <span className="text-[11px] text-[#65635E] block">{isAr ? 'مرات التأخير' : 'Late Count'}</span>
              <span className="text-base font-bold text-[#2D3628] mt-0.5 block">
                {summary.totalLateOccurrences} {isAr ? 'مرات' : 'times'}
              </span>
            </div>

            <div className="p-3 bg-white rounded-xl border border-[#E5E2D9]">
              <span className="text-[11px] text-[#65635E] block">{isAr ? 'إجمالي وقت التأخير' : 'Total Delay'}</span>
              <span className="text-base font-bold text-rose-800 mt-0.5 block">
                {formatMinutesHuman(summary.totalLateMinutes, lang)}
              </span>
            </div>

            <div className="p-3 bg-white rounded-xl border border-[#E5E2D9]">
              <span className="text-[11px] text-[#65635E] block">{isAr ? 'المستهلك من السماحية' : 'Grace Used'}</span>
              <span className="text-base font-bold text-[#5E7153] mt-0.5 block">
                {formatMinutesHuman(summary.usedGraceMinutes, lang)} / {summary.allowedGraceHours || 4}س
              </span>
            </div>

            <div className="p-3 bg-[#FAF9F6] rounded-xl border border-[#5E7153]/30">
              <span className="text-[11px] text-[#5E7153] font-bold block">{isAr ? 'خصم التأخير المستحق' : 'Late Deduction'}</span>
              <span
                className={`text-base font-bold mt-0.5 block ${
                  summary.lateDeductionAmount > 0 ? 'text-rose-800' : 'text-emerald-800'
                }`}
              >
                {summary.lateDeductionAmount > 0 ? `-${formatSalaryCurrency(summary.lateDeductionAmount)}` : '0.00 ر.س'}
              </span>
            </div>
          </div>

          {/* Detailed Daily Punch Log */}
          <div>
            <h5 className="font-bold text-[#2D3628] text-xs sm:text-sm mb-2.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#5E7153]" />
                {isAr ? 'سجلات وبصمات التأخير اليومية المفصلة:' : 'Daily Late Punch Logs:'}
              </span>
              <span className="text-xs text-[#8C887B] font-normal">
                {isAr ? 'الموعد المعتمد للحضور: 09:00 ص' : 'Official start: 09:00 AM'}
              </span>
            </h5>

            {lateRecords.length === 0 ? (
              <div className="p-6 text-center bg-[#FAF9F6] rounded-xl border border-[#E5E2D9]">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-1.5" />
                <p className="font-bold text-emerald-800 text-sm">
                  {isAr ? 'لا يوجد أي تأخير مسجل لهذا الموظف خلال هذا الشهر' : 'No late attendance recorded this month'}
                </p>
                <p className="text-xs text-[#8C887B] mt-0.5">
                  {isAr ? 'سجل حضور كامل بنسبة التزام 100%' : 'Perfect attendance record'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[#E5E2D9]">
                <table className="w-full text-xs text-right bg-white">
                  <thead className="bg-[#FAF9F6] border-b border-[#E5E2D9] text-[#65635E] font-bold">
                    <tr>
                      <th className="p-2.5 text-center w-8">#</th>
                      <th className="p-2.5">{isAr ? 'التاريخ' : 'Date'}</th>
                      <th className="p-2.5 text-center">{isAr ? 'وقت البصمة' : 'Check-In'}</th>
                      <th className="p-2.5 text-center">{isAr ? 'مدة التأخير' : 'Late Duration'}</th>
                      <th className="p-2.5">{isAr ? 'جهاز البصمة' : 'Device'}</th>
                      <th className="p-2.5">{isAr ? 'السبب / الملاحظات' : 'Reason / Notes'}</th>
                      <th className="p-2.5 text-center">{isAr ? 'حالة الخصم' : 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E2D9]">
                    {lateRecords.map((rec, idx) => {
                      const isWaived = rec.isLateDeductionWaived;
                      return (
                        <tr key={rec.id} className={isWaived ? 'bg-emerald-50/40' : 'hover:bg-[#FAF9F6]'}>
                          <td className="p-2.5 text-center font-bold text-[#8C887B]">{idx + 1}</td>
                          <td className="p-2.5 font-bold text-[#2D3628] whitespace-nowrap">{rec.date}</td>
                          <td className="p-2.5 text-center font-mono font-bold text-[#5E7153] whitespace-nowrap">
                            {rec.checkInTime || '-'}
                          </td>
                          <td className="p-2.5 text-center font-bold text-rose-800 whitespace-nowrap">
                            {rec.lateMinutes} {isAr ? 'دقيقة' : 'mins'}
                          </td>
                          <td className="p-2.5 text-[#65635E] whitespace-nowrap">
                            {rec.deviceName || (isAr ? 'جهاز البصمة الرئيسي' : 'Main Device')}
                          </td>
                          <td className="p-2.5 text-[#4B5563] max-w-xs">{rec.notes || '-'}</td>
                          <td className="p-2.5 text-center whitespace-nowrap">
                            {isWaived ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                <CheckCircle2 className="w-3 h-3" />
                                {isAr ? 'معفى بقرار إداري' : 'Waived'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                                <AlertTriangle className="w-3 h-3" />
                                {isAr ? 'خاضع للخصم' : 'Active'}
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

          {/* Official Signatures Grid */}
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-dashed border-[#D1D5DB] text-center text-xs">
            <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E5E2D9]">
              <span className="font-bold text-[#65635E] block text-[11px]">
                {isAr ? 'إعداد شؤون الموظفين' : 'HR Preparer'}
              </span>
              <div className="h-10 flex items-center justify-center my-1">
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  ✓ {isAr ? 'تم التدقيق والمطابقة' : 'Verified'}
                </span>
              </div>
              <span className="text-[10px] text-[#8C887B]">منظومة دوامي الذكية</span>
            </div>

            <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E5E2D9]">
              <span className="font-bold text-[#65635E] block text-[11px]">
                {isAr ? 'اعتماد مدير الموارد البشرية' : 'HR Manager Approval'}
              </span>
              <div className="h-10 flex items-center justify-center my-1">
                {approverSig ? (
                  <img src={approverSig} alt="Manager Signature" className="max-h-9 object-contain" />
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
                {isAr ? 'توقيع واطلاع الموظف' : 'Employee Acknowledgement'}
              </span>
              <div className="h-10 flex items-center justify-center my-1">
                {employeeSig ? (
                  <img src={employeeSig} alt="Employee Signature" className="max-h-9 object-contain" />
                ) : (
                  <span className="text-[10px] text-[#9CA3AF] italic">
                    {isAr ? 'بانتظار التوقيع' : 'Pending'}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-[#8C887B]">{employee.name}</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#FAF9F6] border-t border-[#E5E2D9] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-[#8C887B] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#5E7153]" />
            <span>{isAr ? 'مستند رسمي معتمد طبقاً للائحة تنظيم العمل وحساب الأجور' : 'Official HR Document'}</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end w-full sm:w-auto">
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
