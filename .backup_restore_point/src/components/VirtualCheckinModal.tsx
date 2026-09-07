import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  MapPin,
  Laptop,
  CheckCircle,
  Coffee,
  Building,
  Target,
  Send,
  Zap,
} from 'lucide-react';
import { UserProfile, WorkStatus } from '../types';

interface VirtualCheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onConfirmCheckin: (status: WorkStatus, locationStr: string, tasks: string[]) => void;
  lang: 'ar' | 'en';
}

export const VirtualCheckinModal: React.FC<VirtualCheckinModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onConfirmCheckin,
  lang,
}) => {
  if (!isOpen) return null;

  const isAr = lang === 'ar';
  const [selectedStatus, setSelectedStatus] = useState<WorkStatus>('wfh_active');
  const [locationType, setLocationType] = useState('home');
  const [taskInput, setTaskInput] = useState('');
  const [tasks, setTasks] = useState<string[]>(currentUser.currentTasks || [
    isAr ? 'التركيز على إنجاز ميزات منصة دوامي' : 'Complete Dawamy core deliverables',
    isAr ? 'مراجعة طلبات الفريق والتواصل عبر سلاك' : 'Review team requests and Slack syncs',
  ]);
  const [liveTime, setLiveTime] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setLiveTime(
        now.toLocaleTimeString(isAr ? 'ar-SA' : 'en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [isAr]);

  const handleAddTask = () => {
    if (taskInput.trim()) {
      setTasks([...tasks, taskInput.trim()]);
      setTaskInput('');
    }
  };

  const handleRemoveTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const handleConfirm = () => {
    const locName =
      locationType === 'home'
        ? (isAr ? 'من المنزل (عن بُعد)' : 'From Home (WFH)')
        : locationType === 'coworking'
        ? (isAr ? 'مساحة عمل مشتركة' : 'Co-working Space')
        : (isAr ? 'المقر الرئيسي' : 'HQ Main Office');

    onConfirmCheckin(selectedStatus, locName, tasks);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 bg-[#2D3628]/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white border border-[#E5E2D9] rounded-3xl shadow-2xl my-auto text-[#43423E] animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        
        {/* Header - Fixed */}
        <div className="flex items-center justify-between p-5 sm:p-6 pb-4 border-b border-[#E5E2D9] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#E9EDD9] text-[#2D3628] border border-[#D9E0D2]">
              <Clock className="w-5 h-5 text-[#5E7153]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#2D3628]">
                {isAr ? 'تسجيل الحضور الافتراضي وتأكيد التواجد' : 'Virtual Attendance Check-In'}
              </h3>
              <p className="text-[11px] sm:text-xs text-[#65635E]">
                {isAr ? 'إثبات حضور ساعات العمل وبث حالتك لفريق العمل' : 'Log your core working hours & broadcast availability'}
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

        {/* Scrollable Modal Content */}
        <div className="p-5 sm:p-6 pt-4 space-y-5 overflow-y-auto">
          
          {/* Live digital clock card */}
          <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E5E2D9] text-center">
            <span className="text-[11px] font-semibold text-[#65635E] block mb-1">
              {isAr ? 'التوقيت المحلي المعتمد للحضور:' : 'Current Verified Timestamp:'}
            </span>
            <div className="text-3xl font-black tracking-wider text-[#5E7153] font-mono">
              {liveTime}
            </div>
            <span className="text-[10px] text-[#5E7153] mt-1 inline-flex items-center gap-1 font-medium">
              <span className="w-2 h-2 rounded-full bg-[#5E7153] animate-ping" />
              {isAr ? 'المنظومة متصلة بالخادم Cloud Run :3000' : 'Connected to Cloud Run Service :3000'}
            </span>
          </div>

          {/* Location Mode */}
          <div>
            <label className="block text-xs font-semibold text-[#2D3628] mb-2">
              {isAr ? 'مكان العمل اليوم:' : 'Working Location Today:'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'home', labelAr: 'المنزل (WFH)', labelEn: 'Home (WFH)', icon: Laptop },
                { id: 'coworking', labelAr: 'مساحة عمل', labelEn: 'Coworking', icon: Coffee },
                { id: 'office', labelAr: 'المكتب', labelEn: 'Office HQ', icon: Building },
              ].map((loc) => {
                const Icon = loc.icon;
                const isSelected = locationType === loc.id;
                return (
                  <button
                    type="button"
                    key={loc.id}
                    onClick={() => setLocationType(loc.id)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition ${
                      isSelected
                        ? 'bg-[#E9EDD9] border-[#5E7153] text-[#2D3628] font-bold'
                        : 'bg-[#FAF9F6] border-[#E5E2D9] text-[#65635E] hover:border-[#D9E0D2] hover:text-[#2D3628]'
                    }`}
                  >
                    <Icon className="w-4 h-4 mb-1 text-[#5E7153]" />
                    <span>{isAr ? loc.labelAr : loc.labelEn}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status broadcast */}
          <div>
            <label className="block text-xs font-semibold text-[#2D3628] mb-2">
              {isAr ? 'الحالة المعروضة للفريق:' : 'Current Status Broadcast:'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'wfh_active', labelAr: 'متاح للاتصال والمهام', labelEn: 'Active & Available' },
                { id: 'deep_focus', labelAr: 'جلسة تركيز ديب وورك', labelEn: 'Deep Focus Mode' },
                { id: 'in_meeting', labelAr: 'في اجتماع افتراضي', labelEn: 'In a Virtual Meeting' },
                { id: 'in_office', labelAr: 'في المكتب الرئيسي', labelEn: 'In Office HQ' },
              ].map((st) => (
                <button
                  type="button"
                  key={st.id}
                  onClick={() => setSelectedStatus(st.id as WorkStatus)}
                  className={`p-2.5 rounded-xl border text-xs text-right transition ${
                    selectedStatus === st.id
                      ? 'bg-[#E9EDD9] border-[#5E7153] text-[#2D3628] font-semibold'
                      : 'bg-[#FAF9F6] border-[#E5E2D9] text-[#65635E] hover:text-[#2D3628] hover:border-[#D9E0D2]'
                  }`}
                >
                  {isAr ? st.labelAr : st.labelEn}
                </button>
              ))}
            </div>
          </div>

          {/* Daily Goals / Plan Tasks */}
          <div>
            <label className="block text-xs font-semibold text-[#2D3628] mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-[#5E7153]" />
                {isAr ? 'أهداف ومهام اليوم الرئيسية:' : 'Today Key Deliverables:'}
              </span>
              <span className="text-[10px] text-[#65635E]">{tasks.length} {isAr ? 'مهام' : 'tasks'}</span>
            </label>

            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTask())}
                placeholder={isAr ? 'أضف مهمة واضغط Enter...' : 'Add task and press Enter...'}
                className="flex-1 px-3 py-2 bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl text-xs text-[#43423E] placeholder-[#9A9890] focus:outline-none focus:border-[#5E7153]"
              />
              <button
                type="button"
                onClick={handleAddTask}
                className="px-3 py-2 bg-[#E9EDD9] hover:bg-[#D9E0D2] text-[#2D3628] text-xs font-semibold rounded-xl transition border border-[#D9E0D2]"
              >
                {isAr ? 'إضافة' : 'Add'}
              </button>
            </div>

            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {tasks.map((t, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg bg-[#FAF9F6] border border-[#E5E2D9] text-xs text-[#43423E]"
                >
                  <span className="truncate">{t}</span>
                  <button
                    onClick={() => handleRemoveTask(idx)}
                    className="text-[#65635E] hover:text-[#DC2626] p-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5E2D9]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-[#FAF9F6] hover:bg-[#EFECE4] text-[#65635E] text-xs font-semibold transition"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="button"
              id="btn-confirm-checkin"
              onClick={handleConfirm}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#5E7153] hover:bg-[#4E5F44] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#5E7153]/20 transition"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isAr ? 'تأكيد الحضور وبدء الدوام' : 'Confirm Check-In'}</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
