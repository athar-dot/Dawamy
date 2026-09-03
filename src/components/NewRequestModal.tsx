import React, { useState } from 'react';
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
} from 'lucide-react';
import { UserProfile, RequestType, LeaveOrWfhRequest } from '../types';
import { api } from '../services/api';

interface NewRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  teamMembers: { id: string; name: string; role: string }[];
  onSubmitRequest: (request: Omit<LeaveOrWfhRequest, 'id' | 'createdAt' | 'status'>) => void;
  lang: 'ar' | 'en';
}

export const NewRequestModal: React.FC<NewRequestModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  teamMembers,
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

  // AI Generator state
  const [aiKeywords, setAiKeywords] = useState('');
  const [aiTone, setAiTone] = useState<'formal' | 'concise' | 'urgent'>('formal');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState('');

  // Calculate working days (approx: at least 1 day, calculated between start and end)
  const calculateDays = () => {
    if (!startDate || !endDate) return 1;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) return 1;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const totalDays = calculateDays();

  const handleGenerateAiReason = async () => {
    setIsGeneratingAi(true);
    setAiError('');
    try {
      const toneLabel =
        aiTone === 'formal'
          ? (isAr ? 'رسمي ومهذب' : 'Formal & polite')
          : aiTone === 'concise'
          ? (isAr ? 'مختصر ومباشر' : 'Concise & direct')
          : (isAr ? 'طارئ ومقنع' : 'Urgent & persuasive');

      const res = await api.generateReason({
        type,
        keywords: aiKeywords || (type === 'remote' ? 'تركيز على التسليمات' : 'إجازة مستحقة'),
        tone: toneLabel,
        role: currentUser.title,
        department: currentUser.department,
        language: lang,
      });

      if (res.reason) {
        setReason(res.reason);
        setIsAiReason(true);
      }
    } catch (err: any) {
      setAiError(isAr ? 'تعذر إنشاء المبرر حالياً، يرجى كتابته يدوياً.' : 'Failed to generate AI reason.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert(isAr ? 'يرجى كتابة سبب أو مبرر الطلب' : 'Please provide a reason for the request');
      return;
    }

    onSubmitRequest({
      userId: currentUser.id,
      userName: currentUser.name,
      userTitle: currentUser.title,
      department: currentUser.department,
      avatar: currentUser.avatar,
      type,
      startDate,
      endDate,
      totalDays,
      reason,
      isAiGeneratedReason: isAiReason,
      handoverColleague,
      handoverPlan: type === 'remote' ? handoverPlan.trim() : '',
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2D3628]/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white border border-[#E5E2D9] rounded-3xl shadow-2xl p-6 sm:p-8 my-8 text-[#43423E] animate-in fade-in zoom-in-95 duration-200">
        
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
                {isAr ? 'سيتم إرسال الطلب للاعتماد إلى مديرك المباشر وقسم الموارد البشرية' : 'Your request will be routed for Manager & HR approvals'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#FAF9F6] hover:bg-[#EFECE4] text-[#65635E] hover:text-[#2D3628] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          
          {/* 1. Request Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-[#2D3628] mb-2">
              {isAr ? 'نوع الطلب المُراد تقديمه:' : 'Select Request Type:'}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { id: 'remote', labelAr: 'عمل عن بعد (WFH)', labelEn: 'Remote (WFH)', icon: Laptop, color: 'text-[#2D3628] border-[#5E7153] bg-[#E9EDD9]' },
                { id: 'annual_leave', labelAr: 'إجازة سنوية', labelEn: 'Annual Leave', icon: Palmtree, color: 'text-[#1E40AF] border-[#3B82F6] bg-[#EFF6FF]' },
                { id: 'sick_leave', labelAr: 'إجازة مرضية', labelEn: 'Sick Leave', icon: Stethoscope, color: 'text-[#8C5A28] border-[#E5AA70] bg-[#FDF3E7]' },
                { id: 'emergency_leave', labelAr: 'إجازة اضطرارية', labelEn: 'Emergency', icon: AlertCircle, color: 'text-[#9A3412] border-[#F97316] bg-[#FFF7ED]' },
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
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all ${
                      isSelected
                        ? `${item.color} font-bold ring-2 ring-[#5E7153]/40 shadow-sm`
                        : 'border-[#E5E2D9] bg-[#FAF9F6] text-[#65635E] hover:border-[#D9E0D2] hover:text-[#2D3628]'
                    }`}
                  >
                    <Icon className="w-5 h-5 mb-1.5" />
                    <span className="text-xs">{isAr ? item.labelAr : item.labelEn}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Date Selection & Total Days Counter */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#2D3628] mb-1.5">
                {isAr ? 'تاريخ البدء:' : 'Start Date:'}
              </label>
              <div className="relative">
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
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2D3628] mb-1.5">
                {isAr ? 'تاريخ الانتهاء:' : 'End Date:'}
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl text-xs sm:text-sm text-[#43423E] focus:outline-none focus:border-[#5E7153] transition"
                  required
                />
              </div>
            </div>
          </div>

          {/* Days notice pill */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF9F6] border border-[#E5E2D9] text-xs">
            <span className="text-[#65635E] flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#5E7153]" />
              {isAr ? 'المدة الإجمالية المحتسبة:' : 'Calculated Duration:'}
            </span>
            <span className="font-bold text-[#2D3628] bg-[#E9EDD9] px-2.5 py-1 rounded-lg border border-[#D9E0D2]">
              {totalDays} {isAr ? (totalDays === 1 ? 'يوم عمل' : 'أيام') : (totalDays === 1 ? 'day' : 'days')}
            </span>
          </div>

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
                ? 'أدخل كلمات مفتاحية بسيطة أو هدفك وسيقوم الذكاء الاصطناعي بصياغة مبرر رسمي مقنع واحترافي لتقديمه لمديرك.'
                : 'Enter keywords or your primary intent, and Gemini will generate a polished, professional justification for management.'}
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={aiKeywords}
                onChange={(e) => setAiKeywords(e.target.value)}
                placeholder={
                  isAr
                    ? 'مثال: إنهاء مراجعة الكود واختبارات الأداء، ظرف عائلي...'
                    : 'e.g. Focus on sprint milestones, medical checkup...'
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
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#5E7153] hover:bg-[#4E5F44] text-white rounded-xl text-xs font-bold transition disabled:opacity-50 shadow-sm"
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

          {/* 5. Handover Colleague & Handover Plan (Only for Remote Work) */}
          <div className={`grid grid-cols-1 ${type === 'remote' ? 'sm:grid-cols-2' : ''} gap-4 pt-2 border-t border-[#E5E2D9]`}>
            <div>
              <label className="block text-xs font-semibold text-[#2D3628] mb-1.5 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-[#5E7153]" />
                {isAr ? 'الزميل المفوض للتغطية والمتابعة:' : 'Handover / Coverage Colleague:'}
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

            {type === 'remote' && (
              <div>
                <label className="block text-xs font-semibold text-[#2D3628] mb-1.5">
                  {isAr ? 'خطة تسليم المهام أثناء الغياب/الدوام:' : 'Handover & Availability Plan:'}
                </label>
                <input
                  type="text"
                  value={handoverPlan}
                  onChange={(e) => setHandoverPlan(e.target.value)}
                  placeholder={isAr ? 'مثال: تم إيداع الكود ومتاح على الهاتف للطوارئ' : 'e.g. Code merged, available via phone'}
                  className="w-full px-3.5 py-2.5 bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl text-xs sm:text-sm text-[#43423E] placeholder-[#9A9890] focus:outline-none focus:border-[#5E7153]"
                />
              </div>
            )}
          </div>

          {/* Submit and Cancel Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5E2D9]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-[#FAF9F6] hover:bg-[#EFECE4] text-[#65635E] text-xs sm:text-sm font-semibold transition"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>

            <button
              type="submit"
              id="btn-submit-request-form"
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#5E7153] hover:bg-[#4E5F44] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#5E7153]/20 transition"
            >
              <Send className="w-4 h-4" />
              <span>{isAr ? 'إرسال الطلب للاعتماد' : 'Submit for Approval'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
