import { PrismaClient, UserRole, RequestStatus, AttendanceStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function seedDatabase() {
  console.log('🌱 Starting Database Seed...');

  // 1. Clean existing records in correct relation order
  await prisma.auditLog.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.remoteWorkRequest.deleteMany();
  await prisma.employeeManager.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();
  await prisma.role.deleteMany();

  // 2. Roles
  console.log('Creating standard system roles...');
  const roles = await Promise.all([
    prisma.role.create({
      data: {
        code: 'employee',
        name: 'Employee',
        nameAr: 'موظف',
        description: 'Standard employee with self-service request and attendance tracking',
        permissions: ['read:own_profile', 'create:leave_request', 'create:remote_work', 'create:attendance'],
      },
    }),
    prisma.role.create({
      data: {
        code: 'manager',
        name: 'Manager',
        nameAr: 'مدير مباشر',
        description: 'Direct team lead with approval and coverage oversight powers',
        permissions: ['read:team', 'approve:remote_work', 'approve:leave_request', 'read:team_attendance'],
      },
    }),
    prisma.role.create({
      data: {
        code: 'hr',
        name: 'HR Admin',
        nameAr: 'شؤون الموظفين',
        description: 'Human Resources administration, global audits, compliance and leave records',
        permissions: ['read:all_employees', 'manage:leaves', 'manage:remote_work', 'manage:attendance', 'read:reports'],
      },
    }),
    prisma.role.create({
      data: {
        code: 'admin',
        name: 'System Admin',
        nameAr: 'مسؤول النظام',
        description: 'Super user with system-wide configuration, access control and audit privileges',
        permissions: ['*'],
      },
    }),
  ]);

  // 3. Departments
  console.log('Creating departments...');
  const deptEng = await prisma.department.create({
    data: {
      code: 'ENG',
      name: 'Engineering & Technology',
      nameAr: 'الهندسة والبرمجيات',
      description: 'Software development, infrastructure, quality and systems engineering',
    },
  });

  const deptHR = await prisma.department.create({
    data: {
      code: 'HR',
      name: 'Human Resources',
      nameAr: 'الموارد البشرية والشؤون الإدارية',
      description: 'People operations, compliance, recruitment and talent management',
    },
  });

  const deptProduct = await prisma.department.create({
    data: {
      code: 'PROD',
      name: 'Product & Design',
      nameAr: 'إدارة المنتج والتصميم',
      description: 'UI/UX design, product strategy and customer experience',
    },
  });

  const deptFinance = await prisma.department.create({
    data: {
      code: 'FIN',
      name: 'Finance & Operations',
      nameAr: 'المالية والعمليات',
      description: 'Financial planning, accounting and office operations',
    },
  });

  // 4. Default Passwords (hashed securely using bcrypt)
  const salt = await bcrypt.genSalt(10);
  const passwordAdmin = await bcrypt.hash('Admin@123', salt);
  const passwordHR = await bcrypt.hash('Reem@123', salt);
  const passwordManager = await bcrypt.hash('Tariq@123', salt);
  const passwordEmployee = await bcrypt.hash('Sara@123', salt);
  const passwordGeneral = await bcrypt.hash('User@123', salt);

  console.log('Creating users and employee profiles...');

  // User 1: Admin
  const userAdmin = await prisma.user.create({
    data: {
      employeeId: 'ADM-001',
      name: 'عبدالله السديري',
      nameEn: 'Abdullah Al-Sudairy',
      email: 'admin@dawamy.app',
      passwordHash: passwordAdmin,
      role: UserRole.admin,
      department: 'Management',
      employee: {
        create: {
          jobTitle: 'مسؤول النظام والتحول الرقمي',
          jobTitleEn: 'Chief Information & Systems Administrator',
          departmentId: deptEng.id,
          phone: '+966 50 111 0001',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          joinDate: '2022-01-10',
          annualLeaveBalance: 30,
          wfhBalancePerWeek: 3,
          todayStatus: AttendanceStatus.present,
          lastCheckIn: '08:00 AM',
          location: 'HQ - Riyadh (Executive Office)',
        },
      },
    },
    include: { employee: true },
  });

  // User 2: Manager (Tariq Al-Khalidi)
  const userManager = await prisma.user.create({
    data: {
      employeeId: 'MGR-101',
      name: 'طارق الخالدي',
      nameEn: 'Tariq Al-Khalidi',
      email: 'tariq.manager@dawamy.app',
      passwordHash: passwordManager,
      role: UserRole.manager,
      department: 'Engineering',
      employee: {
        create: {
          jobTitle: 'مدير الفريق الهندسي',
          jobTitleEn: 'Engineering Lead & Direct Manager',
          departmentId: deptEng.id,
          phone: '+966 55 222 3333',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
          joinDate: '2022-06-15',
          annualLeaveBalance: 25,
          wfhBalancePerWeek: 2,
          todayStatus: AttendanceStatus.present,
          lastCheckIn: '08:45 AM',
          location: 'HQ - Floor 4 (Tech Hub)',
        },
      },
    },
    include: { employee: true },
  });

  // User 3: HR Admin (Reem Al-Otaibi)
  const userHR = await prisma.user.create({
    data: {
      employeeId: 'HR-201',
      name: 'ريم العتيبي',
      nameEn: 'Reem Al-Otaibi',
      email: 'reem.hr@dawamy.app',
      passwordHash: passwordHR,
      role: UserRole.hr,
      department: 'Human Resources',
      employee: {
        create: {
          jobTitle: 'أخصائية شؤون الموظفين والامتثال',
          jobTitleEn: 'Senior People & Compliance Specialist',
          departmentId: deptHR.id,
          phone: '+966 54 333 4444',
          avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
          joinDate: '2023-02-01',
          annualLeaveBalance: 24,
          wfhBalancePerWeek: 2,
          todayStatus: AttendanceStatus.present,
          lastCheckIn: '09:00 AM',
          location: 'HQ - Floor 2 (People & Culture)',
        },
      },
    },
    include: { employee: true },
  });

  // User 4: Employee (Sara Mansoor)
  const userEmployee = await prisma.user.create({
    data: {
      employeeId: 'EMP-301',
      name: 'سارة المنصور',
      nameEn: 'Sara Mansoor',
      email: 'sara.mansoor@dawamy.app',
      passwordHash: passwordEmployee,
      role: UserRole.employee,
      department: 'Engineering',
      employee: {
        create: {
          jobTitle: 'مهندسة برمجيات أولى (Frontend & Cloud)',
          jobTitleEn: 'Senior Frontend & Cloud Engineer',
          departmentId: deptEng.id,
          phone: '+966 56 444 5555',
          avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
          joinDate: '2023-08-10',
          annualLeaveBalance: 21,
          wfhBalancePerWeek: 2,
          todayStatus: AttendanceStatus.wfh_active,
          lastCheckIn: '09:15 AM (WFH Verified)',
          location: 'Home Office (Riyadh, Al-Malqa)',
        },
      },
    },
    include: { employee: true },
  });

  // User 5: Employee (Ziyad Al-Ghamdi)
  const userZiyad = await prisma.user.create({
    data: {
      employeeId: 'EMP-302',
      name: 'زياد الغامدي',
      nameEn: 'Ziyad Al-Ghamdi',
      email: 'ziyad.dev@dawamy.app',
      passwordHash: passwordGeneral,
      role: UserRole.employee,
      department: 'Engineering',
      employee: {
        create: {
          jobTitle: 'مطور واجهات ومكتبات برمجية',
          jobTitleEn: 'Frontend & UI Systems Engineer',
          departmentId: deptEng.id,
          phone: '+966 50 555 6666',
          avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
          joinDate: '2024-01-15',
          annualLeaveBalance: 18,
          wfhBalancePerWeek: 2,
          todayStatus: AttendanceStatus.present,
          lastCheckIn: '09:05 AM',
          location: 'HQ - Floor 4 (Tech Hub)',
        },
      },
    },
    include: { employee: true },
  });

  // 5. Employee - Manager Relationships (Reporting Line)
  console.log('Setting direct reporting hierarchy...');
  if (userEmployee.employee && userManager.employee) {
    await prisma.employeeManager.create({
      data: {
        employeeId: userEmployee.employee.id,
        managerId: userManager.employee.id,
      },
    });
  }

  if (userZiyad.employee && userManager.employee) {
    await prisma.employeeManager.create({
      data: {
        employeeId: userZiyad.employee.id,
        managerId: userManager.employee.id,
      },
    });
  }

  // 6. Attendance Seeding for Today
  console.log('Seeding initial attendance records...');
  const today = new Date().toISOString().split('T')[0];

  if (userEmployee.employee) {
    await prisma.attendance.create({
      data: {
        employeeId: userEmployee.employee.id,
        date: today,
        checkIn: '09:15 AM',
        status: AttendanceStatus.wfh_active,
        notes: 'Virtual WFH check-in verified via Dawamy system. Approved by Tariq Al-Khalidi.',
        verificationMethod: 'web',
      },
    });
  }

  if (userManager.employee) {
    await prisma.attendance.create({
      data: {
        employeeId: userManager.employee.id,
        date: today,
        checkIn: '08:45 AM',
        status: AttendanceStatus.present,
        notes: 'Office biometric punch card verified',
        verificationMethod: 'biometric',
      },
    });
  }

  // 7. Seed Remote Work & Leave Requests
  console.log('Seeding initial requests with business workflow...');
  if (userEmployee.employee && userManager.employee) {
    // Approved Remote Work Request (Approved by Manager -> visible to HR)
    await prisma.remoteWorkRequest.create({
      data: {
        employeeId: userEmployee.employee.id,
        date: today,
        reason: 'التركيز على إنجاز هيكلية الحاويات وتكامل قاعدة بيانات PostgreSQL المستقلة لمنظومة دوامي',
        tasksPlan: '1. بناء وتدقيق Prisma Schema\n2. ربط الـ Docker Compose والصلاحيات\n3. مراجعة اختبارات الأمان',
        status: RequestStatus.approved,
        managerId: userManager.employee.id,
        approvedAt: new Date(),
      },
    });

    // Pending Annual Leave Request
    await prisma.leaveRequest.create({
      data: {
        employeeId: userEmployee.employee.id,
        leaveType: 'annual_leave',
        startDate: '2026-09-15',
        endDate: '2026-09-18',
        reason: 'إجازة سنوية مجدولة للراحة وتجديد النشاط مع تسليم المهام للمهندس زياد الغامدي',
        status: RequestStatus.pending_manager,
      },
    });
  }

  // 8. Audit Log
  await prisma.auditLog.create({
    data: {
      userId: userAdmin.id,
      action: 'SYSTEM_BOOTSTRAP',
      entityType: 'system',
      entityId: 'root',
      details: 'Initial database bootstrap, role configurations and employee migration completed successfully.',
      ipAddress: '127.0.0.1',
    },
  });

  console.log('✅ Database Seeding Completed Successfully!');
}

// Auto-run if executed directly via tsx
if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  seedDatabase()
    .catch((e) => {
      console.error('❌ Error during seeding:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
