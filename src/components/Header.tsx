import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { UserProfile, UserRole, NotificationItem } from '../types';

interface HeaderProps {
  currentUser: UserProfile;
  allUsers: UserProfile[];
  onSelectUser: (user: UserProfile) => void;
  onToggleCurrentUserRole?: () => void;
  notifications: NotificationItem[];
  onMarkNotificationAsRead: (id: string) => void;
  onClearNotifications: () => void;
  lang: 'ar' | 'en';
  onToggleLang: () => void;
  serverStatus?: { status: string; port?: number; host?: string };
  isFirebaseConnected?: boolean;
  onGoogleSignIn?: () => void;
  onGoogleSignOut?: () => void;
  firebaseAuthUser?: { email: string | null; displayName: string | null; photoURL?: string | null; uid?: string } | null;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  allUsers,
  onSelectUser,
  onToggleCurrentUserRole,
  notifications,
  onMarkNotificationAsRead,
  onClearNotifications,
  lang,
  onToggleLang,
  serverStatus,
  isFirebaseConnected = true,
  onGoogleSignIn,
  onGoogleSignOut,
  firebaseAuthUser,
}) => {
  const [showNotifs, setShowNotifs] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

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

  const unreadCount = notifications.filter((n) => !n.read).length;
  const isAr = lang === 'ar';

  return (
    <header className="w-full bg-[#FAF9F6]/95 backdrop-blur-md">
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
            <div className="relative">
              <button
                id="btn-notifications-trigger"
                onClick={() => setShowNotifs(!showNotifs)}
                className="relative p-2 rounded-lg bg-[#EFECE4] hover:bg-[#E5E2D9] text-[#43423E] hover:text-[#2D3628] border border-[#E5E2D9] transition"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#E5AA70] text-[#2D3628] font-bold text-[10px] rounded-full flex items-center justify-center animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popup Dropdown */}
              {showNotifs && (
                <div className={`absolute ${isAr ? 'left-0' : 'right-0'} mt-2 w-80 sm:w-96 bg-[#FAF9F6] border border-[#E5E2D9] rounded-2xl shadow-2xl p-4 z-50 ${isAr ? 'text-right' : 'text-left'} animate-in fade-in slide-in-from-top-2 duration-150`}>
                  <div className="flex items-center justify-between pb-3 border-b border-[#E5E2D9]">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-[#5E7153]" />
                      <span className="font-semibold text-sm text-[#2D3628]">
                        {isAr ? 'مركز الإشعارات والتنبيهات' : 'Notifications Center'}
                      </span>
                      {unreadCount > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E9EDD9] text-[#2D3628] border border-[#D9E0D2]">
                          {unreadCount} {isAr ? 'جديد' : 'new'}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setShowNotifs(false)}
                      className="text-[#65635E] hover:text-[#2D3628] p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="divide-y divide-[#E5E2D9] max-h-72 overflow-y-auto my-2">
                    {notifications.length === 0 ? (
                      <p className="text-center py-6 text-xs text-[#65635E]">
                        {isAr ? 'لا توجد إشعارات جديدة حالياً' : 'No notifications yet'}
                      </p>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => onMarkNotificationAsRead(notif.id)}
                          className={`p-3 rounded-xl transition cursor-pointer hover:bg-[#EFECE4] ${
                            !notif.read ? 'bg-[#E9EDD9]/40 border border-[#D9E0D2]' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-xs font-semibold text-[#2D3628]">
                              {isAr ? notif.title : (notif.titleEn || notif.title)}
                            </h4>
                            <span className="text-[10px] text-[#65635E] whitespace-nowrap">
                              {notif.timestamp}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#5A5852] mt-1 leading-relaxed">
                            {isAr ? notif.message : (notif.messageEn || notif.message)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  {notifications.length > 0 && (
                    <div className="pt-2 border-t border-[#E5E2D9] flex justify-end">
                      <button
                        onClick={onClearNotifications}
                        className="text-xs text-[#5E7153] hover:text-[#4B5B42] transition font-medium"
                      >
                        {isAr ? 'مسح الكل' : 'Clear all'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

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
