export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

export interface AccountNode {
  code: string; // e.g. "101", "10101"
  name: string; // e.g. "الصندوق والنقدية"
  type: AccountType;
  category: string; // e.g. "الأصول المتداولة"
  parentCode?: string;
  isHeader?: boolean; // If true, it's a summary header
  description?: string;
}

export interface JournalLine {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  memo?: string;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string; // YYYY-MM-DD
  description: string;
  lines: JournalLine[];
  referenceType?: 'sales' | 'purchase' | 'receipt' | 'payment' | 'manual';
  referenceId?: string;
  referenceNumber?: string;
  createdAt: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  color?: string;
}

export interface Product {
  id: string;
  barcode: string;
  name: string;
  category: string;
  unit: string; // قطعة، كجم، علبة، طرد، إلخ
  costPrice: number; // سعر الشراء
  sellingPrice: number; // سعر البيع
  stock: number; // الكمية المتوفرة
  minStockAlert: number; // حد الإنذار بالأنخفاض
  location?: string;
  image?: string; // صورة المنتج (Base64 data URL أو رابط)
  showInStore?: boolean; // هل يتم عرضه في تطبيق الزبون (المتجر الإلكتروني)؟
  originalPrice?: number; // السعر السابق قبل الخصم (للعروض والتخفيضات)
  isOffer?: boolean; // هل المنتج يندرج تحت قائمة العروض الخاصة؟
  hasSubUnits?: boolean; // تفعيل التعبئة (كرتون/كيس شد كذا)
  subUnitsPerUnit?: number; // العدد داخل الكرتونة/الكيس
  subUnitName?: string; // اسم الوحدة الفرعية (مثال: حبة)
  subUnitSellingPrice?: number; // سعر بيع الوحدة الفرعية (تلقائي أو مخصص)
  storeId?: string; // معرف المتجر الشريك التابع له المنتج (فارغ أو 'main' للمتجر الرئيسي)
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  openingBalance: number; // رصيد افتتاحي
  notes?: string;
  category?: 'local' | 'imported' | 'wholesaler';
  rating?: number; // 1 to 5 stars rating
  taxNumber?: string;
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  phone: string;
  address?: string;
  creditLimit: number; // سقف الائتمان
  openingBalance: number;
  notes?: string;
  category?: 'retail' | 'wholesale' | 'vip';
  rating?: number;
  taxNumber?: string;
  delegates?: string[]; // قائمة المناديب للزبون الرئيسي
}

export interface InvoiceItem {
  productId: string;
  barcode: string;
  productName: string;
  unit: string;
  quantity: number;
  unitPrice: number; // For sale: selling price, For purchase: cost price
  discount: number;
  total: number;
  isSubUnit?: boolean; // هل تم البيع بالحبة/الوحدة الفرعية بدلاً من الكرتون؟
}

export interface SalesInvoice {
  id: string;
  invoiceNumber: string;
  date: string;
  time: string;
  customerId: string;
  customerName: string;
  items: InvoiceItem[];
  subtotal: number;
  discountTotal: number;
  taxAmount: number;
  netTotal: number;
  paidAmount: number;
  remainingAmount: number;
  paymentMethod: 'cash' | 'credit' | 'bank'; // نقداً، آجل، تحويل بنكي
  notes?: string;
  delegateName?: string; // اسم المندوب الذي قام بالشراء لحساب الزبون
}

export interface PurchaseInvoice {
  id: string;
  invoiceNumber: string;
  supplierInvoiceNumber?: string;
  date: string;
  supplierId: string;
  supplierName: string;
  items: InvoiceItem[];
  subtotal: number;
  discountTotal: number;
  taxAmount: number;
  netTotal: number;
  paidAmount: number;
  remainingAmount: number;
  paymentMethod: 'cash' | 'credit' | 'bank';
  notes?: string;
}

export interface PaymentVoucher {
  id: string;
  voucherNumber: string;
  type: 'receipt' | 'disbursement'; // سند قبض (من زبون) | سند صرف (لمورد أو مصروف)
  date: string;
  partyType: 'customer' | 'supplier' | 'expense' | 'other';
  partyId?: string;
  partyName: string;
  amount: number;
  paymentMethod: 'cash' | 'bank';
  targetAccountCode: string; // e.g. "101" Cash, "102" Bank
  categoryAccountCode?: string; // For expenses e.g. "502"
  notes: string;
}

