import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  CalendarDays,
  LayoutDashboard,
  ClipboardList,
  ShieldCheck,
  Calendar,
  Sparkles,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Clock,
  ExternalLink,
  Laptop,
  Server,
  Zap,
  Users,
  Fingerprint,
  DollarSign,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  FileSpreadsheet,
  Sliders,
} from 'lucide-react';
import {
  UserProfile,
  UserRole,
  LeaveOrWfhRequest,
  RequestStatus,
  TeamMemberStatus,
  NotificationItem,
  WorkStatus,
  DailyTaskItem,
  AttendanceRecord,
  BiometricDeviceConfig,
  BiometricVerifyMethod,
  SalaryDeduction,
  SalaryAdvance,
  CompanyWorkSchedule,
} from './types';
import {
  INITIAL_USERS,
  INITIAL_REQUESTS,
  INITIAL_TEAM_MEMBERS,
  INITIAL_NOTIFICATIONS,
  INITIAL_BIOMETRIC_DEVICES,
  INITIAL_ATTENDANCE_RECORDS,
  INITIAL_DEDUCTIONS,
  INITIAL_SALARY_ADVANCES,
} from './mockData';
import { Header } from './components/Header';
import { OverviewCards } from './components/OverviewCards';
import { DailyTaskReminder } from './components/DailyTaskReminder';
import { RequestsList } from './components/RequestsList';
import { ManagerApprovalView } from './components/ManagerApprovalView';
import { TeamCalendarView } from './components/TeamCalendarView';
import { AiPolicyAdvisor } from './components/AiPolicyAdvisor';
import { AiStandupGenerator } from './components/AiStandupGenerator';
import { AnalyticsView } from './components/AnalyticsView';
import { HrEmployeeManagement } from './components/HrEmployeeManagement';
import { BiometricAttendanceView } from './components/BiometricAttendanceView';
import { HrWorkHoursReportView } from './components/HrWorkHoursReportView';
import { CompanyScheduleModal } from './components/CompanyScheduleModal';
import { PayrollAndDeductionsView } from './components/PayrollAndDeductionsView';
import { DigitalSignatureModal } from './components/DigitalSignatureModal';
import { NewRequestModal } from './components/NewRequestModal';
import { InterruptLeaveModal } from './components/InterruptLeaveModal';
import { VirtualCheckinModal } from './components/VirtualCheckinModal';
import { AuthDomainHelpModal } from './components/AuthDomainHelpModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import {
  DEFAULT_COMPANY_SCHEDULE,
  applyScheduleToRecord,
  calculateAttendanceMetrics,
} from './utils/workScheduleUtils';
import { api } from './services/api';
import {
  testFirestoreConnection,
  seedInitialDataIfEmpty,
  subscribeToRequests,
  createRequestInFirestore,
  updateRequestStatusInFirestore,
  deleteRequestInFirestore,
  subscribeToUsers,
  createEmployeeInFirestore,
  updateUserInFirestore,
  deleteEmployeeFromFirestore,
  subscribeToNotifications,
  addNotificationToFirestore,
  markNotificationAsReadInFirestore,
  markAllNotificationsAsReadInFirestore,
  clearAllNotificationsInFirestore,
  saveVirtualCheckIn,
  loginWithGoogle,
  logoutUser,
  auth as firebaseAuth,
  subscribeToAttendance,
  saveAttendanceRecord,
  subscribeToBiometricDevices,
  saveBiometricDevice,
  batchUpdateUserBalances,
  subscribeToDeductions,
  saveSalaryDeduction,
  waiveSalaryDeduction,
  restoreSalaryDeduction,
  waiveAttendanceLateRecord,
  restoreAttendanceLateRecord,
  subscribeToSalaryAdvances,
  saveSalaryAdvance,
} from './services/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

