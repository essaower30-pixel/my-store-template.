import React, { useState, useRef, useEffect } from 'react';
import { 
  ShoppingBag, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  User, 
  CreditCard, 
  DollarSign, 
  Printer, 
  CheckCircle2, 
  Calculator,
  Percent,
  Barcode,
  Camera,
  Sparkles,
  TrendingUp,
  Crown,
  Tag,
  AlertTriangle,
  FileText, 
  Eye, 
  History, 
  Edit3,
  Users
} from 'lucide-react';
import { Product, Customer, SalesInvoice, InvoiceItem, ShopSettings } from '../types/accounting';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { ProductImageSearchModal } from './ProductImageSearchModal';
import { matchesSearch, normalizeText, cleanBarcode, isBarcodeMatch } from '../utils/searchUtils';
import { playSuccessBeep, playErrorBeep } from '../utils/audioUtils';

interface SalesPOSViewProps {
  products: Product[];
  customers: Customer[];
  settings: ShopSettings;
  salesInvoices?: SalesInvoice[];
  onSaveSalesInvoice: (invoice: SalesInvoice) => void;
  onDeleteSalesInvoice?: (invoiceId: string) => void;
  onSelectInvoiceForPrint: (invoice: SalesInvoice) => void;
}

export const SalesPOSView: React.FC<SalesPOSViewProps> = ({
  products,
  customers,
  settings,
  salesInvoices = [],
  onSaveSalesInvoice,
  onDeleteSalesInvoice,
  onSelectInvoiceForPrint
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showSalesHistoryModal, setShowSalesHistoryModal] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [editingInvoiceNumber, setEditingInvoiceNumber] = useState<string | null>(null);
  
  // Cart state
  const [cart, setCart] = useState<InvoiceItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer>(() => {
    return customers.find(c => c.id === 'cust-cash') || customers[0] || {
      id: 'cust-cash',
      name: 'زبون نقدي',
      phone: '',
      category: 'retail',
      openingBalance: 0,
      creditLimit: 0,
      createdAt: ''
    };
  });
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit' | 'bank'>('cash');
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount');
  const [discountInput, setDiscountInput] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [selectedDelegate, setSelectedDelegate] = useState<string>('');
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showImageSearchModal, setShowImageSearchModal] = useState(false);
  const [isFastScanMode, setIsFastScanMode] = useState<boolean>(true);

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const lastScanRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });
  const lastAnyScanTimeRef = useRef<number>(0);

  const handleStartEditSalesInvoice = (inv: SalesInvoice) => {
    setEditingInvoiceId(inv.id);
    setEditingInvoiceNumber(inv.invoiceNumber);
    setCart(inv.items);
    const cust = customers.find(c => c.id === inv.customerId) || customers[0] || { id: inv.customerId, name: inv.customerName };
    setSelectedCustomer(cust);
    setPaymentMethod(inv.paymentMethod);
    setDiscountType('amount');
    setDiscountInput(inv.discountTotal || 0);
    setPaidAmount(inv.paidAmount);
    setNotes(inv.notes || '');
    setSelectedDelegate(inv.delegateName || '');
    setShowSalesHistoryModal(false);
  };

  const handleCancelEdit = () => {
    setEditingInvoiceId(null);
    setEditingInvoiceNumber(null);
    setCart([]);
    setDiscountType('amount');
    setDiscountInput(0);
    setPaidAmount(0);
    setNotes('');
    setSelectedDelegate('');
  };

  const processBarcodeScan = (scannedCode: string, isFromCamera: boolean = false) => {
    const cleanCode = cleanBarcode(scannedCode);
    if (!cleanCode) return;

    // Prevent duplicate triggers/bounce within 500ms for consecutive scans
    const now = Date.now();
    if (now - lastAnyScanTimeRef.current < 500) {
      console.log('Ignoring rapid consecutive barcode scan within 500ms');
      return;
    }
    lastAnyScanTimeRef.current = now;

    // Prevent duplicate triggers of the SAME barcode within 2500ms
    if (lastScanRef.current.code === cleanCode && (now - lastScanRef.current.time) < 2500) {
      return;
    }

    // 1. Robust Barcode match
    let match = products.find(p => isBarcodeMatch(p.barcode, cleanCode));

    // 2. Exact or normalized name match (ONLY if not from camera)
    if (!match && !isFromCamera) {
      match = products.find(p => normalizeText(p.name) === normalizeText(cleanCode));
    }

    // 3. Check filtered products if single candidate (ONLY if not from camera)
    if (!match && !isFromCamera) {
      const candidates = products.filter(p =>
        isBarcodeMatch(p.barcode, cleanCode) || matchesSearch(p.name, cleanCode)
      );
      if (candidates.length === 1) {
        match = candidates[0];
      }
    }

    if (match) {
      lastScanRef.current = { code: cleanCode, time: now };
      addToCart(match);
      if (!isFromCamera) {
        playSuccessBeep();
      }
      setSearchTerm('');
    } else {
      if (!isFromCamera) {
        playErrorBeep();
        alert(`تم قراءة الباركود: "${scannedCode}"\nعذراً، لم يتم العثور على صنف بهذا الباركود في المخزن.`);
      }
      setSearchTerm('');
    }
  };

  const handleScanSuccess = (scannedBarcode: string) => {
    processBarcodeScan(scannedBarcode, true);
  };

  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));

  const filteredProducts = products.filter(p => {
    const isMatched = !searchTerm.trim() || 
      matchesSearch(p.name, searchTerm) || 
      isBarcodeMatch(p.barcode, searchTerm) ||
      matchesSearch(p.category || '', searchTerm);
    const matchesCat = selectedCategory === 'all' || 
      p.category === selectedCategory || 
      (!p.category && selectedCategory === 'عام / غير محدد');
    return isMatched && matchesCat;
  });

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  
  const rawDiscount = discountType === 'percent'
    ? (subtotal * (discountInput || 0)) / 100
    : (discountInput || 0);
  const discountTotal = Math.max(0, Math.min(subtotal, rawDiscount));

  const taxAmount = settings.enableTax ? (subtotal - discountTotal) * (settings.defaultTaxRate / 100) : 0;
  const netTotal = Math.max(0, subtotal - discountTotal + taxAmount);

  // Auto set paid amount when payment method changes
  useEffect(() => {
    if (paymentMethod === 'cash' || paymentMethod === 'bank') {
      setPaidAmount(netTotal);
    } else {
      setPaidAmount(0); // For credit/on account
    }
  }, [paymentMethod, netTotal]);

  // Global Keyboard Listener to capture physical hardware USB/Bluetooth barcode scanners
  useEffect(() => {
    let scannedBuffer = '';
    let lastKeyTime = Date.now();

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 1. Ignore if typing inside any form input fields (input, textarea, select)
      const target = e.target as HTMLElement;
      if (target && (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.tagName === 'SELECT' || 
        target.isContentEditable
      )) {
        return;
      }

      // 2. Filter out non-printable keys (like Shift, Alt, Ctrl, Escape, etc.)
      if (e.key.length > 1 && e.key !== 'Enter') {
        return;
      }

      const now = Date.now();
      const diff = now - lastKeyTime;
      lastKeyTime = now;

      // Hardware scanners type extremely fast (usually < 50ms per key)
      // If the difference is too long, we assume it was a manual slow keypress and reset the buffer.
      // However, we can be slightly lenient (e.g., 80ms) to support cheap scanners or slow connections.
      if (diff > 80) {
        scannedBuffer = '';
      }

      if (e.key === 'Enter') {
        // If they scanned something and pressed Enter, or the hardware scanner finished typing
        if (scannedBuffer.length >= 3) {
          e.preventDefault();
          const finalCode = scannedBuffer;
          scannedBuffer = '';
          processBarcodeScan(finalCode);
        }
      } else {
        scannedBuffer += e.key;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [products]);

  const changeDue = Math.max(0, paidAmount - netTotal);
  const remainingAmount = Math.max(0, netTotal - paidAmount);

  const addToCart = (product: Product) => {
    const availableStock = Number(product.stock) || 0;
    if (availableStock <= 0) {
      alert(`عذراً، الصنف "${product.name}" غير متوفر بالمخزن حالياً (الكمية المتاحة: ${availableStock})!`);
      return;
    }

    setCart(prev => {
      const existingIndex = prev.findIndex(item => item.productId === product.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        const newQty = updated[existingIndex].quantity + 1;
        if (newQty > availableStock) {
          alert(`الكمية المتاحة في المخزن لهذا الصنف هي ${availableStock} ${product.unit}`);
          return prev;
        }
        const lineSub = newQty * updated[existingIndex].unitPrice;
        const lineDisc = Math.min(lineSub, updated[existingIndex].discount || 0);
        updated[existingIndex].quantity = newQty;
        updated[existingIndex].discount = lineDisc;
        updated[existingIndex].total = Math.max(0, lineSub - lineDisc);
        return updated;
      } else {
        return [
          ...prev,
          {
            productId: product.id,
            barcode: product.barcode,
            productName: product.name,
            unit: product.unit,
            quantity: 1,
            unitPrice: product.sellingPrice,
            discount: 0,
            total: product.sellingPrice
          }
        ];
      }
    });
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.productId === productId) {
          const product = products.find(p => p.id === productId);
          const maxStock = product ? (Number(product.stock) || 0) : 999;
          const newQty = Math.max(1, Math.min(maxStock, item.quantity + delta));
          const lineSub = newQty * item.unitPrice;
          const lineDisc = Math.min(lineSub, item.discount || 0);
          return {
            ...item,
            quantity: newQty,
            discount: lineDisc,
            total: Math.max(0, lineSub - lineDisc)
          };
        }
        return item;
      });
    });
  };

  const updateCartItemDiscount = (productId: string, discountVal: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.productId === productId) {
          const lineSub = item.quantity * item.unitPrice;
          const disc = Math.max(0, Math.min(lineSub, discountVal));
          return {
            ...item,
            discount: disc,
            total: Math.max(0, lineSub - disc)
          };
        }
        return item;
      });
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    const term = searchTerm.trim();
    setSearchTerm('');
    processBarcodeScan(term);
  };

  const handleCompleteSale = () => {
    if (cart.length === 0) return;

    if (paymentMethod === 'credit' && selectedCustomer?.id === 'cust-cash') {
      alert('لا يمكن البيع الآجل لزبون نقدي عام! يرجى اختيار زبون مسجل أو إضافة زبون جديد.');
      return;
    }

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

    const newInvoice: SalesInvoice = {
      id: editingInvoiceId || `inv-${Date.now()}`,
      invoiceNumber: editingInvoiceNumber || `INV-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      date: dateStr,
      time: timeStr,
      customerId: selectedCustomer?.id || 'cust-cash',
      customerName: selectedCustomer?.name || 'زبون نقدي',
      items: cart,
      subtotal,
      discountTotal,
      taxAmount,
      netTotal,
      paidAmount,
      remainingAmount,
      paymentMethod,
      notes,
      delegateName: selectedDelegate || undefined
    };

    onSaveSalesInvoice(newInvoice);
    onSelectInvoiceForPrint(newInvoice);

    // Reset cart and edit state
    setEditingInvoiceId(null);
    setEditingInvoiceNumber(null);
    setCart([]);
    setDiscountType('amount');
    setDiscountInput(0);
    setNotes('');
    setSelectedDelegate('');
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Product Selection Grid (7 Columns) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Barcode / Search Input Header */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <form onSubmit={handleBarcodeSubmit} className="relative flex-1">
                <Barcode className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600" />
                <input
                  ref={barcodeInputRef}
                  type="text"
                  placeholder="امسح الباركود أو ابحث باسم الصنف..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-10 pl-4 py-2.5 text-xs font-bold border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </form>

              {/* Mobile Camera Barcode Scanner Button */}
              <button
                type="button"
                onClick={() => setShowCameraModal(true)}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black px-3.5 py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-md shrink-0 hover:scale-105 active:scale-95 border border-emerald-400"
                title="مسح الباركود بكاميرا الموبايل بسرعة فائقة وبشكل مستمر"
              >
                <Camera className="w-4 h-4 text-emerald-100" />
                <span>قارئ الباركود السريع ⚡</span>
              </button>

              {/* AI Image Search Button */}
              <button
                type="button"
                onClick={() => setShowImageSearchModal(true)}
                className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold px-3 py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-xs shrink-0 hover:scale-105 active:scale-95"
                title="البحث عن المنتج بواسطة صورته بالذكاء الاصطناعي"
              >
                <Sparkles className="w-4 h-4 text-purple-200 animate-pulse" />
                <span>بحث ذكي بالصورة 🤖</span>
              </button>

              {/* Sales History & Deletion Button */}
              <button
                type="button"
                onClick={() => setShowSalesHistoryModal(true)}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-3 py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-xs shrink-0"
                title="سجل المبيعات وإلغاء/حذف الفواتير"
              >
                <History className="w-4 h-4" />
                <span>سجل المبيعات ({salesInvoices.length})</span>
              </button>
            </div>

            {/* Fast Scan Mode Info & Toggle Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 p-3 rounded-xl">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 animate-pulse shrink-0" />
                <div className="text-right">
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200">وضع المسح السريع بالذكاء الاصطناعي (Fast Scan Mode) ⚡</span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">عند النقر على "بحث بالصورة 📷"، وجه الكاميرا للمنتج وسيتم التعرف عليه وإضافته فوراً للسلة وبشكل مستمر دون توقف!</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFastScanMode(!isFastScanMode)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  isFastScanMode ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    isFastScanMode ? '-translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* AI Image Search Modal Component */}
            <ProductImageSearchModal
              isOpen={showImageSearchModal}
              onClose={() => setShowImageSearchModal(false)}
              products={products}
              settings={settings}
              onSelectProduct={(p) => {
                addToCart(p);
              }}
              isFastScanMode={isFastScanMode}
            />

            {/* Camera Scanner Modal Component */}
            <BarcodeScannerModal
              isOpen={showCameraModal}
              onClose={() => setShowCameraModal(false)}
              onScanSuccess={handleScanSuccess}
              title="قارئ الباركود السريع بكاميرا الموبايل ⚡"
              continuous={true}
              products={products}
            />

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                الكل ({products.length})
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {filteredProducts.map(prod => {
              const outOfStock = prod.stock <= 0;
              return (
                <button
                  key={prod.id}
                  onClick={() => addToCart(prod)}
                  disabled={outOfStock}
                  className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between h-36 cursor-pointer ${
                    outOfStock
                      ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed'
                      : 'bg-white hover:border-emerald-500 hover:shadow-md border-slate-200 active:scale-95'
                  }`}
                >
                  <div className="flex items-start gap-2 overflow-hidden">
                    {prod.image ? (
                      <img
                        src={prod.image}
                        alt={prod.name}
                        className="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-50"
                      />
                    ) : null}
                    <div className="overflow-hidden flex-1">
                      <span className="text-[10px] font-bold text-slate-400 block mb-0.5 truncate">{prod.category}</span>
                      <h4 className="font-bold text-slate-800 text-xs line-clamp-2 leading-tight">{prod.name}</h4>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                    <span className="font-mono font-black text-sm text-emerald-700">
                      {prod.sellingPrice.toFixed(2)} {settings.currencySymbol}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                      outOfStock ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {outOfStock ? 'نفد' : `${prod.stock} ${prod.unit}`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

        </div>

        {/* Right Side: Sales Invoice Cart & Checkout (5 Columns) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-lg p-5 space-y-4">
          
          {editingInvoiceId && (
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl flex items-center justify-between text-xs text-amber-900 font-bold">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-600 animate-pulse" />
                <span>جاري تعديل فاتورة المبيعات ({editingInvoiceNumber})</span>
              </div>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-2.5 py-1 bg-white hover:bg-amber-100 border border-amber-300 rounded-lg text-amber-800 text-[11px] font-extrabold cursor-pointer"
              >
                إلغاء التعديل
              </button>
            </div>
          )}

          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-emerald-600" />
              <span>سلة الفاتورة الحالية</span>
            </h3>
            <span className="text-xs bg-emerald-50 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
              {cart.length} أصناف
            </span>
          </div>

          {/* Customer Selector & Category Badge */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold text-slate-600">الزبون / العميل *</label>
              {selectedCustomer?.category === 'vip' && (
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">
                  <Crown className="w-3 h-3 text-purple-600" />
                  <span>عميل VIP</span>
                </span>
              )}
              {selectedCustomer?.category === 'wholesale' && (
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md">
                  <Tag className="w-3 h-3 text-sky-600" />
                  <span>زبون جملة</span>
                </span>
              )}
            </div>
            <select
              value={selectedCustomer?.id || ''}
              onChange={(e) => {
                const c = customers.find(item => item.id === e.target.value);
                if (c) {
                  setSelectedCustomer(c);
                  setSelectedDelegate('');
                }
              }}
              className="w-full p-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white font-bold text-slate-800"
            >
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.openingBalance ? `(رصيد سابق: ${c.openingBalance} ${settings.currencySymbol})` : ''}
                </option>
              ))}
            </select>

            {selectedCustomer?.delegates && selectedCustomer.delegates.length > 0 && (
              <div className="space-y-1.5 mt-2.5 p-2.5 bg-emerald-50/40 border border-emerald-100/70 rounded-xl">
                <label className="block text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-emerald-600" />
                  <span>المستلم / المندوب الذي يقوم بالشراء:</span>
                </label>
                <select
                  value={selectedDelegate}
                  onChange={(e) => setSelectedDelegate(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-800"
                >
                  <option value="">صاحب الحساب نفسه (الزبون الرئيسي)</option>
                  {selectedCustomer.delegates.map((del, idx) => (
                    <option key={idx} value={del}>{del}</option>
                  ))}
                </select>
              </div>
            )}

            {paymentMethod === 'credit' && selectedCustomer && (selectedCustomer.creditLimit || 0) > 0 && (selectedCustomer.creditLimit || 0) < ((selectedCustomer.openingBalance || 0) + remainingAmount) && (
              <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-1.5 text-[11px] text-rose-700 font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>تحذير: هذه الفاتورة ستتجاوز سقف الائتمان المسموح للزبون ({selectedCustomer.creditLimit} {settings.currencySymbol})!</span>
              </div>
            )}
          </div>

          {/* Cart Itemized Table */}
          <div className="max-h-56 overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-100">
            {cart.length === 0 ? (
              <div className="py-10 text-center text-slate-400 space-y-1">
                <ShoppingBag className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs font-semibold">السلة فارغة، اختر الأصناف للإضافة</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.productId} className="p-2.5 space-y-1.5 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between text-xs">
                    <div className="space-y-0.5 flex-1 pl-2">
                      <p className="font-bold text-slate-800 line-clamp-1">{item.productName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {item.unitPrice.toFixed(2)} × {item.quantity}
                        {item.discount > 0 && <span className="text-amber-600 font-bold"> (خصم صنف: {item.discount.toFixed(2)})</span>}
                        {' = '}
                        <span className="font-bold text-slate-800">{item.total.toFixed(2)} {settings.currencySymbol}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white">
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.productId, -1)}
                          className="p-1 hover:bg-slate-100 cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 font-mono font-bold text-xs">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.productId, 1)}
                          className="p-1 hover:bg-slate-100 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.productId)}
                        className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Inline Item Discount Input */}
                  <div className="flex items-center gap-2 text-[10px] bg-amber-50/50 p-1.5 rounded-lg border border-amber-200/50">
                    <span className="font-bold text-slate-600 shrink-0">خصم خاص لهذا الصنف:</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.discount || ''}
                      onChange={(e) => updateCartItemDiscount(item.productId, Number(e.target.value))}
                      className="w-20 px-1.5 py-0.5 text-xs font-mono font-bold border border-amber-200 rounded bg-white text-amber-800"
                      placeholder="0.00"
                    />
                    <span className="text-slate-500 font-mono">{settings.currencySymbol}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Payment Method & Discounts */}
          <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
            
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`py-2 rounded-xl font-bold border transition-all cursor-pointer text-center ${
                  paymentMethod === 'cash'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                نقداً (كاش)
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('bank')}
                className={`py-2 rounded-xl font-bold border transition-all cursor-pointer text-center ${
                  paymentMethod === 'bank'
                    ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                شبكة / مدى
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('credit')}
                className={`py-2 rounded-xl font-bold border transition-all cursor-pointer text-center ${
                  paymentMethod === 'credit'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                آجل (على الحساب)
              </button>
            </div>

            {/* Invoice Discount Section */}
            <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-amber-950 flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5 text-amber-600" />
                  <span>الخصم الإجمالي على الفاتورة</span>
                </label>
                
                {/* Discount type toggle */}
                <div className="flex items-center bg-white border border-amber-200 rounded-lg p-0.5 text-[10px] font-bold">
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

              {/* Discount Input & Quick Percentage Buttons */}
              <div className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5">
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={discountInput || ''}
                      onChange={(e) => setDiscountInput(Number(e.target.value))}
                      className="w-full p-2 pr-2 pl-7 text-xs border border-amber-300 rounded-xl font-mono font-bold bg-white text-amber-900 focus:ring-2 focus:ring-amber-500"
                      placeholder={discountType === 'percent' ? '10%' : '0.00'}
                    />
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-amber-600">
                      {discountType === 'percent' ? '%' : settings.currencySymbol}
                    </span>
                  </div>
                </div>

                {/* Quick percentage buttons */}
                <div className="col-span-7 flex items-center gap-1 overflow-x-auto text-[10px] font-bold">
                  {[0, 5, 10, 15, 20].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => {
                        if (pct === 0) {
                          setDiscountInput(0);
                        } else {
                          setDiscountType('percent');
                          setDiscountInput(pct);
                        }
                      }}
                      className={`px-2 py-1 rounded-lg border transition-all cursor-pointer shrink-0 ${
                        discountType === 'percent' && discountInput === pct
                          ? 'bg-amber-600 text-white border-amber-600 font-black shadow-xs'
                          : 'bg-white text-amber-800 border-amber-200 hover:bg-amber-100'
                      }`}
                    >
                      {pct === 0 ? 'بدون' : `${pct}%`}
                    </button>
                  ))}
                </div>
              </div>

              {discountTotal > 0 && (
                <div className="text-[11px] font-extrabold text-amber-900 flex justify-between pt-1.5 border-t border-amber-200/80 font-mono">
                  <span>إجمالي قيمة الخصم المخصومة:</span>
                  <span>-{discountTotal.toFixed(2)} {settings.currencySymbol}</span>
                </div>
              )}
            </div>

            {/* Paid Amount Input */}
            <div>
              <label className="block text-[11px] text-slate-600 font-bold mb-0.5">المبلغ المدفوع للـكاشير ({settings.currencySymbol})</label>
              <input
                type="number"
                step="0.01"
                value={paidAmount || ''}
                onChange={(e) => setPaidAmount(Number(e.target.value))}
                className="w-full p-2.5 border border-slate-200 rounded-xl font-mono font-bold text-emerald-700 bg-emerald-50/40 focus:ring-2 focus:ring-emerald-500"
                placeholder="0.00"
              />
            </div>

            {/* Invoice Totals Calculation Box */}
            <div className="bg-slate-900 text-white p-4 rounded-xl space-y-1.5 font-mono">
              <div className="flex justify-between text-xs text-slate-300">
                <span>المجموع الفرعي:</span>
                <span>{subtotal.toFixed(2)} {settings.currencySymbol}</span>
              </div>

              {settings.enableTax && (
                <div className="flex justify-between text-xs text-slate-300">
                  <span>ضريبة القيمة المضافة ({settings.defaultTaxRate}%):</span>
                  <span>{taxAmount.toFixed(2)} {settings.currencySymbol}</span>
                </div>
              )}

              {discountTotal > 0 && (
                <div className="flex justify-between text-xs text-amber-400">
                  <span>إجمالي الخصم:</span>
                  <span>-{discountTotal.toFixed(2)} {settings.currencySymbol}</span>
                </div>
              )}

              <div className="flex justify-between text-sm font-black text-emerald-400 pt-2 border-t border-slate-800">
                <span>الصافي المطلوب:</span>
                <span>{netTotal.toFixed(2)} {settings.currencySymbol}</span>
              </div>

              {/* Live Gross Profit Estimate Bar */}
              {cart.length > 0 && (
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-sans">
                  <span className="text-slate-400 flex items-center gap-1 font-semibold">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    <span>هامش الربح المتوقع للفاتورة:</span>
                  </span>
                  {(() => {
                    const totalCartCost = cart.reduce((sum, item) => {
                      const p = products.find(prod => prod.id === item.productId);
                      return sum + ((p?.costPrice || 0) * item.quantity);
                    }, 0);
                    const estProfit = Math.max(0, (subtotal - discountTotal) - totalCartCost);
                    const estMargin = (subtotal - discountTotal) > 0 ? (estProfit / (subtotal - discountTotal)) * 100 : 0;
                    return (
                      <span className="font-mono font-bold text-emerald-300">
                        +{estProfit.toFixed(2)} {settings.currencySymbol} ({estMargin.toFixed(0)}%)
                      </span>
                    );
                  })()}
                </div>
              )}

              {paymentMethod === 'cash' && changeDue > 0 && (
                <div className="flex justify-between text-xs text-sky-400 font-bold pt-1">
                  <span>الباقي للزبون:</span>
                  <span>{changeDue.toFixed(2)} {settings.currencySymbol}</span>
                </div>
              )}

              {remainingAmount > 0 && (
                <div className="flex justify-between text-xs text-amber-400 font-bold pt-1">
                  <span>المتبقي ديناً (آجل):</span>
                  <span>{remainingAmount.toFixed(2)} {settings.currencySymbol}</span>
                </div>
              )}
            </div>

            {/* Complete Sale Button */}
            <button
              onClick={handleCompleteSale}
              disabled={cart.length === 0}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>إصدار الفاتورة وطباعة الإيصال</span>
            </button>

          </div>

        </div>

      </div>

    {/* Sales History Modal for Viewing & Deleting Sales Invoices */}
      {showSalesHistoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base">سجل المبيعات والتعديل / الإلغاء</h3>
                  <p className="text-[11px] text-slate-400">إدارة كافة فواتير المبيعات الصادرة وإمكانية طباعتها أو إلغائها وتعديل المخزون</p>
                </div>
              </div>

              <button
                onClick={() => setShowSalesHistoryModal(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
              {salesInvoices.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <FileText className="w-12 h-12 mx-auto text-slate-300" />
                  <p className="font-bold text-sm">لا توجد فواتير مبيعات مسجلة حتى الآن.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {salesInvoices.map((inv) => (
                    <div key={inv.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 hover:border-indigo-300 transition-colors">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-slate-900 text-sm">{inv.invoiceNumber}</span>
                          <span className="text-xs text-slate-500 font-mono">({inv.date})</span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-800">
                            العميل: {inv.customerName}
                          </span>
                          {inv.delegateName && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                              <Users className="w-3 h-3 text-amber-600" />
                              <span>بواسطة المندوب: {inv.delegateName}</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-mono font-extrabold text-emerald-700 text-sm">
                            {inv.netTotal.toFixed(2)} {settings.currencySymbol}
                          </span>

                          <button
                            onClick={() => onSelectInvoiceForPrint(inv)}
                            className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>طباعة</span>
                          </button>

                          <button
                            onClick={() => handleStartEditSalesInvoice(inv)}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs rounded-lg border border-amber-200 flex items-center gap-1 transition-colors cursor-pointer"
                            title="تعديل الكميات أو الأسعار أو الأصناف أو اسم الزبون"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                            <span>تعديل</span>
                          </button>

                          {onDeleteSalesInvoice && (
                            <button
                              onClick={() => onDeleteSalesInvoice(inv.id)}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-lg border border-rose-200 flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              <span>إلغاء وحذف</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Items Summary */}
                      <div className="flex flex-wrap gap-2 text-xs font-mono">
                        {inv.items.map((item, idx) => (
                          <span key={idx} className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 font-medium">
                            {item.productName} ({item.quantity} × {item.unitPrice.toFixed(2)})
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 text-left shrink-0">
              <button
                onClick={() => setShowSalesHistoryModal(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                إغلاق النافذة
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
