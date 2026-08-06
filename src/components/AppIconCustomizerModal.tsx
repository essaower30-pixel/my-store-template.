import React, { useState, useRef, useEffect } from 'react';
import { 
  Smartphone, 
  Upload, 
  Check, 
  X, 
  Sparkles, 
  Download, 
  RefreshCw, 
  Image as ImageIcon,
  CheckCircle2,
  HelpCircle,
  ExternalLink,
  Copy,
  AlertTriangle
} from 'lucide-react';
import { 
  PRESET_ICONS, 
  getCustomIconUrl, 
  getCustomAppTitle, 
  updatePWAConfig,
  uploadCustomIconServer
} from '../utils/pwaIconUtils';
import { compressImageFile } from '../utils/imageCompressor';

interface AppIconCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppIconCustomizerModal: React.FC<AppIconCustomizerModalProps> = ({ isOpen, onClose }) => {
  const [selectedIconUrl, setSelectedIconUrl] = useState<string>(getCustomIconUrl());
  const [appTitle, setAppTitle] = useState<string>(getCustomAppTitle());
  const [isSaved, setIsSaved] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isFramed = window.self !== window.top || document.referrer.includes('aistudio');
      setIsInIframe(isFramed);
    }
  }, []);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsProcessingImage(true);
        // Fast client-side canvas compression down to max 512x512 JPEG ~30KB
        const compressedDataUrl = await compressImageFile(file, 512, 512, 0.85);
        setSelectedIconUrl(compressedDataUrl);
        setIsSaved(false);
      } catch (err: any) {
        alert(err?.message || 'حدث خطأ أثناء قراءة الصورة');
      } finally {
        setIsProcessingImage(false);
        if (e.target) e.target.value = '';
      }
    }
  };

  const handleApply = async () => {
    try {
      setIsApplying(true);
      let finalIconUrl = selectedIconUrl;

      // If base64 image, upload to server to get clean HTTP URL for mobile manifest
      if (selectedIconUrl.startsWith('data:image')) {
        finalIconUrl = await uploadCustomIconServer(selectedIconUrl);
      }

      updatePWAConfig(finalIconUrl, appTitle);
      setSelectedIconUrl(finalIconUrl);
      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
      }, 5000);
    } catch (err: any) {
      alert('فشل تطبيق الأيقونة: ' + (err?.message || 'خطأ غير معروف'));
    } finally {
      setIsApplying(false);
    }
  };

  const getDirectCustomizerUrl = () => {
    if (typeof window === 'undefined') return '';
    try {
      const u = new URL(window.location.href);
      u.searchParams.set('customizer', '1');
      return u.toString();
    } catch {
      return window.location.href;
    }
  };

  const handleOpenExternal = () => {
    if (typeof window !== 'undefined') {
      const directUrl = getDirectCustomizerUrl();
      window.open(directUrl, '_blank');
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      const directUrl = getDirectCustomizerUrl();
      navigator.clipboard.writeText(directUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  const handleDownloadIcon = () => {
    const link = document.createElement('a');
    link.href = selectedIconUrl;
    link.download = `app-icon-${appTitle.replace(/\s+/g, '_')}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200 my-8">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-950 to-slate-900 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 left-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="bg-emerald-500/20 text-emerald-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30 inline-flex items-center gap-1">
                <Smartphone className="w-3 h-3" />
                تخصيص أيقونة الشاشة الرئيسية (PWA)
              </span>
              <h2 className="text-lg font-extrabold text-white mt-1">تغيير أيقونة التطبيق واسم الشاشة</h2>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* Live Mobile Screen Preview */}
          <div className="bg-slate-100 dark:bg-slate-800/80 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 text-center">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3">
              معاينة الأيقونة كما ستظهر على شاشة جوالك الرئيسية:
            </p>

            <div className="inline-flex flex-col items-center p-4 bg-slate-900/90 rounded-3xl border border-slate-700 shadow-xl">
              <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-2xl border-2 border-emerald-400/50 bg-black relative group">
                <img 
                  src={selectedIconUrl} 
                  alt="App Icon Preview" 
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="mt-2 text-xs font-extrabold text-white max-w-[120px] truncate">
                {appTitle || 'التاجر الذكي'}
              </span>
            </div>
          </div>

          {/* Success Message */}
          {isSaved && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-emerald-900 dark:text-emerald-200 font-bold text-xs flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>تم تحديث الأيقونة واسم التطبيق بنجاح! عند إضافة التطبيق للشاشة الرئيسية سيظهر بالشكل الجديد.</span>
            </div>
          )}

          {/* Form Section 1: Choose or Upload Image */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
              1. اختر صورة الأيقونة من جهازك أو من الخيارات الجاهزة:
            </label>

            {/* Custom File Upload Button */}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={isProcessingImage}
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-extrabold py-3 px-4 rounded-2xl shadow-md transition-all cursor-pointer text-xs"
              >
                {isProcessingImage ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري معالجة وضغط الصورة فوراً...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>رفع صورة من الاستوديو / الهاتف</span>
                  </>
                )}
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                accept="image/*" 
                onChange={handleFileUpload} 
                className="hidden" 
              />

              <button
                type="button"
                onClick={handleDownloadIcon}
                title="تحميل صورة الأيقونة الحالية للجهاز"
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 p-3 rounded-2xl border border-slate-300 dark:border-slate-700 cursor-pointer flex items-center justify-center"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>

            {/* Presets List */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
              {PRESET_ICONS.map((preset) => {
                const isSelected = selectedIconUrl === preset.url;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setSelectedIconUrl(preset.url);
                      setIsSaved(false);
                    }}
                    className={`flex items-center gap-2.5 p-2.5 rounded-2xl border text-right transition-all cursor-pointer ${
                      isSelected 
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/30' 
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <img 
                      src={preset.url} 
                      alt={preset.name} 
                      className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-slate-700" 
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold truncate">{preset.name}</p>
                      <p className="text-[9px] text-slate-500 dark:text-slate-400 truncate">{preset.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Section 2: App Title */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
              2. اسم التطبيق الذي يظهر أسفل الأيقونة على الشاشة:
            </label>
            <input 
              type="text" 
              value={appTitle} 
              onChange={(e) => {
                setAppTitle(e.target.value);
                setIsSaved(false);
              }}
              placeholder="مثال: التاجر الذكي، تاجر البقالة، متجر البركة..." 
              className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-hidden"
            />
          </div>

          {/* Iframe Notice & External Link Trigger */}
          {isInIframe && (
            <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-orange-500/10 border-2 border-amber-400/80 rounded-2xl p-4 text-xs space-y-3 shadow-xs">
              <div className="flex items-start gap-2.5 font-extrabold text-amber-950 dark:text-amber-200">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-bounce" />
                <div>
                  <h4 className="text-xs font-black text-amber-950 dark:text-amber-100">
                    تنبيه حاسم لتثبيت الأيقونة على الشاشة الرئيسية للجوال:
                  </h4>
                  <p className="text-[11px] font-medium text-amber-900/90 dark:text-amber-200 mt-1 leading-relaxed">
                    أنت تتصفح التطبيق حالياً داخل إطار المعاينة (AI Studio). المتصفح يمنع تثبيت الأيقونات مباشرة من داخل الإطار المدمج.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleOpenExternal}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-black py-2.5 px-3 rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>فتح التطبيق في نافذة Chrome / Safari المستقلة</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-200 font-bold px-3 py-2.5 rounded-xl cursor-pointer hover:bg-amber-50 transition-colors flex items-center gap-1.5 text-xs shrink-0"
                >
                  <Copy className="w-4 h-4" />
                  <span>{copiedLink ? 'تم نسخ الرابط! ✓' : 'نسخ الرابط'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Apply Button */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              disabled={isApplying}
              onClick={handleApply}
              className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:bg-slate-400 text-white font-extrabold py-3.5 px-6 rounded-2xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 text-xs transition-all cursor-pointer transform active:scale-98"
            >
              {isApplying ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>جاري رفع وتحديث الأيقونة على الخادم...</span>
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  <span>تطبيق وحفظ الأيقونة واسم التطبيق الآن ✨</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-2xl text-xs cursor-pointer"
            >
              إغلاق
            </button>
          </div>

          {/* Guide Tips */}
          <div className="bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl p-4 text-xs text-emerald-900 dark:text-emerald-200 space-y-3 leading-relaxed">
            <div className="font-bold flex items-center gap-1.5 text-emerald-950 dark:text-emerald-100">
              <HelpCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>خطوات تثبيت الأيقونة على الشاشة الرئيسية لجوالك:</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
              {/* Android Box */}
              <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-emerald-200 dark:border-slate-700 space-y-1.5">
                <span className="font-black text-emerald-700 dark:text-emerald-400 block text-xs">
                  📱 أجهزة أندرويد (Google Chrome):
                </span>
                <ol className="list-decimal list-inside space-y-1 text-slate-700 dark:text-slate-300">
                  <li>افتح التطبيق في متصفح كروم.</li>
                  <li>اضغط زر القائمة الثلاث نقاط (<strong>⋮</strong>) في أعلى اليسار.</li>
                  <li>اختر <strong>"الإضافة إلى الشاشة الرئيسية"</strong> أو <strong>"تثبيت التطبيق"</strong>.</li>
                </ol>
              </div>

              {/* iPhone Box */}
              <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-emerald-200 dark:border-slate-700 space-y-1.5">
                <span className="font-black text-emerald-700 dark:text-emerald-400 block text-xs">
                  🍏 أجهزة آيفون (Safari):
                </span>
                <ol className="list-decimal list-inside space-y-1 text-slate-700 dark:text-slate-300">
                  <li>افتح الرابط في متصفح Safari.</li>
                  <li>اضغط زر المشاركة السفلي (مربع وسهم لأعلى <strong>⎋</strong>).</li>
                  <li>اختر <strong>"إضافة إلى الشاشة الرئيسية" (Add to Home Screen)</strong>.</li>
                </ol>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
