import React, { useState } from 'react';
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  Laptop,
  Palmtree,
  Stethoscope,
  AlertCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Calendar,
  Trash2,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import { LeaveOrWfhRequest, RequestType, RequestStatus, UserProfile } from '../types';

interface RequestsListProps {
  requests: LeaveOrWfhRequest[];
  currentUser: UserProfile;
  onCancelRequest: (requestId: string) => void;
  onInterruptLeave?: (request: LeaveOrWfhRequest) => void;
  lang: 'ar' | 'en';
}

export const RequestsList: React.FC<RequestsListProps> = ({
  requests,
  currentUser,
  onCancelRequest,
  onInterruptLeave,
  lang,
}) => {
  const isAr = lang === 'ar';
  const [activeTab, setActiveTab] = useState<'all' | 'remote' | 'annual' | 'sick' | 'pending' | 'interrupted'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E9EDD9] text-[#2D3628] border border-[#D9E0D2]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#5E7153]" />
            {isAr ? 'معتمد رسمياً' : 'Approved'}
          </span>
        );
      case 'interrupted':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FFF1F2] text-[#E11D48] border border-[#FFE4E6]">
            <RotateCcw className="w-3.5 h-3.5 text-[#E11D48]" />
            {isAr ? 'تم قطع الإجازة (استدعاء طارئ)' : 'Leave Recalled / Interrupted'}
          </span>
        );
      case 'pending_manager':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FDF3E7] text-[#8C5A28] border border-[#E5AA70]">
            <Clock className="w-3.5 h-3.5 text-[#8C5A28]" />
            {isAr ? 'بانتظار موافقة المدير' : 'Pending Manager'}
          </span>
        );
      case 'pending_hr':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E2EDF8] text-[#1E40AF] border border-[#BFDBFE]">
            <Clock className="w-3.5 h-3.5 text-[#1E40AF]" />
            {isAr ? 'بانتظار اعتماد الـ HR' : 'Pending HR'}
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FDF0EE] text-[#9E3B30] border border-[#F5C4BE]">
            <XCircle className="w-3.5 h-3.5 text-[#9E3B30]" />
            {isAr ? 'مرفوض' : 'Rejected'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#EFECE4] text-[#65635E] border border-[#E5E2D9]">
            {isAr ? 'ملغي' : 'Cancelled'}
          </span>
        );
    }
  };

  const getTypeIcon = (type: RequestType) => {
    switch (type) {
      case 'remote':
        return <Laptop className="w-4 h-4 text-[#5E7153]" />;
      case 'annual_leave':
        return <Palmtree className="w-4 h-4 text-[#5E7153]" />;
      case 'sick_leave':
        return <Stethoscope className="w-4 h-4 text-[#8C5A28]" />;
      case 'emergency_leave':
        return <AlertCircle className="w-4 h-4 text-[#9A3412]" />;
      default:
        return <Clock className="w-4 h-4 text-[#065F46]" />;
    }
  };

  const getTypeLabel = (type: RequestType) => {
    switch (type) {
      case 'remote':
        return isAr ? 'عمل عن بُعد (WFH)' : 'Remote Work';
      case 'annual_leave':
        return isAr ? 'إجازة سنوية' : 'Annual Leave';
      case 'sick_leave':
        return isAr ? 'إجازة مرضية' : 'Sick Leave';
      case 'emergency_leave':
        return isAr ? 'إجازة اضطرارية' : 'Emergency Leave';
      case 'half_day':
        return isAr ? 'استئذان (نصف يوم)' : 'Half-day Leave';
      default:
        return isAr ? 'دوام مرن' : 'Flexible Hours';
    }
  };

  // Filter requests
  const filtered = (requests || []).filter((r) => {
    if (!r) return false;
    if (activeTab === 'remote' && r.type !== 'remote') return false;
    if (activeTab === 'annual' && r.type !== 'annual_leave') return false;
    if (activeTab === 'sick' && r.type !== 'sick_leave' && r.type !== 'emergency_leave') return false;
    if (activeTab === 'pending' && r.status !== 'pending_manager' && r.status !== 'pending_hr') return false;
    if (activeTab === 'interrupted' && r.status !== 'interrupted') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = (r.userName || '').toLowerCase().includes(q);
      const matchId = (r.id || '').toLowerCase().includes(q);
      const matchReason = (r.reason || '').toLowerCase().includes(q);
      const matchDept = (r.department || '').toLowerCase().includes(q);
      return matchName || matchId || matchReason || matchDept;
    }
    return true;
  });

  return (
    <div className="bg-white border border-[#E5E2D9] rounded-3xl p-5 sm:p-6 shadow-sm space-y-6">
      
      {/* Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-[#2D3628] flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#5E7153]" />
            <span>{isAr ? 'سجل طلبات العمل عن بُعد والإجازات' : 'Requests Log & Leave Governance'}</span>
          </h3>
          <p className="text-xs text-[#65635E] mt-0.5">
            {isAr
              ? 'متابعة مسار الاعتمادات وتاريخ الطلبات، مع إمكانية استدعاء وقطع الإجازات الطارئة'
              : 'Track approval pipelines, active archives, and emergency leave interruption audits'}
          </p>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-72">
          <Search className={`absolute ${isAr ? 'right-3' : 'left-3'} top-2.5 w-4 h-4 text-[#65635E]`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? 'البحث بالاسم، الرقم، أو السبب...' : 'Search by name, ID, reason...'}
            className={`w-full ${isAr ? 'pr-9 pl-3' : 'pl-9 pr-3'} py-2 bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl text-xs text-[#43423E] placeholder-[#9A9890] focus:outline-none focus:border-[#5E7153]`}
          />
        </div>
      </div>

      {/* Tabs Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#E5E2D9] text-xs">
        {[
          { id: 'all', labelAr: 'جميع الطلبات', labelEn: 'All Requests', count: requests.length },
          { id: 'remote', labelAr: 'العمل عن بُعد', labelEn: 'Remote (WFH)', count: requests.filter((r) => r.type === 'remote').length },
          { id: 'annual', labelAr: 'الإجازات السنوية', labelEn: 'Annual Leaves', count: requests.filter((r) => r.type === 'annual_leave').length },
          { id: 'sick', labelAr: 'المرضية والاضطرارية', labelEn: 'Sick & Emergency', count: requests.filter((r) => r.type === 'sick_leave' || r.type === 'emergency_leave').length },
          { id: 'pending', labelAr: 'قيد المراجعة', labelEn: 'Pending Review', count: requests.filter((r) => r.status.startsWith('pending')).length },
          { id: 'interrupted', labelAr: 'مقطوعة (استدعاء طارئ)', labelEn: 'Recalled/Interrupted', count: requests.filter((r) => r.status === 'interrupted').length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-medium whitespace-nowrap transition cursor-pointer ${
              activeTab === tab.id
                ? 'bg-[#5E7153] text-white font-bold shadow-xs'
                : 'text-[#65635E] hover:text-[#2D3628] hover:bg-[#EFECE4]'
            }`}
          >
            <span>{isAr ? tab.labelAr : tab.labelEn}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              activeTab === tab.id ? 'bg-[#4B5B42] text-[#E9EDD9]' : 'bg-[#EFECE4] text-[#65635E]'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Requests Table / Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-[#E5E2D9] rounded-2xl">
          <Calendar className="w-10 h-10 text-[#C8C4B7] mx-auto mb-2" />
          <p className="text-sm font-semibold text-[#2D3628]">
            {isAr ? 'لا توجد طلبات مطابقة للبحث أو الفلتر المحدد' : 'No requests matching your query'}
          </p>
          <p className="text-xs text-[#65635E] mt-1">
            {isAr ? 'يمكنك تقديم طلب جديد عبر الزر أعلى الصفحة' : 'You can submit a new request using the top button'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => {
            const isExpanded = expandedId === req.id;
            const isOwnRequest = req.userId === currentUser.id;
            const isInterrupted = req.status === 'interrupted';
            const canInterrupt =
              !isInterrupted &&
              req.status === 'approved' &&
              (req.type === 'annual_leave' || req.type === 'sick_leave' || req.type === 'emergency_leave') &&
              (currentUser.role === 'manager' || currentUser.role === 'hr');

            return (
              <div
                key={req.id}
                className={`border rounded-2xl transition-all ${
                  isInterrupted
                    ? 'bg-[#FFF1F2]/30 border-[#FECDD3]'
                    : isExpanded
                    ? 'bg-[#FAF9F6] border-[#5E7153]/50 shadow-xs ring-1 ring-[#5E7153]/20'
                    : 'bg-[#FAF9F6] hover:bg-[#F5F3ED] border-[#E5E2D9]'
                }`}
              >
                {/* Summary Row */}
                <div
                  onClick={() => toggleExpand(req.id)}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none"
                >
                  {/* Left info */}
                  <div className="flex items-start sm:items-center gap-3.5">
                    <img
                      src={req.avatar}
                      alt={req.userName}
                      className="w-10 h-10 rounded-xl object-cover border border-[#E5E2D9] mt-0.5 sm:mt-0"
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-[#2D3628]">{req.userName}</span>
                        <span className="text-[11px] text-[#65635E] font-mono">({req.id})</span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#EFECE4] text-[11px] font-semibold text-[#43423E] border border-[#E5E2D9]">
                          {getTypeIcon(req.type)}
                          <span>{getTypeLabel(req.type)}</span>
                        </span>
                      </div>
                      <div className="text-xs text-[#65635E] mt-1 flex items-center gap-2 flex-wrap">
                        <span>{req.department}</span>
                        <span>•</span>
                        <span className="text-[#5E7153] font-semibold">
                          {req.startDate} {req.startDate !== req.endDate ? `⬅️ ${req.endDate}` : ''} ({req.totalDays} {isAr ? 'أيام' : 'days'})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right badges & arrow */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E5E2D9]">
                    <div>{getStatusBadge(req.status)}</div>
                    <button
                      type="button"
                      aria-label="Toggle details"
                      className="p-1 rounded-lg text-[#65635E] hover:text-[#2D3628]"
                    >
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-[#E5E2D9] space-y-4 text-xs animate-in fade-in duration-150">
                    
                    {/* Reason text */}
                    <div className="p-3.5 rounded-xl bg-white border border-[#E5E2D9] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#2D3628] flex items-center gap-1.5">
                          {isAr ? 'سبب ومبرر الطلب:' : 'Request Justification:'}
                        </span>
                        {req.isAiGeneratedReason && (
                          <span className="text-[10px] text-[#2D3628] flex items-center gap-1 bg-[#E9EDD9] px-2 py-0.5 rounded-full border border-[#D9E0D2]">
                            <Sparkles className="w-3 h-3 text-[#5E7153]" />
                            {isAr ? 'تمت الصياغة بواسطة Gemini AI' : 'Drafted by Gemini AI'}
                          </span>
                        )}
                      </div>
                      <p className="text-[#43423E] leading-relaxed text-xs sm:text-sm">
                        {req.reason}
                      </p>
                    </div>

                    {/* Interrupted Audit Box */}
                    {isInterrupted && (
                      <div className="p-3.5 rounded-xl bg-white border border-[#FECDD3] text-xs space-y-2">
                        <div className="flex items-center justify-between font-bold text-[#E11D48]">
                          <span className="flex items-center gap-1.5">
                            <RotateCcw className="w-4 h-4" />
                            {isAr ? 'إجراء قطع الإجازة والاستدعاء الطارئ:' : 'Emergency Interruption Audit:'}
                          </span>
                          <span className="text-[11px] font-semibold text-[#65635E]">
                            {isAr ? 'تاريخ المباشرة الفعلي:' : 'Effective Return Date:'} <strong>{req.interruptedEffectiveDate}</strong>
                          </span>
                        </div>
                        <p className="text-[#43423E] leading-relaxed">
                          <strong>{isAr ? 'سبب الاستدعاء الطارئ:' : 'Recall Reason:'}</strong> {req.interruptedReason}
                        </p>
                        <div className="flex items-center justify-between pt-1 border-t border-[#FFE4E6] text-[11px]">
                          <span className="text-[#65635E]">{isAr ? 'المسؤول الإداري:' : 'Authorized by:'} {req.interruptedBy}</span>
                          <span className="text-[#059669] font-bold">
                            +{req.refundedDays} {isAr ? 'أيام أعيدت لرصيد الموظف تلقائياً' : 'days refunded to employee balance'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Handover & Plan */}
                    {(req.handoverColleague || (req.type === 'remote' && req.handoverPlan)) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {req.handoverColleague && (
                          <div className="p-3 rounded-xl bg-white border border-[#E5E2D9]">
                            <span className="text-[#65635E] block mb-0.5">{isAr ? 'الزميل المفوض بالتغطية:' : 'Coverage Colleague:'}</span>
                            <span className="font-bold text-[#2D3628]">{req.handoverColleague}</span>
                          </div>
                        )}
                        {req.type === 'remote' && req.handoverPlan && (
                          <div className="p-3 rounded-xl bg-white border border-[#E5E2D9]">
                            <span className="text-[#65635E] block mb-0.5">{isAr ? 'خطة التسليم والمتابعة:' : 'Handover Plan:'}</span>
                            <span className="text-[#43423E]">{req.handoverPlan}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Manager / HR Notes */}
                    {req.managerNotes && (
                      <div className="p-3 rounded-xl bg-[#E9EDD9]/60 border border-[#D9E0D2] text-[#2D3628]">
                        <span className="font-bold block mb-0.5">{isAr ? 'ملاحظات المدير المباشر:' : 'Manager Notes:'}</span>
                        <span>{req.managerNotes}</span>
                      </div>
                    )}

                    {/* Actions bar */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E2D9]">
                      {/* Cancel request if pending & owner */}
                      {isOwnRequest && req.status.startsWith('pending') && (
                        <button
                          type="button"
                          onClick={() => onCancelRequest(req.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FDF0EE] hover:bg-[#FCE3E0] text-[#9E3B30] border border-[#F5C4BE] text-xs font-semibold transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{isAr ? 'إلغاء الطلب' : 'Cancel Request'}</span>
                        </button>
                      )}

                      {/* Interrupt Leave if Manager/HR and approved active leave */}
                      {canInterrupt && onInterruptLeave && (
                        <button
                          type="button"
                          onClick={() => onInterruptLeave(req)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FFF1F2] hover:bg-[#FFE4E6] text-[#E11D48] border border-[#FECDD3] text-xs font-bold transition cursor-pointer shadow-xs"
                        >
                          <AlertTriangle className="w-4 h-4 text-[#E11D48]" />
                          <span>{isAr ? 'قطع الإجازة واستدعاء الموظف (إجراء طارئ)' : 'Recall Employee / Interrupt Leave'}</span>
                        </button>
                      )}
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
