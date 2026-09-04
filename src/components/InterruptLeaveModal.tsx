import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  Calendar,
  RotateCcw,
  CheckCircle2,
  Clock,
  User,
  Building,
  Palmtree,
  Stethoscope,
  Laptop,
  Briefcase,
  Sparkles,
} from 'lucide-react';
import { LeaveOrWfhRequest, UserProfile } from '../types';

interface InterruptLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: LeaveOrWfhRequest | null;
  currentUser: UserProfile;
  onConfirmInterrupt: (
    requestId: string,
    effectiveReturnDate: string,
    reason: string,
    refundedDays: number,
    actualUsedDays: number
  ) => void;
  lang: 'ar' | 'en';
}

export const InterruptLeaveModal: React.FC<InterruptLeaveModalProps> = ({
  isOpen,
  onClose,
  request,
  currentUser,
  onConfirmInterrupt,
  lang,
}) => {
  if (!isOpen || !request) return null;

  const isAr = lang === 'ar';
  const todayStr = new Date().toISOString().split('T')[0];

  // Default effective return date: today if within range, else clamped to startDate or endDate
  const getInitialReturnDate = () => {
    if (!request) return todayStr;
    if (todayStr >= request.startDate && todayStr <= request.endDate) {
      return todayStr;
    }
    return request.startDate;
  };

  const [effectiveReturnDate, setEffectiveReturnDate] = useState<string>(getInitialReturnDate());
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Quick preset reasons
  const presetReasons = isAr
    ? [
        'حاجة عمل طارئة ومباشرة تسليمات حرجة للشركة',
        'استدعاء إداري لتغطية نقص تشغيلي مفاجئ',
        'طلب الموظف قطع ما تبقى من الإجازة والعودة للعمل',
        'متطلبات تدقيق ومراجعة مشاريع عاجلة من الإدارة العليا',
      ]
    : [
        'Urgent operational business necessity requiring immediate recall',
        'Emergency staffing shortage requiring staff recall',
        'Employee requested early return with management approval',
        'Critical project deliverables and executive milestone audit',
      ];

  // Calculate actual days used and days to refund
  const calculateDays = () => {
    if (!request) return { used: 0, refund: 0 };
    const start = new Date(request.startDate);
    const end = new Date(request.endDate);
    const returnDate = new Date(effectiveReturnDate);

    // If returning on or before start date, 0 days used, all refunded
    if (returnDate <= start) {
      return { used: 0, refund: request.totalDays };
    }

    // Days used = days between start and returnDate (employee works on returnDate)
    const diffTime = returnDate.getTime() - start.getTime();
    const usedDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    const actualUsed = Math.min(usedDays, request.totalDays);
    const refundDays = Math.max(0, request.totalDays - actualUsed);

    return { used: actualUsed, refund: refundDays };
  };

  const { used: actualUsedDays, refund: refundedDays } = calculateDays();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!reason.trim()) {
      setError(isAr ? 'يرجى كتابة سبب استدعاء الموظف وقطع الإجازة' : 'Please provide the recall reason');
      return;
    }

    if (effectiveReturnDate < request.startDate || effectiveReturnDate > request.endDate) {
      setError(
        isAr
          ? 'يجب أن يكون تاريخ المباشرة بين تاريخ بداية ونهاية الإجازة'
          : 'Return date must be between the leave start and end dates'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      onConfirmInterrupt(request.id, effectiveReturnDate, reason.trim(), refundedDays, actualUsedDays);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const getLeaveTypeLabel = (type: string) => {
    switch (type) {
      case 'annual_leave':
        return isAr ? 'إجازة سنوية' : 'Annual Leave';
      case 'sick_leave':
        return isAr ? 'إجازة مرضية' : 'Sick Leave';
      case 'emergency_leave':
        return isAr ? 'إجازة اضطرارية' : 'Emergency Leave';
      default:
        return isAr ? 'إجازة رسمية' : 'Leave';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2D3628]/60 backdrop-blur-sm overflow-y-auto">
      <div
        id="interrupt-leave-modal"
        className="relative w-full max-w-xl bg-white border border-[#E5E2D9] rounded-3xl shadow-2xl p-6 sm:p-7 text-[#43423E] animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[#E5E2D9]">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-[#FFF1F2] text-[#E11D48] border border-[#FFE4E6]">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#2D3628]">
                {isAr ? 'قطع الإجازة واستدعاء الموظف (إجراء إداري)' : 'Recall Employee / Interrupt Leave'}
              </h3>
              <p className="text-xs text-[#65635E] mt-0.5">
                {isAr
                  ? 'صلاحية خاصة بمدير النظام والموارد البشرية لحالات العمل الطارئة واسترجاع الرصيد'
                  : 'Authorized HR & Management action for emergency recalls and leave balance restoration'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-[#FAF9F6] hover:bg-[#EFECE4] text-[#65635E] hover:text-[#2D3628] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mt-4 p-3 rounded-xl bg-[#FDF0EE] border border-[#F5C4BE] text-[#9E3B30] text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Target Request Info Card */}
        <div className="mt-5 p-4 rounded-2xl bg-[#FAF9F6] border border-[#E5E2D9] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img
                src={request.avatar}
                alt={request.userName}
                className="w-9 h-9 rounded-xl object-cover border border-[#D9E0D2]"
              />
              <div>
                <h4 className="text-xs font-bold text-[#2D3628]">{request.userName}</h4>
                <p className="text-[11px] text-[#65635E]">{request.userTitle} • {request.department}</p>
              </div>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#E9EDD9] text-[#2D3628] border border-[#D9E0D2]">
              {getLeaveTypeLabel(request.type)}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#E5E2D9]/70 text-center text-xs">
            <div className="bg-white p-2 rounded-xl border border-[#E5E2D9]">
              <span className="text-[10px] text-[#65635E] block">{isAr ? 'البداية الأصلية' : 'Start Date'}</span>
              <span className="font-bold text-[#2D3628]">{request.startDate}</span>
            </div>
            <div className="bg-white p-2 rounded-xl border border-[#E5E2D9]">
              <span className="text-[10px] text-[#65635E] block">{isAr ? 'النهاية الأصلية' : 'End Date'}</span>
              <span className="font-bold text-[#2D3628]">{request.endDate}</span>
            </div>
            <div className="bg-white p-2 rounded-xl border border-[#E5E2D9]">
              <span className="text-[10px] text-[#65635E] block">{isAr ? 'المدة الأصلية' : 'Original Days'}</span>
              <span className="font-bold text-[#2D3628]">{request.totalDays} {isAr ? 'أيام' : 'days'}</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Effective Return Date */}
          <div>
            <label className="block text-xs font-bold text-[#2D3628] mb-1.5">
              {isAr ? 'تاريخ قطع الإجازة والمباشرة الفعلية بالعمل:' : 'Effective Return to Work Date:'}
            </label>
            <div className="relative">
              <input
                type="date"
                id="input-interrupt-effective-date"
                value={effectiveReturnDate}
                min={request.startDate}
                max={request.endDate}
                onChange={(e) => setEffectiveReturnDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl text-xs sm:text-sm text-[#2D3628] font-semibold focus:outline-none focus:border-[#5E7153]"
                required
              />
            </div>
            <p className="text-[11px] text-[#65635E] mt-1">
              {isAr
                ? 'هو اليوم الذي سيباشر فيه الموظف عمله، وبالتالي تنتهي إجازته قبل هذا التاريخ بيوم.'
                : 'The day the employee will resume active duty; leave terminates immediately before this date.'}
            </p>
          </div>

          {/* Dynamic Balance Impact Box */}
          <div className="p-3.5 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#1E40AF]">
              <span className="flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4" />
                {isAr ? 'الأثر التلقائي على رصيد الإجازات:' : 'Automated Leave Balance Adjustment:'}
              </span>
              <span className="bg-white px-2 py-0.5 rounded-md border border-[#BFDBFE]">
                {isAr ? 'حساب نظام فوري' : 'Real-time calculation'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="bg-white/80 p-2 rounded-xl border border-[#BFDBFE]">
                <span className="text-[10px] text-[#4B5563] block">{isAr ? 'الأيام المستهلكة الفعلية' : 'Actual Days Used'}</span>
                <span className="font-bold text-[#1F2937] text-sm">{actualUsedDays} {isAr ? 'يوم' : 'days'}</span>
              </div>
              <div className="bg-white/80 p-2 rounded-xl border border-[#BFDBFE]">
                <span className="text-[10px] text-[#059669] block font-semibold">
                  {isAr ? 'الأيام المسترجعة لرصيد الموظف' : 'Days Restored to Balance'}
                </span>
                <span className="font-black text-[#059669] text-base">+{refundedDays} {isAr ? 'يوم' : 'days'}</span>
              </div>
            </div>
            <p className="text-[11px] text-[#1E40AF]/90 leading-relaxed">
              {isAr
                ? `سيتم إعادة (+${refundedDays}) أيام إلى رصيد الموظف تلقائياً وتحديث حالته إلى "في العمل" فور المباشرة.`
                : `(+${refundedDays}) days will be refunded back to the employee's balance immediately.`}
            </p>
          </div>

          {/* Recall Reason & Presets */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[#2D3628]">
                {isAr ? 'سبب الاستدعاء وقطع الإجازة (إلزامي):' : 'Recall / Interruption Reason (Required):'}
              </label>
              <span className="text-[10px] text-[#65635E]">
                {isAr ? 'سيظهر في سجل الموظف وإشعاره' : 'Logged & notified to employee'}
              </span>
            </div>

            {/* Quick chips */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {presetReasons.map((preset, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setReason(preset)}
                  className="text-[10px] px-2 py-1 rounded-lg bg-[#EFECE4] hover:bg-[#E5E2D9] text-[#2D3628] font-medium border border-[#E5E2D9] transition text-right cursor-pointer"
                >
                  {preset}
                </button>
              ))}
            </div>

            <textarea
              id="input-interrupt-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                isAr
                  ? 'اكتب تفاصيل سبب الاستدعاء الطارئ وتوجيهات المباشرة...'
                  : 'Specify reason for emergency recall and return instructions...'
              }
              className="w-full px-3.5 py-2.5 bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl text-xs sm:text-sm text-[#2D3628] focus:outline-none focus:border-[#5E7153]"
              required
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E5E2D9]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[#E5E2D9] text-xs font-semibold text-[#65635E] hover:bg-[#FAF9F6] transition cursor-pointer"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              id="btn-confirm-interrupt-leave"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? (isAr ? 'جاري المعالجة...' : 'Processing...')
                  : (isAr ? 'تأكيد قطع الإجازة واسترجاع الرصيد' : 'Confirm Recall & Refund')}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
