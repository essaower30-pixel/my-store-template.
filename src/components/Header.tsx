import React, { useState, useEffect } from 'react';
import { 
  Store, 
  Search, 
  AlertTriangle, 
  Users, 
  Receipt, 
  Download, 
  Upload, 
  RefreshCw,
  Plus,
  BookOpen,
  Maximize,
  Minimize,
  Smartphone,
  WifiOff,
  Sparkles,
  ShieldCheck,
  Settings,
  Lock,
  Cloud,
  CloudCheck,
  CloudOff
} from 'lucide-react';
import { ShopSettings, Product, SalesInvoice, Customer, Supplier, PurchaseInvoice, User } from '../types/accounting';
import { GlobalQuickSearchModal } from './GlobalQuickSearchModal';

interface HeaderProps {
  settings: ShopSettings;
  products: Product[];
  salesInvoices: SalesInvoice[];
  customers: Customer[];
  suppliers?: Supplier[];
  purchaseInvoices?: PurchaseInvoice[];
  onOpenQuickSale: () => void;
  onOpenQuickPurchase: () => void;
  onOpenQuickVoucher: () => void;
  onOpenManual?: () => void;
  onOpenPWA?: () => void;
  onOpenAppIconCustomizer?: () => void;
  onOpenDataSync?: () => void;
  onResetData: () => void;
  onExportData: () => void;
  onImportData: (e: React.ChangeEvent<HTMLInputElement>) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  syncStatus?: 'idle' | 'syncing' | 'synced' | 'error';
  currentUser?: User | null;
  onOpenSwitchUser?: () => void;
  onNavigateToTab?: (tab: string) => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  products,
  salesInvoices = [],
  customers,
  suppliers = [],
  purchaseInvoices = [],
  onOpenQuickSale,
  onOpenQuickPurchase,
  onOpenQuickVoucher,
  onOpenManual,
  onOpenPWA,
  onOpenAppIconCustomizer,
  onOpenDataSync,
  onResetData,
  onExportData,
  onImportData,
  searchQuery,
  setSearchQuery,
  syncStatus,
  currentUser,
  onOpenSwitchUser,
  onNavigateToTab,
  onLogout
}) => {
  // Count low stock items
  const lowStockCount = products.filter(p => p.stock <= p.minStockAlert).length;
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showShopMenu, setShowShopMenu] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [storeLabel, setStoreLabel] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const storeId = urlParams.get('store');
      if (storeId) {
        const num = storeId.split('_')[1];
        setStoreLabel(num ? `الفرع #${num}` : 'فرع مستقل');
      } else {
        setStoreLabel('');
      }
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error('Fullscreen request failed', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
          setIsFullscreen(false);
        });
      }
    }
  };

  return (
    <header className="bg-white border-b border-gray-200/80 sticky top-0 z-30 shadow-xs">
      <div className="px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        
        {/* Shop Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setShowShopMenu(!showShopMenu)}
              className="w-10 h-10 rounded-2xl bg-indigo-950 hover:bg-indigo-900 flex items-center justify-center text-indigo-300 shadow-md cursor-pointer transition-all active:scale-95 focus:outline-none"
              title="إدارة المحل"
            >
              <Store className="w-5 h-5 text-indigo-300" />
            </button>
            {showShopMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowShopMenu(false)} 
                />
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1.5 animate-fade-in text-right">
                  <button
                    onClick={() => {
                      onNavigateToTab?.('users');
                      setShowShopMenu(false);
                    }}
                    className="w-full px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-bold cursor-pointer transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <span>إدارة المستخدمين</span>
                  </button>
                  <button
                    onClick={() => {
                      onNavigateToTab?.('settings');
                      setShowShopMenu(false);
                    }}
                    className="w-full px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-bold cursor-pointer transition-colors"
                  >
                    <Settings className="w-4 h-4 text-emerald-600" />
                    <span>إعدادات المحل</span>
                  </button>
                </div>
              </>
            )}
          </div>
          <div>
            <h1 className="font-bold text-indigo-950 text-base sm:text-lg leading-tight flex items-center gap-2">
              {settings.shopName}
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-100">
                {settings.activityType}
              </span>
              {storeLabel && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold border border-emerald-200">
                  {storeLabel}
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
              <span>هاتف: {settings.phone}</span>
              <span>•</span>
              <span className="font-mono">العملة: {settings.currencySymbol}</span>
            </p>
          </div>
        </div>

        {/* Search & Actions Bar */}
        <div className="flex items-center flex-wrap gap-2 sm:gap-3">
          {/* Quick Search - Bento Pill Search */}
          <div className="relative min-w-[200px] max-w-xs">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="البحث السريع الشامل..."
              value={searchQuery}
              onClick={() => setIsSearchModalOpen(true)}
              onFocus={() => setIsSearchModalOpen(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchModalOpen(true);
              }}
              className="w-full pr-10 pl-4 py-2 text-xs rounded-full border border-gray-200 bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs transition-all cursor-pointer"
            />
          </div>

          {/* User Manual Button */}
          {onOpenManual && (
            <button
              onClick={onOpenManual}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-3.5 py-2 rounded-full text-xs font-bold shadow-xs transition-colors cursor-pointer"
              title="عرض وطباعة دليل استخدام البرنامج"
            >
              <BookOpen className="w-4 h-4" />
              <span>دليل الاستخدام</span>
            </button>
          )}

          {/* Quick Action Buttons */}
          <button
            onClick={onOpenQuickSale}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-full text-xs font-bold shadow-xs transition-colors cursor-pointer"
            title="فاتورة بيع جديدة"
          >
            <Plus className="w-4 h-4" />
            <span>بيع جديد</span>
          </button>

          <button
            onClick={onOpenQuickPurchase}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-indigo-950 border border-gray-200 px-3.5 py-2 rounded-full text-xs font-bold shadow-xs transition-colors cursor-pointer"
            title="فاتورة شراء جديدة"
          >
            <Receipt className="w-4 h-4 text-indigo-600" />
            <span className="hidden sm:inline">فاتورة شراء</span>
          </button>

          <button
            onClick={onOpenQuickVoucher}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-indigo-950 border border-gray-200 px-3.5 py-2 rounded-full text-xs font-bold shadow-xs transition-colors cursor-pointer"
            title="سند قبض / صرف"
          >
            <Users className="w-4 h-4 text-amber-600" />
            <span className="hidden sm:inline">سند مالِي</span>
          </button>

          {/* Alerts Badge */}
          {lowStockCount > 0 && (
            <div className="flex items-center gap-2 bg-white border border-gray-200 px-3.5 py-2 rounded-full shadow-xs" title="أصناف قاربت على الانتهاء">
              <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse"></span>
              <span className="text-xs font-bold text-slate-700">التحذيرات ({lowStockCount})</span>
            </div>
          )}

          {/* Connection Status & Firebase Cloud Indicator */}
          {syncStatus && (
            <button 
              type="button"
              onClick={onOpenDataSync}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                syncStatus === 'synced' 
                  ? 'bg-sky-50 hover:bg-sky-100 border-sky-200 text-sky-900 shadow-xs' 
                  : syncStatus === 'syncing'
                  ? 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-900 animate-pulse shadow-xs'
                  : syncStatus === 'error'
                  ? 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-800 animate-pulse shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800 shadow-xs'
              }`}
              title="سحابة Google Firebase Firestore - انقر لفتح مركز المزامنة السحابية"
            >
              {syncStatus === 'synced' ? (
                <CloudCheck className="w-4 h-4 text-sky-600 shrink-0" />
              ) : syncStatus === 'syncing' ? (
                <Cloud className="w-4 h-4 text-amber-600 animate-bounce shrink-0" />
              ) : syncStatus === 'error' ? (
                <CloudOff className="w-4 h-4 text-rose-600 shrink-0" />
              ) : (
                <Cloud className="w-4 h-4 text-slate-500 shrink-0" />
              )}
              <span className={`w-2 h-2 rounded-full ${
                syncStatus === 'synced' 
                  ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse' 
                  : syncStatus === 'syncing'
                  ? 'bg-amber-500'
                  : syncStatus === 'error'
                  ? 'bg-rose-500'
                  : 'bg-slate-400'
              }`}></span>
              <span>
                {syncStatus === 'synced' && 'سحابة Firebase: متصل ومزامن ✓'}
                {syncStatus === 'syncing' && 'جاري المزامنة السحابية...'}
                {syncStatus === 'error' && 'مشكلة بالمزامنة (مؤقت)'}
                {syncStatus === 'idle' && 'سحابة Firebase جاهزة'}
              </span>
            </button>
          )}

          <button 
            type="button"
            onClick={onOpenPWA}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
              isOnline 
                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200' 
                : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 animate-pulse'
            }`}
            title="انقر هنا للتثبيت على الموبايل والعمل بدون إنترنت"
          >
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            <span>{isOnline ? 'شغال أوفلاين' : 'بدون نت (شغال)'}</span>
            <Smartphone className="w-3.5 h-3.5 text-indigo-600 mr-0.5" />
          </button>

          {/* App Icon Customizer Button */}
          {onOpenAppIconCustomizer && (
            <button
              type="button"
              onClick={onOpenAppIconCustomizer}
              className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white px-3.5 py-1.5 rounded-full text-xs font-black shadow-md border border-emerald-400/40 transition-all cursor-pointer transform active:scale-95 shrink-0"
              title="تخصيص وتغيير أيقونة واسم التطبيق على الشاشة الرئيسية للموبايل (PWA)"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-200 animate-pulse" />
              <span>✨ تخصيص أيقونة التطبيق</span>
            </button>
          )}

          {/* Dedicated Optional Data Sync Button */}
          {onOpenDataSync && (
            <button
              onClick={onOpenDataSync}
              className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 px-3 py-1.5 rounded-full text-xs font-bold shadow-xs transition-colors cursor-pointer"
              title="مزامنة وتخزين البيانات وحفظ نسخة احتياطية أوفلاين"
            >
              <RefreshCw className="w-3.5 h-3.5 text-indigo-600 animate-spin-slow" />
              <span>مزامنة البيانات</span>
            </button>
          )}

          {/* User Switcher Pill */}
          {currentUser && onOpenSwitchUser && (
            <div className="flex items-center gap-1.5 mr-1.5 shrink-0">
              <button
                onClick={onOpenSwitchUser}
                className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-950 border border-indigo-200 px-3.5 py-1.5 rounded-full text-xs font-bold shadow-xs transition-colors cursor-pointer"
                title="تبديل مستخدم النظام"
              >
                <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="text-right">
                  <div className="font-extrabold text-[10px] leading-none">{currentUser.name}</div>
                  <div className="text-[8px] text-indigo-600 leading-none mt-0.5">
                    {currentUser.role === 'admin' ? 'مدير' : currentUser.role === 'accountant' ? 'محاسب' : 'بائع'}
                  </div>
                </div>
              </button>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="p-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-full transition-all cursor-pointer transform active:scale-90 shadow-2xs"
                  title="تسجيل الخروج وقفل الشاشة"
                >
                  <Lock className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Export / Backup & Fullscreen Options */}
          <div className="flex items-center border-r border-gray-200 pr-2 mr-1 gap-1">
            <button
              onClick={toggleFullscreen}
              className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-full transition-colors cursor-pointer"
              title={isFullscreen ? 'الخروج من الشاشة الكاملة' : 'ملء الشاشة (Full Screen)'}
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>

            <button
              onClick={onExportData}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors"
              title="تصدير نسخة احتياطية (JSON)"
            >
              <Download className="w-4 h-4" />
            </button>

            <label
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              title="استعادة نسخة احتياطية"
            >
              <Upload className="w-4 h-4" />
              <input type="file" accept=".json" onChange={onImportData} className="hidden" />
            </label>

            <button
              onClick={onResetData}
              className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-full transition-colors"
              title="إعادة ضبط البيانات الافتراضية"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>

      <GlobalQuickSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        query={searchQuery}
        setQuery={setSearchQuery}
        products={products}
        customers={customers}
        suppliers={suppliers}
        salesInvoices={salesInvoices}
        purchaseInvoices={purchaseInvoices}
        settings={settings}
      />
    </header>
  );
};
