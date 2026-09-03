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
