import * as XLSX from 'xlsx';
import { CompanyWorkSchedule, AttendanceRecord, UserProfile } from '../types';

export const DEFAULT_COMPANY_SCHEDULE: CompanyWorkSchedule = {
  id: 'sched-default',
  companyName: 'شركة دوامي للحلول التقنية والتحول الرقمي',
  companyNameEn: 'Dawamy Tech Solutions Ltd.',
  workDays: [0, 1, 2, 3, 4], // Sunday to Thursday (الأحد إلى الخميس)
  dailyWorkHours: 8.0,
  startTime: '08:00',
  endTime: '16:00',
  checkInGraceMinutes: 15,
  checkOutGraceMinutes: 5,
  preset: 'sun_thu_8h',
  description: 'دوام رسمي 8 ساعات يومياً من الأحد إلى الخميس مع فترة سماح 15 دقيقة صباحاً و5 دقائق عند الانصراف.',
  descriptionEn: 'Official 8-hour daily schedule from Sunday to Thursday with 15 min check-in grace & 5 min checkout grace.',
};

export interface SchedulePresetOption {
  id: CompanyWorkSchedule['preset'];
  nameAr: string;
  nameEn: string;
  workDays: number[];
  dailyWorkHours: number;
  startTime: string;
  endTime: string;
  checkInGraceMinutes: number;
  checkOutGraceMinutes: number;
  descriptionAr: string;
  descriptionEn: string;
}

export const WORK_SCHEDULE_PRESETS: SchedulePresetOption[] = [
  {
    id: 'sun_thu_8h',
    nameAr: 'الأحد إلى الخميس (8 ساعات: 08:00 ص - 04:00 م)',
    nameEn: 'Sun to Thu (8 hrs: 08:00 AM - 04:00 PM)',
    workDays: [0, 1, 2, 3, 4],
    dailyWorkHours: 8.0,
    startTime: '08:00',
    endTime: '16:00',
    checkInGraceMinutes: 15,
    checkOutGraceMinutes: 5,
    descriptionAr: 'النظام الأكثر شيوعاً في الشركات والمؤسسات (40 ساعة أسبوعياً).',
    descriptionEn: 'Standard enterprise shift schedule (40 hours per week).',
  },
  {
    id: 'sat_thu_8h',
    nameAr: 'السبت إلى الخميس (8 ساعات: 08:00 ص - 04:00 م)',
    nameEn: 'Sat to Thu (8 hrs: 08:00 AM - 04:00 PM)',
    workDays: [6, 0, 1, 2, 3, 4], // 6 is Saturday
    dailyWorkHours: 8.0,
    startTime: '08:00',
    endTime: '16:00',
    checkInGraceMinutes: 15,
    checkOutGraceMinutes: 5,
    descriptionAr: 'نظام 6 أيام عمل أسبوعياً للمنشآت والمصانع وشركات المقاولات والتشغيل (48 ساعة أسبوعياً).',
    descriptionEn: '6-day operational work week for logistics, contracting and retail (48 hours per week).',
  },
  {
    id: 'sun_thu_7h',
    nameAr: 'الأحد إلى الخميس (7 ساعات: 09:00 ص - 04:00 م)',
    nameEn: 'Sun to Thu (7 hrs: 09:00 AM - 04:00 PM)',
    workDays: [0, 1, 2, 3, 4],
    dailyWorkHours: 7.0,
    startTime: '09:00',
    endTime: '16:00',
    checkInGraceMinutes: 15,
    checkOutGraceMinutes: 5,
    descriptionAr: 'نظام مخفض 7 ساعات يومياً (35 ساعة أسبوعياً أو الدوام الرمضاني والخاص).',
    descriptionEn: 'Reduced 7-hour daily work schedule (35 hours per week).',
  },
  {
    id: 'sat_thu_7h',
    nameAr: 'السبت إلى الخميس (7 ساعات: 08:30 ص - 03:30 م)',
    nameEn: 'Sat to Thu (7 hrs: 08:30 AM - 03:30 PM)',
    workDays: [6, 0, 1, 2, 3, 4],
    dailyWorkHours: 7.0,
    startTime: '08:30',
    endTime: '15:30',
    checkInGraceMinutes: 15,
    checkOutGraceMinutes: 5,
    descriptionAr: 'نظام 6 أيام عمل بواقع 7 ساعات يومياً (42 ساعة أسبوعياً).',
    descriptionEn: '6-day work week with 7 hours per day (42 hours per week).',
  },
  {
    id: 'custom',
    nameAr: 'نظام مخصص حسب المنشأة / الشركة (Custom)',
    nameEn: 'Custom Company Schedule & Shifts',
    workDays: [0, 1, 2, 3, 4],
    dailyWorkHours: 8.0,
    startTime: '08:00',
    endTime: '16:00',
    checkInGraceMinutes: 15,
    checkOutGraceMinutes: 5,
    descriptionAr: 'تحديد مخصص بالكامل لأيام العمل وساعات البداية والنهاية وسماحية التأخير.',
    descriptionEn: 'Fully customizable working days, shift hours, and grace periods.',
  },
];

