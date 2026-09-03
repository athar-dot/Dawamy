import {
  UserProfile,
  AttendanceRecord,
  SalaryDeduction,
  MonthlyEmployeeLateSummary,
} from '../types';

/**
 * Calculates the monthly late attendance summary, 4-hour grace quota tracking,
 * salary deductions (from excess late hours and disciplinary penalties),
 * and net payable salary for an employee.
 */
export function calculateMonthlyEmployeeLateSummary(
  employee: UserProfile,
  attendanceRecords: AttendanceRecord[],
  deductions: SalaryDeduction[],
  selectedMonth: string = '2026-09' // YYYY-MM
): MonthlyEmployeeLateSummary {
  // 1. Filter attendance records for this employee in the chosen month
  const userMonthRecords = attendanceRecords.filter(
    (r) => r.userId === employee.id && r.date && r.date.startsWith(selectedMonth)
  );

  const lateRecords = userMonthRecords.filter((r) => (r.lateMinutes || 0) > 0);
  const activeLateRecords = lateRecords.filter((r) => !r.isLateDeductionWaived);

  // 2. Sum up un-waived late minutes
  const totalLateMinutes = activeLateRecords.reduce((sum, r) => sum + (r.lateMinutes || 0), 0);
  const totalLateHours = Math.round((totalLateMinutes / 60) * 100) / 100;

  // 3. Grace quota (default 4.0 hours / 240 minutes)
  const allowedGraceHours = employee.graceLateHoursMonthly !== undefined ? employee.graceLateHoursMonthly : 4.0;
  const allowedGraceMinutes = Math.round(allowedGraceHours * 60);

  const usedGraceMinutes = Math.min(totalLateMinutes, allowedGraceMinutes);
  const remainingGraceMinutes = Math.max(0, allowedGraceMinutes - totalLateMinutes);
  const remainingGraceHours = Math.round((remainingGraceMinutes / 60) * 100) / 100;

  // 4. Excess late hours subject to salary deduction
  const excessLateMinutes = Math.max(0, totalLateMinutes - allowedGraceMinutes);
  const excessLateHours = Math.round((excessLateMinutes / 60) * 100) / 100;

  // 5. Salary & hourly rate: Standard calculation (Salary / 30 days / 8 hours = hourly rate)
  const baseSalary = employee.salary || 14000;
  const salaryCurrency = employee.salaryCurrency || 'ر.س';
  const hourlyRate = Math.round((baseSalary / (30 * 8)) * 100) / 100; // Salary / 240h

  const lateDeductionAmount = Math.round(excessLateHours * hourlyRate * 100) / 100;

  // 6. Disciplinary / Penalty deductions
  const userMonthDeductions = deductions.filter(
    (d) => d.userId === employee.id && d.month === selectedMonth
  );

  const appliedPenalties = userMonthDeductions.filter(
    (d) => d.type !== 'late_arrival' && d.status === 'applied'
  );
  const penaltyDeductionsAmount = Math.round(
    appliedPenalties.reduce((sum, d) => sum + d.amount, 0) * 100
  ) / 100;

  // 7. Waived / lifted deductions (Both penalty waivers and waived late minutes)
  const waivedPenalties = userMonthDeductions.filter((d) => d.status === 'waived');
  const waivedPenaltiesAmount = waivedPenalties.reduce((sum, d) => sum + d.amount, 0);

  const waivedLateRecords = lateRecords.filter((r) => r.isLateDeductionWaived);
  const waivedLateMinutes = waivedLateRecords.reduce((sum, r) => sum + (r.lateMinutes || 0), 0);
  const waivedLateAmount = (waivedLateMinutes / 60) * hourlyRate;

  const waivedDeductionsAmount = Math.round((waivedPenaltiesAmount + waivedLateAmount) * 100) / 100;

  // 8. Net deductions and net salary
  const totalNetDeductions = Math.round((lateDeductionAmount + penaltyDeductionsAmount) * 100) / 100;
  const netSalary = Math.max(0, Math.round((baseSalary - totalNetDeductions) * 100) / 100);

  return {
    userId: employee.id,
    userName: employee.name,
    userNameEn: employee.nameEn,
    userEmail: employee.email,
    department: employee.department,
    avatar: employee.avatar,
    month: selectedMonth,
    baseSalary,
    salaryCurrency,
    hourlyRate,
    totalLateOccurrences: activeLateRecords.length,
    totalLateMinutes,
    totalLateHours,
    allowedGraceHours,
    allowedGraceMinutes,
    usedGraceMinutes,
    remainingGraceMinutes,
    remainingGraceHours,
    excessLateMinutes,
    excessLateHours,
    lateDeductionAmount,
    penaltyDeductionsAmount,
    waivedDeductionsAmount,
    totalNetDeductions,
    netSalary,
    lateRecords,
  };
}

/**
 * Format minutes into a user-friendly hours and minutes string
 */
export function formatMinutesHuman(minutes: number, lang: 'ar' | 'en'): string {
  const isAr = lang === 'ar';
  if (!minutes || minutes <= 0) {
    return isAr ? 'لا يوجد تأخير' : 'No delay';
  }

  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hrs > 0 && mins > 0) {
    return isAr ? `${hrs} س و ${mins} دقيقة` : `${hrs}h ${mins}m`;
  } else if (hrs > 0) {
    return isAr ? `${hrs} ساعة` : `${hrs} hour${hrs > 1 ? 's' : ''}`;
  } else {
    return isAr ? `${mins} دقيقة` : `${mins} min${mins > 1 ? 's' : ''}`;
  }
}

/**
 * Formats a currency number with clean commas and 2 decimals
 */
export function formatSalaryCurrency(amount: number, currency: string = 'ر.س'): string {
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${formatted} ${currency}`;
}
