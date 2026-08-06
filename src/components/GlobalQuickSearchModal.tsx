import React from 'react';
import { Search, X, Package, Users, Truck, Receipt, ArrowLeft, DollarSign } from 'lucide-react';
import { Product, Customer, Supplier, SalesInvoice, PurchaseInvoice, ShopSettings } from '../types/accounting';
import { matchesSearch } from '../utils/searchUtils';

interface GlobalQuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  setQuery: (q: string) => void;
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  salesInvoices: SalesInvoice[];
  purchaseInvoices: PurchaseInvoice[];
  settings: ShopSettings;
  onSelectProduct?: (product: Product) => void;
  onSelectCustomer?: (customer: Customer) => void;
  onSelectSupplier?: (supplier: Supplier) => void;
  onSelectInvoice?: (invoice: SalesInvoice) => void;
}

export const GlobalQuickSearchModal: React.FC<GlobalQuickSearchModalProps> = ({
  isOpen,
  onClose,
  query,
  setQuery,
  products,
  customers,
  suppliers,
  salesInvoices,
  purchaseInvoices,
  settings,
  onSelectProduct,
  onSelectCustomer,
  onSelectSupplier,
  onSelectInvoice,
}) => {
  if (!isOpen) return null;

  const cleanQuery = query.trim();

  const matchedProducts = cleanQuery
    ? products.filter(
        p =>
          matchesSearch(p.name, cleanQuery) ||
          matchesSearch(p.barcode, cleanQuery) ||
          matchesSearch(p.category, cleanQuery)
      ).slice(0, 5)
    : [];

  const matchedCustomers = cleanQuery
    ? customers.filter(
        c =>
          matchesSearch(c.name, cleanQuery) ||
          matchesSearch(c.phone, cleanQuery) ||
          matchesSearch(c.code, cleanQuery)
      ).slice(0, 4)
    : [];

  const matchedSuppliers = cleanQuery
    ? suppliers.filter(
        s =>
          matchesSearch(s.name, cleanQuery) ||
          matchesSearch(s.phone, cleanQuery) ||
          matchesSearch(s.code, cleanQuery)
      ).slice(0, 4)
    : [];

  const matchedSales = cleanQuery
    ? salesInvoices.filter(
        i =>
          matchesSearch(i.invoiceNumber, cleanQuery) ||
          matchesSearch(i.customerName, cleanQuery)
      ).slice(0, 4)
    : [];

  const matchedPurchases = cleanQuery
    ? purchaseInvoices.filter(
        p =>
          matchesSearch(p.invoiceNumber, cleanQuery) ||
          matchesSearch(p.supplierName, cleanQuery) ||
          matchesSearch(p.supplierInvoiceNumber, cleanQuery)
      ).slice(0, 4)
    : [];

  const totalResults =
    matchedProducts.length +
    matchedCustomers.length +
    matchedSuppliers.length +
    matchedSales.length +
    matchedPurchases.length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-start justify-center pt-16 sm:pt-20 p-4 dir-rtl text-right">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Search Header Bar */}
        <div className="p-4 bg-slate-900 text-white flex items-center gap-3">
          <Search className="w-5 h-5 text-indigo-400 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="البحث الشامل: اكتب اسم صنف، باركود، اسم زبون، مورد، أو رقم فاتورة..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-transparent text-white text-sm font-bold focus:outline-none placeholder-slate-400"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-slate-400 hover:text-white text-xs px-2 py-1 bg-slate-800 rounded-lg shrink-0"
            >
              تصفية
            </button>
          )}
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white bg-slate-800 rounded-full shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {!cleanQuery ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <Search className="w-10 h-10 mx-auto text-slate-300" />
              <p className="font-bold text-sm text-slate-600">البحث السريع المباشر والنظام الشامل</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                اكتب أي كلمة أو باركود أو اسم عميل للوصول الفوري للمعلومة من أي مكان بالتطبيق
              </p>
            </div>
          ) : totalResults === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <p className="font-bold text-sm text-slate-700">لم يتم العثور على نتائج لـ "{query}"</p>
              <p className="text-xs text-slate-400">تأكد من كتابة الكلمة بشكل صحيح أو جرب البحث بكلمة أعم</p>
            </div>
          ) : (
            <>
              {/* Products Results */}
              {matchedProducts.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-indigo-900 border-b border-slate-100 pb-1.5">
                    <Package className="w-4 h-4 text-indigo-600" />
                    <span>الأصناف والمنتجات ({matchedProducts.length})</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {matchedProducts.map(p => (
                      <div
                        key={p.id}
                        onClick={() => {
                          if (onSelectProduct) onSelectProduct(p);
                          onClose();
                        }}
                        className="p-3 bg-slate-50 hover:bg-indigo-50/70 border border-slate-200 rounded-2xl flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <div>
                          <p className="font-extrabold text-slate-900 text-xs">{p.name}</p>
                          <p className="text-[11px] text-slate-500 font-mono">
                            باركود: {p.barcode} | القسم: {p.category}
                          </p>
                        </div>
                        <div className="text-left font-mono">
                          <p className="font-black text-indigo-900 text-xs">
                            {p.sellingPrice.toFixed(2)} {settings.currencySymbol}
                          </p>
                          <p className={`text-[10px] font-bold ${p.stock <= p.minStockAlert ? 'text-amber-600' : 'text-slate-500'}`}>
                            الكمية: {p.stock} {p.unit}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Customers Results */}
              {matchedCustomers.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-900 border-b border-slate-100 pb-1.5">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <span>العملاء والزبائن ({matchedCustomers.length})</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {matchedCustomers.map(c => (
                      <div
                        key={c.id}
                        onClick={() => {
                          if (onSelectCustomer) onSelectCustomer(c);
                          onClose();
                        }}
                        className="p-3 bg-slate-50 hover:bg-emerald-50/70 border border-slate-200 rounded-2xl flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <div>
                          <p className="font-extrabold text-slate-900 text-xs">{c.name}</p>
                          <p className="text-[11px] text-slate-500 font-mono">
                            كود: {c.code} | هاتف: {c.phone || 'غير مسجل'}
                          </p>
                        </div>
                        <div className="text-left font-mono">
                          <span className="text-[10px] text-slate-400 block">عرض كشف الحساب</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suppliers Results */}
              {matchedSuppliers.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-sky-900 border-b border-slate-100 pb-1.5">
                    <Truck className="w-4 h-4 text-sky-600" />
                    <span>الموردين والشركات ({matchedSuppliers.length})</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {matchedSuppliers.map(s => (
                      <div
                        key={s.id}
                        onClick={() => {
                          if (onSelectSupplier) onSelectSupplier(s);
                          onClose();
                        }}
                        className="p-3 bg-slate-50 hover:bg-sky-50/70 border border-slate-200 rounded-2xl flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <div>
                          <p className="font-extrabold text-slate-900 text-xs">{s.name}</p>
                          <p className="text-[11px] text-slate-500 font-mono">
                            كود: {s.code} | هاتف: {s.phone || 'غير مسجل'}
                          </p>
                        </div>
                        <div className="text-left font-mono">
                          <span className="text-[10px] text-slate-400 block">عرض حساب المورد والأصناف</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sales Invoices Results */}
              {matchedSales.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-amber-900 border-b border-slate-100 pb-1.5">
                    <Receipt className="w-4 h-4 text-amber-600" />
                    <span>فواتير المبيعات ({matchedSales.length})</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {matchedSales.map(i => (
                      <div
                        key={i.id}
                        onClick={() => {
                          if (onSelectInvoice) onSelectInvoice(i);
                          onClose();
                        }}
                        className="p-3 bg-slate-50 hover:bg-amber-50/70 border border-slate-200 rounded-2xl flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <div>
                          <p className="font-extrabold text-slate-900 text-xs">{i.invoiceNumber}</p>
                          <p className="text-[11px] text-slate-500">
                            العميل: {i.customerName} | تاريخ: {i.date}
                          </p>
                        </div>
                        <div className="text-left font-mono">
                          <p className="font-black text-slate-900 text-xs">
                            {i.netTotal.toFixed(2)} {settings.currencySymbol}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 text-center text-slate-500 text-xs font-bold">
          اضغط على أي عنصر للتحويل المباشر إليه
        </div>

      </div>
    </div>
  );
};
