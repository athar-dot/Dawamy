import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  sectionTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    const msg = error?.message || String(error || '');
    // If it's the known cross-origin frame $$typeof security error or benign re-entrant worker warning, do not break the UI
    if (
      msg.includes("Failed to read a named property '$$typeof' from 'Window'") ||
      msg.includes('Blocked a frame with origin') ||
      msg.includes('cross-origin frame') ||
      msg.includes('Should not already be working')
    ) {
      return { hasError: false, errorMessage: '' };
    }
    return { hasError: true, errorMessage: msg };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const msg = error?.message || String(error || '');
    if (
      msg.includes("Failed to read a named property '$$typeof' from 'Window'") ||
      msg.includes('Blocked a frame with origin') ||
      msg.includes('cross-origin frame') ||
      msg.includes('Should not already be working')
    ) {
      // Benign cross-origin frame inspection error from React DevTools or deferred work re-entry
      return;
    }
    console.error('Uncaught error in component tree:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
    if (this.props.onReset) {
      try {
        this.props.onReset();
      } catch (e) {
        console.warn('Error during boundary onReset:', e);
      }
    }
  };

  public render() {
    if (this.state.hasError) {
      // If it's a scoped section boundary
      if (this.props.sectionTitle) {
        return (
          <div className="p-6 rounded-3xl bg-white border border-[#F5C2BC] shadow-sm text-[#43423E] space-y-4 my-4 animate-in fade-in" dir="rtl">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-2xl bg-[#FDF0EE] text-[#9E3B30] shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="text-base font-bold text-[#2D3628]">
                  تعذر عرض {this.props.sectionTitle} مؤقتاً
                </h3>
                <p className="text-xs text-[#65635E] leading-relaxed">
                  تم رصد خطأ برمجي غير متوقع في هذا الجزء فقط، ولكن بقية أقسام التطبيق تعمل بكفاءة.
                </p>
                {this.state.errorMessage && (
                  <p className="text-[11px] font-mono text-[#9E3B30] bg-[#FAF9F6] p-2 rounded-xl border border-[#E5E2D9] overflow-x-auto max-h-20">
                    {this.state.errorMessage}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#5E7153] hover:bg-[#4E5F44] text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>إعادة المحاولة</span>
              </button>
            </div>
          </div>
        );
      }

      // Root full-screen fallback
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#FAF9F6] text-[#43423E]" dir="rtl">
          <div className="max-w-md w-full p-8 rounded-3xl bg-white border border-[#E5E2D9] shadow-xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FDF0EE] text-[#9E3B30] flex items-center justify-center mx-auto text-xl font-bold">
              !
            </div>
            <h2 className="text-lg font-bold text-[#2D3628]">حدث خطأ غير متوقع</h2>
            <p className="text-xs text-[#65635E] leading-relaxed">
              حدث خطأ أثناء تحميل عناصر الواجهة. يمكنك المحاولة مجدداً أو إعادة تحميل الصفحة.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2.5 rounded-xl bg-[#5E7153] hover:bg-[#4E5F44] text-white text-xs font-bold transition shadow-sm cursor-pointer"
              >
                إعادة المحاولة
              </button>
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, errorMessage: '' });
                  window.location.reload();
                }}
                className="px-4 py-2.5 rounded-xl bg-[#FAF9F6] hover:bg-[#EFECE4] text-[#43423E] border border-[#E5E2D9] text-xs font-bold transition cursor-pointer"
              >
                تحديث الصفحة
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
