import React from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Wallet, 
  Users, 
  Truck, 
  Package, 
  PlusCircle, 
  Receipt, 
  ArrowUpRight, 
  ArrowDownRight,
  AlertTriangle,
  ShoppingBag,
  ArrowRight
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { 
  ShopSettings, 
  Product, 
  SalesInvoice, 
  PurchaseInvoice, 
  Customer, 
  Supplier, 
  JournalEntry,
  AccountNode
} from '../types/accounting';
import { calculateAccountBalance, calculateCustomerBalance, calculateSupplierBalance } from '../utils/accountingEngine';

interface DashboardViewProps {
  settings: ShopSettings;
  products: Product[];
  salesInvoices: SalesInvoice[];
  purchaseInvoices: PurchaseInvoice[];
  customers: Customer[];
  suppliers: Supplier[];
  accounts: AccountNode[];
  journalEntries: JournalEntry[];
  onOpenPOS: () => void;
  onOpenPurchases: () => void;
  onOpenVouchers: () => void;
  onOpenProducts: () => void;
  onSelectInvoice: (inv: SalesInvoice) => void;
  onOpenCustomers?: () => void;
  onOpenSuppliers?: () => void;
  onOpenChartOfAccounts?: () => void;
  onOpenReports?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  settings,
  products,
  salesInvoices,
  purchaseInvoices,
  customers,
  suppliers,
  accounts,
  journalEntries,
  onOpenPOS,
  onOpenPurchases,
  onOpenVouchers,
  onOpenProducts,
  onSelectInvoice,
  onOpenCustomers,
  onOpenSuppliers,
  onOpenChartOfAccounts,
  onOpenReports
}) => {
  // Financial calculations
  const totalSalesAmount = salesInvoices.reduce((sum, inv) => sum + inv.netTotal, 0);
  const totalPurchasesAmount = purchaseInvoices.reduce((sum, inv) => sum + inv.netTotal, 0);

  // Cash in safe (Account 1010)
  const cashAcc = calculateAccountBalance('1010', accounts, journalEntries);
  // Bank (Account 1020)
  const bankAcc = calculateAccountBalance('1020', accounts, journalEntries);
  const totalLiquidCash = cashAcc.netBalance + bankAcc.netBalance;

  // Receivables (Customer debts)
  const totalReceivables = customers.reduce(
    (sum, c) => sum + calculateCustomerBalance(c, salesInvoices, []),
    0
  );

  // Payables (Supplier debts)
  const totalPayables = suppliers.reduce(
    (sum, s) => sum + calculateSupplierBalance(s, purchaseInvoices, []),
    0
  );

  // Inventory value at cost
  const totalStockCostValue = products.reduce((sum, p) => sum + (p.stock * p.costPrice), 0);
  const totalStockSalesValue = products.reduce((sum, p) => sum + (p.stock * p.sellingPrice), 0);

  // Approximate gross profit from sales (Revenue - COGS)
  const grossProfitEstimate = salesInvoices.reduce((sum, inv) => {
    // calculate cost for invoice items
    const invCost = inv.items.reduce((cSum, item) => {
      const prod = products.find(p => p.id === item.productId);
      const unitCost = prod ? prod.costPrice : item.unitPrice * 0.75;
      return cSum + (unitCost * item.quantity);
    }, 0);
    return sum + (inv.subtotal - inv.discountTotal - invCost);
  }, 0);

  // Low stock products
  const lowStockProducts = products.filter(p => p.stock <= p.minStockAlert);

  // Monthly sales chart data simulation
  const chartData = [
    { day: 'سبت', مبيعات: totalSalesAmount * 0.12, مشتريات: totalPurchasesAmount * 0.10 },
    { day: 'أحد', مبيعات: totalSalesAmount * 0.15, مشتريات: totalPurchasesAmount * 0.15 },
    { day: 'إثنين', مبيعات: totalSalesAmount * 0.18, مشتريات: totalPurchasesAmount * 0.08 },
    { day: 'ثلاثاء', مبيعات: totalSalesAmount * 0.14, مشتريات: totalPurchasesAmount * 0.25 },
    { day: 'أربعاء', مبيعات: totalSalesAmount * 0.16, مشتريات: totalPurchasesAmount * 0.12 },
    { day: 'خميس', مبيعات: totalSalesAmount * 0.22, مشتريات: totalPurchasesAmount * 0.20 },
    { day: 'جمعة', مبيعات: totalSalesAmount * 0.25, مشتريات: totalPurchasesAmount * 0.10 },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto text-right">
      
      {/* Top Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">أهلاً بك، معلمي</span>
          <h2 className="text-2xl font-bold text-indigo-950 mt-0.5">لوحة الإدارة الشاملة - {settings.shopName}</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white border border-gray-200 px-4 py-2 rounded-full flex items-center gap-2 shadow-xs">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="text-xs font-bold text-gray-700">النظام نشط وجاهز</span>
          </div>
          <button
            onClick={onOpenPOS}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-full shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>كاشير البيع المباشر</span>
          </button>
        </div>
      </div>

      {/* Bento Grid layout */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Bento Stat 1: Total Sales */}
        <div 
          onClick={onOpenPOS}
          className="col-span-1 bg-white border border-gray-100 rounded-[2rem] p-6 shadow-xs flex flex-col justify-between hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer group"
          title="الانتقال إلى كاشير البيع"
        >
          <div className="flex justify-between items-start">
            <div className="bg-emerald-100/80 p-3.5 rounded-2xl text-emerald-700 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
              +12% المبيعات
            </span>
          </div>
          <div className="mt-4">
            <p className="text-gray-500 text-xs font-bold">إجمالي المبيعات (اليوم)</p>
            <h3 className="text-2xl font-extrabold text-gray-900 mt-1 font-mono tracking-tight group-hover:text-emerald-600 transition-colors">
              {totalSalesAmount.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} {settings.currencySymbol}
            </h3>
          </div>
        </div>

        {/* Bento Stat 2: Total Purchases */}
        <div 
          onClick={onOpenPurchases}
          className="col-span-1 bg-white border border-gray-100 rounded-[2rem] p-6 shadow-xs flex flex-col justify-between hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer group"
          title="الانتقال إلى فاتورة الشراء"
        >
          <div className="flex justify-between items-start">
            <div className="bg-rose-100/80 p-3.5 rounded-2xl text-rose-700 group-hover:scale-110 transition-transform">
              <Receipt className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100">
              المشتريات
            </span>
          </div>
          <div className="mt-4">
            <p className="text-gray-500 text-xs font-bold">إجمالي المشتريات</p>
            <h3 className="text-2xl font-extrabold text-gray-900 mt-1 font-mono tracking-tight group-hover:text-rose-600 transition-colors">
              {totalPurchasesAmount.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} {settings.currencySymbol}
            </h3>
          </div>
        </div>

        {/* Bento Hero Card: Fixed Assets & Safe Balance */}
        <div 
          onClick={onOpenChartOfAccounts}
          className="col-span-1 md:col-span-2 bg-indigo-600 rounded-[2rem] p-6 text-white shadow-lg flex items-center justify-between gap-6 hover:shadow-xl hover:scale-[1.02] transition-all cursor-pointer group"
          title="الانتقال إلى شجرة الحسابات"
        >
          <div className="flex-1 space-y-2">
            <span className="text-indigo-200 text-xs font-bold uppercase tracking-wider">النقدية والأصول بالحسابات</span>
            <h3 className="text-3xl font-extrabold font-mono tracking-tight text-white">
              {totalLiquidCash.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} {settings.currencySymbol}
            </h3>
            <p className="text-xs text-indigo-100 mt-2">
              صندوق الصندوق الرئيسي: {cashAcc.netBalance.toFixed(0)} | الحساب البنكي: {bankAcc.netBalance.toFixed(0)} {settings.currencySymbol}
            </p>
          </div>
          <div className="w-20 h-20 border-4 border-indigo-400 border-t-transparent rounded-full flex items-center justify-center font-bold text-sm shrink-0 bg-indigo-700/50">
            92%
          </div>
        </div>

        {/* Bento Quick Entry Panel (2 cols) */}
        <div className="col-span-1 lg:col-span-2 bg-white border border-gray-100 rounded-[2rem] p-6 shadow-xs flex flex-col">
          <h3 className="font-bold text-lg text-indigo-950 mb-4 flex items-center gap-2">
            <span>📝</span>
            <span>لوحة الإدخال والعمليات السريعة</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
            <button
              onClick={onOpenPOS}
              className="p-4 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 rounded-2xl flex flex-col items-center justify-center gap-2 text-indigo-900 transition-all cursor-pointer group"
            >
              <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <span className="font-bold text-xs">فاتورة بيع (POS)</span>
            </button>

            <button
              onClick={onOpenPurchases}
              className="p-4 bg-sky-50 hover:bg-sky-100 border border-sky-200/80 rounded-2xl flex flex-col items-center justify-center gap-2 text-sky-900 transition-all cursor-pointer group"
            >
              <div className="w-12 h-12 bg-sky-600 text-white rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Receipt className="w-6 h-6" />
              </div>
              <span className="font-bold text-xs">فاتورة شراء جديدة</span>
            </button>

            <button
              onClick={onOpenVouchers}
              className="p-4 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 rounded-2xl flex flex-col items-center justify-center gap-2 text-amber-900 transition-all cursor-pointer group"
            >
              <div className="w-12 h-12 bg-amber-600 text-white rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <PlusCircle className="w-6 h-6" />
              </div>
              <span className="font-bold text-xs">سند قبض / صرف</span>
            </button>
          </div>

          <div className="mt-4 p-3 bg-gray-50 border border-gray-100 rounded-2xl flex justify-between items-center text-xs">
            <div 
              onClick={onOpenCustomers}
              className="flex items-center gap-1 hover:text-indigo-600 hover:scale-105 cursor-pointer transition-all"
              title="الانتقال إلى حسابات الزبائن والديون"
            >
              <span className="font-bold text-slate-700">ديون مستحقة للزبائن:</span>
              <span className="font-mono font-bold text-amber-700">{totalReceivables.toFixed(2)} {settings.currencySymbol}</span>
            </div>
            <div 
              onClick={onOpenSuppliers}
              className="flex items-center gap-1 hover:text-rose-600 hover:scale-105 cursor-pointer transition-all mr-4"
              title="الانتقال إلى حسابات الموردين والديون"
            >
              <span className="font-bold text-slate-700">ديون الموردين:</span>
              <span className="font-mono font-bold text-rose-700">{totalPayables.toFixed(2)} {settings.currencySymbol}</span>
            </div>
          </div>
        </div>

        {/* Bento Active Products Panel (1 col) */}
        <div 
          onClick={onOpenProducts}
          className="col-span-1 bg-white border border-gray-100 rounded-[2rem] p-6 shadow-xs flex flex-col justify-between hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer group"
          title="الانتقال إلى المخزون والأصناف"
        >
          <div>
            <h3 className="font-bold text-base text-indigo-950 mb-4 flex items-center gap-2">
              <span>📦</span>
              <span>الأصناف النشطة بالمخزن</span>
            </h3>

            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {products.slice(0, 4).map(prod => (
                <div key={prod.id} className="flex items-center gap-3 border-b border-gray-100 pb-2.5">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-700 shrink-0 font-bold text-xs">
                    📦
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-900 truncate">{prod.name}</p>
                    <p className={`text-[10px] ${prod.stock <= prod.minStockAlert ? 'text-rose-500 font-bold' : 'text-gray-400'}`}>
                      {prod.stock <= prod.minStockAlert ? `منخفض: ${prod.stock} ${prod.unit}` : `المخزون: ${prod.stock} ${prod.unit}`}
                    </p>
                  </div>
                  <span className="text-xs font-bold font-mono text-gray-900 shrink-0">
                    {prod.sellingPrice} {settings.currencySymbol}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenProducts();
            }}
            className="w-full mt-4 py-2.5 border border-dashed border-gray-300 hover:border-indigo-500 hover:text-indigo-600 text-gray-500 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            إضافة / إدارة أصناف المخزن +
          </button>
        </div>

        {/* Bento Chart of Accounts Preview Block (1 col) */}
        <div 
          onClick={onOpenChartOfAccounts}
          className="col-span-1 bg-indigo-950 rounded-[2rem] p-6 text-white shadow-sm flex flex-col justify-between hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer group"
          title="الانتقال إلى شجرة الحسابات الكاملة"
        >
          <div>
            <h3 className="font-bold text-base text-white mb-3 flex items-center gap-2">
              <span>🌳</span>
              <span>شجرة الحسابات</span>
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center gap-2 text-indigo-300">
                <span>📂</span>
                <span className="text-white font-bold">1. الأصول (Assets)</span>
              </div>
              <div className="mr-5 border-r border-indigo-800 pr-3 space-y-1.5 font-mono text-indigo-200">
                <div className="flex justify-between">
                  <span>- الصندوق الرئيسية</span>
                  <span className="font-bold text-emerald-400">{cashAcc.netBalance.toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>- مخزون البضائع</span>
                  <span className="font-bold text-sky-400">{totalStockCostValue.toFixed(0)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3 text-indigo-300">
                <span>📂</span>
                <span className="text-white font-bold">2. الالتزامات (Liabilities)</span>
              </div>
              <div className="mr-5 border-r border-indigo-800 pr-3 space-y-1.5 font-mono text-indigo-200">
                <div className="flex justify-between">
                  <span>- حسابات الموردين</span>
                  <span className="font-bold text-rose-400">{totalPayables.toFixed(0)}</span>
                </div>
              </div>
            </div>
          </div>

          <div 
            onClick={(e) => {
              e.stopPropagation();
              onOpenReports?.();
            }}
            className="mt-4 pt-3 border-t border-indigo-800/80 flex justify-between items-center text-xs font-bold hover:text-emerald-400 transition-colors"
            title="الانتقال إلى التقارير المالية والربحية"
          >
            <span className="text-indigo-300 group-hover:text-indigo-200 transition-colors">مجمل أرباح البيع</span>
            <span className="font-mono text-emerald-400 text-sm">+{grossProfitEstimate.toFixed(0)} {settings.currencySymbol}</span>
          </div>
        </div>

      </section>

      {/* Sales & Purchases Trend Chart Bento Container */}
      <div 
        onClick={onOpenReports}
        className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-xs space-y-4 hover:shadow-md hover:scale-[1.01] transition-all cursor-pointer group"
        title="الانتقال إلى التقارير والرسوم البيانية الكاملة"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-indigo-950 text-base">مقارنة حركة المبيعات والمشتريات الأسبوعية</h3>
            <p className="text-xs text-slate-500 mt-0.5">مخطط أداء المتجر التجاري المحدث</p>
          </div>
          <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-3 py-1 rounded-full border border-indigo-100">
            تحليل أسبوعي
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e1b4b', borderRadius: '16px', border: 'none', color: '#fff', fontSize: '12px' }}
                formatter={(val: any) => [`${Number(val).toFixed(2)} ${settings.currencySymbol}`, '']}
              />
              <Area type="monotone" dataKey="مبيعات" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
              <Area type="monotone" dataKey="مشتريات" stroke="#0284c7" strokeWidth={3} fillOpacity={1} fill="url(#colorPurchases)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Sales Invoices Bento Table */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xs p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-indigo-950 text-base">سجل أحدث فواتير المبيعات</h3>
            <p className="text-xs text-slate-500 mt-0.5">عرض المبيعات الأخيرة مع خيارات طباعة الإيصال الضريبي</p>
          </div>
          <button 
            onClick={onOpenPOS}
            className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3.5 py-1.5 rounded-full font-bold transition-colors cursor-pointer"
          >
            الانتقال للبيع
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-gray-200">
                <th className="p-3 font-bold">رقم الفاتورة</th>
                <th className="p-3 font-bold">التاريخ والوقت</th>
                <th className="p-3 font-bold">العميل</th>
                <th className="p-3 font-bold">الدفع</th>
                <th className="p-3 font-bold">الإجمالي</th>
                <th className="p-3 font-bold">المدفوع</th>
                <th className="p-3 font-bold">المتبقي</th>
                <th className="p-3 font-bold text-center">الإيصال</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {salesInvoices.slice(0, 5).map(inv => (
                <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3 font-bold text-indigo-950 font-mono">{inv.invoiceNumber}</td>
                  <td className="p-3 text-slate-500 font-mono">{inv.date} {inv.time}</td>
                  <td className="p-3 font-bold text-slate-800">{inv.customerName}</td>
                  <td className="p-3">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      inv.paymentMethod === 'cash' ? 'bg-emerald-100 text-emerald-800' :
                      inv.paymentMethod === 'bank' ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {inv.paymentMethod === 'cash' ? 'نقداً' : inv.paymentMethod === 'bank' ? 'بنكي/مدى' : 'آجل'}
                    </span>
                  </td>
                  <td className="p-3 font-bold text-indigo-950 font-mono">{inv.netTotal.toFixed(2)} {settings.currencySymbol}</td>
                  <td className="p-3 text-emerald-700 font-bold font-mono">{inv.paidAmount.toFixed(2)} {settings.currencySymbol}</td>
                  <td className="p-3 text-amber-700 font-bold font-mono">{inv.remainingAmount.toFixed(2)} {settings.currencySymbol}</td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => onSelectInvoice(inv)}
                      className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-full font-bold text-[11px] cursor-pointer transition-colors"
                    >
                      طباعة
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
