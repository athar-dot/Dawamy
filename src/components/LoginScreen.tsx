import React, { useState } from 'react';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  LogIn,
  Languages,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
} from 'lucide-react';
import { UserProfile } from '../types';

interface LoginScreenProps {
  allUsers: UserProfile[];
  onLoginSuccess: (userId: string) => void;
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

  // Filter main roles for quick click demo profiles
  const quickProfiles = allUsers.slice(0, 3); // Sara, Tariq, Reem

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email) {
      setErrorMsg(isAr ? 'الرجاء إدخال البريد الإلكتروني.' : 'Please enter your email.');
      return;
    }
    if (!password) {
      setErrorMsg(isAr ? 'الرجاء إدخال كلمة المرور.' : 'Please enter your password.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMsg(isAr ? 'الرجاء إدخال بريد إلكتروني صالح.' : 'Please enter a valid email address.');
      return;
    }

    if (password.length < 4) {
      setErrorMsg(isAr ? 'كلمة المرور يجب ألا تقل عن 4 خانات.' : 'Password must be at least 4 characters.');
      return;
    }

    setIsLoading(true);

    // Simulate database lookup or authenticate preset users
    setTimeout(() => {
      const foundUser = allUsers.find(
        (u) => u.email?.toLowerCase().trim() === email.toLowerCase().trim()
      );

      if (foundUser) {
        onLoginSuccess(foundUser.id);
      } else {
        // If not a preset user, allow logging in as a newly simulated user or show error.
        // For standard demo, let's default to emp-1 or display error.
        // Let's make it highly user-friendly: If they type any valid email, let them log in as the first user or show error.
        // It is much better to find the matching user, or inform them.
        setErrorMsg(
          isAr
            ? 'البريد الإلكتروني غير مسجل في النظام. جرب استخدام الملفات التعريفية السريعة بالأسفل!'
            : 'Email not registered. Try clicking one of the quick profiles below!'
        );
      }
      setIsLoading(false);
    }, 800);
  };

  const handleQuickLogin = (userId: string) => {
    setIsLoading(true);
    setTimeout(() => {
      onLoginSuccess(userId);
      setIsLoading(false);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col justify-between p-4 sm:p-6 md:p-8" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Top Bar with Lang Toggle */}
      <div className="flex justify-end items-center max-w-7xl w-full mx-auto">
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
      <div className="flex-1 flex items-center justify-center py-6 sm:py-12">
        <div className="w-full max-w-md bg-white border border-[#E5E2D9] rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          
          {/* Logo and Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#E9EDD9] border border-[#D9E0D2] text-[#5E7153] mb-1 shadow-3xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#2D3628] tracking-tight">
              {isAr ? 'نظام دوامي الذكي' : 'Dawamy Intelligent System'}
            </h1>
            <p className="text-xs sm:text-sm text-[#65635E] font-medium">
              {isAr
                ? 'إدارة الحضور الذكية، تقارير كفاءة العمل عن بعد، ومسيرات الرواتب المعتمدة'
                : 'Smart Attendance, WFH Performance Audit & Approved Payroll Management'}
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
                  ? (isAr ? 'جاري التحقق...' : 'Verifying...')
                  : (isAr ? 'تسجيل الدخول الآمن' : 'Secure Log In')}
              </span>
            </button>
          </form>

          {/* Quick Demo Accounts Selection */}
          <div className="relative border-t border-[#E5E2D9] pt-5 space-y-3">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-[10px] sm:text-xs font-bold text-[#65635E]">
              {isAr ? 'أو تسجيل دخول سريع كـ' : 'Or Quick Demo Login As'}
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {quickProfiles.map((p) => {
                let roleColor = 'bg-blue-50 text-blue-700 border-blue-200/50';
                if (p.role === 'manager') roleColor = 'bg-[#E9EDD9] text-[#2D3628] border-[#D9E0D2]';
                if (p.role === 'hr') roleColor = 'bg-amber-50 text-amber-700 border-amber-200/50';

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleQuickLogin(p.id)}
                    disabled={isLoading}
                    className="flex items-center gap-3 p-2.5 bg-white hover:bg-[#FAF9F6] border border-[#E5E2D9] hover:border-[#5E7153]/30 rounded-xl text-left transition shadow-3xs cursor-pointer group"
                  >
                    <img
                      src={p.avatar}
                      alt={p.name}
                      className="w-9 h-9 rounded-lg object-cover border border-[#E5E2D9] group-hover:scale-105 transition-transform shrink-0"
                    />
                    <div className="flex-1 min-w-0 text-right">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] sm:text-xs font-bold text-[#2D3628] truncate">
                          {isAr ? p.name : (p.nameEn || p.name)}
                        </span>
                        <span className={`text-[9px] font-black px-1.5 py-0.2 rounded border ${roleColor}`}>
                          {p.role === 'manager'
                            ? (isAr ? 'مسؤول / مدير' : 'Lead Admin')
                            : p.role === 'hr'
                            ? (isAr ? 'شؤون موظفين' : 'HR Admin')
                            : (isAr ? 'موظف' : 'Employee')}
                        </span>
                      </div>
                      <p className="text-[9px] text-[#65635E] truncate mt-0.5">
                        {isAr ? p.title : (p.titleEn || p.title)}
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
        <span>© {new Date().getFullYear()} {isAr ? 'نظام دوامي الذكي لإدارة الموارد والامتثال. جميع الحقوق محفوظة.' : 'Dawamy Intelligent Attendance & Compliance System. All Rights Reserved.'}</span>
      </div>
    </div>
  );
};
