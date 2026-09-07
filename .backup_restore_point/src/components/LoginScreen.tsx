import React, { useState, useEffect } from 'react';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  LogIn,
  Languages,
  ShieldCheck,
  Database,
  CheckCircle2,
} from 'lucide-react';
import { UserProfile } from '../types';
import { api } from '../services/api';

interface LoginScreenProps {
  allUsers: UserProfile[];
  onLoginSuccess: (userId: string, authUser?: any) => void;
  lang: 'ar' | 'en';
  onToggleLang: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  allUsers,
  onLoginSuccess,
  lang,
  onToggleLang,
}) => {
  const isAr = lang === 'ar';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'offline'>('checking');

  // Check health and DB connectivity on load
  useEffect(() => {
    api.checkHealth().then((health) => {
      if (health && health.status === 'ok') {
        setDbStatus('connected');
      } else {
        setDbStatus('offline');
      }
    });
  }, []);

  // Standard Seed Accounts in PostgreSQL
  const demoAccounts = [
    {
      id: 'emp-1',
      name: 'سارة المنصور',
      nameEn: 'Sara Mansoor',
      email: 'sara.mansoor@dawamy.app',
      password: 'Sara@123',
      role: 'employee',
      title: 'مهندسة برمجيات أولى',
      titleEn: 'Senior Software Engineer',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    },
    {
      id: 'emp-2',
      name: 'طارق الخالدي',
      nameEn: 'Tariq Al-Khalidi',
      email: 'tariq.manager@dawamy.app',
      password: 'Tariq@123',
      role: 'manager',
      title: 'مدير الفريق الهندسي المباشر',
      titleEn: 'Engineering Lead & Direct Manager',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    },
    {
      id: 'emp-3',
      name: 'ريم العتيبي',
      nameEn: 'Reem Al-Otaibi',
      email: 'reem.hr@dawamy.app',
      password: 'Reem@123',
      role: 'hr',
      title: 'أخصائية شؤون الموظفين والامتثال',
      titleEn: 'Senior HR & People Specialist',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    },
    {
      id: 'emp-4',
      name: 'عبدالله السديري',
      nameEn: 'Abdullah Al-Sudairy',
      email: 'admin@dawamy.app',
      password: 'Admin@123',
      role: 'admin',
      title: 'مسؤول النظام والتحول الرقمي',
      titleEn: 'System Administrator',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    },
  ];

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMsg(isAr ? 'الرجاء إدخال البريد الإلكتروني.' : 'Please enter your email.');
      return;
    }
    if (!password) {
      setErrorMsg(isAr ? 'الرجاء إدخال كلمة المرور.' : 'Please enter your password.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Authenticate against Backend API (PostgreSQL + bcrypt)
      const res = await api.login(cleanEmail, password);

      if (res && res.success && res.user) {
        const loggedUser = res.user;
        // Map to corresponding client user id
        const mappedId =
          loggedUser.role === 'manager'
            ? 'emp-2'
            : loggedUser.role === 'hr'
            ? 'emp-3'
            : loggedUser.role === 'admin'
            ? 'emp-4'
            : 'emp-1';

        onLoginSuccess(mappedId, loggedUser);
      } else {
        // Look up in client demo list fallback if offline
        const fallback = demoAccounts.find(
          (a) => a.email.toLowerCase() === cleanEmail.toLowerCase()
        );
        if (fallback && fallback.password === password) {
          onLoginSuccess(fallback.id, fallback);
        } else {
          setErrorMsg(
            res?.error ||
              (isAr
                ? 'بيانات تسجيل الدخول غير صحيحة. يمكنك النقر على الحسابات التجريبية بالأسفل لتسجيل الدخول الفوري.'
                : 'Invalid login credentials. Click on one of the demo profiles below for instant login.')
          );
        }
      }
    } catch (err: any) {
      setErrorMsg(
        isAr
          ? 'تعذر الاتصال بالخادم. جرب استخدام أحد الحسابات السريعة أدناه.'
          : 'Server connection error. Try using a quick profile below.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (acc: (typeof demoAccounts)[0]) => {
    setEmail(acc.email);
    setPassword(acc.password);
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await api.login(acc.email, acc.password);
      if (res && res.success) {
        onLoginSuccess(acc.id, res.user);
      } else {
        onLoginSuccess(acc.id, acc);
      }
    } catch {
      onLoginSuccess(acc.id, acc);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col justify-between p-4 sm:p-6 md:p-8" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Top Bar with Lang Toggle & DB Status */}
      <div className="flex justify-between items-center max-w-7xl w-full mx-auto">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-[#E5E2D9] text-[11px] font-semibold text-[#2D3628] shadow-3xs">
          <Database className="w-3.5 h-3.5 text-[#5E7153]" />
          <span>
            {dbStatus === 'connected'
              ? (isAr ? 'قاعدة بيانات PostgreSQL متصلة' : 'PostgreSQL DB Connected')
              : (isAr ? 'جاري فحص الاتصال...' : 'Checking DB...')}
          </span>
          <span className="w-2 h-2 rounded-full bg-[#5E7153] animate-pulse" />
        </div>

        <button
          type="button"
          onClick={onToggleLang}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#EFECE4] text-[#2D3628] border border-[#E5E2D9] text-xs font-bold transition shadow-3xs cursor-pointer"
        >
          <Languages className="w-4 h-4 text-[#5E7153]" />
          <span>{isAr ? 'English' : 'العربية'}</span>
        </button>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex items-center justify-center py-6 sm:py-10">
        <div className="w-full max-w-md bg-white border border-[#E5E2D9] rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          {/* Logo and Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#E9EDD9] border border-[#D9E0D2] text-[#5E7153] mb-1 shadow-3xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#2D3628] tracking-tight">
              {isAr ? 'نظام دوامي الذكي' : 'Dawamy Enterprise'}
            </h1>
            <p className="text-xs sm:text-sm text-[#65635E] font-medium">
              {isAr
                ? 'بنية سحابية معزولة (Containerized) متصلة بقاعدة بيانات PostgreSQL'
                : 'Containerized Architecture connected to isolated PostgreSQL database'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleManualLogin} className="space-y-4">
            {errorMsg && (
              <div className="p-3.5 bg-rose-50 border border-rose-200/60 rounded-xl text-xs font-bold text-rose-700 flex items-start gap-2 animate-shake">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 mt-1.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#2D3628]">
                {isAr ? 'البريد الإلكتروني للموظف' : 'Employee Email'}
              </label>
              <div className="relative">
                <div className={`absolute inset-y-0 ${isAr ? 'right-0 pr-3.5' : 'left-0 pl-3.5'} flex items-center pointer-events-none`}>
                  <Mail className="h-4 w-4 text-[#65635E]" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="sara.mansoor@dawamy.app"
                  className={`w-full ${isAr ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 rounded-xl border border-[#E5E2D9] text-xs sm:text-sm font-medium bg-white text-[#2D3628] focus:outline-none focus:ring-2 focus:ring-[#5E7153]/40 focus:border-[#5E7153]`}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold text-[#2D3628]">
                  {isAr ? 'كلمة المرور' : 'Password'}
                </label>
                <span className="text-[10px] text-[#5E7153] font-semibold cursor-pointer hover:underline">
                  {isAr ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
                </span>
              </div>
              <div className="relative">
                <div className={`absolute inset-y-0 ${isAr ? 'right-0 pr-3.5' : 'left-0 pl-3.5'} flex items-center pointer-events-none`}>
                  <Lock className="h-4 w-4 text-[#65635E]" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="••••••••"
                  className={`w-full ${isAr ? 'pr-10 pl-10' : 'pl-10 pr-10'} py-2.5 rounded-xl border border-[#E5E2D9] text-xs sm:text-sm font-medium bg-white text-[#2D3628] focus:outline-none focus:ring-2 focus:ring-[#5E7153]/40 focus:border-[#5E7153]`}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute inset-y-0 ${isAr ? 'left-0 pl-3' : 'right-0 pr-3'} flex items-center text-[#65635E] hover:text-[#2D3628]`}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-xl bg-[#5E7153] hover:bg-[#4E5F44] disabled:bg-[#5E7153]/60 text-white font-bold text-xs sm:text-sm shadow-md shadow-[#5E7153]/15 transition cursor-pointer"
            >
              <LogIn className="w-4 h-4 shrink-0" />
              <span>
                {isLoading
                  ? (isAr ? 'جاري التحقق من قاعدة البيانات...' : 'Verifying with PostgreSQL...')
                  : (isAr ? 'تسجيل الدخول الآمن (PostgreSQL)' : 'Secure Log In (PostgreSQL)')}
              </span>
            </button>
          </form>

          {/* Quick Demo Accounts Selection */}
          <div className="relative border-t border-[#E5E2D9] pt-5 space-y-3">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-[10px] sm:text-xs font-bold text-[#65635E]">
              {isAr ? 'أو دخول تجريبي سريع بحساب موثق' : 'Or Quick Demo Login with Seeded Account'}
            </div>

            <div className="grid grid-cols-1 gap-2">
              {demoAccounts.map((acc) => {
                let roleColor = 'bg-blue-50 text-blue-700 border-blue-200/50';
                if (acc.role === 'manager') roleColor = 'bg-[#E9EDD9] text-[#2D3628] border-[#D9E0D2]';
                if (acc.role === 'hr') roleColor = 'bg-amber-50 text-amber-700 border-amber-200/50';
                if (acc.role === 'admin') roleColor = 'bg-purple-50 text-purple-700 border-purple-200/50';

                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => handleQuickLogin(acc)}
                    disabled={isLoading}
                    className="flex items-center gap-3 p-2.5 bg-white hover:bg-[#FAF9F6] border border-[#E5E2D9] hover:border-[#5E7153]/40 rounded-xl text-left transition shadow-3xs cursor-pointer group"
                  >
                    <img
                      src={acc.avatar}
                      alt={acc.name}
                      className="w-9 h-9 rounded-lg object-cover border border-[#E5E2D9] group-hover:scale-105 transition-transform shrink-0"
                    />
                    <div className="flex-1 min-w-0 text-right">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] sm:text-xs font-bold text-[#2D3628] truncate">
                          {isAr ? acc.name : acc.nameEn}
                        </span>
                        <span className={`text-[9px] font-black px-1.5 py-0.2 rounded border ${roleColor}`}>
                          {acc.role === 'manager'
                            ? (isAr ? 'مدير مباشر' : 'Manager')
                            : acc.role === 'hr'
                            ? (isAr ? 'شؤون موظفين' : 'HR Admin')
                            : acc.role === 'admin'
                            ? (isAr ? 'مسؤول النظام' : 'System Admin')
                            : (isAr ? 'موظف' : 'Employee')}
                        </span>
                      </div>
                      <p className="text-[9px] text-[#65635E] truncate mt-0.5">
                        {acc.email} • {acc.password}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-[10px] sm:text-xs text-[#65635E] font-medium max-w-7xl w-full mx-auto border-t border-[#E5E2D9]/60 pt-4">
        <span>© {new Date().getFullYear()} {isAr ? 'نظام دوامي الذكي لإدارة الموارد والامتثال - بنية الحاويات وPostgreSQL.' : 'Dawamy Intelligent Attendance & Compliance - Containerized Architecture.'}</span>
      </div>
    </div>
  );
};
