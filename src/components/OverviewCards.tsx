import React from 'react';
import {
  Laptop,
  Palmtree,
  Stethoscope,
  Activity,
  PlusCircle,
  Clock,
  CheckCircle,
  FileSpreadsheet,
  MessageSquareQuote,
  Sparkles,
  Zap,
} from 'lucide-react';
import { UserProfile, WorkStatus } from '../types';

interface OverviewCardsProps {
  currentUser: UserProfile;
  onOpenNewRequest: () => void;
  onOpenCheckinModal: () => void;
  onOpenStandupModal: () => void;
  onChangeWorkStatus: (status: WorkStatus) => void;
  lang: 'ar' | 'en';
}

export const OverviewCards: React.FC<OverviewCardsProps> = ({
  currentUser,
  onOpenNewRequest,
  onOpenCheckinModal,
  onOpenStandupModal,
  onChangeWorkStatus,
  lang,
}) => {
  const isAr = lang === 'ar';
  const { balances, todayStatus, checkInTime } = currentUser;

  const wfhRemaining = balances.wfhMonthlyTotal - balances.wfhMonthlyUsed;
  const annualRemaining = balances.annualLeaveTotal - balances.annualLeaveUsed;

  const getStatusLabel = (status: WorkStatus) => {
    switch (status) {
      case 'wfh_active':
        return isAr ? 'يعمل عن بُعد (WFH)' : 'Working Remotely (WFH)';
      case 'in_office':
        return isAr ? 'متواجد في المكتب' : 'In Office';
      case 'deep_focus':
        return isAr ? 'جلسة تركيز مكثف (Deep Work)' : 'Deep Focus Mode';
      case 'in_meeting':
        return isAr ? 'في اجتماع افتراضي' : 'In a Meeting';
      case 'in_break':
        return isAr ? 'في استراحة قصيرة' : 'On Break';
      default:
        return isAr ? 'غير مسجل حالياً' : 'Offline';
    }
  };

  const getStatusColor = (status: WorkStatus) => {
    switch (status) {
      case 'wfh_active':
        return 'bg-[#E9EDD9] text-[#2D3628] border-[#D9E0D2]';
      case 'in_office':
        return 'bg-[#E2EDF8] text-[#1E40AF] border-[#BFDBFE]';
      case 'deep_focus':
        return 'bg-[#F3E8FF] text-[#6B21A8] border-[#E9D5FF]';
      case 'in_meeting':
        return 'bg-[#FDF3E7] text-[#8C5A28] border-[#E5AA70]';
      case 'in_break':
        return 'bg-[#FEF9C3] text-[#854D0E] border-[#FEF08A]';
      default:
        return 'bg-[#EFECE4] text-[#65635E] border-[#E5E2D9]';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner: Status & Quick Action Bar */}
      <div className="bg-gradient-to-r from-[#EFECE4] via-[#FAF9F6] to-[#E9EDD9] border border-[#E5E2D9] rounded-3xl p-5 sm:p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-[#5E7153]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-48 h-48 bg-[#E5AA70]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          
          {/* Left / Status Info */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-[#5E7153] shadow-md"
              />
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#5E7153] border-2 border-[#FAF9F6] rounded-full" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-bold text-[#2D3628]">
                  {isAr ? `مرحباً بك، ${currentUser.name}` : `Welcome back, ${currentUser.nameEn}`}
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusColor(todayStatus)}`}>
                  {getStatusLabel(todayStatus)}
                </span>
              </div>
              <p className="text-xs text-[#65635E]">
                {isAr ? currentUser.title : currentUser.titleEn} • {isAr ? currentUser.department : currentUser.departmentEn}
              </p>
              {checkInTime && (
                <div className="flex items-center gap-1.5 text-xs text-[#5E7153] font-medium pt-0.5">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>{isAr ? `تم تسجيل الحضور اليوم الساعة: ${checkInTime}` : `Checked in today at: ${checkInTime}`}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap w-full lg:w-auto">
            {/* Virtual Check-in modal trigger */}
            <button
              id="btn-virtual-checkin"
              onClick={onOpenCheckinModal}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#FAF9F6] hover:bg-[#EFECE4] text-[#43423E] border border-[#E5E2D9] hover:border-[#5E7153]/50 text-xs sm:text-sm font-semibold transition shadow-sm group"
            >
              <Clock className="w-4 h-4 text-[#5E7153] group-hover:scale-110 transition-transform" />
              <span>{isAr ? 'تسجيل الحضور الافتراضي' : 'Virtual Check-In'}</span>
            </button>

            {/* AI Standup helper */}
            <button
              id="btn-ai-standup-trigger"
              onClick={onOpenStandupModal}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#E9EDD9] hover:bg-[#D9E0D2] text-[#2D3628] border border-[#D9E0D2] text-xs sm:text-sm font-semibold transition shadow-sm group"
            >
              <Sparkles className="w-4 h-4 text-[#5E7153] group-hover:rotate-12 transition-transform" />
              <span>{isAr ? 'موجز الستاند-أب الذكي' : 'AI Daily Standup'}</span>
            </button>

            {/* Primary Submit New Request */}
            <button
              id="btn-new-request-trigger"
              onClick={onOpenNewRequest}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#5E7153] hover:bg-[#4E5F44] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#5E7153]/20 transition group"
            >
              <PlusCircle className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
              <span>{isAr ? 'تقديم طلب جديد' : 'New Request'}</span>
            </button>
          </div>

        </div>

        {/* Quick status switcher pills */}
        <div className="mt-5 pt-4 border-t border-[#E5E2D9] flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs text-[#65635E] flex items-center gap-1.5 font-medium">
            <Zap className="w-3.5 h-3.5 text-[#E5AA70]" />
            {isAr ? 'تحديث حالة العمل الفورية:' : 'Quick Status Update:'}
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['wfh_active', 'in_office', 'deep_focus', 'in_meeting', 'in_break'] as WorkStatus[]).map((status) => (
              <button
                key={status}
                onClick={() => onChangeWorkStatus(status)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition border ${
                  todayStatus === status
                    ? 'bg-[#5E7153] text-white font-bold border-[#5E7153] shadow-sm'
                    : 'bg-[#FAF9F6] text-[#43423E] hover:bg-[#EFECE4] border-[#E5E2D9]'
                }`}
              >
                {getStatusLabel(status)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        
        {/* Card 1: WFH Monthly Balance */}
        <div className="bg-white border border-[#E5E2D9] hover:border-[#5E7153]/50 rounded-2xl p-5 shadow-sm transition-all duration-200 group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#65635E]">
              {isAr ? 'رصيد العمل عن بُعد (هذا الشهر)' : 'Monthly WFH Balance'}
            </span>
            <div className="p-2.5 rounded-xl bg-[#E9EDD9] text-[#2D3628] border border-[#D9E0D2] group-hover:scale-110 transition-transform">
              <Laptop className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#2D3628]">{wfhRemaining}</span>
            <span className="text-xs font-medium text-[#65635E]">
              {isAr ? `من أصل ${balances.wfhMonthlyTotal} أيام` : `of ${balances.wfhMonthlyTotal} days left`}
            </span>
          </div>
          {/* Progress bar */}
          <div className="mt-3">
            <div className="w-full h-2 bg-[#EFECE4] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#5E7153] to-[#7D946F] rounded-full transition-all duration-500"
                style={{ width: `${(wfhRemaining / balances.wfhMonthlyTotal) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-[#65635E] mt-1.5 font-medium">
              <span>{isAr ? `مستهلك: ${balances.wfhMonthlyUsed} أيام` : `Used: ${balances.wfhMonthlyUsed} days`}</span>
              <span>{isAr ? 'الحد: 2 يوم/أسبوع' : 'Max 2d/week'}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Annual Leave Balance */}
        <div className="bg-white border border-[#E5E2D9] hover:border-[#5E7153]/50 rounded-2xl p-5 shadow-sm transition-all duration-200 group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#65635E]">
              {isAr ? 'رصيد الإجازات السنوية' : 'Annual Leave Balance'}
            </span>
            <div className="p-2.5 rounded-xl bg-[#E9EDD9] text-[#2D3628] border border-[#D9E0D2] group-hover:scale-110 transition-transform">
              <Palmtree className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#2D3628]">{annualRemaining}</span>
            <span className="text-xs font-medium text-[#65635E]">
              {isAr ? `يوماً متبقياً (من ${balances.annualLeaveTotal})` : `days remaining (of ${balances.annualLeaveTotal})`}
            </span>
          </div>
          {/* Progress bar */}
          <div className="mt-3">
            <div className="w-full h-2 bg-[#EFECE4] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#5E7153] to-[#7D946F] rounded-full transition-all duration-500"
                style={{ width: `${(annualRemaining / balances.annualLeaveTotal) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-[#65635E] mt-1.5 font-medium">
              <span>{isAr ? `مستهلك: ${balances.annualLeaveUsed} أيام` : `Used: ${balances.annualLeaveUsed} days`}</span>
              <span>{isAr ? 'رصيد مدفوع 100%' : '100% Paid'}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Sick & Emergency Leave */}
        <div className="bg-white border border-[#E5E2D9] hover:border-[#5E7153]/50 rounded-2xl p-5 shadow-sm transition-all duration-200 group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#65635E]">
              {isAr ? 'الإجازات المرضية والاضطرارية' : 'Sick & Emergency Leaves'}
            </span>
            <div className="p-2.5 rounded-xl bg-[#FDF3E7] text-[#8C5A28] border border-[#E5AA70] group-hover:scale-110 transition-transform">
              <Stethoscope className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#2D3628]">{balances.sickLeaveUsed + balances.emergencyLeaveUsed}</span>
            <span className="text-xs font-medium text-[#65635E]">
              {isAr ? 'أيام مستخدمة هذا العام' : 'days used this year'}
            </span>
          </div>
          <div className="mt-3 pt-2 border-t border-[#E5E2D9] flex justify-between text-xs text-[#65635E]">
            <span>{isAr ? `مرضية: ${balances.sickLeaveUsed}` : `Sick: ${balances.sickLeaveUsed}`}</span>
            <span>{isAr ? `اضطرارية: ${balances.emergencyLeaveUsed}` : `Emergency: ${balances.emergencyLeaveUsed}`}</span>
            <span className="text-[#5E7153] font-medium">{isAr ? 'مستوفية للشروط' : 'Verified'}</span>
          </div>
        </div>

        {/* Card 4: Attendance & Commitment Score */}
        <div className="bg-white border border-[#E5E2D9] hover:border-[#5E7153]/50 rounded-2xl p-5 shadow-sm transition-all duration-200 group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#65635E]">
              {isAr ? 'معدل الالتزام والتواجد' : 'Presence & Standup Rate'}
            </span>
            <div className="p-2.5 rounded-xl bg-[#E9EDD9] text-[#2D3628] border border-[#D9E0D2] group-hover:scale-110 transition-transform">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#2D3628]">98.5%</span>
            <span className="text-xs font-medium text-[#65635E]">
              {isAr ? 'ممتاز (سجل مثالي)' : 'Excellent'}
            </span>
          </div>
          <div className="mt-3 pt-2 border-t border-[#E5E2D9] flex items-center justify-between text-xs text-[#65635E]">
            <span>{isAr ? 'تسليم المهام:' : 'Deliverables:'}</span>
            <span className="text-[#5E7153] font-semibold">{isAr ? 'في الموعد المحدد 100%' : '100% On-time'}</span>
          </div>
        </div>

      </div>

    </div>
  );
};
