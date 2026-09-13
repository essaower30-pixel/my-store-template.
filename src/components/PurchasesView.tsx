import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  Plus, 
  Trash2, 
  Truck, 
  Calendar, 
  Receipt,
  FileText,
  Camera,
  ChevronDown,
  ChevronUp,
  Package,
  Eye,
  Printer,
  X,
  Edit3,
  Sparkles,
  Percent
} from 'lucide-react';
import { PurchaseInvoice, Supplier, Product, InvoiceItem, ShopSettings } from '../types/accounting';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { isBarcodeMatch, matchesSearch } from '../utils/searchUtils';

interface PurchasesViewProps {
  purchaseInvoices: PurchaseInvoice[];
  suppliers: Supplier[];
  products: Product[];
  settings: ShopSettings;
  onSavePurchaseInvoice: (invoice: PurchaseInvoice) => void;
  onDeletePurchaseInvoice?: (invoiceId: string) => void;
}

export const PurchasesView: React.FC<PurchasesViewProps> = ({
  purchaseInvoices,
  suppliers: rawSuppliers,
  products: rawProducts,
  settings,
  onSavePurchaseInvoice,
  onDeletePurchaseInvoice
}) => {
  const products = (rawProducts || []).filter(p => p && p.id);
  const suppliers = (rawSuppliers || []).filter(s => s && s.id);

  const [showNewModal, setShowNewModal] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [editingInvoiceNumber, setEditingInvoiceNumber] = useState<string | null>(null);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [selectedInvoiceForModal, setSelectedInvoiceForModal] = useState<PurchaseInvoice | null>(null);

  // New/Edit Purchase Form
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(suppliers[0] || null);
  const [supplierInvNum, setSupplierInvNum] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit' | 'bank'>('credit');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount');
  const [discountInput, setDiscountInput] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');

  // Item selector state
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const [quantity, setQuantity] = useState<number>(1);
  const [unitCost, setUnitCost] = useState<number>(products[0]?.costPrice || 0);
  const [showPurchaseCameraScanner, setShowPurchaseCameraScanner] = useState(false);

  useEffect(() => {
    if (products.length > 0) {
      const exists = products.some(p => p.id === selectedProductId);
      if (!exists || !selectedProductId) {
        setSelectedProductId(products[0].id);
        setUnitCost(products[0].costPrice);
      }
    } else {
      setSelectedProductId('');
      setUnitCost(0);
    }
  }, [products, selectedProductId]);

  const handleOpenNewModal = () => {
    setEditingInvoiceId(null);
    setEditingInvoiceNumber(null);
    if (suppliers.length > 0) {
      setSelectedSupplier(suppliers[0]);
    } else {
      setSelectedSupplier(null);
    }
    setSupplierInvNum('');
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('credit');
    setItems([]);
    setDiscountType('amount');
    setDiscountInput(0);
    setPaidAmount(0);
    setNotes('');
    setShowNewModal(true);
  };

  const handleAutoGenerateLowStockOrder = () => {
    const lowStockProds = products.filter(p => p.stock <= p.minStockAlert);
    if (lowStockProds.length === 0) {
      alert('جميع الأصناف في المخزن بمستويات ممتازة ولا توجد نواقص بحاجة لتوليد طلبية توريد حالياً!');
      return;
    }

    const generatedItems: InvoiceItem[] = lowStockProds.map(prod => {
      const recommendedQty = Math.max(10, (prod.minStockAlert * 2) - prod.stock);
      return {
        productId: prod.id,
        barcode: prod.barcode,
        productName: prod.name,
        unit: prod.unit,
        quantity: recommendedQty,
        unitPrice: prod.costPrice,
        discount: 0,
        total: recommendedQty * prod.costPrice
      };
    });

    setEditingInvoiceId(null);
    setEditingInvoiceNumber(null);
    if (suppliers.length > 0) {
      setSelectedSupplier(suppliers[0]);
    } else {
      setSelectedSupplier(null);
    }
    setSupplierInvNum(`AUTO-PO-${Math.floor(1000 + Math.random() * 9000)}`);
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('credit');
    setItems(generatedItems);
    setPaidAmount(0);
    setNotes(`طلب توريد نواقص تلقائي بناءً على حد الإنذار لأصناف المخزن (${generatedItems.length} صنف بحاجة لإعادة التوريد).`);
    setShowNewModal(true);
  };

  const handleStartEditInvoice = (inv: PurchaseInvoice) => {
    setEditingInvoiceId(inv.id);
    setEditingInvoiceNumber(inv.invoiceNumber);
    const supp = suppliers.find(s => s.id === inv.supplierId) || suppliers[0] || { 
      id: inv.supplierId, 
      code: 'TEMP',
      name: inv.supplierName, 
      phone: '', 
      openingBalance: 0 
    };
    setSelectedSupplier(supp);
    setSupplierInvNum(inv.supplierInvoiceNumber || '');
    setInvoiceDate(inv.date);
    setPaymentMethod(inv.paymentMethod);
    setItems(inv.items);
    setDiscountType('amount');
    setDiscountInput(inv.discountTotal || 0);
    setPaidAmount(inv.paidAmount);
    setNotes(inv.notes || '');
    setSelectedInvoiceForModal(null);
    setShowNewModal(true);
  };

  const handlePurchaseScanSuccess = (scannedCode: string) => {
    const match = products.find(p => isBarcodeMatch(p.barcode, scannedCode));
    if (match) {
      setSelectedProductId(match.id);
      setUnitCost(match.costPrice);
    } else {
      alert(`تم قراءة الباركود: "${scannedCode}"\nالصنف غير موجود بالدليل، يمكنك إضافته من قائمة الأصناف أولاً.`);
    }
  };

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const rawDiscount = discountType === 'percent'
    ? (subtotal * (discountInput || 0)) / 100
    : (discountInput || 0);
  const discountTotal = Math.max(0, Math.min(subtotal, rawDiscount));
  const taxAmount = settings.enableTax ? (subtotal - discountTotal) * (settings.defaultTaxRate / 100) : 0;
  const netTotal = Math.max(0, subtotal - discountTotal + taxAmount);
  const remainingAmount = Math.max(0, netTotal - paidAmount);

  const handleAddItem = () => {
    const prod = products.find(p => p.id === selectedProductId);
    if (!prod) return;

    const newItem: InvoiceItem = {
      productId: prod.id,
      barcode: prod.barcode,
      productName: prod.name,
      unit: prod.unit,
      quantity,
      unitPrice: unitCost,
      discount: 0,
      total: quantity * unitCost
    };

    setItems(prev => [...prev, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateItemQuantity = (index: number, newQty: number) => {
    setItems(prev => prev.map((item, i) => {
      if (i === index) {
        const q = Math.max(1, newQty);
        return { ...item, quantity: q, total: q * item.unitPrice };
      }
      return item;
    }));
  };

  const updateItemUnitPrice = (index: number, newPrice: number) => {
    setItems(prev => prev.map((item, i) => {
      if (i === index) {
        const p = Math.max(0, newPrice);
        return { ...item, unitPrice: p, total: item.quantity * p };
      }
      return item;
    }));
  };

  const handleSaveInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    const supplierId = selectedSupplier?.id || '';
    const supplierName = selectedSupplier?.name || 'مورد غير محدد';

    const newInv: PurchaseInvoice = {
      id: editingInvoiceId || `pur-${Date.now()}`,
      invoiceNumber: editingInvoiceNumber || `PUR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      supplierInvoiceNumber: supplierInvNum,
      date: invoiceDate,
      supplierId,
      supplierName,
      items,
      subtotal,
      discountTotal,
      taxAmount,
      netTotal,
      paidAmount,
      remainingAmount,
      paymentMethod,
      notes
    };

    onSavePurchaseInvoice(newInv);
    setShowNewModal(false);
    setEditingInvoiceId(null);
    setEditingInvoiceNumber(null);
    setItems([]);
    setNotes('');
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-sky-600" />
            <span>إدارة المشتريات وفواتير التوريد</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            تسجيل مشتريات البضائع من الموردين، زيادة كميات الأصناف بالمخزن وتحديث أسعار التكلفة.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAutoGenerateLowStockOrder}
            className="flex items-center gap-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 px-3.5 py-2 rounded-xl text-xs font-extrabold shadow-2xs transition-all cursor-pointer"
            title="تجميع النواقص تلقائياً وإنشاء مسودة فاتورة توريد"
          >
            <Sparkles className="w-4 h-4 text-amber-600 animate-pulse" />
            <span>توليد طلبية للنواقص تلقائياً</span>
            {products.filter(p => p.stock <= p.minStockAlert).length > 0 && (
              <span className="bg-rose-500 text-white font-mono px-1.5 py-0.2 rounded-full text-[10px]">
                {products.filter(p => p.stock <= p.minStockAlert).length}
              </span>
            )}
          </button>

          <button
            onClick={handleOpenNewModal}
            className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>فاتورة شراء جديدة</span>
          </button>
        </div>
      </div>

      {/* Purchases Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <th className="p-3 font-semibold">رقم الفاتورة</th>
                <th className="p-3 font-semibold">فاتورة المورد</th>
                <th className="p-3 font-semibold">التاريخ</th>
                <th className="p-3 font-semibold">اسم المورد</th>
                <th className="p-3 font-semibold">طريقة السداد</th>
                <th className="p-3 font-semibold">الإجمالي الصافي</th>
                <th className="p-3 font-semibold">المدفوع</th>
                <th className="p-3 font-semibold">المتبقي (دين)</th>
                <th className="p-3 font-semibold text-center">التفاصيل والأصناف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {purchaseInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 font-bold">
                    لا توجد فواتير مشتريات مسجلة حتى الآن.
                  </td>
                </tr>
              ) : (
                purchaseInvoices.map(inv => {
                  const isExpanded = expandedInvoiceId === inv.id;

                  return (
                    <React.Fragment key={inv.id}>
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-mono font-bold text-slate-800">{inv.invoiceNumber}</td>
                        <td className="p-3 font-mono text-slate-500">{inv.supplierInvoiceNumber || '-'}</td>
                        <td className="p-3 font-mono text-slate-500">{inv.date}</td>
                        <td className="p-3 font-bold text-slate-800">{inv.supplierName}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                            {inv.paymentMethod === 'cash' ? 'نقداً' : inv.paymentMethod === 'bank' ? 'بنكي' : 'آجل (على الحساب)'}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-900">{inv.netTotal.toFixed(2)} {settings.currencySymbol}</td>
                        <td className="p-3 font-mono font-semibold text-emerald-700">{inv.paidAmount.toFixed(2)} {settings.currencySymbol}</td>
                        <td className="p-3 font-mono font-bold text-rose-700">{inv.remainingAmount.toFixed(2)} {settings.currencySymbol}</td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setExpandedInvoiceId(isExpanded ? null : inv.id)}
                              className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-800 font-extrabold text-[11px] rounded-lg transition-colors cursor-pointer flex items-center gap-1 border border-sky-100"
                              title="عرض الأصناف والأسعار بالأسفل"
                            >
                              <Package className="w-3.5 h-3.5 text-sky-600" />
                              <span>{inv.items.length} أصناف</span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>

                            <button
                              onClick={() => handleStartEditInvoice(inv)}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-extrabold text-[11px] rounded-lg border border-amber-200 transition-colors cursor-pointer flex items-center gap-1"
                              title="تعديل كافة بيانات الفاتورة والأصناف"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                              <span>تعديل</span>
                            </button>

                            <button
                              onClick={() => setSelectedInvoiceForModal(inv)}
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[11px] rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                              title="فتح صفحة كاملة للتفاصيل والطباعة"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>التفاصيل</span>
                            </button>

                            {onDeletePurchaseInvoice && (
                              <button
                                onClick={() => onDeletePurchaseInvoice(inv.id)}
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] rounded-lg transition-colors cursor-pointer flex items-center gap-1 border border-rose-200"
                                title="إلغاء وحذف الفاتورة وإرجاع الكميات"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                <span>حذف</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Items Drawer */}
                      {isExpanded && (
                        <tr className="bg-sky-50/40 border-y border-sky-100">
                          <td colSpan={9} className="p-4">
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-extrabold text-slate-800 flex items-center gap-2">
                                  <Package className="w-4 h-4 text-sky-600" />
                                  تفاصيل أصناف فاتورة الشراء ({inv.invoiceNumber}) - المورد: {inv.supplierName}
                                </span>
                                <span className="font-mono text-slate-500 font-bold">
                                  عدد أنواع الأصناف: {inv.items.length}
                                </span>
                              </div>

                              <div className="overflow-hidden border border-slate-200 rounded-xl">
                                <table className="w-full text-right text-xs">
                                  <thead className="bg-slate-100 text-slate-700 font-bold">
                                    <tr>
                                      <th className="p-2.5">#</th>
                                      <th className="p-2.5">اسم الصنف والتوصيف</th>
                                      <th className="p-2.5">الباركود</th>
                                      <th className="p-2.5">الكمية والوحدة</th>
                                      <th className="p-2.5">السعر (سعر التكلفة)</th>
                                      <th className="p-2.5">الإجمالي</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 font-medium">
                                    {inv.items.map((item, idx) => (
                                      <tr key={idx} className="hover:bg-slate-50">
                                        <td className="p-2.5 font-mono text-slate-400 font-bold">{idx + 1}</td>
                                        <td className="p-2.5 font-bold text-slate-900">{item.productName}</td>
                                        <td className="p-2.5 font-mono text-slate-500">{item.barcode || '-'}</td>
                                        <td className="p-2.5 font-mono font-bold text-slate-800">
                                          {item.quantity} {item.unit}
                                        </td>
                                        <td className="p-2.5 font-mono text-slate-700 font-bold">
                                          {item.unitPrice.toFixed(2)} {settings.currencySymbol}
                                        </td>
                                        <td className="p-2.5 font-mono font-black text-sky-700">
                                          {item.total.toFixed(2)} {settings.currencySymbol}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                                <div className="text-slate-500 font-medium">
                                  تاريخ الشراء: <span className="font-mono font-bold text-slate-800">{inv.date}</span>
                                </div>
                                <div className="font-mono text-slate-900 font-black text-sm">
                                  صافي إجمالي الفاتورة: <span className="text-sky-700">{inv.netTotal.toFixed(2)} {settings.currencySymbol}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create or Edit Purchase Invoice */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-sky-600" />
                <span>
                  {editingInvoiceId ? `تعديل فاتورة شراء (${editingInvoiceNumber})` : 'تسجيل فاتورة شراء بضاعة جديدة'}
                </span>
              </h3>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveInvoice} className="space-y-4 text-xs">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">اختر المورد *</label>
                  <select
                    value={selectedSupplier?.id || ''}
                    onChange={(e) => {
                      const s = suppliers.find(item => item.id === e.target.value);
                      if (s) setSelectedSupplier(s);
                    }}
                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-white font-bold"
                  >
                    {!selectedSupplier && <option value="">-- اختر المورد --</option>}
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">رقم فاتورة المورد</label>
                  <input
                    type="text"
                    placeholder="مثال: INV-9901"
                    value={supplierInvNum}
                    onChange={(e) => setSupplierInvNum(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">تاريخ الشراء *</label>
                  <input
                    type="date"
                    required
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              {/* Add Item Row */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-slate-800">إضافة صنف للشراء:</p>
                  <button
                    type="button"
                    onClick={() => setShowPurchaseCameraScanner(true)}
                    className="text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full flex items-center gap-1.5 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 text-indigo-600" />
                    <span>مسح باركود بالـ كاميرا</span>
                  </button>
                </div>

                <BarcodeScannerModal
                  isOpen={showPurchaseCameraScanner}
                  onClose={() => setShowPurchaseCameraScanner(false)}
                  onScanSuccess={handlePurchaseScanSuccess}
                  title="مسح باركود صنف الشراء بالكاميرا"
                  products={products}
                />

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                  <div className="sm:col-span-5">
                    <label className="block text-[11px] text-slate-500 mb-0.5">الصنف</label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => {
                        setSelectedProductId(e.target.value);
                        const p = products.find(item => item.id === e.target.value);
                        if (p) setUnitCost(p.costPrice);
                      }}
                      className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                    >
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (التكلفة: {p.costPrice})</option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-slate-500 mb-0.5">الكمية</label>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className="w-full p-2 border border-slate-200 rounded-lg font-mono font-bold"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[11px] text-slate-500 mb-0.5">سعر التكلفة للوحدة</label>
                    <input
                      type="number"
                      step="0.01"
                      value={unitCost}
                      onChange={(e) => setUnitCost(Number(e.target.value))}
                      className="w-full p-2 border border-slate-200 rounded-lg font-mono font-bold"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg cursor-pointer"
                    >
                      + إضافة
                    </button>
                  </div>
                </div>
              </div>

              {/* Items List Table with Inline Editing */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-semibold">
                    <tr>
                      <th className="p-2.5">الصنف</th>
                      <th className="p-2.5">الكمية</th>
                      <th className="p-2.5">التكلفة للوحدة</th>
                      <th className="p-2.5">الإجمالي</th>
                      <th className="p-2.5 text-center">حذف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-400">
                          لم يتم إضافة أصناف حتى الآن.
                        </td>
                      </tr>
                    ) : (
                      items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold text-slate-800">{item.productName}</td>
                          <td className="p-2.5 font-mono">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateItemQuantity(idx, Number(e.target.value))}
                                className="w-16 p-1 border border-slate-200 rounded-md font-mono font-bold text-slate-900 bg-white"
                              />
                              <span className="text-[10px] text-slate-500">{item.unit}</span>
                            </div>
                          </td>
                          <td className="p-2.5 font-mono">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.unitPrice}
                              onChange={(e) => updateItemUnitPrice(idx, Number(e.target.value))}
                              className="w-20 p-1 border border-slate-200 rounded-md font-mono font-bold text-slate-900 bg-white"
                            />
                          </td>
                          <td className="p-2.5 font-mono font-bold text-slate-900">{item.total.toFixed(2)}</td>
                          <td className="p-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="text-rose-600 hover:text-rose-800 font-bold p-1 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4 mx-auto" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Totals & Payment Method */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">طريقة سداد المورد</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl bg-white font-bold"
                    >
                      <option value="cash">نقداً من الصندوق</option>
                      <option value="bank">تحويل بنكي</option>
                      <option value="credit">آجل على الحساب (دين للمورد)</option>
                    </select>
                  </div>

                  {/* Purchase Discount Section */}
                  <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-amber-950 flex items-center gap-1">
                        <Percent className="w-3.5 h-3.5 text-amber-600" />
                        <span>خصم المورد على الشراء</span>
                      </label>
                      
                      <div className="flex items-center bg-white border border-amber-200 rounded-lg p-0.5 font-bold">
                        <button
                          type="button"
                          onClick={() => setDiscountType('amount')}
                          className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                            discountType === 'amount'
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'text-amber-800 hover:bg-amber-100'
                          }`}
                        >
                          مبلغ ({settings.currencySymbol})
                        </button>
                        <button
                          type="button"
                          onClick={() => setDiscountType('percent')}
                          className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                            discountType === 'percent'
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'text-amber-800 hover:bg-amber-100'
                          }`}
                        >
                          نسبة مئوية (%)
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={discountInput || ''}
                        onChange={(e) => setDiscountInput(Number(e.target.value))}
                        className="w-full p-2 text-xs border border-amber-300 rounded-lg font-mono font-bold bg-white text-amber-900 focus:ring-2 focus:ring-amber-500"
                        placeholder={discountType === 'percent' ? 'مثال: 5%' : '0.00'}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">المبلغ المسدد للمورد الآن ({settings.currencySymbol})</label>
                    <input
                      type="number"
                      step="0.01"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(Number(e.target.value))}
                      className="w-full p-2.5 border border-slate-200 rounded-xl font-mono font-bold text-emerald-700 bg-emerald-50/40"
                    />
                  </div>
                </div>

                <div className="bg-slate-900 text-white p-4 rounded-xl space-y-2 font-mono flex flex-col justify-center">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>المجموع الفرعي:</span>
                    <span>{subtotal.toFixed(2)} {settings.currencySymbol}</span>
                  </div>

                  {discountTotal > 0 && (
                    <div className="flex justify-between text-xs text-amber-400 font-bold">
                      <span>خصم المورد:</span>
                      <span>-{discountTotal.toFixed(2)} {settings.currencySymbol}</span>
                    </div>
                  )}

                  {settings.enableTax && (
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>الضريبة ({settings.defaultTaxRate}%):</span>
                      <span>{taxAmount.toFixed(2)} {settings.currencySymbol}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm font-black text-sky-400 border-t border-slate-800 pt-2">
                    <span>إجمالي الشراء الصافي:</span>
                    <span>{netTotal.toFixed(2)} {settings.currencySymbol}</span>
                  </div>

                  <div className="flex justify-between text-xs text-rose-400 font-bold pt-1">
                    <span>المتبقي ديناً للمورد:</span>
                    <span>{remainingAmount.toFixed(2)} {settings.currencySymbol}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={items.length === 0}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-xs"
                >
                  حفظ وترحيل المشتريات والمخزن
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal: Full Purchase Invoice Details */}
      {selectedInvoiceForModal && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 dir-rtl text-right">
          <div className="bg-white rounded-3xl max-w-5xl w-full p-4 sm:p-7 shadow-2xl border border-slate-200 flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-150">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center border border-sky-100 shadow-sm shrink-0">
                  <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h2 className="font-black text-slate-900 text-base sm:text-lg leading-tight">
                    تفاصيل فاتورة المشتريات والأصناف كاملة
                  </h2>
                  <p className="text-[11px] sm:text-xs text-slate-500 font-mono mt-0.5">
                    رقم الفاتورة: {selectedInvoiceForModal.invoiceNumber} | فاتورة المورد: {selectedInvoiceForModal.supplierInvoiceNumber || '-'} | التاريخ: {selectedInvoiceForModal.date}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedInvoiceForModal(null)}
                className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="overflow-y-auto flex-1 space-y-4 pr-1 pl-1">
              {/* Supplier & Payment Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <p className="text-[11px] text-slate-500 font-bold">اسم المورد</p>
                  <p className="text-xs sm:text-sm font-extrabold text-slate-900 mt-0.5">
                    {selectedInvoiceForModal.supplierName}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] text-slate-500 font-bold">طريقة السداد</p>
                  <p className="text-xs sm:text-sm font-extrabold text-slate-900 mt-0.5">
                    {selectedInvoiceForModal.paymentMethod === 'cash' ? 'نقداً من الصندوق' : selectedInvoiceForModal.paymentMethod === 'bank' ? 'تحويل بنكي' : 'آجل (دين للمورد)'}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] text-slate-500 font-bold">البيان والملاحظات</p>
                  <p className="text-xs font-bold text-slate-700 mt-0.5">
                    {selectedInvoiceForModal.notes || 'لا توجد ملاحظات'}
                  </p>
                </div>

                <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
                  <p className="text-[10px] text-emerald-800 font-bold">المبلغ المدفوع للمورد</p>
                  <p className="text-sm font-black text-emerald-950 font-mono mt-0.5">
                    {selectedInvoiceForModal.paidAmount.toFixed(2)} {settings.currencySymbol}
                  </p>
                </div>

                <div className="bg-sky-50 p-2.5 rounded-xl border border-sky-100">
                  <p className="text-[10px] text-sky-800 font-bold">إجمالي الفاتورة الصافي</p>
                  <p className="text-sm font-black text-sky-950 font-mono mt-0.5">
                    {selectedInvoiceForModal.netTotal.toFixed(2)} {settings.currencySymbol}
                  </p>
                </div>
              </div>

              {/* Items Section Header */}
              <div className="flex items-center justify-between bg-sky-900 text-white px-4 py-2.5 rounded-2xl shadow-xs">
                <span className="font-black text-xs sm:text-sm flex items-center gap-2">
                  <Package className="w-4 h-4 text-sky-300" />
                  أصناف الفاتورة والأسعار
                </span>
                <span className="text-[11px] font-mono text-sky-200">
                  {selectedInvoiceForModal.items.length} صنف
                </span>
              </div>

              {/* Mobile Cards View */}
              <div className="sm:hidden space-y-3">
                {selectedInvoiceForModal.items.map((item, idx) => (
                  <div key={idx} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2.5 shadow-2xs">
                    <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-2">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-slate-400 block">#{idx + 1}</span>
                        <h4 className="font-black text-slate-900 text-sm leading-snug">{item.productName}</h4>
                      </div>
                      {item.barcode && (
                        <span className="px-2 py-0.5 bg-slate-200/80 text-slate-700 font-mono text-[10px] rounded-md shrink-0">
                          {item.barcode}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
                      <div className="bg-white p-2 rounded-xl border border-slate-200/80">
                        <span className="text-[10px] text-slate-500 font-bold block">الكمية</span>
                        <span className="font-extrabold text-slate-900">{item.quantity} {item.unit}</span>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-slate-200/80">
                        <span className="text-[10px] text-slate-500 font-bold block">السعر (الوحدة)</span>
                        <span className="font-extrabold text-slate-900">{item.unitPrice.toFixed(2)}</span>
                      </div>
                      <div className="bg-sky-100/80 p-2 rounded-xl border border-sky-200">
                        <span className="text-[10px] text-sky-800 font-bold block">الإجمالي</span>
                        <span className="font-black text-sky-950">{item.total.toFixed(2)} {settings.currencySymbol}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block border border-slate-200 rounded-2xl overflow-x-auto shadow-2xs">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 text-slate-800 font-black border-b border-slate-200 text-sm">
                    <tr>
                      <th className="p-3.5">#</th>
                      <th className="p-3.5">اسم الصنف والتوصيف</th>
                      <th className="p-3.5">الباركود</th>
                      <th className="p-3.5">الكمية والوحدة</th>
                      <th className="p-3.5">السعر (سعر التكلفة للوحدة)</th>
                      <th className="p-3.5">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800 text-xs">
                    {selectedInvoiceForModal.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3.5 font-mono text-slate-400 font-bold">{idx + 1}</td>
                        <td className="p-3.5 font-extrabold text-slate-900 text-sm">{item.productName}</td>
                        <td className="p-3.5 font-mono text-slate-500">{item.barcode || '-'}</td>
                        <td className="p-3.5 font-mono font-bold text-slate-900 text-sm">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="p-3.5 font-mono text-slate-700 font-bold text-sm">
                          {item.unitPrice.toFixed(2)} {settings.currencySymbol}
                        </td>
                        <td className="p-3.5 font-mono font-black text-sky-900 text-sm">
                          {item.total.toFixed(2)} {settings.currencySymbol}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Summary Breakdown */}
              <div className="p-3.5 bg-slate-900 text-white rounded-2xl space-y-1.5 font-mono text-xs shadow-xs">
                <div className="flex justify-between">
                  <span>المجموع الفرعي للأصناف:</span>
                  <span className="font-bold">{selectedInvoiceForModal.subtotal.toFixed(2)} {settings.currencySymbol}</span>
                </div>
                {selectedInvoiceForModal.taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span>الضريبة:</span>
                    <span className="font-bold">{selectedInvoiceForModal.taxAmount.toFixed(2)} {settings.currencySymbol}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs sm:text-sm font-black text-sky-400 border-t border-slate-800 pt-1.5">
                  <span>الإجمالي الصافي النهائي:</span>
                  <span>{selectedInvoiceForModal.netTotal.toFixed(2)} {settings.currencySymbol}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200 mt-2 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedInvoiceForModal(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs rounded-xl cursor-pointer"
                >
                  إغلاق النافذة
                </button>
                <button
                  onClick={() => handleStartEditInvoice(selectedInvoiceForModal)}
                  className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-extrabold text-xs rounded-xl border border-amber-200 flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-4 h-4 text-amber-600" />
                  <span>تعديل بيانات هذه الفاتورة</span>
                </button>
                {onDeletePurchaseInvoice && (
                  <button
                    onClick={() => {
                      const invId = selectedInvoiceForModal.id;
                      setSelectedInvoiceForModal(null);
                      onDeletePurchaseInvoice(invId);
                    }}
                    className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-xs rounded-xl border border-rose-200 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>إلغاء وحذف هذه الفاتورة</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs rounded-xl cursor-pointer flex items-center gap-2 shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة الفاتورة والأصناف</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
