import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, Check, WifiOff, Sparkles, AlertCircle, Share2, MoreVertical, Copy } from 'lucide-react';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAppIconCustomizer?: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose, onOpenAppIconCustomizer }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [activeTab, setActiveTab] = useState<'android' | 'ios'>('android');
  const [isInApp, setIsInApp] = useState(false);
  const [copied, setCopied] = useState(false);

  const getDynamicInstallUrl = () => {
    if (typeof window === 'undefined') return '';
    let origin = window.location.origin;
    if (origin.includes('ais-dev-')) {
      origin = origin.replace('ais-dev-', 'ais-pre-');
    }
    return origin + window.location.search;
  };

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      const directUrl = getDynamicInstallUrl();
      navigator.clipboard.writeText(directUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      });
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent || '';
      const isInstagram = ua.indexOf('Instagram') > -1;
      const isFacebook = (ua.indexOf('FBAN') > -1) || (ua.indexOf('FBAV') > -1);
      const isWhatsApp = ua.indexOf('WhatsApp') > -1;
      const isTelegram = ua.indexOf('Telegram') > -1;
      const isMessenger = ua.indexOf('Messenger') > -1;
      const isInAppWebview = isInstagram || isFacebook || isWhatsApp || isTelegram || isMessenger;
      setIsInApp(isInAppWebview);

      if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
        setIsInstalled(true);
      }

      // Check if already captured globally on startup
      if ((window as any).deferredPrompt) {
        setDeferredPrompt((window as any).deferredPrompt);
      }

      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };

      const handleCustomReady = (e: any) => {
        if (e.detail) {
          setDeferredPrompt(e.detail);
        }
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.addEventListener('pwa-prompt-ready', handleCustomReady);

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('pwa-prompt-ready', handleCustomReady);
      };
    }
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 left-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <span className="bg-emerald-500/20 text-emerald-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30 inline-flex items-center gap-1">
                <WifiOff className="w-3 h-3" />
                تشغيل بدون إنترنت (Offline Mode)
              </span>
              <h2 className="text-lg font-extrabold text-white mt-1">تثبيت التطبيق والعمل الفوري بدون نت</h2>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          
          {/* App Icon Customizer Trigger */}
          {onOpenAppIconCustomizer && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <h4 className="text-xs font-extrabold text-emerald-950">تغيير أيقونة التطبيق على الجوال</h4>
                  <p className="text-[10px] text-emerald-700 font-medium">يمكنك اختيار صورتك الخاصة لتبدو كأيقونة على الشاشة الرئيسية</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAppIconCustomizer();
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3 py-2 rounded-xl text-xs shadow-xs transition-all cursor-pointer shrink-0"
              >
                تغيير الأيقونة
              </button>
            </div>
          )}

          {/* Direct Link Copier */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 space-y-3">
            <div className="flex items-start gap-2.5">
              <Share2 className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-extrabold text-indigo-950">رابط التطبيق المباشر (للزبائن ولتثبيت ممتاز)</h4>
                <p className="text-[10px] text-indigo-700 font-medium leading-relaxed">
                  انسخ هذا الرابط المباشر وأرسله لزبائنك، أو افتحه بنفسك في متصفح <strong>Chrome</strong> أو <strong>Safari</strong> الرسمي بدلاً من فيسبوك/واتساب ليظهر لك زر "تثبيت التطبيق" بدلاً من "إنشاء اختصار".
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={getDynamicInstallUrl()}
                className="flex-1 bg-white border border-indigo-200 rounded-xl px-3 py-2 text-[11px] font-mono text-left text-indigo-950 select-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold shadow-sm transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 shrink-0 ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>تم النسخ!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>نسخ الرابط</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Explanation Box */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-900 text-xs leading-relaxed space-y-3">
            <div className="flex items-start gap-2 font-bold text-amber-950 text-sm">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>لماذا يظهر للزبون خيار "إنشاء اختصار" فقط بدلاً من "تثبيت التطبيق"؟</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              هناك <strong>سببان رئيسيان</strong> لمنع التثبيت المباشر وظهور خيار "إنشاء اختصار":
            </p>
            <ul className="list-decimal list-inside space-y-1.5 text-[11px] text-amber-950 pr-1">
              <li>
                <strong>الفتح من داخل واتساب أو فيسبوك (متصفح داخلي):</strong> إذا ضغط الزبون على الرابط المرسل إليه في الواتساب أو ماسنجر، فإنه يفتح داخل متصفح واتساب الداخلي (WebView) وليس المتصفح الرسمي للجوال. المتصفحات الداخلية <strong>تمنع</strong> تثبيت البرمجيات تماماً وتعطي خيار "إنشاء اختصار" كبديل ضعيف.
                <br />
                <span className="text-emerald-700 font-extrabold block mt-0.5">💡 الحل: اضغط على النقاط الثلاث بالأعلى واختر "الفتح في متصفح كروم / Safari" أو انسخ الرابط وافتحه يدوياً في المتصفح الرسمي.</span>
              </li>
              <li>
                <strong>السرعة الزائدة قبل تسجيل ملفات النظام:</strong> يحتاج المتصفح من 3 إلى 5 ثوانٍ عند أول فتح لتسجيل ملف المزامنة (Service Worker) والتحقق من أمان الرابط. إذا حاول المستخدم التثبيت فوراً قبل ذلك، سيعطيه المتصفح خيار "إنشاء اختصار".
                <br />
                <span className="text-indigo-700 font-extrabold block mt-0.5">💡 الحل: انتظر 5 ثوانٍ ثم حدّث (Refresh) الصفحة، وسيتحول الخيار فوراً إلى "تثبيت التطبيق" أو "فتح التاجر الذكي".</span>
              </li>
            </ul>
          </div>

          {/* Native Direct Install Button if available */}
          {deferredPrompt && !isInstalled && (
            <button
              onClick={handleInstallClick}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 px-4 rounded-2xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 text-sm transition-all cursor-pointer transform active:scale-98"
            >
              <Download className="w-5 h-5 animate-bounce" />
              <span>اضغط هنا لتثبيت التطبيق بنقرة واحدة الآن</span>
            </button>
          )}

          {isInstalled && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center text-emerald-900 font-bold text-xs flex items-center justify-center gap-2">
              <Check className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>البرنامج مثبت بالفعل كـ تطبيق على جهازك وتستطيع تشغيله من الشاشة الرئيسية بدون إنترنت!</span>
            </div>
          )}

          {/* Instructions Tabs: Android vs iOS */}
          <div className="space-y-3">
            <h3 className="font-extrabold text-slate-800 text-xs">طريقة التثبيت اليدوي حسب نوع جهازك:</h3>
            
            <div className="flex bg-slate-100 p-1 rounded-2xl text-xs font-bold">
              <button
                onClick={() => setActiveTab('android')}
                className={`flex-1 py-2 rounded-xl text-center transition-all cursor-pointer ${
                  activeTab === 'android' ? 'bg-white text-indigo-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📱 أندرويد (Android / Chrome)
              </button>
              <button
                onClick={() => setActiveTab('ios')}
                className={`flex-1 py-2 rounded-xl text-center transition-all cursor-pointer ${
                  activeTab === 'ios' ? 'bg-white text-indigo-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🍏 آيفون (iPhone / Safari)
              </button>
            </div>

            {/* Android Instructions */}
            {activeTab === 'android' && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-700 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-800 font-extrabold flex items-center justify-center text-xs shrink-0">1</div>
                  <p>افتح القائمة (النقاط الثلاث <MoreVertical className="w-4 h-4 text-slate-600 inline" />) في المتصفح.</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-800 font-extrabold flex items-center justify-center text-xs shrink-0">2</div>
                  <p>
                    ابحث عن خيار <strong>"تثبيت التطبيق"</strong> أو <strong>"إضافة إلى الشاشة الرئيسية"</strong>.
                  </p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-amber-900 font-bold space-y-1">
                  <span className="text-amber-800 block text-[11px]">💡 ملاحظة هامة بحسب صورتك:</span>
                  <p className="text-[11px] leading-relaxed">
                    إذا ظهر لك خيار <strong className="text-indigo-900 bg-amber-200/60 px-1 py-0.5 rounded">"فتح التاجر الذكي"</strong> (الظاهر في قناتك بالصورة)، قم بالضغط عليه فوراً! فهذا يعني أن جهازك قام بالتعرف على التطبيق وستتم إضافته أو فتحه كتطبيق مستقل على الشاشة الرئيسية فوراً!
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-extrabold flex items-center justify-center text-xs shrink-0">✓</div>
                  <p className="text-emerald-800 font-bold">ستظهر أيقونة "التاجر الذكي" في قائمة تطبيقات جوالك لفتحه بنقرة واحدة وبدون إنترنت!</p>
                </div>
              </div>
            )}

            {/* iOS Instructions */}
            {activeTab === 'ios' && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-700 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-800 font-extrabold flex items-center justify-center text-xs shrink-0">1</div>
                  <p>افتح رابط البرنامج في متصفح <strong>Safari</strong> على الآيفون.</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-800 font-extrabold flex items-center justify-center text-xs shrink-0">2</div>
                  <p className="flex items-center gap-1.5 flex-wrap">
                    اضغط على زر المشاركة <Share2 className="w-4 h-4 text-indigo-600 inline" /> أسفل الشاشة.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-800 font-extrabold flex items-center justify-center text-xs shrink-0">3</div>
                  <p>اختر <strong>"إضافة إلى الشاشة الرئيسية" (Add to Home Screen)</strong>.</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-extrabold flex items-center justify-center text-xs shrink-0">✓</div>
                  <p className="text-emerald-800 font-bold">ستتم إضافة التطبيق كـ آيقونة مستقلة تعمل بدون إنترنت وبسرعة فائقة.</p>
                </div>
              </div>
            )}
          </div>

          {/* Offline & Sync Features Summary */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-3.5 text-xs text-indigo-950 space-y-2">
            <span className="font-extrabold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              الاستقلالية وحفظ البيانات والمزامنة:
            </span>
            <ul className="list-disc list-inside space-y-1 text-slate-600 text-[11px] pr-2">
              <li><strong>حفظ محلي فوري (Local Storage):</strong> جميع المبيعات والمنتجات والسندات تحفظ تلقائياً وبشكل محلي دائم داخل ذاكرة جوالك أو جهازك.</li>
              <li><strong>التصدير والمزامنة (Export & Backup):</strong> عند رغبتك بنقل البيانات أو عمل نسخة احتياطية بعد انتهاء العمل، يمكنك الضغط على زر التصدير <Download className="w-3.5 h-3.5 inline text-indigo-600" /> في الشريط العلوي لتنزيل ملف النسخة الاحتياطية واستعادتها بأي وقت!</li>
            </ul>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="bg-indigo-950 hover:bg-slate-900 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
          >
            فهمت ذلك، إغلاق النافذة
          </button>
        </div>

      </div>
    </div>
  );
};