export const DAYS_OF_WEEK_INFO = [
  { dayIndex: 0, nameAr: 'الأحد', nameEn: 'Sunday', shortAr: 'أحد', shortEn: 'Sun' },
  { dayIndex: 1, nameAr: 'الإثنين', nameEn: 'Monday', shortAr: 'إثنين', shortEn: 'Mon' },
  { dayIndex: 2, nameAr: 'الثلاثاء', nameEn: 'Tuesday', shortAr: 'ثلاثاء', shortEn: 'Tue' },
  { dayIndex: 3, nameAr: 'الأربعاء', nameEn: 'Wednesday', shortAr: 'أربعاء', shortEn: 'Wed' },
  { dayIndex: 4, nameAr: 'الخميس', nameEn: 'Thursday', shortAr: 'خميس', shortEn: 'Thu' },
  { dayIndex: 5, nameAr: 'الجمعة', nameEn: 'Friday', shortAr: 'جمعة', shortEn: 'Fri' },
  { dayIndex: 6, nameAr: 'السبت', nameEn: 'Saturday', shortAr: 'سبت', shortEn: 'Sat' },
];

/**
 * Parses time string like "08:25:12", "08:25", "8:30 AM", "04:15 م" into minutes from midnight (0-1439).
 */
export function parseTimeToMinutes(timeStr?: string): number | null {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const raw = timeStr.trim();
  if (!raw) return null;

  // Check 12-hour format with AM/PM or ص/م
  const isPM = raw.toLowerCase().includes('pm') || raw.includes('م') || raw.includes('مساء');
  const isAM = raw.toLowerCase().includes('am') || raw.includes('ص') || raw.includes('صباح');

  // Strip non-digit and non-colon characters
  const cleanStr = raw.replace(/[^\d:]/g, '');
  const parts = cleanStr.split(':');
  if (parts.length < 2) return null;

  let hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);

  if (isNaN(hours) || isNaN(minutes)) return null;

  if (isPM && hours < 12) {
    hours += 12;
  } else if (isAM && hours === 12) {
    hours = 0;
  }

  return hours * 60 + minutes;
}

/**
 * Format minutes into "08:30" (24h)
 */
export function formatMinutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.floor(minutes % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Human-readable hours and minutes (e.g., "ساعة و15 دقيقة" / "1 hr 15 min")
 */
export function formatMinutesHumanReadable(minutes: number, isAr: boolean): string {
  if (!minutes || minutes <= 0) {
    return isAr ? 'لا يوجد' : '0 min';
  }
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);

  if (hrs === 0) {
    return isAr ? `${mins} دقيقة` : `${mins} min`;
  }
  if (mins === 0) {
    return isAr ? `${hrs} ساعة` : `${hrs} hrs`;
  }

  return isAr ? `${hrs} ساعة و${mins} دقيقة` : `${hrs}h ${mins}m`;
}

