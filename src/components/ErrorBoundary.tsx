import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  props: Props;
  state: State = {
    hasError: false,
    error: null,
  };

  constructor(props: Props) {
    super(props);
    this.props = props;
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught Error in React Application:', error, errorInfo);
  }

  private handleReload = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
          await reg.unregister();
        }
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        for (const k of keys) {
          await caches.delete(k);
        }
      }
    } catch (e) {
      console.warn('Error clearing caches on reload:', e);
    }
    window.location.reload();
  };

  private handleResetData = () => {
    if (window.confirm('هل أنت تأكد من إعادة ضبط بيانات التطبيق لإصلاح أي تعارض؟ يفضل أخذ نسخة احتياطية أولاً إذا أمكن.')) {
      try {
        localStorage.clear();
      } catch (e) {
        console.error('Error clearing localStorage', e);
      }
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans dir-rtl" dir="rtl">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto shadow-inner">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-extrabold text-white">حدث تنبيه غير متوقع</h1>
              <p className="text-xs text-slate-400 leading-relaxed">
                تم حماية الشاشة من التوقف. يمكنك إعادة تحديث الصفحات فوراً بدون فقدان بياناتك المخزنة.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-left text-[11px] font-mono text-rose-300/80 overflow-x-auto max-h-24">
                {this.state.error.toString()}
              </div>
            )}

            <div className="space-y-3 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold py-3 px-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-xs cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>إعادة تشغيل التطبيق الآن</span>
              </button>

              <button
                onClick={this.handleResetData}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 px-4 rounded-2xl border border-slate-700 transition-all flex items-center justify-center gap-2 text-xs cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>إصلاح وإعادة تعيين التخزين المحلي</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
