import React, { useState } from 'react';
import { 
  X, 
  Calendar, 
  Archive, 
  TrendingUp, 
  Package, 
  FileText, 
  Users, 
  BookOpen, 
  Download, 
  Search,
  Eye
} from 'lucide-react';
import { FiscalYearArchive } from '../types/accounting';

interface FiscalYearArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  archives: FiscalYearArchive[];
}

export const FiscalYearArchiveModal: React.FC<FiscalYearArchiveModalProps> = ({
  isOpen,
  onClose,
  archives
}) => {
  const [selectedArchive, setSelectedArchive] = useState<FiscalYearArchive | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'invoices' | 'contacts' | 'journal'>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  // Calculate quick metrics for the active archive
  const getArchiveMetrics = (arc: FiscalYearArchive) => {
    const totalSales = arc.data.salesInvoices.reduce((sum, inv) => sum + (inv.netTotal || 0), 0);
    const totalPurchases = arc.data.purchaseInvoices.reduce((sum, inv) => sum + (inv.netTotal || 0), 0);
    const stockVal = arc.data.products.reduce((sum, p) => sum + ((p.stock || 0) * (p.costPrice || 0)), 0);
    const receivables = arc.data.customers.reduce((sum, c) => sum + (c.openingBalance || 0), 0);
    const payables = arc.data.suppliers.reduce((sum, s) => sum + (s.openingBalance || 0), 0);

    return { totalSales, totalPurchases, stockVal, receivables, payables };
  };

  const handleExportSingleArchive = (arc: FiscalYearArchive) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(arc, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `ارشيف_السنة_المالية_${arc.year}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-5xl w-full h-[90vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden dir-rtl">
        
        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-slate-900 text-lg leading-tight">أرشيف السنوات المالية المغلقة</h2>
              <p className="text-xs text-slate-500">تصفح سجلات حسابات ومخازن المحل للأعوام السابقة بأمان كامل للقراءة فقط</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer text-slate-400 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inner layout split */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Sidebar: List of closed years */}
          <div className="w-64 border-l border-slate-100 bg-slate-50/50 p-4 flex flex-col gap-3 overflow-y-auto shrink-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">قائمة الأعوام المؤرشفة</span>
            
            {archives.length === 0 ? (
              <div className="text-center py-8 px-4 border border-dashed border-slate-200 rounded-2xl bg-white mt-2">
                <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-medium leading-relaxed">لا يوجد سنوات مغلقة حتى الآن.</p>
                <p className="text-[10px] text-slate-400 mt-1">عند تفعيل ميزة "إغلاق السنة" سيتم حفظ أرشيفك هنا تلقائياً.</p>
              </div>
            ) : (
              archives.map((arc) => {
                const metrics = getArchiveMetrics(arc);
                const isSelected = selectedArchive?.id === arc.id;
                return (
                  <button
                    key={arc.id}
                    onClick={() => {
                      setSelectedArchive(arc);
                      setActiveTab('overview');
                      setSearchQuery('');
                    }}
                    className={`text-right p-3.5 rounded-xl border transition-all flex flex-col gap-1.5 cursor-pointer ${
                      isSelected 
                        ? 'bg-teal-600 border-teal-600 text-white shadow-md shadow-teal-600/10' 
                        : 'bg-white border-slate-100 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="font-extrabold text-sm">أرشيف سنة {arc.year}</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full ${isSelected ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        مغلق
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px] w-full">
                      <span className={isSelected ? 'text-teal-100' : 'text-slate-400'}>مبيعات: {metrics.totalSales.toLocaleString('en-US', { minimumFractionDigits: 1 })}</span>
                      <span className={isSelected ? 'text-teal-100' : 'text-slate-400'}>{arc.closedAt}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Main content display area */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            {!selectedArchive ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 mb-4">
                  <Archive className="w-8 h-8" />
                </div>
                <h3 className="font-extrabold text-slate-800 text-base mb-1">تصفح مستندات وسجلات الأعوام السابقة</h3>
                <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                  الرجاء اختيار السنة المالية التي ترغب في مراجعتها من القائمة الجانبية. يمكنك فحص الفواتير والمنتجات وأرصدة الديون السابقة دون التأثير على حساباتك الحالية.
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                
                {/* Archive details toolbar */}
                <div className="px-6 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/20 shrink-0">
                  <div className="flex items-center gap-3">
                    <h3 className="font-black text-slate-900 text-base">أرشيف الدورة المالية لعام {selectedArchive.year}</h3>
                    <span className="text-[11px] text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/50">
                      تاريخ التدوير والإغلاق: <b>{selectedArchive.closedAt}</b>
                    </span>
                  </div>
                  
                  <button
                    onClick={() => handleExportSingleArchive(selectedArchive)}
                    className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-teal-600 bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-200 px-3 py-1.5 rounded-xl shadow-xs transition-colors cursor-pointer"
                    title="تحميل نسخة احتياطية مستقلة لهذه السنة فقط"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تصدير ملف الأرشيف JSON</span>
                  </button>
                </div>

                {/* Tab navigator */}
                <div className="border-b border-slate-100 px-6 flex gap-4 shrink-0 bg-white">
                  {[
                    { id: 'overview', label: 'ملخص العام', icon: TrendingUp },
                    { id: 'products', label: 'المستودع والأصناف', icon: Package },
                    { id: 'invoices', label: 'الفواتير والعمليات', icon: FileText },
                    { id: 'contacts', label: 'العملاء والموردين', icon: Users },
                    { id: 'journal', label: 'قيود اليومية العامة', icon: BookOpen },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id as any);
                          setSearchQuery('');
                        }}
                        className={`flex items-center gap-1.5 py-3 border-b-2 font-bold text-xs transition-all cursor-pointer ${
                          isActive 
                            ? 'border-teal-600 text-teal-600' 
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Sub-search bar if not overview */}
                {activeTab !== 'overview' && (
                  <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50/10 shrink-0">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="بحث في سجلات الأرشيف..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pr-9 pl-3 py-1.5 rounded-xl border border-slate-200 focus:border-teal-500 outline-hidden text-xs bg-white text-slate-800"
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">وضع العرض فقط للتقارير التاريخية</span>
                  </div>
                )}

                {/* Tab body contents */}
                <div className="flex-1 overflow-y-auto p-6">
                  
                  {/* OVERVIEW TAB */}
                  {activeTab === 'overview' && (() => {
                    const metrics = getArchiveMetrics(selectedArchive);
                    return (
                      <div className="space-y-6">
                        <div className="grid grid-cols-5 gap-4">
                          <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col gap-1">
                            <span className="text-[11px] text-slate-500 font-bold">إجمالي المبيعات</span>
                            <span className="text-lg font-black text-slate-900">{metrics.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                            <span className="text-[10px] text-slate-400">شامل ضريبة القيمة المضافة</span>
                          </div>
                          <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col gap-1">
                            <span className="text-[11px] text-slate-500 font-bold">إجمالي المشتريات</span>
                            <span className="text-lg font-black text-slate-900">{metrics.totalPurchases.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                            <span className="text-[10px] text-slate-400">لتزويد المخازن بالبضاعة</span>
                          </div>
                          <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col gap-1">
                            <span className="text-[11px] text-slate-500 font-bold">قيمة المخزون (بضاعة آخر المدة)</span>
                            <span className="text-lg font-black text-teal-600">{metrics.stockVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                            <span className="text-[10px] text-slate-400">بناءً على كمية المخزن و سعر الشراء</span>
                          </div>
                          <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col gap-1">
                            <span className="text-[11px] text-slate-500 font-bold">ديون ومستحقات العملاء</span>
                            <span className="text-lg font-black text-slate-900">{metrics.receivables.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                            <span className="text-[10px] text-slate-400">ذمم مدينة مرحلة كـ رصيد افتتاحي</span>
                          </div>
                          <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col gap-1">
                            <span className="text-[11px] text-slate-500 font-bold">مستحقات الموردين</span>
                            <span className="text-lg font-black text-slate-900">{metrics.payables.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                            <span className="text-[10px] text-slate-400">ذمم دائنة مرحلة كـ رصيد افتتاحي</span>
                          </div>
                        </div>

                        {/* General archive info */}
                        <div className="p-4 rounded-2xl bg-teal-50/40 border border-teal-100/50 flex gap-3.5 items-start">
                          <Eye className="w-5 h-5 text-teal-600 mt-0.5 shrink-0" />
                          <div className="text-xs text-slate-600 leading-relaxed">
                            <p className="font-bold text-slate-900 mb-1">أرشيف محاسبي مغلق ومحمي</p>
                            لقد قمت بإغلاق وتدوير الدورة المحاسبية لهذه السنة بنجاح. كافة المستندات والتفاصيل المعروضة هنا هي مجمدة ومؤرشفة للرجوع إليها في أي وقت للمقارنة أو التدقيق الضريبي، وهي معزولة تماماً ولا تدخل في حسابات السنة الجارية.
                          </div>
                        </div>

                        {/* Inventory Value Note */}
                        <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 text-xs">
                          <h4 className="font-black text-slate-900 mb-2">إحصائيات مستندات السنة المغلقة</h4>
                          <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                            <div className="flex justify-between py-1.5 border-b border-slate-100">
                              <span className="text-slate-500">عدد فواتير المبيعات:</span>
                              <span className="font-bold text-slate-800">{selectedArchive.data.salesInvoices.length} فاتورة مبيعات</span>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-slate-100">
                              <span className="text-slate-500">عدد فواتير المشتريات:</span>
                              <span className="font-bold text-slate-800">{selectedArchive.data.purchaseInvoices.length} فاتورة تزويد</span>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-slate-100">
                              <span className="text-slate-500">عدد قيود اليومية العامة واليدوية:</span>
                              <span className="font-bold text-slate-800">{selectedArchive.data.journalEntries.length} قيد محاسبي</span>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-slate-100">
                              <span className="text-slate-500">عدد سندات القبض والدفع:</span>
                              <span className="font-bold text-slate-800">{selectedArchive.data.vouchers.length} سند مالي</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* PRODUCTS TAB */}
                  {activeTab === 'products' && (() => {
                    const filtered = selectedArchive.data.products.filter(p => 
                      p.name.includes(searchQuery) || (p.barcode && p.barcode.includes(searchQuery))
                    );
                    return (
                      <table className="w-full text-right border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 border-b border-slate-100">
                            <th className="py-3 px-4 font-black">اسم الصنف</th>
                            <th className="py-3 px-4 font-black">الباركود</th>
                            <th className="py-3 px-4 font-black text-center">الكمية المغلقة</th>
                            <th className="py-3 px-4 font-black text-left">سعر الشراء</th>
                            <th className="py-3 px-4 font-black text-left">سعر البيع</th>
                            <th className="py-3 px-4 font-black text-left">قيمة البضاعة المغلقة</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filtered.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="text-center py-8 text-slate-400">لا توجد أصناف مطابقة للبحث</td>
                            </tr>
                          ) : (
                            filtered.map((p, i) => (
                              <tr key={p.id || i} className="hover:bg-slate-50">
                                <td className="py-3 px-4 font-bold text-slate-800">{p.name}</td>
                                <td className="py-3 px-4 text-slate-500 font-mono">{p.barcode || '---'}</td>
                                <td className="py-3 px-4 text-center font-bold text-slate-700">{p.stock} {p.unit || 'حبة'}</td>
                                <td className="py-3 px-4 text-left text-slate-600">{(p.costPrice || 0).toFixed(2)}</td>
                                <td className="py-3 px-4 text-left text-slate-600">{(p.sellingPrice || 0).toFixed(2)}</td>
                                <td className="py-3 px-4 text-left font-extrabold text-teal-600">{((p.stock || 0) * (p.costPrice || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    );
                  })()}

                  {/* INVOICES TAB */}
                  {activeTab === 'invoices' && (() => {
                    const sales = selectedArchive.data.salesInvoices.map(s => ({ ...s, type: 'مبيعات' }));
                    const purchases = selectedArchive.data.purchaseInvoices.map(p => ({ ...p, type: 'مشتريات' }));
                    const merged = [...sales, ...purchases].sort((a, b) => b.date.localeCompare(a.date));
                    const filtered = merged.filter(inv => 
                      inv.invoiceNumber.includes(searchQuery) || 
                      inv.customerName?.includes(searchQuery) ||
                      inv.supplierName?.includes(searchQuery)
                    );
                    return (
                      <table className="w-full text-right border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 border-b border-slate-100">
                            <th className="py-3 px-4 font-black">رقم الفاتورة</th>
                            <th className="py-3 px-4 font-black text-center">النوع</th>
                            <th className="py-3 px-4 font-black">التاريخ</th>
                            <th className="py-3 px-4 font-black">الطرف الثاني</th>
                            <th className="py-3 px-4 font-black text-center">طريقة الدفع</th>
                            <th className="py-3 px-4 font-black text-left">المجموع الصافي</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filtered.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="text-center py-8 text-slate-400">لا توجد فواتير مطابقة للبحث</td>
                            </tr>
                          ) : (
                            filtered.map((inv, i) => (
                              <tr key={inv.id || i} className="hover:bg-slate-50">
                                <td className="py-3 px-4 font-bold text-slate-800">{inv.invoiceNumber}</td>
                                <td className="py-3 px-4 text-center">
                                  <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                    inv.type === 'مبيعات' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-blue-50 text-blue-600 border border-blue-100'
                                  }`}>
                                    {inv.type}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-slate-500">{inv.date}</td>
                                <td className="py-3 px-4 text-slate-700 font-bold">{inv.customerName || inv.supplierName || 'عميل نقدي'}</td>
                                <td className="py-3 px-4 text-center text-slate-500">{inv.paymentMethod === 'credit' ? 'آجل/ذمم' : 'نقدي'}</td>
                                <td className="py-3 px-4 text-left font-black text-slate-900">{(inv.netTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    );
                  })()}

                  {/* CONTACTS TAB */}
                  {activeTab === 'contacts' && (() => {
                    const custs = selectedArchive.data.customers.map(c => ({ ...c, role: 'زبون' }));
                    const supps = selectedArchive.data.suppliers.map(s => ({ ...s, role: 'مورد' }));
                    const merged = [...custs, ...supps];
                    const filtered = merged.filter(c => c.name.includes(searchQuery) || (c.phone && c.phone.includes(searchQuery)));
                    return (
                      <table className="w-full text-right border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 border-b border-slate-100">
                            <th className="py-3 px-4 font-black">الاسم</th>
                            <th className="py-3 px-4 font-black text-center">الصفة</th>
                            <th className="py-3 px-4 font-black">رقم الهاتف</th>
                            <th className="py-3 px-4 font-black text-left">الرصيد المدوّر (افتتاح الدورة الجديدة)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filtered.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="text-center py-8 text-slate-400">لا توجد سجلات مطابقة للبحث</td>
                            </tr>
                          ) : (
                            filtered.map((contact, i) => (
                              <tr key={contact.id || i} className="hover:bg-slate-50">
                                <td className="py-3 px-4 font-bold text-slate-800">{contact.name}</td>
                                <td className="py-3 px-4 text-center">
                                  <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                    contact.role === 'زبون' ? 'bg-teal-50 text-teal-700' : 'bg-amber-50 text-amber-700'
                                  }`}>
                                    {contact.role}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-slate-500 font-mono">{contact.phone || '---'}</td>
                                <td className="py-3 px-4 text-left font-extrabold text-slate-900">
                                  {(contact.openingBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    );
                  })()}

                  {/* JOURNAL TAB */}
                  {activeTab === 'journal' && (() => {
                    const filtered = selectedArchive.data.journalEntries.filter(je => 
                      je.entryNumber.includes(searchQuery) || je.description.includes(searchQuery)
                    );
                    return (
                      <div className="space-y-4">
                        {filtered.length === 0 ? (
                          <div className="text-center py-8 text-slate-400">لا توجد قيود يومية مطابقة للبحث</div>
                        ) : (
                          filtered.map((je, idx) => (
                            <div key={je.id || idx} className="border border-slate-100 rounded-xl overflow-hidden shadow-xs">
                              <div className="bg-slate-50 px-4 py-2.5 flex justify-between items-center text-xs border-b border-slate-100">
                                <div className="flex gap-4">
                                  <span className="font-extrabold text-slate-800">{je.entryNumber}</span>
                                  <span className="text-slate-500">{je.date}</span>
                                </div>
                                <span className="font-bold text-slate-600">{je.description}</span>
                              </div>
                              <table className="w-full text-right text-[11px] border-collapse bg-white">
                                <thead>
                                  <tr className="bg-slate-50/50 text-slate-400 border-b border-slate-100">
                                    <th className="py-2 px-4 font-bold">الحساب</th>
                                    <th className="py-2 px-4 font-bold">البيان</th>
                                    <th className="py-2 px-4 font-bold text-left">مدين (Debit)</th>
                                    <th className="py-2 px-4 font-bold text-left">دائن (Credit)</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {je.lines.map((line: any, lineIdx: number) => (
                                    <tr key={lineIdx} className="hover:bg-slate-50/30">
                                      <td className="py-2 px-4 font-medium text-slate-700">{line.accountCode} - {line.accountName}</td>
                                      <td className="py-2 px-4 text-slate-500">{line.memo || '---'}</td>
                                      <td className="py-2 px-4 text-left font-mono font-bold text-slate-800">{line.debit > 0 ? line.debit.toFixed(2) : '---'}</td>
                                      <td className="py-2 px-4 text-left font-mono font-bold text-slate-800">{line.credit > 0 ? line.credit.toFixed(2) : '---'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ))
                        )}
                      </div>
                    );
                  })()}

                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
