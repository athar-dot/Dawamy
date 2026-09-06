import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  CalendarDays,
  Bell,
  CheckCircle2,
  Sparkles,
  UserCheck,
  ShieldCheck,
  Languages,
  X,
  CheckCheck,
  Clock,
  AlertCircle,
  ExternalLink,
  PenTool,
} from 'lucide-react';
import { UserProfile, UserRole, NotificationItem } from '../types';

interface HeaderProps {
  currentUser: UserProfile;
  allUsers: UserProfile[];
  onSelectUser: (user: UserProfile) => void;
  onToggleCurrentUserRole?: () => void;
  notifications: NotificationItem[];
  onMarkNotificationAsRead: (id: string) => void;
  onMarkAllNotificationsAsRead?: () => void;
  onNotificationClick?: (notif: NotificationItem) => void;
  onClearNotifications: () => void;
  lang: 'ar' | 'en';
  onToggleLang: () => void;
  serverStatus?: { status: string; port?: number; host?: string };
  isFirebaseConnected?: boolean;
  onGoogleSignIn?: () => void;
  onGoogleSignOut?: () => void;
  firebaseAuthUser?: { email: string | null; displayName: string | null; photoURL?: string | null; uid?: string } | null;
  onOpenSignatureModal?: () => void;
  onOpenScheduleModal?: () => void;
}

