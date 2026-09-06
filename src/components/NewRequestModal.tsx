import React, { useState, useMemo } from 'react';
import {
  X,
  Sparkles,
  Calendar,
  Laptop,
  Palmtree,
  Stethoscope,
  AlertCircle,
  Clock,
  UserCheck,
  CheckCircle2,
  Loader2,
  Send,
  Wand2,
  ShieldAlert,
  AlertTriangle,
  FileText,
  Info,
} from 'lucide-react';
import { UserProfile, RequestType, LeaveOrWfhRequest } from '../types';
import { api } from '../services/api';

interface NewRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  teamMembers: { id: string; name: string; role: string }[];
  existingRequests?: LeaveOrWfhRequest[];
  onSubmitRequest: (request: Omit<LeaveOrWfhRequest, 'id' | 'createdAt' | 'status'>) => void;
  lang: 'ar' | 'en';
}

export const NewRequestModal: React.FC<NewRequestModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  teamMembers,
  existingRequests = [],
  onSubmitRequest,
  lang,
}) => {
  if (!isOpen) return null;

  const isAr = lang === 'ar';
  const todayStr = new Date().toISOString().split('T')[0];

  const [type, setType] = useState<RequestType>('remote');
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [reason, setReason] = useState('');
  const [isAiReason, setIsAiReason] = useState(false);
  const [handoverColleague, setHandoverColleague] = useState(teamMembers[0]?.name || '');
  const [handoverPlan, setHandoverPlan] = useState('');
  const [medicalReportNumber, setMedicalReportNumber] = useState('');
  const [medicalFileName, setMedicalFileName] = useState('');
  const [halfDayShift, setHalfDayShift] = useState<'morning' | 'afternoon'>('morning');

  // AI Generator state
  const [aiKeywords, setAiKeywords] = useState('');
  const [aiTone, setAiTone] = useState<'formal' | 'concise' | 'urgent'>('formal');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState('');
  const [formError, setFormError] = useState('');

  // Calculate working days
  const calculateDays = () => {
    if (type === 'half_day') return 0.5;
    if (!startDate || !endDate) return 1;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) return 1;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const totalDays = calculateDays();

  // Helper labels
  const getRequestTypeName = (reqType: string) => {
    switch (reqType) {
      case 'remote':
        return isAr ? 'عمل عن بُعد' : 'Remote Work';
      case 'annual_leave':
        return isAr ? 'إجازة سنوية' : 'Annual Leave';
      case 'sick_leave':
        return isAr ? 'إجازة مرضية' : 'Sick Leave';
      case 'emergency_leave':
        return isAr ? 'إجازة اضطرارية' : 'Emergency Leave';
      case 'half_day':
        return isAr ? 'استئذان (نصف يوم)' : 'Half-day Leave';
      default:
        return isAr ? 'إجازة' : 'Leave';
    }
  };

  // Conflict and Overlap Governance Check
  const conflictAnalysis = useMemo(() => {
    const userReqs = existingRequests.filter(
      (r) => r.userId === currentUser.id && r.status !== 'cancelled' && r.status !== 'rejected'
    );

    let approvedLeaveConflict: LeaveOrWfhRequest | null = null;
    let approvedRemoteConflict: LeaveOrWfhRequest | null = null;
    let pendingConflict: LeaveOrWfhRequest | null = null;

    for (const req of userReqs) {
      // Overlap formula: (startA <= endB) and (endA >= startB)
      const overlaps = startDate <= req.endDate && endDate >= req.startDate;
      if (!overlaps) continue;

      if (req.status === 'approved') {
        if (req.type === 'annual_leave' || req.type === 'sick_leave' || req.type === 'emergency_leave') {
          approvedLeaveConflict = req;
        } else if (req.type === 'remote') {
          approvedRemoteConflict = req;
        }
      } else if (req.status === 'pending_manager' || req.status === 'pending_hr') {
        pendingConflict = req;
      }
    }

    return {
      approvedLeaveConflict,
      approvedRemoteConflict,
      pendingConflict,
    };
  }, [existingRequests, currentUser.id, startDate, endDate]);

  // Balance Quota Checks
  const balanceCheck = useMemo(() => {
    if (type === 'annual_leave') {
      const remainingAnnual = Math.max(0, currentUser.balances.annualLeaveTotal - currentUser.balances.annualLeaveUsed);
      const isExceeded = totalDays > remainingAnnual;
      return {
        remaining: remainingAnnual,
        isExceeded,
        message: isExceeded
          ? isAr
            ? `رصيد الإجازات السنوية المتاح لديك (${remainingAnnual} يوم) غير كافٍ لطلب ${totalDays} يوم.`
            : `Your available annual leave (${remainingAnnual} days) is insufficient for ${totalDays} days.`
          : null,
      };
    }

    if (type === 'remote') {
      const remainingWfh = Math.max(0, currentUser.balances.wfhMonthlyTotal - currentUser.balances.wfhMonthlyUsed);
      const isExceeded = totalDays > remainingWfh;
      return {
        remaining: remainingWfh,
        isExceeded,
        message: isExceeded
          ? isAr
            ? `تنبيه: الرصيد الشهري المتبقي للعمل عن بعد (${remainingWfh} أيام)، وسيخضع الطلب لموافقة استثنائية من الإدارة.`
            : `Notice: Remaining monthly remote quota is (${remainingWfh} days). Request requires executive review.`
          : null,
      };
    }

    if (type === 'emergency_leave') {
      const isExceeded = totalDays > 3;
      return {
        remaining: 3,
        isExceeded,
        message: isExceeded
          ? isAr
            ? 'الحد الأقصى للإجازة الاضطرارية المستمرة هو 3 أيام بموجب لوائح العمل.'
            : 'Maximum continuous emergency leave is 3 days per company policy.'
          : null,
      };
    }

    return { remaining: 999, isExceeded: false, message: null };
  }, [type, totalDays, currentUser.balances, isAr]);

  // Strict blocker condition
  // User cannot request remote work or any leave while an approved leave covers the same dates
  const isStrictlyBlocked = Boolean(
    conflictAnalysis.approvedLeaveConflict ||
    (type === 'annual_leave' && balanceCheck.isExceeded)
  );

  const handleGenerateAiReason = async () => {
    setIsGeneratingAi(true);
    setAiError('');
    try {
      const toneLabel =
        aiTone === 'formal'
          ? isAr ? 'رسمي ومهذب' : 'Formal & polite'
          : aiTone === 'concise'
          ? isAr ? 'مختصر ومباشر' : 'Concise & direct'
          : isAr ? 'طارئ ومقنع' : 'Urgent & persuasive';

      const res = await api.generateReason({
        type,
        keywords: aiKeywords || (type === 'remote' ? 'تسليم مشاريع برمجية ومتابعة تقنية' : 'إجازة مستحقة'),
        tone: toneLabel,
        role: currentUser.title,
        department: currentUser.department,
        language: lang,
      });

      if (res.reason) {
        setReason(res.reason);
        setIsAiReason(true);
      }
    } catch {
      setAiError(isAr ? 'تعذر إنشاء المبرر حالياً، يرجى كتابته يدوياً.' : 'Failed to generate AI reason.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (conflictAnalysis.approvedLeaveConflict) {
      setFormError(
        isAr
          ? `لا يمكن تقديم الطلب لوجود إجازة معتمدة بالفعل (${getRequestTypeName(conflictAnalysis.approvedLeaveConflict.type)}) في نفس الفترة. يجب قطع الإجازة الحالية من قبل الإدارة أولاً.`
          : 'Submission blocked: You have an active approved leave during this period. Contact HR to interrupt it first.'
      );
      return;
    }

    if (type === 'annual_leave' && balanceCheck.isExceeded) {
      setFormError(
        isAr
          ? `رصيدك من الإجازات السنوية (${balanceCheck.remaining} يوم) غير كافٍ لطلب ${totalDays} يوم.`
          : 'Insufficient annual leave balance for this duration.'
      );
      return;
    }

    if (conflictAnalysis.pendingConflict) {
      setFormError(
        isAr
          ? `لديك طلب معلق سابق (${getRequestTypeName(conflictAnalysis.pendingConflict.type)}) برقم #${conflictAnalysis.pendingConflict.id} لنفس الفترة. يرجى انتظار رد الإدارة أو إلغاء الطلب السابق لتجنب التضارب.`
          : 'A pending request already exists for these dates.'
      );
      return;
    }

    if (!reason.trim()) {
      setFormError(isAr ? 'يرجى كتابة سبب أو مبرر الطلب' : 'Please provide a reason for the request');
      return;
    }

    const compiledReason =
      type === 'sick_leave'
        ? `${reason.trim()} ${medicalReportNumber.trim() ? `(رقم التقرير: ${medicalReportNumber.trim()})` : ''} ${medicalFileName ? `[مرفق طبي: ${medicalFileName}]` : ''}`.trim()
        : type === 'half_day'
        ? `${reason.trim()} [استئذان ${halfDayShift === 'morning' ? 'فترة صباحية' : 'فترة مسائية'}]`
        : reason.trim();

    onSubmitRequest({
      userId: currentUser?.id || '',
      userName: currentUser?.name || '',
      userTitle: currentUser?.title || '',
      department: currentUser?.department || '',
      avatar: currentUser?.avatar || '',
      type,
      startDate,
      endDate: type === 'half_day' ? startDate : endDate,
      totalDays,
      reason: compiledReason,
      isAiGeneratedReason: isAiReason,
      handoverColleague,
      handoverPlan: type === 'remote' ? handoverPlan.trim() : (type === 'annual_leave' ? handoverPlan.trim() : ''),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-6 bg-[#2D3628]/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white border border-[#E5E2D9] rounded-3xl shadow-2xl p-6 sm:p-8 my-auto text-[#43423E] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Error Notification */}
        {formError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E5E2D9]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#E9EDD9] text-[#2D3628] border border-[#D9E0D2]">
              <Sparkles className="w-5 h-5 text-[#5E7153]" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-[#2D3628]">
                {isAr ? 'تقديم طلب دوام عن بُعد أو إجازة' : 'Submit WFH or Leave Request'}
              </h3>
              <p className="text-xs text-[#65635E]">
                {isAr
                  ? 'يخضع الطلب لنظام الحوكمة وضوابط منع التعارض الزمني وموافقة المدير والموارد البشرية'
                  : 'Automated conflict controls, quota validations, and multi-tier HR workflow'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#FAF9F6] hover:bg-[#EFECE4] text-[#65635E] hover:text-[#2D3628] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          
          {/* 1. Request Type Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-[#2D3628]">
                {isAr ? 'نوع الطلب المُراد تقديمه:' : 'Select Request Type:'}
              </label>
              <span className="text-[11px] text-[#65635E]">
                {type === 'annual_leave' && (
                  <span className="font-semibold text-[#1E40AF]">
                    {isAr ? 'الرصيد المتاح:' : 'Balance:'} {Math.max(0, currentUser.balances.annualLeaveTotal - currentUser.balances.annualLeaveUsed)} {isAr ? 'يوم' : 'days'}
                  </span>
                )}
                {type === 'remote' && (
                  <span className="font-semibold text-[#5E7153]">
                    {isAr ? 'المتبقي شهرياً:' : 'Monthly WFH:'} {Math.max(0, currentUser.balances.wfhMonthlyTotal - currentUser.balances.wfhMonthlyUsed)} {isAr ? 'يوم' : 'days'}
                  </span>
                )}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { id: 'remote', labelAr: 'عمل عن بعد', labelEn: 'Remote (WFH)', icon: Laptop, color: 'text-[#2D3628] border-[#5E7153] bg-[#E9EDD9]' },
                { id: 'annual_leave', labelAr: 'إجازة سنوية', labelEn: 'Annual Leave', icon: Palmtree, color: 'text-[#1E40AF] border-[#3B82F6] bg-[#EFF6FF]' },
                { id: 'sick_leave', labelAr: 'إجازة مرضية', labelEn: 'Sick Leave', icon: Stethoscope, color: 'text-[#8C5A28] border-[#E5AA70] bg-[#FDF3E7]' },
                { id: 'emergency_leave', labelAr: 'اضطرارية', labelEn: 'Emergency', icon: AlertCircle, color: 'text-[#9A3412] border-[#F97316] bg-[#FFF7ED]' },
                { id: 'half_day', labelAr: 'استئذان', labelEn: 'Half-Day', icon: Clock, color: 'text-[#065F46] border-[#10B981] bg-[#ECFDF5]' },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = type === item.id;
                return (
                  <button
                    type="button"
                    key={item.id}
                    id={`type-select-${item.id}`}
                    onClick={() => {
                      setType(item.id as RequestType);
                      setIsAiReason(false);
                      setFormError('');
                    }}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? `${item.color} font-bold ring-2 ring-[#5E7153]/40 shadow-xs`
                        : 'border-[#E5E2D9] bg-[#FAF9F6] text-[#65635E] hover:border-[#D9E0D2] hover:text-[#2D3628]'
                    }`}
                  >
                    <Icon className="w-4 h-4 mb-1" />
                    <span className="text-[11px] leading-tight">{isAr ? item.labelAr : item.labelEn}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Date Selection & Total Days Counter */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#2D3628] mb-1.5">
                {type === 'half_day' ? (isAr ? 'تاريخ الاستئذان:' : 'Date:') : (isAr ? 'تاريخ البدء:' : 'Start Date:')}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (e.target.value > endDate) setEndDate(e.target.value);
                }}
                className="w-full px-3.5 py-2.5 bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl text-xs sm:text-sm text-[#43423E] focus:outline-none focus:border-[#5E7153] transition"
                required
              />
            </div>

            {type === 'half_day' ? (
              <div>
                <label className="block text-xs font-semibold text-[#2D3628] mb-1.5">
                  {isAr ? 'فترة الاستئذان:' : 'Half-day Shift:'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setHalfDayShift('morning')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                      halfDayShift === 'morning'
                        ? 'bg-[#E9EDD9] text-[#2D3628] border-[#5E7153]'
                        : 'bg-[#FAF9F6] text-[#65635E] border-[#E5E2D9]'
                    }`}
                  >
                    {isAr ? 'صباحية (09:00 - 01:00)' : 'Morning'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setHalfDayShift('afternoon')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                      halfDayShift === 'afternoon'
                        ? 'bg-[#E9EDD9] text-[#2D3628] border-[#5E7153]'
                        : 'bg-[#FAF9F6] text-[#65635E] border-[#E5E2D9]'
                    }`}
                  >
                    {isAr ? 'مسائية (01:00 - 05:00)' : 'Afternoon'}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-[#2D3628] mb-1.5">
                  {isAr ? 'تاريخ الانتهاء:' : 'End Date:'}
                </label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl text-xs sm:text-sm text-[#43423E] focus:outline-none focus:border-[#5E7153] transition"
                  required
                />
              </div>
            )}
          </div>

          {/* Days duration summary */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF9F6] border border-[#E5E2D9] text-xs">
            <span className="text-[#65635E] flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#5E7153]" />
              {isAr ? 'المدة الإجمالية المحتسبة:' : 'Calculated Duration:'}
            </span>
            <span className="font-bold text-[#2D3628] bg-[#E9EDD9] px-2.5 py-1 rounded-lg border border-[#D9E0D2]">
              {totalDays} {isAr ? (totalDays === 1 ? 'يوم عمل' : totalDays === 0.5 ? 'نصف يوم' : 'أيام') : (totalDays === 1 ? 'day' : 'days')}
            </span>
          </div>

          {/* CONFLICT & GOVERNANCE CONTROLS BANNER */}
          {conflictAnalysis.approvedLeaveConflict && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 font-bold text-xs text-rose-800">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                <span>
                  {isAr ? '🚫 تعارض زمني حرج: لديك إجازة معتمدة بالفعل في هذه الفترة' : 'Conflict: Active Approved Leave Exists'}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-rose-700">
                {isAr ? (
                  <>
                    يوجد لديك إجازة ({getRequestTypeName(conflictAnalysis.approvedLeaveConflict.type)}) معتمدة رسمياً للفترة من{' '}
                    <span className="font-bold underline">{conflictAnalysis.approvedLeaveConflict.startDate}</span> إلى{' '}
                    <span className="font-bold underline">{conflictAnalysis.approvedLeaveConflict.endDate}</span> (طلب رقم #{conflictAnalysis.approvedLeaveConflict.id}).
                    <br />
                    <strong>وفقاً لسياسة الشركة:</strong> لا يمكن طلب عمل عن بعد أو إجازة متداخلة إلا بعد أن تقوم الإدارة والموارد البشرية بإجراء{' '}
                    <span className="underline decoration-rose-500 font-bold">"قطع الإجازة (استدعاء طارئ)"</span> واسترجاع رصيد الأيام غير المستهلكة.
                  </>
                ) : (
                  <>
                    You already have an approved ({getRequestTypeName(conflictAnalysis.approvedLeaveConflict.type)}) from{' '}
                    {conflictAnalysis.approvedLeaveConflict.startDate} to {conflictAnalysis.approvedLeaveConflict.endDate} (REQ #{conflictAnalysis.approvedLeaveConflict.id}).
                    Early return or remote work requires HR leave recall/interruption first.
                  </>
                )}
              </p>
            </div>
          )}

          {/* Pending Conflict Banner */}
          {!conflictAnalysis.approvedLeaveConflict && conflictAnalysis.pendingConflict && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
              <div className="flex items-center gap-2 font-bold text-xs text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{isAr ? '⚠️ تنبيه: لديك طلب سابق قيد المراجعة لنفس الفترة' : 'Notice: Overlapping Pending Request'}</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-700">
                {isAr
                  ? `لديك طلب معلق سابق (${getRequestTypeName(conflictAnalysis.pendingConflict.type)}) برقم #${conflictAnalysis.pendingConflict.id} متداخل مع هذا التاريخ. يرجى انتظار قرار الإدارة أو إلغاء الطلب السابق لتجنب تكرار الطلبات.`
                  : `You have an open pending request (#${conflictAnalysis.pendingConflict.id}) during this period.`}
              </p>
            </div>
          )}

          {/* Balance Limit Warning */}
          {balanceCheck.message && (
            <div className={`p-3.5 rounded-2xl border text-xs space-y-1 ${
              balanceCheck.isExceeded && type === 'annual_leave'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}>
              <div className="flex items-center gap-2 font-bold">
                <Info className="w-4 h-4 shrink-0" />
                <span>{balanceCheck.message}</span>
              </div>
            </div>
          )}

          {/* Extra field for Sick Leave: Medical Report & Document Upload */}
          {type === 'sick_leave' && (
            <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E5E2D9] space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#2D3628] flex items-center gap-1.5 mb-1">
                  <FileText className="w-3.5 h-3.5 text-[#8C5A28]" />
                  {isAr ? 'رقم الإجازة المرضية المعتمدة بتطبيق صحتي:' : 'Sehhaty Medical Report ID:'}
                </label>
                <input
                  type="text"
                  value={medicalReportNumber}
                  onChange={(e) => setMedicalReportNumber(e.target.value)}
                  placeholder={isAr ? 'مثال: SEH-2026-88914' : 'e.g. SEH-2026-88914'}
                  className="w-full px-3 py-2 bg-white border border-[#E5E2D9] rounded-xl text-xs text-[#43423E] placeholder-[#9A9890] focus:outline-none focus:border-[#5E7153]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2D3628] flex items-center gap-1.5 mb-1">
                  <Stethoscope className="w-3.5 h-3.5 text-[#5E7153]" />
                  {isAr ? 'رفع وثيقة التقرير الطبي أو الإجازة المرضية (صورة أو PDF):' : 'Upload Medical Certificate / Rest Note (Image or PDF):'}
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-dashed border-[#5E7153]/50 hover:border-[#5E7153] rounded-xl text-xs text-[#2D3628] font-medium cursor-pointer transition hover:bg-[#E9EDD9]/20">
                    <FileText className="w-4 h-4 text-[#5E7153]" />
                    <span>{medicalFileName || (isAr ? 'اختر ملف الوثيقة المرضية...' : 'Choose medical document file...')}</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setMedicalFileName(file.name);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                  {medicalFileName && (
                    <button
                      type="button"
                      onClick={() => setMedicalFileName('')}
                      className="text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1"
                    >
                      {isAr ? 'إزالة' : 'Remove'}
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-[#65635E] mt-1">
                  {isAr ? 'يتم إرفاق الوثيقة فوراً مع الطلب ليعتمدها الطبيب المسؤول والموارد البشرية.' : 'Document is attached to the request for HR & medical review.'}
                </p>
              </div>
            </div>
          )}

          {/* 3. AI Reason Drafter Section */}
          <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#D9E0D2] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-[#5E7153]" />
                <span className="text-xs font-bold text-[#2D3628]">
                  {isAr ? 'المساعد الذكي لصياغة مبرر الطلب (Gemini AI)' : 'Gemini AI Reason Drafter'}
                </span>
              </div>
              <span className="text-[10px] text-[#2D3628] bg-[#E9EDD9] px-2 py-0.5 rounded-full border border-[#D9E0D2]">
                {isAr ? 'خادم Google GenAI' : 'Server-side AI'}
              </span>
            </div>

            <p className="text-[11px] text-[#65635E] leading-relaxed">
              {isAr
                ? 'أدخل كلمات مفتاحية وسيقوم الذكاء الاصطناعي بصياغة مبرر رسمي مقنع واحترافي لتقديمه للإدارة.'
                : 'Enter keywords and Gemini will draft a compliant justification for management.'}
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={aiKeywords}
                onChange={(e) => setAiKeywords(e.target.value)}
                placeholder={
                  isAr
                    ? 'مثال: إنجاز تسليمات الربع الثالث، ظرف أسري طارئ...'
                    : 'e.g. Project deliverable deadline, family milestone...'
                }
                className="flex-1 px-3 py-2 bg-white border border-[#E5E2D9] rounded-xl text-xs text-[#43423E] placeholder-[#9A9890] focus:outline-none focus:border-[#5E7153]"
              />

              <select
                value={aiTone}
                onChange={(e: any) => setAiTone(e.target.value)}
                className="px-3 py-2 bg-white border border-[#E5E2D9] rounded-xl text-xs text-[#43423E] focus:outline-none focus:border-[#5E7153]"
              >
                <option value="formal">{isAr ? 'أسلوب رسمي' : 'Formal Tone'}</option>
                <option value="concise">{isAr ? 'أسلوب مختصر' : 'Concise Tone'}</option>
                <option value="urgent">{isAr ? 'أسلوب مقنع/طارئ' : 'Urgent Tone'}</option>
              </select>

              <button
                type="button"
                id="btn-ai-generate-reason"
                onClick={handleGenerateAiReason}
                disabled={isGeneratingAi}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#5E7153] hover:bg-[#4E5F44] text-white rounded-xl text-xs font-bold transition disabled:opacity-50 shadow-xs cursor-pointer"
              >
                {isGeneratingAi ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{isAr ? 'جاري الصياغة...' : 'Drafting...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isAr ? 'صياغة المبرر' : 'Draft with AI'}</span>
                  </>
                )}
              </button>
            </div>
            {aiError && <p className="text-[11px] text-[#C25E00]">{aiError}</p>}
          </div>

          {/* 4. Reason Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-[#2D3628]">
                {isAr ? 'سبب ومبرر الطلب:' : 'Request Justification & Reason:'}
              </label>
              {isAiReason && (
                <span className="text-[10px] text-[#5E7153] flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  {isAr ? 'تمت الصياغة بالذكاء الاصطناعي' : 'Drafted by Gemini AI'}
                </span>
              )}
            </div>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setIsAiReason(false);
              }}
              placeholder={
                isAr
                  ? 'اكتب سبب الطلب بوضوح أو استخدم زر المساعد الذكي أعلاه...'
                  : 'State your justification or use the AI drafter above...'
              }
              className="w-full px-3.5 py-2.5 bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl text-xs sm:text-sm text-[#43423E] placeholder-[#9A9890] focus:outline-none focus:border-[#5E7153] leading-relaxed"
              required
            />
          </div>

          {/* 5. Handover Colleague & Handover Plan (For Remote and Annual Leave) */}
          {(type === 'remote' || type === 'annual_leave') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-[#E5E2D9]">
              <div>
                <label className="block text-xs font-semibold text-[#2D3628] mb-1.5 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-[#5E7153]" />
                  {isAr ? 'الموظف المفوض بالتغطية والمتابعة:' : 'Handover / Coverage Colleague:'}
                </label>
                <select
                  value={handoverColleague}
                  onChange={(e) => setHandoverColleague(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl text-xs sm:text-sm text-[#43423E] focus:outline-none focus:border-[#5E7153]"
                >
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.name}>
                      {member.name} ({member.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2D3628] mb-1.5">
                  {type === 'remote'
                    ? (isAr ? 'خطة تسليم المهام أثناء العمل عن بُعد:' : 'Deliverables Plan:')
                    : (isAr ? 'خطة تسليم المشاريع قبل الإجازة:' : 'Project Handover Notes:')}
                </label>
                <input
                  type="text"
                  value={handoverPlan}
                  onChange={(e) => setHandoverPlan(e.target.value)}
                  placeholder={
                    isAr
                      ? 'مثال: تم تسليم الكود وتغطية المهام العاجلة ومتاح للطوارئ'
                      : 'e.g. Tasks delegated, available for emergencies'
                  }
                  className="w-full px-3.5 py-2.5 bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl text-xs sm:text-sm text-[#43423E] placeholder-[#9A9890] focus:outline-none focus:border-[#5E7153]"
                />
              </div>
            </div>
          )}

          {/* Submit and Cancel Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5E2D9]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-[#FAF9F6] hover:bg-[#EFECE4] text-[#65635E] text-xs sm:text-sm font-semibold transition cursor-pointer"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>

            <button
              type="submit"
              id="btn-submit-request-form"
              disabled={isStrictlyBlocked}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md transition cursor-pointer ${
                isStrictlyBlocked
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60 shadow-none'
                  : 'bg-[#5E7153] hover:bg-[#4E5F44] text-white shadow-[#5E7153]/20'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>
                {isStrictlyBlocked
                  ? (isAr ? 'غير مسموح بالتقديم لوجود تعارض' : 'Blocked by Conflict')
                  : (isAr ? 'إرسال الطلب للاعتماد' : 'Submit for Approval')}
              </span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
