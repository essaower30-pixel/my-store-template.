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


