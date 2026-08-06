import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Phone, 
  MapPin, 
  CreditCard, 
  Receipt, 
  Search,
  DollarSign,
  MessageSquare,
  FileText,
  Edit,
  Pencil,
  Crown,
  Tag,
  AlertTriangle,
  Trash2
} from 'lucide-react';
import { Customer, SalesInvoice, PaymentVoucher, ShopSettings } from '../types/accounting';
import { calculateCustomerBalance } from '../utils/accountingEngine';
import { AccountStatementModal } from './AccountStatementModal';
import { WhatsAppShareModal } from './WhatsAppShareModal';
import { formatBalanceReminderWhatsAppMessage } from '../utils/whatsappFormatter';
import { matchesSearch } from '../utils/searchUtils';

interface CustomersViewProps {
  customers: Customer[];
  salesInvoices: SalesInvoice[];
  vouchers: PaymentVoucher[];
  settings: ShopSettings;
  onAddCustomer: (customer: Customer) => void;
  onUpdateCustomer?: (customer: Customer) => void;
  onDeleteCustomer?: (customerId: string) => void;
  onAddReceiptVoucher: (voucher: PaymentVoucher) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  salesInvoices,
  vouchers,
  settings,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  onAddReceiptVoucher
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [selectedCustomerForReceipt, setSelectedCustomerForReceipt] = useState<Customer | null>(null);
  const [selectedCustomerForStatement, setSelectedCustomerForStatement] = useState<Customer | null>(null);
  const [whatsAppModalData, setWhatsAppModalData] = useState<{
    isOpen: boolean;
    phone: string;
    partyName: string;
    message: string;
    cardData?: any;
  } | null>(null);

  const handleSendWhatsAppReminder = (cust: Customer, balance: number) => {
    if (!cust.phone) {
      alert('لا يوجد رقم هاتف مسجل لهذا الزبون');
      return;
    }
    const message = formatBalanceReminderWhatsAppMessage({
      shopName: settings.shopName,
      phone: settings.phone,
      currencySymbol: settings.currencySymbol,
      partyName: cust.name,
      partyCode: cust.code,
      partyType: 'customer',
      balance
    });
    
    setWhatsAppModalData({
      isOpen: true,
      phone: cust.phone,
      partyName: cust.name,
      message,
      cardData: {
        type: 'reminder',
        shopName: settings.shopName,
        phone: settings.phone,
        currencySymbol: settings.currencySymbol,
        partyName: cust.name,
        partyCode: cust.code,
        runningBalance: balance
      }
    });
  };

  // Customer Form State
  const [code, setCode] = useState(`CUST-0${customers.length + 1}`);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [creditLimit, setCreditLimit] = useState<number>(2000);
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState<'retail' | 'wholesale' | 'vip'>('retail');
  const [delegatesList, setDelegatesList] = useState<string[]>([]);
  const [newDelegateName, setNewDelegateName] = useState('');

  // Receipt Voucher Form
  const [receiptAmount, setReceiptAmount] = useState<number>(0);
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank'>('cash');
  const [receiptNotes, setReceiptNotes] = useState('');

  const filteredCustomers = customers.filter(c => 
    matchesSearch(c.name, searchTerm) || 
    matchesSearch(c.phone, searchTerm) || 
    matchesSearch(c.code, searchTerm)
  );

  const handleOpenAddModal = () => {
    setCode(`CUST-0${customers.length + 1}`);
    setName('');
    setPhone('');
    setAddress('');
    setCreditLimit(2000);
    setOpeningBalance(0);
    setNotes('');
    setCategory('retail');
    setDelegatesList([]);
    setNewDelegateName('');
    setShowAddCustomerModal(true);
  };

  const handleOpenEditModal = (cust: Customer) => {
    setEditingCustomer(cust);
    setName(cust.name);
    setPhone(cust.phone || '');
    setAddress(cust.address || '');
    setCreditLimit(cust.creditLimit || 0);
    setOpeningBalance(cust.openingBalance || 0);
    setNotes(cust.notes || '');
    setCategory(cust.category || 'retail');
    setDelegatesList(cust.delegates || []);
    setNewDelegateName('');
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const newCust: Customer = {
      id: `cust-${Date.now()}`,
      code,
      name,
      phone,
      address,
      creditLimit: Number(creditLimit),
      openingBalance: Number(openingBalance),
      notes,
      category,
      delegates: delegatesList
    };

    onAddCustomer(newCust);
    setShowAddCustomerModal(false);
  };

