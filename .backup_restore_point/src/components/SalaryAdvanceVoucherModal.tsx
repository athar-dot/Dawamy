import React, { useRef, useState } from 'react';
import {
  Building2,
  Printer,
  Download,
  X,
  CheckCircle2,
  ShieldCheck,
  Calendar,
  DollarSign,
  FileText,
  UserCheck,
  Loader2,
} from 'lucide-react';
import { SalaryAdvance, UserProfile } from '../types';
import { formatSalaryCurrency } from '../utils/payrollUtils';
import { printHtmlDocument, exportElementToPdf } from '../utils/printUtils';

interface SalaryAdvanceVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  advance: SalaryAdvance;
  employee: UserProfile;
  currentUser: UserProfile;
  lang: 'ar' | 'en';
}

export const SalaryAdvanceVoucherModal: React.FC<SalaryAdvanceVoucherModalProps> = ({
  isOpen,
  onClose,
  advance,
  employee,
  currentUser,
  lang,
}) => {
  const isAr = lang === 'ar';
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const voucherRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !advance) return null;

  const [companyName, setCompanyName] = useState('شركة دوامي للتقنية');
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  const [commercialRegNo, setCommercialRegNo] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [companyAddress, setCompanyAddress] = useState('المملكة العربية السعودية • الرياض');

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('dawamy_company_schedule');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.companyName) setCompanyName(parsed.companyName);
        if (parsed.logoUrl) setLogoUrl(parsed.logoUrl);
        if (parsed.commercialRegNo) setCommercialRegNo(parsed.commercialRegNo);
        if (parsed.taxNumber) setTaxNumber(parsed.taxNumber);
        if (parsed.companyAddress) setCompanyAddress(parsed.companyAddress);
      }
    } catch (e) {
      console.warn(e);
    }
  }, []);

  const handlePrint = () => {
    const el = voucherRef.current || document.getElementById('salary-advance-printable-voucher');
    if (el) {
      printHtmlDocument({
        title: `سند صرف سلفة ${advance.userName} - ${advance.advanceNumber}`,
        contentHtml: el.innerHTML,
        landscape: false,
      });
    } else {
      window.print();
    }
  };

  const handleExportPdf = async () => {
    if (!voucherRef.current || isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      const sanitizedName = (advance.userName || 'employee').replace(/[\s/\\?%*:|"<>]/g, '_');
      await exportElementToPdf({
        element: voucherRef.current,
        fileName: `سند_سلفة_${sanitizedName}_${advance.advanceNumber}.pdf`,
        landscape: false,
      });
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Determine signatures to show
  const employeeSig = advance.employeeSignature || employee?.signatureDataUrl;
  const approverSig = advance.approverSignature || currentUser?.signatureDataUrl;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-7 border border-[#E5E2D9] shadow-2xl space-y-5 text-right my-auto">
        
        {/* Modal Top Actions (Hidden in Print) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E5E2D9] print:hidden">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-[#5E7153]/15 text-[#5E7153] font-bold text-xs">
              {advance.advanceNumber}
            </span>
            <span className="text-xs text-[#65635E]">
              {isAr ? 'معاينة سند الصرف والإقرار المالي' : 'Advance Voucher Preview'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="px-3.5 py-1.5 rounded-xl bg-white border border-[#D9E0D2] text-[#2D3628] hover:bg-[#FAF9F6] text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition disabled:opacity-50"
              title={isAr ? 'حفظ السند كملف PDF' : 'Save as PDF'}
            >
              {isExportingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#5E7153]" />
              ) : (
                <Download className="w-4 h-4 text-[#5E7153]" />
              )}
              <span>{isExportingPdf ? (isAr ? 'جاري الإنشاء...' : 'Exporting...') : isAr ? 'تصدير PDF' : 'Export PDF'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-[#5E7153] hover:bg-[#4B5B42] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition"
            >
              <Printer className="w-4 h-4" />
              <span>{isAr ? 'طباعة السند' : 'Print Voucher'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-[#8C887B] hover:text-[#2D3628] hover:bg-[#FAF9F6] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Official Document Container */}
        <div
          ref={voucherRef}
          id="salary-advance-printable-voucher"
          className="space-y-6 bg-white p-3 rounded-xl border border-[#E5E2D9]"
          style={{ backgroundColor: '#FFFFFF' }}
        >
          
          {/* Document Official Header */}
          <div className="flex items-start justify-between border-b-2 border-[#5E7153] pb-4">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Company Logo"
                  className="w-12 h-12 object-contain rounded-xl border border-[#E5E2D9] bg-white p-1"
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-[#5E7153] text-white flex items-center justify-center font-bold shadow-sm">
                  <Building2 className="w-7 h-7" />
                </div>
              )}
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-[#2D3628]">
                  {companyName}
                </h2>
                <div className="flex items-center gap-2 text-[10px] text-[#65635E] mt-0.5">
                  {commercialRegNo && <span>{isAr ? 'س.ت:' : 'C.R:'} {commercialRegNo}</span>}
                  {taxNumber && <span>{isAr ? 'ر.ض:' : 'Tax:'} {taxNumber}</span>}
                </div>
                <p className="text-[10px] text-[#8C887B] mt-0.5">
                  {companyAddress}
                </p>
              </div>
            </div>

            <div className="text-left">
              <div className="inline-block bg-[#FAF9F6] px-3 py-1.5 rounded-lg border border-[#E5E2D9]">
                <p className="text-[10px] text-[#8C887B]">{isAr ? 'رقم السند المالي:' : 'Voucher No:'}</p>
                <p className="text-xs font-mono font-bold text-[#2D3628]">{advance.advanceNumber}</p>
              </div>
              <p className="text-[10px] text-[#65635E] mt-1">
                {isAr ? 'تاريخ التحرير: ' : 'Date: '}
                <span className="font-bold text-[#2D3628]">{advance.requestDate}</span>
              </p>
            </div>
          </div>

          {/* Title Banner */}
          <div className="text-center py-2 bg-[#FAF9F6] rounded-xl border border-[#E5E2D9]">
            <h1 className="text-base sm:text-lg font-black text-[#2D3628] tracking-wide">
              {isAr ? 'سند صرف وإقرار استقطاع سلفة على الراتب' : 'Salary Advance & Promissory Note Voucher'}
            </h1>
            <p className="text-xs text-[#5E7153] font-medium">
              {isAr
                ? `وفقاً للائحة تنظيم العمل ومسير الرواتب المعتمد (${advance.installmentsCount} أقساط شهرية)`
                : `Authorized under corporate payroll policy (${advance.installmentsCount} installments)`}
            </p>
          </div>

          {/* Employee & Advance Information Table */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            
            <div className="bg-[#FAF9F6] p-3 rounded-xl border border-[#E5E2D9] space-y-1.5">
              <p className="font-bold text-[#5E7153] border-b pb-1 mb-1">
                {isAr ? 'بيانات الموظف المستفيد:' : 'Employee Information:'}
              </p>
              <div className="flex justify-between">
                <span className="text-[#65635E]">{isAr ? 'الاسم:' : 'Name:'}</span>
                <span className="font-bold text-[#2D3628]">{advance.userName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#65635E]">{isAr ? 'المسمى الوظيفي:' : 'Job Title:'}</span>
                <span className="font-medium text-[#2D3628]">{employee?.title || 'أخصائي'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#65635E]">{isAr ? 'القسم:' : 'Department:'}</span>
                <span className="font-medium text-[#2D3628]">{advance.department}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#65635E]">{isAr ? 'الراتب الأساسي:' : 'Base Salary:'}</span>
                <span className="font-bold text-[#5E7153]">{formatSalaryCurrency(employee?.salary || 14000)}</span>
              </div>
            </div>

            <div className="bg-[#FAF9F6] p-3 rounded-xl border border-[#E5E2D9] space-y-1.5">
              <p className="font-bold text-[#5E7153] border-b pb-1 mb-1">
                {isAr ? 'تفاصيل السلفة المالية:' : 'Advance Financial Details:'}
              </p>
              <div className="flex justify-between">
                <span className="text-[#65635E]">{isAr ? 'إجمالي مبلغ السلفة:' : 'Total Amount:'}</span>
                <span className="font-extrabold text-[#2D3628] text-sm">
                  {formatSalaryCurrency(advance.totalAmount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#65635E]">{isAr ? 'مدة التقسيط:' : 'Tenure:'}</span>
                <span className="font-bold text-[#2D3628]">
                  {advance.installmentsCount} {isAr ? 'أشهر' : 'Months'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#65635E]">{isAr ? 'القسط الشهري المستقطع:' : 'Monthly Installment:'}</span>
                <span className="font-extrabold text-rose-700">
                  {formatSalaryCurrency(advance.monthlyInstallmentAmount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#65635E]">{isAr ? 'فترة الاستقطاع:' : 'Deduction Period:'}</span>
                <span className="font-medium text-[#2D3628]">
                  {advance.startMonth} {isAr ? 'إلى' : 'to'} {advance.endMonth}
                </span>
              </div>
            </div>

          </div>

          {/* Legal Promissory & Acknowledgment Text */}
          <div className="p-3.5 rounded-xl border border-[#E5E2D9] bg-[#FCFBF9] text-xs text-[#2D3628] leading-relaxed space-y-1">
            <p className="font-bold text-[#5E7153]">{isAr ? 'إقرار وتفويض الموظف:' : 'Employee Acknowledgment:'}</p>
            <p>
              {isAr
                ? `أقر أنا الموظف (${advance.userName}) بصحة استلامي لمبلغ السلفة البالغ قدره (${advance.totalAmount.toLocaleString()} ر.س) لغرض (${advance.reason})، وأفوض بموجبه إدارة الشركة ومسير الرواتب باستقطاع القسط الشهري المحدد وقدره (${advance.monthlyInstallmentAmount.toLocaleString()} ر.س) من مسير راتبي الشهري بصفة دورية بدءاً من شهر (${advance.startMonth}) وحتى اكتمال سداد كامل المبلغ.`
                : `I, the undersigned employee (${advance.userName}), acknowledge receiving the advance amount of (${advance.totalAmount} SAR) and authorize monthly deductions of (${advance.monthlyInstallmentAmount} SAR) from my salary until full settlement.`}
            </p>
          </div>

          {/* Installments Table */}
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-[#2D3628]">{isAr ? 'جدول استحقاق الأقساط الشهرية:' : 'Installment Schedule:'}</p>
            <div className="overflow-x-auto border border-[#E5E2D9] rounded-xl">
              <table className="w-full text-xs text-right">
                <thead className="bg-[#FAF9F6] text-[#65635E] border-b border-[#E5E2D9]">
                  <tr>
                    <th className="py-2 px-3 font-bold">{isAr ? 'القسط' : 'Inst.'}</th>
                    <th className="py-2 px-3 font-bold">{isAr ? 'شهر الاستحقاق' : 'Month'}</th>
                    <th className="py-2 px-3 font-bold">{isAr ? 'مبلغ القسط' : 'Amount'}</th>
                    <th className="py-2 px-3 font-bold">{isAr ? 'طريقة السداد' : 'Method'}</th>
                    <th className="py-2 px-3 font-bold">{isAr ? 'الحالة' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E2D9]">
                  {advance.installments.map((inst) => (
                    <tr key={inst.id} className="hover:bg-[#FAF9F6]">
                      <td className="py-1.5 px-3 font-bold text-[#2D3628]">#{inst.installmentNumber}</td>
                      <td className="py-1.5 px-3 font-mono text-[#65635E]">{inst.month}</td>
                      <td className="py-1.5 px-3 font-bold text-[#2D3628]">{formatSalaryCurrency(inst.amount)}</td>
                      <td className="py-1.5 px-3 text-[#65635E]">{isAr ? 'خصم من مسير الراتب' : 'Payroll Deduction'}</td>
                      <td className="py-1.5 px-3">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            inst.status === 'deducted' || inst.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-50 text-amber-800'
                          }`}
                        >
                          {inst.status === 'deducted' || inst.status === 'paid'
                            ? (isAr ? 'تم الاستقطاع' : 'Deducted')
                            : (isAr ? 'مجدول للصرف' : 'Scheduled')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Official Signatures Block with Real User Digital Signatures */}
          <div className="pt-4 border-t-2 border-[#E5E2D9] grid grid-cols-2 gap-6 text-xs">
            
            {/* Approver / HR Signature */}
            <div className="bg-[#FAF9F6] p-4 rounded-xl border border-[#E5E2D9] space-y-2 text-center">
              <p className="font-bold text-[#5E7153]">
                {isAr ? 'اعتماد الموارد البشرية والمالية' : 'HR & Finance Approval'}
              </p>
              <div className="h-16 flex items-center justify-center border-b border-dashed border-[#5E7153]/40">
                {approverSig ? (
                  <img
                    src={approverSig}
                    alt="Approver Signature"
                    className="max-h-14 max-w-full object-contain"
                  />
                ) : (
                  <div className="text-[11px] font-serif italic text-[#5E7153] font-bold">
                    {currentUser?.signatureJobTitle || (isAr ? 'معتمد رسمياً' : 'Authorized')}
                  </div>
                )}
              </div>
              <div>
                <p className="font-bold text-[#2D3628]">{advance.approvedBy || currentUser.name}</p>
                <p className="text-[10px] text-[#8C887B]">
                  {isAr ? 'مصادقة رقمية مشفرة • نظام دوامي' : 'Encrypted Digital Sign-off'}
                </p>
              </div>
            </div>

            {/* Employee Signature */}
            <div className="bg-[#FAF9F6] p-4 rounded-xl border border-[#E5E2D9] space-y-2 text-center">
              <p className="font-bold text-[#2D3628]">
                {isAr ? 'توقيع وإقرار الموظف المستلم' : 'Employee Signature'}
              </p>
              <div className="h-16 flex items-center justify-center border-b border-dashed border-[#5E7153]/40">
                {employeeSig ? (
                  <img
                    src={employeeSig}
                    alt="Employee Signature"
                    className="max-h-14 max-w-full object-contain"
                  />
                ) : (
                  <div className="text-[11px] font-serif italic text-[#2D3628] font-bold">
                    {advance.userName}
                  </div>
                )}
              </div>
              <div>
                <p className="font-bold text-[#2D3628]">{advance.userName}</p>
                <p className="text-[10px] text-[#8C887B]">
                  {isAr ? 'توقيع إلكتروني ساري المفعول' : 'Valid Electronic Signature'}
                </p>
              </div>
            </div>

          </div>

          {/* Document Footer */}
          <div className="text-center pt-2 text-[10px] text-[#8C887B] border-t border-[#E5E2D9]">
            {isAr
              ? 'وثيقة رسمية صادرة من منظومة دوامي لإدارة الموارد البشرية • صالحة بدون كشط أو تعديل'
              : 'Official voucher generated via Dawamy HR Platform • Valid and legally binding'}
          </div>

        </div>

        {/* Modal Bottom Actions (Hidden in Print) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#E5E2D9] print:hidden">
          <div className="text-xs text-[#8C887B]">
            {isAr ? 'سند معتمد بالبصمات والتواقيع الرقمية' : 'Digitally Signed Voucher'}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#EFECE4] hover:bg-[#E5E2D9] text-[#2D3628] font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <X className="w-4 h-4 text-[#8C887B]" />
              <span>{isAr ? 'إغلاق ومغادرة' : 'Close'}</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-[#5E7153] hover:bg-[#4B5B42] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition"
            >
              <Printer className="w-4 h-4" />
              <span>{isAr ? 'طباعة السند' : 'Print Voucher'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