/**
 * Calculate attendance metrics for a single day record based on company schedule
 */
export function calculateAttendanceMetrics({
  checkInTime,
  checkOutTime,
  date,
  schedule,
  existingLateWaived = false,
}: {
  checkInTime?: string;
  checkOutTime?: string;
  date: string;
  schedule: CompanyWorkSchedule;
  existingLateWaived?: boolean;
}): {
  isWeekend: boolean;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  actualWorkedMinutes: number;
  totalWorkingHours: number;
  dailyShortageMinutes: number;
  dailyShortageHours: number;
  dailyRequiredHours: number;
  officialStartTime: string;
  officialEndTime: string;
  status: AttendanceRecord['status'];
} {
  const safeSchedule = schedule || DEFAULT_COMPANY_SCHEDULE;
  const dateObj = new Date(date);
  const dayOfWeek = isNaN(dateObj.getTime()) ? 0 : dateObj.getDay();

  const isWeekend = !safeSchedule.workDays.includes(dayOfWeek);
  const dailyRequiredHours = isWeekend ? 0 : safeSchedule.dailyWorkHours;
  const requiredTargetMinutes = dailyRequiredHours * 60;

  const officialStartMins = parseTimeToMinutes(safeSchedule.startTime) ?? 8 * 60;
  const officialEndMins = parseTimeToMinutes(safeSchedule.endTime) ?? 16 * 60;

  const actualInMins = parseTimeToMinutes(checkInTime);
  const actualOutMins = parseTimeToMinutes(checkOutTime);

  let lateMinutes = 0;
  let earlyLeaveMinutes = 0;
  let actualWorkedMinutes = 0;

  // 1. Calculate check-in delay (morning)
  if (actualInMins !== null && !isWeekend) {
    const graceThreshold = officialStartMins + safeSchedule.checkInGraceMinutes;
    if (actualInMins > graceThreshold) {
      lateMinutes = actualInMins - officialStartMins;
    }
  }

  // 2. Calculate check-out early departure (evening)
  if (actualOutMins !== null && !isWeekend) {
    const graceThreshold = officialEndMins - safeSchedule.checkOutGraceMinutes;
    if (actualOutMins < graceThreshold) {
      earlyLeaveMinutes = Math.max(0, officialEndMins - actualOutMins);
    }
  }

  // 3. Calculate actual working duration
  if (actualInMins !== null && actualOutMins !== null) {
    actualWorkedMinutes = Math.max(0, actualOutMins - actualInMins);
  } else if (actualInMins !== null) {
    // Check in exists but not checked out yet
    actualWorkedMinutes = 0;
  }

  const totalWorkingHours = actualWorkedMinutes > 0
    ? Math.round((actualWorkedMinutes / 60) * 100) / 100
    : 0;

  // 4. Calculate total daily shortage compared to required hours
  let dailyShortageMinutes = 0;
  if (!isWeekend) {
    if (actualInMins !== null && actualOutMins !== null) {
      // Comparison to target daily hours
      const deficitByHours = Math.max(0, requiredTargetMinutes - actualWorkedMinutes);
      // Combined check-in delay + early checkout delay
      const combinedDelays = lateMinutes + earlyLeaveMinutes;
      // Total shortage accounts for both the deficit vs required hours and any punctual delays
      dailyShortageMinutes = Math.max(deficitByHours, combinedDelays);
    } else if (actualInMins !== null) {
      // Still in progress or missing check-out
      dailyShortageMinutes = lateMinutes;
    } else {
      // Absent or unrecorded
      dailyShortageMinutes = requiredTargetMinutes;
    }
  }

  const dailyShortageHours = Math.round((dailyShortageMinutes / 60) * 100) / 100;

  // 5. Determine status
  let status: AttendanceRecord['status'] = 'present';
  if (isWeekend) {
    status = 'weekend';
  } else if (actualInMins === null && actualOutMins === null) {
    status = 'absent';
  } else if (lateMinutes > 0 && earlyLeaveMinutes > 0) {
    status = 'late_and_early';
  } else if (lateMinutes > 0) {
    status = 'late';
  } else if (earlyLeaveMinutes > 0) {
    status = 'early_leave';
  } else {
    status = 'present';
  }

  return {
    isWeekend,
    lateMinutes,
    earlyLeaveMinutes,
    actualWorkedMinutes,
    totalWorkingHours,
    dailyShortageMinutes,
    dailyShortageHours,
    dailyRequiredHours,
    officialStartTime: safeSchedule.startTime,
    officialEndTime: safeSchedule.endTime,
    status,
  };
}

