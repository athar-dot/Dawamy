export type UserRole = 'employee' | 'manager' | 'hr';

export type RequestType = 'remote' | 'annual_leave' | 'sick_leave' | 'emergency_leave' | 'half_day';

export type RequestStatus = 'pending_manager' | 'pending_hr' | 'approved' | 'rejected' | 'cancelled';

export type WorkStatus = 'in_office' | 'wfh_active' | 'deep_focus' | 'in_break' | 'in_meeting' | 'offline';

export interface DailyTaskItem {
  id: string;
  title: string;
  dueTime: string; // e.g. "11:30 AM", "02:00 PM", "16:00"
  completed: boolean;
  priority: 'high' | 'medium' | 'normal';
  category?: string;
  notes?: string;
  createdAt?: string;
  completedAt?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  nameEn: string;
  email: string;
  role: UserRole;
  title: string;
  titleEn: string;
  department: string;
  departmentEn: string;
  avatar: string;
  managerName: string;
  managerId?: string;
  joinDate?: string;
  phone?: string;
  biometricEnrollId?: string; // Machine fingerprint/face ID (e.g. "101", "102")
  salary?: number; // Base monthly salary (e.g. 15000)
  salaryCurrency?: string; // e.g. "SAR" or "ر.س"
  graceLateHoursMonthly?: number; // Monthly allowed late hours (default 4.0)
  balances: {
    wfhMonthlyTotal: number;
    wfhMonthlyUsed: number;
    annualLeaveTotal: number;
    annualLeaveUsed: number;
    sickLeaveUsed: number;
    emergencyLeaveUsed: number;
  };
  todayStatus: WorkStatus;
  checkInTime?: string;
  currentTasks?: string[];
  dailyTasks?: DailyTaskItem[];
  createdAt?: string;
}

export interface LeaveOrWfhRequest {
  id: string;
  userId: string;
  userName: string;
  userTitle: string;
  department: string;
  avatar: string;
  type: RequestType;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  isAiGeneratedReason?: boolean;
  handoverColleague?: string;
  handoverPlan?: string;
  status: RequestStatus;
  createdAt: string;
  managerNotes?: string;
  hrNotes?: string;
  approvedByManagerAt?: string;
  approvedByHrAt?: string;
  rejectedReason?: string;
}

export interface TeamMemberStatus {
  id: string;
  name: string;
  nameEn: string;
  role: string;
  roleEn?: string;
  title?: string;
  titleEn?: string;
  department: string;
  departmentEn?: string;
  avatar: string;
  status: WorkStatus;
  location: string;
  locationEn?: string;
  checkInTime?: string;
  currentFocus?: string;
  currentFocusEn?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  titleEn?: string;
  message: string;
  messageEn?: string;
  type: 'approval' | 'rejection' | 'reminder' | 'system';
  timestamp: string;
  read: boolean;
  requestId?: string;
}

export interface PolicyFaqItem {
  questionAr: string;
  questionEn: string;
  summaryAr: string;
  summaryEn: string;
  tag: string;
}

// ----------------------------------------------------
// BIOMETRIC ATTENDANCE & PUNCH DEVICE INTEGRATION TYPES
// ----------------------------------------------------
export type AttendanceStatus = 'present' | 'late' | 'early_leave' | 'absent' | 'on_leave' | 'wfh';

export type BiometricVerifyMethod = 'fingerprint' | 'face' | 'card' | 'manual';

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  userNameEn?: string;
  userEmail: string;
  department: string;
  departmentEn?: string;
  biometricEnrollId?: string;
  date: string; // YYYY-MM-DD
  checkInTime?: string; // HH:mm:ss
  checkOutTime?: string; // HH:mm:ss
  status: AttendanceStatus;
  totalWorkingHours?: number; // Calculated hours worked
  lateMinutes?: number; // Delay past expected start time (e.g. 09:00 AM)
  verifyMethod?: BiometricVerifyMethod;
  deviceId?: string;
  deviceName?: string;
  deviceLocation?: string;
  rawPunchLog?: string;
  isLateDeductionWaived?: boolean; // Whether the late deduction was officially waived by HR/Manager
  waivedReason?: string; // Justification for waiving the late deduction
  waivedBy?: string; // Name of HR/Manager who waived it
  waivedAt?: string; // ISO timestamp
  createdAt?: string;
  updatedAt?: string;
  notes?: string;
}

