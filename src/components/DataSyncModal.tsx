import React, { useState } from 'react';
import { 
  X, 
  RefreshCw, 
  Download, 
  Upload, 
  Database, 
  CheckCircle2, 
  Wifi, 
  WifiOff, 
  Smartphone, 
  Cloud, 
  HardDrive, 
  ShieldCheck, 
  ArrowRightLeft,
  Sparkles,
  Info,
  FileCode
} from 'lucide-react';
import { ShopSettings } from '../types/accounting';
import { downloadStandaloneHtmlApp } from '../utils/exportHtmlApp';

interface DataSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportData: () => void;
  onImportData: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onForceLocalSync: () => void;
  settings: ShopSettings;
}

export const DataSyncModal: React.FC<DataSyncModalProps> = ({
  isOpen,
  onClose,
  onExportData,
  onImportData,
  onForceLocalSync,
  settings
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);
  const [isOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);

  if (!isOpen) return null;

  const handleRunSync = () => {
    setIsSyncing(true);
    setSyncSuccessMessage(null);
    setTimeout(() => {
      onForceLocalSync();
      setIsSyncing(false);
      setSyncSuccessMessage('تمت المزامنة بنجاح! جميع بيانات الفواتير، المخزون، والعملاء محفوظة ومحدثة 100% داخل ذاكرة هذا الهاتف.');
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200 my-auto">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 left-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
              <ArrowRightLeft className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-indigo-500/30 text-indigo-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-indigo-400/30 inline-flex items-center gap-1">
                  <HardDrive className="w-3 h-3" />
                  حفظ محلي داخل ذاكرة الهاتف 100%
                </span>
                {isOnline ? (
                  <span className="bg-emerald-500/30 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                    <Wifi className="w-3 h-3" /> أونلاين
                  </span>
                ) : (
                  <span className="bg-amber-500/30 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                    <WifiOff className="w-3 h-3" /> أوفلاين (شغال كاملاً)
                  </span>
                )}
              </div>
              <h2 className="text-xl font-extrabold text-white mt-1">مزامنة وتخزين البيانات (أوفلاين)</h2>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 text-right text-xs">
          
          {/* Important Explanation Box */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-950 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-emerald-900">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>تطبيقك غير مرتبط إجبارياً بالإنترنت!</span>
            </div>
            <p className="leading-relaxed">
              جميع بيانات متجرك (<strong className="text-emerald-950">{settings.shopName}</strong>) من فواتير بيع، مشتريات، مخزون، كشوف حسابات الزبائن والموردين تُحفظ تلقائياً ومباشرة داخل ذاكرة الهاتف المحلية (<span className="font-mono bg-emerald-100 px-1.5 py-0.5 rounded">IndexedDB / LocalStorage</span>).
            </p>
          </div>

          {/* Sync Success Alert */}
          {syncSuccessMessage && (
            <div className="bg-indigo-50 border border-indigo-200 text-indigo-900 p-3.5 rounded-2xl flex items-start gap-2 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <span className="font-semibold text-xs leading-relaxed">{syncSuccessMessage}</span>
            </div>
          )}

          {/* Actions Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            
            {/* Action 1: Local Sync Button */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between hover:border-indigo-300 transition-all">
              <div className="space-y-1 mb-3">
                <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                  <RefreshCw className={`w-4 h-4 text-indigo-600 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>مزامنة الذاكرة المحلية (اختياري)</span>
                </div>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  تحديث وتنشيط حفظ جميع السجلات والسندات بذاكرة الجهاز فوراً دون الحاجة لنت.
                </p>
              </div>
              <button
                onClick={handleRunSync}
                disabled={isSyncing}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-bold py-2.5 px-3 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'جاري المزامنة...' : 'تنشيط المزامنة الآن'}</span>
              </button>
            </div>

            {/* Action 2: Backup File to Phone */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between hover:border-emerald-300 transition-all">
              <div className="space-y-1 mb-3">
                <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                  <Download className="w-4 h-4 text-emerald-600" />
                  <span>حفظ نسخة بيانات بالموبايل</span>
                </div>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  تنزيل ملف كامل بجميع بياناتك (<span className="font-mono">JSON</span>) لتخزينه في ذاكرة الهاتف أوفلاين.
                </p>
              </div>
              <button
                onClick={onExportData}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-3 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>تنزيل ملف البيانات (.JSON)</span>
              </button>
            </div>

            {/* Action 3: Standalone HTML App Exporter */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between hover:border-purple-300 transition-all">
              <div className="space-y-1 mb-3">
                <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                  <FileCode className="w-4 h-4 text-purple-600" />
                  <span>تنزيل التطبيق كملف HTML أوفلاين</span>
                </div>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  تصدير صفحة تطبيق مستقلة (<span className="font-mono">.html</span>) يمكنك فتحها على هاتفك بدون إنترنت.
                </p>
              </div>
              <button
                onClick={() => downloadStandaloneHtmlApp(settings.shopName)}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 px-3 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <FileCode className="w-4 h-4" />
                <span>تحميل التطبيق (ملف HTML)</span>
              </button>
            </div>

            {/* Action 3: Restore Backup File */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between hover:border-amber-300 transition-all">
              <div className="space-y-1 mb-3">
                <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                  <Upload className="w-4 h-4 text-amber-600" />
                  <span>استرجاع ملف بيانات من الموبايل</span>
                </div>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  رفع واستعادة نسخة احتياطية سابقة تم تنزيلها على الهاتف بدون إنترنت.
                </p>
              </div>
              <label className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-3 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs text-center">
                <Upload className="w-4 h-4" />
                <span>اختر ملف من الهاتف (.JSON)</span>
                <input type="file" accept=".json" onChange={onImportData} className="hidden" />
              </label>
            </div>

            {/* Action 4: Cloud Sync Info */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between hover:border-sky-300 transition-all">
              <div className="space-y-1 mb-3">
                <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                  <Cloud className="w-4 h-4 text-sky-600" />
                  <span>المزامنة السحابية الخارجيّة</span>
                </div>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  خيار اختياري! إذا أردت ربط أكثر من كاشير بسيرفر واحد عند وجود نت، أما حالياً فالتطبيق يعمل أوفلاين 100%.
                </p>
              </div>
              <button
                type="button"
                onClick={() => alert('تنويه: التطبيق يعمل حالياً بوضع الأوفلاين المحلي الأسرع والأكثر أماناً داخل ذاكرة هاتفك. المزامنة مع خادم خارجي اختيارية.')}
                className="w-full bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 font-bold py-2.5 px-3 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Database className="w-4 h-4 text-sky-600" />
                <span>معلومات المزامنة الخارجيّة</span>
              </button>
            </div>

          </div>

          {/* Quick Guide to Add to Home Screen (Offline App) */}
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 font-bold text-indigo-950 text-xs">
              <Smartphone className="w-4 h-4 text-indigo-600" />
              <span>طريقة فتح التطبيق مباشرة من الهاتف بدون متصفح وبدون إنترنت:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-700 leading-relaxed font-medium">
              <li>افتح قائمة المتصفح (النقاط الثلاث <strong>⋮</strong> أو زر المشاركة <strong>⎋</strong>).</li>
              <li>اختر <strong>"الإضافة إلى الشاشة الرئيسية" (Add to Home Screen)</strong>.</li>
              <li>سيتم إنشاء أيقونة التطبيق على شاشة موبايلك الرئيسية ليفتح فوراً وبسرعة فائقة كأي تطبيق أندرويد/آيفون مستقل وبدون الحاجة لأي إنترنت!</li>
            </ol>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              إغلاق
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
