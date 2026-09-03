import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
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
    console.error('Uncaught error in application component tree:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#FAF9F6] text-[#43423E]" dir="rtl">
          <div className="max-w-md w-full p-8 rounded-3xl bg-white border border-[#E5E2D9] shadow-xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FDF0EE] text-[#9E3B30] flex items-center justify-center mx-auto text-xl font-bold">
              !
            </div>
            <h2 className="text-lg font-bold text-[#2D3628]">حدث خطأ غير متوقع</h2>
            <p className="text-xs text-[#65635E] leading-relaxed">
              حدث خطأ أثناء تحميل بعض عناصر الواجهة. يمكنك إعادة تحميل الصفحة للمتابعة.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, errorMessage: '' });
                window.location.reload();
              }}
              className="px-5 py-2.5 rounded-xl bg-[#5E7153] hover:bg-[#4E5F44] text-white text-xs font-bold transition shadow-sm"
            >
              إعادة تحميل التطبيق
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
