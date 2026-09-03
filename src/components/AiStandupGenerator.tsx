import React, { useState } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  Send,
  Loader2,
  X,
  FileText,
  Clock,
  Laptop,
  CheckSquare,
  ArrowRight,
} from 'lucide-react';
import { UserProfile, DailyTaskItem } from '../types';
import { api } from '../services/api';

interface AiStandupGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onSyncTasksToReminder?: (tasks: DailyTaskItem[]) => void;
  lang: 'ar' | 'en';
}

export const AiStandupGenerator: React.FC<AiStandupGeneratorProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSyncTasksToReminder,
  lang,
}) => {
  if (!isOpen) return null;

  const isAr = lang === 'ar';
  const [roughNotes, setRoughNotes] = useState(
    isAr
      ? '1. الانتهاء من فحص واجهة المستخدم واعتماد الطلبات\n2. مراجعة كود Cloud Run على المنفذ 3000\n3. اجتماع مزامنة الفريق الساعة 2:00 م'
      : '1. Finalize Dawamy UI and request workflows\n2. Verify Cloud Run port 3000 server deployment\n3. 2:00 PM team sync'
  );

  const [formattedReport, setFormattedReport] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [synced, setSynced] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await api.generateStandup({
        tasks: roughNotes,
        employeeName: currentUser.name,
        department: currentUser.department,
        language: lang,
      });

      setFormattedReport(res.summary);
    } catch {
      setFormattedReport(
        isAr
          ? `📋 تقرير الستاند-أب اليومي للعمل عن بعد (${currentUser.name}):\n• المهام المستهدفة: ${roughNotes}\n• ساعات التواجد: من 09:00 ص إلى 05:00 م (ساعات الاتصال المباشر 10ص - 4م)\n• قنوات التواصل: متاح باستمرار عبر سلاك والبريد الإلكتروني.`
          : `📋 Daily Remote Standup (${currentUser.nameEn}):\n• Target Milestones: ${roughNotes}\n• Working Hours: 09:00 AM - 05:00 PM\n• Communication: Active on Slack and Teams.`
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!formattedReport) return;
    navigator.clipboard.writeText(formattedReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSyncToReminder = () => {
    if (!onSyncTasksToReminder) return;

    // Split roughNotes into individual task lines
    const lines = roughNotes
      .split('\n')
      .map((l) => l.replace(/^[\d\.\-\*\•\s]+/, '').trim())
      .filter((l) => l.length > 0);

    const defaultTimes = ['11:30 AM', '02:00 PM', '03:30 PM', '05:00 PM'];

    const newTasks: DailyTaskItem[] = lines.map((line, idx) => ({
      id: `task-sync-${Date.now()}-${idx}`,
      title: line,
      dueTime: defaultTimes[idx % defaultTimes.length],
      completed: false,
      priority: idx === 0 ? 'high' : 'medium',
      category: isAr ? 'مهام الستاند-أب اليومي' : 'Daily Standup',
      createdAt: new Date().toISOString(),
    }));

    if (newTasks.length > 0) {
      onSyncTasksToReminder(newTasks);
      setSynced(true);
      setTimeout(() => setSynced(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2D3628]/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white border border-[#E5E2D9] rounded-3xl shadow-2xl p-6 sm:p-8 my-8 text-[#43423E] animate-in fade-in zoom-in-95 duration-200 space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E5E2D9]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#E9EDD9] text-[#2D3628] border border-[#D9E0D2]">
              <Sparkles className="w-5 h-5 text-[#5E7153]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#2D3628]">
                {isAr ? 'منشئ موجز الستاند-أب الذكي (Gemini Standup)' : 'AI Daily Standup Formatter'}
              </h3>
              <p className="text-xs text-[#65635E]">
                {isAr ? 'صياغة تقرير صباحي أنيق ومزامنة قائمة تذكير المهام لليوم' : 'Format rough notes & sync with today’s task reminder'}
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

        {/* Notes Input */}
        <div>
          <label className="block text-xs font-semibold text-[#2D3628] mb-1.5 flex items-center justify-between">
            <span>{isAr ? 'المهام والأنشطة التي ستعمل عليها اليوم:' : 'Your Tasks & Goals for Today:'}</span>
            <span className="text-[10px] text-[#5E7153] font-normal">{isAr ? 'اكتب نقاطاً سريعة' : 'Rough notes'}</span>
          </label>
          <textarea
            rows={4}
            value={roughNotes}
            onChange={(e) => setRoughNotes(e.target.value)}
            placeholder={isAr ? 'اكتب مهامك باختصار...' : 'Write your planned tasks...'}
            className="w-full px-3.5 py-2.5 bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl text-xs sm:text-sm text-[#43423E] placeholder-[#9A9890] focus:outline-none focus:border-[#5E7153] leading-relaxed"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Format Action Button */}
          <button
            type="button"
            id="btn-format-standup"
            onClick={handleGenerate}
            disabled={isGenerating || !roughNotes.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#5E7153] hover:bg-[#4E5F44] disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md shadow-[#5E7153]/20 transition"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isAr ? 'جاري الصياغة والتنسيق بالذكاء الاصطناعي...' : 'Formatting with Gemini...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{isAr ? 'تنسيق التقرير بالذكاء الاصطناعي' : 'Generate Formatted Standup'}</span>
              </>
            )}
          </button>

          {/* Sync to Daily Tasks Reminder */}
          {onSyncTasksToReminder && (
            <button
              type="button"
              id="btn-sync-to-reminder"
              onClick={handleSyncToReminder}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#E9EDD9] hover:bg-[#D9E0D2] text-[#2D3628] border border-[#D9E0D2] font-bold text-xs sm:text-sm transition shadow-xs"
              title={isAr ? 'تحديث ومزامنة المهام في لوحة تذكير المهام اليومية' : 'Sync tasks into your Daily Tasks Reminder'}
            >
              {synced ? <Check className="w-4 h-4 text-[#5E7153]" /> : <CheckSquare className="w-4 h-4 text-[#5E7153]" />}
              <span>{synced ? (isAr ? 'تمت المزامنة بنجاح!' : 'Tasks Synced!') : (isAr ? 'مزامنة مع تذكير المهام' : 'Sync to Task Reminder')}</span>
            </button>
          )}
        </div>

        {/* Output Box */}
        {formattedReport && (
          <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#5E7153]/40 space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#2D3628] flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#5E7153]" />
                {isAr ? 'التقرير الجاهز للمشاركة:' : 'Ready-to-share Standup Report:'}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 px-3 py-1 bg-[#E9EDD9] hover:bg-[#D9E0D2] text-[#2D3628] border border-[#D9E0D2] rounded-lg text-xs font-semibold transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#5E7153]" /> : <Copy className="w-3.5 h-3.5 text-[#5E7153]" />}
                <span>{copied ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ التقرير' : 'Copy')}</span>
              </button>
            </div>

            <textarea
              rows={5}
              value={formattedReport}
              onChange={(e) => setFormattedReport(e.target.value)}
              className="w-full p-3 bg-white border border-[#E5E2D9] rounded-xl text-xs text-[#43423E] leading-relaxed font-mono focus:outline-none"
            />
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-[#E5E2D9]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#FAF9F6] hover:bg-[#EFECE4] text-[#65635E] rounded-xl text-xs font-semibold transition"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
