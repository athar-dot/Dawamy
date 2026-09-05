import {
  UserProfile,
  AttendanceRecord,
  SalaryDeduction,
  SalaryAdvance,
  AdvanceInstallment,
  MonthlyEmployeeLateSummary,
} from '../types';

/**
 * Calculates the monthly late attendance summary, 4-hour grace quota tracking,
 * salary deductions (from excess late hours, disciplinary penalties, and salary advance installments),
 * and net payable salary for an employee.
 */
export function calculateMonthlyEmployeeLateSummary(
  employee: UserProfile,
  attendanceRecords: AttendanceRecord[] = [],
  deductions: SalaryDeduction[] = [],
  selectedMonth: string = '2026-09', // YYYY-MM
  salaryAdvances: SalaryAdvance[] = []
): MonthlyEmployeeLateSummary {
  const safeRecords = Array.isArray(attendanceRecords) ? attendanceRecords : [];
  const safeDeductions = Array.isArray(deductions) ? deductions : [];
  const safeAdvances = Array.isArray(salaryAdvances) ? salaryAdvances : [];
  const empId = employee?.id || '';

  // 1. Filter attendance records for this employee in the chosen month
  const userMonthRecords = safeRecords.filter(
    (r) => r?.userId === empId && r?.date && typeof r.date === 'string' && r.date.startsWith(selectedMonth)
  );

  const lateRecords = userMonthRecords.filter((r) => Number(r?.lateMinutes || 0) > 0);
  const activeLateRecords = lateRecords.filter((r) => !r?.isLateDeductionWaived);

  // 2. Sum up un-waived late minutes
  const totalLateMinutes = activeLateRecords.reduce((sum, r) => sum + Number(r?.lateMinutes || 0), 0);
  const totalLateHours = Math.round((totalLateMinutes / 60) * 100) / 100;

  // 3. Grace quota (default 4.0 hours / 240 minutes)
  const allowedGraceHours = employee?.graceLateHoursMonthly !== undefined ? Number(employee.graceLateHoursMonthly) : 4.0;
  const allowedGraceMinutes = Math.round(allowedGraceHours * 60);

  const usedGraceMinutes = Math.min(totalLateMinutes, allowedGraceMinutes);
  const remainingGraceMinutes = Math.max(0, allowedGraceMinutes - totalLateMinutes);
  const remainingGraceHours = Math.round((remainingGraceMinutes / 60) * 100) / 100;

  // 4. Excess late hours subject to salary deduction
  const excessLateMinutes = Math.max(0, totalLateMinutes - allowedGraceMinutes);
  const excessLateHours = Math.round((excessLateMinutes / 60) * 100) / 100;

  // 5. Salary & hourly rate: Standard calculation (Salary / 30 days / 8 hours = hourly rate)
  const baseSalary = Number(employee?.salary) || 14000;
  const salaryCurrency = employee?.salaryCurrency || 'ر.س';
  const hourlyRate = Math.round((baseSalary / (30 * 8)) * 100) / 100; // Salary / 240h

  const lateDeductionAmount = Math.round(excessLateHours * hourlyRate * 100) / 100;

  // 6. Disciplinary / Penalty deductions
  const userMonthDeductions = safeDeductions.filter(
    (d) => d?.userId === empId && d?.month === selectedMonth
  );

  const appliedPenalties = userMonthDeductions.filter(
    (d) => d?.type !== 'late_arrival' && d?.status === 'applied'
  );
  const penaltyDeductionsAmount = Math.round(
    appliedPenalties.reduce((sum, d) => sum + Number(d?.amount || 0), 0) * 100
  ) / 100;

  // 7. Waived / lifted deductions (Both penalty waivers and waived late minutes)
  const waivedPenalties = userMonthDeductions.filter((d) => d?.status === 'waived');
  const waivedPenaltiesAmount = waivedPenalties.reduce((sum, d) => sum + Number(d?.amount || 0), 0);

  const waivedLateRecords = lateRecords.filter((r) => r?.isLateDeductionWaived);
  const waivedLateMinutes = waivedLateRecords.reduce((sum, r) => sum + Number(r?.lateMinutes || 0), 0);
  const waivedLateAmount = (waivedLateMinutes / 60) * hourlyRate;

  const waivedDeductionsAmount = Math.round((waivedPenaltiesAmount + waivedLateAmount) * 100) / 100;

  // 8. Salary Advance Installments for this Month
  const userAdvances = safeAdvances.filter(
    (adv) => adv?.userId === empId && (adv.status === 'approved' || adv.status === 'completed')
  );

  const activeAdvanceInstallments: AdvanceInstallment[] = [];
  userAdvances.forEach((adv) => {
    const inst = adv.installments?.find((i) => i.month === selectedMonth);
    if (inst && (inst.status === 'pending' || inst.status === 'deducted')) {
      activeAdvanceInstallments.push(inst);
    }
  });

  const advanceInstallmentsAmount = Math.round(
    activeAdvanceInstallments.reduce((sum, inst) => sum + Number(inst.amount || 0), 0) * 100
  ) / 100;

  // 9. Net deductions and net salary
  const totalNetDeductions = Math.round(
    (lateDeductionAmount + penaltyDeductionsAmount + advanceInstallmentsAmount) * 100
  ) / 100;
  const netSalary = Math.max(0, Math.round((baseSalary - totalNetDeductions) * 100) / 100);

  return {
    userId: empId,
    userName: employee?.name || 'موظف',
    userNameEn: employee?.nameEn || employee?.name || 'Employee',
    userEmail: employee?.email || '',
    department: employee?.department || '',
    avatar: employee?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
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
    advanceInstallmentsAmount,
    activeAdvanceInstallments,
    activeAdvanceLoans: userAdvances,
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
export function formatSalaryCurrency(amount?: number | null, currency: string = 'ر.س'): string {
  const safeNum = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  const formatted = safeNum.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${formatted} ${currency}`;
}