  const handleSaveEditCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer || !name) return;

    const updatedCust: Customer = {
      ...editingCustomer,
      name,
      phone,
      address,
      creditLimit: Number(creditLimit),
      openingBalance: Number(openingBalance),
      notes,
      category,
      delegates: delegatesList
    };

    if (onUpdateCustomer) {
      onUpdateCustomer(updatedCust);
    }
    setEditingCustomer(null);
  };

  const handleSaveReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerForReceipt || receiptAmount <= 0) return;

    const newVoucher: PaymentVoucher = {
      id: `v-${Date.now()}`,
      voucherNumber: `RCT-${Math.floor(100 + Math.random() * 900)}`,
      type: 'receipt',
      date: receiptDate,
      partyType: 'customer',
      partyId: selectedCustomerForReceipt.id,
      partyName: selectedCustomerForReceipt.name,
      amount: Number(receiptAmount),
      paymentMethod,
      targetAccountCode: paymentMethod === 'cash' ? '1010' : '1020',
      notes: receiptNotes || `سند قبض تحصيل ديون من الزبون ${selectedCustomerForReceipt.name}`
    };

    onAddReceiptVoucher(newVoucher);
    setSelectedCustomerForReceipt(null);
    setReceiptAmount(0);
    setReceiptNotes('');
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-600" />
            <span>إدارة الزبائن والعملاء (الذمم المدينة)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            دليل الزبائن، متابعة الديون وحسابات الآجل، وتسجيل سندات القبض والتحصيل.
          </p>
        </div>

        <button
          onClick={() => {
            setCode(`CUST-0${customers.length + 1}`);
            setShowAddCustomerModal(true);
          }}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة زبون جديد</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="البحث باسم الزبون أو الهاتف..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-9 pl-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Customers Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map(cust => {
          const currentBalance = calculateCustomerBalance(cust, salesInvoices, vouchers);
          const creditRatio = cust.creditLimit > 0 ? Math.min(100, Math.max(0, (currentBalance / cust.creditLimit) * 100)) : 0;
          const isOverLimit = cust.creditLimit > 0 && currentBalance >= cust.creditLimit;

          return (
            <div key={cust.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 hover:shadow-md transition-shadow">
              
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                      {cust.code}
                    </span>

                    {/* Category Tag */}
                    {cust.category === 'vip' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">
                        <Crown className="w-3 h-3 text-purple-600" />
                        <span>VIP مميز</span>
                      </span>
                    )}
                    {cust.category === 'wholesale' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md">
                        <Tag className="w-3 h-3 text-sky-600" />
                        <span>جملة</span>
                      </span>
                    )}
                    {(cust.category === 'retail' || !cust.category) && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        <span>تجزئة</span>
                      </span>
                    )}

                    {cust.id !== 'cust-cash' && (
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => handleOpenEditModal(cust)}
                          className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="تعديل البيانات الشخصية"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        {onDeleteCustomer && (
                          <button
                            onClick={() => setCustomerToDelete(cust)}
                            className="p-1 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="حذف الزبون"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm mt-1.5">{cust.name}</h3>
                </div>

                <div className="text-left font-mono">
                  <p className="text-[10px] text-slate-400">الرصيد المستحق (الدين)</p>
                  <p className={`text-base font-black ${
                    currentBalance > 0 ? (isOverLimit ? 'text-rose-600' : 'text-amber-600') : 'text-emerald-600'
                  }`}>
                    {currentBalance.toFixed(2)} {settings.currencySymbol}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-500 border-t border-slate-100 pt-3">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{cust.phone || 'بدون هاتف'}</span>
                </div>
                {cust.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span className="line-clamp-1">{cust.address}</span>
                  </div>
                )}
                {cust.creditLimit > 0 && (
                  <div className="space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between text-[11px] font-semibold">
                      <span className="text-slate-600 flex items-center gap-1">
                        <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                        <span>سقف الائتمان: {cust.creditLimit} {settings.currencySymbol}</span>
                      </span>
                      <span className={`font-mono text-[10px] font-bold ${
                        creditRatio >= 90 ? 'text-rose-600' : creditRatio >= 70 ? 'text-amber-600' : 'text-emerald-600'
                      }`}>
                        {creditRatio.toFixed(0)}% مستهلك
                      </span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          creditRatio >= 90 ? 'bg-rose-500' : creditRatio >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${creditRatio}%` }}
                      />
                    </div>

                    {isOverLimit && (
                      <p className="text-[10px] font-bold text-rose-600 flex items-center gap-1 mt-1">
                        <AlertTriangle className="w-3 h-3 text-rose-500" />
                        <span>تجاوز الدين المسموح! يوصى بالتحصيل قبل المبيعات الجديدة.</span>
                      </p>
                    )}
                  </div>
                )}

                {cust.delegates && cust.delegates.length > 0 && (
                  <div className="mt-2.5 pt-2.5 border-t border-dashed border-slate-100">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 mb-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>المناديب المعتمدون:</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {cust.delegates.map((del, dIdx) => (
                        <span 
                          key={dIdx} 
                          className="bg-emerald-50 text-emerald-800 border border-emerald-100 px-1.5 py-0.5 rounded-md text-[10px] font-medium"
                        >
                          {del}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {cust.id !== 'cust-cash' && (
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEditModal(cust)}
                      className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1"
                      title="تعديل البيانات الشخصية"
                    >
                      <Edit className="w-3.5 h-3.5 text-slate-600" />
                      <span>تعديل</span>
                    </button>

                    <button
                      onClick={() => setSelectedCustomerForStatement(cust)}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1"
                      title="طباعة كشف حساب"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-600" />
                      <span>كشف حساب</span>
                    </button>

                    {currentBalance > 0 && cust.phone && (
                      <button
                        onClick={() => handleSendWhatsAppReminder(cust, currentBalance)}
                        className="py-2 px-3 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                        title="إرسال إشعار تذكير عبر الواتساب"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>واتساب</span>
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setSelectedCustomerForReceipt(cust);
                      setReceiptAmount(currentBalance > 0 ? currentBalance : 0);
                    }}
                    className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Receipt className="w-4 h-4 text-emerald-600" />
                    <span>تحصيل مبلغ (سند قبض)</span>
                  </button>
                </div>
              )}

            </div>
          );
        })}
      </div>

      {/* Modal: Edit Customer */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-3 sm:p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[82vh] sm:max-h-[88vh] overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 sm:pb-3 shrink-0">
              <div className="flex items-center gap-1.5">
                <Edit className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                <h3 className="font-extrabold text-slate-800 text-xs sm:text-base">تعديل بيانات الزبون</h3>
              </div>
              <button onClick={() => setEditingCustomer(null)} className="text-slate-400 hover:text-slate-600 font-bold p-1 text-xs sm:text-sm">✕</button>
            </div>

            <form onSubmit={handleSaveEditCustomer} className="flex-1 flex flex-col overflow-hidden text-xs dir-rtl text-right mt-2 sm:mt-3">
              <div className="flex-1 overflow-y-auto space-y-2 sm:space-y-3 px-1 pb-1">
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5 sm:mb-1">اسم الزبون الكامل *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: محمد عبدالله"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-1.5 sm:p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-0.5 sm:mb-1">رقم الجوال *</label>
                    <input
                      type="text"
                      required
                      placeholder="0500000000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full p-1.5 sm:p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-0.5 sm:mb-1">سقف الائتمان المسموح</label>
                    <input
                      type="number"
                      value={creditLimit}
                      onChange={(e) => setCreditLimit(Number(e.target.value))}
                      className="w-full p-1.5 sm:p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5 sm:mb-1">العنوان / الموقع</label>
                  <input
                    type="text"
                    placeholder="مثال: حي الشفاء - الشارع العام"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full p-1.5 sm:p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-0.5 sm:mb-1">فئة الزبون ونوع التعامل</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full p-1.5 sm:p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white"
                    >
                      <option value="retail">تجزئة (عادي)</option>
                      <option value="wholesale">جملة (خصم خاص)</option>
                      <option value="vip">عميل مميز VIP 🌟</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-0.5 sm:mb-1">الرصيد الافتتاحي السابق</label>
                    <input
                      type="number"
                      step="0.01"
                      value={openingBalance}
                      onChange={(e) => setOpeningBalance(Number(e.target.value))}
                      className="w-full p-1.5 sm:p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono bg-white"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 p-2 sm:p-3 rounded-xl border border-slate-100 space-y-1.5 sm:space-y-2 text-right dir-rtl">
                  <label className="block font-bold text-slate-700">المناديب المعتمدون للشراء (اختياري)</label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="اسم المندوب (مثال: أحمد العتيبي)"
                      value={newDelegateName}
                      onChange={(e) => setNewDelegateName(e.target.value)}
                      className="flex-1 p-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-xs"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (newDelegateName.trim()) {
                            if (!delegatesList.includes(newDelegateName.trim())) {
                              setDelegatesList([...delegatesList, newDelegateName.trim()]);
                            }
                            setNewDelegateName('');
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newDelegateName.trim()) {
                          if (!delegatesList.includes(newDelegateName.trim())) {
                            setDelegatesList([...delegatesList, newDelegateName.trim()]);
                          }
                          setNewDelegateName('');
                        }
                      }}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs cursor-pointer shrink-0"
                    >
                      إضافة
                    </button>
                  </div>
                  {delegatesList.length > 0 ? (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {delegatesList.map((del, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded-md text-[10px] font-semibold animate-fade-in"
                        >
                          {del}
                          <button
                            type="button"
                            onClick={() => setDelegatesList(delegatesList.filter(d => d !== del))}
                            className="text-emerald-500 hover:text-emerald-700 font-bold focus:outline-none cursor-pointer"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[9px] sm:text-[10px] text-slate-400">لا يوجد مناديب مضافين حالياً. سيقوم الزبون بالشراء بنفسه فقط.</p>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5 sm:mb-1">ملاحظات إضافية</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={1.5}
                    className="w-full p-1.5 sm:p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 sm:pt-3 border-t border-slate-100 shrink-0 mt-1.5 sm:mt-2 bg-white">
                {onDeleteCustomer && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerToDelete(editingCustomer);
                      setEditingCustomer(null);
                    }}
                    className="px-2.5 py-1.5 sm:px-4 sm:py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold rounded-xl cursor-pointer text-[10px] sm:text-xs transition-colors"
                  >
                    حذف الزبون
                  </button>
                )}
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditingCustomer(null)}
                    className="px-2.5 py-1.5 sm:px-4 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl cursor-pointer text-[10px] sm:text-xs transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-2.5 py-1.5 sm:px-4 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-xs cursor-pointer text-[10px] sm:text-xs transition-colors"
                  >
                    حفظ التعديلات
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Customer */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-3 sm:p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[82vh] sm:max-h-[88vh] overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 sm:pb-3 shrink-0">
              <h3 className="font-extrabold text-slate-800 text-xs sm:text-base">إضافة زبون جديد</h3>
              <button onClick={() => setShowAddCustomerModal(false)} className="text-slate-400 hover:text-slate-600 font-bold p-1 text-xs sm:text-sm">✕</button>
            </div>

            <form onSubmit={handleSaveCustomer} className="flex-1 flex flex-col overflow-hidden text-xs dir-rtl text-right mt-2 sm:mt-3">
              <div className="flex-1 overflow-y-auto space-y-2 sm:space-y-3 px-1 pb-1">
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5 sm:mb-1">اسم الزبون الكامل *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: محمد عبدالله"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-1.5 sm:p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-0.5 sm:mb-1">رقم الجوال *</label>
                    <input
                      type="text"
                      required
                      placeholder="0500000000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full p-1.5 sm:p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-0.5 sm:mb-1">سقف الائتمان المسموح</label>
                    <input
                      type="number"
                      value={creditLimit}
                      onChange={(e) => setCreditLimit(Number(e.target.value))}
                      className="w-full p-1.5 sm:p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5 sm:mb-1">العنوان / الموقع</label>
                  <input
                    type="text"
                    placeholder="مثال: حي الشفاء - الشارع العام"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full p-1.5 sm:p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5 sm:mb-1">الرصيد الافتتاحي السابق (إن وجد)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(Number(e.target.value))}
                    className="w-full p-1.5 sm:p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono bg-white"
                  />
                </div>

                <div className="bg-slate-50 p-2 sm:p-3 rounded-xl border border-slate-100 space-y-1.5 sm:space-y-2 text-right dir-rtl">
                  <label className="block font-bold text-slate-700">المناديب المعتمدون للشراء (اختياري)</label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="اسم المندوب (مثال: أحمد العتيبي)"
                      value={newDelegateName}
                      onChange={(e) => setNewDelegateName(e.target.value)}
                      className="flex-1 p-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-xs"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (newDelegateName.trim()) {
                            if (!delegatesList.includes(newDelegateName.trim())) {
                              setDelegatesList([...delegatesList, newDelegateName.trim()]);
                            }
                            setNewDelegateName('');
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newDelegateName.trim()) {
                          if (!delegatesList.includes(newDelegateName.trim())) {
                            setDelegatesList([...delegatesList, newDelegateName.trim()]);
                          }
                          setNewDelegateName('');
                        }
                      }}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs cursor-pointer shrink-0"
                    >
                      إضافة
                    </button>
                  </div>
                  {delegatesList.length > 0 ? (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {delegatesList.map((del, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded-md text-[10px] font-semibold animate-fade-in"
                        >
                          {del}
                          <button
                            type="button"
                            onClick={() => setDelegatesList(delegatesList.filter(d => d !== del))}
                            className="text-emerald-500 hover:text-emerald-700 font-bold focus:outline-none cursor-pointer"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[9px] sm:text-[10px] text-slate-400">لا يوجد مناديب مضافين حالياً. سيقوم الزبون بالشراء بنفسه فقط.</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-1.5 pt-2 sm:pt-3 border-t border-slate-100 shrink-0 mt-1.5 sm:mt-2 bg-white">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="px-2.5 py-1.5 sm:px-4 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl cursor-pointer text-[10px] sm:text-xs transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-2.5 py-1.5 sm:px-4 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-xs cursor-pointer text-[10px] sm:text-xs transition-colors"
                >
                  حفظ الزبون
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Receipt Voucher */}
      {selectedCustomerForReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-base">سند قبض تحصيل من الزبون</h3>
              <button onClick={() => setSelectedCustomerForReceipt(null)} className="text-slate-400 font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveReceipt} className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <p className="font-bold text-slate-800">{selectedCustomerForReceipt.name}</p>
                <p className="text-slate-500 text-[11px]">
                  الدين الحالي المستحق: {calculateCustomerBalance(selectedCustomerForReceipt, salesInvoices, vouchers).toFixed(2)} {settings.currencySymbol}
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">المبلغ المحصل الآن *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={receiptAmount}
                  onChange={(e) => setReceiptAmount(Number(e.target.value))}
                  className="w-full p-2.5 border border-slate-200 rounded-xl font-mono font-bold text-emerald-700 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">التاريخ *</label>
                  <input
                    type="date"
                    required
                    value={receiptDate}
                    onChange={(e) => setReceiptDate(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">طريقة الاستلام</label>
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
                  value={receiptNotes}
                  onChange={(e) => setReceiptNotes(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedCustomerForReceipt(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs"
                >
                  تأكيد وسداد الدين
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Account Statement */}
      <AccountStatementModal
        isOpen={!!selectedCustomerForStatement}
        onClose={() => setSelectedCustomerForStatement(null)}
        party={selectedCustomerForStatement}
        partyType="customer"
        salesInvoices={salesInvoices}
        vouchers={vouchers}
        settings={settings}
      />

      {/* Modal: WhatsApp Share (Standard, Business, Dual App selection) */}
      {whatsAppModalData && (
        <WhatsAppShareModal
          isOpen={whatsAppModalData.isOpen}
          onClose={() => setWhatsAppModalData(null)}
          phone={whatsAppModalData.phone}
          partyName={whatsAppModalData.partyName}
          title="إرسال تذكير عبر الواتساب"
          message={whatsAppModalData.message}
          cardData={whatsAppModalData.cardData}
        />
      )}

      {/* Modal: Custom Delete Confirmation */}
      {customerToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 flex flex-col items-center text-center animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 mb-4 border border-rose-100">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            
            <h3 className="font-extrabold text-slate-900 text-base mb-2">تأكيد حذف الزبون</h3>
            
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              هل أنت متأكد من حذف الزبون <span className="font-black text-rose-600">({customerToDelete.name})</span> نهائياً من النظام؟
            </p>

            {(() => {
              const bal = calculateCustomerBalance(customerToDelete, salesInvoices, vouchers);
              if (Math.abs(bal) > 0.01) {
                return (
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3 mb-5 text-xs text-right w-full dir-rtl">
                    <p className="font-bold mb-1">تنبيه بالرصيد المتبقي:</p>
                    <p>الزبون لديه رصيد مستحق قدره <span className="font-bold text-amber-700">{bal.toFixed(2)} {settings.currencySymbol}</span>. حذف الزبون قد يؤثر على تقارير المطابقات المالية.</p>
                  </div>
                );
              }
              return null;
            })()}

            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={() => setCustomerToDelete(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteCustomer) {
                    onDeleteCustomer(customerToDelete.id);
                  }
                  setCustomerToDelete(null);
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