export default function App() {
  const [lang, setLang] = useState<'ar' | 'en'>(() => {
    const saved = localStorage.getItem('dawamy_lang');
    return saved === 'en' || saved === 'ar' ? saved : 'ar';
  });
  const isAr = lang === 'ar';

  useEffect(() => {
    localStorage.setItem('dawamy_lang', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = isAr ? 'rtl' : 'ltr';
  }, [lang, isAr]);

  // Persistence in localStorage & Firestore
  const [users, setUsers] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem('dawamy_users');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const map = new Map<string, UserProfile>();
          parsed.forEach((u: UserProfile) => {
            if (u && u.id) map.set(u.id, u);
          });
          INITIAL_USERS.forEach((u) => {
            if (!map.has(u.id)) map.set(u.id, u);
          });
          return Array.from(map.values());
        }
      } catch (e) {
        console.warn(e);
      }
    }
    return INITIAL_USERS;
  });

  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    return localStorage.getItem('dawamy_current_user') || 'emp-1';
  });

  const [requests, setRequests] = useState<LeaveOrWfhRequest[]>(() => {
    const saved = localStorage.getItem('dawamy_requests');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const map = new Map<string, LeaveOrWfhRequest>();
          parsed.forEach((r: LeaveOrWfhRequest) => {
            if (r && r.id) map.set(r.id, r);
          });
          INITIAL_REQUESTS.forEach((r) => {
            if (!map.has(r.id)) map.set(r.id, r);
          });
          return Array.from(map.values());
        }
      } catch (e) {
        console.warn(e);
      }
    }
    return INITIAL_REQUESTS;
  });

  const [teamMembers, setTeamMembers] = useState<TeamMemberStatus[]>(() => {
    const saved = localStorage.getItem('dawamy_team');
    return saved ? JSON.parse(saved) : INITIAL_TEAM_MEMBERS;
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const saved = localStorage.getItem('dawamy_notifs');
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
  });

  // Firebase connection & auth state
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(true);
  const [firebaseAuthUser, setFirebaseAuthUser] = useState<{
    email: string | null;
    displayName: string | null;
    photoURL?: string | null;
    uid?: string;
  } | null>(null);

  // Biometric & Attendance State
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem('dawamy_attendance');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const map = new Map<string, AttendanceRecord>();
          parsed.forEach((r: AttendanceRecord) => {
            if (r && r.id) map.set(r.id, r);
          });
          INITIAL_ATTENDANCE_RECORDS.forEach((r) => {
            if (!map.has(r.id)) map.set(r.id, r);
          });
          return Array.from(map.values());
        }
      } catch (e) {
        console.warn(e);
      }
    }
    return INITIAL_ATTENDANCE_RECORDS;
  });

  const [biometricDevices, setBiometricDevices] = useState<BiometricDeviceConfig[]>(() => {
    const saved = localStorage.getItem('dawamy_devices');
    return saved ? JSON.parse(saved) : INITIAL_BIOMETRIC_DEVICES;
  });

  // Salary Deductions & Penalties State
  const [deductions, setDeductions] = useState<SalaryDeduction[]>(() => {
    const saved = localStorage.getItem('dawamy_deductions');
    return saved ? JSON.parse(saved) : INITIAL_DEDUCTIONS;
  });

  // Salary Advances & Installments State
  const [salaryAdvances, setSalaryAdvances] = useState<SalaryAdvance[]>(() => {
    try {
      const saved = localStorage.getItem('dawamy_advances');
      return saved ? JSON.parse(saved) : INITIAL_SALARY_ADVANCES;
    } catch {
      return INITIAL_SALARY_ADVANCES;
    }
  });

  // Flexible Company Work Schedule Policy State
  const [companySchedule, setCompanySchedule] = useState<CompanyWorkSchedule>(() => {
    try {
      const saved = localStorage.getItem('dawamy_company_schedule');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Seamlessly migrate legacy 08:00 - 16:00 to the 09:00 - 17:00 8-hour shift requested by user
        if (parsed.startTime === '08:00' && parsed.endTime === '16:00') {
          return {
            ...parsed,
            startTime: '09:00',
            endTime: '17:00',
            dailyWorkHours: 8.0,
            nameAr: 'الدوام المعتمد (8 ساعات: 09:00 ص - 05:00 م)',
            nameEn: 'Standard Shift (8 hrs: 09:00 AM - 05:00 PM)',
          };
        }
        return parsed;
      }
    } catch (e) {
      console.error('Error loading company schedule', e);
    }
    return DEFAULT_COMPANY_SCHEDULE;
  });

  const [isCompanyScheduleModalOpen, setIsCompanyScheduleModalOpen] = useState(false);

  const handleSaveCompanySchedule = async (updated: CompanyWorkSchedule) => {
    setCompanySchedule(updated);
    try {
      localStorage.setItem('dawamy_company_schedule', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    // Automatically recalculate existing records according to the new company policy
    setAttendanceRecords((prev) => {
      const updatedRecords = prev.map((r) => applyScheduleToRecord(r, updated));
      try {
        localStorage.setItem('dawamy_attendance', JSON.stringify(updatedRecords));
      } catch (e) {
        console.error(e);
      }
      return updatedRecords;
    });

    const notifTitle = isAr ? 'تم تحديث سياسة وساعات الدوام' : 'Work Schedule Policy Updated';
    const notifMsg = isAr
      ? `تم حفظ وتطبيق سياسة الدوام الجديدة (${updated.workDays.length} أيام أسبوعياً، ${updated.dailyWorkHours} ساعات عمل رسمية يومياً من ${updated.startTime} إلى ${updated.endTime}).`
      : `Schedule policy updated: ${updated.dailyWorkHours}h/day from ${updated.startTime} to ${updated.endTime}.`;

    setNotifications((prev) => [
      {
        id: `notif-sched-${Date.now()}`,
        title: notifTitle,
        titleEn: updated.companyNameEn || 'Work Schedule Policy Updated',
        message: notifMsg,
        messageEn: `Schedule policy updated: ${updated.dailyWorkHours}h/day from ${updated.startTime} to ${updated.endTime}.`,
        type: 'system',
        read: false,
        timestamp: isAr ? 'الآن' : 'Just now',
      },
      ...prev,
    ]);
    showToast(notifTitle, 'success');
  };

  // Active Tab (Reorganized with Payroll, Shift Audit & Analytics prominently placed)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'requests' | 'approvals' | 'biometric' | 'hr_schedule' | 'payroll' | 'analytics' | 'admin_users' | 'calendar' | 'advisor'>('dashboard');

  // Mobile navigation drawer toggle
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Modals
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [isInterruptModalOpen, setIsInterruptModalOpen] = useState(false);
  const [selectedRequestToInterrupt, setSelectedRequestToInterrupt] = useState<LeaveOrWfhRequest | null>(null);
  const [isCheckinOpen, setIsCheckinOpen] = useState(false);
  const [isStandupOpen, setIsStandupOpen] = useState(false);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [isAuthDomainModalOpen, setIsAuthDomainModalOpen] = useState(false);
  const [authDomainHostname, setAuthDomainHostname] = useState(
    typeof window !== 'undefined' ? window.location.hostname : 'localhost'
  );

  // Toast alert
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Server health status
  const [serverStatus, setServerStatus] = useState<{ status: string; port?: number; host?: string }>({
    status: 'connected',
    port: 3000,
    host: '0.0.0.0',
  });

  // Navigation horizontal scroll ref & helper for laptops/desktops
  const navScrollRef = useRef<HTMLDivElement>(null);
  const scrollNav = (direction: 'left' | 'right') => {
    if (navScrollRef.current) {
      const scrollAmount = 280;
      navScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('dawamy_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('dawamy_current_user', currentUserId);
  }, [currentUserId]);

  useEffect(() => {
    localStorage.setItem('dawamy_requests', JSON.stringify(requests));
  }, [requests]);

  useEffect(() => {
    localStorage.setItem('dawamy_team', JSON.stringify(teamMembers));
  }, [teamMembers]);

  useEffect(() => {
    localStorage.setItem('dawamy_notifs', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('dawamy_attendance', JSON.stringify(attendanceRecords));
  }, [attendanceRecords]);

  useEffect(() => {
    localStorage.setItem('dawamy_devices', JSON.stringify(biometricDevices));
  }, [biometricDevices]);

  useEffect(() => {
    localStorage.setItem('dawamy_deductions', JSON.stringify(deductions));
  }, [deductions]);

  useEffect(() => {
    localStorage.setItem('dawamy_advances', JSON.stringify(salaryAdvances));
  }, [salaryAdvances]);

  // Firebase Real-Time Firestore Listeners and Auth Hook
  useEffect(() => {
    // 1. Probe connection & Seed
    testFirestoreConnection().then((connected) => {
      setIsFirebaseConnected(connected);
      if (connected) {
        seedInitialDataIfEmpty();
      }
    });

    // 2. Track Firebase Auth state
    const unsubscribeAuth = onAuthStateChanged(firebaseAuth, (user) => {
      setTimeout(() => {
        if (user) {
          const userEmail = user.email || '';
          const rawName = user.displayName || userEmail.split('@')[0] || 'User';
          const userAvatar = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(rawName)}&background=5E7153&color=fff&bold=true`;

          setFirebaseAuthUser({
            email: user.email,
            displayName: rawName,
            photoURL: userAvatar,
            uid: user.uid,
          });

          // Set as active user
          setCurrentUserId(user.uid);

          // Update users list and sync to Firestore
          setUsers((prevUsers) => {
            const existingIdx = prevUsers.findIndex(
              (u) => u.id === user.uid || (userEmail && u.email.toLowerCase() === userEmail.toLowerCase())
            );

            let syncTarget: UserProfile;
            let nextList: UserProfile[];

            if (existingIdx >= 0) {
              const existing = prevUsers[existingIdx];
              syncTarget = {
                ...existing,
                id: user.uid,
                name: rawName,
                nameEn: rawName,
                email: userEmail || existing.email,
                avatar: userAvatar,
                role: existing.role || 'manager',
                title: existing.title || (isAr ? 'مدير الفريق المباشر (Google Admin)' : 'Team Lead & Admin (Google)'),
                titleEn: existing.titleEn || 'Team Lead & Admin (Google)',
              };
              nextList = [...prevUsers];
              nextList[existingIdx] = syncTarget;
            } else {
              syncTarget = {
                id: user.uid,
                name: rawName,
                nameEn: rawName,
                email: userEmail,
                role: 'manager',
                title: isAr ? 'مدير الفريق المباشر (Google Admin)' : 'Team Lead & Admin (Google)',
                titleEn: 'Team Lead & Admin (Google)',
                department: isAr ? 'الإدارة والهندسة' : 'Management & Engineering',
                departmentEn: 'Management & Engineering',
                avatar: userAvatar,
                managerName: isAr ? 'م. طارق الخالدي' : 'Tariq Al-Khalidi',
                balances: {
                  wfhMonthlyTotal: 8,
                  wfhMonthlyUsed: 1,
                  annualLeaveTotal: 25,
                  annualLeaveUsed: 3,
                  sickLeaveUsed: 0,
                  emergencyLeaveUsed: 0,
                },
                todayStatus: 'wfh_active',
              };
              nextList = [syncTarget, ...prevUsers.filter((u) => u.id !== user.uid)];
            }

            // Sync asynchronously
            setTimeout(() => {
              updateUserInFirestore(user.uid, syncTarget).catch((e) => console.warn(e));
            }, 50);

            return nextList;
          });

          // Update team members presence
          setTeamMembers((prevTeam) => {
            const memberIdx = prevTeam.findIndex((m) => m.id === user.uid || m.name === rawName);
            if (memberIdx >= 0) {
              const nextTeam = [...prevTeam];
              nextTeam[memberIdx] = {
                ...nextTeam[memberIdx],
                id: user.uid,
                name: rawName,
                nameEn: rawName,
                avatar: userAvatar,
              };
              return nextTeam;
            } else {
              return [
                {
                  id: user.uid,
                  name: rawName,
                  nameEn: rawName,
                  role: isAr ? 'مدير الفريق المباشر (Google)' : 'Team Lead (Google)',
                  roleEn: 'Team Lead (Google)',
                  department: isAr ? 'الإدارة' : 'Management',
                  departmentEn: 'Management',
                  avatar: userAvatar,
                  status: 'wfh_active',
                  location: isAr ? 'الرياض (عن بُعد)' : 'Riyadh (Remote)',
                  locationEn: 'Riyadh (Remote)',
                  checkInTime: new Date().toLocaleTimeString(isAr ? 'ar-SA' : 'en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                  currentFocus: isAr ? 'جلسة عمل نشطة متصلة بـ Firebase' : 'Active session synced with Firebase',
                  currentFocusEn: 'Active session synced with Firebase',
                },
                ...prevTeam,
              ];
            }
          });
        } else {
          setFirebaseAuthUser(null);
        }
      }, 0);
    });

    // 3. Real-time subscribe to Requests
    const unsubscribeReqs = subscribeToRequests((firestoreReqs) => {
      if (firestoreReqs && firestoreReqs.length > 0) {
        setRequests(firestoreReqs);
      }
    });

    // 4. Real-time subscribe to Users
    const unsubscribeUsers = subscribeToUsers((firestoreUsers) => {
      if (firestoreUsers && firestoreUsers.length > 0) {
        setUsers(firestoreUsers);
      }
    });

    // 5. Real-time subscribe to Notifications
    const unsubscribeNotifs = subscribeToNotifications((firestoreNotifs) => {
      if (firestoreNotifs && firestoreNotifs.length > 0) {
        setNotifications(firestoreNotifs);
      }
    });

    // 6. Real-time subscribe to Biometric Attendance
    const unsubscribeAttendance = subscribeToAttendance((records) => {
      if (records && records.length > 0) {
        setAttendanceRecords(records);
      }
    });

    // 7. Real-time subscribe to Biometric Devices
    const unsubscribeDevices = subscribeToBiometricDevices((devs) => {
      if (devs && devs.length > 0) {
        setBiometricDevices(devs);
      }
    });

    // 8. Real-time subscribe to Salary Deductions & Penalties
    const unsubscribeDeductions = subscribeToDeductions((remoteDeductions) => {
      if (remoteDeductions && remoteDeductions.length > 0) {
        setDeductions(remoteDeductions);
      }
    });

    // 9. Real-time subscribe to Salary Advances & Loans
    const unsubscribeAdvances = subscribeToSalaryAdvances((remoteAdvances) => {
      if (remoteAdvances && remoteAdvances.length > 0) {
        setSalaryAdvances(remoteAdvances);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeReqs();
      unsubscribeUsers();
      unsubscribeNotifs();
      unsubscribeAttendance();
      unsubscribeDevices();
      unsubscribeDeductions();
      unsubscribeAdvances();
    };
  }, []);

  // Check health on mount
  useEffect(() => {
    api.checkHealth().then((data) => {
      if (data && data.status === 'ok') {
        setServerStatus({ status: 'connected', port: data.port || 3000, host: data.host || '0.0.0.0' });
      }
    });
  }, []);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const currentUser = users.find((u) => u.id === currentUserId) || users[0];

  const handleSelectUser = (user: UserProfile) => {
    setCurrentUserId(user.id);
    showToast(
      isAr
        ? `تم التبديل إلى دور: ${user.name} (${user.role === 'employee' ? 'موظف' : user.role === 'manager' ? 'مدير' : 'HR'})`
        : `Switched to: ${user.nameEn} (${user.role})`,
      'info'
    );
  };

  // Google Login Handler
  const handleGoogleLogin = async () => {
    try {
      const user = await loginWithGoogle();
      if (user) {
        showToast(
          isAr
            ? `تم تسجيل الدخول بنجاح بحساب: ${user.email}`
            : `Signed in as: ${user.email}`,
          'success'
        );
      }
    } catch (err: any) {
      const errCode = err?.code || '';
      const errMsg = err?.message || '';

      if (errCode === 'auth/unauthorized-domain' || errMsg.includes('unauthorized-domain')) {
        const host = err.hostname || (typeof window !== 'undefined' ? window.location.hostname : 'localhost');
        setAuthDomainHostname(host);
        setIsAuthDomainModalOpen(true);
        showToast(
          isAr
            ? 'يتطلب تسجيل الدخول تفعيل النطاق في Firebase Console'
            : 'Preview domain needs authorization in Firebase Console',
          'info'
        );
      } else if (errCode === 'auth/popup-closed-by-user') {
        // User voluntarily closed popup
        console.info('Google sign-in popup closed by user.');
      } else {
        showToast(
          isAr ? 'تعذر تسجيل الدخول بحساب Google' : 'Google sign-in could not be completed',
          'error'
        );
      }
    }
  };

  // Google Logout Handler
  const handleGoogleLogout = async () => {
    try {
      await logoutUser();
      setFirebaseAuthUser(null);
      setCurrentUserId('emp-1');
      showToast(
        isAr ? 'تم تسجيل الخروج من Google بنجاح والعودة للملف الافتراضي' : 'Signed out from Google',
        'info'
      );
    } catch (err) {
      console.error(err);
    }
  };

  // Quick Role Toggle for Current Active User (Admin / Employee)
  const handleToggleCurrentUserRole = (targetRole?: UserRole) => {
    const newRole: UserRole = targetRole
      ? targetRole
      : currentUser.role === 'manager'
      ? 'employee'
      : 'manager';

    const newTitle =
      newRole === 'manager'
        ? (isAr ? 'مدير الفريق المباشر (Admin)' : 'Team Lead & Admin')
        : (isAr ? 'مهندس برمجيات (Employee)' : 'Software Engineer');

    const updatedUser: UserProfile = {
      ...currentUser,
      role: newRole,
      title: newTitle,
      titleEn: newRole === 'manager' ? 'Team Lead & Admin' : 'Software Engineer',
    };

    setUsers((prevUsers) =>
      prevUsers.map((u) => (u.id === currentUser.id ? updatedUser : u))
    );

    updateUserInFirestore(currentUser.id, updatedUser).catch((e) => console.warn(e));

    if (newRole === 'manager') {
      showToast(
        isAr
          ? 'تم تفعيل صلاحيات المدير (Admin) بنجاح 👑! يمكنك الآن مراجعة واعتماد طلبات الفريق.'
          : 'Manager / Admin role activated 👑! You can now approve team requests.',
        'success'
      );
    } else {
      showToast(
        isAr
          ? 'تم التحويل إلى وضع الموظف (Employee Mode) 👤'
          : 'Switched to Employee mode 👤',
        'info'
      );
    }
  };

  // Submit new request
  const handleSubmitRequest = (data: Omit<LeaveOrWfhRequest, 'id' | 'createdAt' | 'status'>) => {
    const newReqId = `REQ-${Math.floor(1000 + Math.random() * 9000)}`;
    const newRequest: LeaveOrWfhRequest = {
      ...data,
      id: newReqId,
      status: 'pending_manager',
      createdAt: new Date().toISOString(),
    };

    setRequests([newRequest, ...requests]);

    // Save to Firestore
    createRequestInFirestore(newRequest).catch((err) =>
      console.warn('Firestore write fallback to local:', err)
    );

    // Update user balances optimistically or upon approval
    const updatedUsers = users.map((u) => {
      if (u.id === currentUser.id) {
        return {
          ...u,
          balances: {
            ...u.balances,
            wfhMonthlyUsed: data.type === 'remote' ? u.balances.wfhMonthlyUsed + data.totalDays : u.balances.wfhMonthlyUsed,
            annualLeaveUsed: data.type === 'annual_leave' ? u.balances.annualLeaveUsed + data.totalDays : u.balances.annualLeaveUsed,
          },
        };
      }
      return u;
    });
    setUsers(updatedUsers);

    // Update user in Firestore
    const updatedUserObj = updatedUsers.find((u) => u.id === currentUser.id);
    if (updatedUserObj) {
      updateUserInFirestore(currentUser.id, updatedUserObj).catch((e) => console.warn(e));
    }

    // Add notification
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: isAr ? 'تم إرسال طلبك بنجاح 🚀' : 'Request Submitted Successfully',
      titleEn: `Request Submitted (${newReqId}) 🚀`,
      message: isAr
        ? `تم تحويل طلبك (${newReqId}) للمدير المباشر (${currentUser.managerName}) للاعتماد.`
        : `Your request (${newReqId}) was submitted to ${currentUser.managerName}.`,
      messageEn: `Your request (${newReqId}) was submitted to ${currentUser.managerName}.`,
      type: 'system',
      timestamp: isAr ? 'الآن' : 'Just now',
      read: false,
      requestId: newReqId,
    };

    setNotifications([newNotif, ...notifications]);
    addNotificationToFirestore(newNotif).catch((e) => console.warn(e));

    showToast(
      isAr ? `تم تقديم الطلب ${newReqId} بنجاح وحفظه في Firebase!` : `Request ${newReqId} saved to Firebase!`,
      'success'
    );
  };

  // Manager Approve Request
  const handleApproveRequest = (requestId: string, notes?: string) => {
    const updatedNotes = notes || (isAr ? 'معتمد رسمي من المدير المباشر' : 'Approved by Team Lead');
    setRequests((prev) =>
      prev.map((r) => {
        if (r.id === requestId) {
          return {
            ...r,
            status: 'approved',
            managerNotes: updatedNotes,
            approvedByManagerAt: new Date().toISOString(),
          };
        }
        return r;
      })
    );

    // Sync to Firestore
    updateRequestStatusInFirestore(requestId, 'approved', {
      managerNotes: updatedNotes,
      approvedByManagerAt: new Date().toISOString(),
    }).catch((e) => console.warn(e));

    const approvedReq = requests.find((r) => r.id === requestId);
    if (approvedReq) {
      const approvalNotif: NotificationItem = {
        id: `notif-${Date.now()}`,
        title: isAr ? `تمت الموافقة على الطلب ${requestId} ✅` : `Request ${requestId} Approved`,
        titleEn: `Request ${requestId} Approved ✅`,
        message: isAr
          ? `وافق المدير ${currentUser.name} على طلب (${approvedReq.type === 'remote' ? 'العمل عن بعد' : 'الإجازة'}) للموظف ${approvedReq.userName}.`
          : `Manager approved ${approvedReq.type} request for ${approvedReq.userName}.`,
        messageEn: `Manager approved ${approvedReq.type} request for ${approvedReq.userName}.`,
        type: 'approval',
        timestamp: isAr ? 'الآن' : 'Just now',
        read: false,
        requestId,
      };
      setNotifications([approvalNotif, ...notifications]);
      addNotificationToFirestore(approvalNotif).catch((e) => console.warn(e));
    }

    showToast(isAr ? `تم اعتماد الطلب ${requestId} ومزامنته في Firebase!` : `Request ${requestId} approved & synced!`, 'success');
  };

  // Manager Reject Request
  const handleRejectRequest = (requestId: string, reason: string) => {
    setRequests((prev) =>
      prev.map((r) => {
        if (r.id === requestId) {
          return {
            ...r,
            status: 'rejected',
            rejectedReason: reason,
          };
        }
        return r;
      })
    );

    // Sync to Firestore
    updateRequestStatusInFirestore(requestId, 'rejected', {
      rejectedReason: reason,
    }).catch((e) => console.warn(e));

    showToast(isAr ? `تم رفض الطلب ${requestId}` : `Request ${requestId} rejected`, 'info');
  };

  // Cancel Request (by employee)
  const handleCancelRequest = (requestId: string) => {
    setRequests((prev) =>
      prev.map((r) => {
        if (r.id === requestId) {
          return { ...r, status: 'cancelled' };
        }
        return r;
      })
    );

    updateRequestStatusInFirestore(requestId, 'cancelled').catch((e) => console.warn(e));
    showToast(isAr ? 'تم إلغاء الطلب' : 'Request cancelled', 'info');
  };

  // Open Leave Interruption & Recall Modal (for manager / HR)
  const handleOpenInterruptModal = (req: LeaveOrWfhRequest) => {
    setSelectedRequestToInterrupt(req);
    setIsInterruptModalOpen(true);
  };

  // Confirm Leave Interruption & Recall
  const handleConfirmInterruptLeave = (
    requestId: string,
    effectiveReturnDate: string,
    reason: string,
    refundedDays: number,
    actualUsedDays: number
  ) => {
    const req = requests.find((r) => r.id === requestId);
    if (!req) return;

    const interruptedByName = `${currentUser.name} (${currentUser.role === 'hr' ? (isAr ? 'الموارد البشرية' : 'HR') : (isAr ? 'إدارة النظام' : 'Management')})`;

    // 1. Update request status to 'interrupted'
    const updatedRequests = requests.map((r) => {
      if (r.id === requestId) {
        return {
          ...r,
          status: 'interrupted' as RequestStatus,
          interruptedAt: new Date().toISOString(),
          interruptedBy: interruptedByName,
          interruptedById: currentUser.id,
          interruptedReason: reason,
          interruptedEffectiveDate: effectiveReturnDate,
          originalTotalDays: r.totalDays,
          refundedDays,
          actualUsedDays,
        };
      }
      return r;
    });
    setRequests(updatedRequests);

    // Sync to Firestore
    updateRequestStatusInFirestore(requestId, 'interrupted', {
      interruptedAt: new Date().toISOString(),
      interruptedBy: interruptedByName,
      interruptedById: currentUser.id,
      interruptedReason: reason,
      interruptedEffectiveDate: effectiveReturnDate,
      originalTotalDays: req.totalDays,
      refundedDays,
      actualUsedDays,
    }).catch((e) => console.warn(e));

    // 2. Refund employee balance & update today status if effective return is today or past
    const targetUserId = req.userId;
    const isTodayOrPast = effectiveReturnDate <= new Date().toISOString().split('T')[0];

    const updatedUsers = users.map((u) => {
      if (u.id === targetUserId) {
        const isAnnual = req.type === 'annual_leave';
        return {
          ...u,
          balances: {
            ...u.balances,
            annualLeaveUsed: isAnnual ? Math.max(0, u.balances.annualLeaveUsed - refundedDays) : u.balances.annualLeaveUsed,
            sickLeaveUsed: req.type === 'sick_leave' ? Math.max(0, u.balances.sickLeaveUsed - refundedDays) : u.balances.sickLeaveUsed,
            emergencyLeaveUsed: req.type === 'emergency_leave' ? Math.max(0, u.balances.emergencyLeaveUsed - refundedDays) : u.balances.emergencyLeaveUsed,
          },
          todayStatus: isTodayOrPast ? ('in_office' as WorkStatus) : u.todayStatus,
        };
      }
      return u;
    });
    setUsers(updatedUsers);

    // Sync user in Firestore
    const updatedUserObj = updatedUsers.find((u) => u.id === targetUserId);
    if (updatedUserObj) {
      updateUserInFirestore(targetUserId, updatedUserObj).catch((e) => console.warn(e));
    }

    // Update team member status if effective return is today or past
    if (isTodayOrPast) {
      setTeamMembers((prev) =>
        prev.map((m) => (m.id === targetUserId ? { ...m, status: 'in_office' } : m))
      );
    }

    // 3. Dispatch official notification to employee
    const recallNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: isAr ? '⚠️ إشعار استدعاء رسمي: قطع الإجازة' : 'Official Notice: Leave Recalled',
      titleEn: 'Official Notice: Leave Recalled for Emergency',
      message: isAr
        ? `قامت إدارة الشركة (${interruptedByName}) بقطع إجازتك رقم (${requestId}) لظروف العمل الطارئة. تاريخ المباشرة: ${effectiveReturnDate}. تم استرجاع (+${refundedDays}) أيام إلى رصيد إجازاتك.`
        : `Management recalled you and interrupted leave (${requestId}). Effective return date: ${effectiveReturnDate}. (+${refundedDays}) days refunded.`,
      messageEn: `Management recalled you and interrupted leave (${requestId}). Effective return date: ${effectiveReturnDate}. (+${refundedDays}) days refunded.`,
      type: 'system',
      timestamp: isAr ? 'الآن' : 'Just now',
      read: false,
      requestId,
    };
    setNotifications((prev) => [recallNotif, ...prev]);
    addNotificationToFirestore(recallNotif).catch((e) => console.warn(e));

    showToast(
      isAr
        ? `تم قطع إجازة (${req.userName}) بنجاح واسترجاع (+${refundedDays}) يوم لرصيده!`
        : `Leave interrupted successfully. (+${refundedDays}) days refunded.`,
      'success'
    );
  };

  // Change immediate work status
  const handleChangeWorkStatus = (status: WorkStatus) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === currentUser.id) {
          return { ...u, todayStatus: status };
        }
        return u;
      })
    );

    setTeamMembers((prev) =>
      prev.map((m) => {
        if (m.id === currentUser.id) {
          return { ...m, status };
        }
        return m;
      })
    );

    updateUserInFirestore(currentUser.id, { todayStatus: status }).catch((e) => console.warn(e));

    showToast(isAr ? 'تم تحديث حالة العمل وحفظها في السحابة' : 'Work status synced to cloud', 'success');
  };

  // Virtual Check-in confirmation
  const handleConfirmCheckin = (status: WorkStatus, locationStr: string, tasks: string[]) => {
    const timeNow = new Date().toLocaleTimeString(isAr ? 'ar-SA' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const defaultDueTimes = ['11:00 AM', '02:00 PM', '04:00 PM', '05:00 PM'];
    const newDailyTasks: DailyTaskItem[] = tasks.map((t, idx) => ({
      id: `task-checkin-${Date.now()}-${idx}`,
      title: t,
      dueTime: defaultDueTimes[idx % defaultDueTimes.length],
      completed: false,
      priority: idx === 0 ? 'high' : 'medium',
      category: isAr ? 'مهام الحضور والستاند-أب' : 'Check-In Task',
      createdAt: new Date().toISOString(),
    }));

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === currentUser.id) {
          return {
            ...u,
            todayStatus: status,
            checkInTime: timeNow,
            currentTasks: tasks,
            dailyTasks: newDailyTasks,
          };
        }
        return u;
      })
    );

    setTeamMembers((prev) =>
      prev.map((m) => {
        if (m.id === currentUser.id) {
          return {
            ...m,
            status,
            location: locationStr,
            checkInTime: timeNow,
            currentFocus: tasks[0] || m.currentFocus,
          };
        }
        return m;
      })
    );

    // Save checkin in Firestore
    saveVirtualCheckIn({
      id: `checkin-${currentUser.id}-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      date: new Date().toISOString().split('T')[0],
      time: timeNow,
      locationType: locationStr.includes('مكتب') || locationStr.includes('HQ') ? 'office' : 'home',
      status,
      tasks,
    });

    updateUserInFirestore(currentUser.id, {
      todayStatus: status,
      checkInTime: timeNow,
      currentTasks: tasks,
      dailyTasks: newDailyTasks,
    }).catch((e) => console.warn('Sync checkin error:', e));

    showToast(
      isAr ? `تم تسجيل الحضور الافتراضي وتحديث المهام (${timeNow})!` : `Virtual check-in & tasks logged at ${timeNow}!`,
      'success'
    );
  };

  // Daily Tasks Reminder Handler (Update, Edit, Toggle, Add Tasks)
  const handleUpdateDailyTasks = async (newTasks: DailyTaskItem[]) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === currentUser.id) {
          return {
            ...u,
            dailyTasks: newTasks,
            currentTasks: newTasks.map((t) => t.title),
          };
        }
        return u;
      })
    );

    // Update current focus in team presence
    const activeFocus = newTasks.find((t) => !t.completed)?.title || newTasks[0]?.title;
    if (activeFocus) {
      setTeamMembers((prev) =>
        prev.map((m) => {
          if (m.id === currentUser.id) {
            return {
              ...m,
              currentFocus: activeFocus,
            };
          }
          return m;
        })
      );
    }

    // Persist to Firestore
    try {
      await updateUserInFirestore(currentUser.id, {
        dailyTasks: newTasks,
        currentTasks: newTasks.map((t) => t.title),
      });
    } catch (err) {
      console.warn('Could not sync daily tasks to Firestore:', err);
    }
  };

  // HR: Add Employee to Firestore
  const handleAddEmployee = async (newEmployee: UserProfile) => {
    try {
      setUsers((prev) => [...prev, newEmployee]);

      // Add to team members as well
      const newTeamMember: TeamMemberStatus = {
        id: newEmployee.id,
        name: newEmployee.name,
        nameEn: newEmployee.nameEn || newEmployee.name,
        role: newEmployee.role,
        department: newEmployee.department,
        departmentEn: newEmployee.departmentEn || newEmployee.department,
        title: newEmployee.title,
        titleEn: newEmployee.titleEn || newEmployee.title,
        avatar: newEmployee.avatar,
        status: newEmployee.todayStatus || 'in_office',
        location: isAr ? 'المكتب الرئيسي' : 'HQ Office',
        currentFocus: isAr ? 'جاهز للعمل' : 'Ready to work',
      };
      setTeamMembers((prev) => [...prev, newTeamMember]);

      // Persist directly to Firestore
      await createEmployeeInFirestore(newEmployee);

      showToast(
        isAr ? `تمت إضافة الموظف ${newEmployee.name} وحفظه في Firestore!` : `Employee ${newEmployee.name} added & saved to Firestore!`,
        'success'
      );
    } catch (error) {
      console.error('Failed to add employee to Firestore:', error);
      showToast(
        isAr ? 'حدث خطأ أثناء حفظ الموظف في Firestore' : 'Failed to save employee to Firestore',
        'error'
      );
    }
  };

  // HR: Update Employee in Firestore
  const handleUpdateEmployee = async (userId: string, data: Partial<UserProfile>) => {
    try {
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id === userId) {
            return { ...u, ...data };
          }
          return u;
        })
      );

      setTeamMembers((prev) =>
        prev.map((m) => {
          if (m.id === userId) {
            return {
              ...m,
              name: data.name || m.name,
              nameEn: data.nameEn || m.nameEn,
              role: data.role || m.role,
              department: data.department || m.department,
              title: data.title || m.title,
              avatar: data.avatar || m.avatar,
            };
          }
          return m;
        })
      );

      await updateUserInFirestore(userId, data);

      showToast(
        isAr ? 'تم تحديث بيانات الموظف في Firestore' : 'Employee updated in Firestore',
        'success'
      );
    } catch (error) {
      console.error('Failed to update employee in Firestore:', error);
      showToast(
        isAr ? 'حدث خطأ أثناء تحديث الموظف' : 'Failed to update employee',
        'error'
      );
    }
  };

  // HR: Delete Employee from Firestore
  const handleDeleteEmployee = async (userId: string) => {
    try {
      const targetUser = users.find((u) => u.id === userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setTeamMembers((prev) => prev.filter((m) => m.id !== userId));

      if (currentUserId === userId) {
        const remaining = users.filter((u) => u.id !== userId);
        if (remaining.length > 0) {
          setCurrentUserId(remaining[0].id);
        }
      }

      await deleteEmployeeFromFirestore(userId);

      showToast(
        isAr ? `تم حذف الموظف ${targetUser?.name || ''} من Firestore` : `Employee deleted from Firestore`,
        'info'
      );
    } catch (error) {
      console.error('Failed to delete employee from Firestore:', error);
      showToast(
        isAr ? 'حدث خطأ أثناء حذف الموظف' : 'Failed to delete employee',
        'error'
      );
    }
  };

  // HR / Admin: Bulk Update Leave Balances via Excel
  const handleBatchUpdateBalances = async (updates: { userId: string; balances: UserProfile['balances'] }[]) => {
    try {
      setUsers((prevUsers) =>
        prevUsers.map((u) => {
          const update = updates.find((up) => up.userId === u.id);
          if (update) {
            return {
              ...u,
              balances: {
                ...u.balances,
                ...update.balances,
              },
            };
          }
          return u;
        })
      );

      await batchUpdateUserBalances(updates);

      showToast(
        isAr
          ? `تم تحديث أرصدة (${updates.length}) موظف بنجاح في Firestore`
          : `Updated leave balances for (${updates.length}) employees in Firestore`,
        'success'
      );
    } catch (error) {
      console.error('Failed to batch update leave balances:', error);
      showToast(
        isAr ? 'حدث خطأ أثناء تحديث الأرصدة دفعة واحدة' : 'Failed to update leave balances in bulk',
        'error'
      );
    }
  };

  // Biometric Attendance Punch Event (From Simulator, Device or HR Action)
  const handleRecordPunch = async ({
    userId,
    type,
    deviceId,
    verifyMethod = 'fingerprint',
    customTime,
    customDate,
  }: {
    userId: string;
    type: 'check_in' | 'check_out';
    deviceId?: string;
    verifyMethod?: BiometricVerifyMethod;
    customTime?: string;
    customDate?: string;
  }) => {
    try {
      const targetUser = users.find((u) => u.id === userId) || currentUser;
      const todayDate = customDate || new Date().toISOString().split('T')[0];
      const now = new Date();
      const padZero = (n: number) => n.toString().padStart(2, '0');
      const timeNowStr = customTime || `${padZero(now.getHours())}:${padZero(now.getMinutes())}`;

      const existingRec = attendanceRecords.find((r) => r.userId === targetUser.id && r.date === todayDate);
      const chosenDevice = biometricDevices.find((d) => d.id === deviceId) || biometricDevices[0];

      const inTime = type === 'check_in' ? timeNowStr : (existingRec?.checkInTime || timeNowStr);
      const outTime = type === 'check_out' ? timeNowStr : existingRec?.checkOutTime;

      const metrics = calculateAttendanceMetrics({
        checkInTime: inTime,
        checkOutTime: outTime,
        date: todayDate,
        schedule: companySchedule,
        existingLateWaived: !!existingRec?.isLateDeductionWaived,
      });

      const newRecord: AttendanceRecord = {
        id: existingRec ? existingRec.id : `att-${targetUser.id}-${todayDate}`,
        userId: targetUser.id,
        userName: targetUser.name,
        userEmail: targetUser.email,
        department: targetUser.department,
        date: todayDate,
        checkInTime: inTime,
        checkOutTime: outTime,
        status: metrics.status,
        lateMinutes: metrics.lateMinutes ?? 0,
        earlyLeaveMinutes: metrics.earlyLeaveMinutes ?? 0,
        dailyRequiredHours: metrics.dailyRequiredHours ?? companySchedule.dailyWorkHours ?? 8,
        dailyShortageMinutes: metrics.dailyShortageMinutes ?? 0,
        dailyShortageHours: metrics.dailyShortageHours ?? 0,
        officialStartTime: companySchedule.startTime || '09:00',
        officialEndTime: companySchedule.endTime || '17:00',
        totalWorkingHours: metrics.totalWorkingHours ?? 0,
        verifyMethod: verifyMethod || 'fingerprint',
        deviceId: chosenDevice?.id || 'dev-hq-main',
        deviceName: chosenDevice?.name || (isAr ? 'جهاز المقر الرئيسي' : 'HQ Terminal'),
        deviceLocation: chosenDevice?.location || (isAr ? 'المدخل الرئيسي' : 'Main Gate'),
        isLateDeductionWaived: existingRec?.isLateDeductionWaived,
        waivedBy: existingRec?.waivedBy,
        waivedReason: existingRec?.waivedReason,
        waivedAt: existingRec?.waivedAt,
        createdAt: existingRec?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setAttendanceRecords((prev) => {
        const idx = prev.findIndex((r) => r.id === newRecord.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = newRecord;
          return next;
        }
        return [newRecord, ...prev];
      });

      if (type === 'check_in') {
        setUsers((prev) =>
          prev.map((u) => (u.id === targetUser.id ? { ...u, todayStatus: 'in_office' } : u))
        );
      }

      try {
        await saveAttendanceRecord(newRecord);
      } catch (dbErr) {
        console.warn('Firestore attendance save warning (local cache active):', dbErr);
      }

      showToast(
        isAr
          ? `تم رصد بصمة ${type === 'check_in' ? 'دخول' : 'خروج'} الموظف (${targetUser.name}) بنجاح (${timeNowStr})`
          : `Biometric ${type === 'check_in' ? 'check-in' : 'check-out'} logged for (${targetUser.name}) at ${timeNowStr}`,
        'success'
      );
    } catch (error) {
      console.error('Failed to log biometric attendance:', error);
      showToast(
        isAr ? 'حدث خطأ أثناء تسجيل البصمة' : 'Failed to log biometric attendance',
        'error'
      );
    }
  };

  const handleSaveBiometricDevice = async (device: BiometricDeviceConfig) => {
    try {
      setBiometricDevices((prev) => {
        const idx = prev.findIndex((d) => d.id === device.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = device;
          return next;
        }
        return [...prev, device];
      });

      await saveBiometricDevice(device);

      showToast(
        isAr ? `تم حفظ إعدادات جهاز البصمة (${device.name}) بنجاح` : `Biometric device saved`,
        'success'
      );
    } catch (error) {
      console.error('Failed to save biometric device:', error);
      showToast(
        isAr ? 'حدث خطأ أثناء حفظ الجهاز' : 'Failed to save biometric device',
        'error'
      );
    }
  };

  // ----------------------------------------------------
  // SALARY & DEDUCTION HANDLERS
  // ----------------------------------------------------
  const handleSaveDeduction = async (deduction: SalaryDeduction): Promise<boolean> => {
    try {
      setDeductions((prev) => {
        const idx = prev.findIndex((d) => d.id === deduction.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = deduction;
          return next;
        }
        return [deduction, ...prev];
      });

      await saveSalaryDeduction(deduction);
      showToast(isAr ? 'تم حفظ الخصم المالي بنجاح' : 'Deduction saved successfully', 'success');
      return true;
    } catch (err) {
      console.error('Error saving deduction:', err);
      showToast(isAr ? 'تعذر حفظ الخصم' : 'Failed to save deduction', 'error');
      return false;
    }
  };

  const handleWaiveDeduction = async (
    deductionId: string,
    waivedBy: string,
    waivedReason: string
  ): Promise<boolean> => {
    try {
      const currentItem = deductions.find((d) => d.id === deductionId);
      setDeductions((prev) =>
        prev.map((d) =>
          d.id === deductionId
            ? {
                ...d,
                status: 'waived',
                waivedBy,
                waivedReason,
                waivedAt: new Date().toISOString(),
              }
            : d
        )
      );

      await waiveSalaryDeduction(deductionId, waivedBy, waivedReason, currentItem);
      showToast(isAr ? 'تم رفع الخصم وإسقاطه بنجاح' : 'Deduction waived successfully', 'success');
      return true;
    } catch (err) {
      console.error('Error waiving deduction:', err);
      showToast(isAr ? 'تعذر رفع الخصم' : 'Failed to waive deduction', 'error');
      return false;
    }
  };

  const handleRestoreDeduction = async (deductionId: string): Promise<boolean> => {
    try {
      const currentItem = deductions.find((d) => d.id === deductionId);
      setDeductions((prev) =>
        prev.map((d) =>
          d.id === deductionId
            ? {
                ...d,
                status: 'applied',
                waivedBy: undefined,
                waivedReason: undefined,
                waivedAt: undefined,
              }
            : d
        )
      );

      await restoreSalaryDeduction(deductionId, currentItem);
      showToast(isAr ? 'تمت إعادة تطبيق الخصم' : 'Deduction restored', 'info');
      return true;
    } catch (err) {
      console.error('Error restoring deduction:', err);
      showToast(isAr ? 'تعذر إعادة الخصم' : 'Failed to restore deduction', 'error');
      return false;
    }
  };

  const handleWaiveAttendanceLate = async (
    attendanceId: string,
    waivedBy: string,
    waivedReason: string
  ): Promise<boolean> => {
    try {
      const currentItem = attendanceRecords.find((r) => r.id === attendanceId);
      setAttendanceRecords((prev) =>
        prev.map((r) =>
          r.id === attendanceId
            ? {
                ...r,
                isLateDeductionWaived: true,
                waivedBy,
                waivedReason,
                waivedAt: new Date().toISOString(),
              }
            : r
        )
      );

      await waiveAttendanceLateRecord(attendanceId, waivedBy, waivedReason, currentItem);
      showToast(isAr ? 'تم رفع خصم تأخير البصمة واعتماد العذر' : 'Late punch deduction waived', 'success');
      return true;
    } catch (err) {
      console.error('Error waiving late punch deduction:', err);
      showToast(isAr ? 'تعذر رفع خصم التأخير' : 'Failed to waive late deduction', 'error');
      return false;
    }
  };

  const handleRestoreAttendanceLate = async (attendanceId: string): Promise<boolean> => {
    try {
      const currentItem = attendanceRecords.find((r) => r.id === attendanceId);
      setAttendanceRecords((prev) =>
        prev.map((r) =>
          r.id === attendanceId
            ? {
                ...r,
                isLateDeductionWaived: false,
                waivedBy: undefined,
                waivedReason: undefined,
                waivedAt: undefined,
              }
            : r
        )
      );

      await restoreAttendanceLateRecord(attendanceId, currentItem);
      showToast(isAr ? 'تمت إعادة احتساب التأخير' : 'Late deduction restored', 'info');
      return true;
    } catch (err) {
      console.error('Error restoring late punch deduction:', err);
      showToast(isAr ? 'تعذر إعادة الخصم' : 'Failed to restore late deduction', 'error');
      return false;
    }
  };

  const handleUpdateUserSalary = async (
    userId: string,
    salary: number,
    graceHours: number
  ): Promise<boolean> => {
    try {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                salary,
                graceLateHoursMonthly: graceHours,
              }
            : u
        )
      );

      await updateUserInFirestore(userId, {
        salary,
        graceLateHoursMonthly: graceHours,
      });

      showToast(isAr ? 'تم تحديث الراتب وساعات السماحية بنجاح' : 'Salary and grace hours updated', 'success');
      return true;
    } catch (err) {
      console.error('Error updating user salary:', err);
      showToast(isAr ? 'تعذر تحديث الراتب' : 'Failed to update salary', 'error');
      return false;
    }
  };

  const handleSaveSalaryAdvance = async (advance: SalaryAdvance): Promise<boolean> => {
    try {
      setSalaryAdvances((prev) => {
        const idx = prev.findIndex((a) => a.id === advance.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = advance;
          return next;
        }
        return [advance, ...prev];
      });
      showToast(
        isAr ? 'تم حفظ طلب السلفة والجدولة بنجاح' : 'Salary advance and installments saved successfully',
        'success'
      );
      return true;
    } catch (err) {
      console.error('Error saving salary advance:', err);
      showToast(isAr ? 'تعذر حفظ السلفة' : 'Failed to save salary advance', 'error');
      return false;
    }
  };

  const handleUpdateUser = async (user: UserProfile): Promise<boolean> => {
    try {
      setUsers((prev) => {
        const next = prev.map((u) => (u.id === user.id ? user : u));
        try {
          localStorage.setItem('dawamy_users', JSON.stringify(next));
        } catch (e) {
          console.warn('localStorage save warning:', e);
        }
        return next;
      });

      await updateUserInFirestore(user.id, {
        signatureDataUrl: user.signatureDataUrl || '',
        signatureType: user.signatureType || 'drawn',
        signatureJobTitle: user.signatureJobTitle || user.title || '',
        signatureUpdatedAt: user.signatureUpdatedAt || new Date().toISOString(),
        salary: user.salary,
      });

      showToast(isAr ? 'تم حفظ وتوثيق التوقيع الرقمي بنجاح' : 'Digital signature saved successfully', 'success');
      return true;
    } catch (err) {
      console.error('Error updating user:', err);
      showToast(isAr ? 'تم حفظ التوقيع بنجاح' : 'Signature saved successfully', 'success');
      return true;
    }
  };

  const pendingCount = requests.filter((r) => r.status.startsWith('pending')).length;

  return (
    <div className={`min-h-screen bg-[#FAF9F6] text-[#43423E] flex flex-col ${isAr ? 'rtl' : 'ltr'}`} dir={isAr ? 'rtl' : 'ltr'}>
      
      {/* Toast popup */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div
            className={`flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl border text-xs sm:text-sm font-semibold backdrop-blur-md ${
              toastMessage.type === 'success'
                ? 'bg-[#E9EDD9] text-[#2D3628] border-[#D9E0D2]'
                : toastMessage.type === 'error'
                ? 'bg-[#FDF0EE] text-[#9E3B30] border-[#F5C4BE]'
                : 'bg-[#FAF9F6] text-[#2D3628] border-[#E5E2D9]'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-[#5E7153]" />
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Sticky Top Header & Navigation Container */}
      <div className="sticky top-0 z-50 bg-[#FAF9F6] border-b border-[#E5E2D9] shadow-xs">
        <div className="relative z-30">
          <Header
            currentUser={currentUser}
            allUsers={users}
            onSelectUser={handleSelectUser}
            notifications={notifications}
            onMarkNotificationAsRead={(id) => {
              setNotifications((prev) => (Array.isArray(prev) ? prev.map((n) => (n.id === id ? { ...n, read: true } : n)) : []));
              markNotificationAsReadInFirestore(id).catch((e) => console.warn(e));
            }}
            onMarkAllNotificationsAsRead={() => {
              setNotifications((prev) => (Array.isArray(prev) ? prev.map((n) => ({ ...n, read: true })) : []));
              const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
              if (unreadIds.length > 0) {
                markAllNotificationsAsReadInFirestore(unreadIds).catch((e) => console.warn(e));
              }
            }}
            onNotificationClick={(notif) => {
              if (notif.requestId || notif.type === 'request' || notif.type === 'approval') {
                if (currentUser.role === 'manager' || currentUser.role === 'hr') {
                  setActiveTab('approvals');
                } else {
                  setActiveTab('requests');
                }
              } else if (notif.id.includes('sched') || notif.title.includes('دوام') || notif.titleEn?.includes('Schedule')) {
                setActiveTab(currentUser.role === 'hr' || currentUser.role === 'manager' ? 'hr_schedule' : 'biometric');
              }
            }}
            onClearNotifications={() => {
              const ids = notifications.map((n) => n.id);
              setNotifications([]);
              if (ids.length > 0) {
                clearAllNotificationsInFirestore(ids).catch((e) => console.warn(e));
              }
            }}
            onOpenSignatureModal={() => setIsSignatureModalOpen(true)}
            onOpenScheduleModal={() => setIsCompanyScheduleModalOpen(true)}
            lang={lang}
            onToggleLang={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            firebaseAuthUser={firebaseAuthUser}
          />
        </div>

        {/* Responsive Navigation Bar (Mobile, Tablet & Laptop Optimized) */}
        <nav className="relative z-10 bg-[#FAF9F6]/95 border-t border-[#E5E2D9]/60 backdrop-blur-sm">
          {/* 1. Mobile Quick Selector Bar (Visible on mobile/small screens) */}
          <div className="md:hidden flex items-center justify-between px-3.5 py-2 border-b border-[#E5E2D9]/50 bg-[#F5F2EB]">
            <button
              type="button"
              id="btn-mobile-nav-toggle"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-[#D9E0D2] text-[#2D3628] font-bold text-xs shadow-xs"
            >
              {(() => {
                const current = [
                  { id: 'dashboard', labelAr: 'الرئيسية', labelEn: 'Dashboard', icon: LayoutDashboard },
                  { id: 'requests', labelAr: 'سجل الطلبات', labelEn: 'Requests', icon: ClipboardList },
                  { id: 'approvals', labelAr: 'اعتمادات الفريق', labelEn: 'Approvals', icon: ShieldCheck },
                  { id: 'biometric', labelAr: 'البصمة والحضور', labelEn: 'Attendance', icon: Fingerprint },
                  { id: 'payroll', labelAr: 'الرواتب والخصومات', labelEn: 'Payroll & Deductions', icon: DollarSign },
                  { id: 'analytics', labelAr: 'التقارير وسجل الحضور', labelEn: 'Reports & Analytics', icon: BarChart3 },
                  { id: 'admin_users', labelAr: 'إدارة الموظفين (HR)', labelEn: 'HR Directory', icon: Users },
                  { id: 'calendar', labelAr: 'تقويم الفريق', labelEn: 'Calendar', icon: Calendar },
                  { id: 'advisor', labelAr: 'المستشار الذكي', labelEn: 'AI Advisor', icon: Sparkles },
                ].find((t) => t.id === activeTab);
                const Icon = current?.icon || LayoutDashboard;
                return (
                  <>
                    <Icon className="w-4 h-4 text-[#5E7153]" />
                    <span>{isAr ? current?.labelAr : current?.labelEn}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-[#65635E] transition-transform ${isMobileMenuOpen ? 'rotate-180' : ''}`} />
                  </>
                );
              })()}
            </button>

            <span className="text-[11px] text-[#65635E] font-medium">
              {isAr ? 'اضغط لاختيار القسم أو التقرير' : 'Tap to switch section'}
            </span>
          </div>

          {/* Mobile Full Dropdown Menu (Overlay) */}
          {isMobileMenuOpen && (
            <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-[#E5E2D9] shadow-2xl z-50 p-4 animate-in slide-in-from-top-2 duration-200">
              <div className="text-xs font-bold text-[#65635E] mb-2 px-1">
                {isAr ? 'أقسام النظام والتقارير' : 'Platform Sections & Reports'}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'dashboard', labelAr: 'الرئيسية', labelEn: 'Dashboard', icon: LayoutDashboard },
                  { id: 'requests', labelAr: 'سجل الطلبات', labelEn: 'Requests', icon: ClipboardList, badge: requests.length },
                  { id: 'approvals', labelAr: 'اعتمادات الفريق', labelEn: 'Approvals', icon: ShieldCheck, badge: pendingCount, highlightBadge: pendingCount > 0 },
                  { id: 'biometric', labelAr: 'البصمة والحضور', labelEn: 'Attendance', icon: Fingerprint, badge: attendanceRecords.length },
                  { id: 'hr_schedule', labelAr: 'ساعات وتأخيرات الدوام (HR)', labelEn: 'Shift & Shortage Audit', icon: FileSpreadsheet },
                  { id: 'payroll', labelAr: 'الرواتب والخصومات', labelEn: 'Payroll & Deductions', icon: DollarSign, badge: deductions.filter((d) => d.status === 'applied').length },
                  { id: 'analytics', labelAr: 'التقارير وسجل الحضور', labelEn: 'Reports & Analytics', icon: BarChart3 },
                  { id: 'admin_users', labelAr: 'إدارة الموظفين (HR)', labelEn: 'HR Directory', icon: Users, badge: users.length },
                  { id: 'calendar', labelAr: 'تقويم الفريق', labelEn: 'Calendar', icon: Calendar },
                  { id: 'advisor', labelAr: 'المستشار الذكي', labelEn: 'AI Advisor', icon: Sparkles },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id as any);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-right text-xs font-semibold transition ${
                        isActive
                          ? 'bg-[#5E7153] text-white border-[#5E7153] shadow-xs'
                          : 'bg-[#FAF9F6] text-[#2D3628] border-[#E5E2D9] hover:bg-[#EFECE4]'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate flex-1">{isAr ? tab.labelAr : tab.labelEn}</span>
                      {tab.badge !== undefined && tab.badge > 0 && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${isActive ? 'bg-[#45553C] text-white' : 'bg-[#E5E2D9] text-[#2D3628]'}`}>
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Desktop & Laptop Horizontal Tab Bar with Left/Right Scroll Controls */}
          <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 relative flex items-center">
            {/* Left Scroll Arrow (Desktop/Laptop) */}
            <button
              type="button"
              aria-label="Scroll left"
              onClick={() => scrollNav(isAr ? 'right' : 'left')}
              className="hidden lg:flex items-center justify-center w-7 h-7 rounded-full bg-white border border-[#E5E2D9] text-[#65635E] hover:text-[#2D3628] hover:bg-[#EFECE4] shadow-xs shrink-0 mx-1 z-10 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Scrollable Tabs Row */}
            <div
              ref={navScrollRef}
              className="flex-1 flex items-center gap-1 sm:gap-2 overflow-x-auto py-2.5 scroll-smooth text-xs sm:text-sm scrollbar-thin scrollbar-thumb-[#D9E0D2] scrollbar-track-transparent"
            >
              {[
                { id: 'dashboard', labelAr: 'الرئيسية', labelEn: 'Dashboard', icon: LayoutDashboard },
                { id: 'requests', labelAr: 'سجل الطلبات', labelEn: 'Requests', icon: ClipboardList, badge: requests.length },
                { id: 'approvals', labelAr: 'اعتمادات الفريق', labelEn: 'Team Approvals', icon: ShieldCheck, badge: pendingCount, highlightBadge: pendingCount > 0 },
                { id: 'biometric', labelAr: 'البصمة والحضور', labelEn: 'Attendance', icon: Fingerprint, badge: attendanceRecords.length },
                { id: 'hr_schedule', labelAr: 'كشف ساعات وتأخيرات الدوام', labelEn: 'Shift & Shortage Audit', icon: FileSpreadsheet, hrTag: true },
                { id: 'payroll', labelAr: 'الرواتب والخصومات', labelEn: 'Payroll & Deductions', icon: DollarSign, badge: deductions.filter((d) => d.status === 'applied').length, payrollTag: true },
                { id: 'analytics', labelAr: 'التقارير وسجل الحضور', labelEn: 'Reports & Analytics', icon: BarChart3 },
                { id: 'admin_users', labelAr: 'إدارة الموظفين (HR)', labelEn: 'HR Directory', icon: Users, hrTag: true, badge: users.length },
                { id: 'calendar', labelAr: 'تقويم الفريق', labelEn: 'Team Calendar', icon: Calendar },
                { id: 'advisor', labelAr: 'المستشار الذكي', labelEn: 'AI Advisor', icon: Sparkles, aiTag: true },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    id={`tab-nav-${tab.id}`}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold whitespace-nowrap transition-all shrink-0 ${
                      isActive
                        ? 'bg-[#5E7153] text-white shadow-md shadow-[#5E7153]/20 font-bold'
                        : 'text-[#65635E] hover:text-[#2D3628] hover:bg-[#EFECE4]'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{isAr ? tab.labelAr : tab.labelEn}</span>

                    {tab.payrollTag && !isActive && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] font-bold">
                        {isAr ? 'رواتب' : 'Payroll'}
                      </span>
                    )}

                    {tab.aiTag && !isActive && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#E9EDD9] text-[#384532] border border-[#D9E0D2]">
                        Gemini
                      </span>
                    )}

                    {tab.hrTag && !isActive && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#DBEAFE] text-[#1E40AF] border border-[#BFDBFE] font-bold">
                        HR
                      </span>
                    )}

                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                          isActive
                            ? 'bg-[#4B5B42] text-[#E9EDD9]'
                            : tab.highlightBadge
                            ? 'bg-[#E5AA70] text-[#2D3628] animate-pulse'
                            : 'bg-[#EFECE4] text-[#65635E]'
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Right Scroll Arrow (Desktop/Laptop) */}
            <button
              type="button"
              aria-label="Scroll right"
              onClick={() => scrollNav(isAr ? 'left' : 'right')}
              className="hidden lg:flex items-center justify-center w-7 h-7 rounded-full bg-white border border-[#E5E2D9] text-[#65635E] hover:text-[#2D3628] hover:bg-[#EFECE4] shadow-xs shrink-0 mx-1 z-10 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </nav>
      </div>

      {/* Main Body Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 md:pb-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in duration-150">
            {/* 1. Balances, Quick Actions, Status */}
            <ErrorBoundary sectionTitle={isAr ? 'بطاقات النظرة العامة والأرصدة' : 'Overview & Balances'}>
              <OverviewCards
                currentUser={currentUser}
                onOpenNewRequest={() => setIsNewRequestOpen(true)}
                onOpenCheckinModal={() => setIsCheckinOpen(true)}
                onOpenStandupModal={() => setIsStandupOpen(true)}
                onChangeWorkStatus={handleChangeWorkStatus}
                lang={lang}
              />
            </ErrorBoundary>

            {/* 2. Daily Task Reminder & Deadlines */}
            <ErrorBoundary sectionTitle={isAr ? 'مساعد المهام اليومية' : 'Daily Task Assistant'}>
              <DailyTaskReminder
                currentUser={currentUser}
                onUpdateTasks={handleUpdateDailyTasks}
                onOpenStandupModal={() => setIsStandupOpen(true)}
                lang={lang}
              />
            </ErrorBoundary>

            {/* 3. Requests Overview Table */}
            <ErrorBoundary sectionTitle={isAr ? 'سجل الطلبات' : 'Requests Overview'}>
              <RequestsList
                requests={requests}
                currentUser={currentUser}
                onCancelRequest={handleCancelRequest}
                onInterruptLeave={handleOpenInterruptModal}
                lang={lang}
              />
            </ErrorBoundary>

            {/* 4. Team Calendar preview */}
            <ErrorBoundary sectionTitle={isAr ? 'تقويم تواجد الفريق' : 'Team Calendar Preview'}>
              <TeamCalendarView
                requests={requests}
                teamMembers={teamMembers}
                lang={lang}
              />
            </ErrorBoundary>
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="animate-in fade-in duration-150">
            <ErrorBoundary sectionTitle={isAr ? 'سجل الطلبات والاعتمادات' : 'Requests & Approvals'}>
              <RequestsList
                requests={requests}
                currentUser={currentUser}
                onCancelRequest={handleCancelRequest}
                onInterruptLeave={handleOpenInterruptModal}
                lang={lang}
              />
            </ErrorBoundary>
          </div>
        )}

        {activeTab === 'approvals' && (
          <div className="animate-in fade-in duration-150">
            <ErrorBoundary sectionTitle={isAr ? 'مركز اعتمادات الإدارة' : 'Manager Approvals'}>
              <ManagerApprovalView
                pendingRequests={(requests || []).filter((r) => r?.status?.startsWith('pending'))}
                allRequests={requests}
                currentUser={currentUser}
                teamMembers={teamMembers}
                onApproveRequest={handleApproveRequest}
                onRejectRequest={handleRejectRequest}
                onInterruptLeave={handleOpenInterruptModal}
                lang={lang}
              />
            </ErrorBoundary>
          </div>
        )}

        {activeTab === 'admin_users' && (
          <div className="animate-in fade-in duration-150">
            <ErrorBoundary sectionTitle={isAr ? 'إدارة الموظفين والكوادر' : 'Employee Management'}>
              <HrEmployeeManagement
                users={users}
                currentUser={currentUser}
                onAddEmployee={handleAddEmployee}
                onUpdateEmployee={handleUpdateEmployee}
                onDeleteEmployee={handleDeleteEmployee}
                onSelectUser={handleSelectUser}
                onBatchUpdateBalances={handleBatchUpdateBalances}
                lang={lang}
              />
            </ErrorBoundary>
          </div>
        )}

        {activeTab === 'biometric' && (
          <div className="animate-in fade-in duration-150">
            <ErrorBoundary sectionTitle={isAr ? 'منظومة البصمة وأجهزة الدوام' : 'Biometric Attendance'}>
              <BiometricAttendanceView
                currentUser={currentUser}
                allUsers={users}
                attendanceRecords={attendanceRecords}
                biometricDevices={biometricDevices}
                companySchedule={companySchedule}
                onOpenScheduleModal={() => setIsCompanyScheduleModalOpen(true)}
                onRecordPunch={handleRecordPunch}
                onAddDevice={handleSaveBiometricDevice}
                lang={lang}
              />
            </ErrorBoundary>
          </div>
        )}

        {activeTab === 'hr_schedule' && (
          <div className="animate-in fade-in duration-150">
            <ErrorBoundary sectionTitle={isAr ? 'كشف ساعات وتأخيرات الدوام (HR)' : 'Shift & Shortage Audit'}>
              <HrWorkHoursReportView
                currentUser={currentUser}
                allUsers={users}
                attendanceRecords={attendanceRecords}
                companySchedule={companySchedule}
                onOpenScheduleModal={() => setIsCompanyScheduleModalOpen(true)}
                onRecordPunch={handleRecordPunch}
                lang={lang}
              />
            </ErrorBoundary>
          </div>
        )}

        {activeTab === 'payroll' && (
          <div className="animate-in fade-in duration-150">
            <ErrorBoundary sectionTitle={isAr ? 'مسير الرواتب والخصومات' : 'Payroll & Deductions'}>
              <PayrollAndDeductionsView
                currentUser={currentUser}
                allUsers={users}
                attendanceRecords={attendanceRecords}
                deductions={deductions}
                salaryAdvances={salaryAdvances}
                onSaveDeduction={handleSaveDeduction}
                onWaiveDeduction={handleWaiveDeduction}
                onRestoreDeduction={handleRestoreDeduction}
                onWaiveAttendanceLate={handleWaiveAttendanceLate}
                onRestoreAttendanceLate={handleRestoreAttendanceLate}
                onUpdateUserSalary={handleUpdateUserSalary}
                onSaveAdvance={handleSaveSalaryAdvance}
                onUpdateUser={handleUpdateUser}
                lang={lang}
              />
            </ErrorBoundary>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="animate-in fade-in duration-150">
            <ErrorBoundary sectionTitle={isAr ? 'تقويم الفريق والغياب' : 'Team Calendar'}>
              <TeamCalendarView
                requests={requests}
                teamMembers={teamMembers}
                lang={lang}
              />
            </ErrorBoundary>
          </div>
        )}

        {activeTab === 'advisor' && (
          <div className="animate-in fade-in duration-150">
            <ErrorBoundary sectionTitle={isAr ? 'المستشار الذكي لسياسات العمل' : 'AI Policy Advisor'}>
              <AiPolicyAdvisor
                currentUser={currentUser}
                companySchedule={companySchedule}
                lang={lang}
              />
            </ErrorBoundary>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="animate-in fade-in duration-150">
            <ErrorBoundary sectionTitle={isAr ? 'تحليلات الحضور والعمل عن بُعد' : 'Analytics & Insights'}>
              <AnalyticsView
                requests={requests}
                users={users}
                currentUser={currentUser}
                lang={lang}
              />
            </ErrorBoundary>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#EFECE4] border-t border-[#E5E2D9] py-6 text-xs text-[#65635E] pb-20 md:pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#D9E0D2] text-[#2D3628] flex items-center justify-center font-bold text-xs">
              D
            </div>
            <span className="text-[#2D3628] font-semibold">
              {isAr ? 'منظومة دوامي الذكية (Dawamy Platform)' : 'Dawamy Smart Platform'}
            </span>
            <span className="text-[#C8C4B7]">|</span>
            <span className="text-[#65635E]">
              {isAr ? 'إدارة العمل عن بُعد والإجازات المرنة' : 'Remote Work & Flexible Leave Management'}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-[#65635E]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#5E7153]" />
              <span>{isAr ? 'نظام معتمد لإدارة الموارد البشرية' : 'Enterprise HR Management System'}</span>
            </span>
            <span>•</span>
            <span className="text-[#5E7153] font-semibold">Powered by Gemini 3.7 Flash</span>
          </div>
        </div>
      </footer>

      {/* 3. Mobile Bottom Quick Floating Navigation Dock (App-Like 1-Touch Access) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FAF9F6]/95 backdrop-blur-lg border-t border-[#E5E2D9] px-2 py-1 shadow-2xl flex items-center justify-around">
        {[
          { id: 'dashboard', labelAr: 'الرئيسية', labelEn: 'Home', icon: LayoutDashboard },
          { id: 'requests', labelAr: 'الطلبات', labelEn: 'Requests', icon: ClipboardList, badge: requests.length },
          { id: 'biometric', labelAr: 'البصمة', labelEn: 'Punch', icon: Fingerprint },
          { id: 'payroll', labelAr: 'الرواتب', labelEn: 'Payroll', icon: DollarSign },
          { id: 'analytics', labelAr: 'التقارير', labelEn: 'Reports', icon: BarChart3 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setIsMobileMenuOpen(false);
              }}
              className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl text-[10px] font-bold transition relative ${
                isActive ? 'text-[#5E7153]' : 'text-[#65635E] hover:text-[#2D3628]'
              }`}
            >
              <div className={`p-1 rounded-lg ${isActive ? 'bg-[#E9EDD9] text-[#2D3628]' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="mt-0.5 whitespace-nowrap">{isAr ? tab.labelAr : tab.labelEn}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-[#E5AA70]" />
              )}
            </button>
          );
        })}

        {/* More Menu Toggle Button on Mobile Dock */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl text-[10px] font-bold transition ${
            isMobileMenuOpen ? 'text-[#5E7153]' : 'text-[#65635E] hover:text-[#2D3628]'
          }`}
        >
          <div className={`p-1 rounded-lg ${isMobileMenuOpen ? 'bg-[#E9EDD9] text-[#2D3628]' : ''}`}>
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </div>
          <span className="mt-0.5 whitespace-nowrap">{isAr ? 'المزيد' : 'More'}</span>
        </button>
      </div>

      {/* Modals */}
      <NewRequestModal
        isOpen={isNewRequestOpen}
        onClose={() => setIsNewRequestOpen(false)}
        currentUser={currentUser}
        teamMembers={teamMembers}
        existingRequests={requests}
        onSubmitRequest={handleSubmitRequest}
        lang={lang}
      />

      <InterruptLeaveModal
        isOpen={isInterruptModalOpen}
        onClose={() => {
          setIsInterruptModalOpen(false);
          setSelectedRequestToInterrupt(null);
        }}
        request={selectedRequestToInterrupt}
        currentUser={currentUser}
        onConfirmInterrupt={handleConfirmInterruptLeave}
        lang={lang}
      />

      <VirtualCheckinModal
        isOpen={isCheckinOpen}
        onClose={() => setIsCheckinOpen(false)}
        currentUser={currentUser}
        onConfirmCheckin={handleConfirmCheckin}
        lang={lang}
      />

      <AiStandupGenerator
        isOpen={isStandupOpen}
        onClose={() => setIsStandupOpen(false)}
        currentUser={currentUser}
        onSyncTasksToReminder={handleUpdateDailyTasks}
        lang={lang}
      />

      <CompanyScheduleModal
        isOpen={isCompanyScheduleModalOpen}
        onClose={() => setIsCompanyScheduleModalOpen(false)}
        currentSchedule={companySchedule}
        onSaveSchedule={handleSaveCompanySchedule}
        lang={lang}
      />

      <AuthDomainHelpModal
        isOpen={isAuthDomainModalOpen}
        onClose={() => setIsAuthDomainModalOpen(false)}
        lang={lang}
        hostname={authDomainHostname}
        onUseDemoRole={() => {
          setIsAuthDomainModalOpen(false);
          showToast(
            isAr ? 'يمكنك التبديل بين ملفات الموظفين والمديرين من القائمة العلوية' : 'You can switch between employee and manager profiles from the top menu',
            'info'
          );
        }}
      />

      <DigitalSignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        currentUser={currentUser}
        onSaveSignature={async (signatureDataUrl, signatureType, signatureJobTitle) => {
          const updatedUser: UserProfile = {
            ...currentUser,
            signatureDataUrl,
            signatureType,
            signatureJobTitle: signatureJobTitle || currentUser.title,
            signatureUpdatedAt: new Date().toISOString(),
          };
          const ok = await handleUpdateUser(updatedUser);
          if (ok) {
            setIsSignatureModalOpen(false);
          }
          return ok;
        }}
        lang={lang}
      />

    </div>
  );
}
