import bcrypt from 'bcryptjs';
import { prisma, checkDatabaseConnection } from '../db';
import { UserRole, RequestStatus, AttendanceStatus } from '@prisma/client';

// Initial in-memory fallback store for seamless dev/preview when DB container is not yet spun up
interface FallbackStore {
  users: Array<{
    id: string;
    employeeId: string;
    name: string;
    nameEn?: string;
    email: string;
    passwordHash: string;
    role: 'employee' | 'manager' | 'hr' | 'admin';
    department: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    employee: {
      id: string;
      userId: string;
      jobTitle: string;
      jobTitleEn?: string;
      departmentId?: string;
      phone?: string;
      avatar?: string;
      joinDate?: string;
      annualLeaveBalance: number;
      wfhBalancePerWeek: number;
      todayStatus: string;
      lastCheckIn?: string;
      lastCheckOut?: string;
      location?: string;
      managerId?: string;
    };
  }>;
  attendance: Array<{
    id: string;
    employeeId: string;
    date: string;
    checkIn?: string;
    checkOut?: string;
    status: string;
    notes?: string;
    verificationMethod?: string;
    createdAt: Date;
  }>;
  leaveRequests: Array<{
    id: string;
    employeeId: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    reason: string;
    status: string;
    approvedBy?: string;
    approvedAt?: Date;
    rejectionReason?: string;
    createdAt: Date;
  }>;
  remoteRequests: Array<{
    id: string;
    employeeId: string;
    date: string;
    reason: string;
    tasksPlan?: string;
    status: string;
    managerId?: string;
    approvedAt?: Date;
    rejectionReason?: string;
    createdAt: Date;
  }>;
  auditLogs: Array<{
    id: string;
    userId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    details?: string;
    ipAddress?: string;
    createdAt: Date;
  }>;
}

// Pre-hashed passwords for instant fallback
// Admin@123, Reem@123, Tariq@123, Sara@123
const SALT = bcrypt.genSaltSync(10);
const PASS_ADMIN = bcrypt.hashSync('Admin@123', SALT);
const PASS_HR = bcrypt.hashSync('Reem@123', SALT);
const PASS_MGR = bcrypt.hashSync('Tariq@123', SALT);
const PASS_EMP = bcrypt.hashSync('Sara@123', SALT);

const todayStr = new Date().toISOString().split('T')[0];

