import React from 'react';
import { X, Printer, Download, BookOpen, CheckCircle, HelpCircle, ShoppingBag, Package, Users, Truck, PieChart, Sparkles, Smartphone } from 'lucide-react';
import { ShopSettings } from '../types/accounting';

interface UserManualModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ShopSettings;
}

export const UserManualModal: React.FC<UserManualModalProps> = ({
  isOpen,
  onClose,
  settings,
}) => {
  if (!isOpen) return null;

  const handlePrintOrDownload = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <title>دليل استخدام برنامج المحاسبة والتاجر الذكي - ${settings.shopName || 'المتجر'}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; direction: rtl; color: #0f172a; line-height: 1.8; background: #fff; }
            h1 { color: #1e1b4b; border-bottom: 3px solid #4f46e5; padding-bottom: 10px; font-size: 24px; text-align: center; }
            h2 { color: #4338ca; margin-top: 25px; border-right: 4px solid #6366f1; padding-right: 10px; font-size: 18px; }
            h3 { color: #0f172a; font-size: 15px; margin-top: 15px; }
            p, li { font-size: 13px; color: #334155; }
            ul { padding-right: 20px; }
            .box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 12px; margin: 15px 0; }
            .tip { background: #ecfdf5; border-right: 4px solid #10b981; padding: 10px 15px; margin: 10px 0; font-weight: bold; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>📖 دليل الاستخدام الشامل لبرنامج التاجر الذكي للمحلات التجارية</h1>
          <p style="text-align: center; color: #64748b; font-size: 12px;">إصدار الدليل المعتمد للمتجر: <strong>${settings.shopName || 'المتجر'}</strong> | تاريخ الطباعة: ${new Date().toLocaleDateString('ar-SA')}</p>

          <div class="box">
            <h2>1. مقدمة ونظرة عامة على البرنامج</h2>
            <p>برنامج التاجر الذكي هو نظام محاسبي وإداري متكامل مصمم خصيصاً لتلبية احتياجات المحلات التجارية الصغيرة والمتوسطة. يتميز بالبساطة، السرعة، ودعم كامل لكاميرا الموبايل والباركود طباعة وقراءة.</p>
          </div>

          <div class="box">
            <h2>2. نقطة البيع والمبيعات (POS) ومسح الباركود</h2>
            <ul>
              <li><strong>إضافة المنتجات للسلة:</strong> يمكنك البحث بالاسم، أو النقر على صورة الصنف، أو كتابة رقم الباركود.</li>
              <li><strong>البيع بكاميرا الموبايل:</strong> انقر على زر 📷 <strong>"كاميرا الموبايل"</strong> بجانب شريط البحث، ووجه كاميرا هاتف الموبايل نحو باركود الصنف ليتم إضافته فوراً للسلة.</li>
              <li><strong>نوع الدفع (نقداً / آجل):</strong> اختاري زبون كاش أو زبون آجل مسجل لربط المبيعات بحسابه تلقائياً.</li>
              <li><strong>طباعة الفاتورة:</strong> عند إتمام البيع، يمكنك طباعة الفاتورة فوراً بنظام الحراري (Thermal Receipt).</li>
            </ul>
          </div>

          <div class="box">
            <h2>3. إدارة المخزون وطباعة ملصقات الباركود</h2>
            <ul>
              <li><strong>إضافة أصناف جديدة:</strong> ادخل على قائمة الأصناف ⬅️ إضافة صنف جديد (الاسم، التصنيف، سعر الشراء، سعر البيع، الكمية الحالية، والباركود).</li>
              <li><strong>مسح الباركود للكاميرا أثناء الإدخال:</strong> يوجد زر كاميرا صغير بجانب خانة الباركود لالتقاط رقم الباركود تلقائياً.</li>
              <li><strong>طباعة ملصقات الباركود:</strong> يوجد أيقونة باركود صفراء بجانب كل صنف تسمح لك بطباعة أي عدد من الملصقات بالاسم والسعر والباركود للصقها على المنتجات!</li>
            </ul>
          </div>

          <div class="box">
            <h2>4. إدارة المشتريات والموردين</h2>
            <ul>
              <li><strong>تسجيل فواتير الشراء:</strong> يمكنك اختيار المورد، ومسح باركود البضاعة بالكاميرا أو اختيارها من القائمة وتحديد الكمية وسعر التكلفة.</li>
              <li><strong>تحديث المخزون التلقائي:</strong> عند حفظ فاتورة الشراء، يتم زيادة كمية المخزون في المستودع تلقائياً وتحديث حساب المورد.</li>
            </ul>
          </div>

          <div class="box">
            <h2>5. إشعارات الديون وكشوفات الحسابات والواتساب</h2>
            <ul>
              <li><strong>كشف حساب تفصيلي:</strong> ادخل على قسم "الزبائن" أو "الموردين" واضغط زر <strong>"كشف حساب"</strong> لعرض وتصدير كل الحركات بالرصيد التراكمي.</li>
              <li><strong>إشعار الديون عبر الواتساب:</strong> اضغط على زر 🟢 <strong>"واتساب"</strong> بجانب اسم الزبون لإرسال رسالة تذكير احترافية ومباشرة بالمبلغ المستحق على هاتفه.</li>
            </ul>
          </div>

          <div class="box">
            <h2>6. التقارير المالية وتحليلات الأرباح</h2>
            <ul>
              <li><strong>قائمة الدخل والربح الصافي:</strong> يعرض الأرباح التشغيلية، المصاريف، وصافي أرباح المحل.</li>
              <li><strong>الأصناف الأكثر مبيعاً:</strong> تحليلات للكميات المباعة من كل صنف وإجمالي الأرباح المحققة منه.</li>
            </ul>
          </div>

          <div class="box">
            <h2>7. تشغيل الشاشة الكاملة (Full Screen) والعمل بدون إنترنت (Offline Mode)</h2>
            <ul>
              <li><strong>زر ملء الشاشة ⛶:</strong> يمكنك الضغط على أيقونة ملء الشاشة أعلى الشريط العلوي لتكبير البرنامج وإخفاء شريط المتصفح ليعمل كبرنامج سطح مكتب أو كاشير احترافي.</li>
              <li><strong>العمل بدون إنترنت (Offline):</strong> جميع بيانات المحل (المنتجات، الفواتير، الزبائن، والقيود) تُحفظ محلياً على جهازك مباشرة (Local Storage). بعد فتح الصفحة لأول مرة، يمكنك إجراء عمليات البيع والطباعة وإضافة المنتجات حتى لو انقطع اتصال الإنترنت!</li>
              <li><strong>النسخ الاحتياطي:</strong> يُنصح بضغط زر "تصدير نسخة احتياطية" في أعلى الشاشة أسبوعياً للحفاظ على ملف الأمان لبيانات المحل.</li>
            </ul>
          </div>

          <div class="box">
            <h2>8. كيفية استنساخ أكثر من نسخة لأكثر من محل؟</h2>
            <p>إذا كان لديك أكثر من فرع أو محل، يمكنك استخدام أحد الطرق التالية بسهولة:</p>
            <ul>
              <li><strong>الاستنساخ عبر خيار المشاركة/التصدير:</strong> يمكنك تصدير كود التطبيق أو عمل Duplicate للمشروع ليكون لديك رابط مستقل وبينات مستقلة لكل محل.</li>
              <li><strong>استخدام متصفحات/ملفات بروفايل مختلفة:</strong> فتح البرنامج في متصفح مختلف أو نافذة مستقلة لكل فرع تجاري.</li>
            </ul>
          </div>

          <div class="tip">
            نتمنى لك تجارة رابحة وعملاً موفقاً بفضل الله!
          </div>

          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 dir-rtl text-right">
      <div className="bg-white rounded-[2.5rem] max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6 max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center border border-indigo-100 shadow-xs">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">دليل استخدام تشغيل برنامج المحاسبة</h3>
              <p className="text-xs text-slate-500">دليل الشرح الشامل لجميع خواص ومميزات النظام مع إمكانية الحفظ والطباعة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Manual Content Scroll Area */}
        <div className="overflow-y-auto flex-1 space-y-5 pr-1 text-slate-800 text-xs leading-relaxed">

          {/* Quick Clone Notice */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-emerald-950">
            <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-extrabold text-sm text-emerald-900">إمكانية فتح نسخ متعددة لأكثر من محل!</h4>
              <p className="text-xs mt-1">
                نعم، يمكنك استنساخ وتخصيص نسخة مستقلة لكل محل أو فرع ببياناته ومخزونه الخاص، إما من خلال تصدير الكود أو فتح التطبيق في روابط/متصفحات مختلفة لكل فرع.
              </p>
            </div>
          </div>

          {/* Section 1 */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-indigo-900 font-extrabold text-sm">
              <ShoppingBag className="w-4 h-4 text-indigo-600" />
              <span>1. نقطة البيع (POS) المباشرة وكاميرا الموبايل</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-700 pr-2">
              <li><strong>إيقاف وتوجيه الكاميرا:</strong> يمكنك الضغط على زر 📷 <strong>"كاميرا الموبايل"</strong> أعلى نقطة البيع لفتح الكاميرا ومسح باركود المنتج مباشرة دون الحاجة لشراء قارئ باركود خارجي.</li>
              <li><strong>اختيار الزبون:</strong> يمكنك تحويل طريقة البيع إلى "نقداً" أو اختيار زبون مسجل لربط الآجل بـ "كشف حسابه".</li>
              <li><strong>طباعة الفواتير:</strong> بمجرد الضغط على إتمام البيع، يمكنك طباعة الفاتورة الفورية للمشتري.</li>
            </ul>
          </div>

          {/* Section 2 */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-indigo-900 font-extrabold text-sm">
              <Package className="w-4 h-4 text-indigo-600" />
              <span>2. إدارة الأصناف والمخزون وطباعة الملصقات</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-700 pr-2">
              <li><strong>إدخال الباركود بالكاميرا:</strong> عند إضافة صنف جديد، اضغط على زر "مسح بالكاميرا" بجانب خانة الباركود ليلتقطه النظام فوراً.</li>
              <li><strong>طباعة استكرات الباركود:</strong> يوجد أيقونة باركود بجانب كل صنف في القائمة، تتيح لك طباعة ملصقات لاصقة تحتوي على اسم المحل، اسم الصنف، الباركود، والسعر!</li>
              <li><strong>تنبيهات نقص المخزون:</strong> يظهر تنبيه أصفر تلقائي عند اقتراب كمية أي صنف من حد الأمان.</li>
            </ul>
          </div>

          {/* Section 3 */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-indigo-900 font-extrabold text-sm">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>3. إدارة الزبائن، كشوفات الحسابات والتذكير عبر الواتساب</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-700 pr-2">
              <li><strong>كشف حساب الزبون:</strong> اضغط على زر "كشف حساب" للزبون لرؤية جدول تفصيلي بكل الفواتير وسندات القبض والرصيد المتبقي.</li>
              <li><strong>إشعار الديون بالواتساب:</strong> اضغط زر 🟢 <strong>"واتساب"</strong> ليقوم البرنامج بفتح محادثة واتساب جاهزة تحتوي على نص التذكير والمبلغ المستحق!</li>
              <li><strong>سندات القبض:</strong> يمكنك تحصيل مبالغ من الزبائن وتسجيلها في الصندوق وتحديث رصيد الديون فوراً.</li>
            </ul>
          </div>

          {/* Section 4 */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-indigo-900 font-extrabold text-sm">
              <Truck className="w-4 h-4 text-indigo-600" />
              <span>4. المشتريات والموردين والتقارير المالية</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-700 pr-2">
              <li><strong>فواتير المشتريات:</strong> إدخال الفواتير القادمة من الموردين لزيادة المخزون آلياً.</li>
              <li><strong>الأرباح والتقارير:</strong> يعرض قسم التقارير المالية أرباحك الصافية والأصناف الأكثر مبيعاً ونسبة هامش الربح الإجمالي.</li>
            </ul>
          </div>

          {/* Section 5: Mobile App Installation */}
          <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-indigo-950 font-extrabold text-sm">
              <Smartphone className="w-5 h-5 text-indigo-600" />
              <span>5. طريقة إضافة البرنامج إلى شاشة الموبايل الرئيسية (أيقونة تطبيق)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-700">
              <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-2xs space-y-1.5">
                <span className="font-bold text-indigo-900 block">📱 لأجهزة أندرويد (Android - Chrome):</span>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600">
                  <li>افتح رابط البرنامج في متصفح جوجل كروم.</li>
                  <li>اضغط على خيارات المتصفح (النقاط الثلاث <strong>⋮</strong> بالأعلى).</li>
                  <li>اختر <strong>"الإضافة إلى الشاشة الرئيسية"</strong> (Add to Home screen) أو "تثبيت التطبيق".</li>
                  <li>ستظهر أيقونة المحل المصممة فوراً على شاشة هاتفك الرئيسية كأي تطبيق عادي.</li>
                </ol>
              </div>

              <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-2xs space-y-1.5">
                <span className="font-bold text-indigo-900 block">🍏 لأجهزة آيفون (iPhone - Safari):</span>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600">
                  <li>افتح رابط البرنامج في متصفح سفاري (Safari).</li>
                  <li>اضغط على زر المشاركة أسفل الشاشة (مربع بسهم للأعلى <strong>⎘</strong>).</li>
                  <li>اختر <strong>"إضافة إلى الشاشة الرئيسية"</strong> (Add to Home Screen).</li>
                  <li>سيظهر اسم المحل وأيقونة التطبيق على شاشة الآيفون لتشغيله بنقرة واحدة!</li>
                </ol>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
          <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
            💡 يمكنك حفظ هذا الملف بصيغة PDF أو طباعته ورقياً من خلال زر الطباعة.
          </p>

          <div className="flex items-center gap-3 mr-auto">
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-colors cursor-pointer"
            >
              إغلاق
            </button>
            <button
              onClick={handlePrintOrDownload}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-2 shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>حفظ / طباعة الدليل بملف</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
