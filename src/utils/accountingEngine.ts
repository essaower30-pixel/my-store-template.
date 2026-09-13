import {
  AccountNode,
  Product,
  Supplier,
  Customer,
  SalesInvoice,
  PurchaseInvoice,
  PaymentVoucher,
  JournalEntry,
  ShopSettings,
  JournalLine
} from '../types/accounting';
import {
  INITIAL_ACCOUNTS,
  INITIAL_PRODUCTS,
  INITIAL_SUPPLIERS,
  INITIAL_CUSTOMERS,
  INITIAL_SALES_INVOICES,
  INITIAL_PURCHASE_INVOICES,
  INITIAL_VOUCHERS,
  INITIAL_JOURNAL_ENTRIES,
  INITIAL_SETTINGS
} from '../data/initialData';

const STORAGE_KEYS = {
  ACCOUNTS: 'shop_acc_accounts_v1',
  PRODUCTS: 'shop_acc_products_v1',
  SUPPLIERS: 'shop_acc_suppliers_v1',
  CUSTOMERS: 'shop_acc_customers_v1',
  SALES: 'shop_acc_sales_v1',
  PURCHASES: 'shop_acc_purchases_v1',
  VOUCHERS: 'shop_acc_vouchers_v1',
  JOURNAL: 'shop_acc_journal_v1',
  SETTINGS: 'shop_acc_settings_v1',
};

// Helper to isolate localStorage partitions by store query parameter
export function getStorePrefix(): string {
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const storeId = urlParams.get('store');
    if (storeId && storeId.trim() !== '') {
      return `store_${storeId.trim()}_`;
    }
  }
  return '';
}

export function getStoreQueryParam(): string {
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const storeId = urlParams.get('store');
    if (storeId && storeId.trim() !== '') {
      return storeId.trim();
    }
  }
  return '';
}

export function getStoreUrl(url: string): string {
  const storeId = getStoreQueryParam();
  if (!storeId) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}store=${encodeURIComponent(storeId)}`;
}

// Helper for local storage retrieval with default fallback
export function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const prefix = getStorePrefix();
    const item = localStorage.getItem(prefix + key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error loading key ${key} from storage`, error);
    return defaultValue;
  }
}