const memoryStore: FallbackStore = {
  users: [
    {
      id: 'usr-admin-1',
      employeeId: 'ADM-001',
      name: 'عبدالله السديري',
      nameEn: 'Abdullah Al-Sudairy',
      email: 'admin@dawamy.app',
      passwordHash: PASS_ADMIN,
      role: 'admin',
      department: 'Management',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      employee: {
        id: 'emp-admin-1',
        userId: 'usr-admin-1',
        jobTitle: 'مسؤول النظام والتحول الرقمي',
        jobTitleEn: 'Chief Systems Administrator',
        departmentId: 'dept-eng',
        phone: '+966 50 111 0001',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        joinDate: '2022-01-10',
        annualLeaveBalance: 30,
        wfhBalancePerWeek: 3,
        todayStatus: 'present',
        lastCheckIn: '08:00 AM',
        location: 'HQ - Executive Wing',
      },
    },
    {
      id: 'usr-mgr-1',
      employeeId: 'MGR-101',
      name: 'طارق الخالدي',
      nameEn: 'Tariq Al-Khalidi',
      email: 'tariq.manager@dawamy.app',
      passwordHash: PASS_MGR,
      role: 'manager',
      department: 'Engineering',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      employee: {
        id: 'emp-mgr-1',
        userId: 'usr-mgr-1',
        jobTitle: 'مدير الفريق الهندسي',
        jobTitleEn: 'Engineering Lead',
        departmentId: 'dept-eng',
        phone: '+966 55 222 3333',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        joinDate: '2022-06-15',
        annualLeaveBalance: 25,
        wfhBalancePerWeek: 2,
        todayStatus: 'present',
        lastCheckIn: '08:45 AM',
        location: 'HQ - Floor 4',
      },
    },
    {
      id: 'usr-hr-1',
      employeeId: 'HR-201',
      name: 'ريم العتيبي',
      nameEn: 'Reem Al-Otaibi',
      email: 'reem.hr@dawamy.app',
      passwordHash: PASS_HR,
      role: 'hr',
      department: 'Human Resources',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      employee: {
        id: 'emp-hr-1',
        userId: 'usr-hr-1',
        jobTitle: 'أخصائية شؤون الموظفين والامتثال',
        jobTitleEn: 'People & HR Admin',
        departmentId: 'dept-hr',
        phone: '+966 54 333 4444',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
        joinDate: '2023-02-01',
        annualLeaveBalance: 24,
        wfhBalancePerWeek: 2,
        todayStatus: 'present',
        lastCheckIn: '09:00 AM',
        location: 'HQ - Floor 2',
      },
    },
    {
      id: 'usr-emp-1',
      employeeId: 'EMP-301',
      name: 'سارة المنصور',
      nameEn: 'Sara Mansoor',
      email: 'sara.mansoor@dawamy.app',
      passwordHash: PASS_EMP,
      role: 'employee',
      department: 'Engineering',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      employee: {
        id: 'emp-sara-1',
        userId: 'usr-emp-1',
        jobTitle: 'مهندسة برمجيات أولى (Cloud & Frontend)',
        jobTitleEn: 'Senior Software Engineer',
        departmentId: 'dept-eng',
        phone: '+966 56 444 5555',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        joinDate: '2023-08-10',
        annualLeaveBalance: 21,
        wfhBalancePerWeek: 2,
        todayStatus: 'wfh_active',
        lastCheckIn: '09:15 AM (WFH)',
        location: 'Home Office (Riyadh)',
        managerId: 'emp-mgr-1',
      },
    },
  ],
  attendance: [
    {
      id: 'att-1',
      employeeId: 'emp-sara-1',
      date: todayStr,
      checkIn: '09:15 AM',
      status: 'wfh_active',
      notes: 'Virtual WFH check-in verified. Direct manager approval recorded with HR.',
      verificationMethod: 'web',
      createdAt: new Date(),
    },
    {
      id: 'att-2',
      employeeId: 'emp-mgr-1',
      date: todayStr,
      checkIn: '08:45 AM',
      status: 'present',
      notes: 'Biometric physical punch card',
      verificationMethod: 'biometric',
      createdAt: new Date(),
    },
  ],
  leaveRequests: [
    {
      id: 'leave-1',
      employeeId: 'emp-sara-1',
      leaveType: 'annual_leave',
      startDate: '2026-09-15',
      endDate: '2026-09-18',
      reason: 'إجازة سنوية مجدولة للراحة مع تسليم المهام للمهندس زياد',
      status: 'pending_manager',
      createdAt: new Date(),
    },
  ],
  remoteRequests: [
    {
      id: 'remote-1',
      employeeId: 'emp-sara-1',
      date: todayStr,
      reason: 'التركيز على بناء وهيكلة الحاويات وفصل قاعدة بيانات PostgreSQL في بيئة Docker',
      tasksPlan: '1. بناء Prisma schema\n2. اختبار Docker compose\n3. التحقق من صلاحيات الموارد البشرية',
      status: 'approved',
      managerId: 'emp-mgr-1',
      approvedAt: new Date(),
      createdAt: new Date(),
    },
  ],
  auditLogs: [
    {
      id: 'log-1',
      userId: 'usr-admin-1',
      action: 'SYSTEM_BOOTSTRAP',
      entityType: 'system',
      entityId: 'docker-app',
      details: 'Containerized architecture initialized with PostgreSQL integration.',
      ipAddress: '127.0.0.1',
      createdAt: new Date(),
    },
  ],
};

