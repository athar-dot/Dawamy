import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Plus,
  Search,
  Filter,
  Download,
  FileText,
  ChevronDown,
  ChevronUp,
  Undo2,
  Calculator,
  UserCheck,
  Info,
  Calendar,
  XCircle,
  Building2,
  Sparkles,
  PenTool,
  Receipt,
  FileCheck,
  Check,
  CreditCard,
} from 'lucide-react';
import {
  UserProfile,
  AttendanceRecord,
  SalaryDeduction,
  DeductionType,
  SalaryAdvance,
  AdvanceInstallment,
} from '../types';
import {
  calculateMonthlyEmployeeLateSummary,
  formatMinutesHuman,
  formatSalaryCurrency,
} from '../utils/payrollUtils';
import { SalaryAdvanceModal } from './SalaryAdvanceModal';
import { SalaryAdvanceVoucherModal } from './SalaryAdvanceVoucherModal';
import { DigitalSignatureModal } from './DigitalSignatureModal';

interface PayrollAndDeductionsViewProps {
  currentUser: UserProfile;
  allUsers: UserProfile[];
  attendanceRecords: AttendanceRecord[];
  deductions: SalaryDeduction[];
  salaryAdvances?: SalaryAdvance[];
  onSaveDeduction: (deduction: SalaryDeduction) => Promise<boolean>;
  onWaiveDeduction: (deductionId: string, waivedBy: string, waivedReason: string) => Promise<boolean>;
  onRestoreDeduction: (deductionId: string) => Promise<boolean>;
  onWaiveAttendanceLate: (attendanceId: string, waivedBy: string, waivedReason: string) => Promise<boolean>;
  onRestoreAttendanceLate: (attendanceId: string) => Promise<boolean>;
  onUpdateUserSalary?: (userId: string, salary: number, graceHours: number) => Promise<boolean>;
  onSaveAdvance?: (advance: SalaryAdvance) => Promise<boolean>;
  onUpdateAdvanceStatus?: (advanceId: string, status: 'approved' | 'rejected' | 'completed' | 'ongoing') => Promise<boolean>;
  onOpenSignatureModal?: (user?: UserProfile) => void;
  onUpdateUser?: (user: UserProfile) => Promise<boolean>;
  lang: 'ar' | 'en';
}

