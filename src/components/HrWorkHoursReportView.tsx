import React, { useState, useMemo } from 'react';
import {
  Clock,
  Calendar,
  Building2,
  Users,
  User,
  Download,
  Printer,
  Filter,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowUpDown,
  Sliders,
  TrendingDown,
  TrendingUp,
  Percent,
  Timer,
  ChevronDown,
  ChevronRight,
  Info,
  Sparkles,
  ExternalLink,
  Briefcase,
  FileSpreadsheet,
  X,
  Play,
  AlertCircle,
} from 'lucide-react';
import {
  CompanyWorkSchedule,
  AttendanceRecord,
  UserProfile,
  BiometricVerifyMethod,
} from '../types';
import {
  calculateAttendanceMetrics,
  computeEmployeeScheduleSummary,
  exportAttendanceAndShortageExcel,
  formatMinutesHumanReadable,
  formatMinutesToTime,
  getDayName,
  DAYS_OF_WEEK_INFO,
} from '../utils/workScheduleUtils';

interface HrWorkHoursReportViewProps {
  currentUser: UserProfile;
  allUsers: UserProfile[];
  attendanceRecords: AttendanceRecord[];
  companySchedule: CompanyWorkSchedule;
  onOpenScheduleModal: () => void;
  onRecordPunch?: (punch: {
    userId: string;
    type: 'check_in' | 'check_out';
    deviceId?: string;
    verifyMethod?: BiometricVerifyMethod;
    customTime?: string;
    customDate?: string;
  }) => Promise<void>;
  lang: 'ar' | 'en';
}