// ----------------------------------------------------
// SALARY & DEDUCTION TYPES (LATE, PENALTY, WAIVER)
// ----------------------------------------------------
export type DeductionType = 'late_arrival' | 'penalty_disciplinary' | 'unexcused_absence' | 'other';
export type DeductionStatus = 'applied' | 'waived';

export interface SalaryDeduction {
  id: string;
  userId: string;
  userName: string;
  userNameEn?: string;
  userEmail: string;
  department: string;
  month: string; // "YYYY-MM" e.g. "2026-09"
  type: DeductionType;
  title: string;
  titleEn?: string;
  amount: number; // Currency amount deducted
  hoursDeducted?: number; // In case of late hours
  daysDeducted?: number; // In case of days penalty
  date: string; // YYYY-MM-DD
  status: DeductionStatus;
  reason: string;
  issuedBy: string; // e.g. "إدارة الموارد البشرية (HR)"
  issuedAt: string;
  waivedAt?: string;
  waivedBy?: string;
  waivedReason?: string; // Reason for lifting/waiving the deduction
  attendanceRecordId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MonthlyEmployeeLateSummary {
  userId: string;
  userName: string;
  userNameEn?: string;
  userEmail: string;
  department: string;
  avatar: string;
  month: string; // "YYYY-MM"
  baseSalary: number;
  salaryCurrency: string;
  hourlyRate: number; // baseSalary / 30 / 8
  totalLateOccurrences: number; // count of late punches
  totalLateMinutes: number; // sum of un-waived late minutes
  totalLateHours: number; // totalLateMinutes / 60
  allowedGraceHours: number; // e.g. 4.0
  allowedGraceMinutes: number; // 240
  usedGraceMinutes: number;
  remainingGraceMinutes: number;
  remainingGraceHours: number;
  excessLateMinutes: number;
  excessLateHours: number;
  lateDeductionAmount: number; // excessLateHours * hourlyRate
  penaltyDeductionsAmount: number; // sum of applied disciplinary deductions
  waivedDeductionsAmount: number; // total value of waived deductions
  totalNetDeductions: number; // lateDeductionAmount + penaltyDeductionsAmount
  netSalary: number; // baseSalary - totalNetDeductions
  lateRecords: AttendanceRecord[];
}

export interface BiometricDeviceConfig {
  id: string;
  name: string;
  ipAddress: string;
  port: number;
  serialNumber: string;
  protocol: 'adms' | 'rest_webhook' | 'tcp_ip' | 'cloud';
  location: string;
  status: 'online' | 'offline' | 'syncing';
  lastSyncTime?: string;
  totalRegisteredUsers?: number;
  apiKey?: string;
  firmwareVersion?: string;
}

export interface BiometricPunchPayload {
  deviceId: string;
  enrollId: string; // e.g. "101"
  timestamp: string; // ISO or YYYY-MM-DD HH:mm:ss
  punchType: 'check_in' | 'check_out' | 'auto';
  verifyMethod: BiometricVerifyMethod;
}

// ----------------------------------------------------
// BULK LEAVE BALANCES IMPORT TYPES (EXCEL / CSV)
// ----------------------------------------------------
export interface BulkBalanceImportRow {
  rowNumber: number;
  identifier: string; // email or user id
  employeeName?: string;
  annualLeaveTotal?: number;
  annualLeaveUsed?: number;
  sickLeaveUsed?: number;
  emergencyLeaveUsed?: number;
  wfhMonthlyTotal?: number;
  wfhMonthlyUsed?: number;
  matchedUser?: UserProfile;
  status: 'valid' | 'invalid' | 'warning';
  validationMessage?: string;
}

export interface BulkImportSummary {
  totalRows: number;
  validCount: number;
  invalidCount: number;
  updatedCount: number;
}