export interface PartnerStore {
  id: string;
  name: string;
  phone: string; // رقم تلفون المتجر الشريك
  shamCashNumber?: string; // الرقم المالي لشام كاش الخاص بالمتجر الشريك
  shamCashQR?: string; // باركود حساب شام كاش للمتجر الشريك (صورة)
  logo?: string; // صورة أو شعار المتجر
  link?: string; // رابط المتجر الإلكتروني الخارجي (اختياري)
}

export interface ShopSettings {
  shopName: string;
  activityType: string;
  phone: string;
  address: string;
  taxNumber: string;
  currencySymbol: string; // ر.س، د.ج، ج.م، $، إلخ
  defaultTaxRate: number; // e.g. 15 for 15%
  enableTax: boolean;
  receiptHeader: string;
  receiptFooter: string;
  appUrl?: string;
  enableAutoScroll?: boolean;
  deliveryFee?: number; // قيمة رسوم التوصيل الافتراضية
  promoVideo?: string; // فيديو ترويجي أو فيديو عروض (Base64 أو رابط)
  partnerStores?: PartnerStore[]; // المتاجر الأخرى الشريكة لعرض منتجاتها
  enableShamCash?: boolean; // تفعيل الدفع عبر شام كاش
  shamCashNumber?: string; // الرقم المالي لحساب شام كاش الخاص بالمتجر
  shamCashQR?: string; // كود الـ QR الخاص بحساب شام كاش (صورة)
  multiStores?: { id: string; name: string }[]; // إدارة الروابط وتعدد المتاجر (الفروع المستقلة)
}

export interface StockAdjustment {
  id: string;
  date: string;
  time: string;
  productId: string;
  productName: string;
  previousStock: number;
  actualStock: number;
  difference: number; // e.g. +5 or -2
  reason: 'inventory_count' | 'damage' | 'expired' | 'intake' | 'other';
  notes?: string;
}

export interface StockMovement {
  id: string;
  date: string;
  time: string;
  productId: string;
  productName: string;
  type: 'sale' | 'purchase' | 'adjustment' | 'initial';
  quantityChange: number; // positive or negative
  previousStock: number;
  newStock: number;
  refNumber: string; // invoice or adjustment reference
  notes?: string;
}

export interface User {
  id: string;
  username: string; // اسم المستخدم للدخول
  name: string; // الاسم الكامل
  role: 'admin' | 'accountant' | 'seller'; // مسؤول، محاسب، بائع
  pin: string; // رمز PIN مكون من 4 أرقام
  permissions: {
    dashboard: boolean;
    pos: boolean;
    products: boolean;
    purchases: boolean;
    customers: boolean;
    suppliers: boolean;
    chartOfAccounts: boolean;
    journal: boolean;
    reports: boolean;
    settings: boolean;
  };
  createdAt: string;
}

export interface CustomerOrder {
  id: string;
  orderNumber: string;
  date: string;
  time: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  deliveryMethod: 'delivery' | 'pickup'; // توصيل | استلام من المتجر
  items: InvoiceItem[];
  subtotal: number;
  taxAmount: number;
  deliveryFee?: number; // قيمة رسوم التوصيل
  netTotal: number;
  status: 'pending' | 'accepted' | 'completed' | 'rejected';
  notes?: string;
  paymentMethod?: 'cash' | 'sham_cash'; // طريقة الدفع: كاش أو شام كاش
  paymentReceiptNumber?: string; // رقم إشعار/عملية الدفع في شام كاش
  paymentReceiptImage?: string; // صورة إشعار الدفع المرفوعة من العميل
  storeId?: string; // معرف المتجر الشريك التابع له الطلب
}

export interface FiscalYearArchive {
  id: string;
  year: number;
  closedAt: string;
  data: {
    salesInvoices: any[];
    purchaseInvoices: any[];
    vouchers: any[];
    journalEntries: any[];
    stockAdjustments: any[];
    products: any[];
    customers: any[];
    suppliers: any[];
  };
}



