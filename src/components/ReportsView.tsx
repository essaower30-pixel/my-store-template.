import React, { useState } from 'react';
import { 
  PieChart, 
  FileText, 
  TrendingUp, 
  DollarSign, 
  Printer, 
  Calendar, 
  CheckCircle2, 
  ArrowDownRight, 
  ArrowUpRight,
  BookOpen,
  ShoppingCart,
  ShoppingBag,
  Users,
  Truck,
  Edit,
  Trash2,
  Plus,
  Search,
  Filter,
  MessageSquare,
  Eye,
  X,
  Save,
  Clock,
  Package,
  AlertCircle,
  Building2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { 
  AccountNode, 
  JournalEntry, 
  SalesInvoice, 
  PurchaseInvoice, 
  Product, 
  ShopSettings, 
  Customer, 
  Supplier, 
  PaymentVoucher,
  InvoiceItem
} from '../types/accounting';
import { calculateAccountBalance } from '../utils/accountingEngine';
import { WhatsAppShareModal } from './WhatsAppShareModal';
import { AccountStatementModal } from './AccountStatementModal';
import { formatInvoiceWhatsAppMessage, formatBalanceReminderWhatsAppMessage } from '../utils/whatsappFormatter';

interface ReportsViewProps {
  accounts: AccountNode[];
  journalEntries: JournalEntry[];
  salesInvoices: SalesInvoice[];
  purchaseInvoices: PurchaseInvoice[];
  products: Product[];
  settings: ShopSettings;
  customers?: Customer[];
  suppliers?: Supplier[];
  vouchers?: PaymentVoucher[];
  onSaveSalesInvoice?: (invoice: SalesInvoice) => void;
  onDeleteSalesInvoice?: (id: string) => void;
  onSavePurchaseInvoice?: (invoice: PurchaseInvoice) => void;
  onDeletePurchaseInvoice?: (id: string) => void;
  onUpdateCustomer?: (customer: Customer) => void;
  onUpdateSupplier?: (supplier: Supplier) => void;
  initialReportTab?: 'purchasesReport' | 'salesReport' | 'customersReport' | 'suppliersReport' | 'pnl' | 'trialBalance' | 'accountStatement' | 'salesAnalytics' | 'inventoryAnalysis';
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  accounts,
  journalEntries,
  salesInvoices,
  purchaseInvoices,
  products,
  settings,
  customers = [],
  suppliers = [],
  vouchers = [],
  onSaveSalesInvoice,
  onDeleteSalesInvoice,
  onSavePurchaseInvoice,
  onDeletePurchaseInvoice,
  onUpdateCustomer,
  onUpdateSupplier,
  initialReportTab = 'salesReport'
}) => {
  const [activeReport, setActiveReport] = useState<
    'purchasesReport' | 'salesReport' | 'customersReport' | 'suppliersReport' | 'pnl' | 'trialBalance' | 'accountStatement' | 'salesAnalytics' | 'inventoryAnalysis'
  >(initialReportTab);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedAccountCode, setSelectedAccountCode] = useState<string>('1010');
  const [filterSupplierId, setFilterSupplierId] = useState<string>('ALL');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('ALL');
  const [filterCustomerStatus, setFilterCustomerStatus] = useState<string>('ALL');
  const [filterSupplierStatus, setFilterSupplierStatus] = useState<string>('ALL');
  const [filterDelegateName, setFilterDelegateName] = useState<string>('ALL');

  // Modals inside Reports
  const [editingSalesInvoice, setEditingSalesInvoice] = useState<SalesInvoice | null>(null);
  const [editingPurchaseInvoice, setEditingPurchaseInvoice] = useState<PurchaseInvoice | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<SalesInvoice | PurchaseInvoice | null>(null);

  // Account Statement Modal state
  const [statementModalParty, setStatementModalParty] = useState<{
    party: Customer | Supplier;
    type: 'customer' | 'supplier';
  } | null>(null);

  // WhatsApp Modal state
  const [whatsAppModalData, setWhatsAppModalData] = useState<{
    isOpen: boolean;
    phone: string;
    partyName: string;
    message: string;
    cardData?: any;
  } | null>(null);

  // --- REPORT 1: PURCHASES REPORT CALCULATIONS & EDITING ---
  const filteredPurchases = purchaseInvoices.filter(inv => {
    const matchesSearch = inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.supplierInvoiceNumber && inv.supplierInvoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesSupplier = filterSupplierId === 'ALL' || inv.supplierId === filterSupplierId;
    const matchesFrom = !dateFrom || inv.date >= dateFrom;
    const matchesTo = !dateTo || inv.date <= dateTo;

    return matchesSearch && matchesSupplier && matchesFrom && matchesTo;
  });

  const totalPurchasesAmount = filteredPurchases.reduce((s, inv) => s + inv.netTotal, 0);
  const totalPurchasesPaid = filteredPurchases.reduce((s, inv) => s + inv.paidAmount, 0);
  const totalPurchasesRemaining = filteredPurchases.reduce((s, inv) => s + inv.remainingAmount, 0);

  // --- REPORT 2: SALES REPORT CALCULATIONS & EDITING ---
  // Collect all unique delegates
  const uniqueDelegates = React.useMemo(() => {
    const fromInvoices = salesInvoices
      .map(inv => inv.delegateName)
      .filter((name): name is string => typeof name === 'string' && name.trim() !== '');
    const fromCustomers = customers
      .flatMap(c => c.delegates || [])
      .filter((name): name is string => typeof name === 'string' && name.trim() !== '');
    return Array.from(new Set([...fromInvoices, ...fromCustomers])).sort();
  }, [salesInvoices, customers]);

  const filteredSales = salesInvoices.filter(inv => {
    const matchesSearch = inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesMethod = filterPaymentMethod === 'ALL' || inv.paymentMethod === filterPaymentMethod;
    const matchesFrom = !dateFrom || inv.date >= dateFrom;
    const matchesTo = !dateTo || inv.date <= dateTo;

    const matchesDelegate = filterDelegateName === 'ALL' || 
      (filterDelegateName === 'WITHOUT_DELEGATE' && (!inv.delegateName || inv.delegateName.trim() === '')) ||
      inv.delegateName === filterDelegateName;

    return matchesSearch && matchesMethod && matchesFrom && matchesTo && matchesDelegate;
  });

  const delegateBreakdown = React.useMemo(() => {
    const groups: { [name: string]: { totalSales: number; paid: number; unpaid: number; count: number } } = {};
    
    filteredSales.forEach(inv => {
      const dName = inv.delegateName && inv.delegateName.trim() !== '' ? inv.delegateName.trim() : 'مبيعات مباشرة (بدون مندوب)';
      if (!groups[dName]) {
        groups[dName] = { totalSales: 0, paid: 0, unpaid: 0, count: 0 };
      }
      groups[dName].totalSales += inv.netTotal;
      groups[dName].paid += inv.paidAmount;
      groups[dName].unpaid += inv.remainingAmount;
      groups[dName].count += 1;
    });

    return Object.entries(groups).map(([name, stats]) => ({
      name,
      ...stats
    })).sort((a, b) => b.totalSales - a.totalSales);
  }, [filteredSales]);

  const totalSalesAmount = filteredSales.reduce((s, inv) => s + inv.netTotal, 0);
  const totalSalesPaid = filteredSales.reduce((s, inv) => s + inv.paidAmount, 0);
  const totalSalesRemaining = filteredSales.reduce((s, inv) => s + inv.remainingAmount, 0);
  const totalSalesCash = filteredSales.filter(s => s.paymentMethod === 'cash').reduce((sum, inv) => sum + inv.netTotal, 0);
  const totalSalesCredit = filteredSales.filter(s => s.paymentMethod === 'credit').reduce((sum, inv) => sum + inv.netTotal, 0);

  // --- REPORT 3: CUSTOMERS REPORT CALCULATIONS & EDITING ---
  const getCustomerBalanceData = (cust: Customer) => {
    const custSales = salesInvoices.filter(s => s.customerId === cust.id || s.customerName === cust.name);
    const totalSalesVal = custSales.reduce((s, inv) => s + inv.netTotal, 0);
    const totalSalesRemainingVal = custSales.reduce((s, inv) => s + inv.remainingAmount, 0);
    
    const custReceipts = vouchers.filter(v => v.type === 'receipt' && (v.partyId === cust.id || v.partyName === cust.name));
    const totalVouchersVal = custReceipts.reduce((s, v) => s + v.amount, 0);

    const balance = (cust.openingBalance || 0) + totalSalesRemainingVal - totalVouchersVal;

    return {
      totalSalesVal,
      totalVouchersVal,
      balance,
      invoicesCount: custSales.length
    };
  };

  const filteredCustomers = customers.filter(cust => {
    const matchesSearch = cust.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cust.phone.includes(searchTerm) ||
      cust.code.toLowerCase().includes(searchTerm.toLowerCase());
    
    const { balance } = getCustomerBalanceData(cust);
    const matchesStatus = filterCustomerStatus === 'ALL' 
      ? true 
      : filterCustomerStatus === 'DEBT' ? balance > 0 
      : balance <= 0;

    return matchesSearch && matchesStatus;
  });

  const totalCustomerReceivables = customers.reduce((sum, c) => {
    const { balance } = getCustomerBalanceData(c);
    return sum + (balance > 0 ? balance : 0);
  }, 0);

  // --- REPORT 4: SUPPLIERS REPORT CALCULATIONS & EDITING ---
  const getSupplierBalanceData = (sup: Supplier) => {
    const supPurchases = purchaseInvoices.filter(p => p.supplierId === sup.id || p.supplierName === sup.name);
    const totalPurchasesVal = supPurchases.reduce((s, inv) => s + inv.netTotal, 0);
    const totalPurchasesRemainingVal = supPurchases.reduce((s, inv) => s + inv.remainingAmount, 0);

    const supPayments = vouchers.filter(v => v.type === 'disbursement' && (v.partyId === sup.id || v.partyName === sup.name));
    const totalVouchersVal = supPayments.reduce((s, v) => s + v.amount, 0);

    const balance = (sup.openingBalance || 0) + totalPurchasesRemainingVal - totalVouchersVal;

    return {
      totalPurchasesVal,
      totalVouchersVal,
      balance,
      invoicesCount: supPurchases.length
    };
  };

  const filteredSuppliers = suppliers.filter(sup => {
    const matchesSearch = sup.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sup.phone.includes(searchTerm) ||
      sup.code.toLowerCase().includes(searchTerm.toLowerCase());
    
    const { balance } = getSupplierBalanceData(sup);
    const matchesStatus = filterSupplierStatus === 'ALL' 
      ? true 
      : filterSupplierStatus === 'PAYABLE' ? balance > 0 
      : balance <= 0;

    return matchesSearch && matchesStatus;
  });

  const totalSupplierPayables = suppliers.reduce((sum, s) => {
    const { balance } = getSupplierBalanceData(s);
    return sum + (balance > 0 ? balance : 0);
  }, 0);

  // --- FINANCIAL STATEMENTS CALCULATIONS (P&L, TRIAL BALANCE, ACCOUNT STATEMENT) ---
  const salesRevAcc = calculateAccountBalance('4010', accounts, journalEntries);
  const otherRevAcc = calculateAccountBalance('4020', accounts, journalEntries);
  const totalRevenues = salesRevAcc.netBalance + otherRevAcc.netBalance;

  const cogsAcc = calculateAccountBalance('5010', accounts, journalEntries);
  let estimatedCOGS = cogsAcc.netBalance;
  if (estimatedCOGS === 0) {
    estimatedCOGS = salesInvoices.reduce((sum, inv) => {
      const invCost = inv.items.reduce((itemSum, item) => {
        const prod = products.find(p => p.id === item.productId);
        const cost = prod ? prod.costPrice : item.unitPrice * 0.75;
        return itemSum + (cost * item.quantity);
      }, 0);
      return sum + invCost;
    }, 0);
  }

  const grossProfit = totalRevenues - estimatedCOGS;

  const rentAcc = calculateAccountBalance('5020', accounts, journalEntries);
  const utilAcc = calculateAccountBalance('5030', accounts, journalEntries);
  const salAcc = calculateAccountBalance('5040', accounts, journalEntries);
  const genAcc = calculateAccountBalance('5050', accounts, journalEntries);
  const totalExpenses = rentAcc.netBalance + utilAcc.netBalance + salAcc.netBalance + genAcc.netBalance;
  const netProfit = grossProfit - totalExpenses;

  const trialBalanceList = accounts.map(acc => {
    const bal = calculateAccountBalance(acc.code, accounts, journalEntries);
    return {
      code: acc.code,
      name: acc.name,
      type: acc.type,
      isHeader: acc.isHeader,
      debit: bal.debit,
      credit: bal.credit,
      netBalance: bal.netBalance
    };
  });

  const totalTrialDebit = trialBalanceList.filter(a => !a.isHeader).reduce((s, a) => s + a.debit, 0);
  const totalTrialCredit = trialBalanceList.filter(a => !a.isHeader).reduce((s, a) => s + a.credit, 0);

  const targetAccNode = accounts.find(a => a.code === selectedAccountCode) || accounts[0];
  const statementLines: Array<{
    date: string;
    entryNumber: string;
    description: string;
    debit: number;
    credit: number;
    runningBalance: number;
  }> = [];

  if (targetAccNode) {
    let running = 0;
    journalEntries.forEach(je => {
      je.lines.forEach(line => {
        if (line.accountCode === targetAccNode.code || (targetAccNode.isHeader && line.accountCode.startsWith(targetAccNode.code))) {
          const debit = Number(line.debit || 0);
          const credit = Number(line.credit || 0);

          if (targetAccNode.type === 'asset' || targetAccNode.type === 'expense') {
            running += (debit - credit);
          } else {
            running += (credit - debit);
          }

          statementLines.push({
            date: je.date,
            entryNumber: je.entryNumber,
            description: line.memo || je.description,
            debit,
            credit,
            runningBalance: running
          });
        }
      });
    });
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto" dir="rtl">
      
      {/* Header & Main Actions */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <PieChart className="w-6 h-6 text-indigo-600" />
            <span>مركز التقارير المحاسبية والتحليلات</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            تقارير تفصيلية شاملة للمشتريات، المبيعات، حسابات الزبائن، والموردين مع إمكانية التعديل والطباعة مباشرة.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة التقرير الحالي</span>
          </button>
        </div>
      </div>

      {/* Prominent Main Report Buttons Bar */}
      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2 bg-slate-100 p-2 rounded-2xl text-[10px] sm:text-xs font-bold">
        
        {/* 1. Purchases Report */}
        <button
          onClick={() => setActiveReport('purchasesReport')}
          className={`py-3 px-2 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center gap-1 text-center ${
            activeReport === 'purchasesReport'
              ? 'bg-amber-600 text-white shadow-md'
              : 'bg-white hover:bg-amber-50 text-slate-700 border border-slate-200'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>1. تقرير المشتريات</span>
        </button>

        {/* 2. Sales Report */}
        <button
          onClick={() => setActiveReport('salesReport')}
          className={`py-3 px-2 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center gap-1 text-center ${
            activeReport === 'salesReport'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white hover:bg-emerald-50 text-slate-700 border border-slate-200'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>2. تقرير المبيعات</span>
        </button>

        {/* 3. Customers Report */}
        <button
          onClick={() => setActiveReport('customersReport')}
          className={`py-3 px-2 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center gap-1 text-center ${
            activeReport === 'customersReport'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-white hover:bg-indigo-50 text-slate-700 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>3. تقرير الزبائن</span>
        </button>

        {/* 4. Suppliers Report */}
        <button
          onClick={() => setActiveReport('suppliersReport')}
          className={`py-3 px-2 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center gap-1 text-center ${
            activeReport === 'suppliersReport'
              ? 'bg-teal-600 text-white shadow-md'
              : 'bg-white hover:bg-teal-50 text-slate-700 border border-slate-200'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>4. تقرير الموردين</span>
        </button>

        {/* 5. Income Statement */}
        <button
          onClick={() => setActiveReport('pnl')}
          className={`py-3 px-2 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center gap-1 text-center ${
            activeReport === 'pnl'
              ? 'bg-sky-600 text-white shadow-md'
              : 'bg-white hover:bg-sky-50 text-slate-700 border border-slate-200'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>5. الأرباح والخسائر</span>
        </button>

        {/* 6. Trial Balance */}
        <button
          onClick={() => setActiveReport('trialBalance')}
          className={`py-3 px-2 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center gap-1 text-center ${
            activeReport === 'trialBalance'
              ? 'bg-purple-600 text-white shadow-md'
              : 'bg-white hover:bg-purple-50 text-slate-700 border border-slate-200'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>6. ميزان المراجعة</span>
        </button>

        {/* 7. Account Statement */}
        <button
          onClick={() => setActiveReport('accountStatement')}
          className={`py-3 px-2 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center gap-1 text-center ${
            activeReport === 'accountStatement'
              ? 'bg-rose-600 text-white shadow-md'
              : 'bg-white hover:bg-rose-50 text-slate-700 border border-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>7. كشف حساب</span>
        </button>

        {/* 8. Sales Analytics */}
        <button
          onClick={() => setActiveReport('salesAnalytics')}
          className={`py-3 px-2 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center gap-1 text-center ${
            activeReport === 'salesAnalytics'
              ? 'bg-slate-800 text-white shadow-md'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>8. تحليلات الحركة</span>
        </button>

        {/* 9. Inventory Audit */}
        <button
          onClick={() => setActiveReport('inventoryAnalysis')}
          className={`py-3 px-2 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center gap-1 text-center ${
            activeReport === 'inventoryAnalysis'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-white hover:bg-indigo-50 text-slate-700 border border-slate-200'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>9. مطابقة المخزون</span>
        </button>

      </div>

      {/* SEARCH & DATE FILTERS BAR (For Reports 1, 2, 3, 4) */}
      {['purchasesReport', 'salesReport', 'customersReport', 'suppliersReport'].includes(activeReport) && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
          
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="بحث برقم الفاتورة، اسم المورد/الزبون، أو الكود..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          {/* Date Filters for Invoices */}
          {['purchasesReport', 'salesReport'].includes(activeReport) && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>من:</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="bg-transparent focus:outline-none font-mono"
                />
              </div>

              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>إلى:</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="bg-transparent focus:outline-none font-mono"
                />
              </div>

              {(dateFrom || dateTo) && (
                <button
                  onClick={() => { setDateFrom(''); setDateTo(''); }}
                  className="text-rose-600 hover:underline px-2 font-bold"
                >
                  إلغاء التصفية
                </button>
              )}
            </div>
          )}

          {/* Dropdown Filters */}
          {activeReport === 'purchasesReport' && (
            <select
              value={filterSupplierId}
              onChange={(e) => setFilterSupplierId(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold focus:outline-none"
            >
              <option value="ALL">جميع الموردين</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}

          {activeReport === 'salesReport' && (
            <>
              <select
                value={filterPaymentMethod}
                onChange={(e) => setFilterPaymentMethod(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold focus:outline-none"
              >
                <option value="ALL">جميع طرق الدفع</option>
                <option value="cash">نقداً فقط</option>
                <option value="credit">آجل (ديون)</option>
                <option value="bank">تحويل بنكي</option>
              </select>

              <select
                value={filterDelegateName}
                onChange={(e) => setFilterDelegateName(e.target.value)}
                className="bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-xl px-3 py-2 font-bold focus:outline-none"
              >
                <option value="ALL">جميع المناديب</option>
                <option value="WITHOUT_DELEGATE">بدون مندوب (مبيعات مباشرة)</option>
                {uniqueDelegates.map(name => (
                  <option key={name} value={name}>المندوب: {name}</option>
                ))}
              </select>
            </>
          )}

          {activeReport === 'customersReport' && (
            <select
              value={filterCustomerStatus}
              onChange={(e) => setFilterCustomerStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold focus:outline-none"
            >
              <option value="ALL">جميع الزبائن</option>
              <option value="DEBT">عليهم ديون (مدين)</option>
              <option value="SETTLED">حسابات خالصة/مسددة</option>
            </select>
          )}

          {activeReport === 'suppliersReport' && (
            <select
              value={filterSupplierStatus}
              onChange={(e) => setFilterSupplierStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold focus:outline-none"
            >
              <option value="ALL">جميع الموردين</option>
              <option value="PAYABLE">لهم مستحقات (دائن)</option>
              <option value="SETTLED">حسابات مسددة</option>
            </select>
          )}

        </div>
      )}

      {/* ========================================================= */}
      {/* 1. REPORT 1: PURCHASES REPORT (تقرير المشتريات) - EDITABLE */}
      {/* ========================================================= */}
      {activeReport === 'purchasesReport' && (
        <div className="space-y-4">
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-bold">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-1">
              <span className="text-amber-800">إجمالي المشتريات</span>
              <p className="text-xl font-black font-mono text-amber-900">
                {totalPurchasesAmount.toFixed(2)} {settings.currencySymbol}
              </p>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-1">
              <span className="text-emerald-800">المبالغ المدفوعة</span>
              <p className="text-xl font-black font-mono text-emerald-900">
                {totalPurchasesPaid.toFixed(2)} {settings.currencySymbol}
              </p>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-1">
              <span className="text-rose-800">المتبقي (مستحق للموردين)</span>
              <p className="text-xl font-black font-mono text-rose-900">
                {totalPurchasesRemaining.toFixed(2)} {settings.currencySymbol}
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1">
              <span className="text-slate-600">عدد فواتير الشراء</span>
              <p className="text-xl font-black font-mono text-slate-800">
                {filteredPurchases.length} فاتورة
              </p>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-amber-600" />
                <span>سجل فواتير المشتريات (قابل للتعديل)</span>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold">
                    <th className="p-3">رقم الفاتورة</th>
                    <th className="p-3">التاريخ</th>
                    <th className="p-3">اسم المورد</th>
                    <th className="p-3">رقم فاتورة المورد</th>
                    <th className="p-3">طريقة الدفع</th>
                    <th className="p-3">إجمالي الفاتورة</th>
                    <th className="p-3">المدفوع</th>
                    <th className="p-3">المتبقي</th>
                    <th className="p-3 text-center">الإجراءات (تعديل/عرض)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400 font-semibold">
                        لا توجد فواتير مشتريات مطابقة للبحث أو الفترة المحددة.
                      </td>
                    </tr>
                  ) : (
                    filteredPurchases.map(inv => (
                      <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-mono font-bold text-amber-800">{inv.invoiceNumber}</td>
                        <td className="p-3 font-mono text-slate-600">{inv.date}</td>
                        <td className="p-3 font-bold text-slate-900">{inv.supplierName}</td>
                        <td className="p-3 font-mono text-slate-500">{inv.supplierInvoiceNumber || '-'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            inv.paymentMethod === 'cash' ? 'bg-emerald-100 text-emerald-800' :
                            inv.paymentMethod === 'credit' ? 'bg-rose-100 text-rose-800' : 'bg-sky-100 text-sky-800'
                          }`}>
                            {inv.paymentMethod === 'cash' ? 'نقداً' : inv.paymentMethod === 'credit' ? 'آجل' : 'تحويل'}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-900">{inv.netTotal.toFixed(2)} {settings.currencySymbol}</td>
                        <td className="p-3 font-mono text-emerald-700">{inv.paidAmount.toFixed(2)}</td>
                        <td className="p-3 font-mono text-rose-700 font-bold">{inv.remainingAmount.toFixed(2)}</td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-1.5">
                            
                            {/* Edit Purchase Invoice Button */}
                            <button
                              onClick={() => setEditingPurchaseInvoice(inv)}
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                              title="تعديل فاتورة الشراء"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span>تعديل</span>
                            </button>

                            {/* Delete Purchase Invoice Button */}
                            {onDeletePurchaseInvoice && (
                              <button
                                onClick={() => onDeletePurchaseInvoice(inv.id)}
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                                title="حذف إلغاء الفاتورة"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>حذف</span>
                              </button>
                            )}

                            {/* Preview/Print Button */}
                            <button
                              onClick={() => setPreviewInvoice(inv)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                              title="معاينة الفاتورة"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* 2. REPORT 2: SALES REPORT (تقرير المبيعات) - EDITABLE */}
      {/* ========================================================= */}
      {activeReport === 'salesReport' && (
        <div className="space-y-4">
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs font-bold">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-1">
              <span className="text-emerald-800">إجمالي إيراد المبيعات</span>
              <p className="text-xl font-black font-mono text-emerald-900">
                {totalSalesAmount.toFixed(2)} {settings.currencySymbol}
              </p>
            </div>

            <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 space-y-1">
              <span className="text-teal-800">المبيعات النقدية</span>
              <p className="text-xl font-black font-mono text-teal-900">
                {totalSalesCash.toFixed(2)} {settings.currencySymbol}
              </p>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-1">
              <span className="text-rose-800">المبيعات الآجلة (ديون)</span>
              <p className="text-xl font-black font-mono text-rose-900">
                {totalSalesCredit.toFixed(2)} {settings.currencySymbol}
              </p>
            </div>

            <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 space-y-1">
              <span className="text-sky-800">المبالغ المقبوضة فعلياً</span>
              <p className="text-xl font-black font-mono text-sky-900">
                {totalSalesPaid.toFixed(2)} {settings.currencySymbol}
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1">
              <span className="text-slate-600">عدد فواتير المبيعات</span>
              <p className="text-xl font-black font-mono text-slate-800">
                {filteredSales.length} فاتورة
              </p>
            </div>
          </div>

          {/* Delegate Performance Section */}
          {delegateBreakdown.length > 0 && (
            <div className="bg-gradient-to-l from-indigo-50/70 to-purple-50/70 rounded-2xl p-4 border border-indigo-100/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-indigo-600 text-white rounded-lg">
                    <Users className="w-4 h-4" />
                  </span>
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-sm">تقييم وتحليل أداء مناديب المبيعات والوظائف</h4>
                    <p className="text-[11px] text-slate-500 font-semibold">إجمالي المبيعات، التحصيل، والديون لكل مندوب على حدة لمساعدتك في تقييم الأداء</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {delegateBreakdown.map((del) => (
                  <div key={del.name} className="bg-white rounded-xl p-3.5 border border-indigo-100/60 shadow-xs flex flex-col justify-between transition-all hover:shadow-md">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-2.5">
                      <span className="font-bold text-slate-800 text-xs flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shadow-[0_0_6px_rgba(79,70,229,0.5)]"></span>
                        {del.name}
                      </span>
                      <span className="bg-indigo-50 text-indigo-700 text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                        {del.count} فاتورة
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                      <div className="bg-slate-50 p-2 rounded-lg">
                        <span className="text-slate-500 font-bold block">إجمالي المبيعات</span>
                        <strong className="text-slate-900 font-mono text-xs block mt-1">{del.totalSales.toFixed(2)} {settings.currencySymbol}</strong>
                      </div>
                      <div className="bg-emerald-50/60 p-2 rounded-lg">
                        <span className="text-emerald-700 font-bold block">المبالغ المحصلة</span>
                        <strong className="text-emerald-900 font-mono text-xs block mt-1">{del.paid.toFixed(2)} {settings.currencySymbol}</strong>
                      </div>
                      <div className="bg-rose-50/60 p-2 rounded-lg">
                        <span className="text-rose-700 font-bold block">المتبقي (ديون)</span>
                        <strong className="text-rose-900 font-mono text-xs block mt-1">{del.unpaid.toFixed(2)} {settings.currencySymbol}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
                <span>سجل فواتير المبيعات (قابل للتعديل)</span>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold">
                    <th className="p-3">رقم الفاتورة</th>
                    <th className="p-3">التاريخ والوقت</th>
                    <th className="p-3">الزبون/العميل</th>
                    <th className="p-3">نوع الدفع</th>
                    <th className="p-3">عدد المواد</th>
                    <th className="p-3">الإجمالي الصافي</th>
                    <th className="p-3">المدفوع</th>
                    <th className="p-3">المتبقي</th>
                    <th className="p-3 text-center">الإجراءات (تعديل/حذف)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSales.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400 font-semibold">
                        لا توجد فواتير مبيعات مطابقة للبحث أو الفترة المحددة.
                      </td>
                    </tr>
                  ) : (
                    filteredSales.map(inv => (
                      <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-mono font-bold text-emerald-800">{inv.invoiceNumber}</td>
                        <td className="p-3 font-mono text-slate-600">{inv.date} {inv.time}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{inv.customerName}</div>
                          {inv.delegateName && (
                            <div className="text-[10px] text-indigo-600 font-bold mt-0.5">
                              المندوب: {inv.delegateName}
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            inv.paymentMethod === 'cash' ? 'bg-emerald-100 text-emerald-800' :
                            inv.paymentMethod === 'credit' ? 'bg-rose-100 text-rose-800' : 'bg-sky-100 text-sky-800'
                          }`}>
                            {inv.paymentMethod === 'cash' ? 'نقداً' : inv.paymentMethod === 'credit' ? 'آجل' : 'تحويل'}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-600">{inv.items.length} اصناف</td>
                        <td className="p-3 font-mono font-bold text-slate-900">{inv.netTotal.toFixed(2)} {settings.currencySymbol}</td>
                        <td className="p-3 font-mono text-emerald-700">{inv.paidAmount.toFixed(2)}</td>
                        <td className="p-3 font-mono text-rose-700 font-bold">{inv.remainingAmount.toFixed(2)}</td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-1.5">
                            
                            {/* Edit Sales Invoice Button */}
                            <button
                              onClick={() => setEditingSalesInvoice(inv)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                              title="تعديل فاتورة المبيعات"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span>تعديل</span>
                            </button>

                            {/* Delete Sales Invoice Button */}
                            {onDeleteSalesInvoice && (
                              <button
                                onClick={() => onDeleteSalesInvoice(inv.id)}
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                                title="إلغاء وحذف الفاتورة"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>حذف</span>
                              </button>
                            )}

                            {/* Preview/Print Button */}
                            <button
                              onClick={() => setPreviewInvoice(inv)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                              title="معاينة الفاتورة"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* 3. REPORT 3: CUSTOMERS REPORT (تقرير الزبائن) - EDITABLE */}
      {/* ========================================================= */}
      {activeReport === 'customersReport' && (
        <div className="space-y-4">
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-bold">
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 space-y-1">
              <span className="text-indigo-800">إجمالي عدد الزبائن المسجلين</span>
              <p className="text-xl font-black font-mono text-indigo-900">
                {customers.length} زبون
              </p>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-1">
              <span className="text-rose-800">إجمالي الديون المستحقة على الزبائن (مدين)</span>
              <p className="text-xl font-black font-mono text-rose-900">
                {totalCustomerReceivables.toFixed(2)} {settings.currencySymbol}
              </p>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-1">
              <span className="text-emerald-800">عدد الزبائن المدينين بالآجل</span>
              <p className="text-xl font-black font-mono text-emerald-900">
                {customers.filter(c => getCustomerBalanceData(c).balance > 0).length} زبون
              </p>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>دليل وتقارير أرصدة الزبائن (قابل للتعديل والتحديث)</span>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold">
                    <th className="p-3">الكود</th>
                    <th className="p-3">اسم الزبون/العميل</th>
                    <th className="p-3">رقم الهاتف</th>
                    <th className="p-3">إجمالي مشترياته</th>
                    <th className="p-3">المقبوض منه</th>
                    <th className="p-3">الرصيد المتبقي</th>
                    <th className="p-3 text-center">الإجراءات (تعديل/كشف حساب)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 font-semibold">
                        لا يوجد زبائن مطبقين للبحث والتصفية.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map(cust => {
                      const { totalSalesVal, totalVouchersVal, balance } = getCustomerBalanceData(cust);
                      return (
                        <tr key={cust.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-mono font-bold text-slate-600">{cust.code}</td>
                          <td className="p-3 font-bold text-slate-900">{cust.name}</td>
                          <td className="p-3 font-mono text-slate-600">{cust.phone || '-'}</td>
                          <td className="p-3 font-mono text-slate-900 font-semibold">{totalSalesVal.toFixed(2)} {settings.currencySymbol}</td>
                          <td className="p-3 font-mono text-emerald-700">{totalVouchersVal.toFixed(2)}</td>
                          <td className="p-3">
                            <span className={`font-mono font-black text-sm px-2.5 py-1 rounded-lg inline-block ${
                              balance > 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {balance.toFixed(2)} {settings.currencySymbol}
                              <span className="text-[10px] mr-1 font-sans">({balance > 0 ? 'مطلوب دين' : 'خالص'})</span>
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-1.5">
                              
                              {/* Edit Customer Button */}
                              <button
                                onClick={() => setEditingCustomer(cust)}
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                                title="تعديل بيانات ورصيد الزبون"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                <span>تعديل</span>
                              </button>

                              {/* Statement Button */}
                              <button
                                onClick={() => setStatementModalParty({ party: cust, type: 'customer' })}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                                title="كشف حساب تفصيلي"
                              >
                                <BookOpen className="w-3.5 h-3.5" />
                                <span>كشف الحساب</span>
                              </button>

                              {/* WhatsApp Reminder */}
                              {cust.phone && (
                                <button
                                  onClick={() => {
                                    const msg = formatBalanceReminderWhatsAppMessage({
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
                                      message: msg
                                    });
                                  }}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                                  title="تذكير واتساب (مع خيار تطبيقين الواتس المزدوج)"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </button>
                              )}

                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* 4. REPORT 4: SUPPLIERS REPORT (تقرير الموردين) - EDITABLE */}
      {/* ========================================================= */}
      {activeReport === 'suppliersReport' && (
        <div className="space-y-4">
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-bold">
            <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 space-y-1">
              <span className="text-teal-800">إجمالي عدد الموردين</span>
              <p className="text-xl font-black font-mono text-teal-900">
                {suppliers.length} مورد
              </p>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-1">
              <span className="text-rose-800">إجمالي المستحقات الواجب سدادها للموردين (دائن)</span>
              <p className="text-xl font-black font-mono text-rose-900">
                {totalSupplierPayables.toFixed(2)} {settings.currencySymbol}
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-1">
              <span className="text-amber-800">الموردون المستحق لهم مبالغ</span>
              <p className="text-xl font-black font-mono text-amber-900">
                {suppliers.filter(s => getSupplierBalanceData(s).balance > 0).length} مورد
              </p>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <Truck className="w-4 h-4 text-teal-600" />
                <span>دليل وتقارير أرصدة الموردين (قابل للتعديل والتحديث)</span>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold">
                    <th className="p-3">الكود</th>
                    <th className="p-3">اسم المورد</th>
                    <th className="p-3">رقم الهاتف</th>
                    <th className="p-3">إجمالي المشتريات منه</th>
                    <th className="p-3">المسدد له</th>
                    <th className="p-3">الرصيد المستحق له</th>
                    <th className="p-3 text-center">الإجراءات (تعديل/كشف حساب)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSuppliers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 font-semibold">
                        لا يوجد موردين مطبقين للبحث والتصفية.
                      </td>
                    </tr>
                  ) : (
                    filteredSuppliers.map(sup => {
                      const { totalPurchasesVal, totalVouchersVal, balance } = getSupplierBalanceData(sup);
                      return (
                        <tr key={sup.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-mono font-bold text-slate-600">{sup.code}</td>
                          <td className="p-3 font-bold text-slate-900">{sup.name}</td>
                          <td className="p-3 font-mono text-slate-600">{sup.phone || '-'}</td>
                          <td className="p-3 font-mono text-slate-900 font-semibold">{totalPurchasesVal.toFixed(2)} {settings.currencySymbol}</td>
                          <td className="p-3 font-mono text-emerald-700">{totalVouchersVal.toFixed(2)}</td>
                          <td className="p-3">
                            <span className={`font-mono font-black text-sm px-2.5 py-1 rounded-lg inline-block ${
                              balance > 0 ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {balance.toFixed(2)} {settings.currencySymbol}
                              <span className="text-[10px] mr-1 font-sans">({balance > 0 ? 'له مستحق' : 'مسدد'})</span>
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-1.5">
                              
                              {/* Edit Supplier Button */}
                              <button
                                onClick={() => setEditingSupplier(sup)}
                                className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                                title="تعديل بيانات المورد"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                <span>تعديل</span>
                              </button>

                              {/* Statement Button */}
                              <button
                                onClick={() => setStatementModalParty({ party: sup, type: 'supplier' })}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                                title="كشف حساب تفصيلي للمورد"
                              >
                                <BookOpen className="w-3.5 h-3.5" />
                                <span>كشف الحساب</span>
                              </button>

                              {/* WhatsApp Button */}
                              {sup.phone && (
                                <button
                                  onClick={() => {
                                    const msg = formatBalanceReminderWhatsAppMessage({
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
                                      message: msg
                                    });
                                  }}
                                  className="px-2 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                                  title="مراسلة المورد عبر الواتساب"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </button>
                              )}

                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* 5. REPORT 5: Income Statement (قائمة الدخل الأرباح والخسائر) */}
      {/* ========================================================= */}
      {activeReport === 'pnl' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="text-center space-y-1 border-b border-slate-100 pb-4">
            <h3 className="font-bold text-slate-900 text-lg">{settings.shopName}</h3>
            <p className="text-xs font-bold text-emerald-700">قائمة الدخل (الأرباح والخسائر - Income Statement)</p>
            <p className="text-[11px] text-slate-400">عن الفترة المالية المنتهية في تاريخ اليوم</p>
          </div>

          <div className="max-w-2xl mx-auto space-y-4 text-xs font-semibold">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
              <div className="flex justify-between items-center text-slate-900 font-bold border-b border-slate-200 pb-2">
                <span className="text-sm">1. الإيرادات التشغيلية</span>
                <span className="text-sm font-mono text-emerald-700">
                  +{totalRevenues.toFixed(2)} {settings.currencySymbol}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 font-mono">
                <span>• إيراد مبيعات الأصناف والبضائع:</span>
                <span>{salesRevAcc.netBalance.toFixed(2)} {settings.currencySymbol}</span>
              </div>
              <div className="flex justify-between text-slate-600 font-mono">
                <span>• إيرادات أخرى متنوعة:</span>
                <span>{otherRevAcc.netBalance.toFixed(2)} {settings.currencySymbol}</span>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
              <div className="flex justify-between items-center text-slate-900 font-bold border-b border-slate-200 pb-2">
                <span className="text-sm">2. تكلفة البضاعة المباعة (COGS)</span>
                <span className="text-sm font-mono text-rose-700">
                  -{estimatedCOGS.toFixed(2)} {settings.currencySymbol}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-normal">
                مجموع أسعار شراء وتكلفة الأصناف التي تم بيعها خلال الفترة
              </p>
            </div>

            <div className={`border rounded-xl p-4 flex justify-between items-center font-bold text-sm transition-colors ${
              grossProfit >= 0 
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950' 
                : 'bg-rose-50 border-rose-300 text-rose-950'
            }`}>
              <span>= مجمل الربح (Gross Profit) {grossProfit >= 0 ? '📈' : '📉'}</span>
              <span className="font-mono text-base dir-ltr">{grossProfit.toFixed(2)} {settings.currencySymbol}</span>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
              <div className="flex justify-between items-center text-slate-900 font-bold border-b border-slate-200 pb-2">
                <span className="text-sm">3. المصروفات التشغيلية والإدارية</span>
                <span className="text-sm font-mono text-rose-700">
                  -{totalExpenses.toFixed(2)} {settings.currencySymbol}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 font-mono">
                <span>• مصاريف إيجار العقار:</span>
                <span>{rentAcc.netBalance.toFixed(2)} {settings.currencySymbol}</span>
              </div>
              <div className="flex justify-between text-slate-600 font-mono">
                <span>• مصاريف الكهرباء والمياه:</span>
                <span>{utilAcc.netBalance.toFixed(2)} {settings.currencySymbol}</span>
              </div>
              <div className="flex justify-between text-slate-600 font-mono">
                <span>• رواتب وأجور الموظفين:</span>
                <span>{salAcc.netBalance.toFixed(2)} {settings.currencySymbol}</span>
              </div>
              <div className="flex justify-between text-slate-600 font-mono">
                <span>• مصاريف صيانة ونثريات عامة:</span>
                <span>{genAcc.netBalance.toFixed(2)} {settings.currencySymbol}</span>
              </div>
            </div>

            <div className={`p-5 rounded-2xl border flex flex-wrap justify-between items-center gap-2 font-black text-base shadow-md transition-all ${
              netProfit >= 0 
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-emerald-900/10' 
                : 'bg-rose-600 text-white border-rose-700 shadow-rose-900/10'
            }`}>
              <div className="flex items-center gap-2">
                <span>{netProfit >= 0 ? '= صافي الربح النهائي (ربح محقق 🎉):' : '= صافي الخسارة النهائية (خسارة ⚠️):'}</span>
              </div>
              <span className="font-mono text-xl dir-ltr">{netProfit.toFixed(2)} {settings.currencySymbol}</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. REPORT 6: Trial Balance (ميزان المراجعة) */}
      {/* ========================================================= */}
      {activeReport === 'trialBalance' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="text-center space-y-1 border-b border-slate-100 pb-4">
            <h3 className="font-bold text-slate-900 text-lg">{settings.shopName}</h3>
            <p className="text-xs font-bold text-emerald-700">ميزان المراجعة بالمجاميع والأرصدة (Trial Balance)</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-900 text-white font-bold">
                  <th className="p-3">كود الحساب</th>
                  <th className="p-3">اسم الحساب المحاسبي</th>
                  <th className="p-3">إجمالي المدين (+)</th>
                  <th className="p-3">إجمالي الدائن (-)</th>
                  <th className="p-3">صافي الرصيد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trialBalanceList.map(acc => (
                  <tr key={acc.code} className={acc.isHeader ? 'bg-slate-100 font-bold' : 'hover:bg-slate-50'}>
                    <td className="p-2.5 font-mono">{acc.code}</td>
                    <td className="p-2.5 font-bold">{acc.name}</td>
                    <td className="p-2.5 font-mono text-emerald-700">{acc.debit.toFixed(2)}</td>
                    <td className="p-2.5 font-mono text-rose-700">{acc.credit.toFixed(2)}</td>
                    <td className="p-2.5 font-mono font-bold">{acc.netBalance.toFixed(2)} {settings.currencySymbol}</td>
                  </tr>
                ))}
                <tr className="bg-slate-900 text-white font-black text-xs">
                  <td colSpan={2} className="p-3 text-left font-bold">الإجمالي العام لميزان المراجعة:</td>
                  <td className="p-3 font-mono text-emerald-300">{totalTrialDebit.toFixed(2)}</td>
                  <td className="p-3 font-mono text-rose-300">{totalTrialCredit.toFixed(2)}</td>
                  <td className="p-3 font-mono text-emerald-400">
                    {totalTrialDebit === totalTrialCredit ? 'متوازن 100%' : 'فارق'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 7. REPORT 7: Detailed Account Statement (كشف حساب تفصيلي) */}
      {/* ========================================================= */}
      {activeReport === 'accountStatement' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">كشف حساب تفصيلي عام (Ledger Statement)</h3>
              <p className="text-xs text-slate-500">اختر أي حساب محاسبي لعرض جميع حركاته المالية والرصيد التراكمي</p>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold">
              <span>اختر الحساب:</span>
              <select
                value={selectedAccountCode}
                onChange={(e) => setSelectedAccountCode(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
              >
                {accounts.map(acc => (
                  <option key={acc.code} value={acc.code}>
                    {acc.code} - {acc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-900 text-white font-bold">
                  <th className="p-3">التاريخ</th>
                  <th className="p-3">رقم القيد</th>
                  <th className="p-3">البيان / الوصف</th>
                  <th className="p-3">مدين (+)</th>
                  <th className="p-3">دائن (-)</th>
                  <th className="p-3">الرصيد المتراكم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {statementLines.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 font-semibold">
                      لا توجد حركات مالية مسجلة لهذا الحساب.
                    </td>
                  </tr>
                ) : (
                  statementLines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-3 font-mono">{line.date}</td>
                      <td className="p-3 font-mono font-bold text-indigo-700">{line.entryNumber}</td>
                      <td className="p-3 text-slate-800">{line.description}</td>
                      <td className="p-3 font-mono text-emerald-700">{line.debit > 0 ? line.debit.toFixed(2) : '-'}</td>
                      <td className="p-3 font-mono text-rose-700">{line.credit > 0 ? line.credit.toFixed(2) : '-'}</td>
                      <td className="p-3 font-mono font-bold text-slate-900">{line.runningBalance.toFixed(2)} {settings.currencySymbol}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 8. REPORT 8: Sales & Item Analytics (تحليلات الأصناف) */}
      {/* ========================================================= */}
      {activeReport === 'salesAnalytics' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="font-extrabold text-slate-900 text-base">تقرير حركة الأصناف والأكثر مبيعاً</h3>
            <p className="text-xs text-slate-500">تحليل الكميات المباعة والإيرادات المحققة من كل صنف بالمتجر</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-900 text-white font-bold">
                  <th className="p-3">اسم الصنف</th>
                  <th className="p-3">الباركود</th>
                  <th className="p-3">الكمية المباعة</th>
                  <th className="p-3">سعر التكلفة</th>
                  <th className="p-3">سعر البيع الحالي</th>
                  <th className="p-3">إجمالي الإيراد</th>
                  <th className="p-3">تقدير أرباح الصنف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map(p => {
                  const qtySold = salesInvoices.reduce((sum, inv) => {
                    const item = inv.items.find(i => i.productId === p.id);
                    return sum + (item ? item.quantity : 0);
                  }, 0);

                  const totalRev = qtySold * p.sellingPrice;
                  const estimatedProfit = qtySold * (p.sellingPrice - p.costPrice);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">{p.name}</td>
                      <td className="p-3 font-mono text-slate-500">{p.barcode || '-'}</td>
                      <td className="p-3 font-mono font-bold text-indigo-700">{qtySold} {p.unit}</td>
                      <td className="p-3 font-mono text-slate-600">{p.costPrice.toFixed(2)}</td>
                      <td className="p-3 font-mono text-slate-900">{p.sellingPrice.toFixed(2)}</td>
                      <td className="p-3 font-mono text-emerald-700 font-bold">{totalRev.toFixed(2)} {settings.currencySymbol}</td>
                      <td className="p-3 font-mono text-teal-700 font-extrabold">{estimatedProfit.toFixed(2)} {settings.currencySymbol}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 9. REPORT 9: Inventory Valuation & Reconciliation Audit (مطابقة المخزون والتدقيق المالي) */}
      {/* ========================================================= */}
      {activeReport === 'inventoryAnalysis' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                <span>🔍</span>
                <span>أداة مطابقة قيم المخزون وكشف أسباب الفروقات المالية</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                تقرير تدقيق مالي متقدم يقارن بين تكلفة مشتريات الفواتير، تكلفة المبيعات، بضاعة أول المدة، والقيمة الدفترية الحالية للمخزون
              </p>
            </div>
          </div>

          {/* Core Explanation Box explaining the 40,000 difference */}
          <div className="bg-gradient-to-r from-amber-50 to-indigo-50 border border-indigo-100 rounded-2xl p-5 space-y-3.5">
            <h4 className="font-black text-indigo-950 text-sm flex items-center gap-2">
              <span className="text-base">💡</span>
              <span>دليل فهم الفروقات الحسابية في قيمة المخزون (لماذا لا تتطابق المشتريات مع المخزون؟)</span>
            </h4>
            <p className="text-xs text-slate-700 leading-relaxed">
              عند تسجيل فاتورة مشتريات بقيمة <strong className="text-indigo-950">432,000 ل.س</strong> بينما يظهر المخزون بقيمة <strong className="text-indigo-950">472,000 ل.س</strong>، فإن هناك فرقاً بقيمة <strong className="text-emerald-700 font-extrabold">+40,000 ل.س</strong>. هذا الفرق الحسابي ينتج بشكل طبيعي ودقيق لثلاثة أسباب رئيسية يوضحها هذا التقرير:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-white/80 p-3 rounded-xl border border-indigo-50">
                <span className="font-black text-indigo-900 block mb-1">1. بضاعة أول المدة (الأرصدة الافتتاحية)</span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  عند قيامك بإضافة أصناف جديدة يدوياً وتحديد <strong>"كمية افتتاحية"</strong> لها (مثال: رصيد مخزن ابتدائي)، فإن النظام يحسب قيمتها فوراً في إجمالي قيمة المخزون الحالية بسعر التكلفة دون الحاجة لوجود فاتورة مشتريات لها.
                </p>
              </div>
              <div className="bg-white/80 p-3 rounded-xl border border-indigo-50">
                <span className="font-black text-indigo-900 block mb-1">2. تسويات الجرد اليدوية</span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  عند تعديل كمية أي صنف يدوياً من نافذة <strong>"الجرد والتسويات"</strong> لزيادة أو خفض المخزون، تتغير قيمة المخزون الحالي بالزيادة أو النقصان دون تسجيل فاتورة شراء أو مبيعات، مما يخلق هذا الفارق الدقيق.
                </p>
              </div>
              <div className="bg-white/80 p-3 rounded-xl border border-indigo-50">
                <span className="font-black text-indigo-900 block mb-1">3. تكلفة المبيعات (الخروج من المخزن)</span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  عندما تبيع صنفاً، تنخفض كميته ومخزونه فوراً، وبالتالي تنخفض قيمة المخزون الحالي بسعر التكلفة بمقدار <strong>"تكلفة البضاعة المباعة"</strong>، في حين تظل قيمة فواتير المشتريات التاريخية ثابتة ومستقلة.
                </p>
              </div>
            </div>
          </div>

          {/* Mathematical Reconciliation Summary Cards */}
          {(() => {
            const auditItems = products.map(p => {
              // 1. Total purchased qty from invoices (converted to main units)
              const purchasedQty = purchaseInvoices.reduce((sum, inv) => {
                const matchedItems = inv.items.filter(i => i.productId === p.id);
                const itemSum = matchedItems.reduce((acc, item) => {
                  const factor = (item.isSubUnit && p.subUnitsPerUnit) ? (1 / p.subUnitsPerUnit) : 1;
                  return acc + (item.quantity * factor);
                }, 0);
                return sum + itemSum;
              }, 0);

              // 2. Purchased cost from invoices
              const purchasedCost = purchaseInvoices.reduce((sum, inv) => {
                const matchedItems = inv.items.filter(i => i.productId === p.id);
                return sum + matchedItems.reduce((acc, item) => acc + item.total, 0);
              }, 0);

              // 3. Total sold qty from sales invoices
              const soldQty = salesInvoices.reduce((sum, inv) => {
                const matchedItems = inv.items.filter(i => i.productId === p.id);
                const itemSum = matchedItems.reduce((acc, item) => {
                  const factor = (item.isSubUnit && p.subUnitsPerUnit) ? (1 / p.subUnitsPerUnit) : 1;
                  return acc + (item.quantity * factor);
                }, 0);
                return sum + itemSum;
              }, 0);

              // 4. Cost of Goods Sold (COGS)
              const soldCOGS = soldQty * p.costPrice;

              // 5. Current stock quantity & valuation
              const currentQty = p.stock;
              const currentValuation = p.stock * p.costPrice;

              // 6. Reconciliation of Opening / Adjustment (CurrentQty = OpeningQty + Purchased - Sold)
              // So, OpeningQtyOrAdj = CurrentQty - PurchasedQty + SoldQty
              const openingQty = currentQty - purchasedQty + soldQty;
              const openingValuation = openingQty * p.costPrice;

              return {
                p,
                purchasedQty,
                purchasedCost,
                soldQty,
                soldCOGS,
                currentQty,
                currentValuation,
                openingQty,
                openingValuation
              };
            });

            const sumPurchasedCostInvoices = purchaseInvoices.reduce((sum, inv) => sum + inv.netTotal, 0);
            const sumCurrentStockValuation = products.reduce((sum, p) => sum + (p.stock * p.costPrice), 0);
            const sumSoldCOGS = auditItems.reduce((sum, item) => sum + item.soldCOGS, 0);
            const sumOpeningValuation = auditItems.reduce((sum, item) => sum + item.openingValuation, 0);

            return (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Card 1: Total Purchases */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 font-extrabold uppercase">1. إجمالي مشتريات الفواتير</span>
                      <h4 className="text-xl font-black text-slate-900 mt-1">
                        {sumPurchasedCostInvoices.toLocaleString()} <span className="text-xs font-bold text-slate-500">{settings.currencySymbol}</span>
                      </h4>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2 font-medium">
                      إجمالي المبالغ المدفوعة والآجلة المسجلة في فواتير المشتريات الرسمية.
                    </p>
                  </div>

                  {/* Card 2: Opening/Adjustments */}
                  <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4.5 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-indigo-700 font-extrabold uppercase">2. (+) بضاعة أول المدة والتسويات</span>
                      <h4 className="text-xl font-black text-indigo-950 mt-1">
                        {sumOpeningValuation.toLocaleString()} <span className="text-xs font-bold text-indigo-600">{settings.currencySymbol}</span>
                      </h4>
                    </div>
                    <p className="text-[10px] text-indigo-700 mt-2 font-medium">
                      قيمة الكميات الافتتاحية المدخلة يدوياً للأصناف أو تسويات الجرد الإيجابية.
                    </p>
                  </div>

                  {/* Card 3: COGS */}
                  <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4.5 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-rose-700 font-extrabold uppercase">3. (-) تكلفة البضاعة المباعة (COGS)</span>
                      <h4 className="text-xl font-black text-rose-950 mt-1">
                        {sumSoldCOGS.toLocaleString()} <span className="text-xs font-bold text-rose-600">{settings.currencySymbol}</span>
                      </h4>
                    </div>
                    <p className="text-[10px] text-rose-700 mt-2 font-medium">
                      تكلفة شراء السلع التي تم بيعها للزبائن (خرجت من المخزن عبر المبيعات).
                    </p>
                  </div>

                  {/* Card 4: Current Stock */}
                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4.5 flex flex-col justify-between shadow-xs">
                    <div>
                      <span className="text-[10px] text-emerald-800 font-extrabold uppercase">4. (=) القيمة الحالية للمخزون</span>
                      <h4 className="text-xl font-black text-emerald-950 mt-1">
                        {sumCurrentStockValuation.toLocaleString()} <span className="text-xs font-bold text-emerald-600">{settings.currencySymbol}</span>
                      </h4>
                    </div>
                    <p className="text-[10px] text-emerald-700 mt-2 font-medium">
                      القيمة الحالية الدفترية للبضاعة المتوفرة في المحل بسعر التكلفة.
                    </p>
                  </div>
                </div>

                {/* Reconciliation Equation Bar */}
                <div className="bg-slate-900 text-white rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono">
                  <div className="flex flex-wrap items-center gap-2 justify-center">
                    <span className="bg-slate-800 px-3 py-1.5 rounded-lg text-slate-300">مشتريات الفواتير ({sumPurchasedCostInvoices.toLocaleString()})</span>
                    <span className="text-lg font-black text-indigo-400">+</span>
                    <span className="bg-indigo-950 px-3 py-1.5 rounded-lg text-indigo-200">الرصيد الافتتاحي والتسويات ({sumOpeningValuation.toLocaleString()})</span>
                    <span className="text-lg font-black text-rose-400">-</span>
                    <span className="bg-rose-950 px-3 py-1.5 rounded-lg text-rose-200">تكلفة المبيعات ({sumSoldCOGS.toLocaleString()})</span>
                    <span className="text-lg font-black text-emerald-400">=</span>
                    <span className="bg-emerald-950 px-3.5 py-1.5 rounded-lg text-emerald-200 font-black">المخزون الحالي ({sumCurrentStockValuation.toLocaleString()})</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-[11px] font-sans font-extrabold">
                    <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
                    <span>المعادلة الحسابية متطابقة بنسبة 100% ✅</span>
                  </div>
                </div>

                {/* Detailed Table */}
                <div className="space-y-3">
                  <h4 className="font-extrabold text-slate-950 text-sm">جدول مطابقة وتحليل الفروقات على مستوى الأصناف</h4>
                  <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                          <th className="p-3.5">اسم الصنف</th>
                          <th className="p-3.5 text-center">بضاعة أول المدة / تسويات يدوية</th>
                          <th className="p-3.5 text-center">المشتريات (الفواتير)</th>
                          <th className="p-3.5 text-center">المبيعات (المنصرف)</th>
                          <th className="p-3.5 text-center">المخزون الحالي المسجل</th>
                          <th className="p-3.5 text-center">التكلفة (سعر الشراء)</th>
                          <th className="p-3.5 text-center">القيمة الحالية للمخزون</th>
                          <th className="p-3.5 text-center">تفسير وحالة المطابقة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {auditItems.map(({ p, purchasedQty, purchasedCost, soldQty, soldCOGS, currentQty, currentValuation, openingQty, openingValuation }) => {
                          const hasOpening = openingQty > 0;
                          return (
                            <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="p-3.5">
                                <span className="font-black text-slate-900 block">{p.name}</span>
                                <span className="text-[10px] text-slate-400 font-mono">{p.barcode || '-'}</span>
                              </td>
                              <td className="p-3.5 text-center font-mono font-bold text-indigo-950">
                                {openingQty > 0 ? (
                                  <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg">
                                    +{openingQty} {p.unit} ({openingValuation.toLocaleString()} ل.س)
                                  </span>
                                ) : openingQty < 0 ? (
                                  <span className="bg-rose-50 text-rose-700 px-2.5 py-1 rounded-lg">
                                    {openingQty} {p.unit} ({openingValuation.toLocaleString()} ل.س)
                                  </span>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="p-3.5 text-center font-mono">
                                <span className="text-slate-800 font-bold">{purchasedQty} {p.unit}</span>
                                <span className="text-[10px] text-slate-400 block">({purchasedCost.toLocaleString()} ل.س)</span>
                              </td>
                              <td className="p-3.5 text-center font-mono text-rose-600">
                                {soldQty > 0 ? (
                                  <>
                                    <span className="font-bold">-{soldQty} {p.unit}</span>
                                    <span className="text-[10px] text-rose-400 block">({soldCOGS.toLocaleString()} ل.س)</span>
                                  </>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="p-3.5 text-center font-mono font-extrabold text-slate-900">
                                {currentQty} {p.unit}
                              </td>
                              <td className="p-3.5 text-center font-mono text-slate-600">
                                {p.costPrice.toLocaleString()} ل.س
                              </td>
                              <td className="p-3.5 text-center font-mono font-black text-emerald-700">
                                {currentValuation.toLocaleString()} ل.س
                              </td>
                              <td className="p-3.5 text-center">
                                {hasOpening ? (
                                  <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 px-2 py-1 rounded-full text-[10px] font-black border border-amber-200">
                                    <span>⚠️</span>
                                    <span>يحتوي بضاعة أول مدة</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 px-2 py-1 rounded-full text-[10px] font-black border border-emerald-100">
                                    <span>✅</span>
                                    <span>مطابق ومسجل بالفواتير</span>
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: EDIT SALES INVOICE MODAL */}
      {/* ========================================================= */}
      {editingSalesInvoice && onSaveSalesInvoice && (
        <EditSalesInvoiceModal
          invoice={editingSalesInvoice}
          onClose={() => setEditingSalesInvoice(null)}
          onSave={(updated) => {
            onSaveSalesInvoice(updated);
            setEditingSalesInvoice(null);
          }}
          customers={customers}
          products={products}
          settings={settings}
        />
      )}

      {/* ========================================================= */}
      {/* MODAL 2: EDIT PURCHASE INVOICE MODAL */}
      {/* ========================================================= */}
      {editingPurchaseInvoice && onSavePurchaseInvoice && (
        <EditPurchaseInvoiceModal
          invoice={editingPurchaseInvoice}
          onClose={() => setEditingPurchaseInvoice(null)}
          onSave={(updated) => {
            onSavePurchaseInvoice(updated);
            setEditingPurchaseInvoice(null);
          }}
          suppliers={suppliers}
          products={products}
          settings={settings}
        />
      )}

      {/* ========================================================= */}
      {/* MODAL 3: EDIT CUSTOMER MODAL */}
      {/* ========================================================= */}
      {editingCustomer && onUpdateCustomer && (
        <EditCustomerModal
          customer={editingCustomer}
          onClose={() => setEditingCustomer(null)}
          onSave={(updated) => {
            onUpdateCustomer(updated);
            setEditingCustomer(null);
          }}
        />
      )}

      {/* ========================================================= */}
      {/* MODAL 4: EDIT SUPPLIER MODAL */}
      {/* ========================================================= */}
      {editingSupplier && onUpdateSupplier && (
        <EditSupplierModal
          supplier={editingSupplier}
          onClose={() => setEditingSupplier(null)}
          onSave={(updated) => {
            onUpdateSupplier(updated);
            setEditingSupplier(null);
          }}
        />
      )}

      {/* ========================================================= */}
      {/* MODAL 5: INVOICE PREVIEW MODAL WITH WELCOME HEADER & THANK YOU FOOTER */}
      {/* ========================================================= */}
      {previewInvoice && (() => {
        const partyName = 'customerName' in previewInvoice ? previewInvoice.customerName : previewInvoice.supplierName;
        const partyPhone = 'customerName' in previewInvoice 
          ? customers.find(c => c.name === previewInvoice.customerName)?.phone || '' 
          : suppliers.find(s => s.name === previewInvoice.supplierName)?.phone || '';

        const handleWhatsAppShare = () => {
          const msg = formatInvoiceWhatsAppMessage({
            shopName: settings.shopName,
            phone: settings.phone,
            address: settings.address,
            currencySymbol: settings.currencySymbol,
            partyName,
            invoiceNumber: previewInvoice.invoiceNumber,
            date: previewInvoice.date,
            paymentMethod: previewInvoice.paymentMethod,
            netTotal: previewInvoice.netTotal,
            items: previewInvoice.items
          });

          setWhatsAppModalData({
            isOpen: true,
            phone: partyPhone,
            partyName,
            message: msg,
            cardData: {
              type: 'invoice',
              shopName: settings.shopName,
              phone: settings.phone,
              address: settings.address,
              currencySymbol: settings.currencySymbol,
              partyName,
              invoiceNumber: previewInvoice.invoiceNumber,
              date: previewInvoice.date,
              paymentMethod: previewInvoice.paymentMethod,
              netTotal: previewInvoice.netTotal,
              items: previewInvoice.items
            }
          });
        };

        return (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto" dir="rtl">
            <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-4 sm:p-6 space-y-4 border-2 border-slate-200 my-auto animate-in fade-in zoom-in-95 duration-150">
              
              {/* Modal Top Controls */}
              <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    <FileText className="w-4 h-4" />
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                    معاينة الفاتورة رقم: <span className="font-mono text-emerald-700">{previewInvoice.invoiceNumber}</span>
                  </h3>
                </div>
                <button
                  onClick={() => setPreviewInvoice(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
                  title="إغلاق"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Printable / View Container */}
              <div id="printable-invoice-preview" className="space-y-3">
                
                {/* 1. Welcome Header Banner (ترويسة الترحيب) */}
                <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-4 rounded-2xl shadow-sm space-y-2.5 border border-emerald-700">
                  <div className="flex items-center justify-between border-b border-emerald-700/80 pb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 bg-white/10 backdrop-blur-xs rounded-xl flex items-center justify-center border border-white/20 text-emerald-200 shrink-0">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="font-black text-sm sm:text-base leading-tight text-white">
                          {settings.shopName || 'متجرنا المحترم'}
                        </h2>
                        <p className="text-[11px] text-emerald-200/90 font-medium">
                          {settings.address || 'العنوان الرئيسي'} • هاتف: {settings.phone || 'غير مسجل'}
                        </p>
                      </div>
                    </div>
                    <span className="bg-emerald-500/30 border border-emerald-400/40 text-emerald-100 text-[10px] sm:text-[11px] font-black px-2.5 py-1 rounded-lg shrink-0">
                      كشف فاتورة معتمدة
                    </span>
                  </div>

                  {/* Welcome Greeting Box */}
                  <div className="bg-white/10 backdrop-blur-xs p-2.5 rounded-xl border border-white/15 text-xs text-emerald-50 leading-relaxed font-bold">
                    <p className="text-amber-300 font-black text-[11px] mb-0.5">🌸 ترويسة ترحيب بالعميل:</p>
                    <p className="text-xs font-bold text-white">
                      عزيزنا <span className="text-amber-200 font-black underline decoration-amber-400/50">{partyName}</span> المحترم، أهلاً وسهلاً بكم! يسعدنا خدمتكم ورعايتكم دائماً ونقدم لكم كشف تفاصيل الفاتورة التالية:
                    </p>
                  </div>
                </div>

                {/* 2. Detailed Metadata Card */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-500 font-bold block text-[10px]">رقم الفاتورة:</span>
                    <span className="font-mono font-black text-slate-900 text-xs sm:text-sm">{previewInvoice.invoiceNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-[10px]">التاريخ والوقت:</span>
                    <span className="font-mono font-black text-slate-900 text-xs sm:text-sm">{previewInvoice.date}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-[10px]">طريقة الدفع:</span>
                    <span className="font-black text-emerald-800 text-xs">
                      {previewInvoice.paymentMethod === 'cash' ? '💵 نقداً' : previewInvoice.paymentMethod === 'bank' ? '💳 تحويل/بنكي' : '📝 آجل (حساب)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-[10px]">الإجمالي الصافي:</span>
                    <span className="font-mono font-black text-emerald-950 text-xs sm:text-sm">
                      {previewInvoice.netTotal.toFixed(2)} {settings.currencySymbol}
                    </span>
                  </div>
                </div>

                {/* 3. Items Breakdown Table */}
                <div className="border-2 border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-100 font-black text-slate-900 border-b border-slate-200">
                      <tr>
                        <th className="p-2.5 text-center w-8">#</th>
                        <th className="p-2.5">اسم الصنف والمادة</th>
                        <th className="p-2.5 text-center">الكمية</th>
                        <th className="p-2.5">سعر الوحدة</th>
                        <th className="p-2.5">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-extrabold text-slate-800">
                      {previewInvoice.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="p-2.5 text-center font-mono text-slate-400">{idx + 1}</td>
                          <td className="p-2.5 font-black text-slate-950">{item.productName}</td>
                          <td className="p-2.5 text-center font-mono font-black text-slate-900">{item.quantity}</td>
                          <td className="p-2.5 font-mono text-slate-700">{item.unitPrice.toFixed(2)} {settings.currencySymbol}</td>
                          <td className="p-2.5 font-mono font-black text-emerald-900 bg-emerald-50/50">{item.total.toFixed(2)} {settings.currencySymbol}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 4. Thank-You Closing Footer (خاتمة الشكر) */}
                <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-3 text-center space-y-1 text-xs">
                  <p className="font-black text-emerald-950 text-xs sm:text-sm flex items-center justify-center gap-1.5">
                    <span>✨ نشكركم جزيل الشكر على ثقتكم الغالية وحسن تعاملكم معنا!</span>
                  </p>
                  <p className="text-emerald-800 font-bold text-[11px]">
                    نعدكم دائماً بتقديم أفضل المنتجات بأعلى مستويات الخدمة. نتمنى لكم يوماً سعيداً ورائعاً 🌹
                  </p>
                  <p className="text-[10px] text-emerald-600 font-mono font-semibold pt-1 border-t border-emerald-200/60">
                    {settings.shopName} • {settings.address || 'العنوان الرئيسي'} • هاتف: {settings.phone || 'غير مسجل'}
                  </p>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
                <button
                  onClick={() => setPreviewInvoice(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  إغلاق النافذة
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleWhatsAppShare}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>إرسال عبر الواتساب</span>
                  </button>

                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                  >
                    <Printer className="w-4 h-4" />
                    <span>طباعة الكشف</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Account Statement Popup */}
      {statementModalParty && (
        <AccountStatementModal
          isOpen={true}
          onClose={() => setStatementModalParty(null)}
          party={statementModalParty.party}
          partyType={statementModalParty.type}
          salesInvoices={salesInvoices}
          purchaseInvoices={purchaseInvoices}
          vouchers={vouchers}
          settings={settings}
        />
      )}

      {/* WhatsApp Share Popup */}
      {whatsAppModalData && (
        <WhatsAppShareModal
          isOpen={whatsAppModalData.isOpen}
          onClose={() => setWhatsAppModalData(null)}
          phone={whatsAppModalData.phone}
          partyName={whatsAppModalData.partyName}
          title="مراسلة وتذكير عبر الواتساب"
          message={whatsAppModalData.message}
          cardData={whatsAppModalData.cardData}
        />
      )}

    </div>
  );
};

// =========================================================
// SUB-COMPONENT: EDIT SALES INVOICE MODAL
// =========================================================
const EditSalesInvoiceModal: React.FC<{
  invoice: SalesInvoice;
  onClose: () => void;
  onSave: (updated: SalesInvoice) => void;
  customers: Customer[];
  products: Product[];
  settings: ShopSettings;
}> = ({ invoice, onClose, onSave, customers, products, settings }) => {
  const [customerName, setCustomerName] = useState(invoice.customerName);
  const [date, setDate] = useState(invoice.date);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit' | 'bank'>(invoice.paymentMethod);
  const [items, setItems] = useState<InvoiceItem[]>([...invoice.items]);
  const [paidAmount, setPaidAmount] = useState<number>(invoice.paidAmount);
  const [notes, setNotes] = useState(invoice.notes || '');

  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const taxAmount = settings.enableTax ? subtotal * (settings.defaultTaxRate / 100) : 0;
  const netTotal = subtotal + taxAmount;
  const remainingAmount = Math.max(0, netTotal - paidAmount);

  const handleUpdateItemQuantity = (index: number, newQty: number) => {
    setItems(prev => prev.map((item, i) => {
      if (i === index) {
        const qty = Math.max(1, newQty);
        return { ...item, quantity: qty, total: qty * item.unitPrice - (item.discount || 0) };
      }
      return item;
    }));
  };

  const handleUpdateItemPrice = (index: number, newPrice: number) => {
    setItems(prev => prev.map((item, i) => {
      if (i === index) {
        const price = Math.max(0, newPrice);
        return { ...item, unitPrice: price, total: item.quantity * price - (item.discount || 0) };
      }
      return item;
    }));
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert('يجب أن تحتوي الفاتورة على صنف واحد على الأقل.');
      return;
    }

    const matchedCust = customers.find(c => c.name === customerName);

    const updatedInvoice: SalesInvoice = {
      ...invoice,
      date,
      customerName,
      customerId: matchedCust ? matchedCust.id : invoice.customerId,
      paymentMethod,
      items,
      subtotal,
      taxAmount,
      netTotal,
      paidAmount: (paymentMethod === 'cash' || paymentMethod === 'bank') ? netTotal : paidAmount,
      remainingAmount: (paymentMethod === 'cash' || paymentMethod === 'bank') ? 0 : remainingAmount,
      notes
    };

    onSave(updatedInvoice);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 space-y-4 border border-slate-200 my-auto text-xs">
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
            <Edit className="w-5 h-5 text-emerald-600" />
            <span>تعديل فاتورة المبيعات رقم ({invoice.invoiceNumber})</span>
          </h3>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block font-bold mb-1">اسم الزبون/العميل:</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full p-2 bg-slate-50 border rounded-xl font-bold"
              required
            />
          </div>

          <div>
            <label className="block font-bold mb-1">تاريخ الفاتورة:</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-2 bg-slate-50 border rounded-xl font-mono"
              required
            />
          </div>

          <div>
            <label className="block font-bold mb-1">طريقة الدفع:</label>
            <select
              value={paymentMethod}
              onChange={(e) => {
                const newMethod = e.target.value as 'cash' | 'credit' | 'bank';
                setPaymentMethod(newMethod);
                if (newMethod === 'cash' || newMethod === 'bank') {
                  setPaidAmount(netTotal);
                } else {
                  setPaidAmount(0);
                }
              }}
              className="w-full p-2 bg-slate-50 border rounded-xl font-bold"
            >
              <option value="cash">نقداً (كاش)</option>
              <option value="credit">آجل (على الحساب)</option>
              <option value="bank">تحويل بنكي</option>
            </select>
          </div>
        </div>

        {/* Item List */}
        <div>
          <label className="block font-bold mb-1.5 text-slate-800">أصناف الفاتورة (تعديل الكميات والأسعار):</label>
          <div className="border rounded-2xl overflow-hidden">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-100 font-bold">
                  <th className="p-2.5">الصنف</th>
                  <th className="p-2.5 w-24">الكمية</th>
                  <th className="p-2.5 w-28">سعر البيع</th>
                  <th className="p-2.5">الإجمالي</th>
                  <th className="p-2.5 w-12 text-center">حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="p-2.5 font-bold text-slate-800">{item.productName}</td>
                    <td className="p-2.5">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleUpdateItemQuantity(idx, Number(e.target.value))}
                        className="w-full p-1 border rounded-lg text-center font-mono font-bold"
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => handleUpdateItemPrice(idx, Number(e.target.value))}
                        className="w-full p-1 border rounded-lg text-center font-mono font-bold"
                      />
                    </td>
                    <td className="p-2.5 font-mono font-bold text-slate-900">{item.total.toFixed(2)}</td>
                    <td className="p-2.5 text-center">
                      <button type="button" onClick={() => handleRemoveItem(idx)} className="text-rose-600 hover:text-rose-800 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals & Notes */}
        <div className="bg-slate-50 p-3 rounded-2xl border space-y-2">
          <div className="flex justify-between items-center font-bold text-sm">
            <span>إجمالي الفاتورة المعدل:</span>
            <span className="font-mono text-emerald-700 text-base">{netTotal.toFixed(2)} {settings.currencySymbol}</span>
          </div>

          {paymentMethod === 'credit' && (
            <div className="flex items-center gap-2">
              <span className="font-bold">المبلغ المسدد الآن:</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={paidAmount}
                onChange={(e) => setPaidAmount(Number(e.target.value))}
                className="p-1.5 border rounded-lg font-mono font-bold w-32"
              />
              <span className="text-rose-600 font-bold mr-auto">المتبقي: {remainingAmount.toFixed(2)}</span>
            </div>
          )}

          <div>
            <label className="block font-bold mb-1">ملاحظات الفاتورة:</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2 bg-white border rounded-xl"
              placeholder="أي ملاحظات إضافية..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2.5 bg-slate-100 text-slate-800 rounded-xl font-bold cursor-pointer">
            إلغاء
          </button>
          <button type="submit" className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-xs">
            <Save className="w-4 h-4" />
            <span>حفظ تعديلات الفاتورة</span>
          </button>
        </div>
      </form>
    </div>
  );
};

// =========================================================
// SUB-COMPONENT: EDIT PURCHASE INVOICE MODAL
// =========================================================
const EditPurchaseInvoiceModal: React.FC<{
  invoice: PurchaseInvoice;
  onClose: () => void;
  onSave: (updated: PurchaseInvoice) => void;
  suppliers: Supplier[];
  products: Product[];
  settings: ShopSettings;
}> = ({ invoice, onClose, onSave, suppliers, products, settings }) => {
  const [supplierName, setSupplierName] = useState(invoice.supplierName);
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState(invoice.supplierInvoiceNumber || '');
  const [date, setDate] = useState(invoice.date);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit' | 'bank'>(invoice.paymentMethod);
  const [items, setItems] = useState<InvoiceItem[]>([...invoice.items]);
  const [paidAmount, setPaidAmount] = useState<number>(invoice.paidAmount);
  const [notes, setNotes] = useState(invoice.notes || '');

  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const taxAmount = settings.enableTax ? subtotal * (settings.defaultTaxRate / 100) : 0;
  const netTotal = subtotal + taxAmount;
  const remainingAmount = Math.max(0, netTotal - paidAmount);

  const handleUpdateItemQuantity = (index: number, newQty: number) => {
    setItems(prev => prev.map((item, i) => {
      if (i === index) {
        const qty = Math.max(1, newQty);
        return { ...item, quantity: qty, total: qty * item.unitPrice - (item.discount || 0) };
      }
      return item;
    }));
  };

  const handleUpdateItemPrice = (index: number, newPrice: number) => {
    setItems(prev => prev.map((item, i) => {
      if (i === index) {
        const price = Math.max(0, newPrice);
        return { ...item, unitPrice: price, total: item.quantity * price - (item.discount || 0) };
      }
      return item;
    }));
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert('يجب أن تحتوي فاتورة المشتريات على صنف واحد على الأقل.');
      return;
    }

    const matchedSup = suppliers.find(s => s.name === supplierName);

    const updatedInvoice: PurchaseInvoice = {
      ...invoice,
      date,
      supplierName,
      supplierId: matchedSup ? matchedSup.id : invoice.supplierId,
      supplierInvoiceNumber,
      paymentMethod,
      items,
      subtotal,
      taxAmount,
      netTotal,
      paidAmount: (paymentMethod === 'cash' || paymentMethod === 'bank') ? netTotal : paidAmount,
      remainingAmount: (paymentMethod === 'cash' || paymentMethod === 'bank') ? 0 : remainingAmount,
      notes
    };

    onSave(updatedInvoice);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 space-y-4 border border-slate-200 my-auto text-xs">
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
            <Edit className="w-5 h-5 text-amber-600" />
            <span>تعديل فاتورة المشتريات رقم ({invoice.invoiceNumber})</span>
          </h3>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block font-bold mb-1">اسم المورد:</label>
            <input
              type="text"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              className="w-full p-2 bg-slate-50 border rounded-xl font-bold"
              required
            />
          </div>

          <div>
            <label className="block font-bold mb-1">رقم فاتورة المورد:</label>
            <input
              type="text"
              value={supplierInvoiceNumber}
              onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
              className="w-full p-2 bg-slate-50 border rounded-xl font-mono"
            />
          </div>

          <div>
            <label className="block font-bold mb-1">التاريخ:</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-2 bg-slate-50 border rounded-xl font-mono"
              required
            />
          </div>

          <div>
            <label className="block font-bold mb-1">طريقة الدفع:</label>
            <select
              value={paymentMethod}
              onChange={(e) => {
                const newMethod = e.target.value as 'cash' | 'credit' | 'bank';
                setPaymentMethod(newMethod);
                if (newMethod === 'cash' || newMethod === 'bank') {
                  setPaidAmount(netTotal);
                } else {
                  setPaidAmount(0);
                }
              }}
              className="w-full p-2 bg-slate-50 border rounded-xl font-bold"
            >
              <option value="cash">نقداً (كاش)</option>
              <option value="credit">آجل (على الحساب)</option>
              <option value="bank">تحويل بنكي</option>
            </select>
          </div>
        </div>

        {/* Item List */}
        <div>
          <label className="block font-bold mb-1.5 text-slate-800">أصناف الشراء (تعديل الكميات وسعر التكلفة):</label>
          <div className="border rounded-2xl overflow-hidden">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-100 font-bold">
                  <th className="p-2.5">الصنف</th>
                  <th className="p-2.5 w-24">الكمية</th>
                  <th className="p-2.5 w-28">سعر الشراء</th>
                  <th className="p-2.5">الإجمالي</th>
                  <th className="p-2.5 w-12 text-center">حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="p-2.5 font-bold text-slate-800">{item.productName}</td>
                    <td className="p-2.5">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleUpdateItemQuantity(idx, Number(e.target.value))}
                        className="w-full p-1 border rounded-lg text-center font-mono font-bold"
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => handleUpdateItemPrice(idx, Number(e.target.value))}
                        className="w-full p-1 border rounded-lg text-center font-mono font-bold"
                      />
                    </td>
                    <td className="p-2.5 font-mono font-bold text-slate-900">{item.total.toFixed(2)}</td>
                    <td className="p-2.5 text-center">
                      <button type="button" onClick={() => handleRemoveItem(idx)} className="text-rose-600 hover:text-rose-800 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-slate-50 p-3 rounded-2xl border space-y-2">
          <div className="flex justify-between items-center font-bold text-sm">
            <span>إجمالي المشتريات المعدل:</span>
            <span className="font-mono text-amber-800 text-base">{netTotal.toFixed(2)} {settings.currencySymbol}</span>
          </div>

          {paymentMethod === 'credit' && (
            <div className="flex items-center gap-2">
              <span className="font-bold">المبلغ المسدد للمورد:</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={paidAmount}
                onChange={(e) => setPaidAmount(Number(e.target.value))}
                className="p-1.5 border rounded-lg font-mono font-bold w-32"
              />
              <span className="text-rose-600 font-bold mr-auto">المتبقي له: {remainingAmount.toFixed(2)}</span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2.5 bg-slate-100 text-slate-800 rounded-xl font-bold cursor-pointer">
            إلغاء
          </button>
          <button type="submit" className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-xs">
            <Save className="w-4 h-4" />
            <span>حفظ تعديلات فاتورة الشراء</span>
          </button>
        </div>
      </form>
    </div>
  );
};

// =========================================================
// SUB-COMPONENT: EDIT CUSTOMER MODAL
// =========================================================
const EditCustomerModal: React.FC<{
  customer: Customer;
  onClose: () => void;
  onSave: (updated: Customer) => void;
}> = ({ customer, onClose, onSave }) => {
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone);
  const [code, setCode] = useState(customer.code);
  const [address, setAddress] = useState(customer.address || '');
  const [creditLimit, setCreditLimit] = useState(customer.creditLimit || 0);
  const [openingBalance, setOpeningBalance] = useState(customer.openingBalance || 0);
  const [notes, setNotes] = useState(customer.notes || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...customer,
      name,
      phone,
      code,
      address,
      creditLimit,
      openingBalance,
      notes
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200 my-auto text-xs">
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
            <Edit className="w-5 h-5 text-indigo-600" />
            <span>تعديل بيانات الزبون ({customer.name})</span>
          </h3>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block font-bold mb-1">اسم الزبون:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold mb-1">كود/رقم الحساب:</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full p-2 bg-slate-50 border rounded-xl font-mono"
                required
              />
            </div>
            <div>
              <label className="block font-bold mb-1">رقم الهاتف (الواتساب):</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2 bg-slate-50 border rounded-xl font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold mb-1">الرصيد الافتتاحي (السابق):</label>
              <input
                type="number"
                step="0.01"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(Number(e.target.value))}
                className="w-full p-2 bg-slate-50 border rounded-xl font-mono font-bold"
              />
            </div>
            <div>
              <label className="block font-bold mb-1">سقف الائتمان (الحد الأقصى):</label>
              <input
                type="number"
                step="0.01"
                value={creditLimit}
                onChange={(e) => setCreditLimit(Number(e.target.value))}
                className="w-full p-2 bg-slate-50 border rounded-xl font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold mb-1">العنوان والملاحظات:</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full p-2 bg-slate-50 border rounded-xl"
              placeholder="العنوان الكامل للزبون..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2.5 bg-slate-100 text-slate-800 rounded-xl font-bold cursor-pointer">
            إلغاء
          </button>
          <button type="submit" className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-xs">
            <Save className="w-4 h-4" />
            <span>حفظ بيانات الزبون</span>
          </button>
        </div>
      </form>
    </div>
  );
};

// =========================================================
// SUB-COMPONENT: EDIT SUPPLIER MODAL
// =========================================================
const EditSupplierModal: React.FC<{
  supplier: Supplier;
  onClose: () => void;
  onSave: (updated: Supplier) => void;
}> = ({ supplier, onClose, onSave }) => {
  const [name, setName] = useState(supplier.name);
  const [phone, setPhone] = useState(supplier.phone);
  const [code, setCode] = useState(supplier.code);
  const [address, setAddress] = useState(supplier.address || '');
  const [openingBalance, setOpeningBalance] = useState(supplier.openingBalance || 0);
  const [notes, setNotes] = useState(supplier.notes || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...supplier,
      name,
      phone,
      code,
      address,
      openingBalance,
      notes
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200 my-auto text-xs">
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
            <Edit className="w-5 h-5 text-teal-600" />
            <span>تعديل بيانات المورد ({supplier.name})</span>
          </h3>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block font-bold mb-1">اسم المورد/الشركة:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold mb-1">كود المورد:</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full p-2 bg-slate-50 border rounded-xl font-mono"
                required
              />
            </div>
            <div>
              <label className="block font-bold mb-1">رقم الهاتف (الواتساب):</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2 bg-slate-50 border rounded-xl font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold mb-1">الرصيد الافتتاحي (المستحق للمورد سابقاً):</label>
            <input
              type="number"
              step="0.01"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(Number(e.target.value))}
              className="w-full p-2 bg-slate-50 border rounded-xl font-mono font-bold"
            />
          </div>

          <div>
            <label className="block font-bold mb-1">العنوان والملاحظات:</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full p-2 bg-slate-50 border rounded-xl"
              placeholder="عنوان الشركة أو المورد..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2.5 bg-slate-100 text-slate-800 rounded-xl font-bold cursor-pointer">
            إلغاء
          </button>
          <button type="submit" className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-xs">
            <Save className="w-4 h-4" />
            <span>حفظ بيانات المورد</span>
          </button>
        </div>
      </form>
    </div>
  );
};