/**
 * Re-evaluates an attendance record with the given company schedule
 */
export function applyScheduleToRecord(
  rec: AttendanceRecord,
  schedule: CompanyWorkSchedule
): AttendanceRecord {
  if (!rec) return rec;

  const metrics = calculateAttendanceMetrics({
    checkInTime: rec.checkInTime,
    checkOutTime: rec.checkOutTime,
    date: rec.date,
    schedule,
    existingLateWaived: !!rec.isLateDeductionWaived,
  });

  return {
    ...rec,
    officialStartTime: metrics.officialStartTime,
    officialEndTime: metrics.officialEndTime,
    dailyRequiredHours: metrics.dailyRequiredHours,
    lateMinutes: metrics.lateMinutes,
    earlyLeaveMinutes: metrics.earlyLeaveMinutes,
    totalWorkingHours: rec.checkOutTime ? metrics.totalWorkingHours : (rec.totalWorkingHours || 0),
    dailyShortageMinutes: metrics.dailyShortageMinutes,
    dailyShortageHours: metrics.dailyShortageHours,
    isWeekend: metrics.isWeekend,
    status: rec.status === 'wfh' || rec.status === 'on_leave' ? rec.status : metrics.status,
  };
}

/**
 * Summary calculations for all employees or a single employee
 */
export interface EmployeeScheduleSummary {
  userId: string;
  userName: string;
  userNameEn: string;
  department: string;
  userEmail: string;
  biometricEnrollId: string;
  avatar: string;
  totalRecordsCount: number;
  totalWorkDays: number;
  totalPresentDays: number;
  totalLateDays: number;
  totalEarlyLeaveDays: number;
  totalAbsentDays: number;
  totalOfficialRequiredHours: number;
  totalActualWorkedHours: number;
  totalLateMinutes: number;
  totalEarlyLeaveMinutes: number;
  totalShortageMinutes: number;
  totalShortageHours: number;
  complianceRatePct: number;
}

export function computeEmployeeScheduleSummary(
  user: UserProfile,
  records: AttendanceRecord[],
  schedule: CompanyWorkSchedule
): EmployeeScheduleSummary {
  const userRecs = (records || []).filter((r) => r && r.userId === user.id);

  let totalWorkDays = 0;
  let totalPresentDays = 0;
  let totalLateDays = 0;
  let totalEarlyLeaveDays = 0;
  let totalAbsentDays = 0;
  let totalOfficialRequiredHours = 0;
  let totalActualWorkedHours = 0;
  let totalLateMinutes = 0;
  let totalEarlyLeaveMinutes = 0;
  let totalShortageMinutes = 0;

  userRecs.forEach((r) => {
    const metrics = calculateAttendanceMetrics({
      checkInTime: r.checkInTime,
      checkOutTime: r.checkOutTime,
      date: r.date,
      schedule,
      existingLateWaived: !!r.isLateDeductionWaived,
    });

    if (!metrics.isWeekend) {
      totalWorkDays += 1;
      totalOfficialRequiredHours += metrics.dailyRequiredHours;
      totalActualWorkedHours += metrics.totalWorkingHours;
      totalLateMinutes += metrics.lateMinutes;
      totalEarlyLeaveMinutes += metrics.earlyLeaveMinutes;
      totalShortageMinutes += metrics.dailyShortageMinutes;

      if (metrics.status === 'absent') {
        totalAbsentDays += 1;
      } else {
        totalPresentDays += 1;
      }

      if (metrics.lateMinutes > 0) totalLateDays += 1;
      if (metrics.earlyLeaveMinutes > 0) totalEarlyLeaveDays += 1;
    }
  });

  const totalShortageHours = Math.round((totalShortageMinutes / 60) * 100) / 100;
  totalActualWorkedHours = Math.round(totalActualWorkedHours * 100) / 100;
  totalOfficialRequiredHours = Math.round(totalOfficialRequiredHours * 100) / 100;

  const complianceRatePct = totalOfficialRequiredHours > 0
    ? Math.min(100, Math.max(0, Math.round((totalActualWorkedHours / totalOfficialRequiredHours) * 100)))
    : 100;

  return {
    userId: user.id,
    userName: user.name,
    userNameEn: user.nameEn || user.name,
    department: user.department,
    userEmail: user.email,
    biometricEnrollId: user.biometricEnrollId || '-',
    avatar: user.avatar,
    totalRecordsCount: userRecs.length,
    totalWorkDays,
    totalPresentDays,
    totalLateDays,
    totalEarlyLeaveDays,
    totalAbsentDays,
    totalOfficialRequiredHours,
    totalActualWorkedHours,
    totalLateMinutes,
    totalEarlyLeaveMinutes,
    totalShortageMinutes,
    totalShortageHours,
    complianceRatePct,
  };
}

