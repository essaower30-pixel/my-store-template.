import React, { useState } from 'react';
import { 
  Truck, 
  Plus, 
  Phone, 
  MapPin, 
  Mail, 
  Receipt, 
  Search,
  DollarSign,
  FileText,
  Package,
  X,
  ChevronDown,
  ChevronUp,
  Printer,
  Edit,
  MessageSquare,
  Star,
  Award,
  Globe,
  Building2,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { Supplier, PurchaseInvoice, PaymentVoucher, ShopSettings } from '../types/accounting';
import { calculateSupplierBalance } from '../utils/accountingEngine';
import { AccountStatementModal } from './AccountStatementModal';
import { WhatsAppShareModal } from './WhatsAppShareModal';
import { formatBalanceReminderWhatsAppMessage } from '../utils/whatsappFormatter';
import { matchesSearch } from '../utils/searchUtils';

interface SuppliersViewProps {
  suppliers: Supplier[];
  purchaseInvoices: PurchaseInvoice[];
  vouchers: PaymentVoucher[];
  settings: ShopSettings;
  onAddSupplier: (supplier: Supplier) => void;
  onUpdateSupplier?: (supplier: Supplier) => void;
  onDeleteSupplier?: (supplierId: string) => void;
  onAddDisbursementVoucher: (voucher: PaymentVoucher) => void;
}

export const SuppliersView: React.FC<SuppliersViewProps> = ({
  suppliers,
  purchaseInvoices,
  vouchers,
  settings,
  onAddSupplier,
  onUpdateSupplier,
  onDeleteSupplier,
  onAddDisbursementVoucher
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [selectedSupplierForPayment, setSelectedSupplierForPayment] = useState<Supplier | null>(null);
  const [selectedSupplierForStatement, setSelectedSupplierForStatement] = useState<Supplier | null>(null);
  const [selectedSupplierForInvoices, setSelectedSupplierForInvoices] = useState<Supplier | null>(null);
  const [whatsAppModalData, setWhatsAppModalData] = useState<{
    isOpen: boolean;
    phone: string;
    partyName: string;
    message: string;
    cardData?: any;
  } | null>(null);

  const handleSendWhatsAppSupplier = (sup: Supplier, balance: number) => {
    if (!sup.phone) {
      alert('لا يوجد رقم هاتف مسجل لهذا المورد');
      return;
    }
    const message = formatBalanceReminderWhatsAppMessage({
      shopName: settings.shopName,
      phone: settings.phone,
      currencySymbol: settings.currencySymbol,
      partyName: sup.name,
      partyCode: sup.code,
      partyType: 'supplier',
      balance
    });
    
    setWhatsAppModalData({
      isOpen: true,
      phone: sup.phone,
      partyName: sup.name,
      message,
      cardData: {
        type: 'reminder',
        shopName: settings.shopName,
        phone: settings.phone,
        currencySymbol: settings.currencySymbol,
        partyName: sup.name,
        partyCode: sup.code,
        runningBalance: balance
      }
    });
  };
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [fullPageInvoice, setFullPageInvoice] = useState<{
    refNumber: string;
    date: string;
    supplierName: string;
    paymentMethod?: string;
    notes?: string;
    items: any[];
    total: number;
  } | null>(null);

  // New Supplier Form
  const [code, setCode] = useState(`SUP-0${suppliers.length + 1}`);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState<'local' | 'imported' | 'wholesaler'>('local');
  const [rating, setRating] = useState<number>(5);

  // Disbursement Voucher Form
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank'>('cash');
  const [paymentNotes, setPaymentNotes] = useState('');

  const filteredSuppliers = suppliers.filter(s => 
    matchesSearch(s.name, searchTerm) || 
    matchesSearch(s.phone, searchTerm) || 
    matchesSearch(s.code, searchTerm)
  );

  const handleOpenAddModal = () => {
    setCode(`SUP-0${suppliers.length + 1}`);
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setOpeningBalance(0);
    setNotes('');
    setCategory('local');
    setRating(5);
    setShowAddSupplierModal(true);
  };

  const handleOpenEditModal = (sup: Supplier) => {
    setEditingSupplier(sup);
    setName(sup.name);
    setPhone(sup.phone || '');
    setEmail(sup.email || '');
    setAddress(sup.address || '');
    setOpeningBalance(sup.openingBalance || 0);
    setNotes(sup.notes || '');
    setCategory(sup.category || 'local');
    setRating(sup.rating || 5);
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const newSup: Supplier = {
      id: `sup-${Date.now()}`,
      code,
      name,
      phone,
      email,
      address,
      openingBalance: Number(openingBalance),
      notes,
      category,
      rating
    };

    onAddSupplier(newSup);
    setShowAddSupplierModal(false);
    setName('');
    setPhone('');
  };

  const handleSaveEditSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier || !name) return;

    const updatedSup: Supplier = {
      ...editingSupplier,
      name,
      phone,
      email,
      address,
      openingBalance: Number(openingBalance),
      notes,
      category,
      rating
    };

    if (onUpdateSupplier) {
      onUpdateSupplier(updatedSup);
    }
    setEditingSupplier(null);
  };

  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierForPayment || paymentAmount <= 0) return;

    const newVoucher: PaymentVoucher = {
      id: `v-dis-${Date.now()}`,
      voucherNumber: `PAY-${Math.floor(100 + Math.random() * 900)}`,
      type: 'disbursement',
      date: paymentDate,
      partyType: 'supplier',
      partyId: selectedSupplierForPayment.id,
      partyName: selectedSupplierForPayment.name,
      amount: Number(paymentAmount),
      paymentMethod,
      targetAccountCode: paymentMethod === 'cash' ? '1010' : '1020',
      categoryAccountCode: '2010', // Accounts Payable
      notes: paymentNotes || `سند صرف سداد ديون للمورد ${selectedSupplierForPayment.name}`
    };

    onAddDisbursementVoucher(newVoucher);
    setSelectedSupplierForPayment(null);
    setPaymentAmount(0);
    setPaymentNotes('');
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Truck className="w-6 h-6 text-sky-600" />
            <span>إدارة الموردين والشركات (الذمم الدائنة)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            دليل الشركات والموردين، متابعة الديون الواجبة السداد، وتسجيل سندات الصرف.
          </p>
        </div>

        <button
          onClick={() => {
            setCode(`SUP-0${suppliers.length + 1}`);
            setShowAddSupplierModal(true);
          }}
          className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة مورد جديد</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="البحث باسم المورد أو الهاتف..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-9 pl-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
      </div>

      {/* Suppliers Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSuppliers.map(sup => {
          const currentBalance = calculateSupplierBalance(sup, purchaseInvoices, vouchers);

          return (
            <div key={sup.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 hover:shadow-md transition-shadow">
              
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                      {sup.code}
                    </span>

                    {/* Category Tag */}
                    {sup.category === 'imported' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                        <Globe className="w-3 h-3 text-indigo-600" />
                        <span>مستورد</span>
                      </span>
                    )}
                    {sup.category === 'wholesaler' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md">
                        <Building2 className="w-3 h-3 text-sky-600" />
                        <span>تاجر جملة</span>
                      </span>
                    )}
                    {(sup.category === 'local' || !sup.category) && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        <span>مورد محلي</span>
                      </span>
                    )}

                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => handleOpenEditModal(sup)}
                        className="p-1 text-slate-400 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                        title="تعديل البيانات الشخصية"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      {onDeleteSupplier && (
                        <button
                          onClick={() => setSupplierToDelete(sup)}
                          className="p-1 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="حذف المورد"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 className="font-bold text-slate-800 text-sm mt-1.5">{sup.name}</h3>

                  {/* Rating Stars */}
                  <div className="flex items-center gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star 
                        key={star} 
                        className={`w-3 h-3 ${
                          star <= (sup.rating || 5) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'
                        }`} 
                      />
                    ))}
                    <span className="text-[10px] text-slate-400 font-mono mr-1">({sup.rating || 5}/5)</span>
                  </div>
                </div>

                <div className="text-left font-mono">
                  <p className="text-[10px] text-slate-400">مستحق للمورد</p>
                  <p className="text-base font-black text-rose-600">
                    {currentBalance.toFixed(2)} {settings.currencySymbol}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-500 border-t border-slate-100 pt-3">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{sup.phone || 'بدون هاتف'}</span>
                </div>
                {sup.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{sup.email}</span>
                  </div>
                )}
                {sup.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span className="line-clamp-1">{sup.address}</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEditModal(sup)}
                    className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1"
                    title="تعديل البيانات الشخصية للمورد"
                  >
                    <Edit className="w-3.5 h-3.5 text-slate-600" />
                    <span>تعديل</span>
                  </button>

                  <button
                    onClick={() => setSelectedSupplierForStatement(sup)}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    title="كشف حساب تفصيلي المورد شامل الأصناف والحركات"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-600" />
                    <span>كشف الحساب</span>
                  </button>

                  {sup.phone && (
                    <button
                      onClick={() => handleSendWhatsAppSupplier(sup, currentBalance)}
                      className="py-2 px-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                      title="تواصل عبر الواتساب"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>واتساب</span>
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setSelectedSupplierForInvoices(sup)}
                  className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  title="عرض جميع فواتير المشتريات وتفاصيل الأصناف"
                >
                  <Package className="w-4 h-4 text-indigo-600" />
                  <span>فواتير المشتريات والأصناف</span>
                </button>

                <button
                  onClick={() => {
                    setSelectedSupplierForPayment(sup);
                    setPaymentAmount(currentBalance > 0 ? currentBalance : 0);
                  }}
                  className="w-full py-2 bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Receipt className="w-4 h-4 text-sky-600" />
                  <span>سداد دفعة (سند صرف)</span>
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* Modal: Edit Supplier */}
      {editingSupplier && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-sky-600" />
                <h3 className="font-bold text-slate-800 text-base">تعديل بيانات المورد الشخصية</h3>
              </div>
              <button onClick={() => setEditingSupplier(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveEditSupplier} className="space-y-3 text-xs dir-rtl text-right overflow-y-auto flex-1 py-3 pr-1 pl-1">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">اسم المورد / الشركة *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: شركة البركة للتجارة"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">رقم الهاتف *</label>
                  <input
                    type="text"
                    required
                    placeholder="0500000000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    placeholder="info@supplier.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">العنوان / الموقع</label>
                <input
                  type="text"
                  placeholder="مثال: الرياض - المنطقة الصناعية"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">الرصيد الافتتاحي المستحق للمورد</label>
                <input
                  type="number"
                  step="0.01"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(Number(e.target.value))}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ملاحظات إضافية</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </form>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100 shrink-0 bg-white">
              {onDeleteSupplier && (
                <button
                  type="button"
                  onClick={() => {
                    setSupplierToDelete(editingSupplier);
                    setEditingSupplier(null);
                  }}
                  className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold rounded-xl cursor-pointer text-xs transition-colors"
                >
                  حذف المورد
                </button>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSupplier(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  onClick={(e) => {
                    const form = document.querySelector('form');
                    if (form) {
                      form.requestSubmit();
                    }
                  }}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  حفظ التعديلات
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Supplier */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <h3 className="font-bold text-slate-800 text-base">إضافة شركة / مورد جديد</h3>
              <button onClick={() => setShowAddSupplierModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-3 text-xs overflow-y-auto flex-1 py-3 pr-1 pl-1">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">اسم المورد / الشركة *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: شركة المراعي للألبان"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">رقم الهاتف *</label>
                  <input
                    type="text"
                    required
                    placeholder="0110000000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    placeholder="info@supplier.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">تصنيف المورد</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="local">مورد محلي 🏠</option>
                    <option value="imported">مورد مستورد 🌍</option>
                    <option value="wholesaler">تاجر جملة 🏢</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">تقييم المورد (1 - 5 نجوم)</label>
                  <select
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-white font-mono font-bold focus:ring-2 focus:ring-sky-500"
                  >
                    <option value={5}>⭐⭐⭐⭐⭐ (5/5 ممتاز)</option>
                    <option value={4}>⭐⭐⭐⭐ (4/5 جيد جداً)</option>
                    <option value={3}>⭐⭐⭐ (3/5 متوسط)</option>
                    <option value={2}>⭐⭐ (2/5 مقبول)</option>
                    <option value={1}>⭐ (1/5 ضعيف)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">الرصيد المستحق السابق للمورد</label>
                <input
                  type="number"
                  step="0.01"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(Number(e.target.value))}
                  className="w-full p-2.5 border border-slate-200 rounded-xl font-mono font-bold text-rose-700"
                />
              </div>
            </form>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 shrink-0 bg-white">
              <button
                type="button"
                onClick={() => setShowAddSupplierModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
              >
                إلغاء
              </button>
              <button
                type="submit"
                onClick={(e) => {
                  const forms = document.querySelectorAll('form');
                  const form = forms[forms.length - 1]; // target the latest added/visible form
                  if (form) {
                    form.requestSubmit();
                  }
                }}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-xs"
              >
                حفظ المورد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Disbursement Voucher */}
      {selectedSupplierForPayment && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-base">سند صرف سداد دفعة للمورد</h3>
              <button onClick={() => setSelectedSupplierForPayment(null)} className="text-slate-400 font-bold">✕</button>
            </div>

            <form onSubmit={handleSavePayment} className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <p className="font-bold text-slate-800">{selectedSupplierForPayment.name}</p>
                <p className="text-slate-500 text-[11px]">
                  الدين الحالي للمورد: {calculateSupplierBalance(selectedSupplierForPayment, purchaseInvoices, vouchers).toFixed(2)} {settings.currencySymbol}
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">المبلغ المدفوع للمورد الآن *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full p-2.5 border border-slate-200 rounded-xl font-mono font-bold text-rose-700 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">تاريخ السداد *</label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">طريقة الدفع</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-white font-bold"
                  >
                    <option value="cash">نقداً الصندوق الرئيسي</option>
                    <option value="bank">حساب البنك / المدى</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ملاحظات السند</label>
                <textarea
                  rows={2}
                  placeholder="ملاحظات توضيحية..."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedSupplierForPayment(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-xs"
                >
                  تأكيد وسداد الدين للمورد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Account Statement */}
      <AccountStatementModal
        isOpen={!!selectedSupplierForStatement}
        onClose={() => setSelectedSupplierForStatement(null)}
        party={selectedSupplierForStatement}
        partyType="supplier"
        purchaseInvoices={purchaseInvoices}
        vouchers={vouchers}
        settings={settings}
      />

      {/* Modal: Supplier Purchase Invoices & Items */}
      {selectedSupplierForInvoices && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 dir-rtl text-right">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-100 space-y-5 max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center border border-indigo-100 shadow-xs">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    سجل فواتير المشتريات والأصناف - المورد: {selectedSupplierForInvoices.name}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    استعراض أصناف وكميات وتكاليف الفواتير الواردة من هذا المورد
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSupplierForInvoices(null)}
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Invoices List */}
            <div className="overflow-y-auto flex-1 space-y-4 pr-1">
              {purchaseInvoices.filter(p => p.supplierId === selectedSupplierForInvoices.id).length === 0 ? (
                <div className="text-center py-10 text-slate-400 font-bold bg-slate-50 rounded-2xl border border-slate-200">
                  لا توجد فواتير مشتريات مسجلة لهذا المورد بعد.
                </div>
              ) : (
                purchaseInvoices
                  .filter(p => p.supplierId === selectedSupplierForInvoices.id)
                  .map(inv => {
                    const isExpanded = expandedInvoiceId === inv.id;
                    return (
                      <div key={inv.id} className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-extrabold text-indigo-900 text-sm bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                              {inv.invoiceNumber}
                            </span>
                            {inv.supplierInvoiceNumber && (
                              <span className="text-xs text-slate-500 font-mono">
                                (فاتورة المورد: {inv.supplierInvoiceNumber})
                              </span>
                            )}
                            <span className="text-xs font-mono text-slate-500">
                              تاريخ: {inv.date}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-left font-mono">
                              <span className="text-[10px] text-slate-500 block">صافي الفاتورة</span>
                              <span className="text-sm font-extrabold text-indigo-900">
                                {inv.netTotal.toFixed(2)} {settings.currencySymbol}
                              </span>
                            </div>

                            <button
                              onClick={() => setExpandedInvoiceId(isExpanded ? null : inv.id)}
                              className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-indigo-950 font-bold text-xs rounded-xl cursor-pointer flex items-center gap-1 shadow-xs"
                            >
                              <span>{inv.items.length} أصناف</span>
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>

                            <button
                              onClick={() =>
                                setFullPageInvoice({
                                  refNumber: inv.invoiceNumber,
                                  date: inv.date,
                                  supplierName: selectedSupplierForInvoices.name,
                                  paymentMethod: inv.paymentMethod === 'cash' ? 'نقداً' : inv.paymentMethod === 'bank' ? 'تحويل بنكي' : 'آجل (دين للمورد)',
                                  notes: inv.notes || '',
                                  items: inv.items,
                                  total: inv.netTotal,
                                })
                              }
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl cursor-pointer flex items-center gap-1 shadow-xs"
                            >
                              <Package className="w-3.5 h-3.5" />
                              <span>صفحة كاملة للأصناف</span>
                            </button>
                          </div>
                        </div>

                        {/* Items Breakdown Table */}
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                          <table className="w-full text-right text-xs">
                            <thead className="bg-slate-100 text-slate-700 font-extrabold">
                              <tr>
                                <th className="p-2.5">#</th>
                                <th className="p-2.5">اسم الصنف</th>
                                <th className="p-2.5">الباركود</th>
                                <th className="p-2.5">الكمية</th>
                                <th className="p-2.5">تكلفة الوحدة</th>
                                <th className="p-2.5">الإجمالي</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                              {inv.items.map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                  <td className="p-2.5 font-mono text-slate-400">{idx + 1}</td>
                                  <td className="p-2.5 font-bold text-slate-800">{item.productName}</td>
                                  <td className="p-2.5 font-mono text-slate-500">{item.barcode || '-'}</td>
                                  <td className="p-2.5 font-mono font-bold text-slate-900">{item.quantity} {item.unit}</td>
                                  <td className="p-2.5 font-mono">{item.unitPrice.toFixed(2)} {settings.currencySymbol}</td>
                                  <td className="p-2.5 font-mono font-black text-indigo-700">{item.total.toFixed(2)} {settings.currencySymbol}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="flex justify-between items-center text-xs text-slate-600 pt-1 font-mono">
                          <span>طريقة السداد: {inv.paymentMethod === 'cash' ? 'نقداً' : inv.paymentMethod === 'bank' ? 'بنكي' : 'آجل على الحساب'}</span>
                          <span>المسدد: {inv.paidAmount.toFixed(2)} | المتبقي: {(inv.netTotal - inv.paidAmount).toFixed(2)} {settings.currencySymbol}</span>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            {/* Footer */}
            <div className="pt-2 flex items-center justify-end border-t border-slate-100">
              <button
                onClick={() => setSelectedSupplierForInvoices(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl cursor-pointer"
              >
                إغلاق
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Full Page Clear Items Breakdown Modal */}
      {fullPageInvoice && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 dir-rtl text-right">
          <div className="bg-white rounded-3xl max-w-5xl w-full p-4 sm:p-7 shadow-2xl border border-slate-200 flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-150">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center border border-indigo-100 shadow-sm shrink-0">
                  <Package className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h2 className="font-black text-slate-900 text-base sm:text-lg leading-tight">
                    تفاصيل أصناف الفاتورة الكاملة
                  </h2>
                  <p className="text-[11px] sm:text-xs text-slate-500 font-mono mt-0.5">
                    رقم الفاتورة: {fullPageInvoice.refNumber} | التاريخ: {fullPageInvoice.date}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setFullPageInvoice(null)}
                className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Main Body */}
            <div className="overflow-y-auto flex-1 space-y-4 pr-1 pl-1">
              {/* Detailed Metadata Header Box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 font-bold block text-[11px]">رقم الفاتورة:</span>
                  <span className="font-mono font-black text-slate-900 text-sm">{fullPageInvoice.refNumber}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block text-[11px]">التاريخ:</span>
                  <span className="font-mono font-bold text-slate-800">{fullPageInvoice.date}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block text-[11px]">المورد وطريقة السداد:</span>
                  <span className="font-bold text-indigo-900">{fullPageInvoice.supplierName} ({fullPageInvoice.paymentMethod || 'نقداً'})</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block text-[11px]">البيان والملاحظات:</span>
                  <span className="font-bold text-slate-700">{fullPageInvoice.notes || 'لا توجد ملاحظات إضافية'}</span>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs">
                  <p className="text-[11px] text-slate-500 font-bold">عدد أنواع الأصناف</p>
                  <p className="text-base sm:text-lg font-black text-slate-900 font-mono mt-0.5">
                    {fullPageInvoice.items.length} صنف / مادة
                  </p>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs">
                  <p className="text-[11px] text-slate-500 font-bold">مجموع الكميات الواردة</p>
                  <p className="text-base sm:text-lg font-black text-indigo-900 font-mono mt-0.5">
                    {fullPageInvoice.items.reduce((s, i) => s + i.quantity, 0)} قطعة / وحدة
                  </p>
                </div>

                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl">
                  <p className="text-[11px] text-indigo-700 font-bold">إجمالي قيم الأصناف بالفاتورة</p>
                  <p className="text-base sm:text-lg font-black text-indigo-950 font-mono mt-0.5">
                    {fullPageInvoice.total.toFixed(2)} {settings.currencySymbol}
                  </p>
                </div>
              </div>

              {/* Items Section Header */}
              <div className="flex items-center justify-between bg-indigo-900 text-white px-4 py-2.5 rounded-2xl shadow-xs">
                <span className="font-black text-xs sm:text-sm flex items-center gap-2">
                  <Package className="w-4 h-4 text-indigo-300" />
                  بيان أصناف الفاتورة والأسعار بالتفصيل
                </span>
                <span className="text-[11px] font-mono text-indigo-200">
                  {fullPageInvoice.items.length} صنف
                </span>
              </div>

              {/* Mobile Cards View (Visible on small screens) */}
              <div className="sm:hidden space-y-3">
                {fullPageInvoice.items.map((item, idx) => (
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
                      <div className="bg-indigo-100/80 p-2 rounded-xl border border-indigo-200">
                        <span className="text-[10px] text-indigo-800 font-bold block">الإجمالي</span>
                        <span className="font-black text-indigo-950">{item.total.toFixed(2)} {settings.currencySymbol}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View (Visible on tablet/desktop screens) */}
              <div className="hidden sm:block border border-slate-200 rounded-2xl overflow-x-auto shadow-2xs">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 text-slate-800 font-black border-b border-slate-200 text-sm">
                    <tr>
                      <th className="p-3.5">#</th>
                      <th className="p-3.5">اسم الصنف والتوصيف</th>
                      <th className="p-3.5">الباركود</th>
                      <th className="p-3.5">الكمية والوحدة</th>
                      <th className="p-3.5">السعر (سعر التكلفة)</th>
                      <th className="p-3.5">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800 text-xs">
                    {fullPageInvoice.items.map((item, idx) => (
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
                        <td className="p-3.5 font-mono font-black text-indigo-900 text-sm">
                          {item.total.toFixed(2)} {settings.currencySymbol}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 mt-2 shrink-0">
              <button
                onClick={() => setFullPageInvoice(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs rounded-xl cursor-pointer"
              >
                إغلاق النافذة
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl cursor-pointer flex items-center gap-2 shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة صفحة الأصناف</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal: WhatsApp Share (Standard, Business, Dual App selection) */}
      {whatsAppModalData && (
        <WhatsAppShareModal
          isOpen={whatsAppModalData.isOpen}
          onClose={() => setWhatsAppModalData(null)}
          phone={whatsAppModalData.phone}
          partyName={whatsAppModalData.partyName}
          title="مراسلة المورد عبر الواتساب"
          message={whatsAppModalData.message}
          cardData={whatsAppModalData.cardData}
        />
      )}

      {/* Modal: Custom Delete Confirmation */}
      {supplierToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 flex flex-col items-center text-center animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 mb-4 border border-rose-100">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            
            <h3 className="font-extrabold text-slate-900 text-base mb-2">تأكيد حذف المورد</h3>
            
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              هل أنت متأكد من حذف المورد <span className="font-black text-rose-600">({supplierToDelete.name})</span> نهائياً من النظام؟
            </p>

            {(() => {
              const bal = calculateSupplierBalance(supplierToDelete, purchaseInvoices, vouchers);
              if (Math.abs(bal) > 0.01) {
                return (
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3 mb-5 text-xs text-right w-full dir-rtl">
                    <p className="font-bold mb-1">تنبيه بالرصيد المتبقي:</p>
                    <p>المورد لديه رصيد مستحق قدره <span className="font-bold text-amber-700">{bal.toFixed(2)} {settings.currencySymbol}</span>. حذف المورد قد يؤثر على تقارير المطابقات المالية.</p>
                  </div>
                );
              }
              return null;
            })()}

            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={() => setSupplierToDelete(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteSupplier) {
                    onDeleteSupplier(supplierToDelete.id);
                  }
                  setSupplierToDelete(null);
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
