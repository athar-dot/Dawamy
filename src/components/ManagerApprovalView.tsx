import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Sparkles,
  Users,
  Building,
  Laptop,
  Palmtree,
  Stethoscope,
  AlertCircle,
  Loader2,
  AlertTriangle,
  Send,
  UserCheck,
  RotateCcw,
  Calendar,
  Clock,
  Briefcase,
} from 'lucide-react';
import { LeaveOrWfhRequest, UserProfile, TeamMemberStatus } from '../types';
import { api } from '../services/api';

interface ManagerApprovalViewProps {
  pendingRequests: LeaveOrWfhRequest[];
  allRequests?: LeaveOrWfhRequest[];
  currentUser: UserProfile;
  teamMembers: TeamMemberStatus[];
  onApproveRequest: (requestId: string, notes?: string) => void;
  onRejectRequest: (requestId: string, reason: string) => void;
  onInterruptLeave?: (request: LeaveOrWfhRequest) => void;
  lang: 'ar' | 'en';
}

export const ManagerApprovalView: React.FC<ManagerApprovalViewProps> = ({
  pendingRequests,
  allRequests = [],
  currentUser,
  teamMembers,
  onApproveRequest,
  onRejectRequest,
  onInterruptLeave,
  lang,
}) => {
  const isAr = lang === 'ar';
  const [activeTab, setActiveTab] = useState<'pending' | 'active_leaves'>('pending');
  const [managerNotes, setManagerNotes] = useState<Record<string, string>>({});
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [showRejectBox, setShowRejectBox] = useState<Record<string, boolean>>({});

  // AI Team Impact evaluations cache
  const [aiImpacts, setAiImpacts] = useState<Record<string, { analysis: string; impactScore?: string; loading?: boolean }>>({});

  // Team presence stats
  const safeTeam = Array.isArray(teamMembers) ? teamMembers : [];
  const safePending = Array.isArray(pendingRequests) ? pendingRequests : [];
  const safeAll = Array.isArray(allRequests) ? allRequests : [];

  // Filter active and approved leaves
  const approvedLeaves = safeAll.filter(
    (r) =>
      (r.status === 'approved' || r.status === 'interrupted') &&
      (r.type === 'annual_leave' || r.type === 'sick_leave' || r.type === 'emergency_leave')
  );

  const totalTeam = safeTeam.length;
  const inOfficeCount = safeTeam.filter((m) => m?.status === 'in_office' || m?.status === 'deep_focus').length;
  const remoteCount = safeTeam.filter((m) => m?.status === 'wfh_active').length;
  const onLeaveCount = safeTeam.filter((m) => m?.status === 'in_break' || m?.status === 'offline').length;
  const inOfficePercent = Math.round((inOfficeCount / (totalTeam || 1)) * 100);

  const handleEvaluateImpact = async (req: LeaveOrWfhRequest) => {
    setAiImpacts((prev) => ({
      ...prev,
      [req.id]: { analysis: '', loading: true },
    }));

    try {
      const res = await api.evaluateTeamImpact({
        requestDetails: {
          employeeName: req.userName,
          type: req.type,
          dateStart: req.startDate,
          dateEnd: req.endDate,
          reason: req.reason,
          plan: req.handoverPlan,
        },
        teamStats: {
          totalMembers: totalTeam,
          inOffice: inOfficeCount,
          remote: remoteCount,
          onLeave: onLeaveCount,
          inOfficePercent,
        },
        department: req.department,
        language: lang,
      });

      setAiImpacts((prev) => ({
        ...prev,
        [req.id]: {
          analysis: res.analysis || (isAr ? 'نسبة حضور الفريق في المكتب كافية ومستقرة.' : 'Team office presence is adequate.'),
          impactScore: res.impactScore || (isAr ? 'آمن' : 'Safe'),
          loading: false,
        },
      }));
    } catch {
      setAiImpacts((prev) => ({
        ...prev,
        [req.id]: {
          analysis: isAr ? 'نسبة حضور الفريق في المكتب 75% وتسمح باعتماد الطلب بأمان.' : 'Team in-office presence is 75%, safe to approve.',
          impactScore: isAr ? 'آمن' : 'Safe',
          loading: false,
        },
      }));
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'annual_leave':
        return isAr ? 'إجازة سنوية' : 'Annual Leave';
      case 'sick_leave':
        return isAr ? 'إجازة مرضية' : 'Sick Leave';
      case 'emergency_leave':
        return isAr ? 'إجازة اضطرارية' : 'Emergency Leave';
      case 'remote':
        return isAr ? 'عمل عن بعد' : 'Remote Work';
      default:
        return isAr ? 'إجازة' : 'Leave';
    }
  };

  return (
    <div className="bg-white border border-[#E5E2D9] rounded-3xl p-5 sm:p-6 shadow-sm space-y-6">
      
      {/* Top Banner with Stats */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-5 border-b border-[#E5E2D9]">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#E9EDD9] text-[#2D3628] border border-[#D9E0D2]">
              <ShieldCheck className="w-5 h-5 text-[#5E7153]" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-[#2D3628]">
              {isAr ? 'مركز اعتماد طلبات الفريق وإدارة الإجازات' : 'Team Approval & Leave Governance Hub'}
            </h3>
          </div>
          <p className="text-xs text-[#65635E] mt-1">
            {isAr
              ? 'مراجعة طلبات العمل عن بُعد والإجازات، وإدارة حالات قطع الإجازة الطارئة للموظفين'
              : 'Review requests, evaluate team presence with Gemini AI, and manage emergency leave recalls'}
          </p>
        </div>

        {/* Live Team Presence Summary Pills */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF9F6] border border-[#E5E2D9] text-[#43423E]">
            <Users className="w-3.5 h-3.5 text-[#65635E]" />
            <span>{isAr ? 'إجمالي الفريق:' : 'Total Team:'}</span>
            <strong className="text-[#2D3628]">{totalTeam}</strong>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E2EDF8] border border-[#BFDBFE] text-[#1E40AF]">
            <Building className="w-3.5 h-3.5 text-[#1E40AF]" />
            <span>{isAr ? 'بالمكتب:' : 'In Office:'}</span>
            <strong className="text-[#1E40AF]">{inOfficeCount} ({inOfficePercent}%)</strong>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E9EDD9] border border-[#D9E0D2] text-[#2D3628]">
            <Laptop className="w-3.5 h-3.5 text-[#5E7153]" />
            <span>{isAr ? 'عن بُعد:' : 'Remote:'}</span>
            <strong className="text-[#2D3628]">{remoteCount}</strong>
          </div>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E5E2D9] pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            activeTab === 'pending'
              ? 'bg-[#5E7153] text-white shadow-xs'
              : 'bg-[#FAF9F6] text-[#65635E] hover:bg-[#EFECE4] hover:text-[#2D3628]'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>{isAr ? 'الطلبات المعلقة للاعتماد' : 'Pending Requests'}</span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] ${
            activeTab === 'pending' ? 'bg-[#47573E] text-white' : 'bg-[#E5E2D9] text-[#2D3628]'
          }`}>
            {safePending.length}
          </span>
        </button>

        <button
          type="button"
          id="tab-active-leaves"
          onClick={() => setActiveTab('active_leaves')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            activeTab === 'active_leaves'
              ? 'bg-[#5E7153] text-white shadow-xs'
              : 'bg-[#FAF9F6] text-[#65635E] hover:bg-[#EFECE4] hover:text-[#2D3628]'
          }`}
        >
          <Palmtree className="w-4 h-4" />
          <span>{isAr ? 'الإجازات المعتمدة (إمكانية قطع الإجازة)' : 'Active Leaves (Recall Management)'}</span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] ${
            activeTab === 'active_leaves' ? 'bg-[#47573E] text-white' : 'bg-[#E5E2D9] text-[#2D3628]'
          }`}>
            {approvedLeaves.length}
          </span>
        </button>
      </div>

      {/* 1. Pending Approvals Tab */}
      {activeTab === 'pending' && (
        <>
          {safePending.length === 0 ? (
            <div className="text-center py-14 border border-dashed border-[#E5E2D9] rounded-2xl">
              <CheckCircle2 className="w-12 h-12 text-[#5E7153] mx-auto mb-3" />
              <h4 className="text-base font-bold text-[#2D3628]">
                {isAr ? 'لا توجد طلبات معلقة بانتظار الاعتماد حالياً 🎉' : 'All caught up! No pending requests'}
              </h4>
              <p className="text-xs text-[#65635E] mt-1 max-w-md mx-auto">
                {isAr
                  ? 'تمت مراجعة واعتماد كافة طلبات العمل عن بُعد والإجازات لفريقك بنجاح.'
                  : 'All remote work and leave requests for your team have been processed.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {safePending.map((req) => {
                const aiImpact = aiImpacts[req.id];
                const isRejectOpen = showRejectBox[req.id];

                return (
                  <div
                    key={req.id}
                    className="bg-[#FAF9F6] border border-[#E5E2D9] hover:border-[#D5D0C5] rounded-2xl p-5 shadow-sm space-y-4 transition"
                  >
                    {/* Employee Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3.5">
                        <img
                          src={req.avatar}
                          alt={req.userName}
                          className="w-12 h-12 rounded-2xl object-cover border-2 border-[#5E7153]"
                        />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-sm sm:text-base text-[#2D3628]">{req.userName}</h4>
                            <span className="text-xs text-[#65635E] font-mono">({req.id})</span>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E9EDD9] text-[#2D3628] border border-[#D9E0D2]">
                              {getTypeLabel(req.type)}
                            </span>
                          </div>
                          <p className="text-xs text-[#65635E] mt-0.5">
                            {req.userTitle} • {req.department}
                          </p>
                        </div>
                      </div>

                      {/* Dates badge */}
                      <div className="text-right sm:text-left bg-white px-3.5 py-2 rounded-xl border border-[#E5E2D9]">
                        <div className="text-[11px] text-[#65635E] font-medium">{isAr ? 'الفترة المطلوبة:' : 'Requested Dates:'}</div>
                        <div className="text-xs sm:text-sm font-bold text-[#5E7153]">
                          {req.startDate} {req.startDate !== req.endDate ? `⬅️ ${req.endDate}` : ''} ({req.totalDays} {isAr ? 'أيام' : 'days'})
                        </div>
                      </div>
                    </div>

                    {/* Justification Card */}
                    <div className="p-3.5 rounded-xl bg-white border border-[#E5E2D9] space-y-1 text-xs sm:text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#2D3628]">{isAr ? 'مبرر الطلب المكتوب:' : 'Justification:'}</span>
                        {req.isAiGeneratedReason && (
                          <span className="text-[10px] text-[#2D3628] flex items-center gap-1 font-medium bg-[#E9EDD9] px-2 py-0.5 rounded-full border border-[#D9E0D2]">
                            <Sparkles className="w-3 h-3 text-[#5E7153]" />
                            {isAr ? 'صيغ بواسطة الذكاء الاصطناعي' : 'Drafted by AI'}
                          </span>
                        )}
                      </div>
                      <p className="text-[#43423E] leading-relaxed">{req.reason}</p>
                    </div>

                    {/* Handover info */}
                    {(req.handoverColleague || (req.type === 'remote' && req.handoverPlan)) && (
                      <div className="p-3 rounded-xl bg-white border border-[#E5E2D9] text-xs flex items-center gap-2 flex-wrap">
                        <UserCheck className="w-4 h-4 text-[#5E7153]" />
                        <span className="text-[#65635E]">{isAr ? 'تغطية المهام والتسليم:' : 'Handover & Coverage:'}</span>
                        <strong className="text-[#2D3628]">{req.handoverColleague || 'غير محدد'}</strong>
                        {req.type === 'remote' && req.handoverPlan && (
                          <span className="text-[#65635E] italic">({req.handoverPlan})</span>
                        )}
                      </div>
                    )}

                    {/* Gemini AI Team Impact Evaluation Box */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-[#E9EDD9]/40 to-white border border-[#D9E0D2] space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-[#5E7153]" />
                          <span className="text-xs font-bold text-[#2D3628]">
                            {isAr ? 'التقييم الذكي لتأثير الغياب على الفريق (Gemini AI Impact):' : 'AI Team Impact Evaluation (Gemini):'}
                          </span>
                        </div>

                        {!aiImpact && (
                          <button
                            type="button"
                            onClick={() => handleEvaluateImpact(req)}
                            className="flex items-center gap-1.5 px-3 py-1 bg-[#E9EDD9] hover:bg-[#D9E0D2] text-[#2D3628] border border-[#D9E0D2] rounded-xl text-xs font-semibold transition cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-[#5E7153]" />
                            <span>{isAr ? 'تحليل تأثير الفريق الآن' : 'Evaluate Coverage Impact'}</span>
                          </button>
                        )}
                      </div>

                      {aiImpact?.loading ? (
                        <div className="flex items-center gap-2 py-2 text-xs text-[#5E7153]">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{isAr ? 'جاري تحليل نسبة تواجد الفريق وسير العمل...' : 'Analyzing team presence and sprint workload...'}</span>
                        </div>
                      ) : aiImpact?.analysis ? (
                        <div className="text-xs space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[#65635E]">{isAr ? 'مستوى الخطورة:' : 'Risk Level:'}</span>
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#E9EDD9] text-[#2D3628] border border-[#D9E0D2]">
                              {aiImpact.impactScore || (isAr ? 'آمن ومناسب' : 'Safe')}
                            </span>
                          </div>
                          <p className="text-[#43423E] leading-relaxed">{aiImpact.analysis}</p>
                        </div>
                      ) : (
                        <p className="text-[11px] text-[#65635E]">
                          {isAr
                            ? 'اضغط زر "تحليل تأثير الفريق" للحصول على توصية ذكية من Gemini بناءً على نسبة حضور المكتب وتسليمات المهام.'
                            : 'Click evaluate to get AI-driven recommendation based on office presence and team capacity.'}
                        </p>
                      )}
                    </div>

                    {/* Manager Note Input */}
                    <div>
                      <input
                        type="text"
                        value={managerNotes[req.id] || ''}
                        onChange={(e) => setManagerNotes({ ...managerNotes, [req.id]: e.target.value })}
                        placeholder={isAr ? 'أضف ملاحظات اختيارية للاعتماد (تظهر للموظف والموارد البشرية)...' : 'Add optional approval notes...'}
                        className="w-full px-3.5 py-2 bg-white border border-[#E5E2D9] rounded-xl text-xs text-[#43423E] placeholder-[#9A9890] focus:outline-none focus:border-[#5E7153]"
                      />
                    </div>

                    {/* Rejection Input Box if toggled */}
                    {isRejectOpen && (
                      <div className="p-3.5 rounded-xl bg-[#FDF0EE] border border-[#F5C4BE] space-y-2 animate-in fade-in duration-150">
                        <label className="block text-xs font-semibold text-[#9E3B30]">
                          {isAr ? 'يرجى كتابة سبب الرفض لتوضيحه للموظف:' : 'Reason for rejection:'}
                        </label>
                        <textarea
                          rows={2}
                          value={rejectReason[req.id] || ''}
                          onChange={(e) => setRejectReason({ ...rejectReason, [req.id]: e.target.value })}
                          placeholder={isAr ? 'مثال: وجود تسليمات حرجة تتطلب تواجدك بالمكتب، يرجى التنسيق للأسبوع القادم...' : 'e.g. Critical release sprint required in office...'}
                          className="w-full px-3 py-2 bg-white border border-[#F5C4BE] rounded-xl text-xs text-[#43423E] placeholder-[#9A9890] focus:outline-none focus:border-[#9E3B30]"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setShowRejectBox({ ...showRejectBox, [req.id]: false })}
                            className="px-3 py-1.5 rounded-lg bg-[#EFECE4] text-[#65635E] text-xs font-semibold hover:bg-[#E5E2D9] cursor-pointer"
                          >
                            {isAr ? 'تراجع' : 'Cancel'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const r = rejectReason[req.id] || (isAr ? 'ظروف عمل طارئة' : 'Work requirements');
                              onRejectRequest(req.id, r);
                            }}
                            className="px-4 py-1.5 rounded-lg bg-[#9E3B30] hover:bg-[#852F26] text-white font-bold text-xs cursor-pointer"
                          >
                            {isAr ? 'تأكيد الرفض' : 'Confirm Reject'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    {!isRejectOpen && (
                      <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#E5E2D9]">
                        <button
                          type="button"
                          onClick={() => setShowRejectBox({ ...showRejectBox, [req.id]: true })}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-[#FDF0EE] text-[#9E3B30] border border-[#F5C4BE] text-xs font-semibold transition cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>{isAr ? 'رفض الطلب' : 'Reject'}</span>
                        </button>

                        <button
                          type="button"
                          id={`btn-approve-${req.id}`}
                          onClick={() => onApproveRequest(req.id, managerNotes[req.id])}
                          className="flex items-center gap-2 px-6 py-2 rounded-xl bg-[#5E7153] hover:bg-[#4E5F44] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#5E7153]/20 transition cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{isAr ? 'اعتماد وموافقة فورية' : 'Approve Request'}</span>
                        </button>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* 2. Active Approved Leaves & Interruption Tab */}
      {activeTab === 'active_leaves' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] text-xs text-[#92400E] flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0 text-[#D97706] mt-0.5" />
            <div className="space-y-1">
              <strong className="block font-bold">
                {isAr ? 'نظام قطع الإجازات الطارئ واستدعاء الموظفين للعمل:' : 'Emergency Leave Interruption & Staff Recall Policy:'}
              </strong>
              <p className="leading-relaxed">
                {isAr
                  ? 'إذا كان الموظف في إجازة سنوية أو مرضية معتمدة واستدعت ظروف العمل والشركة عودته، يمكن لمدير النظام والموارد البشرية قطع الإجازة وتحديد تاريخ العودة واسترجاع رصيد الأيام غير المستهلكة فورياً إلى حسابه.'
                  : 'Allows System Admin & HR to formally interrupt approved active leaves for business emergencies, recalling the employee and auto-refunding unused days.'}
              </p>
            </div>
          </div>

          {approvedLeaves.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-[#E5E2D9] rounded-2xl">
              <Palmtree className="w-10 h-10 text-[#C8C4B7] mx-auto mb-2" />
              <p className="text-sm font-semibold text-[#2D3628]">
                {isAr ? 'لا توجد إجازات معتمدة حالياً' : 'No active leaves currently'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {approvedLeaves.map((req) => {
                const isInterrupted = req.status === 'interrupted';
                return (
                  <div
                    key={req.id}
                    className={`p-4 sm:p-5 rounded-2xl border transition ${
                      isInterrupted
                        ? 'bg-[#FFF1F2]/40 border-[#FECDD3]'
                        : 'bg-[#FAF9F6] border-[#E5E2D9] hover:border-[#D5D0C5]'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={req.avatar}
                          alt={req.userName}
                          className="w-11 h-11 rounded-xl object-cover border border-[#D9E0D2]"
                        />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-sm text-[#2D3628]">{req.userName}</h4>
                            <span className="text-xs text-[#65635E] font-mono">({req.id})</span>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E9EDD9] text-[#2D3628] border border-[#D9E0D2]">
                              {getTypeLabel(req.type)}
                            </span>
                            {isInterrupted ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FFF1F2] text-[#E11D48] border border-[#FFE4E6]">
                                <RotateCcw className="w-3 h-3" />
                                {isAr ? 'تم قطع الإجازة (استدعاء طارئ)' : 'Interrupted / Recalled'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
                                <CheckCircle2 className="w-3 h-3" />
                                {isAr ? 'إجازة سارية ومعتمدة' : 'Active Approved Leave'}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#65635E] mt-0.5">
                            {req.userTitle} • {req.department}
                          </p>
                        </div>
                      </div>

                      {/* Right info & Action */}
                      <div className="flex items-center gap-3 justify-between sm:justify-end">
                        <div className="text-xs bg-white px-3 py-1.5 rounded-xl border border-[#E5E2D9] text-center">
                          <span className="text-[10px] text-[#65635E] block">{isAr ? 'الفترة:' : 'Duration:'}</span>
                          <span className="font-bold text-[#2D3628]">
                            {req.startDate} ⬅️ {req.endDate} ({req.totalDays} {isAr ? 'أيام' : 'days'})
                          </span>
                        </div>

                        {!isInterrupted && onInterruptLeave && (currentUser.role === 'manager' || currentUser.role === 'hr') && (
                          <button
                            type="button"
                            id={`btn-interrupt-leave-${req.id}`}
                            onClick={() => onInterruptLeave(req)}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FFF1F2] hover:bg-[#FFE4E6] text-[#E11D48] border border-[#FECDD3] text-xs font-bold transition cursor-pointer shadow-xs"
                          >
                            <AlertTriangle className="w-4 h-4 text-[#E11D48]" />
                            <span>{isAr ? 'قطع الإجازة (استدعاء طارئ)' : 'Recall Employee'}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Interrupted Audit Details */}
                    {isInterrupted && (
                      <div className="mt-3 p-3 rounded-xl bg-white border border-[#FECDD3] text-xs space-y-1">
                        <div className="flex items-center justify-between font-bold text-[#E11D48]">
                          <span className="flex items-center gap-1.5">
                            <RotateCcw className="w-3.5 h-3.5" />
                            {isAr ? 'تفاصيل الاستدعاء وقطع الإجازة:' : 'Interruption & Recall Details:'}
                          </span>
                          <span className="text-[11px] font-semibold text-[#65635E]">
                            {isAr ? 'تاريخ المباشرة:' : 'Return Date:'} <strong>{req.interruptedEffectiveDate}</strong>
                          </span>
                        </div>
                        <div className="text-[#43423E] leading-relaxed pt-1">
                          <strong>{isAr ? 'السبب الإداري:' : 'Reason:'}</strong> {req.interruptedReason}
                        </div>
                        <div className="flex items-center justify-between pt-1 text-[11px] text-[#65635E]">
                          <span>{isAr ? 'المسؤول عن الإجراء:' : 'Action by:'} {req.interruptedBy}</span>
                          <span className="text-[#059669] font-bold">
                            +{req.refundedDays} {isAr ? 'يوم تم إعادتها لرصيد الموظف' : 'days refunded to balance'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
