import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  Calendar,
  CreditCard,
  FileText,
  AlertCircle,
  CheckCircle2,
  X,
  Plus,
  HelpCircle,
  Building2,
  Clock,
  Sparkles,
  Layers,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  UserProfile,
  SalaryAdvance,
  AdvanceInstallment,
} from '../types';
import { formatSalaryCurrency } from '../utils/payrollUtils';

interface SalaryAdvanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserProfile[];
  currentUser: UserProfile;
  onSaveAdvance: (advance: SalaryAdvance) => Promise<boolean>;
  lang: 'ar' | 'en';
}

const COMMON_REASONS_AR = [
  'سلفة طارئة لتغطية التزامات عائلية',
  'سلفة زواج وتأثيث مسكن',
  'سداد رسوم تعليمية وأقساط دراسية',
  'مصاريف ورعاية صحية وعلاجية',
  'صيانة وتجديد المركبة',
  'سداد دفعة إيجار سنوية',
];

const COMMON_REASONS_EN = [
  'Emergency family expense advance',
  'Marriage and home setup loan',
  'Tuition and educational fees',
  'Medical and healthcare expenses',
  'Vehicle maintenance and repair',
  'Annual rent payment installment',
];

export const SalaryAdvanceModal: React.FC<SalaryAdvanceModalProps> = ({
  isOpen,
  onClose,
  users,
  currentUser,
  onSaveAdvance,
  lang,
}) => {
  const isAr = lang === 'ar';

  const [selectedUserId, setSelectedUserId] = useState<string>(
    currentUser.role === 'employee' ? currentUser.id : users[0]?.id || ''
  );
  const [totalAmount, setTotalAmount] = useState<number>(6000);
  const [installmentsCount, setInstallmentsCount] = useState<number>(6);
  const [startMonth, setStartMonth] = useState<string>('2026-09');
  const [reason, setReason] = useState<string>(isAr ? COMMON_REASONS_AR[0] : COMMON_REASONS_EN[0]);
  const [notes, setNotes] = useState<string>('');
  const [guarantorName, setGuarantorName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selected User
  const selectedUser = useMemo(() => {
    return users.find((u) => u.id === selectedUserId) || users[0];
  }, [users, selectedUserId]);

  const userSalary = Number(selectedUser?.salary) || 14000;
  const salaryCurrency = selectedUser?.salaryCurrency || 'ر.س';

  // Monthly Installment calculation
  const monthlyInstallment = useMemo(() => {
    if (!installmentsCount || installmentsCount <= 0 || !totalAmount) return 0;
    return Math.round((totalAmount / installmentsCount) * 100) / 100;
  }, [totalAmount, installmentsCount]);

  // Installment impact ratio on salary
  const installmentRatio = useMemo(() => {
    if (!userSalary || userSalary <= 0) return 0;
    return Math.round((monthlyInstallment / userSalary) * 100);
  }, [monthlyInstallment, userSalary]);

  // Generate schedule of months
  const schedule = useMemo(() => {
    if (!startMonth || !installmentsCount || installmentsCount <= 0) return [];
    const [yearStr, monthStr] = startMonth.split('-');
    let year = parseInt(yearStr, 10);
    let month = parseInt(monthStr, 10);

    const items: AdvanceInstallment[] = [];
    for (let i = 1; i <= installmentsCount; i++) {
      const formattedMonth = `${year}-${String(month).padStart(2, '0')}`;
      items.push({
        id: `inst-${Date.now()}-${i}`,
        installmentNumber: i,
        month: formattedMonth,
        amount: monthlyInstallment,
        status: 'pending',
      });

      month++;
      if (month > 12) {
        month = 1;
        year++;
      }
    }
    return items;
  }, [startMonth, installmentsCount, monthlyInstallment]);

  const endMonth = schedule[schedule.length - 1]?.month || startMonth;

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totalAmount || totalAmount <= 0 || !installmentsCount || installmentsCount <= 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const advanceId = `adv-${Date.now()}`;
      const advanceNumber = `ADV-${new Date().getFullYear()}-${String(Math.floor(100 + Math.random() * 900))}`;

      const newAdvance: SalaryAdvance = {
        id: advanceId,
        advanceNumber,
        userId: selectedUser.id,
        userName: selectedUser.name,
        userNameEn: selectedUser.nameEn || selectedUser.name,
        userEmail: selectedUser.email,
        department: selectedUser.department,
        avatar: selectedUser.avatar,
        requestDate: new Date().toISOString().split('T')[0],
        totalAmount: Number(totalAmount),
        installmentsCount: Number(installmentsCount),
        monthlyInstallmentAmount: monthlyInstallment,
        startMonth,
        endMonth,
        reason: reason.trim(),
        status: 'approved', // Approved by HR/Manager directly or upon entry
        approvedBy: currentUser.name,
        approvedAt: new Date().toISOString(),
        paidAmount: 0,
        remainingAmount: Number(totalAmount),
        paidInstallmentsCount: 0,
        installments: schedule,
        guarantorName: guarantorName.trim() || undefined,
        employeeSignature: selectedUser.signatureDataUrl || undefined,
        approverSignature: currentUser.signatureDataUrl || undefined,
        notes: notes.trim() || undefined,
        createdAt: new Date().toISOString(),
      };

      await onSaveAdvance(newAdvance);
      onClose();
    } catch (err) {
      console.error('Error saving advance:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-7 border border-[#E5E2D9] shadow-2xl space-y-5 text-right my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#E5E2D9]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#5E7153]/15 text-[#5E7153] flex items-center justify-center font-bold">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#2D3628]">
                {isAr ? 'طلب وإصدار سلفة على الراتب مع التقسيط الشهري' : 'Issue Salary Advance & Installment Plan'}
              </h3>
              <p className="text-xs text-[#65635E]">
                {isAr
                  ? 'تُقسط السلفة تلقائياً على الشهور وتُحسم مباشرة من مسير الراتب الشهري وقسيمة الراتب'
                  : 'Installments are automatically calculated and deducted monthly from employee payslips'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8C887B] hover:text-[#2D3628] hover:bg-[#FAF9F6] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Employee Selection & Salary Info */}
          <div>
            <label className="block text-xs font-bold text-[#2D3628] mb-1">
              {isAr ? 'الموظف المستفيد من السلفة:' : 'Beneficiary Employee:'}
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              disabled={currentUser.role === 'employee'}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E2D9] bg-white text-[#2D3628] text-sm focus:outline-none focus:ring-2 focus:ring-[#5E7153]"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} — {u.title} ({formatSalaryCurrency(u.salary || 14000)})
                </option>
              ))}
            </select>
          </div>

          {/* Salary Context Card */}
          <div className="bg-[#FAF9F6] p-3.5 rounded-xl border border-[#E5E2D9] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={selectedUser.avatar}
                alt={selectedUser.name}
                className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
              />
              <div>
                <p className="font-bold text-xs text-[#2D3628]">{selectedUser.name}</p>
                <p className="text-[11px] text-[#65635E]">{selectedUser.department}</p>
              </div>
            </div>
            <div className="text-left">
              <p className="text-[11px] text-[#8C887B]">{isAr ? 'الراتب الأساسي الشهري:' : 'Base Salary:'}</p>
              <p className="text-sm font-extrabold text-[#5E7153]">{formatSalaryCurrency(userSalary)}</p>
            </div>
          </div>

          {/* Amount and Installments Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Total Amount */}
            <div>
              <label className="block text-xs font-bold text-[#2D3628] mb-1">
                {isAr ? 'إجمالي مبلغ السلفة المطلوبة (ر.س):' : 'Total Advance Amount (SAR):'}
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="500"
                  max="50000"
                  step="100"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(Number(e.target.value))}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E2D9] bg-white text-[#2D3628] text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#5E7153]"
                  placeholder="6000"
                />
                <span className="absolute left-3.5 top-2.5 text-xs text-[#8C887B] font-bold">
                  {salaryCurrency}
                </span>
              </div>
              {/* Quick presets */}
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                {[3000, 6000, 9000, 12000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setTotalAmount(amt)}
                    className={`text-[10px] px-2 py-0.5 rounded-md border font-medium transition ${
                      totalAmount === amt
                        ? 'bg-[#5E7153] text-white border-[#5E7153]'
                        : 'bg-white text-[#65635E] border-[#E5E2D9] hover:bg-[#FAF9F6]'
                    }`}
                  >
                    {amt.toLocaleString()} ر.س
                  </button>
                ))}
              </div>
            </div>

            {/* Installments Count (Months) */}
            <div>
              <label className="block text-xs font-bold text-[#2D3628] mb-1">
                {isAr ? 'عدد أشهر التقسيط (مدة السداد):' : 'Number of Installments (Months):'}
              </label>
              <div className="relative">
                <select
                  value={installmentsCount}
                  onChange={(e) => setInstallmentsCount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E2D9] bg-white text-[#2D3628] text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#5E7153]"
                >
                  <option value={2}>{isAr ? 'شهرين (2 قسط)' : '2 Months'}</option>
                  <option value={3}>{isAr ? '3 أشهر (3 أقساط)' : '3 Months'}</option>
                  <option value={4}>{isAr ? '4 أشهر (4 أقساط)' : '4 Months'}</option>
                  <option value={6}>{isAr ? '6 أشهر (نصف سنة)' : '6 Months'}</option>
                  <option value={8}>{isAr ? '8 أشهر (8 أقساط)' : '8 Months'}</option>
                  <option value={10}>{isAr ? '10 أشهر (10 أقساط)' : '10 Months'}</option>
                  <option value={12}>{isAr ? '12 شهراً (سنة كاملة)' : '12 Months'}</option>
                </select>
              </div>

              {/* Start Month */}
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-[#65635E] font-medium">{isAr ? 'بدء الخصم من شهر:' : 'Start Deduction:'}</span>
                <input
                  type="month"
                  value={startMonth}
                  onChange={(e) => setStartMonth(e.target.value)}
                  className="px-2 py-1 rounded-lg border border-[#E5E2D9] text-xs font-bold bg-white text-[#2D3628]"
                />
              </div>
            </div>

          </div>

          {/* Real-time Calculation Summary Box */}
          <div className="bg-[#E9EDD9]/60 p-4 rounded-xl border border-[#D9E0D2] space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#2D3628]">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#5E7153]" />
                {isAr ? 'ملخص الاستقطاع الشهري المجدول:' : 'Scheduled Monthly Deduction Summary:'}
              </span>
              <span className="text-[#5E7153]">
                {startMonth} {isAr ? 'إلى' : 'to'} {endMonth}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="bg-white p-2.5 rounded-lg border border-[#D9E0D2]">
                <p className="text-[10px] text-[#65635E]">{isAr ? 'القسط الشهري المستقطع' : 'Monthly Installment'}</p>
                <p className="text-sm font-extrabold text-[#5E7153]">
                  {formatSalaryCurrency(monthlyInstallment)}
                </p>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-[#D9E0D2]">
                <p className="text-[10px] text-[#65635E]">{isAr ? 'نسبة الاستقطاع من الراتب' : 'Deduction % of Salary'}</p>
                <p
                  className={`text-sm font-extrabold ${
                    installmentRatio > 33 ? 'text-amber-700' : 'text-emerald-700'
                  }`}
                >
                  {installmentRatio}% {installmentRatio > 33 && (isAr ? '(!)' : '')}
                </p>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-[#D9E0D2]">
                <p className="text-[10px] text-[#65635E]">{isAr ? 'الراتب المتبقي بعد القسط' : 'Est. Net Remainder'}</p>
                <p className="text-sm font-extrabold text-[#2D3628]">
                  {formatSalaryCurrency(Math.max(0, userSalary - monthlyInstallment))}
                </p>
              </div>
            </div>

            {installmentRatio > 33 && (
              <p className="text-[11px] text-amber-800 flex items-center gap-1 pt-1">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                <span>
                  {isAr
                    ? 'تنبيه: يتجاوز القسط الشهري نسبة ثلث الراتب (33%). تأكد من موافقة الموظف المسبقة.'
                    : 'Note: Monthly installment exceeds 33% of base salary.'}
                </span>
              </p>
            )}
          </div>

          {/* Reason / Purpose */}
          <div>
            <label className="block text-xs font-bold text-[#2D3628] mb-1">
              {isAr ? 'سبب وغرض السلفة:' : 'Advance Purpose:'}
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E2D9] bg-white text-[#2D3628] text-xs focus:outline-none focus:ring-2 focus:ring-[#5E7153]"
              placeholder={isAr ? 'أدخل سبب السلفة' : 'Enter advance reason'}
            />
            {/* Quick Reason tags */}
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {(isAr ? COMMON_REASONS_AR : COMMON_REASONS_EN).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-[#FAF9F6] border border-[#E5E2D9] text-[#65635E] hover:bg-[#EFECE4] transition"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Installment Schedule Preview (Expandable) */}
          <div className="border border-[#E5E2D9] rounded-xl p-3 bg-[#FAF9F6] space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#2D3628]">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#5E7153]" />
                {isAr ? `جدول استحقاق الأقساط (${schedule.length} أشهر):` : `Installment Schedule (${schedule.length} months):`}
              </span>
              <span className="text-[11px] text-[#8C887B]">
                {isAr ? 'يخصم آلياً بنهاية كل شهر ميلادي' : 'Deducted end of each month'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto p-1">
              {schedule.map((inst) => (
                <div
                  key={inst.id}
                  className="bg-white p-2 rounded-lg border border-[#E5E2D9] text-right flex items-center justify-between text-[11px]"
                >
                  <div>
                    <span className="font-bold text-[#2D3628]">
                      {isAr ? `قسط ${inst.installmentNumber}` : `Inst. ${inst.installmentNumber}`}
                    </span>
                    <p className="text-[10px] text-[#8C887B]">{inst.month}</p>
                  </div>
                  <span className="font-bold text-[#5E7153]">{inst.amount.toLocaleString()} ر.س</span>
                </div>
              ))}
            </div>
          </div>

          {/* Digital Signature Confirmation Note */}
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold">
                {isAr ? 'التوثيق الرقمي والاعتماد الفوري:' : 'Digital Authorization & Stamping:'}
              </p>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                {isAr
                  ? `سيتم اعتماد السلفة باسم (${currentUser.name}) وتوثيقها بجدول الأقساط. ستظهر في قسيمة الراتب الشهرية وبإمكانك طباعة سند الصرف مع التوقيع الإلكتروني.`
                  : `Advance will be authorized and attached to monthly payslips with the digital signature.`}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E5E2D9]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#FAF9F6] hover:bg-[#EFECE4] text-[#65635E] font-bold text-xs transition"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-[#5E7153] hover:bg-[#4B5B42] text-white font-bold text-xs flex items-center gap-1.5 shadow-md disabled:opacity-50 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? (isAr ? 'جاري الاعتماد...' : 'Authorizing...')
                  : isAr
                  ? 'اعتماد السلفة وجدولة الأقساط'
                  : 'Authorize & Schedule Advance'}
              </span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
