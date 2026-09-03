import React, { useState } from 'react';
import {
  X,
  ShieldAlert,
  Copy,
  Check,
  ExternalLink,
  KeyRound,
  CheckCircle2,
  Globe,
  Info,
} from 'lucide-react';

interface AuthDomainHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'ar' | 'en';
  hostname?: string;
  onUseDemoRole?: () => void;
}

export const AuthDomainHelpModal: React.FC<AuthDomainHelpModalProps> = ({
  isOpen,
  onClose,
  lang,
  hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost',
  onUseDemoRole,
}) => {
  if (!isOpen) return null;

  const isAr = lang === 'ar';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(hostname);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const firebaseConsoleUrl = 'https://console.firebase.google.com/project/leave-management-app-17e2d/authentication/settings';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2D3628]/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white border border-[#E5E2D9] rounded-3xl shadow-2xl p-6 sm:p-8 my-8 text-[#43423E] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[#E5E2D9]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#FDF0EE] text-[#9E3B30] border border-[#F5C4BE]">
              <ShieldAlert className="w-5 h-5 text-[#9E3B30]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#2D3628]">
                {isAr ? 'تفعيل نطاق المصادقة في Firebase' : 'Authorize Domain in Firebase Console'}
              </h3>
              <p className="text-xs text-[#65635E]">
                {isAr
                  ? 'خطوة أمان مطلوبة لمرة واحدة لتفعيل تسجيل الدخول بحساب Google'
                  : 'One-time security authorization required for Google Sign-In'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#FAF9F6] hover:bg-[#EFECE4] text-[#65635E] hover:text-[#2D3628] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-5 space-y-4">
          {/* Explanation banner */}
          <div className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#E5E2D9] text-xs leading-relaxed text-[#5A5852] flex items-start gap-2.5">
            <Info className="w-4 h-4 text-[#5E7153] shrink-0 mt-0.5" />
            <div>
              {isAr ? (
                <>
                  منصة Google Firebase تمنع تسجيل الدخول التلقائي من أي نطاق جديد إلا بعد إضافته في قائمة
                  <strong className="text-[#2D3628]"> النطاقات المعتمدة (Authorized Domains) </strong>
                  لحماية مشروعك.
                </>
              ) : (
                <>
                  Firebase Auth requires adding your preview host to
                  <strong className="text-[#2D3628]"> Authorized Domains </strong>
                  in the Firebase Console for secure Google login.
                </>
              )}
            </div>
          </div>

          {/* Copyable Domain Box */}
          <div>
            <label className="block text-xs font-semibold text-[#2D3628] mb-1.5">
              {isAr ? 'النطاق الحالي لتطبيقك (انسخه بالضغط على الزر):' : 'Your Current App Domain (Click to copy):'}
            </label>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#F5F3ED] border border-[#E5E2D9]">
              <Globe className="w-4 h-4 text-[#5E7153] shrink-0" />
              <span className="flex-1 font-mono text-xs text-[#2D3628] truncate select-all">
                {hostname}
              </span>
              <button
                type="button"
                id="btn-copy-auth-domain"
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#5E7153] hover:bg-[#4E5F44] text-white text-xs font-semibold shadow-sm transition"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>{isAr ? 'تم النسخ!' : 'Copied!'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{isAr ? 'نسخ النطاق' : 'Copy'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 3 Step Instruction */}
          <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E5E2D9] space-y-2.5">
            <h4 className="text-xs font-bold text-[#2D3628] flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-[#5E7153]" />
              {isAr ? 'خطوات التفعيل في دقيقة واحدة:' : 'Simple 3-Step Setup in 1 Minute:'}
            </h4>
            <ol className="text-xs text-[#5A5852] space-y-2 list-decimal list-inside pr-1 pl-1 leading-relaxed">
              <li>
                {isAr
                  ? 'افتح إعدادات مشروعك في لوحة تحكم Firebase عبر الزر أدناه.'
                  : 'Open your Firebase Console Authentication settings using the button below.'}
              </li>
              <li>
                {isAr
                  ? 'في تبويب Settings، توجه لقسم "Authorized domains" واضغط "Add domain".'
                  : 'Go to "Authorized domains" section and click "Add domain".'}
              </li>
              <li>
                {isAr
                  ? 'ألصق النطاق المنسوخ واضغط Save. سيعمل تسجيل الدخول بـ Google مباشرة!'
                  : 'Paste the copied domain and click Save. Google Sign-in will work immediately!'}
              </li>
            </ol>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[#E5E2D9]">
            <a
              href={firebaseConsoleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#2D3628] hover:bg-[#1E251B] text-white text-xs font-bold shadow-md transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{isAr ? 'فتح لوحة تحكم Firebase' : 'Open Firebase Console'}</span>
            </a>

            <button
              type="button"
              onClick={() => {
                if (onUseDemoRole) onUseDemoRole();
                onClose();
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#E9EDD9] hover:bg-[#D9E0D2] text-[#2D3628] text-xs font-semibold transition border border-[#D9E0D2]"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-[#5E7153]" />
              <span>{isAr ? 'متابعة التجربة بالأدوار المتاحة' : 'Continue with Demo Profiles'}</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