export class DataService {
  // 1. Authenticate user
  static async login(email: string, passwordPlain: string, ipAddress?: string) {
    const isDb = await checkDatabaseConnection();

    let user: any = null;
    let employeeData: any = null;

    if (isDb) {
      user = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
        include: { employee: true },
      });
      if (user) {
        employeeData = user.employee;
      }
    } else {
      // Fallback in-memory
      const found = memoryStore.users.find(
        (u) => u.email.toLowerCase().trim() === email.toLowerCase().trim()
      );
      if (found) {
        user = found;
        employeeData = found.employee;
      }
    }

    if (!user || !user.isActive) {
      return { success: false, error: 'User not found or account is inactive.' };
    }

    // Verify bcrypt hash
    const isValid = await bcrypt.compare(passwordPlain, user.passwordHash);
    if (!isValid) {
      return { success: false, error: 'Invalid password. Please check your credentials.' };
    }

    // Log login audit
    await this.logAudit({
      userId: user.id,
      action: 'LOGIN',
      entityType: 'user',
      entityId: user.id,
      details: `User logged in from ${ipAddress || 'unknown'}`,
      ipAddress,
    });

    return {
      success: true,
      user: {
        id: user.id,
        employeeId: user.employeeId,
        name: user.name,
        nameEn: user.nameEn,
        email: user.email,
        role: user.role,
        department: user.department,
        employee: employeeData,
      },
    };
  }

  // 2. Get User Profile by ID
  static async getUserById(userId: string) {
    const isDb = await checkDatabaseConnection();
    if (isDb) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { employee: true },
      });
      return user;
    }

    return memoryStore.users.find((u) => u.id === userId) || null;
  }

  // 3. Get All Employees (with department and today's status)
  static async getAllEmployees() {
    const isDb = await checkDatabaseConnection();
    if (isDb) {
      const employees = await prisma.employee.findMany({
        include: {
          user: {
            select: {
              id: true,
              employeeId: true,
              name: true,
              nameEn: true,
              email: true,
              role: true,
              department: true,
              isActive: true,
            },
          },
          departmentRef: true,
        },
      });

      return employees.map((emp) => ({
        id: emp.id,
        userId: emp.userId,
        employeeId: emp.user.employeeId,
        name: emp.user.name,
        nameEn: emp.user.nameEn,
        email: emp.user.email,
        role: emp.user.role,
        department: emp.user.department,
        jobTitle: emp.jobTitle,
        jobTitleEn: emp.jobTitleEn,
        phone: emp.phone,
        avatar: emp.avatar,
        joinDate: emp.joinDate,
        annualLeaveBalance: emp.annualLeaveBalance,
        wfhBalancePerWeek: emp.wfhBalancePerWeek,
        todayStatus: emp.todayStatus,
        lastCheckIn: emp.lastCheckIn,
        lastCheckOut: emp.lastCheckOut,
        location: emp.location,
      }));
    }

    // Fallback store
    return memoryStore.users.map((u) => ({
      id: u.employee.id,
      userId: u.id,
      employeeId: u.employeeId,
      name: u.name,
      nameEn: u.nameEn,
      email: u.email,
      role: u.role,
      department: u.department,
      jobTitle: u.employee.jobTitle,
      jobTitleEn: u.employee.jobTitleEn,
      phone: u.employee.phone,
      avatar: u.employee.avatar,
      joinDate: u.employee.joinDate,
      annualLeaveBalance: u.employee.annualLeaveBalance,
      wfhBalancePerWeek: u.employee.wfhBalancePerWeek,
      todayStatus: u.employee.todayStatus,
      lastCheckIn: u.employee.lastCheckIn,
      lastCheckOut: u.employee.lastCheckOut,
      location: u.employee.location,
    }));
  }

  // 4. Create Employee (Admin & HR)
  static async createEmployee(data: {
    name: string;
    nameEn?: string;
    email: string;
    passwordPlain: string;
    role: 'employee' | 'manager' | 'hr' | 'admin';
    department: string;
    jobTitle: string;
    jobTitleEn?: string;
    phone?: string;
    avatar?: string;
  }) {
    const isDb = await checkDatabaseConnection();
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.passwordPlain, salt);
    const employeeCode = `EMP-${Math.floor(100 + Math.random() * 900)}`;

    if (isDb) {
      const newUser = await prisma.user.create({
        data: {
          employeeId: employeeCode,
          name: data.name,
          nameEn: data.nameEn,
          email: data.email.toLowerCase().trim(),
          passwordHash,
          role: data.role as UserRole,
          department: data.department,
          employee: {
            create: {
              jobTitle: data.jobTitle,
              jobTitleEn: data.jobTitleEn,
              phone: data.phone,
              avatar: data.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
              annualLeaveBalance: 25,
              wfhBalancePerWeek: 2,
              todayStatus: AttendanceStatus.present,
            },
          },
        },
        include: { employee: true },
      });
      return newUser;
    }

    // Fallback store
    const newId = `usr-${Date.now()}`;
    const newEmpId = `emp-${Date.now()}`;
    const newRecord = {
      id: newId,
      employeeId: employeeCode,
      name: data.name,
      nameEn: data.nameEn,
      email: data.email,
      passwordHash,
      role: data.role,
      department: data.department,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      employee: {
        id: newEmpId,
        userId: newId,
        jobTitle: data.jobTitle,
        jobTitleEn: data.jobTitleEn,
        phone: data.phone,
        avatar: data.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        joinDate: new Date().toISOString().split('T')[0],
        annualLeaveBalance: 25,
        wfhBalancePerWeek: 2,
        todayStatus: 'present',
      },
    };
    memoryStore.users.push(newRecord);
    return newRecord;
  }

  // 5. Attendance Operations
  static async checkIn(employeeId: string, method: string = 'web', notes?: string) {
    const isDb = await checkDatabaseConnection();
    const date = new Date().toISOString().split('T')[0];
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    if (isDb) {
      const record = await prisma.attendance.upsert({
        where: {
          employeeId_date: {
            employeeId,
            date,
          },
        },
        update: {
          checkIn: time,
          status: AttendanceStatus.present,
          notes: notes || 'Updated check-in',
          verificationMethod: method,
        },
        create: {
          employeeId,
          date,
          checkIn: time,
          status: AttendanceStatus.present,
          notes: notes || 'Daily check-in',
          verificationMethod: method,
        },
      });

      // Update employee today status
      await prisma.employee.update({
        where: { id: employeeId },
        data: {
          lastCheckIn: time,
          todayStatus: AttendanceStatus.present,
        },
      });

      return record;
    }

    // Fallback
    const existing = memoryStore.attendance.find((a) => a.employeeId === employeeId && a.date === date);
    if (existing) {
      existing.checkIn = time;
      existing.notes = notes;
    } else {
      memoryStore.attendance.push({
        id: `att-${Date.now()}`,
        employeeId,
        date,
        checkIn: time,
        status: 'present',
        notes: notes || 'Daily check-in',
        verificationMethod: method,
        createdAt: new Date(),
      });
    }

    const empUser = memoryStore.users.find((u) => u.employee.id === employeeId);
    if (empUser) {
      empUser.employee.lastCheckIn = time;
      empUser.employee.todayStatus = 'present';
    }

    return { employeeId, date, checkIn: time };
  }

  static async checkOut(employeeId: string, notes?: string) {
    const isDb = await checkDatabaseConnection();
    const date = new Date().toISOString().split('T')[0];
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    if (isDb) {
      const record = await prisma.attendance.updateMany({
        where: { employeeId, date },
        data: {
          checkOut: time,
          notes: notes || 'Checked out',
        },
      });

      await prisma.employee.update({
        where: { id: employeeId },
        data: { lastCheckOut: time },
      });

      return record;
    }

    // Fallback
    const existing = memoryStore.attendance.find((a) => a.employeeId === employeeId && a.date === date);
    if (existing) {
      existing.checkOut = time;
      if (notes) existing.notes = (existing.notes ? existing.notes + ' | ' : '') + notes;
    }

    const empUser = memoryStore.users.find((u) => u.employee.id === employeeId);
    if (empUser) {
      empUser.employee.lastCheckOut = time;
    }

    return { employeeId, date, checkOut: time };
  }

  static async getAttendanceRecords(filter?: { employeeId?: string; date?: string }) {
    const isDb = await checkDatabaseConnection();
    if (isDb) {
      return prisma.attendance.findMany({
        where: {
          employeeId: filter?.employeeId,
          date: filter?.date,
        },
        include: {
          employee: {
            include: { user: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return memoryStore.attendance.filter((a) => {
      if (filter?.employeeId && a.employeeId !== filter.employeeId) return false;
      if (filter?.date && a.date !== filter.date) return false;
      return true;
    });
  }

  // 6. Remote Work Requests (The crucial Workflow: Employee -> Direct Manager -> HR Visibility -> Attendance)
  static async getRemoteWorkRequests(user: { id: string; role: string; employeeId?: string }) {
    const isDb = await checkDatabaseConnection();
    if (isDb) {
      // HR and Admin have full visibility over all requests
      if (user.role === 'hr' || user.role === 'admin') {
        return prisma.remoteWorkRequest.findMany({
          include: {
            employee: { include: { user: true } },
          },
          orderBy: { createdAt: 'desc' },
        });
      }

      // Manager sees team requests or requests targeting them
      if (user.role === 'manager' && user.employeeId) {
        return prisma.remoteWorkRequest.findMany({
          where: {
            OR: [
              { managerId: user.employeeId },
              { employeeId: user.employeeId },
            ],
          },
          include: {
            employee: { include: { user: true } },
          },
          orderBy: { createdAt: 'desc' },
        });
      }

      // Standard employee sees their own requests
      return prisma.remoteWorkRequest.findMany({
        where: { employeeId: user.employeeId },
        include: {
          employee: { include: { user: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // Fallback store
    if (user.role === 'hr' || user.role === 'admin') {
      return memoryStore.remoteRequests;
    }
    if (user.role === 'manager') {
      return memoryStore.remoteRequests.filter((r) => r.managerId === user.employeeId || r.employeeId === user.employeeId);
    }
    return memoryStore.remoteRequests.filter((r) => r.employeeId === user.employeeId);
  }

  static async createRemoteWorkRequest(data: {
    employeeId: string;
    date: string;
    reason: string;
    tasksPlan?: string;
    managerId?: string;
  }) {
    const isDb = await checkDatabaseConnection();
    if (isDb) {
      const req = await prisma.remoteWorkRequest.create({
        data: {
          employeeId: data.employeeId,
          date: data.date,
          reason: data.reason,
          tasksPlan: data.tasksPlan,
          managerId: data.managerId,
          status: RequestStatus.pending_manager,
        },
        include: { employee: { include: { user: true } } },
      });
      return req;
    }

    // Fallback
    const newReq = {
      id: `remote-${Date.now()}`,
      employeeId: data.employeeId,
      date: data.date,
      reason: data.reason,
      tasksPlan: data.tasksPlan,
      managerId: data.managerId,
      status: 'pending_manager',
      createdAt: new Date(),
    };
    memoryStore.remoteRequests.unshift(newReq);
    return newReq;
  }

  static async approveRemoteWorkRequest(requestId: string, approverUser: { id: string; name: string; role: string; employeeId?: string }) {
    const isDb = await checkDatabaseConnection();
    const now = new Date();

    if (isDb) {
      const updated = await prisma.remoteWorkRequest.update({
        where: { id: requestId },
        data: {
          status: RequestStatus.approved,
          approvedAt: now,
          managerId: approverUser.employeeId,
        },
        include: { employee: { include: { user: true } } },
      });

      // Update employee attendance to WFH active for that date
      await prisma.attendance.upsert({
        where: {
          employeeId_date: {
            employeeId: updated.employeeId,
            date: updated.date,
          },
        },
        update: {
          status: AttendanceStatus.wfh_active,
          notes: `Remote work approved by ${approverUser.name} (${approverUser.role}). HR record updated.`,
        },
        create: {
          employeeId: updated.employeeId,
          date: updated.date,
          status: AttendanceStatus.wfh_active,
          notes: `Remote work approved by ${approverUser.name} (${approverUser.role}). HR record updated.`,
          verificationMethod: 'wfh_approval',
        },
      });

      // Update employee todayStatus
      await prisma.employee.update({
        where: { id: updated.employeeId },
        data: { todayStatus: AttendanceStatus.wfh_active },
      });

      // Audit Log for HR Visibility
      await this.logAudit({
        userId: approverUser.id,
        action: 'APPROVE_REMOTE_WORK',
        entityType: 'remote_work_request',
        entityId: requestId,
        details: `Approved remote work for employee ${updated.employee.user.name} on date ${updated.date} by ${approverUser.name}. Visible to HR.`,
      });

      return updated;
    }

    // Fallback
    const found = memoryStore.remoteRequests.find((r) => r.id === requestId);
    if (found) {
      found.status = 'approved';
      found.approvedAt = now;
      found.managerId = approverUser.employeeId;

      // Update employee todayStatus in memory
      const empUser = memoryStore.users.find((u) => u.employee.id === found.employeeId);
      if (empUser) {
        empUser.employee.todayStatus = 'wfh_active';
      }

      // Upsert attendance in memory
      const existingAtt = memoryStore.attendance.find((a) => a.employeeId === found.employeeId && a.date === found.date);
      if (existingAtt) {
        existingAtt.status = 'wfh_active';
        existingAtt.notes = `Remote work approved by ${approverUser.name} (${approverUser.role}). HR record updated.`;
      } else {
        memoryStore.attendance.push({
          id: `att-${Date.now()}`,
          employeeId: found.employeeId,
          date: found.date,
          status: 'wfh_active',
          notes: `Remote work approved by ${approverUser.name}. HR record updated.`,
          verificationMethod: 'wfh_approval',
          createdAt: new Date(),
        });
      }

      await this.logAudit({
        userId: approverUser.id,
        action: 'APPROVE_REMOTE_WORK',
        entityType: 'remote_work_request',
        entityId: requestId,
        details: `Approved remote work for employee ${found.employeeId} by ${approverUser.name}. Visible to HR.`,
      });
    }

    return found;
  }

  static async rejectRemoteWorkRequest(requestId: string, rejectorUser: { id: string; name: string; role: string }, reason?: string) {
    const isDb = await checkDatabaseConnection();
    if (isDb) {
      const updated = await prisma.remoteWorkRequest.update({
        where: { id: requestId },
        data: {
          status: RequestStatus.rejected,
          rejectionReason: reason || 'Not approved by management',
        },
      });

      await this.logAudit({
        userId: rejectorUser.id,
        action: 'REJECT_REMOTE_WORK',
        entityType: 'remote_work_request',
        entityId: requestId,
        details: `Remote work rejected by ${rejectorUser.name}. Reason: ${reason || 'None provided'}`,
      });

      return updated;
    }

    // Fallback
    const found = memoryStore.remoteRequests.find((r) => r.id === requestId);
    if (found) {
      found.status = 'rejected';
      found.rejectionReason = reason;
      await this.logAudit({
        userId: rejectorUser.id,
        action: 'REJECT_REMOTE_WORK',
        entityType: 'remote_work_request',
        entityId: requestId,
        details: `Remote work rejected by ${rejectorUser.name}.`,
      });
    }
    return found;
  }

  // 7. Leave Requests Operations
  static async getLeaveRequests(user: { id: string; role: string; employeeId?: string }) {
    const isDb = await checkDatabaseConnection();
    if (isDb) {
      if (user.role === 'hr' || user.role === 'admin') {
        return prisma.leaveRequest.findMany({
          include: { employee: { include: { user: true } } },
          orderBy: { createdAt: 'desc' },
        });
      }
      return prisma.leaveRequest.findMany({
        where: { employeeId: user.employeeId },
        include: { employee: { include: { user: true } } },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (user.role === 'hr' || user.role === 'admin' || user.role === 'manager') {
      return memoryStore.leaveRequests;
    }
    return memoryStore.leaveRequests.filter((l) => l.employeeId === user.employeeId);
  }

  static async createLeaveRequest(data: {
    employeeId: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    reason: string;
  }) {
    const isDb = await checkDatabaseConnection();
    if (isDb) {
      return prisma.leaveRequest.create({
        data: {
          employeeId: data.employeeId,
          leaveType: data.leaveType,
          startDate: data.startDate,
          endDate: data.endDate,
          reason: data.reason,
          status: RequestStatus.pending_manager,
        },
        include: { employee: { include: { user: true } } },
      });
    }

    // Fallback
    const newReq = {
      id: `leave-${Date.now()}`,
      employeeId: data.employeeId,
      leaveType: data.leaveType,
      startDate: data.startDate,
      endDate: data.endDate,
      reason: data.reason,
      status: 'pending_manager',
      createdAt: new Date(),
    };
    memoryStore.leaveRequests.unshift(newReq);
    return newReq;
  }

  static async approveLeaveRequest(requestId: string, approverUser: { id: string; name: string; role: string }) {
    const isDb = await checkDatabaseConnection();
    const now = new Date();

    if (isDb) {
      const updated = await prisma.leaveRequest.update({
        where: { id: requestId },
        data: {
          status: RequestStatus.approved,
          approvedBy: approverUser.name,
          approvedAt: now,
        },
      });

      await this.logAudit({
        userId: approverUser.id,
        action: 'APPROVE_LEAVE',
        entityType: 'leave_request',
        entityId: requestId,
        details: `Leave approved by ${approverUser.name}`,
      });

      return updated;
    }

    const found = memoryStore.leaveRequests.find((l) => l.id === requestId);
    if (found) {
      found.status = 'approved';
      found.approvedBy = approverUser.name;
      found.approvedAt = now;
      await this.logAudit({
        userId: approverUser.id,
        action: 'APPROVE_LEAVE',
        entityType: 'leave_request',
        entityId: requestId,
        details: `Leave approved by ${approverUser.name}`,
      });
    }
    return found;
  }

  static async rejectLeaveRequest(requestId: string, rejectorUser: { id: string; name: string; role: string }, reason?: string) {
    const isDb = await checkDatabaseConnection();
    if (isDb) {
      const updated = await prisma.leaveRequest.update({
        where: { id: requestId },
        data: {
          status: RequestStatus.rejected,
          rejectionReason: reason,
        },
      });

      await this.logAudit({
        userId: rejectorUser.id,
        action: 'REJECT_LEAVE',
        entityType: 'leave_request',
        entityId: requestId,
        details: `Leave rejected by ${rejectorUser.name}. Reason: ${reason || 'Not specified'}`,
      });

      return updated;
    }

    const found = memoryStore.leaveRequests.find((l) => l.id === requestId);
    if (found) {
      found.status = 'rejected';
      found.rejectionReason = reason;
      await this.logAudit({
        userId: rejectorUser.id,
        action: 'REJECT_LEAVE',
        entityType: 'leave_request',
        entityId: requestId,
        details: `Leave rejected by ${rejectorUser.name}.`,
      });
    }
    return found;
  }

  // 8. Audit Logging
  static async logAudit(entry: {
    userId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    details?: string;
    ipAddress?: string;
  }) {
    try {
      const isDb = await checkDatabaseConnection();
      if (isDb) {
        await prisma.auditLog.create({
          data: {
            userId: entry.userId,
            action: entry.action,
            entityType: entry.entityType,
            entityId: entry.entityId,
            details: entry.details,
            ipAddress: entry.ipAddress || '127.0.0.1',
          },
        });
        return;
      }

      memoryStore.auditLogs.unshift({
        id: `log-${Date.now()}`,
        ...entry,
        createdAt: new Date(),
      });
    } catch (e) {
      console.warn('Audit logging non-blocking warning:', e);
    }
  }

  // 9. Dashboard Statistics
  static async getDashboard(user: { id: string; role: string; employeeId?: string }) {
    const employees = await this.getAllEmployees();
    const today = new Date().toISOString().split('T')[0];
    const attendanceToday = await this.getAttendanceRecords({ date: today });
    const remoteRequests = await this.getRemoteWorkRequests(user);
    const leaveRequests = await this.getLeaveRequests(user);

    const totalEmployees = employees.length;
    const inOffice = employees.filter((e) => e.todayStatus === 'present').length;
    const wfh = employees.filter((e) => e.todayStatus === 'wfh_active').length;
    const onLeave = employees.filter((e) => e.todayStatus === 'on_leave').length;

    const pendingRemote = remoteRequests.filter((r) => r.status.startsWith('pending')).length;
    const pendingLeave = leaveRequests.filter((l) => l.status.startsWith('pending')).length;

    return {
      stats: {
        totalEmployees,
        inOffice,
        wfh,
        onLeave,
        attendanceRate: totalEmployees > 0 ? Math.round(((inOffice + wfh) / totalEmployees) * 100) : 100,
        pendingApprovals: pendingRemote + pendingLeave,
      },
      auditSummary: memoryStore.auditLogs.slice(0, 10),
      todayDate: today,
    };
  }
}
