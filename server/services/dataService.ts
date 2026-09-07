import bcrypt from 'bcryptjs';
import { prisma, checkDatabaseConnection } from '../db';
import { UserRole, RequestStatus, AttendanceStatus } from '@prisma/client';

/**
 * Production Safety Rule:
 * In production mode (NODE_ENV=production), operating on the in-memory fallback store
 * is strictly forbidden to prevent silent data loss of employee, attendance, leave, or audit records.
 * PRODUCTION + DATABASE UNAVAILABLE = FAIL CLOSED.
 */
function assertNotProductionFallback(operationName: string): void {
  if (process.env.NODE_ENV === 'production') {
    const errorMsg = `[Production Safety Rule - FAIL CLOSED] Cannot execute '${operationName}' in production mode because the PostgreSQL database is unavailable. In-memory fallback is disabled in production to protect data integrity.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
}

// Initial in-memory fallback store for preview/dev when DB container is not spun up
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
  employeeManagers: Array<{
    id: string;
    employeeId: string;
    managerId: string;
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

// Pre-hashed passwords for instant fallback in preview
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
  employeeManagers: [
    {
      id: 'em-1',
      employeeId: 'emp-sara-1',
      managerId: 'emp-mgr-1',
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
  // Helper: check direct managerial relationship from Database / memory
  static async isManagerOf(managerEmployeeId: string, subordinateEmployeeId: string): Promise<boolean> {
    if (!managerEmployeeId || !subordinateEmployeeId) return false;
    if (managerEmployeeId === subordinateEmployeeId) return false; // Self-management forbidden

    const isDb = await checkDatabaseConnection();
    if (isDb) {
      const relation = await prisma.employeeManager.findUnique({
        where: {
          employeeId_managerId: {
            employeeId: subordinateEmployeeId,
            managerId: managerEmployeeId,
          },
        },
      });
      return !!relation;
    }

    assertNotProductionFallback('isManagerOf');
    return memoryStore.employeeManagers.some(
      (em) => em.managerId === managerEmployeeId && em.employeeId === subordinateEmployeeId
    );
  }

  // Helper: get list of all employee IDs who report directly to this manager
  static async getSubordinateEmployeeIds(managerEmployeeId: string): Promise<string[]> {
    if (!managerEmployeeId) return [];

    const isDb = await checkDatabaseConnection();
    if (isDb) {
      const relations = await prisma.employeeManager.findMany({
        where: { managerId: managerEmployeeId },
        select: { employeeId: true },
      });
      return relations.map((r) => r.employeeId);
    }

    assertNotProductionFallback('getSubordinateEmployeeIds');
    return memoryStore.employeeManagers
      .filter((em) => em.managerId === managerEmployeeId)
      .map((em) => em.employeeId);
  }

  // Helper: get direct manager ID for an employee
  static async getDirectManagerId(employeeId: string): Promise<string | null> {
    if (!employeeId) return null;

    const isDb = await checkDatabaseConnection();
    if (isDb) {
      const relation = await prisma.employeeManager.findFirst({
        where: { employeeId },
        select: { managerId: true },
      });
      return relation?.managerId || null;
    }

    assertNotProductionFallback('getDirectManagerId');
    const found = memoryStore.employeeManagers.find((em) => em.employeeId === employeeId);
    return found?.managerId || null;
  }

  // 1. Authenticate user
  static async login(email: string, passwordPlain: string, ipAddress?: string) {
    const cleanEmail = (email || '').toLowerCase().trim();
    const isDb = await checkDatabaseConnection();

    let user: any = null;
    let employeeData: any = null;

    if (isDb) {
      user = await prisma.user.findUnique({
        where: { email: cleanEmail },
        include: { employee: true },
      });
      if (user) {
        employeeData = user.employee;
      }
    } else {
      assertNotProductionFallback('login');
      const found = memoryStore.users.find((u) => u.email.toLowerCase().trim() === cleanEmail);
      if (found) {
        user = found;
        employeeData = found.employee;
      }
    }

    if (!user || !user.isActive) {
      await this.logAudit({
        action: 'FAILED_LOGIN',
        entityType: 'user',
        entityId: cleanEmail,
        details: `Failed login attempt for email: ${cleanEmail}. Reason: User not found or inactive.`,
        ipAddress,
      });
      return { success: false, error: 'User not found or account is inactive.' };
    }

    // Verify bcrypt hash
    const isValid = await bcrypt.compare(passwordPlain, user.passwordHash);
    if (!isValid) {
      await this.logAudit({
        userId: user.id,
        action: 'FAILED_LOGIN',
        entityType: 'user',
        entityId: user.id,
        details: `Failed login attempt for user: ${user.name} (${user.email}). Reason: Invalid password.`,
        ipAddress,
      });
      return { success: false, error: 'Invalid password. Please check your credentials.' };
    }

    // Log successful login audit
    await this.logAudit({
      userId: user.id,
      action: 'LOGIN',
      entityType: 'user',
      entityId: user.id,
      details: `User logged in successfully from ${ipAddress || 'unknown'}`,
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

    assertNotProductionFallback('getUserById');
    return memoryStore.users.find((u) => u.id === userId) || null;
  }

  // 3. Get Employee by ID (with safe mapping)
  static async getEmployeeById(employeeId: string) {
    const isDb = await checkDatabaseConnection();
    if (isDb) {
      const emp = await prisma.employee.findUnique({
        where: { id: employeeId },
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
      if (!emp) return null;
      return {
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
      };
    }

    assertNotProductionFallback('getEmployeeById');
    const user = memoryStore.users.find((u) => u.employee.id === employeeId);
    if (!user) return null;
    return {
      id: user.employee.id,
      userId: user.id,
      employeeId: user.employeeId,
      name: user.name,
      nameEn: user.nameEn,
      email: user.email,
      role: user.role,
      department: user.department,
      jobTitle: user.employee.jobTitle,
      jobTitleEn: user.employee.jobTitleEn,
      phone: user.employee.phone,
      avatar: user.employee.avatar,
      joinDate: user.employee.joinDate,
      annualLeaveBalance: user.employee.annualLeaveBalance,
      wfhBalancePerWeek: user.employee.wfhBalancePerWeek,
      todayStatus: user.employee.todayStatus,
      lastCheckIn: user.employee.lastCheckIn,
      lastCheckOut: user.employee.lastCheckOut,
      location: user.employee.location,
    };
  }

  // 4. Get Scoped Employees (Enforces RBAC and IDOR prevention)
  static async getEmployeesScoped(user: { id: string; role: string; employeeId?: string }) {
    const isDb = await checkDatabaseConnection();

    if (user.role === 'admin' || user.role === 'hr') {
      return this.getAllEmployees();
    }

    if (user.role === 'manager' && user.employeeId) {
      const subordinateIds = await this.getSubordinateEmployeeIds(user.employeeId);
      const allowedIds = [user.employeeId, ...subordinateIds];

      if (isDb) {
        const emps = await prisma.employee.findMany({
          where: { id: { in: allowedIds } },
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
          },
        });
        return emps.map((emp) => ({
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

      assertNotProductionFallback('getEmployeesScoped (manager)');
      return memoryStore.users
        .filter((u) => allowedIds.includes(u.employee.id))
        .map((u) => ({
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

    // Standard employee only sees themselves
    if (user.employeeId) {
      const self = await this.getEmployeeById(user.employeeId);
      return self ? [self] : [];
    }

    return [];
  }

  // 5. Get All Employees (Admin & HR)
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

    assertNotProductionFallback('getAllEmployees');
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

  // 6. Create Employee (Admin & HR)
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
    managerId?: string;
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

      if (data.managerId && newUser.employee) {
        await prisma.employeeManager.create({
          data: {
            employeeId: newUser.employee.id,
            managerId: data.managerId,
          },
        });
      }

      return newUser;
    }

    assertNotProductionFallback('createEmployee');
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

    if (data.managerId) {
      memoryStore.employeeManagers.push({
        id: `em-${Date.now()}`,
        employeeId: newEmpId,
        managerId: data.managerId,
      });
    }

    return newRecord;
  }

  // 7. Update Employee Profile (Protected by RBAC)
  static async updateEmployee(
    employeeId: string,
    updateData: any,
    updaterUser: { id: string; role: string; employeeId?: string }
  ) {
    const isDb = await checkDatabaseConnection();
    const existing = await this.getEmployeeById(employeeId);
    if (!existing) {
      throw new Error('Employee not found');
    }

    // Role-based field restrictions:
    // Regular employees can ONLY update phone or avatar
    if (updaterUser.role === 'employee') {
      if (updaterUser.employeeId !== employeeId) {
        throw new Error('Forbidden: You cannot modify other employees.');
      }
      const safeData: any = {};
      if (updateData.phone !== undefined) safeData.phone = updateData.phone;
      if (updateData.avatar !== undefined) safeData.avatar = updateData.avatar;

      if (isDb) {
        return prisma.employee.update({
          where: { id: employeeId },
          data: safeData,
        });
      }

      assertNotProductionFallback('updateEmployee (employee self-update)');
      const user = memoryStore.users.find((u) => u.employee.id === employeeId);
      if (user) {
        if (safeData.phone) user.employee.phone = safeData.phone;
        if (safeData.avatar) user.employee.avatar = safeData.avatar;
      }
      return user?.employee;
    }

    // Managers can update subordinates' notes/phone, but cannot change role or leave balance
    if (updaterUser.role === 'manager') {
      const isSubordinate = await this.isManagerOf(updaterUser.employeeId!, employeeId);
      if (!isSubordinate && updaterUser.employeeId !== employeeId) {
        throw new Error('Forbidden: You can only edit your own or direct subordinates profiles.');
      }
      const managerSafeData: any = {};
      if (updateData.phone !== undefined) managerSafeData.phone = updateData.phone;
      if (updateData.avatar !== undefined) managerSafeData.avatar = updateData.avatar;
      if (updateData.location !== undefined) managerSafeData.location = updateData.location;

      if (isDb) {
        return prisma.employee.update({
          where: { id: employeeId },
          data: managerSafeData,
        });
      }

      assertNotProductionFallback('updateEmployee (manager team update)');
      const user = memoryStore.users.find((u) => u.employee.id === employeeId);
      if (user) {
        Object.assign(user.employee, managerSafeData);
      }
      return user?.employee;
    }

    // HR & Admin have full update rights
    if (isDb) {
      const dataToUpdate: any = {};
      if (updateData.jobTitle !== undefined) dataToUpdate.jobTitle = updateData.jobTitle;
      if (updateData.jobTitleEn !== undefined) dataToUpdate.jobTitleEn = updateData.jobTitleEn;
      if (updateData.phone !== undefined) dataToUpdate.phone = updateData.phone;
      if (updateData.annualLeaveBalance !== undefined) dataToUpdate.annualLeaveBalance = Number(updateData.annualLeaveBalance);
      if (updateData.wfhBalancePerWeek !== undefined) dataToUpdate.wfhBalancePerWeek = Number(updateData.wfhBalancePerWeek);
      if (updateData.location !== undefined) dataToUpdate.location = updateData.location;
      if (updateData.todayStatus !== undefined) dataToUpdate.todayStatus = updateData.todayStatus;

      return prisma.employee.update({
        where: { id: employeeId },
        data: dataToUpdate,
      });
    }

    assertNotProductionFallback('updateEmployee (admin/hr update)');
    const user = memoryStore.users.find((u) => u.employee.id === employeeId);
    if (user) {
      Object.assign(user.employee, updateData);
    }
    return user?.employee;
  }

  // 8. Attendance Operations
  static async checkIn(employeeId: string, method: string = 'web', notes?: string) {
    const isDb = await checkDatabaseConnection();
    const date = new Date().toISOString().split('T')[0];
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    if (isDb) {
      // Check existing attendance for today
      const existing = await prisma.attendance.findUnique({
        where: {
          employeeId_date: {
            employeeId,
            date,
          },
        },
      });

      if (existing) {
        if (existing.checkIn && !existing.checkOut) {
          throw new Error(`You have already checked in for today at ${existing.checkIn}.`);
        }
        if (existing.checkIn && existing.checkOut) {
          throw new Error(`Attendance completed: You have already checked in at ${existing.checkIn} and checked out at ${existing.checkOut} for today.`);
        }
      }

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
          notes: notes || 'Daily check-in',
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

      await prisma.employee.update({
        where: { id: employeeId },
        data: {
          lastCheckIn: time,
          todayStatus: AttendanceStatus.present,
        },
      });

      return record;
    }

    assertNotProductionFallback('checkIn');
    // Fallback in-memory
    const existing = memoryStore.attendance.find((a) => a.employeeId === employeeId && a.date === date);
    if (existing) {
      if (existing.checkIn && !existing.checkOut) {
        throw new Error(`You have already checked in for today at ${existing.checkIn}.`);
      }
      if (existing.checkIn && existing.checkOut) {
        throw new Error(`Attendance completed: You have already checked in at ${existing.checkIn} and checked out at ${existing.checkOut} for today.`);
      }
      existing.checkIn = time;
      existing.notes = notes || 'Daily check-in';
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
      const existing = await prisma.attendance.findUnique({
        where: {
          employeeId_date: {
            employeeId,
            date,
          },
        },
      });

      if (!existing || !existing.checkIn) {
        throw new Error('Cannot check out before checking in for today.');
      }

      if (existing.checkOut) {
        throw new Error(`You have already checked out for today at ${existing.checkOut}.`);
      }

      const updated = await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          checkOut: time,
          notes: notes ? (existing.notes ? `${existing.notes} | ${notes}` : notes) : existing.notes,
        },
      });

      await prisma.employee.update({
        where: { id: employeeId },
        data: { lastCheckOut: time },
      });

      return updated;
    }

    assertNotProductionFallback('checkOut');
    // Fallback
    const existing = memoryStore.attendance.find((a) => a.employeeId === employeeId && a.date === date);
    if (!existing || !existing.checkIn) {
      throw new Error('Cannot check out before checking in for today.');
    }
    if (existing.checkOut) {
      throw new Error(`You have already checked out for today at ${existing.checkOut}.`);
    }

    existing.checkOut = time;
    if (notes) existing.notes = (existing.notes ? existing.notes + ' | ' : '') + notes;

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

    assertNotProductionFallback('getAttendanceRecords');
    return memoryStore.attendance.filter((a) => {
      if (filter?.employeeId && a.employeeId !== filter.employeeId) return false;
      if (filter?.date && a.date !== filter.date) return false;
      return true;
    });
  }

  // 9. Remote Work Requests (The Workflow: Employee -> Direct Manager -> HR Visibility -> Attendance)
  static async getRemoteWorkRequests(user: { id: string; role: string; employeeId?: string }) {
    const isDb = await checkDatabaseConnection();
    if (isDb) {
      // HR and Admin have full company visibility
      if (user.role === 'hr' || user.role === 'admin') {
        return prisma.remoteWorkRequest.findMany({
          include: {
            employee: { include: { user: true } },
          },
          orderBy: { createdAt: 'desc' },
        });
      }

      // Manager sees their own + direct reports' requests
      if (user.role === 'manager' && user.employeeId) {
        const subordinateIds = await this.getSubordinateEmployeeIds(user.employeeId);
        return prisma.remoteWorkRequest.findMany({
          where: {
            OR: [
              { managerId: user.employeeId },
              { employeeId: user.employeeId },
              { employeeId: { in: subordinateIds } },
            ],
          },
          include: {
            employee: { include: { user: true } },
          },
          orderBy: { createdAt: 'desc' },
        });
      }

      // Standard employee sees strictly their own requests
      return prisma.remoteWorkRequest.findMany({
        where: { employeeId: user.employeeId },
        include: {
          employee: { include: { user: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    assertNotProductionFallback('getRemoteWorkRequests');
    // Fallback store
    if (user.role === 'hr' || user.role === 'admin') {
      return memoryStore.remoteRequests;
    }
    if (user.role === 'manager' && user.employeeId) {
      const subordinateIds = await this.getSubordinateEmployeeIds(user.employeeId);
      return memoryStore.remoteRequests.filter(
        (r) =>
          r.managerId === user.employeeId ||
          r.employeeId === user.employeeId ||
          subordinateIds.includes(r.employeeId)
      );
    }
    return memoryStore.remoteRequests.filter((r) => r.employeeId === user.employeeId);
  }

  static async createRemoteWorkRequest(data: {
    employeeId: string;
    date: string;
    reason: string;
    tasksPlan?: string;
  }) {
    // 1. Date format validation (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
      throw new Error('Invalid date format. Expected YYYY-MM-DD.');
    }

    const targetDate = new Date(data.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (targetDate < today) {
      throw new Error('Remote work cannot be requested for past dates.');
    }

    const isDb = await checkDatabaseConnection();

    // 2. Prevent duplicate request for the same date
    if (isDb) {
      const existing = await prisma.remoteWorkRequest.findFirst({
        where: {
          employeeId: data.employeeId,
          date: data.date,
          status: { in: [RequestStatus.pending_manager, RequestStatus.pending_hr, RequestStatus.approved] },
        },
      });
      if (existing) {
        throw new Error(`You already have an active remote work request for date ${data.date}.`);
      }
    } else {
      assertNotProductionFallback('createRemoteWorkRequest (duplicate check)');
      const existing = memoryStore.remoteRequests.find(
        (r) =>
          r.employeeId === data.employeeId &&
          r.date === data.date &&
          (r.status.startsWith('pending') || r.status === 'approved')
      );
      if (existing) {
        throw new Error(`You already have an active remote work request for date ${data.date}.`);
      }
    }

    // 3. Weekly remote work balance validation
    const employee = await this.getEmployeeById(data.employeeId);
    if (!employee) throw new Error('Employee record not found.');

    const maxWeekly = employee.wfhBalancePerWeek || 2;
    // Calculate week start (Sunday) and week end (Saturday)
    const dayOfWeek = targetDate.getDay(); // 0 is Sunday
    const weekStart = new Date(targetDate);
    weekStart.setDate(targetDate.getDate() - dayOfWeek);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    let countThisWeek = 0;
    if (isDb) {
      countThisWeek = await prisma.remoteWorkRequest.count({
        where: {
          employeeId: data.employeeId,
          date: { gte: weekStartStr, lte: weekEndStr },
          status: { in: [RequestStatus.pending_manager, RequestStatus.pending_hr, RequestStatus.approved] },
        },
      });
    } else {
      assertNotProductionFallback('createRemoteWorkRequest (weekly count)');
      countThisWeek = memoryStore.remoteRequests.filter(
        (r) =>
          r.employeeId === data.employeeId &&
          r.date >= weekStartStr &&
          r.date <= weekEndStr &&
          (r.status.startsWith('pending') || r.status === 'approved')
      ).length;
    }

    if (countThisWeek >= maxWeekly) {
      throw new Error(`Weekly remote work allowance exceeded. Maximum allowed: ${maxWeekly} days per week.`);
    }

    // 4. Automatically resolve direct manager from DB
    const directManagerId = await this.getDirectManagerId(data.employeeId);

    if (isDb) {
      const req = await prisma.remoteWorkRequest.create({
        data: {
          employeeId: data.employeeId,
          date: data.date,
          reason: data.reason,
          tasksPlan: data.tasksPlan,
          managerId: directManagerId || undefined,
          status: RequestStatus.pending_manager,
        },
        include: { employee: { include: { user: true } } },
      });
      return req;
    }

    assertNotProductionFallback('createRemoteWorkRequest (insert)');
    // Fallback
    const newReq = {
      id: `remote-${Date.now()}`,
      employeeId: data.employeeId,
      date: data.date,
      reason: data.reason,
      tasksPlan: data.tasksPlan,
      managerId: directManagerId || undefined,
      status: 'pending_manager',
      createdAt: new Date(),
    };
    memoryStore.remoteRequests.unshift(newReq);
    return newReq;
  }

  static async approveRemoteWorkRequest(
    requestId: string,
    approverUser: { id: string; name: string; role: string; employeeId?: string }
  ) {
    const isDb = await checkDatabaseConnection();
    const now = new Date();

    let request: any = null;
    if (isDb) {
      request = await prisma.remoteWorkRequest.findUnique({
        where: { id: requestId },
        include: { employee: { include: { user: true } } },
      });
    } else {
      assertNotProductionFallback('approveRemoteWorkRequest (find)');
      request = memoryStore.remoteRequests.find((r) => r.id === requestId);
    }

    if (!request) {
      throw new Error('Remote work request not found.');
    }

    // Rule 1: Self-approval is strictly forbidden!
    if (request.employeeId === approverUser.employeeId) {
      throw new Error('Self-approval forbidden: You cannot approve your own remote work request.');
    }

    // Rule 2: Managers can ONLY approve their direct subordinates!
    if (approverUser.role === 'manager') {
      const isSubordinate = await this.isManagerOf(approverUser.employeeId!, request.employeeId);
      if (!isSubordinate) {
        throw new Error('Forbidden: You are only permitted to approve requests for employees who directly report to you.');
      }
    }

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

      // Update attendance status to wfh_active
      await prisma.attendance.upsert({
        where: {
          employeeId_date: {
            employeeId: updated.employeeId,
            date: updated.date,
          },
        },
        update: {
          status: AttendanceStatus.wfh_active,
          notes: `Remote work approved by ${approverUser.name} (${approverUser.role}).`,
        },
        create: {
          employeeId: updated.employeeId,
          date: updated.date,
          status: AttendanceStatus.wfh_active,
          notes: `Remote work approved by ${approverUser.name} (${approverUser.role}).`,
          verificationMethod: 'wfh_approval',
        },
      });

      const today = new Date().toISOString().split('T')[0];
      if (updated.date === today) {
        await prisma.employee.update({
          where: { id: updated.employeeId },
          data: { todayStatus: AttendanceStatus.wfh_active },
        });
      }

      await this.logAudit({
        userId: approverUser.id,
        action: 'APPROVE_REMOTE_WORK',
        entityType: 'remote_work_request',
        entityId: requestId,
        details: `Approved remote work for employee ${updated.employee.user.name} on ${updated.date} by ${approverUser.name}.`,
      });

      return updated;
    }

    assertNotProductionFallback('approveRemoteWorkRequest (update)');
    // Fallback
    request.status = 'approved';
    request.approvedAt = now;
    request.managerId = approverUser.employeeId;

    const today = new Date().toISOString().split('T')[0];
    if (request.date === today) {
      const empUser = memoryStore.users.find((u) => u.employee.id === request.employeeId);
      if (empUser) empUser.employee.todayStatus = 'wfh_active';
    }

    const existingAtt = memoryStore.attendance.find((a) => a.employeeId === request.employeeId && a.date === request.date);
    if (existingAtt) {
      existingAtt.status = 'wfh_active';
      existingAtt.notes = `Remote work approved by ${approverUser.name}.`;
    } else {
      memoryStore.attendance.push({
        id: `att-${Date.now()}`,
        employeeId: request.employeeId,
        date: request.date,
        status: 'wfh_active',
        notes: `Remote work approved by ${approverUser.name}.`,
        verificationMethod: 'wfh_approval',
        createdAt: new Date(),
      });
    }

    await this.logAudit({
      userId: approverUser.id,
      action: 'APPROVE_REMOTE_WORK',
      entityType: 'remote_work_request',
      entityId: requestId,
      details: `Approved remote work for employee ${request.employeeId} by ${approverUser.name}.`,
    });

    return request;
  }

  static async rejectRemoteWorkRequest(
    requestId: string,
    rejectorUser: { id: string; name: string; role: string; employeeId?: string },
    reason?: string
  ) {
    const isDb = await checkDatabaseConnection();

    let request: any = null;
    if (isDb) {
      request = await prisma.remoteWorkRequest.findUnique({
        where: { id: requestId },
      });
    } else {
      assertNotProductionFallback('rejectRemoteWorkRequest (find)');
      request = memoryStore.remoteRequests.find((r) => r.id === requestId);
    }

    if (!request) {
      throw new Error('Remote work request not found.');
    }

    if (request.employeeId === rejectorUser.employeeId) {
      throw new Error('Self-rejection forbidden: You cannot reject your own request.');
    }

    if (rejectorUser.role === 'manager') {
      const isSubordinate = await this.isManagerOf(rejectorUser.employeeId!, request.employeeId);
      if (!isSubordinate) {
        throw new Error('Forbidden: You can only reject requests for your direct subordinates.');
      }
    }

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
        details: `Remote work rejected by ${rejectorUser.name}. Reason: ${reason || 'None'}`,
      });

      return updated;
    }

    assertNotProductionFallback('rejectRemoteWorkRequest (update)');
    request.status = 'rejected';
    request.rejectionReason = reason || 'Not approved';

    await this.logAudit({
      userId: rejectorUser.id,
      action: 'REJECT_REMOTE_WORK',
      entityType: 'remote_work_request',
      entityId: requestId,
      details: `Remote work rejected by ${rejectorUser.name}.`,
    });

    return request;
  }

  // 10. Leave Requests Operations
  static async getLeaveRequests(user: { id: string; role: string; employeeId?: string }) {
    const isDb = await checkDatabaseConnection();
    if (isDb) {
      if (user.role === 'hr' || user.role === 'admin') {
        return prisma.leaveRequest.findMany({
          include: { employee: { include: { user: true } } },
          orderBy: { createdAt: 'desc' },
        });
      }

      if (user.role === 'manager' && user.employeeId) {
        const subordinateIds = await this.getSubordinateEmployeeIds(user.employeeId);
        return prisma.leaveRequest.findMany({
          where: {
            OR: [
              { employeeId: user.employeeId },
              { employeeId: { in: subordinateIds } },
            ],
          },
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

    assertNotProductionFallback('getLeaveRequests');
    if (user.role === 'hr' || user.role === 'admin') {
      return memoryStore.leaveRequests;
    }
    if (user.role === 'manager' && user.employeeId) {
      const subordinateIds = await this.getSubordinateEmployeeIds(user.employeeId);
      return memoryStore.leaveRequests.filter(
        (l) => l.employeeId === user.employeeId || subordinateIds.includes(l.employeeId)
      );
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
    // 1. Date format & chronological validation
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(data.endDate)) {
      throw new Error('Dates must be in YYYY-MM-DD format.');
    }

    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (end < start) {
      throw new Error('Leave end date cannot be earlier than start date.');
    }

    // Calculate requested duration in calendar days (inclusive)
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const requestedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const isDb = await checkDatabaseConnection();

    // 2. Check balance if annual leave
    const employee = await this.getEmployeeById(data.employeeId);
    if (!employee) throw new Error('Employee record not found.');

    if (data.leaveType === 'annual_leave') {
      if (requestedDays > employee.annualLeaveBalance) {
        throw new Error(
          `Insufficient annual leave balance. Requested: ${requestedDays} days, Available: ${employee.annualLeaveBalance} days.`
        );
      }
    }

    // 3. Overlap check with active leave requests
    if (isDb) {
      const overlap = await prisma.leaveRequest.findFirst({
        where: {
          employeeId: data.employeeId,
          status: { in: [RequestStatus.pending_manager, RequestStatus.pending_hr, RequestStatus.approved] },
          OR: [
            {
              startDate: { lte: data.endDate },
              endDate: { gte: data.startDate },
            },
          ],
        },
      });
      if (overlap) {
        throw new Error(`You already have a leave request overlapping with the selected dates (${overlap.startDate} to ${overlap.endDate}).`);
      }

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

    assertNotProductionFallback('createLeaveRequest');
    // Fallback store
    const overlap = memoryStore.leaveRequests.find(
      (l) =>
        l.employeeId === data.employeeId &&
        (l.status.startsWith('pending') || l.status === 'approved') &&
        l.startDate <= data.endDate &&
        l.endDate >= data.startDate
    );
    if (overlap) {
      throw new Error(`You already have a leave request overlapping with the selected dates (${overlap.startDate} to ${overlap.endDate}).`);
    }

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

  static async approveLeaveRequest(
    requestId: string,
    approverUser: { id: string; name: string; role: string; employeeId?: string }
  ) {
    const isDb = await checkDatabaseConnection();
    const now = new Date();

    let request: any = null;
    if (isDb) {
      request = await prisma.leaveRequest.findUnique({
        where: { id: requestId },
        include: { employee: true },
      });
    } else {
      assertNotProductionFallback('approveLeaveRequest (find)');
      request = memoryStore.leaveRequests.find((l) => l.id === requestId);
    }

    if (!request) {
      throw new Error('Leave request not found.');
    }

    // Self-approval check
    if (request.employeeId === approverUser.employeeId) {
      throw new Error('Self-approval forbidden: You cannot approve your own leave request.');
    }

    // Manager subordinate check
    if (approverUser.role === 'manager') {
      const isSubordinate = await this.isManagerOf(approverUser.employeeId!, request.employeeId);
      if (!isSubordinate) {
        throw new Error('Forbidden: You can only approve leave requests for your direct subordinates.');
      }
    }

    // Calculate days to deduct if annual leave
    const start = new Date(request.startDate);
    const end = new Date(request.endDate);
    const days = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (isDb) {
      const updated = await prisma.leaveRequest.update({
        where: { id: requestId },
        data: {
          status: RequestStatus.approved,
          approvedBy: approverUser.name,
          approvedAt: now,
        },
      });

      // Deduct balance
      if (request.leaveType === 'annual_leave') {
        await prisma.employee.update({
          where: { id: request.employeeId },
          data: {
            annualLeaveBalance: {
              decrement: days,
            },
          },
        });
      }

      const today = new Date().toISOString().split('T')[0];
      if (today >= request.startDate && today <= request.endDate) {
        await prisma.employee.update({
          where: { id: request.employeeId },
          data: { todayStatus: AttendanceStatus.on_leave },
        });
      }

      await this.logAudit({
        userId: approverUser.id,
        action: 'APPROVE_LEAVE',
        entityType: 'leave_request',
        entityId: requestId,
        details: `Leave approved for employee ${request.employeeId} (${days} days) by ${approverUser.name}.`,
      });

      return updated;
    }

    assertNotProductionFallback('approveLeaveRequest (update)');
    // Fallback
    request.status = 'approved';
    request.approvedBy = approverUser.name;
    request.approvedAt = now;

    if (request.leaveType === 'annual_leave') {
      const empUser = memoryStore.users.find((u) => u.employee.id === request.employeeId);
      if (empUser) {
        empUser.employee.annualLeaveBalance = Math.max(0, empUser.employee.annualLeaveBalance - days);
      }
    }

    await this.logAudit({
      userId: approverUser.id,
      action: 'APPROVE_LEAVE',
      entityType: 'leave_request',
      entityId: requestId,
      details: `Leave approved by ${approverUser.name}.`,
    });

    return request;
  }

  static async rejectLeaveRequest(
    requestId: string,
    rejectorUser: { id: string; name: string; role: string; employeeId?: string },
    reason?: string
  ) {
    const isDb = await checkDatabaseConnection();

    let request: any = null;
    if (isDb) {
      request = await prisma.leaveRequest.findUnique({
        where: { id: requestId },
      });
    } else {
      assertNotProductionFallback('rejectLeaveRequest (find)');
      request = memoryStore.leaveRequests.find((l) => l.id === requestId);
    }

    if (!request) {
      throw new Error('Leave request not found.');
    }

    if (request.employeeId === rejectorUser.employeeId) {
      throw new Error('Self-rejection forbidden: You cannot reject your own request.');
    }

    if (rejectorUser.role === 'manager') {
      const isSubordinate = await this.isManagerOf(rejectorUser.employeeId!, request.employeeId);
      if (!isSubordinate) {
        throw new Error('Forbidden: You can only reject leave requests for your direct subordinates.');
      }
    }

    if (isDb) {
      const updated = await prisma.leaveRequest.update({
        where: { id: requestId },
        data: {
          status: RequestStatus.rejected,
          rejectionReason: reason || 'Not approved',
        },
      });

      await this.logAudit({
        userId: rejectorUser.id,
        action: 'REJECT_LEAVE',
        entityType: 'leave_request',
        entityId: requestId,
        details: `Leave rejected by ${rejectorUser.name}. Reason: ${reason || 'None provided'}`,
      });

      return updated;
    }

    assertNotProductionFallback('rejectLeaveRequest (update)');
    request.status = 'rejected';
    request.rejectionReason = reason || 'Not approved';

    await this.logAudit({
      userId: rejectorUser.id,
      action: 'REJECT_LEAVE',
      entityType: 'leave_request',
      entityId: requestId,
      details: `Leave rejected by ${rejectorUser.name}.`,
    });

    return request;
  }

  // 11. Immutable Audit Logging (Protected from tampering)
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

      assertNotProductionFallback('logAudit');
      memoryStore.auditLogs.unshift({
        id: `log-${Date.now()}`,
        ...entry,
        createdAt: new Date(),
      });
    } catch (e: any) {
      if (process.env.NODE_ENV === 'production') {
        console.error('Audit logging critical error in production:', e?.message || e);
        throw e;
      }
      console.warn('Audit logging error in preview:', e?.message || e);
    }
  }

  // 12. Dashboard Statistics (Strictly Scoped by Role to prevent Info Leakage)
  static async getDashboard(user: { id: string; role: string; employeeId?: string }) {
    const today = new Date().toISOString().split('T')[0];
    const isDb = await checkDatabaseConnection();

    if (!isDb) {
      assertNotProductionFallback('getDashboard');
    }

    // 1. Role: Employee (strictly personal metrics)
    if (user.role === 'employee' && user.employeeId) {
      const self = await this.getEmployeeById(user.employeeId);
      const myLeaves = await this.getLeaveRequests(user);
      const myRemote = await this.getRemoteWorkRequests(user);

      const pendingLeaves = myLeaves.filter((l) => l.status.startsWith('pending')).length;
      const pendingRemote = myRemote.filter((r) => r.status.startsWith('pending')).length;

      return {
        stats: {
          totalEmployees: 1,
          inOffice: self?.todayStatus === 'present' ? 1 : 0,
          wfh: self?.todayStatus === 'wfh_active' ? 1 : 0,
          onLeave: self?.todayStatus === 'on_leave' ? 1 : 0,
          attendanceRate: 100,
          pendingApprovals: pendingLeaves + pendingRemote,
          personalLeaveBalance: self?.annualLeaveBalance || 0,
          personalWfhAllowance: self?.wfhBalancePerWeek || 2,
        },
        auditSummary: [], // Confidential to HR/Admin
        todayDate: today,
        roleScope: 'employee',
      };
    }

    // 2. Role: Manager (scoped to direct subordinates + self)
    if (user.role === 'manager' && user.employeeId) {
      const teamEmployees = await this.getEmployeesScoped(user);
      const teamRemote = await this.getRemoteWorkRequests(user);
      const teamLeaves = await this.getLeaveRequests(user);

      const totalEmployees = teamEmployees.length;
      const inOffice = teamEmployees.filter((e) => e.todayStatus === 'present').length;
      const wfh = teamEmployees.filter((e) => e.todayStatus === 'wfh_active').length;
      const onLeave = teamEmployees.filter((e) => e.todayStatus === 'on_leave').length;

      const pendingRemote = teamRemote.filter((r) => r.status.startsWith('pending') && r.employeeId !== user.employeeId).length;
      const pendingLeave = teamLeaves.filter((l) => l.status.startsWith('pending') && l.employeeId !== user.employeeId).length;

      return {
        stats: {
          totalEmployees,
          inOffice,
          wfh,
          onLeave,
          attendanceRate: totalEmployees > 0 ? Math.round(((inOffice + wfh) / totalEmployees) * 100) : 100,
          pendingApprovals: pendingRemote + pendingLeave,
        },
        auditSummary: [], // Confidential to HR/Admin
        todayDate: today,
        roleScope: 'manager',
      };
    }

    // 3. Role: HR & Admin (full company overview)
    const employees = await this.getAllEmployees();
    const remoteRequests = await this.getRemoteWorkRequests(user);
    const leaveRequests = await this.getLeaveRequests(user);

    const totalEmployees = employees.length;
    const inOffice = employees.filter((e) => e.todayStatus === 'present').length;
    const wfh = employees.filter((e) => e.todayStatus === 'wfh_active').length;
    const onLeave = employees.filter((e) => e.todayStatus === 'on_leave').length;

    const pendingRemote = remoteRequests.filter((r) => r.status.startsWith('pending')).length;
    const pendingLeave = leaveRequests.filter((l) => l.status.startsWith('pending')).length;

    let auditSummary: any[] = [];
    if (isDb) {
      auditSummary = await prisma.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true, email: true, role: true } } },
      });
    } else {
      assertNotProductionFallback('getDashboard (audit logs)');
      auditSummary = memoryStore.auditLogs.slice(0, 10);
    }

    return {
      stats: {
        totalEmployees,
        inOffice,
        wfh,
        onLeave,
        attendanceRate: totalEmployees > 0 ? Math.round(((inOffice + wfh) / totalEmployees) * 100) : 100,
        pendingApprovals: pendingRemote + pendingLeave,
      },
      auditSummary,
      todayDate: today,
      roleScope: user.role,
    };
  }
}