export const HrWorkHoursReportView: React.FC<HrWorkHoursReportViewProps> = ({
  currentUser,
  allUsers,
  attendanceRecords,
  companySchedule,
  onOpenScheduleModal,
  onRecordPunch,
  lang,
}) => {
  const isAr = lang === 'ar';

  // State: Scope Filter ('all' vs single employee ID)
  const [reportScope, setReportScope] = useState<'all' | 'single'>('all');
  const [selectedUserId, setSelectedUserId] = useState<string>(allUsers[0]?.id || '');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-09');
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [delayFilter, setDelayFilter] = useState<'all' | 'delayed_only' | 'compliant_only' | 'shortage_only'>('all');

  // Print Preview Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Manual Punch Form State (Quick Testing & HR Adjustment)
  const [isPunchModalOpen, setIsPunchModalOpen] = useState(false);
  const [punchUser, setPunchUser] = useState(selectedUserId || allUsers[0]?.id || '');
  const [punchType, setPunchType] = useState<'check_in' | 'check_out'>('check_in');
  const [punchTime, setPunchTime] = useState('08:35');
  const [punchDate, setPunchDate] = useState('2026-09-04');
  const [isPunchSubmitting, setIsPunchSubmitting] = useState(false);

  // Selected User Profile
  const activeUser = useMemo(() => {
    return allUsers.find((u) => u.id === selectedUserId) || allUsers[0] || currentUser;
  }, [allUsers, selectedUserId, currentUser]);

  // Departments List
  const departments = useMemo(() => {
    return Array.from(new Set(allUsers.map((u) => u.department).filter(Boolean)));
  }, [allUsers]);

  // Filtered Records based on Month, Scope, Department, Search, and Delay
  const filteredRecords = useMemo(() => {
    let recs = (attendanceRecords || []).filter((r) => {
      if (!r || !r.date) return false;
      // Month Filter
      if (selectedMonth && !r.date.startsWith(selectedMonth)) return false;

      // Scope Filter (All vs Single User)
      if (reportScope === 'single' && r.userId !== activeUser.id) return false;

      // Department Filter
      if (departmentFilter !== 'all' && r.department !== departmentFilter) return false;

      // Search Query
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesName = (r.userName || '').toLowerCase().includes(q);
        const matchesEnroll = (r.biometricEnrollId || '').includes(q);
        const matchesDept = (r.department || '').toLowerCase().includes(q);
        const matchesEmail = (r.userEmail || '').toLowerCase().includes(q);
        if (!matchesName && !matchesEnroll && !matchesDept && !matchesEmail) return false;
      }

      return true;
    });

    // Delay Filter
    if (delayFilter !== 'all') {
      recs = recs.filter((r) => {
        const metrics = calculateAttendanceMetrics({
          checkInTime: r.checkInTime,
          checkOutTime: r.checkOutTime,
          date: r.date,
          schedule: companySchedule,
          existingLateWaived: !!r.isLateDeductionWaived,
        });

        if (delayFilter === 'delayed_only') {
          return metrics.lateMinutes > 0 || metrics.earlyLeaveMinutes > 0;
        }
        if (delayFilter === 'shortage_only') {
          return metrics.dailyShortageMinutes > 0;
        }
        if (delayFilter === 'compliant_only') {
          return metrics.dailyShortageMinutes === 0 && !metrics.isWeekend;
        }
        return true;
      });
    }

    // Sort descending by date
    return recs.sort((a, b) => b.date.localeCompare(a.date));
  }, [attendanceRecords, selectedMonth, reportScope, activeUser, departmentFilter, searchTerm, delayFilter, companySchedule]);

  // High-Level KPIs & Aggregated Metrics
  const summaryKpis = useMemo(() => {
    let totalTargetHours = 0;
    let totalActualHours = 0;
    let totalLateMins = 0;
    let totalEarlyLeaveMins = 0;
    let totalShortageMins = 0;
    let delayedRecordsCount = 0;
    let compliantRecordsCount = 0;

    filteredRecords.forEach((r) => {
      const metrics = calculateAttendanceMetrics({
        checkInTime: r.checkInTime,
        checkOutTime: r.checkOutTime,
        date: r.date,
        schedule: companySchedule,
        existingLateWaived: !!r.isLateDeductionWaived,
      });

      if (!metrics.isWeekend) {
        totalTargetHours += metrics.dailyRequiredHours;
        totalActualHours += metrics.totalWorkingHours;
        totalLateMins += metrics.lateMinutes;
        totalEarlyLeaveMins += metrics.earlyLeaveMinutes;
        totalShortageMins += metrics.dailyShortageMinutes;

        if (metrics.dailyShortageMinutes > 0) {
          delayedRecordsCount += 1;
        } else {
          compliantRecordsCount += 1;
        }
      }
    });

    totalActualHours = Math.round(totalActualHours * 100) / 100;
    totalTargetHours = Math.round(totalTargetHours * 100) / 100;
    const totalShortageHours = Math.round((totalShortageMins / 60) * 100) / 100;
    const totalLateHours = Math.round((totalLateMins / 60) * 100) / 100;
    const totalEarlyLeaveHours = Math.round((totalEarlyLeaveMins / 60) * 100) / 100;

    const complianceRate = totalTargetHours > 0
      ? Math.min(100, Math.max(0, Math.round((totalActualHours / totalTargetHours) * 100)))
      : 100;

    return {
      totalTargetHours,
      totalActualHours,
      totalLateMins,
      totalLateHours,
      totalEarlyLeaveMins,
      totalEarlyLeaveHours,
      totalShortageMins,
      totalShortageHours,
      complianceRate,
      delayedRecordsCount,
      compliantRecordsCount,
    };
  }, [filteredRecords, companySchedule]);

  // Single Employee Overall Month Summary
  const singleUserSummary = useMemo(() => {
    if (reportScope !== 'single' || !activeUser) return null;
    return computeEmployeeScheduleSummary(activeUser, attendanceRecords, companySchedule);
  }, [reportScope, activeUser, attendanceRecords, companySchedule]);

  // Handle Export Excel
  const handleExportExcel = (forSingleUser: boolean = false) => {
    const targetUser = forSingleUser ? activeUser : null;
    exportAttendanceAndShortageExcel({
      records: filteredRecords,
      schedule: companySchedule,
      isAr,
      selectedUser: targetUser,
      monthName: selectedMonth,
    });
  };

  // Handle Manual Punch Submission
  const handleManualPunchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onRecordPunch) return;
    try {
      setIsPunchSubmitting(true);
      await onRecordPunch({
        userId: punchUser,
        type: punchType,
        customTime: punchTime,
        customDate: punchDate,
        verifyMethod: 'manual',
      });
      setIsPunchModalOpen(false);
    } catch (err) {
      console.error('Failed to submit manual punch:', err);
    } finally {
      setIsPunchSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ----------------------------------------------------
          1. TOP BANNER: COMPANY WORK SCHEDULE & POLICY SUMMARY
      ---------------------------------------------------- */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2D3628] via-[#3B4735] to-[#242A20] text-white p-6 sm:p-8 shadow-xl border border-[#44523C]">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5E7153]/40 border border-[#7D946F]/40 text-xs font-semibold text-[#D8E2D1]">
              <Building2 className="w-3.5 h-3.5 text-[#A3B899]" />
              <span>{companySchedule.companyName || (isAr ? 'سياسة دوام المنشأة' : 'Company Shift Policy')}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#A3B899] animate-pulse" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {isAr ? 'كشف ساعات العمل الرسمية والتأخير والعجز' : 'Official Work Hours & Shortage Statement'}
            </h2>

            <p className="text-xs sm:text-sm text-[#D8E2D1]/90 max-w-3xl leading-relaxed">
              {isAr
                ? 'لوحة الإدارة والتحليل الشامل لمدير الموارد البشرية (HR): حساب آلي لتأخير الحضور من موعد الدخول، الخروج المبكر، وساعات العمل الفعلية مقارنة بساعات العمل الرسمية، مع استخراج كشوفات فردية أو جماعية.'
                : 'HR attendance & shortage audit dashboard: Automated calculation of morning check-in delay, early checkout departure, and daily shortage vs official shift hours for all or single employees.'}
            </p>

            {/* Active Shift Policy Quick Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
              <span className="px-3 py-1 rounded-xl bg-white/10 border border-white/15 text-[#E9EDD9] font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#A3B899]" />
                <span>
                  {isAr
                    ? `الدوام الرسمي: ${companySchedule.startTime} إلى ${companySchedule.endTime} (${companySchedule.dailyWorkHours} ساعات)`
                    : `Shift: ${companySchedule.startTime} - ${companySchedule.endTime} (${companySchedule.dailyWorkHours} hrs)`}
                </span>
              </span>

              <span className="px-3 py-1 rounded-xl bg-white/10 border border-white/15 text-[#E9EDD9] font-medium flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#A3B899]" />
                <span>
                  {isAr
                    ? `${companySchedule.workDays.length} أيام عمل أسبوعياً (${companySchedule.workDays.map((d) => DAYS_OF_WEEK_INFO.find((x) => x.dayIndex === d)?.shortAr).join('، ')})`
                    : `${companySchedule.workDays.length} work days/week`}
                </span>
              </span>

              <span className="px-3 py-1 rounded-xl bg-[#5E7153]/50 border border-[#7D946F]/40 text-[#D8E2D1] font-medium">
                {isAr
                  ? `سماحية الحضور: ${companySchedule.checkInGraceMinutes} دقيقة | الانصراف: ${companySchedule.checkOutGraceMinutes} دقيقة`
                  : `Grace: Check-in ${companySchedule.checkInGraceMinutes}m | Out ${companySchedule.checkOutGraceMinutes}m`}
              </span>
            </div>
          </div>

          {/* Action Buttons: Configure Schedule & Quick Manual Punch */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-stretch gap-2.5 shrink-0">
            <button
              type="button"
              id="btn-open-schedule-modal"
              onClick={onOpenScheduleModal}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#5E7153] hover:bg-[#4E5E44] text-white text-xs sm:text-sm font-bold shadow-lg shadow-[#2D3628]/40 border border-[#7D946F]/50 transition-all cursor-pointer"
            >
              <Sliders className="w-4 h-4" />
              <span>{isAr ? 'تعديل ساعات الدوام وسياسة الشركة' : 'Configure Schedule & Shifts'}</span>
            </button>

            {onRecordPunch && (
              <button
                type="button"
                onClick={() => setIsPunchModalOpen(true)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-[#D8E2D1] hover:text-white text-xs font-semibold border border-white/15 transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 text-[#A3B899]" />
                <span>{isAr ? 'تسجيل / اختبار بصمة مخصصة' : 'Simulate Custom Punch'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------
          2. SUMMARY KPI STATS CARDS
      ---------------------------------------------------- */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {/* 1. Required Hours */}
        <div className="p-4 rounded-2xl bg-white border border-[#E5E2D9] shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#65635E] mb-1">
            <span>{isAr ? 'الساعات الرسمية المطلوبة' : 'Target Required Hours'}</span>
            <Calendar className="w-4 h-4 text-[#5E7153]" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[#2D3628]">
            {summaryKpis.totalTargetHours}{' '}
            <span className="text-xs font-bold text-[#65635E]">{isAr ? 'ساعة' : 'hrs'}</span>
          </div>
          <div className="text-[11px] text-[#65635E] mt-1">
            {isAr ? `إجمالي أيام العمل المقررة` : 'Official scheduled work days'}
          </div>
        </div>

        {/* 2. Actual Worked Hours */}
        <div className="p-4 rounded-2xl bg-white border border-[#E5E2D9] shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#65635E] mb-1">
            <span>{isAr ? 'ساعات العمل المنجزة فعلياً' : 'Actual Worked Hours'}</span>
            <Clock className="w-4 h-4 text-[#5E7153]" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[#5E7153]">
            {summaryKpis.totalActualHours}{' '}
            <span className="text-xs font-bold text-[#65635E]">{isAr ? 'ساعة' : 'hrs'}</span>
          </div>
          <div className="text-[11px] text-[#65635E] mt-1">
            {isAr ? 'محسوبة من حركات الدخول والخروج' : 'Calculated from punch in/out'}
          </div>
        </div>

        {/* 3. Check-in Delay (Late Arrival) */}
        <div className="p-4 rounded-2xl bg-white border border-[#E5E2D9] shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#65635E] mb-1">
            <span>{isAr ? 'تأخير الحضور الصباحي' : 'Check-in Delay'}</span>
            <Timer className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-700">
            {summaryKpis.totalLateMins}{' '}
            <span className="text-xs font-bold text-[#65635E]">{isAr ? 'دقيقة' : 'min'}</span>
          </div>
          <div className="text-[11px] text-[#65635E] mt-1">
            {summaryKpis.totalLateHours > 0
              ? isAr ? `يعادل ${summaryKpis.totalLateHours} ساعة تأخير` : `Eq. to ${summaryKpis.totalLateHours} hrs`
              : isAr ? 'لا يوجد تأخير صباحي' : 'No morning delays'}
          </div>
        </div>

        {/* 4. Early Departure */}
        <div className="p-4 rounded-2xl bg-white border border-[#E5E2D9] shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#65635E] mb-1">
            <span>{isAr ? 'الانصراف المبكر' : 'Early Departures'}</span>
            <TrendingDown className="w-4 h-4 text-orange-600" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-orange-700">
            {summaryKpis.totalEarlyLeaveMins}{' '}
            <span className="text-xs font-bold text-[#65635E]">{isAr ? 'دقيقة' : 'min'}</span>
          </div>
          <div className="text-[11px] text-[#65635E] mt-1">
            {summaryKpis.totalEarlyLeaveHours > 0
              ? isAr ? `يعادل ${summaryKpis.totalEarlyLeaveHours} ساعة` : `Eq. to ${summaryKpis.totalEarlyLeaveHours} hrs`
              : isAr ? 'لا يوجد انصراف مبكر' : 'No early departures'}
          </div>
        </div>

        {/* 5. Total Shortage / Deficit */}
        <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-rose-800 mb-1">
            <span>{isAr ? 'إجمالي العجز والتأخير' : 'Total Deficit / Shortage'}</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-rose-800">
            {summaryKpis.totalShortageHours}{' '}
            <span className="text-xs font-bold text-rose-900">{isAr ? 'ساعة' : 'hrs'}</span>
          </div>
          <div className="text-[11px] text-rose-700 mt-1 font-medium">
            {summaryKpis.totalShortageMins > 0
              ? isAr ? `عجز قدره ${summaryKpis.totalShortageMins} دقيقة` : `Deficit: ${summaryKpis.totalShortageMins} mins`
              : isAr ? 'التزام تام بدون أي عجز' : 'Full shift compliance'}
          </div>
        </div>

        {/* 6. Compliance Rate */}
        <div className="p-4 rounded-2xl bg-white border border-[#E5E2D9] shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#65635E] mb-1">
            <span>{isAr ? 'نسبة الالتزام بالدوام' : 'Compliance Rate'}</span>
            <Percent className="w-4 h-4 text-[#5E7153]" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[#2D3628]">
            {summaryKpis.complianceRate}%
          </div>
          <div className="w-full bg-[#E5E2D9] h-1.5 rounded-full overflow-hidden mt-2">
            <div
              className={`h-full rounded-full transition-all ${
                summaryKpis.complianceRate >= 90
                  ? 'bg-[#5E7153]'
                  : summaryKpis.complianceRate >= 75
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${summaryKpis.complianceRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------
          3. HR CONTROLS & FILTERING BAR
      ---------------------------------------------------- */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white border border-[#E5E2D9] shadow-xs space-y-4">
        {/* Row 1: Scope Switcher (All Employees vs Single Employee) & Primary Export Buttons */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#E5E2D9]">
          {/* Scope Segmented Control */}
          <div className="inline-flex p-1 rounded-2xl bg-[#FAF9F6] border border-[#E5E2D9]">
            <button
              type="button"
              onClick={() => setReportScope('all')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                reportScope === 'all'
                  ? 'bg-[#2D3628] text-white shadow-xs'
                  : 'text-[#65635E] hover:text-[#2D3628]'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>{isAr ? 'جميع الموظفين (شامل)' : 'All Employees'}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[11px] bg-white/20">
                {allUsers.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setReportScope('single')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                reportScope === 'single'
                  ? 'bg-[#5E7153] text-white shadow-xs'
                  : 'text-[#65635E] hover:text-[#2D3628]'
              }`}
            >
              <User className="w-4 h-4" />
              <span>{isAr ? 'موظف محدد (كشف فردي)' : 'Single Employee Statement'}</span>
            </button>
          </div>

          {/* Export & Print Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Export All or Current to Excel */}
            <button
              type="button"
              id="btn-export-excel-report"
              onClick={() => handleExportExcel(reportScope === 'single')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-[#FAF9F6] border border-[#D9E0D2] text-xs font-bold text-[#2D3628] shadow-xs transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#5E7153]" />
              <span>
                {reportScope === 'single'
                  ? isAr ? `تصدير كشف الموظف (.xlsx)` : `Export Employee (.xlsx)`
                  : isAr ? `تصدير كشف جميع الموظفين (.xlsx)` : `Export All (.xlsx)`}
              </span>
            </button>

            {/* Print Official Sheet */}
            <button
              type="button"
              id="btn-print-report-preview"
              onClick={() => setIsPrintModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2D3628] hover:bg-[#1E241B] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-[#D8E2D1]" />
              <span>{isAr ? 'معاينة وطباعة التقرير (Print / PDF)' : 'Print Sheet'}</span>
            </button>
          </div>
        </div>

        {/* Row 2: Selectors & Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* If Single Employee Scope: Employee Picker */}
          {reportScope === 'single' && (
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-[#2D3628] mb-1">
                {isAr ? 'اختر الموظف لعرض كشف دوامه:' : 'Select Employee:'}
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E5E2D9] text-xs font-bold bg-[#FAF9F6] text-[#2D3628] focus:outline-none focus:ring-2 focus:ring-[#5E7153]/30"
              >
                {allUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} - {u.department} (بصمة: #{u.biometricEnrollId || '-'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Search Input (For All Employees) */}
          {reportScope === 'all' && (
            <div className="relative">
              <label className="block text-xs font-bold text-[#2D3628] mb-1">
                {isAr ? 'البحث بالاسم أو رقم البصمة:' : 'Search Employee:'}
              </label>
              <Search className="w-3.5 h-3.5 text-[#65635E] absolute right-3 top-8 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={isAr ? 'ابحث عن موظف أو قسم...' : 'Search employee...'}
                className="w-full pr-8 pl-3 py-2 rounded-xl border border-[#E5E2D9] text-xs font-semibold bg-[#FAF9F6] text-[#2D3628] focus:outline-none"
              />
            </div>
          )}

          {/* Month Selector */}
          <div>
            <label className="block text-xs font-bold text-[#2D3628] mb-1">
              {isAr ? 'الشهر المالي / التقويمي:' : 'Month:'}
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#E5E2D9] text-xs font-bold bg-[#FAF9F6] text-[#2D3628] focus:outline-none"
            />
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-xs font-bold text-[#2D3628] mb-1">
              {isAr ? 'القسم / الإدارة:' : 'Department:'}
            </label>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#E5E2D9] text-xs font-semibold bg-[#FAF9F6] text-[#2D3628] focus:outline-none"
            >
              <option value="all">{isAr ? 'كافة الأقسام' : 'All Departments'}</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Delay / Shortage Status Filter */}
          <div>
            <label className="block text-xs font-bold text-[#2D3628] mb-1">
              {isAr ? 'حالة الالتزام والعجز:' : 'Status & Shortage:'}
            </label>
            <select
              value={delayFilter}
              onChange={(e) => setDelayFilter(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-[#E5E2D9] text-xs font-semibold bg-[#FAF9F6] text-[#2D3628] focus:outline-none"
            >
              <option value="all">{isAr ? 'الكل (حاضر، متأخر، عجز)' : 'All Records'}</option>
              <option value="shortage_only">{isAr ? 'يوجد عجز بالساعات' : 'Hours Shortage Only'}</option>
              <option value="delayed_only">{isAr ? 'تأخير دخول أو انصراف مبكر' : 'Late or Early Leave'}</option>
              <option value="compliant_only">{isAr ? 'ملتزم بالكامل (دون عجز)' : 'Fully Compliant Only'}</option>
            </select>
          </div>
        </div>

        {/* If Single Employee Scope: Dedicated Employee Card */}
        {reportScope === 'single' && singleUserSummary && (
          <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E5E2D9] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-3.5">
              <img
                src={activeUser.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'}
                alt={activeUser.name}
                className="w-12 h-12 rounded-2xl object-cover border border-[#D9E0D2] shadow-xs"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-extrabold text-[#2D3628]">{activeUser.name}</h4>
                  <span className="px-2 py-0.5 rounded-md bg-[#2D3628] text-white text-[10px] font-mono">
                    #{activeUser.biometricEnrollId || '-'}
                  </span>
                </div>
                <div className="text-xs text-[#65635E] mt-0.5">
                  {activeUser.title} • {activeUser.department} • {activeUser.email}
                </div>
              </div>
            </div>

            {/* Quick Metrics for the Selected Employee */}
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
              <div className="px-3 py-1.5 rounded-xl bg-white border border-[#E5E2D9] text-[#2D3628]">
                {isAr ? 'أيام الحضور:' : 'Present:'}{' '}
                <strong className="text-[#5E7153]">{singleUserSummary.totalPresentDays}</strong> / {singleUserSummary.totalWorkDays}
              </div>

              <div className="px-3 py-1.5 rounded-xl bg-white border border-[#E5E2D9] text-[#2D3628]">
                {isAr ? 'الساعات الفعلية:' : 'Worked:'}{' '}
                <strong className="text-[#5E7153]">{singleUserSummary.totalActualWorkedHours}</strong> / {singleUserSummary.totalOfficialRequiredHours} س
              </div>

              <div className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
                {isAr ? 'صافي العجز:' : 'Shortage:'}{' '}
                <strong>{singleUserSummary.totalShortageHours} س</strong> ({singleUserSummary.totalShortageMinutes} د)
              </div>

              <div className="px-3 py-1.5 rounded-xl bg-white border border-[#E5E2D9] text-[#2D3628]">
                {isAr ? 'نسبة الالتزام:' : 'Compliance:'}{' '}
                <strong className={singleUserSummary.complianceRatePct >= 90 ? 'text-[#5E7153]' : 'text-amber-600'}>
                  {singleUserSummary.complianceRatePct}%
                </strong>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ----------------------------------------------------
          4. DETAILED ATTENDANCE & SHORTAGE AUDIT TABLE
      ---------------------------------------------------- */}
      <div className="bg-white border border-[#E5E2D9] rounded-3xl shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#E5E2D9] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAF9F6]/60">
          <div>
            <h3 className="text-base font-extrabold text-[#2D3628] flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#5E7153]" />
              <span>
                {reportScope === 'single'
                  ? isAr ? `سجل وساعات دوام الموظف (${activeUser.name})` : `Attendance Log for ${activeUser.name}`
                  : isAr ? `جدول حركات الدوام وساعات التأخير والعجز لكافة الموظفين` : `All Employees Attendance & Shortage Audit Table`}
              </span>
            </h3>
            <p className="text-xs text-[#65635E] mt-0.5">
              {isAr
                ? `يتم رصد التأخير الصباحي من ${companySchedule.startTime} والانصراف المبكر قبل ${companySchedule.endTime}، مع حساب العجز الإجمالي اليومي مقارنة بـ ${companySchedule.dailyWorkHours} ساعات.`
                : `Morning delay tracked from ${companySchedule.startTime}, early departure before ${companySchedule.endTime}, and total daily shortage vs ${companySchedule.dailyWorkHours} hrs.`}
            </p>
          </div>

          <div className="text-xs font-semibold text-[#65635E]">
            {isAr ? `إجمالي السجلات:` : `Total Records:`}{' '}
            <strong className="text-[#2D3628]">{filteredRecords.length}</strong>
          </div>
        </div>

        {/* Table Area */}
        {filteredRecords.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Clock className="w-12 h-12 text-[#A3B899] mx-auto mb-3" />
            <h4 className="text-base font-bold text-[#2D3628]">
              {isAr ? 'لا توجد حركات حضور مطابقة لخيارات الفلترة' : 'No attendance records match your filters'}
            </h4>
            <p className="text-xs text-[#65635E] mt-1 max-w-sm mx-auto">
              {isAr
                ? 'جرب تغيير الشهر أو إزالة الفلاتر، أو قم بتسجيل بصمة تجريبية عبر زر "تسجيل / اختبار بصمة مخصصة".'
                : 'Try adjusting the month or filters, or simulate a custom punch.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-[#FAF9F6] border-b border-[#E5E2D9] text-[#65635E] font-bold select-none">
                  <th className="py-3.5 px-3 w-10 text-center">#</th>
                  {reportScope === 'all' && (
                    <th className="py-3.5 px-3">{isAr ? 'الموظف' : 'Employee'}</th>
                  )}
                  <th className="py-3.5 px-3">{isAr ? 'التاريخ واليوم' : 'Date & Day'}</th>
                  <th className="py-3.5 px-3">{isAr ? 'الدوام الرسمي' : 'Official Shift'}</th>
                  <th className="py-3.5 px-3 text-center">{isAr ? 'الدخول الفعلي' : 'Check-in'}</th>
                  <th className="py-3.5 px-3 text-center">{isAr ? 'الخروج الفعلي' : 'Check-out'}</th>
                  <th className="py-3.5 px-3 text-center">{isAr ? 'الساعات المنجزة' : 'Worked Hours'}</th>
                  <th className="py-3.5 px-3 text-center">{isAr ? 'تأخير الدخول' : 'Late In'}</th>
                  <th className="py-3.5 px-3 text-center">{isAr ? 'الانصراف المبكر' : 'Early Out'}</th>
                  <th className="py-3.5 px-3 text-center">{isAr ? 'إجمالي العجز والتأخير' : 'Total Deficit'}</th>
                  <th className="py-3.5 px-3 text-center">{isAr ? 'حالة اليوم' : 'Daily Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E2D9]">
                {filteredRecords.map((r, idx) => {
                  const metrics = calculateAttendanceMetrics({
                    checkInTime: r.checkInTime,
                    checkOutTime: r.checkOutTime,
                    date: r.date,
                    schedule: companySchedule,
                    existingLateWaived: !!r.isLateDeductionWaived,
                  });

                  const dayName = getDayName(r.date, isAr);
                  const isWeekendDay = metrics.isWeekend;

                  return (
                    <tr
                      key={r.id || `rec-${idx}`}
                      className={`hover:bg-[#FAF9F6]/80 transition-colors ${
                        isWeekendDay ? 'bg-stone-50/50 text-[#8C8A84]' : ''
                      }`}
                    >
                      {/* # Index */}
                      <td className="py-3 px-3 text-center font-mono text-[#65635E]">
                        {idx + 1}
                      </td>

                      {/* Employee (If All Employees View) */}
                      {reportScope === 'all' && (
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-[#5E7153]/15 text-[#5E7153] flex items-center justify-center font-bold text-xs shrink-0">
                              {r.userName?.charAt(0) || 'م'}
                            </div>
                            <div className="truncate">
                              <div className="font-bold text-[#2D3628] hover:text-[#5E7153] cursor-pointer"
                                onClick={() => {
                                  setSelectedUserId(r.userId);
                                  setReportScope('single');
                                }}
                              >
                                {r.userName}
                              </div>
                              <div className="text-[11px] text-[#65635E] flex items-center gap-1.5">
                                <span>{r.department}</span>
                                {r.biometricEnrollId && (
                                  <span className="text-[10px] font-mono text-[#5E7153]">
                                    #{r.biometricEnrollId}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      )}

                      {/* Date & Day */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-[#2D3628]">{r.date}</div>
                        <div className="text-[11px] text-[#65635E]">{dayName}</div>
                      </td>

                      {/* Official Shift */}
                      <td className="py-3 px-3">
                        {isWeekendDay ? (
                          <span className="text-[11px] text-[#8C8A84] italic">
                            {isAr ? 'عطلة أسبوعية' : 'Rest Day'}
                          </span>
                        ) : (
                          <div>
                            <div className="font-mono text-xs font-semibold text-[#2D3628]">
                              {companySchedule.startTime} - {companySchedule.endTime}
                            </div>
                            <div className="text-[10px] text-[#65635E]">
                              {metrics.dailyRequiredHours} {isAr ? 'ساعات مطلوبة' : 'hrs target'}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Actual Check-in */}
                      <td className="py-3 px-3 text-center">
                        {r.checkInTime ? (
                          <span className="font-mono font-bold text-[#2D3628] px-2 py-0.5 rounded-md bg-[#FAF9F6] border border-[#E5E2D9]">
                            {r.checkInTime}
                          </span>
                        ) : isWeekendDay ? (
                          <span className="text-[#8C8A84]">-</span>
                        ) : (
                          <span className="text-rose-700 font-semibold text-[11px] px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200">
                            {isAr ? 'لم يسجل' : 'Missing'}
                          </span>
                        )}
                      </td>

                      {/* Actual Check-out */}
                      <td className="py-3 px-3 text-center">
                        {r.checkOutTime ? (
                          <span className="font-mono font-bold text-[#2D3628] px-2 py-0.5 rounded-md bg-[#FAF9F6] border border-[#E5E2D9]">
                            {r.checkOutTime}
                          </span>
                        ) : isWeekendDay ? (
                          <span className="text-[#8C8A84]">-</span>
                        ) : r.checkInTime ? (
                          <span className="text-amber-700 font-semibold text-[11px] px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200">
                            {isAr ? 'قيد الدوام' : 'In Progress'}
                          </span>
                        ) : (
                          <span className="text-[#8C8A84]">-</span>
                        )}
                      </td>

                      {/* Worked Hours */}
                      <td className="py-3 px-3 text-center">
                        {metrics.totalWorkingHours > 0 ? (
                          <div className="font-mono font-extrabold text-[#2D3628]">
                            {metrics.totalWorkingHours}{' '}
                            <span className="text-[10px] font-normal text-[#65635E]">
                              {isAr ? 'ساعة' : 'h'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[#8C8A84]">-</span>
                        )}
                      </td>

                      {/* Late In Minutes */}
                      <td className="py-3 px-3 text-center">
                        {metrics.lateMinutes > 0 ? (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 font-bold text-xs">
                            <span>+{metrics.lateMinutes}</span>
                            <span className="text-[10px] font-normal">{isAr ? 'د' : 'm'}</span>
                          </div>
                        ) : isWeekendDay ? (
                          <span className="text-[#8C8A84]">-</span>
                        ) : (
                          <span className="text-[#5E7153] font-semibold text-[11px]">
                            {isAr ? 'ملتزم' : 'On time'}
                          </span>
                        )}
                      </td>

                      {/* Early Out Minutes */}
                      <td className="py-3 px-3 text-center">
                        {metrics.earlyLeaveMinutes > 0 ? (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-50 border border-orange-200 text-orange-800 font-bold text-xs">
                            <span>-{metrics.earlyLeaveMinutes}</span>
                            <span className="text-[10px] font-normal">{isAr ? 'د' : 'm'}</span>
                          </div>
                        ) : isWeekendDay ? (
                          <span className="text-[#8C8A84]">-</span>
                        ) : (
                          <span className="text-[#5E7153] font-semibold text-[11px]">
                            {isAr ? 'كامل' : 'Full'}
                          </span>
                        )}
                      </td>

                      {/* Total Deficit / Shortage */}
                      <td className="py-3 px-3 text-center">
                        {metrics.dailyShortageMinutes > 0 ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="px-2.5 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-800 font-bold text-xs">
                              {metrics.dailyShortageHours} {isAr ? 'ساعة عجز' : 'h deficit'}
                            </span>
                            <span className="text-[10px] text-rose-700 mt-0.5">
                              ({metrics.dailyShortageMinutes} {isAr ? 'دقيقة إجمالية' : 'mins'})
                            </span>
                          </div>
                        ) : isWeekendDay ? (
                          <span className="text-[#8C8A84]">-</span>
                        ) : r.checkInTime && !r.checkOutTime ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-medium text-[11px] border border-amber-200">
                            <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                            <span>{isAr ? 'دوام جارٍ' : 'In Progress'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#E9EDD9] text-[#5E7153] font-bold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{isAr ? 'مكتمل (8س)' : '100%'}</span>
                          </span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-3 text-center">
                        {isWeekendDay ? (
                          <span className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-600 text-[11px] font-medium">
                            {isAr ? 'عطلة أسبوعية' : 'Weekend'}
                          </span>
                        ) : r.status === 'wfh' ? (
                          <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-medium">
                            {isAr ? 'عمل عن بعد' : 'Remote WFH'}
                          </span>
                        ) : r.status === 'on_leave' ? (
                          <span className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-medium">
                            {isAr ? 'إجازة رسمية' : 'On Leave'}
                          </span>
                        ) : metrics.status === 'absent' ? (
                          <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 text-[11px] font-bold">
                            {isAr ? 'غياب' : 'Absent'}
                          </span>
                        ) : r.checkInTime && !r.checkOutTime ? (
                          metrics.lateMinutes > 0 ? (
                            <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold inline-flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              {isAr ? `على رأس العمل (تأخر ${metrics.lateMinutes} د)` : `On Duty (Late ${metrics.lateMinutes}m)`}
                            </span>
                          ) : metrics.status === 'missing_checkout' ? (
                            <span className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-700 border border-stone-300 text-[11px] font-bold inline-flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 text-stone-500" />
                              {isAr ? 'لم يسجل انصراف' : 'Missing Checkout'}
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold inline-flex items-center gap-1">
                              <Clock className="w-3 h-3 text-emerald-600 animate-pulse" />
                              {isAr ? 'على رأس العمل (حضور في الموعد)' : 'On Duty (Clocked In)'}
                            </span>
                          )
                        ) : metrics.lateMinutes > 0 && metrics.earlyLeaveMinutes > 0 ? (
                          <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            {isAr ? 'تأخير وانصراف مبكر' : 'Late & Early'}
                          </span>
                        ) : metrics.lateMinutes > 0 ? (
                          <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            {isAr ? `تأخير حضور (${metrics.lateMinutes} د)` : `Late Check-in (${metrics.lateMinutes}m)`}
                          </span>
                        ) : metrics.earlyLeaveMinutes > 0 ? (
                          <span className="px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200 text-[11px] font-bold inline-flex items-center gap-1">
                            <TrendingDown className="w-3 h-3 text-orange-600" />
                            {isAr ? `انصراف مبكر (${metrics.earlyLeaveMinutes} د)` : `Early Departure (${metrics.earlyLeaveMinutes}m)`}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-[#E9EDD9] text-[#2D3628] text-[11px] font-bold inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-[#5E7153]" />
                            {isAr ? 'دوام مكتمل (حاضر في الموعد)' : 'Full Shift (On Time)'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ----------------------------------------------------
          5. MODAL: PRINT / PDF PREVIEW MODAL
      ---------------------------------------------------- */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl p-6 sm:p-10 my-6 text-[#2D3628] animate-in fade-in zoom-in-95">
            {/* Action Bar inside Print Modal */}
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#E5E2D9] print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-[#5E7153]" />
                <h4 className="font-extrabold text-lg text-[#2D3628]">
                  {isAr ? 'معاينة كشف الدوام والطباعة الرسمية' : 'Official Attendance Sheet Preview'}
                </h4>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5E7153] hover:bg-[#4E5E44] text-white font-bold text-xs shadow-md transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  <span>{isAr ? 'طباعة التقرير (Print)' : 'Print Now'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-2 rounded-xl text-[#65635E] hover:bg-[#FAF9F6]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Content Block */}
            <div className="space-y-6">
              {/* Document Header */}
              <div className="flex items-start justify-between border-b pb-4">
                <div>
                  <h1 className="text-xl font-black text-[#2D3628] tracking-tight">
                    {companySchedule.companyName}
                  </h1>
                  <h2 className="text-sm font-bold text-[#5E7153] mt-1">
                    {isAr ? 'كشف حركات الحضور والانصراف وساعات العمل والتأخير' : 'Attendance & Shortage Statement'}
                  </h2>
                  <div className="text-xs text-[#65635E] mt-1">
                    {isAr ? `الشهر: ${selectedMonth}` : `Period: ${selectedMonth}`} •{' '}
                    {reportScope === 'single' ? (isAr ? `الموظف: ${activeUser.name}` : `Employee: ${activeUser.name}`) : (isAr ? 'كافة موظفي الشركة' : 'All Employees')}
                  </div>
                </div>

                <div className="text-left text-xs text-[#65635E]">
                  <div>{isAr ? 'تاريخ الاستخراج:' : 'Generated on:'} {new Date().toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}</div>
                  <div>{isAr ? 'الدوام الرسمي:' : 'Shift:'} {companySchedule.startTime} - {companySchedule.endTime} ({companySchedule.dailyWorkHours}h)</div>
                  <div>{isAr ? 'إعداد قسم الموارد البشرية' : 'HR Department'}</div>
                </div>
              </div>

              {/* Printable Summary Stats Box */}
              <div className="grid grid-cols-4 gap-3 p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-center">
                <div>
                  <div className="text-stone-500 font-semibold">{isAr ? 'الساعات المطلوبة' : 'Target Hours'}</div>
                  <div className="text-base font-extrabold text-[#2D3628]">{summaryKpis.totalTargetHours} h</div>
                </div>
                <div>
                  <div className="text-stone-500 font-semibold">{isAr ? 'الساعات المنجزة' : 'Worked Hours'}</div>
                  <div className="text-base font-extrabold text-[#5E7153]">{summaryKpis.totalActualHours} h</div>
                </div>
                <div>
                  <div className="text-stone-500 font-semibold">{isAr ? 'إجمالي التأخير' : 'Late Arrival'}</div>
                  <div className="text-base font-extrabold text-amber-700">{summaryKpis.totalLateMins} min</div>
                </div>
                <div>
                  <div className="text-stone-500 font-semibold">{isAr ? 'إجمالي العجز' : 'Total Deficit'}</div>
                  <div className="text-base font-extrabold text-rose-800">{summaryKpis.totalShortageHours} h</div>
                </div>
              </div>

              {/* Printable Compact Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs border border-stone-300">
                  <thead className="bg-stone-100 text-stone-700 font-bold border-b border-stone-300">
                    <tr>
                      <th className="p-2 text-center w-8">#</th>
                      {reportScope === 'all' && <th className="p-2">{isAr ? 'الموظف' : 'Employee'}</th>}
                      <th className="p-2">{isAr ? 'التاريخ' : 'Date'}</th>
                      <th className="p-2">{isAr ? 'اليوم' : 'Day'}</th>
                      <th className="p-2 text-center">{isAr ? 'الدخول' : 'In'}</th>
                      <th className="p-2 text-center">{isAr ? 'الخروج' : 'Out'}</th>
                      <th className="p-2 text-center">{isAr ? 'الساعات' : 'Worked'}</th>
                      <th className="p-2 text-center">{isAr ? 'تأخير الدخول' : 'Late'}</th>
                      <th className="p-2 text-center">{isAr ? 'خروج مبكر' : 'Early'}</th>
                      <th className="p-2 text-center">{isAr ? 'العجز' : 'Deficit'}</th>
                      <th className="p-2 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {filteredRecords.slice(0, 35).map((r, idx) => {
                      const m = calculateAttendanceMetrics({
                        checkInTime: r.checkInTime,
                        checkOutTime: r.checkOutTime,
                        date: r.date,
                        schedule: companySchedule,
                        existingLateWaived: !!r.isLateDeductionWaived,
                      });
                      return (
                        <tr key={idx} className={m.isWeekend ? 'bg-stone-50' : ''}>
                          <td className="p-1.5 text-center font-mono">{idx + 1}</td>
                          {reportScope === 'all' && <td className="p-1.5 font-bold">{r.userName}</td>}
                          <td className="p-1.5 font-mono">{r.date}</td>
                          <td className="p-1.5">{getDayName(r.date, isAr)}</td>
                          <td className="p-1.5 text-center font-mono">{r.checkInTime || '-'}</td>
                          <td className="p-1.5 text-center font-mono">{r.checkOutTime || '-'}</td>
                          <td className="p-1.5 text-center font-bold">{m.totalWorkingHours || '-'}</td>
                          <td className="p-1.5 text-center text-amber-700 font-bold">{m.lateMinutes > 0 ? `${m.lateMinutes}m` : '-'}</td>
                          <td className="p-1.5 text-center text-orange-700 font-bold">{m.earlyLeaveMinutes > 0 ? `${m.earlyLeaveMinutes}m` : '-'}</td>
                          <td className="p-1.5 text-center text-rose-700 font-bold">{m.dailyShortageHours > 0 ? `${m.dailyShortageHours}h` : '-'}</td>
                          <td className="p-1.5 text-center text-[10px]">
                            {m.isWeekend ? 'عطلة' : m.lateMinutes > 0 ? 'تأخير' : 'حاضر'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Signatures Footer */}
              <div className="pt-8 border-t border-stone-300 grid grid-cols-3 text-center text-xs">
                <div>
                  <div className="font-bold text-[#2D3628]">{isAr ? 'أخصائي الموارد البشرية' : 'HR Specialist'}</div>
                  <div className="mt-8 border-b border-stone-400 w-32 mx-auto"></div>
                </div>
                <div>
                  <div className="font-bold text-[#2D3628]">{isAr ? 'مدير إدارة الموارد البشرية' : 'HR Director'}</div>
                  <div className="mt-8 border-b border-stone-400 w-32 mx-auto"></div>
                </div>
                <div>
                  <div className="font-bold text-[#2D3628]">{isAr ? 'الاعتماد العام / الختم' : 'General Approval / Stamp'}</div>
                  <div className="mt-8 border-b border-stone-400 w-32 mx-auto"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          6. MODAL: MANUAL PUNCH SIMULATOR / ADJUSTMENT
      ---------------------------------------------------- */}
      {isPunchModalOpen && onRecordPunch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2D3628]/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 text-[#2D3628] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E2D9]">
              <div className="flex items-center gap-2">
                <Play className="w-5 h-5 text-[#5E7153]" />
                <h4 className="font-extrabold text-base">
                  {isAr ? 'تسجيل / اختبار بصمة مخصصة' : 'Simulate Custom Punch'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsPunchModalOpen(false)}
                className="p-1.5 rounded-lg text-[#65635E] hover:bg-[#FAF9F6]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleManualPunchSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#2D3628] mb-1">
                  {isAr ? 'اختر الموظف:' : 'Employee:'}
                </label>
                <select
                  value={punchUser}
                  onChange={(e) => setPunchUser(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E2D9] font-semibold bg-[#FAF9F6]"
                >
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} - #{u.biometricEnrollId || '-'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#2D3628] mb-1">
                    {isAr ? 'نوع البصمة:' : 'Punch Type:'}
                  </label>
                  <select
                    value={punchType}
                    onChange={(e) => setPunchType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E2D9] font-semibold bg-[#FAF9F6]"
                  >
                    <option value="check_in">{isAr ? 'بصمة دخول (Check-in)' : 'Check-in'}</option>
                    <option value="check_out">{isAr ? 'بصمة خروج (Check-out)' : 'Check-out'}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#2D3628] mb-1">
                    {isAr ? 'وقت البصمة:' : 'Punch Time:'}
                  </label>
                  <input
                    type="time"
                    required
                    value={punchTime}
                    onChange={(e) => setPunchTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E2D9] font-semibold bg-[#FAF9F6]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#2D3628] mb-1">
                  {isAr ? 'التاريخ:' : 'Date:'}
                </label>
                <input
                  type="date"
                  required
                  value={punchDate}
                  onChange={(e) => setPunchDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E2D9] font-semibold bg-[#FAF9F6]"
                />
              </div>

              <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E5E2D9] text-[#65635E] leading-relaxed">
                {isAr ? (
                  <>
                    الدوام الرسمي يبدأ <strong>{companySchedule.startTime}</strong> (سماحية {companySchedule.checkInGraceMinutes}د) وينتهي <strong>{companySchedule.endTime}</strong>.
                    سيتم احتساب التأخير والعجز اليومي ومقارنته بـ {companySchedule.dailyWorkHours} ساعات فوراً.
                  </>
                ) : (
                  `Official start is ${companySchedule.startTime} and ends at ${companySchedule.endTime}. Deficit will be evaluated automatically.`
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E2D9]">
                <button
                  type="button"
                  onClick={() => setIsPunchModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E5E2D9] font-bold text-[#65635E]"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isPunchSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#5E7153] hover:bg-[#4E5E44] text-white font-bold"
                >
                  {isPunchSubmitting ? (isAr ? 'جارٍ التسجيل...' : 'Recording...') : (isAr ? 'تسجيل البصمة' : 'Record Punch')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
