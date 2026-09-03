import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import {
  UserProfile,
  UserRole,
  LeaveOrWfhRequest,
  TeamMemberStatus,
  NotificationItem,
  WorkStatus,
  DailyTaskItem,
} from './types';
import {
  INITIAL_USERS,
  INITIAL_REQUESTS,
  INITIAL_TEAM_MEMBERS,
  INITIAL_NOTIFICATIONS,
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
import { NewRequestModal } from './components/NewRequestModal';
import { VirtualCheckinModal } from './components/VirtualCheckinModal';
import { AuthDomainHelpModal } from './components/AuthDomainHelpModal';
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
  saveVirtualCheckIn,
  loginWithGoogle,
  logoutUser,
  auth as firebaseAuth,
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
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    return localStorage.getItem('dawamy_current_user') || 'emp-1';
  });

  const [requests, setRequests] = useState<LeaveOrWfhRequest[]>(() => {
    const saved = localStorage.getItem('dawamy_requests');
    return saved ? JSON.parse(saved) : INITIAL_REQUESTS;
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

  // Active Tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'requests' | 'approvals' | 'calendar' | 'advisor' | 'analytics' | 'admin_users'>('dashboard');

  // Modals
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [isCheckinOpen, setIsCheckinOpen] = useState(false);
  const [isStandupOpen, setIsStandupOpen] = useState(false);
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

    return () => {
      unsubscribeAuth();
      unsubscribeReqs();
      unsubscribeUsers();
      unsubscribeNotifs();
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
      <div className="sticky top-0 z-40 bg-[#FAF9F6] border-b border-[#E5E2D9] shadow-xs">
        <Header
          currentUser={currentUser}
          allUsers={users}
          onSelectUser={handleSelectUser}
          notifications={notifications}
          onMarkNotificationAsRead={(id) => {
            setNotifications(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)));
            markNotificationAsReadInFirestore(id).catch((e) => console.warn(e));
          }}
          onClearNotifications={() => setNotifications([])}
          lang={lang}
          onToggleLang={() => setLang(lang === 'ar' ? 'en' : 'ar')}
          firebaseAuthUser={firebaseAuthUser}
        />

        {/* Main Navigation Bar */}
        <nav className="bg-[#FAF9F6]/95 border-t border-[#E5E2D9]/60 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-2.5 scrollbar-none text-xs sm:text-sm">
              {[
                { id: 'dashboard', labelAr: 'الرئيسية (لوحة التحكم)', labelEn: 'Dashboard', icon: LayoutDashboard },
                { id: 'requests', labelAr: 'سجل الطلبات', labelEn: 'Requests Log', icon: ClipboardList, badge: requests.length },
                { id: 'approvals', labelAr: 'اعتمادات الفريق', labelEn: 'Team Approvals', icon: ShieldCheck, badge: pendingCount, highlightBadge: pendingCount > 0 },
                { id: 'admin_users', labelAr: 'إدارة الموظفين (HR)', labelEn: 'HR & Directory', icon: Users, hrTag: true, badge: users.length },
                { id: 'calendar', labelAr: 'تقويم الفريق والتغطية', labelEn: 'Team Calendar', icon: Calendar },
                { id: 'advisor', labelAr: 'المستشار الذكي للوائح', labelEn: 'AI Policy Advisor', icon: Sparkles, aiTag: true },
                { id: 'analytics', labelAr: 'التقارير وسجل الحضور', labelEn: 'Analytics & Reports', icon: BarChart3 },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    id={`tab-nav-${tab.id}`}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-[#5E7153] text-white shadow-md shadow-[#5E7153]/20 font-bold'
                        : 'text-[#65635E] hover:text-[#2D3628] hover:bg-[#EFECE4]'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{isAr ? tab.labelAr : tab.labelEn}</span>

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

                    {tab.badge !== undefined && (
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
          </div>
        </nav>
      </div>

      {/* Main Body Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in duration-150">
            {/* 1. Balances, Quick Actions, Status */}
            <OverviewCards
              currentUser={currentUser}
              onOpenNewRequest={() => setIsNewRequestOpen(true)}
              onOpenCheckinModal={() => setIsCheckinOpen(true)}
              onOpenStandupModal={() => setIsStandupOpen(true)}
              onChangeWorkStatus={handleChangeWorkStatus}
              lang={lang}
            />

            {/* 2. Daily Task Reminder & Deadlines */}
            <DailyTaskReminder
              currentUser={currentUser}
              onUpdateTasks={handleUpdateDailyTasks}
              onOpenStandupModal={() => setIsStandupOpen(true)}
              lang={lang}
            />

            {/* 3. Requests Overview Table */}
            <RequestsList
              requests={requests}
              currentUser={currentUser}
              onCancelRequest={handleCancelRequest}
              lang={lang}
            />

            {/* 4. Team Calendar preview */}
            <TeamCalendarView
              requests={requests}
              teamMembers={teamMembers}
              lang={lang}
            />
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="animate-in fade-in duration-150">
            <RequestsList
              requests={requests}
              currentUser={currentUser}
              onCancelRequest={handleCancelRequest}
              lang={lang}
            />
          </div>
        )}

        {activeTab === 'approvals' && (
          <div className="animate-in fade-in duration-150">
            <ManagerApprovalView
              pendingRequests={requests.filter((r) => r.status.startsWith('pending'))}
              currentUser={currentUser}
              teamMembers={teamMembers}
              onApproveRequest={handleApproveRequest}
              onRejectRequest={handleRejectRequest}
              lang={lang}
            />
          </div>
        )}

        {activeTab === 'admin_users' && (
          <div className="animate-in fade-in duration-150">
            <HrEmployeeManagement
              users={users}
              currentUser={currentUser}
              onAddEmployee={handleAddEmployee}
              onUpdateEmployee={handleUpdateEmployee}
              onDeleteEmployee={handleDeleteEmployee}
              onSelectUser={handleSelectUser}
              lang={lang}
            />
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="animate-in fade-in duration-150">
            <TeamCalendarView
              requests={requests}
              teamMembers={teamMembers}
              lang={lang}
            />
          </div>
        )}

        {activeTab === 'advisor' && (
          <div className="animate-in fade-in duration-150">
            <AiPolicyAdvisor
              currentUser={currentUser}
              lang={lang}
            />
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="animate-in fade-in duration-150">
            <AnalyticsView
              requests={requests}
              users={users}
              currentUser={currentUser}
              lang={lang}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#EFECE4] border-t border-[#E5E2D9] py-6 text-xs text-[#65635E]">
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

      {/* Modals */}
      <NewRequestModal
        isOpen={isNewRequestOpen}
        onClose={() => setIsNewRequestOpen(false)}
        currentUser={currentUser}
        teamMembers={teamMembers}
        onSubmitRequest={handleSubmitRequest}
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

    </div>
  );
}