function safeFormatNotifTimestamp(timestamp: unknown, isAr: boolean): string {
  if (!timestamp) return isAr ? 'الآن' : 'Just now';
  if (typeof timestamp === 'string') return timestamp;
  if (typeof timestamp === 'number') {
    try {
      const d = new Date(timestamp);
      return d.toLocaleTimeString(isAr ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isAr ? 'الآن' : 'Just now';
    }
  }
  if (typeof timestamp === 'object' && timestamp !== null) {
    const obj = timestamp as { seconds?: number; toDate?: () => Date };
    if (typeof obj.toDate === 'function') {
      try {
        const d = obj.toDate();
        return d.toLocaleDateString(isAr ? 'ar-SA' : 'en-US', {
          hour: '2-digit',
          minute: '2-digit',
          month: 'short',
          day: 'numeric',
        });
      } catch {
        return isAr ? 'الآن' : 'Just now';
      }
    }
    if (typeof obj.seconds === 'number') {
      try {
        const d = new Date(obj.seconds * 1000);
        return d.toLocaleDateString(isAr ? 'ar-SA' : 'en-US', {
          hour: '2-digit',
          minute: '2-digit',
          month: 'short',
          day: 'numeric',
        });
      } catch {
        return isAr ? 'الآن' : 'Just now';
      }
    }
  }
  return isAr ? 'الآن' : 'Just now';
}

function safeText(val: unknown, fallback: string = ''): string {
  if (typeof val === 'string') return val;
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  return fallback;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  allUsers,
  onSelectUser,
  onToggleCurrentUserRole,
  notifications,
  onMarkNotificationAsRead,
  onMarkAllNotificationsAsRead,
  onNotificationClick,
  onClearNotifications,
  lang,
  onToggleLang,
  serverStatus,
  isFirebaseConnected = true,
  onGoogleSignIn,
  onGoogleSignOut,
  firebaseAuthUser,
  onOpenSignatureModal,
  onOpenScheduleModal,
}) => {
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread'>('all');
  const [currentTime, setCurrentTime] = useState('');
  const notifRef = useRef<HTMLDivElement>(null);

  // Close notifications dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifs(false);
      }
    };
    if (showNotifs) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifs]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString(lang === 'ar' ? 'ar-SA' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      const dateStr = now.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      setCurrentTime(`${dateStr} • ${timeStr}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [lang]);

  const safeNotifications = Array.isArray(notifications)
    ? notifications.filter((n): n is NotificationItem => Boolean(n && typeof n === 'object' && n.id))
    : [];
  const unreadCount = safeNotifications.filter((n) => !n.read).length;
  const filteredNotifications = notifFilter === 'unread'
    ? safeNotifications.filter((n) => !n.read)
    : safeNotifications;
  const isAr = lang === 'ar';

  const handleNotificationClick = (notif: NotificationItem) => {
    try {
      if (!notif.read) {
        onMarkNotificationAsRead(notif.id);
      }
      if (onNotificationClick) {
        onNotificationClick(notif);
        setShowNotifs(false);
      }
    } catch (e) {
      console.warn('Error on notification click:', e);
    }
  };

  const getNotificationIcon = (type?: string) => {
    switch (type) {
      case 'approval':
        return <CheckCircle2 className="w-4 h-4 text-[#5E7153] shrink-0 mt-0.5" />;
      case 'rejection':
        return <AlertCircle className="w-4 h-4 text-[#B85C4F] shrink-0 mt-0.5" />;
      case 'request':
        return <Clock className="w-4 h-4 text-[#C98A4B] shrink-0 mt-0.5" />;
      default:
        return <Bell className="w-4 h-4 text-[#5E7153] shrink-0 mt-0.5" />;
    }
  };

  return (
    <header className="relative z-30 w-full bg-[#FAF9F6]/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
          
          {/* Brand Logo & Server Badge */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="relative flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-tr from-[#5E7153] to-[#7D946F] text-white font-bold shadow-md shadow-[#5E7153]/20">
              <Building2 className="w-6 h-6 text-white" />
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-[#5E7153] border-2 border-[#FAF9F6] rounded-full animate-pulse" />
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-[#2D3628] via-[#5E7153] to-[#384532] bg-clip-text text-transparent">
                  {isAr ? 'دوامــي' : 'Dawamy'}
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full bg-[#E9EDD9] text-[#2D3628] border border-[#D9E0D2]">
                  <Sparkles className="w-3 h-3 mr-1 ml-1 text-[#5E7153]" />
                  {isAr ? 'منظومة العمل المرن' : 'Smart Hybrid Work'}
                </span>
              </div>
              <p className="hidden md:block text-xs text-[#65635E] truncate">
                {isAr ? 'منصة إدارة العمل عن بُعد وطلبات الإجازات الذكية' : 'Remote Work & Smart Leave Management Platform'}
              </p>
            </div>
          </div>

          {/* Center Info: Subtle live date & time */}
          <div className="hidden lg:flex items-center">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EFECE4] border border-[#E5E2D9] text-xs text-[#43423E]">
              <CalendarDays className="w-3.5 h-3.5 text-[#5E7153]" />
              <span>{currentTime}</span>
            </div>
          </div>

          {/* Right Controls: Language, Notifications, Profile */}
          <div className="flex items-center gap-2 sm:gap-3">

            {/* Language toggle (Bilingual Segmented Switcher) */}
            <div className="flex items-center bg-[#EFECE4] p-1 rounded-xl border border-[#E5E2D9]">
              <button
                id="btn-lang-ar"
                onClick={() => lang !== 'ar' && onToggleLang()}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  isAr
                    ? 'bg-[#5E7153] text-white shadow-sm'
                    : 'text-[#65635E] hover:text-[#2D3628] hover:bg-[#E5E2D9]'
                }`}
                title="التحويل للغة العربية"
              >
                العربية
              </button>
              <button
                id="btn-lang-en"
                onClick={() => lang !== 'en' && onToggleLang()}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  !isAr
                    ? 'bg-[#5E7153] text-white shadow-sm'
                    : 'text-[#65635E] hover:text-[#2D3628] hover:bg-[#E5E2D9]'
                }`}
                title="Switch to English"
              >
                English
              </button>
            </div>

            {/* Notifications trigger */}
            <div ref={notifRef} className="relative z-50">
              <button
                id="btn-notifications-trigger"
                onClick={() => setShowNotifs(!showNotifs)}
                className="relative p-2 rounded-xl bg-[#EFECE4] hover:bg-[#E5E2D9] text-[#43423E] hover:text-[#2D3628] border border-[#E5E2D9] transition cursor-pointer"
                title={isAr ? 'الإشعارات والتنبيهات' : 'Notifications'}
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-[#B85C4F] text-white font-bold text-[10px] rounded-full flex items-center justify-center shadow-xs animate-pulse">
                    {unreadCount > 9 ? '+9' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popup Dropdown */}
              {showNotifs && (
                <div 
                  id="notifications-dropdown-panel"
                  className={`fixed sm:absolute top-16 sm:top-full sm:mt-2 inset-x-3 sm:inset-x-auto ${
                    isAr ? 'sm:left-0' : 'sm:right-0'
                  } sm:w-96 max-w-sm sm:max-w-none bg-[#FAF9F6] border border-[#E5E2D9] rounded-2xl shadow-2xl p-4 z-[100] ${
                    isAr ? 'text-right' : 'text-left'
                  } animate-in fade-in slide-in-from-top-2 duration-150`}
                >
                  <div className="flex items-center justify-between pb-3 border-b border-[#E5E2D9]">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-lg bg-[#E9EDD9] text-[#5E7153]">
                        <Bell className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-sm text-[#2D3628]">
                        {isAr ? 'مركز الإشعارات والتنبيهات' : 'Notifications Center'}
                      </span>
                      {unreadCount > 0 && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#B85C4F]/10 text-[#B85C4F] border border-[#B85C4F]/20">
                          {unreadCount} {isAr ? 'غير مقروء' : 'unread'}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setShowNotifs(false)}
                      className="text-[#65635E] hover:text-[#2D3628] p-1 rounded-lg hover:bg-[#EFECE4] transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Filter Sub-Tabs */}
                  <div className="flex items-center gap-1.5 my-2.5 p-1 bg-[#EFECE4] rounded-xl border border-[#E5E2D9] text-xs font-semibold">
                    <button
                      onClick={() => setNotifFilter('all')}
                      className={`flex-1 py-1 px-2 rounded-lg transition text-center cursor-pointer ${
                        notifFilter === 'all'
                          ? 'bg-white text-[#2D3628] shadow-xs'
                          : 'text-[#65635E] hover:text-[#2D3628]'
                      }`}
                    >
                      {isAr ? 'الكل' : 'All'} ({safeNotifications.length})
                    </button>
                    <button
                      onClick={() => setNotifFilter('unread')}
                      className={`flex-1 py-1 px-2 rounded-lg transition text-center cursor-pointer ${
                        notifFilter === 'unread'
                          ? 'bg-white text-[#2D3628] shadow-xs'
                          : 'text-[#65635E] hover:text-[#2D3628]'
                      }`}
                    >
                      {isAr ? 'غير المقروءة' : 'Unread'} ({unreadCount})
                    </button>
                  </div>

                  <div className="divide-y divide-[#E5E2D9] max-h-80 overflow-y-auto my-1 pr-0.5">
                    {filteredNotifications.length === 0 ? (
                      <div className="py-8 text-center space-y-2">
                        <div className="w-10 h-10 rounded-full bg-[#EFECE4] flex items-center justify-center mx-auto text-[#65635E]">
                          <Bell className="w-5 h-5" />
                        </div>
                        <p className="text-xs text-[#65635E] font-medium">
                          {notifFilter === 'unread'
                            ? (isAr ? 'لا توجد إشعارات غير مقروءة' : 'No unread notifications')
                            : (isAr ? 'لا توجد إشعارات حالياً' : 'No notifications yet')}
                        </p>
                      </div>
                    ) : (
                      filteredNotifications.map((notif) => {
                        const titleText = safeText(isAr ? notif.title : (notif.titleEn || notif.title), isAr ? 'إشعار' : 'Notification');
                        const messageText = safeText(isAr ? notif.message : (notif.messageEn || notif.message));
                        const timeStr = safeFormatNotifTimestamp(notif.timestamp, isAr);

                        return (
                          <div
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif)}
                            className={`p-3 rounded-xl transition cursor-pointer hover:bg-[#EFECE4] group my-1 ${
                              !notif.read ? 'bg-[#E9EDD9]/45 border border-[#D9E0D2]' : 'bg-transparent'
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              {getNotificationIcon(notif.type)}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <h4 className="text-xs font-bold text-[#2D3628] truncate">
                                    {titleText}
                                  </h4>
                                  <span className="text-[10px] text-[#86837C] whitespace-nowrap shrink-0">
                                    {timeStr}
                                  </span>
                                </div>
                                <p className="text-[11px] text-[#5A5852] mt-1 leading-relaxed line-clamp-2">
                                  {messageText}
                                </p>
                                {notif.requestId && (
                                  <div className="mt-1.5 flex items-center gap-1.5">
                                    <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-white border border-[#D9E0D2] text-[#5E7153]">
                                      <span>#{notif.requestId}</span>
                                      <ExternalLink className="w-2.5 h-2.5" />
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {safeNotifications.length > 0 && (
                    <div className="pt-2.5 mt-1 border-t border-[#E5E2D9] flex items-center justify-between text-xs">
                      {unreadCount > 0 && onMarkAllNotificationsAsRead ? (
                        <button
                          type="button"
                          onClick={() => {
                            try {
                              onMarkAllNotificationsAsRead();
                            } catch (e) {
                              console.warn(e);
                            }
                          }}
                          className="flex items-center gap-1 text-[#5E7153] hover:text-[#4A5A41] transition font-semibold cursor-pointer"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span>{isAr ? 'تحديد الكل كمقروء' : 'Mark all read'}</span>
                        </button>
                      ) : <span />}

                      <button
                        type="button"
                        onClick={() => {
                          try {
                            onClearNotifications();
                          } catch (e) {
                            console.warn(e);
                          }
                        }}
                        className="text-[#86837C] hover:text-[#B85C4F] transition font-medium cursor-pointer"
                      >
                        {isAr ? 'مسح الكل' : 'Clear all'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Digital Signature Button (توقيع الحساب المعتمد للتقارير) */}
            {onOpenSignatureModal && (
              <button
                type="button"
                id="btn-header-signature"
                onClick={onOpenSignatureModal}
                title={
                  currentUser.signatureDataUrl
                    ? isAr
                      ? 'التوقيع الرقمي معتمد - اضغط للتعديل'
                      : 'Digital Signature active - click to edit'
                    : isAr
                    ? 'إضافة توقيعك الرقمي للتقارير والمسيرات'
                    : 'Add digital signature for reports'
                }
                className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow-xs cursor-pointer ${
                  currentUser.signatureDataUrl
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                    : 'bg-[#FAF9F6] border-[#E5E2D9] text-[#5E7153] hover:bg-[#EFECE4]'
                }`}
              >
                <PenTool className="w-3.5 h-3.5" />
                <span className="truncate max-w-[100px]">
                  {currentUser.signatureDataUrl
                    ? isAr
                      ? 'توقيعي المعتمد'
                      : 'My Signature'
                    : isAr
                    ? 'إضافة توقيع'
                    : 'Set Signature'}
                </span>
                {currentUser.signatureDataUrl && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                )}
              </button>
            )}

            {/* Company Logo & Identity Settings Button */}
            {onOpenScheduleModal && (
              <button
                type="button"
                id="btn-header-company-identity"
                onClick={onOpenScheduleModal}
                title={isAr ? 'شعار، ختم وبيانات الشركة (تظهر في التقارير والسندات)' : 'Company Logo, Stamp & Official Details'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E9EDD9] hover:bg-[#D9E0D2] text-[#2D3628] border border-[#D9E0D2] text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <Building2 className="w-3.5 h-3.5 text-[#5E7153]" />
                <span className="hidden sm:inline-block">
                  {isAr ? 'شعار وبيانات الشركة' : 'Company Logo & Data'}
                </span>
                <span className="inline-block sm:hidden">
                  {isAr ? 'الشركة' : 'Company'}
                </span>
              </button>
            )}

            {/* Current Active User Profile Pill */}
            <div 
              className={`flex items-center gap-2.5 pl-1 pr-2.5 py-1 rounded-xl border transition ${
                firebaseAuthUser
                  ? 'bg-[#E9EDD9]/80 border-[#D9E0D2] shadow-sm'
                  : 'bg-[#EFECE4] border-[#E5E2D9]'
              }`}
              title={currentUser.email ? `${currentUser.name} (${currentUser.email})` : currentUser.name}
            >
              <div className="relative">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-lg object-cover border border-[#5E7153]/50 bg-[#E5E2D9]"
                  onError={(e) => {
                    // Fallback to stylized initial avatar if photoURL blocked or broken
                    const target = e.currentTarget;
                    const initial = encodeURIComponent(currentUser.name?.charAt(0) || 'U');
                    target.src = `https://ui-avatars.com/api/?name=${initial}&background=5E7153&color=fff&bold=true`;
                  }}
                />
                {firebaseAuthUser && (
                  <span 
                    className="absolute -top-1 -right-1 w-3 h-3 bg-[#5E7153] border-2 border-white rounded-full flex items-center justify-center text-[7px] text-white" 
                    title="Google Verified"
                  >
                    ✓
                  </span>
                )}
              </div>
              <div className="hidden sm:block text-right">
                <div className="text-xs font-bold text-[#2D3628] leading-tight flex items-center gap-1.5">
                  <span className="truncate max-w-[110px]">
                    {isAr ? currentUser.name : (currentUser.nameEn || currentUser.name)}
                  </span>
                  {currentUser.role === 'manager' && (
                    <span className="text-[9px] bg-[#5E7153] text-white px-1.5 py-0.2 rounded font-bold uppercase tracking-wider" title="Manager / Admin">
                      Admin
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-[#5E7153] font-medium truncate max-w-[130px] flex items-center gap-1">
                  <span>
                    {currentUser.role === 'manager'
                      ? (isAr ? 'المدير المباشر (Admin)' : 'Team Lead (Admin)')
                      : currentUser.role === 'hr'
                      ? (isAr ? 'الموارد البشرية (HR)' : 'HR Admin')
                      : (isAr ? 'الموظف (Employee)' : 'Employee')}
                  </span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </header>
  );
};
