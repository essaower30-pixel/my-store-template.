import React from 'react';
import {
  LayoutDashboard,
  FolderTree,
  Package,
  ShoppingBag,
  ShoppingCart,
  Users,
  Truck,
  BookOpen,
  PieChart,
  Settings,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { User } from '../types/accounting';

export type TabType = 
  | 'dashboard' 
  | 'chartOfAccounts' 
  | 'products' 
  | 'pos' 
  | 'purchases' 
  | 'customers' 
  | 'suppliers' 
  | 'journal' 
  | 'reports' 
  | 'settings'
  | 'users'
  | 'orders';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  lowStockCount: number;
  pendingReceivablesCount: number;
  pendingOrdersCount?: number;
  onOpenDataSync?: () => void;
  onOpenAppIconCustomizer?: () => void;
  onOpenPWA?: () => void;
  shopName?: string;
  logoUrl?: string;
  currentUser?: User | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  lowStockCount,
  pendingReceivablesCount,
  pendingOrdersCount = 0,
  onOpenDataSync,
  onOpenAppIconCustomizer,
  onOpenPWA,
  shopName,
  logoUrl,
  currentUser
}) => {
  const [isInstalled, setIsInstalled] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
      setIsInstalled(isStandalone);
    }
  }, []);

  const menuItems: { id: TabType; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'dashboard',
      label: 'لوحة التحكم',
      icon: <LayoutDashboard className="w-5 h-5" />
    },
    {
      id: 'pos',
      label: 'نقطة البيع والمبيعات',
      icon: <ShoppingBag className="w-5 h-5" />
    },
    {
      id: 'products',
      label: 'إدارة المخزون والأصناف',
      icon: <Package className="w-5 h-5" />,
      badge: lowStockCount > 0 ? lowStockCount : undefined
    },
    {
      id: 'purchases',
      label: 'المشتريات',
      icon: <ShoppingCart className="w-5 h-5" />
    },
    {
      id: 'customers',
      label: 'الزبائن والعملاء',
      icon: <Users className="w-5 h-5" />,
      badge: pendingReceivablesCount > 0 ? pendingReceivablesCount : undefined
    },
    {
      id: 'suppliers',
      label: 'الموردون',
      icon: <Truck className="w-5 h-5" />
    },
    {
      id: 'chartOfAccounts',
      label: 'شجرة الحسابات',
      icon: <FolderTree className="w-5 h-5" />
    },
    {
      id: 'journal',
      label: 'القيود والسندات',
      icon: <BookOpen className="w-5 h-5" />
    },
    {
      id: 'reports',
      label: 'التقارير المالية',
      icon: <PieChart className="w-5 h-5" />
    },
    {
      id: 'settings',
      label: 'إعدادات المحل',
      icon: <Settings className="w-5 h-5" />
    },
    {
      id: 'users',
      label: 'إدارة المستخدمين',
      icon: <ShieldCheck className="w-5 h-5 text-indigo-300" />
    }
  ];

  // Filter menu items by user permissions
  const filteredMenuItems = menuItems.filter(item => {
    if (!currentUser) return true; // fallback
    if (item.id === 'users' || item.id === 'settings') {
      return currentUser.role === 'admin';
    }
    const permissionKey = item.id as keyof User['permissions'];
    return currentUser.permissions[permissionKey] === true;
  });

  return (
    <aside className="w-64 bg-indigo-950 text-white flex flex-col shrink-0 min-h-[calc(100vh-65px)] border-l border-indigo-900/60 p-4 shadow-2xl">
      
      <div className="mb-6 px-2 pt-2 border-r-4 border-indigo-400 pr-3 flex items-center gap-2.5 overflow-hidden">
        {logoUrl ? (
          <img 
            src={logoUrl} 
            alt={shopName || 'Logo'} 
            className="w-10 h-10 rounded-xl object-cover shrink-0 border border-indigo-400/30 shadow-inner"
            onError={(e) => {
              // fallback if custom logo fails to load
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : null}
        <div className="overflow-hidden min-w-0">
          <h1 className="text-sm font-black tracking-tight text-white leading-tight truncate max-w-[150px]" title={shopName || 'التاجر الذكي'}>
            {shopName || 'التاجر الذكي'}
          </h1>
          <p className="text-indigo-300 text-[10px] mt-0.5 truncate">نظام المحاسبة للمحلات الصغيرة</p>
        </div>
      </div>

      {!isInstalled && onOpenPWA && (
        <div className="mb-4 px-1 shrink-0">
          <button
            onClick={onOpenPWA}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black py-3 px-4 rounded-2xl transition-all flex items-center justify-center gap-2.5 text-xs cursor-pointer border border-emerald-400/30 shadow-md shadow-emerald-950/40 animate-pulse hover:animate-none"
          >
            <Smartphone className="w-4 h-4 text-emerald-100 shrink-0" />
            <span className="truncate">تثبيت التطبيق على الجوال</span>
          </button>
        </div>
      )}

      <nav className="space-y-1.5 flex-1 overflow-y-auto pr-1">
        {filteredMenuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-800 text-white shadow-lg shadow-indigo-950/50 border border-indigo-700/60'
                  : 'hover:bg-indigo-900/80 text-indigo-200 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={isActive ? 'text-indigo-300' : 'text-indigo-400'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive
                      ? 'bg-white text-indigo-950'
                      : 'bg-indigo-500/30 text-indigo-200 border border-indigo-400/30'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bento Bottom Status Panel */}
      <div className="mt-auto p-4 bg-indigo-900/50 rounded-2xl border border-indigo-800/80 text-xs text-indigo-200 space-y-2">
        <div className="flex justify-between items-center text-[11px]">
          <span className="font-medium text-indigo-300">التخزين أوفلاين</span>
          <span className="flex items-center gap-1 text-emerald-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            محلي 100%
          </span>
        </div>
        <div className="text-xs font-bold text-white pt-0.5">
          مُحفظ في ذاكرة الهاتف
        </div>
        {onOpenAppIconCustomizer && (
          <button
            onClick={onOpenAppIconCustomizer}
            className="w-full mt-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-3 rounded-xl transition-colors flex items-center justify-center gap-1.5 text-xs cursor-pointer border border-emerald-400/40 shadow-sm"
          >
            <span>✨ تغيير أيقونة التطبيق</span>
          </button>
        )}
        {onOpenDataSync && (
          <button
            onClick={onOpenDataSync}
            className="w-full mt-1 bg-indigo-700/80 hover:bg-indigo-600 text-white font-bold py-2 px-3 rounded-xl transition-colors flex items-center justify-center gap-1.5 text-xs cursor-pointer border border-indigo-500/40"
          >
            <span>مزامنة البيانات 🔄</span>
          </button>
        )}
      </div>
    </aside>
  );
};
