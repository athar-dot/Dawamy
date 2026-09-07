import React, { useRef, useState } from 'react';
import {
  Building2,
  Printer,
  X,
  ShieldCheck,
  CreditCard,
  Download,
  Loader2,
  FileCheck,
} from 'lucide-react';
import { UserProfile, AttendanceRecord, SalaryDeduction, SalaryAdvance, MonthlyEmployeeLateSummary } from '../types';
import { formatSalaryCurrency } from '../utils/payrollUtils';
import { printHtmlDocument, exportElementToPdf } from '../utils/printUtils';

interface PayslipModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: UserProfile;
  currentUser: UserProfile;
  summary: MonthlyEmployeeLateSummary;
  selectedMonth: string;
  lang: 'ar' | 'en';
}

export const PayslipModal: React.FC<PayslipModalProps> = ({
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
  const payslipCardRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !employee || !summary) return null;

  const [companyName, setCompanyName] = useState('شركة دوامي للتقنية');
  const [currency, setCurrency] = useState('ر.س');
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('dawamy_company_schedule');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.companyName) setCompanyName(parsed.companyName);
        if (parsed.currency) setCurrency(parsed.currency);
        if (parsed.logoUrl) setLogoUrl(parsed.logoUrl);
      }
    } catch (e) {
      console.warn(e);
    }
  }, []);

  // Signatures
  const employeeSig = employee.signatureDataUrl;
  const approverSig = currentUser.signatureDataUrl;

  const handlePrint = () => {
    const formattedDate = new Date().toLocaleDateString(isAr ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const advanceRow =
      summary.advanceInstallmentsAmount > 0
        ? `<tr>
            <td style="color: #4338CA; font-weight: bold;">استقطاع قسط سلفة الراتب المستحق</td>
            <td style="text-align: left; color: #4338CA; font-weight: bold;">-${formatSalaryCurrency(summary.advanceInstallmentsAmount)}</td>
          </tr>`
        : '';

    const waivedRow =
      summary.waivedDeductionsAmount > 0
        ? `<tr>
            <td style="color: #047857; font-weight: bold;">إعفاءات وحسومات تم رفعها رسمياً</td>
            <td style="text-align: left; color: #047857; font-weight: bold;">+${formatSalaryCurrency(summary.waivedDeductionsAmount)}</td>
          </tr>`
        : '';

    const logoHtml = logoUrl
      ? `<img src="${logoUrl}" style="width: 44px; height: 44px; object-fit: contain; border-radius: 8px; border: 1px solid #E5E2D9; background: white;" crossorigin="anonymous" />`
      : `<div style="background: #5E7153; color: white; width: 44px; height: 44px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: bold;">🏢</div>`;

    const contentHtml = `
      <div class="header-box">
        <div style="display: flex; align-items: center; gap: 12px;">
          ${logoHtml}
          <div>
            <h2 style="margin: 0; font-size: 18px; color: #1F2937;">${companyName}</h2>
            <p style="margin: 2px 0 0; font-size: 11px; color: #5E7153; font-weight: bold;">إدارة الموارد البشرية والرواتب • منظومة دوامي</p>
          </div>
        </div>
        <div style="text-align: left;">
          <div style="font-size: 16px; font-weight: bold; color: #1F2937;">قسيمة الراتب والمستحقات الشهرية</div>
          <div style="font-size: 11px; color: #6B7280; margin-top: 2px;">الشهر المستحق: <strong>${selectedMonth}</strong></div>
          <div style="font-size: 10px; color: #9CA3AF;">تاريخ الإصدار: ${formattedDate}</div>
        </div>
      </div>

      <!-- Employee Info Grid -->
      <table style="margin-bottom: 16px;">
        <tr style="background: #F9FAFB;">
          <th style="width: 25%;">اسم الموظف</th>
          <td style="width: 25%; font-weight: bold;">${summary.userName}</td>
          <th style="width: 25%;">الرقم الوظيفي / البصمة</th>
          <td style="width: 25%;">${employee.biometricEnrollId || employee.id}</td>
        </tr>
        <tr>
          <th>المسمى الوظيفي</th>
          <td>${employee.title || 'موظف'}</td>
          <th>القسم / الإدارة</th>
          <td>${summary.department}</td>
        </tr>
      </table>

      <!-- Breakdown Table -->
      <div style="font-weight: bold; margin-bottom: 6px; font-size: 13px; color: #374151;">تفاصيل الاستحقاقات والاستقطاعات:</div>
      <table style="margin-bottom: 12px;">
        <thead>
          <tr>
            <th style="text-align: right;">البيان المالي</th>
            <th style="text-align: left; width: 35%;">المبلغ (ر.س)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>الراتب الأساسي المعتمد</td>
            <td style="text-align: left; font-weight: bold;">${formatSalaryCurrency(summary.baseSalary)}</td>
          </tr>
          <tr>
            <td>
              خصم التأخير بالبصمة
              <span style="font-size: 10px; color: #6B7280;">(${summary.excessLateHours} ساعة تأخير متجاوزة لسماحية الـ ${summary.allowedGraceHours || 4}س)</span>
            </td>
            <td style="text-align: left; color: ${summary.lateDeductionAmount > 0 ? '#B91C1C' : '#047857'}; font-weight: bold;">
              ${summary.lateDeductionAmount > 0 ? `-${formatSalaryCurrency(summary.lateDeductionAmount)}` : '0.00 ر.س'}
            </td>
          </tr>
          <tr>
            <td>خصم الجزاءات والعقوبات الإدارية والغياب</td>
            <td style="text-align: left; color: ${summary.penaltyDeductionsAmount > 0 ? '#B91C1C' : '#047857'}; font-weight: bold;">
              ${summary.penaltyDeductionsAmount > 0 ? `-${formatSalaryCurrency(summary.penaltyDeductionsAmount)}` : '0.00 ر.س'}
            </td>
          </tr>
          ${advanceRow}
          ${waivedRow}
        </tbody>
      </table>

      <!-- Net Box -->
      <div class="net-salary-box">
        <div>
          <div style="font-size: 12px; color: #4B5563; font-weight: bold;">صافي الراتب المستحق للصرف النهائي:</div>
          <div style="font-size: 10px; color: #6B7280; margin-top: 2px;">مُعتمد ومُحول إلى الحساب البنكي المعتمد للموظف</div>
        </div>
        <div style="font-size: 20px; font-weight: 900; color: #5E7153;">
          ${formatSalaryCurrency(summary.netSalary)}
        </div>
      </div>

      <!-- Signatures Grid -->
      <div class="signatures-grid">
        <div class="sig-box">
          <div style="font-size: 11px; font-weight: bold; color: #4B5563;">إعداد شؤون الموظفين</div>
          <div style="height: 48px; display: flex; align-items: center; justify-content: center; margin: 4px 0;">
            <span style="font-size: 10px; color: #059669; font-weight: bold;">✓ تم التدقيق والمطابقة</span>
          </div>
          <div style="font-size: 10px; color: #6B7280;">منظومة دوامي الذكية</div>
        </div>

        <div class="sig-box">
          <div style="font-size: 11px; font-weight: bold; color: #4B5563;">اعتماد الإدارة المالية / المدير</div>
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
          <div style="font-size: 11px; font-weight: bold; color: #4B5563;">توقيع واستلام الموظف</div>
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

      <div style="margin-top: 18px; text-align: center; font-size: 9px; color: #9CA3AF; border-top: 1px solid #F3F4F6; padding-top: 8px;">
        تم استخراج هذا السند رسمياً عبر نظام دوامي لإدارة الموارد البشرية والرواتب • صالح للاستخدام الرسمي
      </div>
    `;

    printHtmlDocument({
      title: `قسيمة راتب ${employee.name} - شهر ${selectedMonth}`,
      contentHtml,
      landscape: false,
    });
  };

  const handleExportPdf = async () => {
    if (!payslipCardRef.current || isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      const sanitizedName = (employee.name || 'employee').replace(/[\s/\\?%*:|"<>]/g, '_');
      const fileName = `قسيمة_راتب_${sanitizedName}_${selectedMonth}.pdf`;
      await exportElementToPdf({
        element: payslipCardRef.current,
        fileName,
        landscape: false,
      });
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-7 border border-[#E5E2D9] shadow-2xl space-y-4 text-right my-auto">
        
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E2D9]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#5E7153] text-white flex items-center justify-center font-bold shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#2D3628]">
                {isAr ? 'قسيمة الراتب والمستحقات الشهرية' : 'Monthly Salary Payslip'}
              </h3>
              <p className="text-xs text-[#65635E]">
                {isAr ? `منظومة دوامي • شهر ${selectedMonth}` : `Dawamy Platform • ${selectedMonth}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8C887B] hover:text-[#2D3628] hover:bg-[#FAF9F6] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable & Exportable Payslip Body */}
        <div
          ref={payslipCardRef}
          id="official-payslip-content"
          className="bg-white p-4 sm:p-5 rounded-xl border border-[#E5E2D9] space-y-3.5 text-right"
          style={{ backgroundColor: '#FFFFFF' }}
        >
          {/* Header in Document */}
          <div className="flex items-center justify-between pb-3 border-b border-[#5E7153]/40">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#5E7153] text-white flex items-center justify-center font-bold text-xs">
                🏢
              </div>
              <div>
                <p className="font-bold text-xs text-[#1F2937]">شركة التقنية والحلول الذكية</p>
                <p className="text-[10px] text-[#5E7153] font-semibold">إدارة الموارد البشرية والرواتب</p>
              </div>
            </div>
            <div className="text-left">
              <span className="text-[10px] font-bold bg-[#FAF9F6] px-2 py-0.5 rounded border border-[#E5E2D9] text-[#2D3628]">
                {isAr ? `شهر ${selectedMonth}` : selectedMonth}
              </span>
            </div>
          </div>

          {/* Employee Card */}
          <div className="bg-[#FAF9F6] p-3 rounded-xl border border-[#E5E2D9] flex items-center justify-between">
            <div>
              <p className="font-bold text-sm text-[#2D3628]">{summary.userName}</p>
              <p className="text-xs text-[#65635E]">{employee.title || 'موظف'}</p>
              <p className="text-[11px] text-[#8C887B]">{summary.department} • رقم البصمة: {employee.biometricEnrollId || '101'}</p>
            </div>
            <img
              src={summary.avatar}
              alt={summary.userName}
              crossOrigin="anonymous"
              className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-xs"
            />
          </div>

          {/* Breakdown Table */}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between py-1.5 border-b border-[#E5E2D9]">
              <span className="text-[#65635E]">{isAr ? 'الراتب الأساسي المعتمد:' : 'Base Salary:'}</span>
              <span className="font-bold text-[#2D3628]">{formatSalaryCurrency(summary.baseSalary)}</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-[#E5E2D9]">
              <span className="text-[#65635E]">
                {isAr
                  ? `خصم التأخير بالبصمة (${summary.excessLateHours} ساعة زائدة عن سماحية الـ ${summary.allowedGraceHours || 4}س):`
                  : `Biometric Late Deduction (${summary.excessLateHours}h excess):`}
              </span>
              <span
                className={`font-bold ${
                  summary.lateDeductionAmount > 0 ? 'text-rose-700' : 'text-emerald-700'
                }`}
              >
                {summary.lateDeductionAmount > 0
                  ? `-${formatSalaryCurrency(summary.lateDeductionAmount)}`
                  : '0.00 ر.س'}
              </span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-[#E5E2D9]">
              <span className="text-[#65635E]">{isAr ? 'خصم الجزاءات والعقوبات والغياب:' : 'Disciplinary Penalties:'}</span>
              <span
                className={`font-bold ${
                  summary.penaltyDeductionsAmount > 0 ? 'text-rose-700' : 'text-emerald-700'
                }`}
              >
                {summary.penaltyDeductionsAmount > 0
                  ? `-${formatSalaryCurrency(summary.penaltyDeductionsAmount)}`
                  : '0.00 ر.س'}
              </span>
            </div>

            {summary.advanceInstallmentsAmount > 0 && (
              <div className="flex justify-between py-1.5 border-b border-indigo-200 bg-indigo-50/70 px-2.5 rounded-lg">
                <span className="text-indigo-900 font-bold flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-indigo-700" />
                  <span>{isAr ? 'خصم قسط سلفة الراتب المستحق:' : 'Advance Loan Installment:'}</span>
                </span>
                <span className="font-bold text-indigo-900">
                  -{formatSalaryCurrency(summary.advanceInstallmentsAmount)}
                </span>
              </div>
            )}

            {summary.waivedDeductionsAmount > 0 && (
              <div className="flex justify-between py-1.5 border-b border-emerald-200 bg-emerald-50/60 px-2 rounded-lg">
                <span className="text-emerald-800 font-bold">{isAr ? 'إعفاءات وحسومات تم رفعها رسمياً:' : 'Officially Waived:'}</span>
                <span className="font-bold text-emerald-700">
                  +{formatSalaryCurrency(summary.waivedDeductionsAmount)}
                </span>
              </div>
            )}

            <div className="flex justify-between py-2.5 bg-[#5E7153]/10 px-3 rounded-xl border border-[#5E7153]/20 text-sm mt-1">
              <span className="font-bold text-[#2D3628]">{isAr ? 'صافي الراتب المستحق للصرف:' : 'Net Payable Salary:'}</span>
              <span className="font-extrabold text-[#5E7153] text-base">
                {formatSalaryCurrency(summary.netSalary)}
              </span>
            </div>
          </div>

          {/* Official Signatures Section */}
          <div className="pt-2 border-t border-[#E5E2D9] grid grid-cols-2 gap-2.5 text-right">
            {/* Approver Signature */}
            <div className="bg-[#FAF9F6] p-2 rounded-xl border border-[#E5E2D9]">
              <span className="text-[10px] text-[#65635E] font-bold block mb-1">
                {isAr ? 'اعتماد الإدارة المالية:' : 'Finance Approval:'}
              </span>
              <div className="h-10 flex items-center justify-center bg-white rounded-lg border border-dashed border-[#E5E2D9] overflow-hidden px-1.5">
                {approverSig ? (
                  <img
                    src={approverSig}
                    alt="Manager Signature"
                    crossOrigin="anonymous"
                    className="max-h-8 object-contain"
                  />
                ) : (
                  <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{isAr ? 'معتمد إلكترونياً' : 'Verified Electronically'}</span>
                  </span>
                )}
              </div>
              <p className="text-[9px] text-[#8C887B] text-center mt-1 truncate">
                {currentUser.name}
              </p>
            </div>

            {/* Employee Signature */}
            <div className="bg-[#FAF9F6] p-2 rounded-xl border border-[#E5E2D9]">
              <span className="text-[10px] text-[#65635E] font-bold block mb-1">
                {isAr ? 'توقيع واستلام الموظف:' : 'Employee Acknowledgment:'}
              </span>
              <div className="h-10 flex items-center justify-center bg-white rounded-lg border border-dashed border-[#E5E2D9] overflow-hidden px-1.5">
                {employeeSig ? (
                  <img
                    src={employeeSig}
                    alt="Employee Signature"
                    crossOrigin="anonymous"
                    className="max-h-8 object-contain"
                  />
                ) : (
                  <span className="text-[10px] text-[#8C887B] italic">
                    {isAr ? 'بانتظار توقيع الموظف' : 'Pending signature'}
                  </span>
                )}
              </div>
              <p className="text-[9px] text-[#8C887B] text-center mt-1 truncate">
                {employee.name}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Action Controls */}
        <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-[#E5E2D9]">
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="px-3.5 py-2 rounded-xl bg-white border border-[#D9E0D2] text-[#2D3628] hover:bg-[#FAF9F6] text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition disabled:opacity-50"
            title={isAr ? 'تصدير وحفظ القسيمة كملف PDF عالي الدقة' : 'Export Payslip to PDF'}
          >
            {isExportingPdf ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#5E7153]" />
            ) : (
              <Download className="w-4 h-4 text-[#5E7153]" />
            )}
            <span>{isExportingPdf ? (isAr ? 'جاري إنشاء PDF...' : 'Exporting...') : isAr ? 'تصدير PDF' : 'Export PDF'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-[#5E7153] hover:bg-[#4B5B42] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition"
          >
            <Printer className="w-4 h-4" />
            <span>{isAr ? 'طباعة القسيمة' : 'Print Payslip'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#FAF9F6] text-[#65635E] hover:bg-[#EFECE4] font-bold text-xs cursor-pointer transition"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