export const PayrollAndDeductionsView: React.FC<PayrollAndDeductionsViewProps> = ({
  currentUser,
  allUsers,
  attendanceRecords,
  deductions,
  salaryAdvances: salaryAdvancesProp = [],
  onSaveDeduction,
  onWaiveDeduction,
  onRestoreDeduction,
  onWaiveAttendanceLate,
  onRestoreAttendanceLate,
  onUpdateUserSalary,
  onSaveAdvance,
  onUpdateAdvanceStatus,
  onOpenSignatureModal,
  onUpdateUser,
  lang,
}) => {
  const isAr = lang === 'ar';

  // Filters & State
  const [selectedMonth, setSelectedMonth] = useState('2026-09');
  const [activeSubTab, setActiveSubTab] = useState<'late_tracking' | 'penalties' | 'payroll_sheet' | 'advances'>('late_tracking');
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>('emp-5');

  // Advances State
  const [salaryAdvances, setSalaryAdvances] = useState<SalaryAdvance[]>(salaryAdvancesProp);
  useEffect(() => {
    if (salaryAdvancesProp && salaryAdvancesProp.length > 0) {
      setSalaryAdvances(salaryAdvancesProp);
    }
  }, [salaryAdvancesProp]);

  const [showAddAdvanceModal, setShowAddAdvanceModal] = useState(false);
  const [viewingVoucherAdvance, setViewingVoucherAdvance] = useState<SalaryAdvance | null>(null);
  const [showSignatureModalForUser, setShowSignatureModalForUser] = useState<UserProfile | null>(null);
  const [advanceStatusFilter, setAdvanceStatusFilter] = useState<'all' | 'approved' | 'completed'>('all');
  const [expandedAdvanceId, setExpandedAdvanceId] = useState<string | null>(null);

  // Modals
  const [showAddPenaltyModal, setShowAddPenaltyModal] = useState(false);
  const [showWaiveModal, setShowWaiveModal] = useState<{
    type: 'penalty' | 'attendance';
    id: string;
    targetName: string;
    description: string;
  } | null>(null);
  const [waiveReasonInput, setWaiveReasonInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [restoreConfirmTarget, setRestoreConfirmTarget] = useState<{
    type: 'penalty' | 'attendance';
    id: string;
  } | null>(null);

  // Add Penalty Form State
  const [newPenaltyUserId, setNewPenaltyUserId] = useState(allUsers[0]?.id || '');
  const [newPenaltyType, setNewPenaltyType] = useState<DeductionType>('penalty_disciplinary');
  const [newPenaltyTitle, setNewPenaltyTitle] = useState('');
  const [newPenaltyAmount, setNewPenaltyAmount] = useState<number>(500);
  const [newPenaltyDays, setNewPenaltyDays] = useState<number>(1);
  const [newPenaltyReason, setNewPenaltyReason] = useState('');
  const [newPenaltyDate, setNewPenaltyDate] = useState('2026-09-03');

  // Edit Salary Modal
  const [editingSalaryUser, setEditingSalaryUser] = useState<{
    user: UserProfile;
    salary: number;
    graceHours: number;
  } | null>(null);

  // Print/View Payslip Modal
  const [viewingPayslipUser, setViewingPayslipUser] = useState<UserProfile | null>(null);

  // Available departments
  const departments = useMemo(() => {
    const set = new Set<string>();
    const safeUsers = Array.isArray(allUsers) ? allUsers : [];
    safeUsers.forEach((u) => {
      if (u?.department) set.add(u.department);
    });
    return Array.from(set);
  }, [allUsers]);

  // Compute monthly calculations for all employees
  const employeeSummaries = useMemo(() => {
    const safeUsers = Array.isArray(allUsers) ? allUsers : [];
    return safeUsers.map((user) => {
      return calculateMonthlyEmployeeLateSummary(user, attendanceRecords, deductions, selectedMonth, salaryAdvances);
    });
  }, [allUsers, attendanceRecords, deductions, selectedMonth, salaryAdvances]);

  // Filtered summaries
  const filteredSummaries = useMemo(() => {
    const term = (searchTerm || '').toLowerCase().trim();
    return (employeeSummaries || []).filter((sum) => {
      if (!sum) return false;
      const matchSearch =
        !term ||
        (sum.userName || '').toLowerCase().includes(term) ||
        (sum.userNameEn && sum.userNameEn.toLowerCase().includes(term)) ||
        (sum.userEmail || '').toLowerCase().includes(term);

      const matchDept = departmentFilter === 'all' || (sum.department || '').includes(departmentFilter);
      return matchSearch && matchDept;
    });
  }, [employeeSummaries, searchTerm, departmentFilter]);

  // Aggregated Overall Totals
  const overallTotals = useMemo(() => {
    let grossSalaries = 0;
    let excessLateHours = 0;
    let lateDeductions = 0;
    let penaltyDeductions = 0;
    let advanceInstallments = 0;
    let waivedDeductions = 0;
    let netSalaries = 0;
    let lateEmployeesCount = 0;

    (employeeSummaries || []).forEach((sum) => {
      if (!sum) return;
      grossSalaries += Number(sum.baseSalary || 0);
      excessLateHours += Number(sum.excessLateHours || 0);
      lateDeductions += Number(sum.lateDeductionAmount || 0);
      penaltyDeductions += Number(sum.penaltyDeductionsAmount || 0);
      advanceInstallments += Number(sum.advanceInstallmentsAmount || 0);
      waivedDeductions += Number(sum.waivedDeductionsAmount || 0);
      netSalaries += Number(sum.netSalary || 0);
      if (Number(sum.totalLateOccurrences || 0) > 0) lateEmployeesCount++;
    });

    return {
      grossSalaries,
      excessLateHours: Math.round(excessLateHours * 100) / 100,
      lateDeductions: Math.round(lateDeductions * 100) / 100,
      penaltyDeductions: Math.round(penaltyDeductions * 100) / 100,
      advanceInstallments: Math.round(advanceInstallments * 100) / 100,
      totalAppliedDeductions: Math.round((lateDeductions + penaltyDeductions + advanceInstallments) * 100) / 100,
      waivedDeductions: Math.round(waivedDeductions * 100) / 100,
      netSalaries: Math.round(netSalaries * 100) / 100,
      lateEmployeesCount,
    };
  }, [employeeSummaries]);

  // Advances statistics
  const advancesStats = useMemo(() => {
    const list = salaryAdvances || [];
    let totalAdvancesAmount = 0;
    let totalPaid = 0;
    let totalRemaining = 0;
    let currentMonthDue = 0;

    list.forEach((adv) => {
      totalAdvancesAmount += Number(adv.totalAmount || 0);
      totalPaid += Number(adv.paidAmount || 0);
      totalRemaining += Number(adv.remainingAmount || 0);

      const thisMonthInst = adv.installments?.find((i) => i.month === selectedMonth);
      if (thisMonthInst && (thisMonthInst.status === 'pending' || thisMonthInst.status === 'deducted')) {
        currentMonthDue += Number(thisMonthInst.amount || 0);
      }
    });

    return {
      totalAdvancesAmount,
      totalPaid,
      totalRemaining,
      currentMonthDue,
      count: list.length,
      activeCount: list.filter((a) => a.status === 'approved').length,
    };
  }, [salaryAdvances, selectedMonth]);

  // Filtered advances
  const filteredAdvances = useMemo(() => {
    const term = (searchTerm || '').toLowerCase().trim();
    return (salaryAdvances || []).filter((adv) => {
      const matchSearch =
        !term ||
        adv.userName.toLowerCase().includes(term) ||
        (adv.userNameEn && adv.userNameEn.toLowerCase().includes(term)) ||
        adv.advanceNumber.toLowerCase().includes(term) ||
        adv.reason.toLowerCase().includes(term);

      const matchStatus =
        advanceStatusFilter === 'all' ||
        (advanceStatusFilter === 'approved' && adv.status === 'approved') ||
        (advanceStatusFilter === 'completed' && adv.status === 'completed');

      return matchSearch && matchStatus;
    });
  }, [salaryAdvances, searchTerm, advanceStatusFilter]);

  // Selected employee for payslip
  const payslipSummary = useMemo(() => {
    if (!viewingPayslipUser) return null;
    return calculateMonthlyEmployeeLateSummary(viewingPayslipUser, attendanceRecords, deductions, selectedMonth, salaryAdvances);
  }, [viewingPayslipUser, attendanceRecords, deductions, selectedMonth, salaryAdvances]);

  // Handle Waive Confirm
  const handleConfirmWaive = async () => {
    if (!showWaiveModal) return;
    if (!waiveReasonInput.trim()) {
      setErrorToast(isAr ? 'يرجى كتابة سبب رفع الخصم أو تبرير الإعفاء' : 'Please provide waiver justification');
      setTimeout(() => setErrorToast(null), 4000);
      return;
    }

    try {
      setIsProcessing(true);
      const officerName = `${currentUser?.name || 'مسؤول'} (${isAr ? 'الموارد البشرية' : 'HR'})`;

      if (showWaiveModal.type === 'penalty') {
        await onWaiveDeduction(showWaiveModal.id, officerName, waiveReasonInput);
        setSuccessToast(isAr ? 'تم رفع الخصم واعتماد الإعفاء بنجاح' : 'Deduction waived successfully');
      } else {
        await onWaiveAttendanceLate(showWaiveModal.id, officerName, waiveReasonInput);
        setSuccessToast(isAr ? 'تم رفع خصم تأخير البصمة واعتماد العذر بنجاح' : 'Late punch deduction waived successfully');
      }

      setShowWaiveModal(null);
      setWaiveReasonInput('');
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err) {
      console.error('Error waiving deduction:', err);
      setErrorToast(isAr ? 'حدث خطأ أثناء رفع الخصم' : 'Error waiving deduction');
      setTimeout(() => setErrorToast(null), 4000);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Restore Confirm
  const handleConfirmRestore = async () => {
    if (!restoreConfirmTarget) return;
    try {
      setIsProcessing(true);
      if (restoreConfirmTarget.type === 'penalty') {
        await onRestoreDeduction(restoreConfirmTarget.id);
      } else {
        await onRestoreAttendanceLate(restoreConfirmTarget.id);
      }
      setRestoreConfirmTarget(null);
      setSuccessToast(isAr ? 'تمت إعادة تطبيق الخصم بنجاح' : 'Deduction restored successfully');
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err) {
      console.error('Error restoring deduction:', err);
      setErrorToast(isAr ? 'حدث خطأ أثناء إعادة الخصم' : 'Error restoring deduction');
      setTimeout(() => setErrorToast(null), 4000);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Add Penalty Submit
  const handleAddPenaltySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = (allUsers || []).find((u) => u?.id === newPenaltyUserId);
    if (!user) return;

    try {
      setIsProcessing(true);
      const newDed: SalaryDeduction = {
        id: `ded-${Date.now()}`,
        userId: user.id,
        userName: user.name,
        userNameEn: user.nameEn,
        userEmail: user.email,
        department: user.department,
        month: selectedMonth,
        type: newPenaltyType,
        title: newPenaltyTitle || (isAr ? 'خصم جزاء إداري' : 'Disciplinary Deduction'),
        amount: Number(newPenaltyAmount) || 0,
        daysDeducted: Number(newPenaltyDays) || 0,
        date: newPenaltyDate,
        status: 'applied',
        reason: newPenaltyReason,
        issuedBy: `${currentUser?.name || 'مسؤول'} (${isAr ? 'الموارد البشرية' : 'HR'})`,
        issuedAt: new Date().toISOString(),
      };

      await onSaveDeduction(newDed);
      setShowAddPenaltyModal(false);
      setNewPenaltyTitle('');
      setNewPenaltyReason('');
      setSuccessToast(isAr ? 'تم تسجيل الخصم الإداري بنجاح' : 'Penalty recorded successfully');
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err) {
      console.error('Error saving penalty:', err);
      setErrorToast(isAr ? 'تعذر حفظ الخصم' : 'Failed to save penalty');
      setTimeout(() => setErrorToast(null), 4000);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Salary Update
  const handleSaveSalaryUpdate = async () => {
    if (!editingSalaryUser || !onUpdateUserSalary) return;
    try {
      setIsProcessing(true);
      await onUpdateUserSalary(
        editingSalaryUser.user.id,
        Number(editingSalaryUser.salary) || 0,
        Number(editingSalaryUser.graceHours) || 0
      );
      setEditingSalaryUser(null);
      setSuccessToast(isAr ? 'تم تحديث الراتب وساعات السماحية بنجاح' : 'Salary and grace hours updated');
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err) {
      console.error('Error updating salary:', err);
      setErrorToast(isAr ? 'تعذر تحديث بيانات الراتب' : 'Error updating salary');
      setTimeout(() => setErrorToast(null), 4000);
    } finally {
      setIsProcessing(false);
    }
  };

  // Export to Excel
  const handleExportPayrollExcel = () => {
    try {
      const dataToExport = (filteredSummaries || []).map((sum, index) => ({
        [isAr ? 'م' : 'No']: index + 1,
        [isAr ? 'اسم الموظف' : 'Employee Name']: sum?.userName || '',
        [isAr ? 'القسم' : 'Department']: sum?.department || '',
        [isAr ? 'البريد الإلكتروني' : 'Email']: sum?.userEmail || '',
        [isAr ? 'الشهر' : 'Month']: sum?.month || selectedMonth,
        [isAr ? 'الراتب الأساسي' : 'Base Salary']: sum?.baseSalary || 0,
        [isAr ? 'أجر الساعة' : 'Hourly Rate']: sum?.hourlyRate || 0,
        [isAr ? 'مرات التأخير' : 'Late Count']: sum?.totalLateOccurrences || 0,
        [isAr ? 'إجمالي التأخير (ساعة)' : 'Total Late (Hours)']: sum?.totalLateHours || 0,
        [isAr ? 'سماحية التأخير الممنوحة (ساعة)' : 'Grace Quota (Hours)']: sum?.allowedGraceHours || 0,
        [isAr ? 'المستهلك من السماحية (ساعة)' : 'Grace Used (Hours)']: Math.round((Number(sum?.usedGraceMinutes || 0) / 60) * 100) / 100,
        [isAr ? 'المتبقي من السماحية (ساعة)' : 'Grace Remaining (Hours)']: sum?.remainingGraceHours || 0,
        [isAr ? 'ساعات التأخير الزائدة الخاضعة للخصم' : 'Excess Deductible Hours']: sum?.excessLateHours || 0,
        [isAr ? 'خصم التأخير من البصمة' : 'Late Deduction']: sum?.lateDeductionAmount || 0,
        [isAr ? 'خصم الجزاءات والعقوبات' : 'Penalty Deductions']: sum?.penaltyDeductionsAmount || 0,
        [isAr ? 'إجمالي الخصومات المعفاة/المرفوعة' : 'Waived Deductions']: sum?.waivedDeductionsAmount || 0,
        [isAr ? 'صافي الخصومات المطبقة' : 'Total Net Deductions']: sum?.totalNetDeductions || 0,
        [isAr ? 'صافي الراتب المستحق' : 'Net Payable Salary']: sum?.netSalary || 0,
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Payroll-${selectedMonth}`);
      XLSX.writeFile(wb, `Dawamy-Payroll-${selectedMonth}.xlsx`);
    } catch (err) {
      console.error('Error exporting Excel:', err);
      setErrorToast(isAr ? 'تعذر تصدير ملف الإكسل' : 'Failed to export Excel');
      setTimeout(() => setErrorToast(null), 4000);
    }
  };

  // Salary advance creation handler
  const handleCreateSalaryAdvance = async (advance: SalaryAdvance): Promise<boolean> => {
    try {
      if (onSaveAdvance) {
        await onSaveAdvance(advance);
      }
      setSalaryAdvances((prev) => [advance, ...prev.filter((a) => a.id !== advance.id)]);
      setShowAddAdvanceModal(false);
      setSuccessToast(isAr ? 'تم حفظ وإصدار سلفة الراتب بنجاح' : 'Salary advance created');
      setTimeout(() => setSuccessToast(null), 4000);
      return true;
    } catch (err) {
      console.error('Error creating salary advance:', err);
      setErrorToast(isAr ? 'تعذر حفظ السلفة' : 'Failed to save advance');
      setTimeout(() => setErrorToast(null), 4000);
      return false;
    }
  };

  // Save digital signature handler
  const handleSaveUserSignature = async (
    signatureDataUrl: string,
    signatureType: 'drawn' | 'uploaded' | 'typed',
    signatureJobTitle?: string
  ): Promise<boolean> => {
    try {
      const targetUser = showSignatureModalForUser || currentUser;
      const updatedUser: UserProfile = {
        ...targetUser,
        signatureDataUrl,
        signatureType,
        signatureJobTitle: signatureJobTitle || targetUser.signatureJobTitle || targetUser.title,
        signatureUpdatedAt: new Date().toISOString(),
      };
      if (onUpdateUser) {
        await onUpdateUser(updatedUser);
      }
      setShowSignatureModalForUser(null);
      setSuccessToast(isAr ? 'تم حفظ وتوثيق التوقيع الرقمي بنجاح' : 'Signature saved successfully');
      setTimeout(() => setSuccessToast(null), 4000);
      return true;
    } catch (err) {
      console.error('Error saving signature:', err);
      setErrorToast(isAr ? 'تعذر حفظ التوقيع' : 'Failed to save signature');
      setTimeout(() => setErrorToast(null), 4000);
      return false;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {successToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#2D3628] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-[#97A87A]" />
          <span className="text-sm font-semibold">{successToast}</span>
        </div>
      )}

      {errorToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#991B1B] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in duration-200">
          <AlertTriangle className="w-5 h-5 text-[#FCA5A5]" />
          <span className="text-sm font-semibold">{errorToast}</span>
        </div>
      )}

      {/* Top Header & Monthly Controls */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E5E2D9] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#5E7153]/10 text-[#5E7153] flex items-center justify-center font-bold">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#2D3628]">
                  {isAr ? 'مسير الرواتب ورصد خصومات التأخير والجزاءات' : 'Payroll, Late Tracking & Deductions'}
                </h2>
                <p className="text-xs sm:text-sm text-[#65635E]">
                  {isAr
                    ? 'رصد آلي لتأخير البصمة مع احتساب سماحية الـ 4 ساعات الشهرية، حساب الخصومات وصلاحية رفع الخصم عند الحاجة'
                    : 'Automated biometric delay deduction with 4-hour monthly grace quota & manager/HR waiver authority'}
                </p>
              </div>
            </div>
          </div>

          {/* Month Selector & Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 bg-[#FAF9F6] px-3.5 py-2 rounded-xl border border-[#E5E2D9]">
              <Calendar className="w-4 h-4 text-[#5E7153]" />
              <label className="text-xs font-bold text-[#65635E]">{isAr ? 'الشهر:' : 'Month:'}</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent font-bold text-[#2D3628] text-xs sm:text-sm focus:outline-none cursor-pointer"
              >
                <option value="2026-09">{isAr ? 'سبتمبر 2026 (الحالي)' : 'September 2026 (Current)'}</option>
                <option value="2026-08">{isAr ? 'أغسطس 2026' : 'August 2026'}</option>
                <option value="2026-07">{isAr ? 'يوليو 2026' : 'July 2026'}</option>
              </select>
            </div>

            <button
              onClick={() => setShowAddPenaltyModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#991B1B] text-white hover:bg-[#7F1D1D] text-xs sm:text-sm font-bold shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{isAr ? 'إضافة خصم / جزاء إداري' : 'Add Penalty'}</span>
            </button>

            <button
              onClick={handleExportPayrollExcel}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5E7153] text-white hover:bg-[#4B5B42] text-xs sm:text-sm font-bold shadow-sm transition-all"
            >
              <Download className="w-4 h-4" />
              <span>{isAr ? 'تصدير الكشف (Excel)' : 'Export Payroll'}</span>
            </button>
          </div>
        </div>

        {/* Rule Banner: 4-Hour Grace Rule Highlight */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-[#FAF9F6] border border-[#E5E2D9] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs sm:text-sm text-[#4B5563]">
          <div className="flex items-center gap-2.5">
            <Info className="w-5 h-5 text-[#5E7153] shrink-0" />
            <span>
              {isAr ? (
                <>
                  <strong>نظام السماحية الشهرية:</strong> يمنح كل موظف <strong>4 ساعات تأخير مسموحة</strong> شهرياً (240 دقيقة). يُطرح إجمالي تأخيره من الـ 4 ساعات، ولا يتم تطبيق أي خصم مالي إلا على <strong>الساعات الزائدة</strong> فقط.
                </>
              ) : (
                <>
                  <strong>Monthly Grace Policy:</strong> Each employee is granted <strong>4 hours grace delay</strong> monthly. Excess delay beyond 4 hours is deducted at the hourly rate: <code>(Salary ÷ 30 ÷ 8)</code>.
                </>
              )}
            </span>
          </div>

          <div className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-lg font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>{isAr ? 'صلاحية رفع الخصم مفعلة للـ HR والمدراء' : 'Waiver Authority Enabled'}</span>
          </div>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 pt-1">
          <div className="bg-[#FAF9F6] p-3.5 sm:p-4 rounded-xl border border-[#E5E2D9]">
            <p className="text-[11px] sm:text-xs font-semibold text-[#65635E]">{isAr ? 'إجمالي الرواتب الأساسية' : 'Gross Base Salaries'}</p>
            <p className="text-base sm:text-xl font-bold text-[#2D3628] mt-1">
              {formatSalaryCurrency(overallTotals.grossSalaries)}
            </p>
            <p className="text-[10px] text-[#8C887B] mt-0.5">{allUsers.length} {isAr ? 'موظف مسجل' : 'employees'}</p>
          </div>

          <div className="bg-amber-50/70 p-3.5 sm:p-4 rounded-xl border border-amber-200/80">
            <p className="text-[11px] sm:text-xs font-semibold text-amber-800">{isAr ? 'ساعات التأخير الزائدة' : 'Excess Late Hours'}</p>
            <p className="text-base sm:text-xl font-bold text-amber-900 mt-1">
              {overallTotals.excessLateHours} {isAr ? 'ساعة زائدة' : 'hours'}
            </p>
            <p className="text-[10px] text-amber-700 mt-0.5">{overallTotals.lateEmployeesCount} {isAr ? 'موظف لديه تأخير' : 'employees late'}</p>
          </div>

          <div className="bg-rose-50/70 p-3.5 sm:p-4 rounded-xl border border-rose-200/80">
            <p className="text-[11px] sm:text-xs font-semibold text-rose-800">{isAr ? 'إجمالي الخصومات المطبقة' : 'Applied Deductions'}</p>
            <p className="text-base sm:text-xl font-bold text-rose-900 mt-1">
              {formatSalaryCurrency(overallTotals.totalAppliedDeductions)}
            </p>
            <p className="text-[10px] text-rose-700 mt-0.5">
              {isAr ? `تأخير: ${overallTotals.lateDeductions} | جزاءات: ${overallTotals.penaltyDeductions}` : 'Late + Penalties'}
            </p>
          </div>

          <div className="bg-emerald-50/80 p-3.5 sm:p-4 rounded-xl border border-emerald-200/80">
            <p className="text-[11px] sm:text-xs font-semibold text-emerald-800">{isAr ? 'خصومات تم رفعها (إعفاءات)' : 'Waived / Excused'}</p>
            <p className="text-base sm:text-xl font-bold text-emerald-900 mt-1">
              {formatSalaryCurrency(overallTotals.waivedDeductions)}
            </p>
            <p className="text-[10px] text-emerald-700 mt-0.5">{isAr ? 'بموجب قرار إعفاء رسمي' : 'Officially waived'}</p>
          </div>

          <div className="bg-[#5E7153]/10 p-3.5 sm:p-4 rounded-xl border border-[#5E7153]/30 col-span-2 lg:col-span-1">
            <p className="text-[11px] sm:text-xs font-semibold text-[#5E7153]">{isAr ? 'صافي مسير الرواتب المستحق' : 'Net Payable Payroll'}</p>
            <p className="text-base sm:text-xl font-bold text-[#2D3628] mt-1">
              {formatSalaryCurrency(overallTotals.netSalaries)}
            </p>
            <p className="text-[10px] text-[#5E7153] mt-0.5">{isAr ? 'بعد طرح صافي الخصومات' : 'After deductions'}</p>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E5E2D9] pb-2 overflow-x-auto scrollbar-none text-xs sm:text-sm">
        <button
          onClick={() => setActiveSubTab('late_tracking')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap ${
            activeSubTab === 'late_tracking'
              ? 'bg-[#5E7153] text-white shadow-sm'
              : 'text-[#65635E] hover:bg-[#FAF9F6] hover:text-[#2D3628]'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>{isAr ? 'رصد التأخير الشهري وسماحية الـ 4 ساعات' : 'Monthly Late & 4-Hour Grace'}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('penalties')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap ${
            activeSubTab === 'penalties'
              ? 'bg-[#5E7153] text-white shadow-sm'
              : 'text-[#65635E] hover:bg-[#FAF9F6] hover:text-[#2D3628]'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>{isAr ? 'سجل الجزاءات والعقوبات الإدارية' : 'Disciplinary Penalties & Violations'}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 font-bold">
            {deductions.filter((d) => d.month === selectedMonth).length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('payroll_sheet')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'payroll_sheet'
              ? 'bg-[#5E7153] text-white shadow-sm'
              : 'text-[#65635E] hover:bg-[#FAF9F6] hover:text-[#2D3628]'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>{isAr ? 'كشف مسير الرواتب المعتمد (Payroll Sheet)' : 'Monthly Payroll Sheet'}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('advances')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'advances'
              ? 'bg-[#5E7153] text-white shadow-sm'
              : 'text-[#65635E] hover:bg-[#FAF9F6] hover:text-[#2D3628]'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>{isAr ? 'سلفيات الراتب والأقساط الشهرية' : 'Salary Advances & Loans'}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${activeSubTab === 'advances' ? 'bg-white/20' : 'bg-[#E9EDD9] text-[#2D3628]'}`}>
            {salaryAdvances.length}
          </span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#E5E2D9]">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#8C887B] absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={isAr ? 'بحث بالاسم أو البريد الإلكتروني...' : 'Search employee...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-3 pr-9 py-2 rounded-lg border border-[#E5E2D9] text-xs sm:text-sm focus:outline-none focus:border-[#5E7153]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-[#65635E]" />
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="w-full sm:w-auto bg-[#FAF9F6] border border-[#E5E2D9] rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold text-[#2D3628] focus:outline-none"
          >
            <option value="all">{isAr ? 'جميع الأقسام' : 'All Departments'}</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* SUB-TAB 1: MONTHLY LATE & 4-HOUR GRACE TRACKING      */}
      {/* ---------------------------------------------------- */}
      {activeSubTab === 'late_tracking' && (
        <div className="space-y-4">
          {filteredSummaries.map((sum) => {
            const isExpanded = expandedEmployeeId === sum.userId;
            const originalUser = allUsers.find((u) => u.id === sum.userId);
            const hasDelay = sum.totalLateOccurrences > 0;
            const hasExcess = sum.excessLateMinutes > 0;

            // Grace consumption percent
            const graceUsedPct = Math.min(100, Math.round((sum.usedGraceMinutes / sum.allowedGraceMinutes) * 100));

            return (
              <div
                key={sum.userId}
                className="bg-white rounded-2xl border border-[#E5E2D9] overflow-hidden shadow-sm transition-all hover:border-[#5E7153]/40"
              >
                {/* Employee Row Header */}
                <div className="p-4 sm:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  {/* Left: Employee Info */}
                  <div className="flex items-center gap-3.5">
                    <img
                      src={sum.avatar}
                      alt={sum.userName}
                      className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-[#2D3628] text-base">{sum.userName}</h4>
                        {originalUser && (
                          <button
                            onClick={() =>
                              setEditingSalaryUser({
                                user: originalUser,
                                salary: sum.baseSalary,
                                graceHours: sum.allowedGraceHours,
                              })
                            }
                            className="text-[11px] text-[#5E7153] hover:underline font-bold bg-[#FAF9F6] px-2 py-0.5 rounded border border-[#E5E2D9]"
                            title={isAr ? 'تعديل الراتب وساعات السماحية' : 'Edit salary and grace'}
                          >
                            {isAr ? 'تعديل الراتب' : 'Edit Salary'}
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-[#65635E]">
                        {sum.department} • {sum.userEmail}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-[#8C887B]">
                        <span>
                          {isAr ? 'الراتب الأساسي:' : 'Salary:'}{' '}
                          <strong className="text-[#2D3628]">{formatSalaryCurrency(sum.baseSalary)}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          {isAr ? 'أجر الساعة:' : 'Hourly:'}{' '}
                          <strong className="text-[#2D3628]">{formatSalaryCurrency(sum.hourlyRate)}/ساعة</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Center: 4-Hour Grace Progress */}
                  <div className="w-full lg:w-72 bg-[#FAF9F6] p-3 rounded-xl border border-[#E5E2D9] space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#2D3628] flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#5E7153]" />
                        {isAr ? 'سماحية الـ 4 ساعات الشهرية:' : '4-Hour Monthly Grace:'}
                      </span>
                      <span className="text-[11px] font-bold text-[#65635E]">
                        {formatMinutesHuman(sum.usedGraceMinutes, lang)} / {sum.allowedGraceHours} {isAr ? 'س' : 'h'}
                      </span>
                    </div>

                    <div className="w-full bg-[#E5E2D9] h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          hasExcess ? 'bg-rose-500' : graceUsedPct > 70 ? 'bg-amber-500' : 'bg-[#5E7153]'
                        }`}
                        style={{ width: `${graceUsedPct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#8C887B]">
                        {isAr ? 'المتبقي من السماحية:' : 'Remaining grace:'}{' '}
                        <strong className="text-emerald-700">
                          {formatMinutesHuman(sum.remainingGraceMinutes, lang)}
                        </strong>
                      </span>
                      {hasExcess ? (
                        <span className="text-rose-700 font-bold">
                          +{formatMinutesHuman(sum.excessLateMinutes, lang)} {isAr ? 'زائد' : 'excess'}
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-bold">{isAr ? 'ضمن المسموح' : 'Within quota'}</span>
                      )}
                    </div>
                  </div>

                  {/* Right: Calculated Deduction & Expand Button */}
                  <div className="flex items-center justify-between lg:justify-end w-full lg:w-auto gap-4">
                    <div className="text-right">
                      <p className="text-[11px] text-[#65635E] font-semibold">{isAr ? 'خصم التأخير المستحق' : 'Late Deduction'}</p>
                      <p
                        className={`text-base font-bold ${
                          sum.lateDeductionAmount > 0 ? 'text-rose-700' : 'text-emerald-700'
                        }`}
                      >
                        {sum.lateDeductionAmount > 0 ? `-${formatSalaryCurrency(sum.lateDeductionAmount)}` : '0.00 ر.س'}
                      </p>
                      <p className="text-[10px] text-[#8C887B]">
                        {sum.lateRecords.length} {isAr ? 'تسجيلات تأخير' : 'late records'}
                      </p>
                    </div>

                    <button
                      onClick={() => setExpandedEmployeeId(isExpanded ? null : sum.userId)}
                      className="p-2 rounded-xl bg-[#FAF9F6] hover:bg-[#EFECE4] border border-[#E5E2D9] text-[#2D3628] transition-all"
                      title={isAr ? 'عرض تفاصيل بصمات التأخير' : 'View punch details'}
                    >
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details: Daily punch log & waiver authority */}
                {isExpanded && (
                  <div className="border-t border-[#E5E2D9] bg-[#FAF9F6]/60 p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs sm:text-sm font-bold text-[#2D3628] flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-[#5E7153]" />
                        {isAr
                          ? `تفاصيل سجلات التأخير لشهر ${selectedMonth} (${sum.lateRecords.length} حالات مسجلة):`
                          : `Late Punch Records for ${selectedMonth} (${sum.lateRecords.length} recorded):`}
                      </h5>
                      <span className="text-xs text-[#65635E]">
                        {isAr ? 'موعد الحضور الرسمي: 09:00 ص' : 'Expected Start: 09:00 AM'}
                      </span>
                    </div>

                    {sum.lateRecords.length === 0 ? (
                      <p className="text-xs text-[#8C887B] py-3 text-center bg-white rounded-xl border border-[#E5E2D9]">
                        {isAr ? 'لا يوجد أي تأخير مسجل لهذا الموظف خلال هذا الشهر' : 'No delay recorded for this employee this month'}
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-right bg-white rounded-xl border border-[#E5E2D9] overflow-hidden">
                          <thead className="bg-[#FAF9F6] border-b border-[#E5E2D9] text-[#65635E] font-bold">
                            <tr>
                              <th className="p-3">{isAr ? 'التاريخ' : 'Date'}</th>
                              <th className="p-3">{isAr ? 'وقت البصمة' : 'Check-In'}</th>
                              <th className="p-3">{isAr ? 'مدة التأخير' : 'Late Duration'}</th>
                              <th className="p-3">{isAr ? 'جهاز البصمة' : 'Device'}</th>
                              <th className="p-3">{isAr ? 'الملاحظات / السبب' : 'Notes'}</th>
                              <th className="p-3">{isAr ? 'حالة الخصم' : 'Deduction Status'}</th>
                              <th className="p-3 text-center">{isAr ? 'صلاحية رفع الخصم' : 'Waiver Action'}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E5E2D9]">
                            {sum.lateRecords.map((rec) => {
                              const isWaived = rec.isLateDeductionWaived;
                              return (
                                <tr key={rec.id} className={isWaived ? 'bg-emerald-50/40' : 'hover:bg-[#FAF9F6]'}>
                                  <td className="p-3 font-bold text-[#2D3628] whitespace-nowrap">{rec.date}</td>
                                  <td className="p-3 font-mono text-[#5E7153] font-bold">{rec.checkInTime || '-'}</td>
                                  <td className="p-3 font-bold text-amber-900 whitespace-nowrap">
                                    {rec.lateMinutes} {isAr ? 'دقيقة' : 'mins'}
                                  </td>
                                  <td className="p-3 text-[#65635E] whitespace-nowrap">{rec.deviceName || 'جهاز البصمة'}</td>
                                  <td className="p-3 text-[#65635E] max-w-xs">{rec.notes || '-'}</td>
                                  <td className="p-3 whitespace-nowrap">
                                    {isWaived ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        {isAr ? 'تم رفع الخصم (معفى)' : 'Waived'}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
                                        <AlertTriangle className="w-3.5 h-3.5" />
                                        {isAr ? 'خاضع للحساب' : 'Active'}
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-3 text-center whitespace-nowrap">
                                    {isWaived ? (
                                      <div className="flex flex-col items-center gap-1">
                                        <span className="text-[10px] text-emerald-700 font-semibold" title={rec.waivedReason}>
                                          {rec.waivedBy ? `${rec.waivedBy}` : isAr ? 'معفى بقرار HR' : 'Waived by HR'}
                                        </span>
                                        <button
                                          onClick={() => setRestoreConfirmTarget({ type: 'attendance', id: rec.id })}
                                          className="text-[10px] text-rose-700 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                                        >
                                          <Undo2 className="w-3 h-3" />
                                          <span>{isAr ? 'إلغاء الإعفاء' : 'Restore'}</span>
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() =>
                                          setShowWaiveModal({
                                            type: 'attendance',
                                            id: rec.id,
                                            targetName: sum.userName,
                                            description: isAr
                                              ? `تأخير ${rec.lateMinutes} دقيقة بتاريخ ${rec.date}`
                                              : `Delay of ${rec.lateMinutes} mins on ${rec.date}`,
                                          })
                                        }
                                        className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-1 transition-all mx-auto"
                                      >
                                        <ShieldCheck className="w-3.5 h-3.5" />
                                        <span>{isAr ? 'رفع الخصم / اعتماد العذر' : 'Waive Deduction'}</span>
                                      </button>
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
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* SUB-TAB 2: DISCIPLINARY PENALTIES & DEDUCTIONS       */}
      {/* ---------------------------------------------------- */}
      {activeSubTab === 'penalties' && (
        <div className="bg-white rounded-2xl border border-[#E5E2D9] overflow-hidden shadow-sm p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#2D3628]">
                {isAr ? 'سجل الجزاءات والعقوبات الإدارية والخصومات الصادرة' : 'Disciplinary Penalties & Violations Log'}
              </h3>
              <p className="text-xs text-[#65635E]">
                {isAr
                  ? 'عرض وإدارة الجزاءات الإدارية الصادرة ضد الموظفين مع صلاحية رفع الخصم أو إسقاط الجزاء'
                  : 'Manage employee administrative penalties with authority to excuse or lift deductions'}
              </p>
            </div>

            <button
              onClick={() => setShowAddPenaltyModal(true)}
              className="px-3.5 py-2 rounded-xl bg-[#991B1B] text-white hover:bg-[#7F1D1D] font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{isAr ? 'تسجيل جزاء جديد' : 'New Penalty'}</span>
            </button>
          </div>

          {deductions.filter((d) => d.month === selectedMonth).length === 0 ? (
            <div className="text-center py-12 text-[#8C887B]">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="text-sm font-bold text-[#2D3628]">{isAr ? 'لا توجد أي جزاءات إدارية لشهر سبتمبر' : 'No penalties recorded for this month'}</p>
              <p className="text-xs text-[#8C887B] mt-1">{isAr ? 'سجل الانضباط ممتاز لجميع موظفي المنظومة' : 'All employees have clean disciplinary records'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right border border-[#E5E2D9] rounded-xl overflow-hidden">
                <thead className="bg-[#FAF9F6] border-b border-[#E5E2D9] text-[#65635E] font-bold">
                  <tr>
                    <th className="p-3">{isAr ? 'الموظف' : 'Employee'}</th>
                    <th className="p-3">{isAr ? 'نوع الجزاء والمسمى' : 'Title & Type'}</th>
                    <th className="p-3">{isAr ? 'التاريخ' : 'Date'}</th>
                    <th className="p-3">{isAr ? 'مبلغ الخصم' : 'Amount'}</th>
                    <th className="p-3">{isAr ? 'الأيام المخصومة' : 'Days'}</th>
                    <th className="p-3">{isAr ? 'السبب والجهة المصدرة' : 'Reason & Issuer'}</th>
                    <th className="p-3">{isAr ? 'الحالة' : 'Status'}</th>
                    <th className="p-3 text-center">{isAr ? 'صلاحية رفع الخصم' : 'Waiver Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E2D9]">
                  {deductions
                    .filter((d) => d.month === selectedMonth)
                    .map((ded) => {
                      const isWaived = ded.status === 'waived';
                      return (
                        <tr key={ded.id} className={isWaived ? 'bg-emerald-50/40' : 'hover:bg-[#FAF9F6]'}>
                          <td className="p-3 font-bold text-[#2D3628] whitespace-nowrap">{ded.userName}</td>
                          <td className="p-3">
                            <span className="font-bold text-[#2D3628] block">{ded.title}</span>
                            <span className="text-[10px] text-[#8C887B]">
                              {ded.type === 'penalty_disciplinary'
                                ? isAr
                                  ? 'جزاء إداري'
                                  : 'Disciplinary'
                                : ded.type === 'unexcused_absence'
                                ? isAr
                                  ? 'غياب غير مبرر'
                                  : 'Unexcused Absence'
                                : isAr
                                ? 'أخرى'
                                : 'Other'}
                            </span>
                          </td>
                          <td className="p-3 font-mono whitespace-nowrap">{ded.date}</td>
                          <td className="p-3 font-bold text-rose-800 whitespace-nowrap">
                            {formatSalaryCurrency(ded.amount)}
                          </td>
                          <td className="p-3 font-bold text-[#2D3628]">{ded.daysDeducted ? `${ded.daysDeducted} ${isAr ? 'يوم' : 'day'}` : '-'}</td>
                          <td className="p-3 text-[#65635E] max-w-xs">
                            <span className="block">{ded.reason}</span>
                            <span className="text-[10px] text-[#8C887B] block mt-0.5">{ded.issuedBy}</span>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            {isWaived ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {isAr ? 'تم رفع الخصم (عفو)' : 'Waived'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                {isAr ? 'خصم نافذ ومطبق' : 'Applied'}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center whitespace-nowrap">
                            {isWaived ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-[10px] text-emerald-800 font-bold" title={ded.waivedReason}>
                                  {isAr ? 'تم الرفع بواسطة:' : 'Waived by:'} {ded.waivedBy}
                                </span>
                                {ded.waivedReason && (
                                  <span className="text-[10px] text-[#65635E] italic">"{ded.waivedReason}"</span>
                                )}
                                <button
                                  onClick={() => setRestoreConfirmTarget({ type: 'penalty', id: ded.id })}
                                  className="text-[10px] text-rose-700 hover:underline flex items-center gap-1 font-bold mt-1 cursor-pointer"
                                >
                                  <Undo2 className="w-3 h-3" />
                                  <span>{isAr ? 'إعادة تطبيق الخصم' : 'Restore'}</span>
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() =>
                                  setShowWaiveModal({
                                    type: 'penalty',
                                    id: ded.id,
                                    targetName: ded.userName,
                                    description: `${ded.title} (${formatSalaryCurrency(ded.amount)})`,
                                  })
                                }
                                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-1 transition-all mx-auto"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>{isAr ? 'رفع الخصم / إعفاء' : 'Waive Deduction'}</span>
                              </button>
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
      )}

      {/* ---------------------------------------------------- */}
      {/* SUB-TAB 3: COMPREHENSIVE MONTHLY PAYROLL SHEET       */}
      {/* ---------------------------------------------------- */}
      {activeSubTab === 'payroll_sheet' && (
        <div className="bg-white rounded-2xl border border-[#E5E2D9] overflow-hidden shadow-sm p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#2D3628]">
                {isAr ? `كشف مسير الرواتب المعتمد - لشهر ${selectedMonth}` : `Certified Monthly Payroll Ledger - ${selectedMonth}`}
              </h3>
              <p className="text-xs text-[#65635E]">
                {isAr
                  ? 'بيان مفصل للراتب الأساسي، خصومات التأخير، الجزاءات الإدارية، الخصومات المعفاة، وصافي المستحق للصرف'
                  : 'Detailed breakdown of base salary, biometric late deductions, penalties, waivers, and net payable'}
              </p>
            </div>

            <button
              onClick={handleExportPayrollExcel}
              className="px-4 py-2 rounded-xl bg-[#5E7153] text-white hover:bg-[#4B5B42] font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>{isAr ? 'تحميل كشف الإكسيل' : 'Download Excel'}</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right border border-[#E5E2D9] rounded-xl overflow-hidden">
              <thead className="bg-[#FAF9F6] border-b border-[#E5E2D9] text-[#65635E] font-bold">
                <tr>
                  <th className="p-3">{isAr ? 'الموظف' : 'Employee'}</th>
                  <th className="p-3">{isAr ? 'القسم' : 'Department'}</th>
                  <th className="p-3">{isAr ? 'الراتب الأساسي' : 'Base Salary'}</th>
                  <th className="p-3">{isAr ? 'تأخير البصمة الزائد' : 'Excess Late'}</th>
                  <th className="p-3">{isAr ? 'خصم التأخير' : 'Late Deduction'}</th>
                  <th className="p-3">{isAr ? 'خصم الجزاءات' : 'Penalties'}</th>
                  <th className="p-3">{isAr ? 'قسط سلفة الراتب' : 'Advance Loan'}</th>
                  <th className="p-3">{isAr ? 'خصومات معفاة' : 'Waived'}</th>
                  <th className="p-3">{isAr ? 'صافي الخصومات' : 'Net Deductions'}</th>
                  <th className="p-3">{isAr ? 'صافي الراتب المستحق' : 'Net Salary'}</th>
                  <th className="p-3 text-center">{isAr ? 'مسير القسيمة' : 'Payslip'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E2D9]">
                {filteredSummaries.map((sum) => {
                  const originalUser = allUsers.find((u) => u.id === sum.userId);
                  return (
                    <tr key={sum.userId} className="hover:bg-[#FAF9F6]">
                      <td className="p-3 font-bold text-[#2D3628] whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <img src={sum.avatar} alt={sum.userName} className="w-6 h-6 rounded-full object-cover" />
                          <span>{sum.userName}</span>
                        </div>
                      </td>
                      <td className="p-3 text-[#65635E] whitespace-nowrap">{sum.department}</td>
                      <td className="p-3 font-bold text-[#2D3628] whitespace-nowrap">
                        {formatSalaryCurrency(sum.baseSalary)}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {sum.excessLateHours > 0 ? (
                          <span className="text-rose-700 font-bold">
                            {sum.excessLateHours} {isAr ? 'ساعة' : 'hrs'}
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-bold">{isAr ? 'لا يوجد' : 'None'}</span>
                        )}
                      </td>
                      <td className="p-3 font-bold text-rose-800 whitespace-nowrap">
                        {sum.lateDeductionAmount > 0 ? `-${formatSalaryCurrency(sum.lateDeductionAmount)}` : '0.00 ر.س'}
                      </td>
                      <td className="p-3 font-bold text-rose-800 whitespace-nowrap">
                        {sum.penaltyDeductionsAmount > 0 ? `-${formatSalaryCurrency(sum.penaltyDeductionsAmount)}` : '0.00 ر.س'}
                      </td>
                      <td className="p-3 font-bold text-indigo-900 whitespace-nowrap">
                        {sum.advanceInstallmentsAmount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-indigo-700 font-bold bg-indigo-50/90 px-2 py-0.5 rounded-md border border-indigo-100">
                            <CreditCard className="w-3 h-3" />
                            <span>-{formatSalaryCurrency(sum.advanceInstallmentsAmount)}</span>
                          </span>
                        ) : (
                          <span className="text-[#8C887B]">0.00 ر.س</span>
                        )}
                      </td>
                      <td className="p-3 font-bold text-emerald-700 whitespace-nowrap">
                        {sum.waivedDeductionsAmount > 0 ? `+${formatSalaryCurrency(sum.waivedDeductionsAmount)}` : '0.00 ر.س'}
                      </td>
                      <td className="p-3 font-bold text-rose-900 whitespace-nowrap">
                        {sum.totalNetDeductions > 0 ? `-${formatSalaryCurrency(sum.totalNetDeductions)}` : '0.00 ر.س'}
                      </td>
                      <td className="p-3 font-bold text-[#2D3628] text-sm whitespace-nowrap bg-[#5E7153]/5">
                        {formatSalaryCurrency(sum.netSalary)}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        {originalUser && (
                          <button
                            onClick={() => setViewingPayslipUser(originalUser)}
                            className="px-2.5 py-1 rounded-lg bg-[#FAF9F6] hover:bg-[#EFECE4] border border-[#E5E2D9] text-[#2D3628] font-bold text-xs flex items-center gap-1 mx-auto transition-all"
                          >
                            <FileText className="w-3.5 h-3.5 text-[#5E7153]" />
                            <span>{isAr ? 'القسيمة' : 'Payslip'}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* SUB-TAB 4: SALARY ADVANCES & INSTALLMENTS            */}
      {/* ---------------------------------------------------- */}
      {activeSubTab === 'advances' && (
        <div className="space-y-6">
          {/* Action & Stats Banner */}
          <div className="bg-white rounded-2xl border border-[#E5E2D9] p-5 sm:p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold shrink-0 border border-indigo-100">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#2D3628]">
                    {isAr ? 'سجل سلفيات الموظفين والأقساط الشهرية' : 'Salary Advances & Monthly Installments'}
                  </h3>
                  <p className="text-xs text-[#65635E] mt-0.5">
                    {isAr
                      ? 'منح سلفيات مالية وتقسيطها على كذا شهر بخصم آلي من مسير الرواتب مع توثيق التوقيعات وسندات الصرف'
                      : 'Issue advances with multi-month scheduled deductions from payroll, digital signatures, and promissory vouchers'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  id="btn-open-my-signature"
                  onClick={() => setShowSignatureModalForUser(currentUser)}
                  className="px-3.5 py-2 rounded-xl bg-[#FAF9F6] hover:bg-[#EFECE4] border border-[#E5E2D9] text-[#2D3628] font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <PenTool className="w-3.5 h-3.5 text-[#5E7153]" />
                  <span>{isAr ? 'توقيعي الرقمي' : 'My Signature'}</span>
                  {currentUser.signatureDataUrl && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  )}
                </button>

                <button
                  type="button"
                  id="btn-issue-new-advance"
                  onClick={() => setShowAddAdvanceModal(true)}
                  className="px-4 py-2 rounded-xl bg-[#5E7153] hover:bg-[#4B5B42] text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isAr ? 'طلب / إصدار سلفة على الراتب' : 'Issue Salary Advance'}</span>
                </button>
              </div>
            </div>

            {/* Advances Overview Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              <div className="bg-[#FAF9F6] p-3.5 sm:p-4 rounded-xl border border-[#E5E2D9]">
                <p className="text-[11px] sm:text-xs font-semibold text-[#65635E]">
                  {isAr ? 'إجمالي السلفيات المعتمدة' : 'Total Approved Advances'}
                </p>
                <p className="text-base sm:text-xl font-bold text-[#2D3628] mt-1">
                  {formatSalaryCurrency(advancesStats.totalAdvancesAmount)}
                </p>
                <p className="text-[10px] text-[#8C887B] mt-0.5">
                  {advancesStats.count} {isAr ? 'سلفة مسجلة في النظام' : 'advances logged'}
                </p>
              </div>

              <div className="bg-indigo-50/70 p-3.5 sm:p-4 rounded-xl border border-indigo-200/80">
                <p className="text-[11px] sm:text-xs font-semibold text-indigo-900">
                  {isAr ? `أقساط شهر (${selectedMonth}) المستحقة` : `Due This Month (${selectedMonth})`}
                </p>
                <p className="text-base sm:text-xl font-bold text-indigo-950 mt-1">
                  {formatSalaryCurrency(advancesStats.currentMonthDue)}
                </p>
                <p className="text-[10px] text-indigo-700 mt-0.5">
                  {isAr ? 'تخصم تلقائياً من مسير رواتب هذا الشهر' : 'Deducted automatically from payroll'}
                </p>
              </div>

              <div className="bg-emerald-50/70 p-3.5 sm:p-4 rounded-xl border border-emerald-200/80">
                <p className="text-[11px] sm:text-xs font-semibold text-emerald-900">
                  {isAr ? 'إجمالي المبالغ المسددة' : 'Total Recovered'}
                </p>
                <p className="text-base sm:text-xl font-bold text-emerald-950 mt-1">
                  {formatSalaryCurrency(advancesStats.totalPaid)}
                </p>
                <p className="text-[10px] text-emerald-700 mt-0.5">
                  {isAr ? 'تم استردادها عبر مسيرات سابقة' : 'Collected via past payrolls'}
                </p>
              </div>

              <div className="bg-amber-50/70 p-3.5 sm:p-4 rounded-xl border border-amber-200/80">
                <p className="text-[11px] sm:text-xs font-semibold text-amber-900">
                  {isAr ? 'الرصيد المتبقي قيد السداد' : 'Remaining Balance'}
                </p>
                <p className="text-base sm:text-xl font-bold text-amber-950 mt-1">
                  {formatSalaryCurrency(advancesStats.totalRemaining)}
                </p>
                <p className="text-[10px] text-amber-700 mt-0.5">
                  {advancesStats.activeCount} {isAr ? 'سلفة جارية ومجدولة' : 'active ongoing loans'}
                </p>
              </div>
            </div>

            {/* Status Tabs Filter */}
            <div className="flex items-center gap-2 pt-2 border-t border-[#E5E2D9]">
              <span className="text-xs font-bold text-[#65635E] ml-2">
                {isAr ? 'تصفية الحالة:' : 'Filter Status:'}
              </span>
              <button
                onClick={() => setAdvanceStatusFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  advanceStatusFilter === 'all'
                    ? 'bg-[#5E7153] text-white'
                    : 'bg-[#FAF9F6] text-[#65635E] hover:bg-[#EFECE4]'
                }`}
              >
                {isAr ? 'الكل' : 'All'} ({salaryAdvances.length})
              </button>
              <button
                onClick={() => setAdvanceStatusFilter('approved')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  advanceStatusFilter === 'approved'
                    ? 'bg-[#5E7153] text-white'
                    : 'bg-[#FAF9F6] text-[#65635E] hover:bg-[#EFECE4]'
                }`}
              >
                {isAr ? 'جارية وقيد السداد' : 'Active / Ongoing'} ({advancesStats.activeCount})
              </button>
              <button
                onClick={() => setAdvanceStatusFilter('completed')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  advanceStatusFilter === 'completed'
                    ? 'bg-[#5E7153] text-white'
                    : 'bg-[#FAF9F6] text-[#65635E] hover:bg-[#EFECE4]'
                }`}
              >
                {isAr ? 'مكتملة السداد' : 'Fully Repaid'} (
                {salaryAdvances.filter((a) => a.status === 'completed').length})
              </button>
            </div>
          </div>

          {/* Advances List */}
          {filteredAdvances.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E5E2D9] p-12 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[#FAF9F6] border border-[#E5E2D9] text-[#8C887B] flex items-center justify-center mx-auto">
                <CreditCard className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-[#2D3628]">
                {isAr ? 'لا توجد سلفيات مطابقة' : 'No Advances Found'}
              </h4>
              <p className="text-xs text-[#65635E] max-w-md mx-auto">
                {isAr
                  ? 'لم يتم تسجيل سلفيات بعد، أو لم تطابق خيارات التصفية الحالية. يمكنك إضافة سلفة جديدة لأي موظف مع جدولتها بالتقسيط.'
                  : 'No salary advances found matching the filter. You can issue a new salary advance with custom installment schedules.'}
              </p>
              <button
                onClick={() => setShowAddAdvanceModal(true)}
                className="px-4 py-2 rounded-xl bg-[#5E7153] text-white text-xs font-bold shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAr ? 'إصدار سلفة الآن' : 'Issue Advance Now'}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAdvances.map((adv) => {
                const isExpanded = expandedAdvanceId === adv.id;
                const paidPct = adv.totalAmount > 0 ? Math.min(100, Math.round((adv.paidAmount / adv.totalAmount) * 100)) : 0;
                const thisMonthInstallment = adv.installments?.find((i) => i.month === selectedMonth);

                return (
                  <div
                    key={adv.id}
                    className="bg-white rounded-2xl border border-[#E5E2D9] overflow-hidden shadow-xs transition hover:border-[#D9E0D2]"
                  >
                    {/* Advance Card Header */}
                    <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E5E2D9]">
                      <div className="flex items-center gap-3">
                        <img
                          src={adv.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(adv.userName)}&background=5E7153&color=fff&bold=true`}
                          alt={adv.userName}
                          className="w-12 h-12 rounded-xl object-cover border border-[#E5E2D9]"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm sm:text-base text-[#2D3628]">{adv.userName}</h4>
                            <span className="font-mono text-[11px] bg-[#FAF9F6] text-[#65635E] px-2 py-0.5 rounded-md border border-[#E5E2D9]">
                              {adv.advanceNumber}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                adv.status === 'completed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : adv.status === 'approved'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {adv.status === 'completed'
                                ? isAr
                                  ? 'مكتملة ومسددة'
                                  : 'Completed'
                                : adv.status === 'approved'
                                ? isAr
                                  ? 'سارية وقيد السداد'
                                  : 'Active Ongoing'
                                : adv.status}
                            </span>
                          </div>
                          <div className="text-xs text-[#65635E] flex items-center gap-3 mt-1">
                            <span>{adv.department}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-[#8C887B]" />
                              <span>{isAr ? 'تاريخ الطلب:' : 'Date:'} {adv.requestDate}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => setViewingVoucherAdvance(adv)}
                          className="px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <FileCheck className="w-3.5 h-3.5 text-indigo-700" />
                          <span>{isAr ? 'سند الصرف والإقرار (طباعة)' : 'Promissory Voucher'}</span>
                        </button>

                        <button
                          onClick={() => setExpandedAdvanceId(isExpanded ? null : adv.id)}
                          className="px-3 py-1.5 rounded-xl bg-[#FAF9F6] hover:bg-[#EFECE4] border border-[#E5E2D9] text-[#2D3628] text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                        >
                          <Receipt className="w-3.5 h-3.5 text-[#5E7153]" />
                          <span>{isAr ? 'جدول الأقساط' : 'Schedule'} ({adv.installments?.length || 0})</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 text-[#8C887B]" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-[#8C887B]" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Advance Details Row */}
                    <div className="p-4 sm:p-5 bg-[#FAF9F6]/50 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-white p-3 rounded-xl border border-[#E5E2D9]">
                          <span className="text-[11px] text-[#65635E] block">{isAr ? 'إجمالي السلفة' : 'Total Advance'}</span>
                          <span className="font-extrabold text-[#2D3628] text-base">
                            {formatSalaryCurrency(adv.totalAmount)}
                          </span>
                        </div>

                        <div className="bg-white p-3 rounded-xl border border-[#E5E2D9]">
                          <span className="text-[11px] text-[#65635E] block">{isAr ? 'خطة التقسيط الشهري' : 'Installment Plan'}</span>
                          <span className="font-bold text-indigo-900 text-sm">
                            {adv.installmentsCount} {isAr ? 'أقساط' : 'inst.'} × {formatSalaryCurrency(adv.monthlyInstallmentAmount)}
                            <span className="text-[10px] text-[#8C887B] font-normal"> / {isAr ? 'شهر' : 'mo'}</span>
                          </span>
                          <span className="text-[10px] text-[#8C887B] block mt-0.5">
                            ({adv.startMonth} ➔ {adv.endMonth})
                          </span>
                        </div>

                        <div className="bg-white p-3 rounded-xl border border-[#E5E2D9]">
                          <span className="text-[11px] text-[#65635E] block">
                            {isAr ? `قسط مسير شهر (${selectedMonth})` : `Installment for ${selectedMonth}`}
                          </span>
                          {thisMonthInstallment ? (
                            <div className="flex items-center justify-between mt-0.5">
                              <span className="font-bold text-rose-800 text-sm">
                                {formatSalaryCurrency(thisMonthInstallment.amount)}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                {thisMonthInstallment.status === 'deducted'
                                  ? isAr ? 'مخصوم من المسير' : 'Deducted'
                                  : isAr ? 'مجدول للخصم' : 'Scheduled'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-[#8C887B] font-medium block mt-0.5">
                              {isAr ? 'لا يوجد قسط مستحق في هذا الشهر' : 'No installment due this month'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Repayment Progress Bar */}
                      <div className="bg-white p-3.5 rounded-xl border border-[#E5E2D9] space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#65635E] font-medium">
                            {isAr ? 'مسار استرداد وسداد السلفة:' : 'Repayment Progress:'}
                          </span>
                          <span className="font-bold text-[#2D3628]">
                            {isAr ? 'تم سداد' : 'Paid'}{' '}
                            <span className="text-emerald-700">{formatSalaryCurrency(adv.paidAmount)}</span>{' '}
                            ({paidPct}%) • {isAr ? 'المتبقي' : 'Remaining'}{' '}
                            <span className="text-amber-800">{formatSalaryCurrency(adv.remainingAmount)}</span>
                          </span>
                        </div>
                        <div className="w-full bg-[#E5E2D9] rounded-full h-2.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              paidPct >= 100 ? 'bg-emerald-600' : 'bg-[#5E7153]'
                            }`}
                            style={{ width: `${paidPct}%` }}
                          />
                        </div>
                      </div>

                      {/* Reason & Digital Signatures Status */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-white p-3 rounded-xl border border-[#E5E2D9]">
                        <div className="space-y-0.5">
                          <span className="text-[11px] font-bold text-[#65635E]">{isAr ? 'الغرض والسبب:' : 'Reason:'}</span>
                          <p className="text-[#2D3628] font-medium">{adv.reason}</p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-[#65635E]">{isAr ? 'إقرار الموظف:' : 'Employee Sign:'}</span>
                            {adv.employeeSignature ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Check className="w-3 h-3" />
                                <span>{isAr ? 'موقع إلكترونياً' : 'Signed'}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                                <span>{isAr ? 'بانتظار التوقيع' : 'Pending'}</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-[#65635E]">{isAr ? 'اعتماد الإدارة:' : 'Approval:'}</span>
                            {adv.approverSignature ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <ShieldCheck className="w-3 h-3" />
                                <span>{isAr ? 'معتمد' : 'Approved'}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#FAF9F6] text-[#8C887B] border border-[#E5E2D9]">
                                <span>{isAr ? 'قيد المراجعة' : 'In Review'}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expandable Installments Table */}
                    {isExpanded && (
                      <div className="p-4 sm:p-5 border-t border-[#E5E2D9] bg-white space-y-3">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-bold text-[#2D3628] flex items-center gap-1.5">
                            <Receipt className="w-4 h-4 text-[#5E7153]" />
                            <span>{isAr ? 'جدول استحقاق الأقساط الشهرية والتسوية المالية' : 'Monthly Installment Schedule'}</span>
                          </h5>
                          <span className="text-[11px] text-[#65635E]">
                            {adv.paidInstallmentsCount || 0} / {adv.installmentsCount} {isAr ? 'أقساط مسددة' : 'paid installments'}
                          </span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-right border border-[#E5E2D9] rounded-xl overflow-hidden">
                            <thead className="bg-[#FAF9F6] text-[#65635E] font-bold border-b border-[#E5E2D9]">
                              <tr>
                                <th className="p-2.5">#</th>
                                <th className="p-2.5">{isAr ? 'شهر الخصم' : 'Month'}</th>
                                <th className="p-2.5">{isAr ? 'قيمة القسط' : 'Amount'}</th>
                                <th className="p-2.5">{isAr ? 'حالة السداد' : 'Status'}</th>
                                <th className="p-2.5">{isAr ? 'تاريخ الخصم الفعلي' : 'Deduction Date'}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E5E2D9]">
                              {adv.installments?.map((inst) => {
                                const isCurrentMonth = inst.month === selectedMonth;
                                return (
                                  <tr
                                    key={inst.id}
                                    className={`hover:bg-[#FAF9F6] ${
                                      isCurrentMonth ? 'bg-indigo-50/40 font-semibold' : ''
                                    }`}
                                  >
                                    <td className="p-2.5 text-[#65635E]">{inst.installmentNumber}</td>
                                    <td className="p-2.5 font-bold text-[#2D3628]">
                                      {inst.month}
                                      {isCurrentMonth && (
                                        <span className="mr-1.5 text-[9px] bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded font-bold">
                                          {isAr ? 'الشهر المختار' : 'Current Selected'}
                                        </span>
                                      )}
                                    </td>
                                    <td className="p-2.5 font-bold text-[#2D3628]">
                                      {formatSalaryCurrency(inst.amount)}
                                    </td>
                                    <td className="p-2.5">
                                      <span
                                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                          inst.status === 'deducted' || inst.status === 'paid'
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : inst.status === 'deferred'
                                            ? 'bg-purple-100 text-purple-800'
                                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                                        }`}
                                      >
                                        {inst.status === 'deducted' || inst.status === 'paid'
                                          ? isAr
                                            ? 'تم الخصم من الراتب'
                                            : 'Deducted'
                                          : inst.status === 'deferred'
                                          ? isAr
                                            ? 'مؤجل'
                                            : 'Deferred'
                                          : isAr
                                          ? 'مجدول للخصم'
                                          : 'Scheduled'}
                                      </span>
                                    </td>
                                    <td className="p-2.5 text-[#65635E]">
                                      {inst.deductedAt || (isAr ? 'بانتظار مسير الشهر' : 'Pending payroll')}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: WAIVE DEDUCTION (صلاحية رفع الخصم)             */}
      {/* ---------------------------------------------------- */}
      {showWaiveModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-[#E5E2D9] shadow-2xl space-y-4 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E2D9]">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#2D3628]">
                    {isAr ? 'صلاحية رفع الخصم واعتماد الإعفاء' : 'Waive Deduction Authority'}
                  </h3>
                  <p className="text-xs text-[#65635E]">
                    {isAr ? 'إسقاط الخصم المالي عن الموظف بموجب عذر معتمد' : 'Waive financial deduction with valid excuse'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowWaiveModal(null)}
                className="p-1 rounded-lg text-[#8C887B] hover:text-[#2D3628] hover:bg-[#FAF9F6]"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#FAF9F6] p-3.5 rounded-xl border border-[#E5E2D9] space-y-1.5 text-xs">
              <p>
                <strong className="text-[#2D3628]">{isAr ? 'الموظف المستفيد:' : 'Employee:'}</strong>{' '}
                {showWaiveModal.targetName}
              </p>
              <p>
                <strong className="text-[#2D3628]">{isAr ? 'بيان الخصم المطلوب رفعه:' : 'Deduction item:'}</strong>{' '}
                {showWaiveModal.description}
              </p>
              <p>
                <strong className="text-[#2D3628]">{isAr ? 'المعتمد المسؤول:' : 'Authorized Officer:'}</strong>{' '}
                {currentUser.name} ({currentUser.role.toUpperCase()})
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#2D3628]">
                {isAr ? 'سبب رفع الخصم وتبرير الإعفاء (إلزامي):' : 'Waiver Justification / Reason:'}
              </label>
              <textarea
                rows={3}
                placeholder={
                  isAr
                    ? 'مثال: عذر مروري معتمد، مهمة عمل خارجية مثبتة، مراجعة عيادة طبية طارئة...'
                    : 'Enter valid justification e.g. Approved medical excuse, traffic emergency, offsite mission...'
                }
                value={waiveReasonInput}
                onChange={(e) => setWaiveReasonInput(e.target.value)}
                className="w-full p-3 rounded-xl border border-[#E5E2D9] text-xs sm:text-sm focus:outline-none focus:border-emerald-600 bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowWaiveModal(null)}
                className="px-4 py-2 rounded-xl bg-[#FAF9F6] hover:bg-[#EFECE4] text-[#65635E] font-bold text-xs sm:text-sm"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleConfirmWaive}
                disabled={isProcessing}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md flex items-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isProcessing ? (isAr ? 'جاري الاعتماد...' : 'Processing...') : isAr ? 'تأكيد رفع الخصم' : 'Confirm Waiver'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: RESTORE DEDUCTION CONFIRMATION                */}
      {/* ---------------------------------------------------- */}
      {restoreConfirmTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 border border-[#E5E2D9] shadow-2xl space-y-4 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E2D9]">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-[#2D3628]">
                  {isAr ? 'تأكيد إعادة تطبيق الخصم' : 'Confirm Restore Deduction'}
                </h3>
              </div>
              <button
                onClick={() => setRestoreConfirmTarget(null)}
                className="p-1 rounded-lg text-[#8C887B] hover:text-[#2D3628] hover:bg-[#FAF9F6] cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-[#65635E] leading-relaxed">
              {isAr
                ? 'هل أنت متأكد من رغبتك في إلغاء الإعفاء وإعادة تطبيق هذا الخصم المالي في مسير الرواتب؟'
                : 'Are you sure you want to cancel the waiver and restore this deduction to the payroll?'}
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setRestoreConfirmTarget(null)}
                className="px-4 py-2 rounded-xl bg-[#FAF9F6] hover:bg-[#EFECE4] text-[#65635E] font-bold text-xs cursor-pointer"
              >
                {isAr ? 'تراجع' : 'Cancel'}
              </button>
              <button
                onClick={handleConfirmRestore}
                disabled={isProcessing}
                className="px-5 py-2 rounded-xl bg-[#991B1B] hover:bg-[#7F1D1D] text-white font-bold text-xs shadow-md cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (isAr ? 'جاري التنفيذ...' : 'Processing...') : isAr ? 'تأكيد الإعادة' : 'Confirm Restore'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: ADD PENALTY / DISCIPLINARY DEDUCTION          */}
      {/* ---------------------------------------------------- */}
      {showAddPenaltyModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#E5E2D9] shadow-2xl space-y-4 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E2D9]">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center font-bold">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#2D3628]">
                    {isAr ? 'تسجيل خصم أو جزاء إداري جديد' : 'New Disciplinary Deduction'}
                  </h3>
                  <p className="text-xs text-[#65635E]">
                    {isAr ? 'إصدار قرار حسم مالي على الموظف بموجب لائحة العمل' : 'Issue financial deduction under labor bylaws'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddPenaltyModal(false)}
                className="p-1 rounded-lg text-[#8C887B] hover:text-[#2D3628] hover:bg-[#FAF9F6]"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPenaltySubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-[#2D3628] block mb-1">{isAr ? 'اختر الموظف:' : 'Employee:'}</label>
                <select
                  value={newPenaltyUserId}
                  onChange={(e) => setNewPenaltyUserId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E5E2D9] bg-white text-xs font-semibold focus:outline-none"
                >
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.department})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-[#2D3628] block mb-1">{isAr ? 'نوع الخصم:' : 'Type:'}</label>
                <select
                  value={newPenaltyType}
                  onChange={(e) => setNewPenaltyType(e.target.value as DeductionType)}
                  className="w-full p-2.5 rounded-xl border border-[#E5E2D9] bg-white text-xs font-semibold focus:outline-none"
                >
                  <option value="penalty_disciplinary">{isAr ? 'جزاء إداري ومخالفة لوائح' : 'Disciplinary Penalty'}</option>
                  <option value="unexcused_absence">{isAr ? 'غياب غير مبرر / بدون إذن' : 'Unexcused Absence'}</option>
                  <option value="other">{isAr ? 'خصم مالي آخر' : 'Other Deduction'}</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-[#2D3628] block mb-1">{isAr ? 'مسمى القرار / عنوان الجزاء:' : 'Decision Title:'}</label>
                <input
                  type="text"
                  required
                  placeholder={isAr ? 'مثال: لفت نظر وتأخر في تسليم تقرير الأمان' : 'e.g. Failure to comply with safety'}
                  value={newPenaltyTitle}
                  onChange={(e) => setNewPenaltyTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E5E2D9] text-xs focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#2D3628] block mb-1">{isAr ? 'مبلغ الخصم (ر.س):' : 'Amount (SAR):'}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={newPenaltyAmount}
                    onChange={(e) => setNewPenaltyAmount(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-[#E5E2D9] text-xs font-bold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#2D3628] block mb-1">{isAr ? 'أيام الخصم (اختياري):' : 'Days Deducted:'}</label>
                  <input
                    type="number"
                    min="0"
                    value={newPenaltyDays}
                    onChange={(e) => setNewPenaltyDays(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-[#E5E2D9] text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#2D3628] block mb-1">{isAr ? 'تاريخ المخالفة:' : 'Date:'}</label>
                <input
                  type="date"
                  required
                  value={newPenaltyDate}
                  onChange={(e) => setNewPenaltyDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E5E2D9] text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-[#2D3628] block mb-1">{isAr ? 'تفاصيل ومبررات القرار الإداري:' : 'Details & Bylaw reason:'}</label>
                <textarea
                  rows={2}
                  required
                  placeholder={isAr ? 'اكتب تفاصيل المخالفة ورقم المادة في لائحة العمل...' : 'Enter bylaw citation and details...'}
                  value={newPenaltyReason}
                  onChange={(e) => setNewPenaltyReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E5E2D9] text-xs focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E5E2D9]">
                <button
                  type="button"
                  onClick={() => setShowAddPenaltyModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#FAF9F6] text-[#65635E] font-bold"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2 rounded-xl bg-[#991B1B] hover:bg-[#7F1D1D] text-white font-bold shadow-md"
                >
                  {isProcessing ? (isAr ? 'جاري الحفظ...' : 'Saving...') : isAr ? 'اعتماد الخصم' : 'Apply Penalty'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: EDIT EMPLOYEE SALARY & GRACE QUOTA            */}
      {/* ---------------------------------------------------- */}
      {editingSalaryUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 border border-[#E5E2D9] shadow-2xl space-y-4 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E2D9]">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#5E7153]/10 text-[#5E7153] flex items-center justify-center font-bold">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#2D3628]">{isAr ? 'تعديل بيانات الراتب' : 'Edit Salary Details'}</h3>
                  <p className="text-xs text-[#65635E]">{editingSalaryUser.user.name}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingSalaryUser(null)}
                className="p-1 rounded-lg text-[#8C887B] hover:text-[#2D3628] hover:bg-[#FAF9F6]"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#2D3628] block mb-1">{isAr ? 'الراتب الأساسي الشهري (ر.س):' : 'Base Salary (SAR):'}</label>
                <input
                  type="number"
                  step="100"
                  min="3000"
                  value={editingSalaryUser.salary}
                  onChange={(e) => setEditingSalaryUser({ ...editingSalaryUser, salary: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl border border-[#E5E2D9] font-bold text-sm focus:outline-none"
                />
                <p className="text-[10px] text-[#8C887B] mt-1">
                  {isAr
                    ? `معدل أجر الساعة المحسوب: ${(Number(editingSalaryUser?.salary || 0) / 240).toFixed(2)} ر.س/ساعة`
                    : `Calculated hourly rate: ${(Number(editingSalaryUser?.salary || 0) / 240).toFixed(2)} SAR/h`}
                </p>
              </div>

              <div>
                <label className="font-bold text-[#2D3628] block mb-1">
                  {isAr ? 'ساعات سماحية التأخير الشهرية (افتراضياً 4):' : 'Monthly Delay Grace Hours (default 4.0):'}
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="20"
                  value={editingSalaryUser.graceHours}
                  onChange={(e) => setEditingSalaryUser({ ...editingSalaryUser, graceHours: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl border border-[#E5E2D9] font-bold text-sm focus:outline-none"
                />
                <p className="text-[10px] text-[#8C887B] mt-1">
                  {isAr
                    ? `أي تأخير تحت الـ ${editingSalaryUser.graceHours} ساعات لا يتم الخصم عليه`
                    : `Delay up to ${editingSalaryUser.graceHours}h will not incur deduction`}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E5E2D9]">
                <button
                  type="button"
                  onClick={() => setEditingSalaryUser(null)}
                  className="px-4 py-2 rounded-xl bg-[#FAF9F6] text-[#65635E] font-bold"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleSaveSalaryUpdate}
                  disabled={isProcessing}
                  className="px-5 py-2 rounded-xl bg-[#5E7153] hover:bg-[#4B5B42] text-white font-bold shadow-md"
                >
                  {isProcessing ? (isAr ? 'جاري الحفظ...' : 'Saving...') : isAr ? 'حفظ التعديل' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: OFFICIAL PAYSLIP VIEW (قسيمة الراتب المعتمدة) */}
      {/* ---------------------------------------------------- */}
      {payslipSummary && viewingPayslipUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 border border-[#E5E2D9] shadow-2xl space-y-5 text-right">
            {/* Payslip Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#E5E2D9]">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#5E7153] text-white flex items-center justify-center font-bold shadow-sm">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#2D3628]">
                    {isAr ? 'قسيمة الراتب والمستحقات الشهرية' : 'Monthly Salary Payslip'}
                  </h3>
                  <p className="text-xs text-[#65635E]">
                    {isAr ? `منظومة دوامي • شهر ${selectedMonth}` : `Dawamy Platform • ${selectedMonth}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingPayslipUser(null)}
                className="p-1 rounded-lg text-[#8C887B] hover:text-[#2D3628] hover:bg-[#FAF9F6]"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Employee Card */}
            <div className="bg-[#FAF9F6] p-4 rounded-xl border border-[#E5E2D9] flex items-center justify-between">
              <div>
                <p className="font-bold text-sm text-[#2D3628]">{payslipSummary.userName}</p>
                <p className="text-xs text-[#65635E]">{viewingPayslipUser.title}</p>
                <p className="text-[11px] text-[#8C887B]">{payslipSummary.department}</p>
              </div>
              <img
                src={payslipSummary.avatar}
                alt={payslipSummary.userName}
                className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
              />
            </div>

            {/* Breakdown Table */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-2 border-b border-[#E5E2D9]">
                <span className="text-[#65635E]">{isAr ? 'الراتب الأساسي المعتمد:' : 'Base Salary:'}</span>
                <span className="font-bold text-[#2D3628]">{formatSalaryCurrency(payslipSummary.baseSalary)}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-[#E5E2D9]">
                <span className="text-[#65635E]">
                  {isAr
                    ? `خصم التأخير بالبصمة (${payslipSummary.excessLateHours} ساعة زائدة عن سماحية الـ 4س):`
                    : `Biometric Late Deduction (${payslipSummary.excessLateHours}h excess):`}
                </span>
                <span
                  className={`font-bold ${
                    payslipSummary.lateDeductionAmount > 0 ? 'text-rose-700' : 'text-emerald-700'
                  }`}
                >
                  {payslipSummary.lateDeductionAmount > 0
                    ? `-${formatSalaryCurrency(payslipSummary.lateDeductionAmount)}`
                    : '0.00 ر.س'}
                </span>
              </div>

              <div className="flex justify-between py-2 border-b border-[#E5E2D9]">
                <span className="text-[#65635E]">{isAr ? 'خصم الجزاءات والعقوبات الإدارية:' : 'Disciplinary Penalties:'}</span>
                <span
                  className={`font-bold ${
                    payslipSummary.penaltyDeductionsAmount > 0 ? 'text-rose-700' : 'text-emerald-700'
                  }`}
                >
                  {payslipSummary.penaltyDeductionsAmount > 0
                    ? `-${formatSalaryCurrency(payslipSummary.penaltyDeductionsAmount)}`
                    : '0.00 ر.س'}
                </span>
              </div>

              {payslipSummary.advanceInstallmentsAmount > 0 && (
                <div className="flex justify-between py-2 border-b border-indigo-200 bg-indigo-50/70 px-2.5 rounded-lg">
                  <span className="text-indigo-900 font-bold flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-indigo-700" />
                    <span>{isAr ? 'خصم قسط سلفة الراتب المستحق:' : 'Advance Loan Installment:'}</span>
                  </span>
                  <span className="font-bold text-indigo-900">
                    -{formatSalaryCurrency(payslipSummary.advanceInstallmentsAmount)}
                  </span>
                </div>
              )}

              {payslipSummary.waivedDeductionsAmount > 0 && (
                <div className="flex justify-between py-2 border-b border-emerald-200 bg-emerald-50/60 px-2 rounded-lg">
                  <span className="text-emerald-800 font-bold">{isAr ? 'إعفاءات وخصومات تم رفعها رسمياً:' : 'Officially Waived:'}</span>
                  <span className="font-bold text-emerald-700">
                    +{formatSalaryCurrency(payslipSummary.waivedDeductionsAmount)}
                  </span>
                </div>
              )}

              <div className="flex justify-between py-3 bg-[#5E7153]/10 px-3 rounded-xl border border-[#5E7153]/20 text-sm">
                <span className="font-bold text-[#2D3628]">{isAr ? 'صافي الراتب المستحق للصرف:' : 'Net Payable Salary:'}</span>
                <span className="font-extrabold text-[#5E7153] text-base">
                  {formatSalaryCurrency(payslipSummary.netSalary)}
                </span>
              </div>
            </div>

            {/* Official Signatures Section on Payslip */}
            <div className="pt-2 border-t border-[#E5E2D9] grid grid-cols-2 gap-3 text-right">
              {/* Approver Signature */}
              <div className="bg-[#FAF9F6] p-2.5 rounded-xl border border-[#E5E2D9]">
                <span className="text-[10px] text-[#65635E] font-bold block mb-1">
                  {isAr ? 'اعتماد الإدارة المالية:' : 'Finance Director Approval:'}
                </span>
                <div className="h-12 flex items-center justify-center bg-white rounded-lg border border-dashed border-[#E5E2D9] overflow-hidden px-2">
                  {currentUser.signatureDataUrl ? (
                    <img
                      src={currentUser.signatureDataUrl}
                      alt="Manager Signature"
                      className="max-h-10 object-contain"
                    />
                  ) : (
                    <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{isAr ? 'معتمد إلكترونياً' : 'Verified Electronically'}</span>
                    </span>
                  )}
                </div>
                <p className="text-[9px] text-[#8C887B] text-center mt-1">
                  {currentUser.name} ({currentUser.title})
                </p>
              </div>

              {/* Employee Signature */}
              <div className="bg-[#FAF9F6] p-2.5 rounded-xl border border-[#E5E2D9]">
                <span className="text-[10px] text-[#65635E] font-bold block mb-1">
                  {isAr ? 'توقيع واستلام الموظف:' : 'Employee Acknowledgment:'}
                </span>
                <div className="h-12 flex items-center justify-center bg-white rounded-lg border border-dashed border-[#E5E2D9] overflow-hidden px-2">
                  {viewingPayslipUser.signatureDataUrl ? (
                    <img
                      src={viewingPayslipUser.signatureDataUrl}
                      alt="Employee Signature"
                      className="max-h-10 object-contain"
                    />
                  ) : (
                    <span className="text-[10px] text-[#8C887B] italic">
                      {isAr ? 'بانتظار توقيع الموظف' : 'Pending signature'}
                    </span>
                  )}
                </div>
                <p className="text-[9px] text-[#8C887B] text-center mt-1">
                  {viewingPayslipUser.name}
                </p>
              </div>
            </div>

            {/* Print & Close */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => {
                  try {
                    window.print();
                  } catch (e) {
                    console.warn('Printing not available:', e);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-[#FAF9F6] hover:bg-[#EFECE4] text-[#2D3628] font-bold text-xs flex items-center gap-1.5 border border-[#E5E2D9] cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{isAr ? 'طباعة القسيمة' : 'Print'}</span>
              </button>
              <button
                onClick={() => setViewingPayslipUser(null)}
                className="px-5 py-2 rounded-xl bg-[#5E7153] text-white font-bold text-xs cursor-pointer"
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: ADD SALARY ADVANCE WITH INSTALLMENTS          */}
      {/* ---------------------------------------------------- */}
      {showAddAdvanceModal && (
        <SalaryAdvanceModal
          isOpen={showAddAdvanceModal}
          onClose={() => setShowAddAdvanceModal(false)}
          users={allUsers}
          currentUser={currentUser}
          onSaveAdvance={handleCreateSalaryAdvance}
          lang={lang}
        />
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: PRINTABLE ADVANCE VOUCHER WITH SIGNATURES     */}
      {/* ---------------------------------------------------- */}
      {viewingVoucherAdvance && (
        <SalaryAdvanceVoucherModal
          isOpen={!!viewingVoucherAdvance}
          onClose={() => setViewingVoucherAdvance(null)}
          advance={viewingVoucherAdvance}
          employee={allUsers.find((u) => u.id === viewingVoucherAdvance.userId) || currentUser}
          currentUser={currentUser}
          lang={lang}
        />
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: DIGITAL SIGNATURE (MANAGE SIGNATURE)          */}
      {/* ---------------------------------------------------- */}
      {showSignatureModalForUser && (
        <DigitalSignatureModal
          isOpen={!!showSignatureModalForUser}
          onClose={() => setShowSignatureModalForUser(null)}
          currentUser={showSignatureModalForUser}
          onSaveSignature={handleSaveUserSignature}
          lang={lang}
        />
      )}
    </div>
  );
};
