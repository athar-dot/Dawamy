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
  Upload,
  Image as ImageIcon,
  Trash2,
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
  const [logoUrl, setLogoUrl] = useState(currentSchedule.logoUrl || '');
  const [stampUrl, setStampUrl] = useState(currentSchedule.stampUrl || '');
  const [commercialRegNo, setCommercialRegNo] = useState(currentSchedule.commercialRegNo || '');
  const [taxNumber, setTaxNumber] = useState(currentSchedule.taxNumber || '');
  const [companyAddress, setCompanyAddress] = useState(currentSchedule.companyAddress || '');
  const [companyPhone, setCompanyPhone] = useState(currentSchedule.companyPhone || '');
  const [companyEmail, setCompanyEmail] = useState(currentSchedule.companyEmail || '');
  const [currency, setCurrency] = useState(currentSchedule.currency || 'ر.س');

  const [selectedPreset, setSelectedPreset] = useState<CompanyWorkSchedule['preset']>(currentSchedule.preset || 'sun_thu_8h');
  const [workDays, setWorkDays] = useState<number[]>(currentSchedule.workDays || [0, 1, 2, 3, 4]);
  const [dailyWorkHours, setDailyWorkHours] = useState<number>(currentSchedule.dailyWorkHours || 8.0);
  const [startTime, setStartTime] = useState<string>(currentSchedule.startTime || '08:00');
  const [endTime, setEndTime] = useState<string>(currentSchedule.endTime || '16:00');
  const [checkInGraceMinutes, setCheckInGraceMinutes] = useState<number>(currentSchedule.checkInGraceMinutes ?? 15);
  const [checkOutGraceMinutes, setCheckOutGraceMinutes] = useState<number>(currentSchedule.checkOutGraceMinutes ?? 5);
  const [description, setDescription] = useState<string>(currentSchedule.description || '');

  // General Company Policies (سياسات الشركة العامة)
  const [remoteWorkPolicy, setRemoteWorkPolicy] = useState<string>(currentSchedule.generalPolicies?.remoteWorkPolicy || (isAr ? 'يحق للموظف يومين عمل عن بعد أسبوعياً بموافقة المدير، وتعتبر ساعات 10:00 ص - 4:00 م ساعات تواجد إلزامية.' : 'Up to 2 remote work days weekly upon manager approval. Core availability hours are 10:00 AM to 4:00 PM.'));
  const [leavePolicy, setLeavePolicy] = useState<string>(currentSchedule.generalPolicies?.leavePolicy || (isAr ? 'تستحق إجازة سنوية بواقع 21-30 يوماً حسب اللائحة الداخلية، وتقديم طلب الإجازة قبلها بـ 3 أيام على الأقل.' : 'Annual leave of 21-30 days per internal bylaws, submitted at least 3 days in advance.'));
  const [codeOfConduct, setCodeOfConduct] = useState<string>(currentSchedule.generalPolicies?.codeOfConduct || (isAr ? 'الالتزام بمواعيد العمل، المهنية العالية، الحفاظ على سرية بيانات العملاء والشركة، وتبادل الاحترام.' : 'Commitment to punctuality, high professionalism, data confidentiality, and mutual respect.'));
  const [overtimePolicy, setOvertimePolicy] = useState<string>(currentSchedule.generalPolicies?.overtimePolicy || (isAr ? 'يتم احتساب ساعات العمل الإضافية بناءً على موافقة مسبقة من الإدارة وبنسبة تعويض حسب نظام العمل.' : 'Overtime hours are compensated upon prior management approval according to labor bylaws.'));

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        setErrorMsg(isAr ? 'حجم شعار الشركة كبير جداً، يرجى اختيار صورة أقل من 2 ميجابايت' : 'Logo file is too large. Max 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoUrl(reader.result as string);
        setErrorMsg(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStampFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        setErrorMsg(isAr ? 'حجم الختم كبير جداً، يرجى اختيار صورة أقل من 2 ميجابايت' : 'Stamp file is too large. Max 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setStampUrl(reader.result as string);
        setErrorMsg(null);
      };
      reader.readAsDataURL(file);
    }
  };

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
        logoUrl: logoUrl.trim() || undefined,
        stampUrl: stampUrl.trim() || undefined,
        commercialRegNo: commercialRegNo.trim() || undefined,
        taxNumber: taxNumber.trim() || undefined,
        companyAddress: companyAddress.trim() || undefined,
        companyPhone: companyPhone.trim() || undefined,
        companyEmail: companyEmail.trim() || undefined,
        currency: currency.trim() || 'ر.س',
        preset: selectedPreset,
        workDays,
        dailyWorkHours: Number(dailyWorkHours),
        startTime,
        endTime,
        checkInGraceMinutes: Number(checkInGraceMinutes),
        checkOutGraceMinutes: Number(checkOutGraceMinutes),
        description: description.trim() || undefined,
        generalPolicies: {
          remoteWorkPolicy: remoteWorkPolicy.trim() || undefined,
          leavePolicy: leavePolicy.trim() || undefined,
          codeOfConduct: codeOfConduct.trim() || undefined,
          overtimePolicy: overtimePolicy.trim() || undefined,
        },
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
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 bg-[#2D3628]/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white border border-[#E5E2D9] rounded-3xl shadow-2xl my-auto text-[#43423E] animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header - Fixed */}
        <div className="flex items-center justify-between p-6 sm:p-8 pb-4 border-b border-[#E5E2D9] shrink-0">
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

        {/* Scrollable Form Body */}
        <div className="p-6 sm:p-8 pt-4 overflow-y-auto">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company Identity & Branding Section */}
          <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E5E2D9] space-y-4">
            <h4 className="text-xs font-extrabold text-[#2D3628] uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#5E7153]" />
              <span>{isAr ? 'هوية وبيانات الشركة الرسمية (تظهر في التقارير والسندات)' : 'Company Identity & Official Details'}</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Company Name */}
              <div>
                <label className="block text-xs font-bold text-[#2D3628] mb-1">
                  {isAr ? 'اسم الشركة / المنشأة *' : 'Company Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder={isAr ? 'مثال: شركة دوامي للتقنية' : 'e.g. Dawamy Tech Solutions'}
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E2D9] text-xs font-medium bg-white text-[#2D3628] focus:outline-none focus:ring-2 focus:ring-[#5E7153]/40"
                />
              </div>

              {/* Currency */}
              <div>
                <label className="block text-xs font-bold text-[#2D3628] mb-1">
                  {isAr ? 'العملة المعتمدة' : 'Currency'}
                </label>
                <input
                  type="text"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  placeholder="ر.س / EGP / USD"
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E2D9] text-xs font-medium bg-white text-[#2D3628] focus:outline-none focus:ring-2 focus:ring-[#5E7153]/40"
                />
              </div>

              {/* Logo Upload */}
              <div className="flex flex-col">
                <label className="block text-xs font-bold text-[#2D3628] mb-1">
                  {isAr ? 'شعار الشركة (اختياري)' : 'Company Logo (Optional)'}
                </label>
                {logoUrl ? (
                  <div className="flex items-center gap-3 p-3 bg-white border border-[#E5E2D9] rounded-xl">
                    <img
                      src={logoUrl}
                      alt="Logo Preview"
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-lg object-contain border border-[#E5E2D9] bg-slate-50"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-[#65635E] truncate">{isAr ? 'تم رفع الشعار' : 'Logo Uploaded'}</p>
                      <button
                        type="button"
                        onClick={() => setLogoUrl('')}
                        className="text-[11px] font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 mt-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{isAr ? 'إزالة الشعار' : 'Remove Logo'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center border border-dashed border-[#E5E2D9] hover:border-[#5E7153]/50 rounded-xl p-3 bg-white cursor-pointer hover:bg-[#FAF9F6] transition group">
                    <div className="flex flex-col items-center gap-1 text-center">
                      <Upload className="w-5 h-5 text-[#65635E] group-hover:text-[#5E7153]" />
                      <span className="text-[11px] font-bold text-[#2D3628]">{isAr ? 'اضغط لرفع شعار الشركة' : 'Click to upload logo'}</span>
                      <span className="text-[9px] text-[#65635E]">{isAr ? 'PNG, JPG (أقصى حجم 2MB)' : 'PNG, JPG (Max 2MB)'}</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Stamp Upload */}
              <div className="flex flex-col">
                <label className="block text-xs font-bold text-[#2D3628] mb-1">
                  {isAr ? 'الختم الرسمي / التوقيع (اختياري)' : 'Official Stamp / Signature (Optional)'}
                </label>
                {stampUrl ? (
                  <div className="flex items-center gap-3 p-3 bg-white border border-[#E5E2D9] rounded-xl">
                    <img
                      src={stampUrl}
                      alt="Stamp Preview"
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-lg object-contain border border-[#E5E2D9] bg-slate-50"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-[#65635E] truncate">{isAr ? 'تم رفع الختم' : 'Stamp Uploaded'}</p>
                      <button
                        type="button"
                        onClick={() => setStampUrl('')}
                        className="text-[11px] font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 mt-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{isAr ? 'إزالة الختم' : 'Remove Stamp'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center border border-dashed border-[#E5E2D9] hover:border-[#5E7153]/50 rounded-xl p-3 bg-white cursor-pointer hover:bg-[#FAF9F6] transition group">
                    <div className="flex flex-col items-center gap-1 text-center">
                      <Upload className="w-5 h-5 text-[#65635E] group-hover:text-[#5E7153]" />
                      <span className="text-[11px] font-bold text-[#2D3628]">{isAr ? 'اضغط لرفع الختم الرسمي' : 'Click to upload stamp'}</span>
                      <span className="text-[9px] text-[#65635E]">{isAr ? 'PNG, JPG (أقصى حجم 2MB)' : 'PNG, JPG (Max 2MB)'}</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleStampFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Commercial Reg No */}
              <div>
                <label className="block text-xs font-bold text-[#2D3628] mb-1">
                  {isAr ? 'رقم السجل التجاري' : 'Commercial Reg. No'}
                </label>
                <input
                  type="text"
                  value={commercialRegNo}
                  onChange={(e) => setCommercialRegNo(e.target.value)}
                  placeholder="1010xxxxxx"
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E2D9] text-xs font-medium bg-white text-[#2D3628] focus:outline-none focus:ring-2 focus:ring-[#5E7153]/40"
                />
              </div>

              {/* Tax Number */}
              <div>
                <label className="block text-xs font-bold text-[#2D3628] mb-1">
                  {isAr ? 'الرقم الضريبي' : 'Tax Number'}
                </label>
                <input
                  type="text"
                  value={taxNumber}
                  onChange={(e) => setTaxNumber(e.target.value)}
                  placeholder="300xxxxxxxxx"
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E2D9] text-xs font-medium bg-white text-[#2D3628] focus:outline-none focus:ring-2 focus:ring-[#5E7153]/40"
                />
              </div>

              {/* Phone & Email */}
              <div>
                <label className="block text-xs font-bold text-[#2D3628] mb-1">
                  {isAr ? 'رقم الهاتف الرسمي' : 'Official Phone'}
                </label>
                <input
                  type="text"
                  value={companyPhone}
                  onChange={(e) => setCompanyPhone(e.target.value)}
                  placeholder="+966 11 000 0000"
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E2D9] text-xs font-medium bg-white text-[#2D3628] focus:outline-none focus:ring-2 focus:ring-[#5E7153]/40"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2D3628] mb-1">
                  {isAr ? 'البريد الإلكتروني للشركة' : 'Company Email'}
                </label>
                <input
                  type="email"
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                  placeholder="hr@company.com"
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E2D9] text-xs font-medium bg-white text-[#2D3628] focus:outline-none focus:ring-2 focus:ring-[#5E7153]/40"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2D3628] mb-1">
                {isAr ? 'عنوان المقر الرئيسي' : 'Headquarters Address'}
              </label>
              <input
                type="text"
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                placeholder={isAr ? 'الرياض، المملكة العربية السعودية' : 'Riyadh, Saudi Arabia'}
                className="w-full px-3 py-2 rounded-xl border border-[#E5E2D9] text-xs font-medium bg-white text-[#2D3628] focus:outline-none focus:ring-2 focus:ring-[#5E7153]/40"
              />
            </div>
          </div>

          {/* Presets Grid */}
          <div>
            <label className="block text-xs font-bold text-[#2D3628] mb-2 flex items-center justify-between">
              <span>{isAr ? 'اختر نظام وساعات العمل المعتمد في الشركة:' : 'Select Company Shift Preset:'}</span>
              <span className="text-[11px] font-semibold text-[#43423E]">
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
                      <div className="text-[11px] text-[#43423E] font-medium mt-0.5 leading-relaxed">
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
              <span className="text-[11px] text-[#43423E] font-medium mt-1 block">
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
              <span className="text-[11px] text-[#43423E] font-medium mt-1 block">
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
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#2D3628]">
                  {isAr ? 'ساعات' : 'hrs'}
                </span>
              </div>
              <span className="text-[11px] text-[#43423E] font-medium mt-1 block">
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

          {/* General Company Policies & Bylaws Section (سياسات الشركة العامة) */}
          <div className="p-4 rounded-2xl bg-white border border-[#E5E2D9] space-y-4">
            <div className="flex items-center gap-2 border-b border-[#E5E2D9] pb-3">
              <Sparkles className="w-4 h-4 text-[#5E7153]" />
              <div>
                <h4 className="text-xs font-bold text-[#2D3628]">
                  {isAr ? 'سياسات وقواعد الشركة العامة (تحديث مرن بواسطة المدير / الموارد البشرية)' : 'General Company Bylaws & Policies'}
                </h4>
                <p className="text-[11px] text-[#65635E]">
                  {isAr ? 'هذه اللوائح تظهر فوراً للموظفين في المستشار الذكي والتقارير' : 'These policies reflect immediately for employees in the AI advisor and guidelines.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Remote Work */}
              <div>
                <label className="block text-xs font-bold text-[#2D3628] mb-1">
                  {isAr ? 'سياسة العمل عن بعد (Remote Work Policy)' : 'Remote Work Policy'}
                </label>
                <textarea
                  rows={2}
                  value={remoteWorkPolicy}
                  onChange={(e) => setRemoteWorkPolicy(e.target.value)}
                  placeholder={isAr ? 'مثال: يحق للموظف يومين عمل عن بعد أسبوعياً...' : 'e.g. Up to 2 remote work days...'}
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E2D9] text-xs bg-[#FAF9F6] text-[#2D3628] focus:outline-none focus:ring-2 focus:ring-[#5E7153]/40"
                />
              </div>

              {/* Leave Policy */}
              <div>
                <label className="block text-xs font-bold text-[#2D3628] mb-1">
                  {isAr ? 'سياسة الإجازات والاستئذانات (Leave Bylaws)' : 'Leave & Vacation Policy'}
                </label>
                <textarea
                  rows={2}
                  value={leavePolicy}
                  onChange={(e) => setLeavePolicy(e.target.value)}
                  placeholder={isAr ? 'مثال: تستحق إجازة سنوية بواقع 21 يوماً...' : 'e.g. 21 days annual leave...'}
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E2D9] text-xs bg-[#FAF9F6] text-[#2D3628] focus:outline-none focus:ring-2 focus:ring-[#5E7153]/40"
                />
              </div>

              {/* Code of Conduct */}
              <div>
                <label className="block text-xs font-bold text-[#2D3628] mb-1">
                  {isAr ? 'مدونة السلوك الوظيفي (Code of Conduct)' : 'Code of Conduct'}
                </label>
                <textarea
                  rows={2}
                  value={codeOfConduct}
                  onChange={(e) => setCodeOfConduct(e.target.value)}
                  placeholder={isAr ? 'مثال: الالتزام بالمهنية وسرية البيانات...' : 'e.g. Professionalism & data confidentiality...'}
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E2D9] text-xs bg-[#FAF9F6] text-[#2D3628] focus:outline-none focus:ring-2 focus:ring-[#5E7153]/40"
                />
              </div>

              {/* Overtime Policy */}
              <div>
                <label className="block text-xs font-bold text-[#2D3628] mb-1">
                  {isAr ? 'سياسة الساعات الإضافية (Overtime Policy)' : 'Overtime Policy'}
                </label>
                <textarea
                  rows={2}
                  value={overtimePolicy}
                  onChange={(e) => setOvertimePolicy(e.target.value)}
                  placeholder={isAr ? 'مثال: باحتساب موافقة مسبقة للإدارة...' : 'e.g. Prior management approval required...'}
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E2D9] text-xs bg-[#FAF9F6] text-[#2D3628] focus:outline-none focus:ring-2 focus:ring-[#5E7153]/40"
                />
              </div>
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
    </div>
  );
};
