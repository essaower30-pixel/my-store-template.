import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Store, 
  Download, 
  Upload, 
  RefreshCw, 
  CheckCircle2, 
  DollarSign, 
  ShieldCheck,
  Trash2,
  Copy,
  Sparkles,
  Smartphone,
  AlertTriangle,
  QrCode,
  Printer,
  Calendar,
  Archive
} from 'lucide-react';
import { ShopSettings } from '../types/accounting';
import QRCode from 'qrcode';
import { getStoreLink } from '../utils/storeUrl';

interface SettingsModalProps {
  settings: ShopSettings;
  onUpdateSettings: (newSettings: ShopSettings) => void;
  onResetData: () => void;
  onClearAllData?: () => void;
  onCloseFiscalYear?: () => void;
  onOpenArchive?: () => void;
  onExportData: () => void;
  onImportData: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenDataSync?: () => void;
  onOpenAppIconCustomizer?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onResetData,
  onClearAllData,
  onCloseFiscalYear,
  onOpenArchive,
  onExportData,
  onImportData,
  onOpenDataSync,
  onOpenAppIconCustomizer
}) => {
  const isSubStore = typeof window !== 'undefined' && !!new URLSearchParams(window.location.search).get('store');
  const [formData, setFormData] = useState<ShopSettings>({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showCloseFiscalConfirm, setShowCloseFiscalConfirm] = useState(false);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Settings className="w-6 h-6 text-emerald-600" />
          <span>إعدادات المحل والنسخ الاحتياطي</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          تخصيص بيانات المتجر، نسبة الضريبة، العملة، وطباعة الفواتير.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 font-bold text-xs flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>تم حفظ تعديلات الإعدادات بنجاح!</span>
        </div>
      )}

      {/* App Icon Customizer Card at top */}
      {onOpenAppIconCustomizer && (
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl p-5 shadow-lg border border-emerald-800/50 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="bg-emerald-500/20 text-emerald-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30 inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              أيقونة الشاشة الرئيسية (PWA)
            </span>
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <span>تخصيص وتغيير أيقونة التطبيق واسمه على الموبايل</span>
            </h3>
            <p className="text-xs text-emerald-200/80 max-w-xl">
              يمكنك رفع أي صورة من استوديو هاتفك لتكون أيقونة التطبيق على شاشتك الرئيسية، أو اختيار أيقونة البقالة الجديدة 3D.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenAppIconCustomizer}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold px-5 py-3 rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-2 text-xs shrink-0 transform active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            <span>تغيير أيقونة التطبيق الآن ✨</span>
          </button>
        </div>
      )}

      {/* Settings Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5 text-xs">
        
        <div className="border-b border-slate-100 pb-3 font-bold text-slate-800 text-sm">
          1. بيانات المحل والنشاط التجارِي
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">اسم المحل / المتجر *</label>
            <input
              type="text"
              required
              value={formData.shopName}
              onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
              className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-slate-800"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">نوع النشاط التجارِي</label>
            <input
              type="text"
              value={formData.activityType}
              onChange={(e) => setFormData({ ...formData, activityType: e.target.value })}
              className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">رقم هاتف التواصل *</label>
            <input
              type="text"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full p-2.5 border border-slate-200 rounded-xl font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">العنوان والموقع</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full p-2.5 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block font-semibold text-slate-700 mb-1">رابط التطبيق للهواتف الأخرى (رابط المشاركة / PWA)</label>
            <input
              type="text"
              placeholder={`مثال: ${typeof window !== 'undefined' ? window.location.origin : 'https://ais-pre-lb77c3cfcml44alz4xw36x-105836077369.europe-west2.run.app'}`}
              value={formData.appUrl ?? (typeof window !== 'undefined' ? window.location.origin : '')}
              onChange={(e) => setFormData({ ...formData, appUrl: e.target.value })}
              className="w-full p-2.5 border border-slate-200 rounded-xl font-mono text-indigo-700 font-bold bg-indigo-50/50"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              هذا هو الرابط المباشر المستقر الذي يتم نسخه ومشاركته لفتح التطبيق على الأجهزة والموبايلات الأخرى.
            </p>
          </div>
        </div>

        <div className="border-b border-slate-100 pt-4 pb-3 font-bold text-slate-800 text-sm">
          2. الضرائب والعملة
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">رمز العملة *</label>
            <input
              type="text"
              required
              placeholder="مثال: ر.س، د.ج، ج.م، $"
              value={formData.currencySymbol}
              onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
              className="w-full p-2.5 border border-slate-200 rounded-xl font-bold"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">نسبة ضريبة القيمة المضافة (%)</label>
            <input
              type="number"
              step="0.1"
              value={formData.defaultTaxRate}
              onChange={(e) => setFormData({ ...formData, defaultTaxRate: Number(e.target.value) })}
              className="w-full p-2.5 border border-slate-200 rounded-xl font-mono font-bold"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">الرقم الضريبي للمحل</label>
            <input
              type="text"
              value={formData.taxNumber}
              onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
              className="w-full p-2.5 border border-slate-200 rounded-xl font-mono"
            />
          </div>
        </div>

        <div className="border-b border-slate-100 pt-4 pb-3 font-bold text-slate-800 text-sm">
          3. نصوص الفاتورة
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">ترويسة رأس الفاتورة</label>
            <input
              type="text"
              value={formData.receiptHeader}
              onChange={(e) => setFormData({ ...formData, receiptHeader: e.target.value })}
              className="w-full p-2.5 border border-slate-200 rounded-xl"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">ملاحظة ذيل الفاتورة</label>
            <input
              type="text"
              value={formData.receiptFooter}
              onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
              className="w-full p-2.5 border border-slate-200 rounded-xl"
            />
          </div>
        </div>

        <div className="border-b border-slate-100 pt-4 pb-3 font-bold text-slate-800 text-sm">
          4. خيارات واجهة المستخدم والتحكم والشاشة
        </div>

        <div className="space-y-3">
          <label className="flex items-center gap-3 p-3 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-xl cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={formData.enableAutoScroll ?? false}
              onChange={(e) => setFormData({ ...formData, enableAutoScroll: e.target.checked })}
              className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
            />
            <div className="text-right">
              <span className="block font-semibold text-slate-800 text-xs">التمرير التلقائي لأسفل عند النقر على الأيقونات والأقسام</span>
              <span className="block text-[11px] text-slate-500 mt-0.5">عند تفعيل هذا الخيار، سيقوم التطبيق بإنزال الشاشة تلقائياً للأسفل لعرض المحتوى مباشرةً عند التنقل بين الأقسام (مفيد للهواتف الصغيرة). افتراضياً هو غير مفعّل لراحة الاستخدام.</span>
            </div>
          </label>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-colors cursor-pointer"
          >
            حفظ إعدادات المحل
          </button>
        </div>

      </form>

      {/* إدارة الفروع وتعدد المتاجر */}
      {!isSubStore && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6 text-xs">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 shrink-0">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm">إدارة الفروع والمتاجر المتعددة (Multi-Store Links)</h3>
              <p className="text-slate-500 mt-1">
                هنا يمكنك تفعيل وتسمية حتى 10 متاجر أو فروع مستقلة تماماً. لكل متجر قاعدة بيانات معزولة ومخزون وفواتير وحسابات خاصة به لا تتداخل مع المتجر الرئيسي أو المتاجر الأخرى.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 10 }, (_, i) => {
              const storeId = `store_${i + 1}`;
              const currentStore = (formData.multiStores || []).find(s => s.id === storeId) || { id: storeId, name: '' };
              let appOrigin = typeof window !== 'undefined' ? window.location.origin : '';
              if (appOrigin.includes('ais-dev-')) {
                appOrigin = appOrigin.replace('ais-dev-', 'ais-pre-');
              }
              const branchUrl = `${appOrigin}/?store=${storeId}`;
              const isStoreActive = currentStore.name.trim() !== '';

              return (
                <div 
                  key={storeId} 
                  className={`p-4 rounded-xl border transition-all ${
                    isStoreActive 
                      ? 'bg-emerald-50/40 border-emerald-200/80 shadow-xs' 
                      : 'bg-slate-50/50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${isStoreActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                      <span>المتجر #{i + 1}</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      isStoreActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {isStoreActive ? 'مفعّل وقائم' : 'غير مفعّل'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">اسم المتجر / الفرع</label>
                      <input
                        type="text"
                        placeholder="أدخل اسم المتجر لتفعيله وتجهيز الرابط..."
                        value={currentStore.name}
                        onChange={(e) => {
                          const updated = [...(formData.multiStores || [])];
                          for (let j = 0; j < 10; j++) {
                            if (!updated[j]) {
                              updated[j] = { id: `store_${j + 1}`, name: '' };
                            }
                          }
                          updated[i].name = e.target.value;
                          setFormData({ ...formData, multiStores: updated });
                        }}
                        className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white font-bold text-slate-800 text-xs"
                      />
                    </div>

                    {isStoreActive && (
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">الرابط المخصص للمتجر</label>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            readOnly
                            value={branchUrl}
                            className="w-full p-2 border border-slate-200 rounded-lg bg-slate-100 font-mono text-[10px] text-indigo-700 font-bold select-all"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(branchUrl);
                              alert(`تم نسخ رابط المتجر (${currentStore.name}) بنجاح!`);
                            }}
                            className="px-2.5 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors flex items-center justify-center cursor-pointer text-slate-700 shrink-0"
                            title="نسخ الرابط"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-between items-center border-t border-slate-100">
            <p className="text-[10px] text-slate-500">
              * لتفعيل أي فرع، يكفي كتابة اسمه فقط، ثم الضغط على زر حفظ لتحديث الخادم وبدء التشغيل.
            </p>
            <button
              type="button"
              onClick={(e) => {
                handleSubmit(e);
              }}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-colors cursor-pointer w-full sm:w-auto"
            >
              حفظ أسماء المتاجر والفروع
            </button>
          </div>
        </div>
      )}

      {/* Backup & Restore Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4 text-xs">
        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-sky-600" />
          <span>إدارة النسخ الاحتياطي واستعادة البيانات</span>
        </h3>
        <p className="text-slate-500">
          تستطيع تصدير جميع بيانات شجرة الحسابات، الأصناف، الفواتير والزبائن في ملف JSON آمن للنسخ الاحتياطي أو الاستعادة.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          {onOpenDataSync && (
            <button
              type="button"
              onClick={onOpenDataSync}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-xs cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>مزامنة البيانات وتفاصيل الذاكرة (Data Sync)</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (confirm('سيتم الآن إفراغ الذاكرة المؤقتة للتطبيق وتحديثه فوراً لآخر نسخة وحل مشاكل الكاش. هل تود الاستمرار؟')) {
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then((registrations) => {
                    for (let registration of registrations) {
                      registration.update();
                    }
                  });
                }
                
                caches.keys().then((names) => {
                  return Promise.all(names.map(name => caches.delete(name)));
                }).then(() => {
                  window.location.reload();
                }).catch(() => {
                  window.location.reload();
                });
              }
            }}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-xs cursor-pointer"
            title="تحديث التطبيق فوراً وإفراغ الذاكرة المؤقتة القديمة لحل عدم ظهور الميزات الجديدة على الأجهزة الأخرى"
          >
            <RefreshCw className="w-4 h-4 animate-spin-slow" />
            <span>تحديث التطبيق وحل مشاكل الكاش (Update App)</span>
          </button>

          <button
            type="button"
            onClick={onExportData}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2.5 rounded-xl shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>تصدير نسخة احتياطية (Download JSON)</span>
          </button>

          <label className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-xs cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>استعادة نسخة احتياطية (Restore JSON)</span>
            <input type="file" accept=".json" onChange={onImportData} className="hidden" />
          </label>

          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center gap-2 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold px-4 py-2.5 rounded-xl border border-amber-200 cursor-pointer"
            title="استعادة أمثلة البيانات التجريبية الأولية"
          >
            <RefreshCw className="w-4 h-4" />
            <span>استعادة الأمثلة التجريبية</span>
          </button>

          {onClearAllData && (
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-xs cursor-pointer"
              title="تفريغ كل البيانات والحركات التجريبية والبدء بسجل خالي تماماً"
            >
              <Trash2 className="w-4 h-4" />
              <span>مسح وتصفير كافة البيانات (البدء على نظافة)</span>
            </button>
          )}

          {onCloseFiscalYear && (
            <button
              type="button"
              onClick={() => setShowCloseFiscalConfirm(true)}
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-xs cursor-pointer"
              title="إغلاق السنة المالية الحالية وتدوير الأرصدة وبضاعة أول المدة تلقائياً للعام الجديد"
            >
              <Calendar className="w-4 h-4" />
              <span>إغلاق السنة المالية وتدوير الأرصدة (ترحيل آلي بضغطة واحدة)</span>
            </button>
          )}

          {onOpenArchive && (
            <button
              type="button"
              onClick={onOpenArchive}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-xs cursor-pointer"
              title="تصفح أرشيف ومستندات الأعوام المغلقة والسابقة بأمان"
            >
              <Archive className="w-4 h-4" />
              <span>تصفح أرشيف السنوات المالية السابقة المغلقة</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              const defaultUrl = typeof window !== 'undefined' ? window.location.origin : '';
              const targetUrl = formData.appUrl || settings.appUrl || defaultUrl;
              navigator.clipboard.writeText(targetUrl).then(() => {
                alert('تم نسخ الرابط المباشر للبرنامج بنجاح!\n\nالرابط هو:\n' + targetUrl + '\n\nيمكنك لصقه الآن في متصفح Chrome أو Safari على الموبايل.');
              }).catch(() => {
                prompt('قم بنسخ الرابط التالي مباشرة لفتحه على الموبايل:', targetUrl);
              });
            }}
            className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-4 py-2.5 rounded-xl border border-indigo-200 cursor-pointer"
            title="نسخ رابط البرنامج المباشر لفتحه على الموبايل"
          >
            <Copy className="w-4 h-4" />
            <span>نسخ رابط البرنامج المباشر (الموبايل)</span>
          </button>
        </div>
      </div>

      {/* Offline PWA Installation Guide Card */}
      <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            ⚡
          </div>
          <div>
            <h3 className="text-lg font-bold text-emerald-950">التشغيل والتثبيت بدون إنترنت (Offline PWA)</h3>
            <p className="text-xs text-emerald-700 font-medium">البرنامج يعمل كاملاً بدون الحاجة للاتصال بالأنترنت ويحفظ بياناتك محلياً على جهازك</p>
          </div>
        </div>

        <div className="space-y-3 text-sm text-emerald-900 leading-relaxed">
          <div className="bg-white/90 p-4 rounded-xl border border-emerald-200 shadow-xs">
            <h4 className="font-bold text-emerald-950 mb-2 flex items-center gap-2">
              <span>📱 على الجوال (أندرويد / Android - Chrome):</span>
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-xs text-slate-700 font-medium">
              <li>افتح رابط البرنامج المباشر في متصفح <b>Google Chrome</b>.</li>
              <li>اضغط على <b>قائمة النقاط الثلاث (⋮)</b> في أعلى الشاشة.</li>
              <li>اختر <b>"الإضافة إلى الشاشة الرئيسية" (Add to Home screen)</b> أو <b>"تثبيت التطبيق"</b>.</li>
              <li>سيظهر تطبيق <b>"التاجر الذكي"</b> على شاشتك الرئيسية ويعمل 100% بدون إنترنت.</li>
            </ol>
          </div>

          <div className="bg-white/90 p-4 rounded-xl border border-emerald-200 shadow-xs">
            <h4 className="font-bold text-emerald-950 mb-2 flex items-center gap-2">
              <span>🍏 على الآيفون والآيباد (iPhone / Safari):</span>
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-xs text-slate-700 font-medium">
              <li>افتح رابط البرنامج المباشر في متصفح <b>Safari</b>.</li>
              <li>اضغط على زر <b>المشاركة (Share button)</b> أسفل الشاشة.</li>
              <li>اختر <b>"الإضافة إلى الشاشة الرئيسية" (Add to Home Screen)</b>.</li>
              <li>سيعمل التطبيق كـ تطبيق آيفون مستقل وبدون الحاجة لشبكة إنترنت.</li>
            </ol>
          </div>

          <div className="bg-white/90 p-4 rounded-xl border border-emerald-200 shadow-xs">
            <h4 className="font-bold text-emerald-950 mb-2 flex items-center gap-2">
              <span>💻 على الكمبيوتر (Windows / Mac):</span>
            </h4>
            <p className="text-xs text-slate-700 font-medium">
              اضغط على أيقونة التثبيت (➕) الموجودة بجانب شريط العنوان في متصفح Chrome أو Edge أعلى الصفحة لتنزيل تطبيق سطح المكتب المباشر.
            </p>
          </div>
        </div>
      </div>

      {/* Custom Modal: Clear All Data Confirmation */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 flex flex-col items-center text-center animate-fade-in dir-rtl">
            <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 mb-4 border border-rose-100">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            
            <h3 className="font-black text-slate-900 text-base mb-2">تنبيه أمان وحذف نهائي</h3>
            
            <p className="text-xs text-slate-600 mb-5 leading-relaxed">
              ⚠️ تحذير: هل أنت متأكد من <span className="font-bold text-rose-600">مسح وتصفير كافة الحركات</span>، الفواتير، المنتجات، والعملاء للبدء بسجل خالي تماماً؟ لا يمكن التراجع عن هذا الإجراء لاحقاً!
            </p>

            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onClearAllData) {
                    onClearAllData();
                  }
                  setShowClearConfirm(false);
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
              >
                تأكيد المسح الشامل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Modal: Reset Data Confirmation */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 flex flex-col items-center text-center animate-fade-in dir-rtl">
            <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 mb-4 border border-amber-100">
              <RefreshCw className="w-6 h-6 animate-spin-slow" />
            </div>
            
            <h3 className="font-black text-slate-900 text-base mb-2">استعادة الأمثلة التجريبية</h3>
            
            <p className="text-xs text-slate-600 mb-5 leading-relaxed">
              هل أنت متأكد من إعادة ضبط بيانات المحل للأمثلة الافتراضية؟ سيتم إدراج بيانات توضيحية لسهولة تجربة البرنامج.
            </p>

            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  onResetData();
                  setShowResetConfirm(false);
                }}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
              >
                تأكيد الاستعادة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Modal: Fiscal Year Closure Confirmation */}
      {showCloseFiscalConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 flex flex-col items-center text-center animate-fade-in dir-rtl">
            <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 mb-4 border border-teal-100">
              <Calendar className="w-6 h-6 animate-pulse" />
            </div>
            
            <h3 className="font-black text-slate-900 text-base mb-2">إغلاق وتدوير الدورة المالية للعام الجديد</h3>
            
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              يقوم هذا الإجراء التلقائي بالعمليات التالية بضغطة زر واحدة:
            </p>
            <ul className="text-[11px] text-right text-slate-600 space-y-1 bg-slate-50 p-3.5 rounded-xl border border-slate-100 mb-5 w-full list-disc list-inside">
              <li>حساب الأرصدة النهائية المستحقة للزبائن وترحيلها كـ <b>أرصدة افتتاحية</b>.</li>
              <li>حساب الأرصدة النهائية للموردين وترحيلها كـ <b>أرصدة افتتاحية</b>.</li>
              <li>حساب كمية المخزون الفعلي الحالي وتثبيته كـ <b>بضاعة أول المدة</b>.</li>
              <li>توليد <b>القيد الافتتاحي المتوازن</b> تلقائياً (الصندوق، البنك، الذمم، المخزون، ورأس المال).</li>
              <li><b>أرشفة وتصفير</b> كافة الفواتير والقيود والسندات القديمة لبدء دورة نظيفة وسريعة.</li>
            </ul>

            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={() => setShowCloseFiscalConfirm(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onCloseFiscalYear) {
                    onCloseFiscalYear();
                  }
                  setShowCloseFiscalConfirm(false);
                }}
                className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
              >
                تأكيد الإغلاق والترحيل الآلي
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
