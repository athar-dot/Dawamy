import React, { useState } from 'react';
import {
  Building2,
  Clock,
  Calendar,
  ShieldCheck,
  Check,
  X,
  AlertCircle,
  HelpCircle,
  Briefcase,
  Sliders,
  Sparkles,
  Info,
} from 'lucide-react';
import { CompanyWorkSchedule } from '../types';
import {
  WORK_SCHEDULE_PRESETS,
  DAYS_OF_WEEK_INFO,
  parseTimeToMinutes,
  formatMinutesToTime,
} from '../utils/workScheduleUtils';

interface CompanyScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSchedule: CompanyWorkSchedule;
  onSaveSchedule: (updated: CompanyWorkSchedule) => Promise<void> | void;
  lang: 'ar' | 'en';
}

export const CompanyScheduleModal: React.FC<CompanyScheduleModalProps> = ({
  isOpen,
  onClose,
  currentSchedule,
  onSaveSchedule,
  lang,
}) => {
  const isAr = lang === 'ar';

  const [companyName, setCompanyName] = useState(currentSchedule.companyName || '');
  const [selectedPreset, setSelectedPreset] = useState<CompanyWorkSchedule['preset']>(currentSchedule.preset || 'sun_thu_8h');
  const [workDays, setWorkDays] = useState<number[]>(currentSchedule.workDays || [0, 1, 2, 3, 4]);
  const [dailyWorkHours, setDailyWorkHours] = useState<number>(currentSchedule.dailyWorkHours || 8.0);
  const [startTime, setStartTime] = useState<string>(currentSchedule.startTime || '08:00');
  const [endTime, setEndTime] = useState<string>(currentSchedule.endTime || '16:00');
  const [checkInGraceMinutes, setCheckInGraceMinutes] = useState<number>(currentSchedule.checkInGraceMinutes ?? 15);
  const [checkOutGraceMinutes, setCheckOutGraceMinutes] = useState<number>(currentSchedule.checkOutGraceMinutes ?? 5);
  const [description, setDescription] = useState<string>(currentSchedule.description || '');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle Preset Selection
  const handlePresetSelect = (presetId: CompanyWorkSchedule['preset']) => {
    setSelectedPreset(presetId);
    const preset = WORK_SCHEDULE_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setWorkDays(preset.workDays);
      setDailyWorkHours(preset.dailyWorkHours);
      setStartTime(preset.startTime);
      setEndTime(preset.endTime);
      setCheckInGraceMinutes(preset.checkInGraceMinutes);
      setCheckOutGraceMinutes(preset.checkOutGraceMinutes);
      setDescription(isAr ? preset.descriptionAr : preset.descriptionEn);
    }
  };

  // Toggle single work day
  const toggleDay = (dayIndex: number) => {
    setSelectedPreset('custom');
    if (workDays.includes(dayIndex)) {
      if (workDays.length <= 1) {
        setErrorMsg(isAr ? 'يجب الإبقاء على يوم عمل واحد على الأقل في الأسبوع' : 'At least one work day must remain selected');
        return;
      }
      setWorkDays(workDays.filter((d) => d !== dayIndex));
    } else {
      setWorkDays([...workDays, dayIndex].sort((a, b) => a - b));
    }
    setErrorMsg(null);
  };

  // Auto-calculate difference between start and end
  const startMins = parseTimeToMinutes(startTime) ?? 8 * 60;
  const endMins = parseTimeToMinutes(endTime) ?? 16 * 60;
  const spanHours = Math.max(0, Math.round(((endMins - startMins) / 60) * 10) / 10);
  const totalWeeklyHours = Math.round(dailyWorkHours * workDays.length * 10) / 10;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!companyName.trim()) {
      setErrorMsg(isAr ? 'يرجى إدخال اسم المنشأة / الشركة' : 'Company name is required');
      return;
    }

    if (workDays.length === 0) {
      setErrorMsg(isAr ? 'يرجى اختيار أيام العمل الرسمية' : 'Select at least one work day');
      return;
    }

    if (dailyWorkHours <= 0 || dailyWorkHours > 24) {
      setErrorMsg(isAr ? 'ساعات العمل اليومية يجب أن تكون بين 1 و 24 ساعة' : 'Daily work hours must be between 1 and 24');
      return;
    }

    try {
      setIsSaving(true);
      const updated: CompanyWorkSchedule = {
        ...currentSchedule,
        companyName: companyName.trim(),
        preset: selectedPreset,
        workDays,
        dailyWorkHours: Number(dailyWorkHours),
        startTime,
        endTime,
        checkInGraceMinutes: Number(checkInGraceMinutes),
        checkOutGraceMinutes: Number(checkOutGraceMinutes),
        description: description.trim() || undefined,
        updatedAt: new Date().toISOString(),
        updatedBy: 'مدير الموارد البشرية (HR)',
      };

      await onSaveSchedule(updated);
      onClose();
    } catch (err) {
      console.error('Error saving schedule:', err);
      setErrorMsg(isAr ? 'حدث خطأ أثناء حفظ الإعدادات' : 'Error saving schedule settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#2D3628]/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white border border-[#E5E2D9] rounded-3xl shadow-2xl p-6 sm:p-8 my-6 text-[#43423E] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E5E2D9]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#5E7153]/15 text-[#5E7153] flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-[#2D3628]">
                {isAr ? 'إعدادات ساعات الدوام الرسمي وسياسة الشركة' : 'Company Work Schedule & Shift Policy'}
              </h3>
              <p className="text-xs text-[#65635E] mt-0.5">
                {isAr
                  ? 'تحديد أوقات الحضور والانصراف، أيام العمل الأسبوعية، وفترة السماح لاحتساب التأخير التلقائي'
                  : 'Configure official shift hours, work days, and late/early departure grace periods'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[#65635E] hover:bg-[#FAF9F6] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-6">
          {/* Company Name */}
          <div>
            <label className="block text-xs font-bold text-[#2D3628] mb-1.5">
              {isAr ? 'اسم الشركة / المنشأة' : 'Company / Organization Name'}
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-[#65635E] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder={isAr ? 'مثال: شركة دوامي للتقنية' : 'e.g. Dawamy Tech Solutions'}
                className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-[#E5E2D9] focus:outline-none focus:ring-2 focus:ring-[#5E7153]/40 text-sm font-medium bg-[#FAF9F6]"
              />
            </div>
          </div>

          {/* Presets Grid */}
          <div>
            <label className="block text-xs font-bold text-[#2D3628] mb-2 flex items-center justify-between">
              <span>{isAr ? 'اختر نظام وساعات العمل المعتمد في الشركة:' : 'Select Company Shift Preset:'}</span>
              <span className="text-[11px] font-normal text-[#65635E]">
                {isAr ? 'يمكنك التعديل أو التخصيص في أي وقت' : 'Can be customized anytime'}
              </span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {WORK_SCHEDULE_PRESETS.map((preset) => {
                const isSelected = selectedPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handlePresetSelect(preset.id)}
                    className={`text-right p-3 rounded-2xl border text-xs transition-all flex items-start gap-2.5 ${
                      isSelected
                        ? 'bg-[#5E7153]/10 border-[#5E7153] shadow-xs'
                        : 'bg-[#FAF9F6] border-[#E5E2D9] hover:bg-white hover:border-[#D9E0D2]'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full mt-0.5 shrink-0 flex items-center justify-center border ${
                        isSelected ? 'border-[#5E7153] bg-[#5E7153] text-white' : 'border-[#65635E]'
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-[#2D3628]">
                        {isAr ? preset.nameAr : preset.nameEn}
                      </div>
                      <div className="text-[11px] text-[#65635E] mt-0.5 leading-relaxed">
                        {isAr ? preset.descriptionAr : preset.descriptionEn}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Work Days Selection */}
          <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E5E2D9] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#2D3628] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#5E7153]" />
                <span>{isAr ? 'أيام العمل الرسمية بالأسبوع:' : 'Official Working Days:'}</span>
              </label>
              <span className="text-xs font-semibold text-[#5E7153]">
                {workDays.length} {isAr ? 'أيام عمل' : 'work days'} (
                {totalWeeklyHours} {isAr ? 'ساعة أسبوعياً' : 'hrs/week'})
              </span>
            </div>

            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {DAYS_OF_WEEK_INFO.map((day) => {
                const isSelected = workDays.includes(day.dayIndex);
                const isFri = day.dayIndex === 5;
                return (
                  <button
                    key={day.dayIndex}
                    type="button"
                    onClick={() => toggleDay(day.dayIndex)}
                    className={`py-2 px-1 rounded-xl border text-center font-bold text-xs transition-all ${
                      isSelected
                        ? 'bg-[#5E7153] border-[#5E7153] text-white shadow-xs'
                        : isFri
                        ? 'bg-rose-50/60 border-rose-200 text-rose-700 hover:bg-rose-100'
                        : 'bg-white border-[#E5E2D9] text-[#65635E] hover:bg-[#EFECE4]'
                    }`}
                  >
                    <div className="text-[10px] opacity-80 sm:hidden">
                      {isAr ? day.shortAr : day.shortEn}
                    </div>
                    <div className="hidden sm:block">
                      {isAr ? day.nameAr : day.nameEn}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Shift Times & Daily Hours */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Shift Start Time */}
            <div>
              <label className="block text-xs font-bold text-[#2D3628] mb-1.5">
                {isAr ? 'موعد الحضور الرسمي' : 'Official Shift Start'}
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => {
                  setSelectedPreset('custom');
                  setStartTime(e.target.value);
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-[#E5E2D9] text-sm font-semibold bg-[#FAF9F6] text-[#2D3628] focus:outline-none focus:ring-2 focus:ring-[#5E7153]/40"
              />
              <span className="text-[11px] text-[#65635E] mt-1 block">
                {isAr ? 'يبدأ احتساب التأخير بعد هذا الوقت' : 'Late timer starts after this'}
              </span>
            </div>

            {/* Shift End Time */}
            <div>
              <label className="block text-xs font-bold text-[#2D3628] mb-1.5">
                {isAr ? 'موعد الانصراف الرسمي' : 'Official Shift End'}
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => {
                  setSelectedPreset('custom');
                  setEndTime(e.target.value);
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-[#E5E2D9] text-sm font-semibold bg-[#FAF9F6] text-[#2D3628] focus:outline-none focus:ring-2 focus:ring-[#5E7153]/40"
              />
              <span className="text-[11px] text-[#65635E] mt-1 block">
                {isAr ? 'الخروج قبل هذا الوقت يعد انصرافاً مبكراً' : 'Earlier punch is early leave'}
              </span>
            </div>

            {/* Daily Required Working Hours */}
            <div>
              <label className="block text-xs font-bold text-[#2D3628] mb-1.5">
                {isAr ? 'ساعات العمل اليومية المطلوبة' : 'Target Daily Hours'}
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="16"
                  value={dailyWorkHours}
                  onChange={(e) => {
                    setSelectedPreset('custom');
                    setDailyWorkHours(parseFloat(e.target.value) || 8);
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E5E2D9] text-sm font-semibold bg-[#FAF9F6] text-[#2D3628] focus:outline-none focus:ring-2 focus:ring-[#5E7153]/40"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#65635E]">
                  {isAr ? 'ساعات' : 'hrs'}
                </span>
              </div>
              <span className="text-[11px] text-[#65635E] mt-1 block">
                {isAr ? `فارق التوقيت: ${spanHours} ساعة` : `Shift span: ${spanHours} hrs`}
              </span>
            </div>
          </div>

          {/* Grace Periods */}
          <div className="p-4 rounded-2xl bg-[#E9EDD9]/40 border border-[#D9E0D2] grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#2D3628] mb-1">
                {isAr ? 'سماحية تأخير الحضور الصباحي' : 'Check-in Grace Period'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={checkInGraceMinutes}
                  onChange={(e) => {
                    setSelectedPreset('custom');
                    setCheckInGraceMinutes(parseInt(e.target.value, 10) || 0);
                  }}
                  className="w-24 px-3 py-2 rounded-xl border border-[#D9E0D2] text-sm font-bold bg-white text-[#2D3628] focus:outline-none"
                />
                <span className="text-xs text-[#5E7153] font-semibold">
                  {isAr ? 'دقيقة سماح بعد الموعد' : 'minutes after start time'}
                </span>
              </div>
              <span className="text-[11px] text-[#65635E] mt-1 block">
                {isAr
                  ? `لا يحتسب تأخير إذا دخل الموظف حتى ${formatMinutesToTime(startMins + checkInGraceMinutes)}`
                  : `No penalty up to ${formatMinutesToTime(startMins + checkInGraceMinutes)}`}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2D3628] mb-1">
                {isAr ? 'سماحية الانصراف المبكر' : 'Early Checkout Grace Period'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={checkOutGraceMinutes}
                  onChange={(e) => {
                    setSelectedPreset('custom');
                    setCheckOutGraceMinutes(parseInt(e.target.value, 10) || 0);
                  }}
                  className="w-24 px-3 py-2 rounded-xl border border-[#D9E0D2] text-sm font-bold bg-white text-[#2D3628] focus:outline-none"
                />
                <span className="text-xs text-[#5E7153] font-semibold">
                  {isAr ? 'دقيقة سماح قبل الموعد' : 'minutes before end time'}
                </span>
              </div>
              <span className="text-[11px] text-[#65635E] mt-1 block">
                {isAr
                  ? `يمكن الانصراف من ${formatMinutesToTime(endMins - checkOutGraceMinutes)} دون احتساب عجز`
                  : `Can leave from ${formatMinutesToTime(endMins - checkOutGraceMinutes)} without penalty`}
              </span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5E2D9]">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-[#E5E2D9] text-xs font-bold text-[#65635E] hover:bg-[#FAF9F6] transition-colors"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#5E7153] hover:bg-[#4E5E44] text-white text-xs font-bold shadow-md shadow-[#5E7153]/20 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>
                {isSaving
                  ? isAr ? 'جارٍ الحفظ والتطبيق...' : 'Saving...'
                  : isAr ? 'حفظ وتطبيق سياسة الدوام' : 'Save & Apply Policy'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