/**
 * Get Arabic or English day name from Date string
 */
export function getDayName(dateStr: string, isAr: boolean): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    const dayIdx = d.getDay();
    const item = DAYS_OF_WEEK_INFO.find((x) => x.dayIndex === dayIdx);
    return item ? (isAr ? item.nameAr : item.nameEn) : '-';
  } catch {
    return '-';
  }
}

/**
 * Export Detailed Attendance & Shortage Report to Excel (.xlsx)
 * Supports all employees or a single specific employee.
 */
export function exportAttendanceAndShortageExcel({
  records,
  schedule,
  isAr,
  selectedUser,
  monthName,
}: {
  records: AttendanceRecord[];
  schedule: CompanyWorkSchedule;
  isAr: boolean;
  selectedUser?: UserProfile | null;
  monthName?: string;
}) {
  try {
    const safeSchedule = schedule || DEFAULT_COMPANY_SCHEDULE;
    const safeRecords = records || [];

    const rows = safeRecords.map((r, idx) => {
      const metrics = calculateAttendanceMetrics({
        checkInTime: r.checkInTime,
        checkOutTime: r.checkOutTime,
        date: r.date,
        schedule: safeSchedule,
        existingLateWaived: !!r.isLateDeductionWaived,
      });

      const dayName = getDayName(r.date, isAr);

      let statusLabel = isAr ? 'حاضر' : 'Present';
      if (metrics.isWeekend) statusLabel = isAr ? 'عطلة أسبوعية' : 'Weekend';
      else if (r.status === 'wfh') statusLabel = isAr ? 'عمل عن بعد' : 'Remote WFH';
      else if (r.status === 'on_leave') statusLabel = isAr ? 'إجازة رسمية' : 'On Leave';
      else if (metrics.status === 'absent') statusLabel = isAr ? 'غياب' : 'Absent';
      else if (metrics.lateMinutes > 0 && metrics.earlyLeaveMinutes > 0)
        statusLabel = isAr ? 'تأخير وانصراف مبكر' : 'Late & Early Leave';
      else if (metrics.lateMinutes > 0) statusLabel = isAr ? 'تأخير حضور' : 'Late Check-in';
      else if (metrics.earlyLeaveMinutes > 0) statusLabel = isAr ? 'انصراف مبكر' : 'Early Leave';

      return isAr
        ? {
            '#': idx + 1,
            'اسم الموظف': r.userName || '-',
            'الرقم الوظيفي / البصمة': r.biometricEnrollId || '-',
            'القسم': r.department || '-',
            'التاريخ': r.date,
            'اليوم': dayName,
            'بداية الدوام الرسمي': safeSchedule.startTime,
            'نهاية الدوام الرسمي': safeSchedule.endTime,
            'الساعات الرسمية المقررة': metrics.dailyRequiredHours,
            'وقت الدخول الفعلي': r.checkInTime || 'لم يسجل',
            'وقت الخروج الفعلي': r.checkOutTime || 'لم يسجل',
            'ساعات العمل الفعلية': metrics.totalWorkingHours ? `${metrics.totalWorkingHours} س` : '-',
            'تأخير الحضور (دقائق)': metrics.lateMinutes > 0 ? `${metrics.lateMinutes} دقيقة` : 'لا يوجد',
            'الانصراف المبكر (دقائق)': metrics.earlyLeaveMinutes > 0 ? `${metrics.earlyLeaveMinutes} دقيقة` : 'لا يوجد',
            'إجمالي العجز والتأخير': metrics.dailyShortageMinutes > 0
              ? `${formatMinutesHumanReadable(metrics.dailyShortageMinutes, true)} (${metrics.dailyShortageHours} س)`
              : 'ملتزم بالكامل',
            'حالة الدوام': statusLabel,
            'ملاحظات / الإعفاء': r.isLateDeductionWaived
              ? `معفى بواسطة ${r.waivedBy || 'الإدارة'} (${r.waivedReason || 'مهمة عمل'})`
              : (r.notes || '-'),
          }
        : {
            '#': idx + 1,
            'Employee Name': r.userNameEn || r.userName || '-',
            'Biometric ID': r.biometricEnrollId || '-',
            'Department': r.departmentEn || r.department || '-',
            'Date': r.date,
            'Day': dayName,
            'Official Shift Start': safeSchedule.startTime,
            'Official Shift End': safeSchedule.endTime,
            'Target Required Hours': metrics.dailyRequiredHours,
            'Actual Check-in': r.checkInTime || 'Missing',
            'Actual Check-out': r.checkOutTime || 'Missing',
            'Actual Worked Hours': metrics.totalWorkingHours ? `${metrics.totalWorkingHours} hrs` : '-',
            'Check-in Delay (min)': metrics.lateMinutes > 0 ? `${metrics.lateMinutes} min` : '0',
            'Early Departure (min)': metrics.earlyLeaveMinutes > 0 ? `${metrics.earlyLeaveMinutes} min` : '0',
            'Total Deficit / Delay': metrics.dailyShortageMinutes > 0
              ? `${formatMinutesHumanReadable(metrics.dailyShortageMinutes, false)} (${metrics.dailyShortageHours} h)`
              : 'Full Compliance',
            'Status': statusLabel,
            'Notes / Waiver': r.isLateDeductionWaived
              ? `Waived by ${r.waivedBy || 'HR'}`
              : (r.notes || '-'),
          };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Set auto column widths
    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 22 },
      { wch: 18 },
      { wch: 18 },
      { wch: 14 },
      { wch: 12 },
      { wch: 16 },
      { wch: 16 },
      { wch: 18 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 18 },
      { wch: 18 },
      { wch: 22 },
      { wch: 18 },
      { wch: 30 },
    ];

    const workbook = XLSX.utils.book_new();
    const sheetTitle = selectedUser
      ? (isAr ? 'كشف_دوام_فردي' : 'Employee_Statement')
      : (isAr ? 'كشف_ساعات_العمل_الشامل' : 'Company_Attendance');

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetTitle.slice(0, 30));

    const sanitizedName = selectedUser ? (selectedUser.name.replace(/\s+/g, '_')) : 'All_Employees';
    const dateStamp = new Date().toISOString().split('T')[0];
    const fileName = isAr
      ? `دوامي_كشف_ساعات_العمل_والتأخير_${sanitizedName}_${dateStamp}.xlsx`
      : `Dawamy_Attendance_Shortage_Report_${sanitizedName}_${dateStamp}.xlsx`;

    XLSX.writeFile(workbook, fileName);
  } catch (err) {
    console.error('Failed to export Excel report:', err);
  }
}