// Helper for local storage saving
export function saveToStorage<T>(key: string, value: T): void {
  try {
    const prefix = getStorePrefix();
    localStorage.setItem(prefix + key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving key ${key} to storage`, error);
  }
}

export function resetAllDataToDefault() {
  saveToStorage(STORAGE_KEYS.ACCOUNTS, INITIAL_ACCOUNTS);
  saveToStorage(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
  saveToStorage(STORAGE_KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
  saveToStorage(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
  saveToStorage(STORAGE_KEYS.SALES, INITIAL_SALES_INVOICES);
  saveToStorage(STORAGE_KEYS.PURCHASES, INITIAL_PURCHASE_INVOICES);
  saveToStorage(STORAGE_KEYS.VOUCHERS, INITIAL_VOUCHERS);
  saveToStorage(STORAGE_KEYS.JOURNAL, INITIAL_JOURNAL_ENTRIES);
  saveToStorage(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
}

// Compute total balance for an account code based on journal entries + opening balances
export function calculateAccountBalance(
  accountCode: string,
  accounts: AccountNode[],
  journalEntries: JournalEntry[]
): { debit: number; credit: number; netBalance: number } {
  let debit = 0;
  let credit = 0;

  // Find account type
  const targetAcc = accounts.find(a => a.code === accountCode);
  if (!targetAcc) return { debit: 0, credit: 0, netBalance: 0 };

  // Sum all journal entry lines for this account code or child accounts if it's a header
  const isHeader = targetAcc.isHeader;

  journalEntries.forEach(entry => {
    entry.lines.forEach(line => {
      if (line.accountCode === accountCode || (isHeader && line.accountCode.startsWith(accountCode))) {
        debit += Number(line.debit || 0);
        credit += Number(line.credit || 0);
      }
    });
  });

  // Net balance convention:
  // Assets & Expenses: Net = Debit - Credit
  // Liabilities, Equity, Revenue: Net = Credit - Debit
  let netBalance = 0;
  if (targetAcc.type === 'asset' || targetAcc.type === 'expense') {
    netBalance = debit - credit;
  } else {
    netBalance = credit - debit;
  }

  return { debit, credit, netBalance };
}

// Calculate Customer Total Balance (Opening + Sales Credit - Receipt Payments)
export function calculateCustomerBalance(
  customer: Customer,
  salesInvoices: SalesInvoice[],
  vouchers: PaymentVoucher[]
): number {
  let balance = customer.openingBalance || 0;

  // Add unpaid or credit sales
  salesInvoices.forEach(inv => {
    if (inv.customerId === customer.id) {
      balance += (inv.remainingAmount || 0);
    }
  });

  // Subtract receipts from customer
  vouchers.forEach(v => {
    if (v.partyType === 'customer' && v.partyId === customer.id && v.type === 'receipt') {
      balance -= v.amount;
    }
  });

  return balance;
}

// Calculate Supplier Total Balance (Opening + Purchase Credit - Disbursement Payments)
export function calculateSupplierBalance(
  supplier: Supplier,
  purchaseInvoices: PurchaseInvoice[],
  vouchers: PaymentVoucher[]
): number {
  let balance = supplier.openingBalance || 0;

  purchaseInvoices.forEach(inv => {
    if (inv.supplierId === supplier.id) {
      balance += (inv.remainingAmount || 0);
    }
  });

  vouchers.forEach(v => {
    if (v.partyType === 'supplier' && v.partyId === supplier.id && v.type === 'disbursement') {
      balance -= v.amount;
    }
  });

  return balance;
}

// Generate automatic Journal Entry for Sales Invoice
export function createSalesJournalEntry(invoice: SalesInvoice): JournalEntry {
  const lines: JournalLine[] = [];

  // 1. Debit: Cash or Customer Debt
  if (invoice.paidAmount > 0) {
    lines.push({
      accountCode: '1010',
      accountName: 'الصندوق والنقدية',
      debit: invoice.paidAmount,
      credit: 0,
      memo: `المبلغ المدفوع نقداً بفاتورة مبيعات ${invoice.invoiceNumber}`
    });
  }

  if (invoice.remainingAmount > 0) {
    lines.push({
      accountCode: '1040',
      accountName: 'ذمم الزبائن والعملاء',
      debit: invoice.remainingAmount,
      credit: 0,
      memo: `آجل للزبون: ${invoice.customerName} - فاتورة ${invoice.invoiceNumber}`
    });
  }

  // 2. Credit: Sales Revenue (subtotal - discountTotal)
  const salesNetRevenue = invoice.subtotal - invoice.discountTotal;
  lines.push({
    accountCode: '4010',
    accountName: 'إيراد المبيعات',
    debit: 0,
    credit: salesNetRevenue,
    memo: `إيراد فاتورة مبيعات ${invoice.invoiceNumber}`
  });

  // 3. Credit: Tax VAT if any
  if (invoice.taxAmount > 0) {
    lines.push({
      accountCode: '2020',
      accountName: 'ضريبة القيمة المضافة المستحقة',
      debit: 0,
      credit: invoice.taxAmount,
      memo: `ضريبة مبيعات فاتورة ${invoice.invoiceNumber}`
    });
  }

  return {
    id: `je-s-${Date.now()}`,
    entryNumber: `JE-S-${Math.floor(1000 + Math.random() * 9000)}`,
    date: invoice.date,
    description: `قيد تلقائي لفاتورة المبيعات رقم ${invoice.invoiceNumber} - العميل: ${invoice.customerName}`,
    lines,
    referenceType: 'sales',
    referenceId: invoice.id,
    createdAt: new Date().toISOString()
  };
}

// Generate automatic Journal Entry for Purchase Invoice
export function createPurchaseJournalEntry(invoice: PurchaseInvoice): JournalEntry {
  const lines: JournalLine[] = [];

  // 1. Debit: Inventory (total net amount including tax or net total)
  lines.push({
    accountCode: '1030',
    accountName: 'مخزون البضائع (الأصناف)',
    debit: invoice.netTotal,
    credit: 0,
    memo: `شراء بضاعة فاتورة رقم ${invoice.invoiceNumber}`
  });

  // 2. Credit: Cash (paid)
  if (invoice.paidAmount > 0) {
    lines.push({
      accountCode: '1010',
      accountName: 'الصندوق والنقدية',
      debit: 0,
      credit: invoice.paidAmount,
      memo: `المدفوع نقداً للمورد ${invoice.supplierName}`
    });
  }

  // 3. Credit: Supplier Debt (remaining)
  if (invoice.remainingAmount > 0) {
    lines.push({
      accountCode: '2010',
      accountName: 'ذمم الموردين',
      debit: 0,
      credit: invoice.remainingAmount,
      memo: `مستحق للمورد ${invoice.supplierName} - فاتورة ${invoice.invoiceNumber}`
    });
  }

  return {
    id: `je-p-${Date.now()}`,
    entryNumber: `JE-P-${Math.floor(1000 + Math.random() * 9000)}`,
    date: invoice.date,
    description: `قيد تلقائي لفاتورة المشتريات رقم ${invoice.invoiceNumber} - المورد: ${invoice.supplierName}`,
    lines,
    referenceType: 'purchase',
    referenceId: invoice.id,
    createdAt: new Date().toISOString()
  };
}

// Generate automatic Journal Entry for Payment Voucher (Receipt / Disbursement)
export function createVoucherJournalEntry(voucher: PaymentVoucher): JournalEntry {
  const lines: JournalLine[] = [];

  if (voucher.type === 'receipt') {
    // Receipt from Customer: Debit Cash/Bank, Credit Receivables 1040
    lines.push({
      accountCode: voucher.targetAccountCode || '1010',
      accountName: voucher.targetAccountCode === '1020' ? 'حساب البنك / المدى' : 'الصندوق والنقدية',
      debit: voucher.amount,
      credit: 0,
      memo: `سند قبض رقم ${voucher.voucherNumber}`
    });

    lines.push({
      accountCode: '1040',
      accountName: 'ذمم الزبائن والعملاء',
      debit: 0,
      credit: voucher.amount,
      memo: `تحصيل من العميل: ${voucher.partyName}`
    });
  } else {
    // Disbursement / Payment:
    // If expense: Debit Expense Account, Credit Cash/Bank
    // If supplier: Debit Supplier Debt 2010, Credit Cash/Bank
    const debitedAccountCode = voucher.categoryAccountCode || (voucher.partyType === 'supplier' ? '2010' : '5050');
    const debitedAccountName = voucher.partyType === 'supplier' ? 'ذمم الموردين' : 'مصروفات متنوعة';

    lines.push({
      accountCode: debitedAccountCode,
      accountName: debitedAccountName,
      debit: voucher.amount,
      credit: 0,
      memo: voucher.notes || `سند صرف رقم ${voucher.voucherNumber}`
    });

    lines.push({
      accountCode: voucher.targetAccountCode || '1010',
      accountName: voucher.targetAccountCode === '1020' ? 'حساب البنك / المدى' : 'الصندوق والنقدية',
      debit: 0,
      credit: voucher.amount,
      memo: `دفعة مسددة إلى ${voucher.partyName}`
    });
  }

  return {
    id: `je-v-${Date.now()}`,
    entryNumber: `JE-V-${Math.floor(1000 + Math.random() * 9000)}`,
    date: voucher.date,
    description: `${voucher.type === 'receipt' ? 'سند قبض' : 'سند صرف'} رقم ${voucher.voucherNumber} - ${voucher.partyName}`,
    lines,
    referenceType: voucher.type === 'receipt' ? 'receipt' : 'payment',
    referenceId: voucher.id,
    createdAt: new Date().toISOString()
  };
}
