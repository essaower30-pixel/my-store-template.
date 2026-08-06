/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { Sidebar, TabType } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { ChartOfAccountsView } from './components/ChartOfAccountsView';
import { ProductsView } from './components/ProductsView';
import { SalesPOSView } from './components/SalesPOSView';
import { PurchasesView } from './components/PurchasesView';
import { CustomersView } from './components/CustomersView';
import { SuppliersView } from './components/SuppliersView';
import { JournalEntriesView } from './components/JournalEntriesView';
import { ReportsView } from './components/ReportsView';
import { SettingsModal } from './components/SettingsModal';
import { UsersView } from './components/UsersView';
import { PinLoginModal } from './components/PinLoginModal';
import { ReceiptPrintModal } from './components/ReceiptPrintModal';
import { UserManualModal } from './components/UserManualModal';
import { PWAInstallModal } from './components/PWAInstallModal';
import { DataSyncModal } from './components/DataSyncModal';
import { AppIconCustomizerModal } from './components/AppIconCustomizerModal';
import { initPWAConfigOnLoad, getCustomIconUrl, getCustomAppTitle } from './utils/pwaIconUtils';

import { 
  AccountNode, 
  Product, 
  ProductCategory,
  Supplier, 
  Customer, 
  SalesInvoice, 
  PurchaseInvoice, 
  PaymentVoucher, 
  JournalEntry, 
  ShopSettings,
  StockAdjustment,
  User
} from './types/accounting';

import {
  INITIAL_ACCOUNTS,
  INITIAL_PRODUCTS,
  INITIAL_CATEGORIES,
  INITIAL_SUPPLIERS,
  INITIAL_CUSTOMERS,
  INITIAL_SALES_INVOICES,
  INITIAL_PURCHASE_INVOICES,
  INITIAL_VOUCHERS,
  INITIAL_JOURNAL_ENTRIES,
  INITIAL_SETTINGS
} from './data/initialData';

import {
  loadFromStorage,
  saveToStorage,
  createSalesJournalEntry,
  createPurchaseJournalEntry,
  createVoucherJournalEntry,
  calculateCustomerBalance
} from './utils/accountingEngine';

const INITIAL_USERS: User[] = [
  {
    id: 'user-admin',
    name: 'المدير العام',
    username: 'admin',
    role: 'admin',
    pin: '1234',
    permissions: {
      dashboard: true,
      pos: true,
      products: true,
      purchases: true,
      customers: true,
      suppliers: true,
      chartOfAccounts: true,
      journal: true,
      reports: true,
      settings: true,
    },
    createdAt: new Date().toISOString()
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  // Persistent States
  const [settings, setSettings] = useState<ShopSettings>(() => {
    const saved = loadFromStorage('shop_acc_settings_v1', INITIAL_SETTINGS);
    return {
      ...INITIAL_SETTINGS,
      ...saved,
      appUrl: saved?.appUrl || 'https://service-4115.ai.studio'
    };
  });
  const [accounts, setAccounts] = useState<AccountNode[]>(() =>
    loadFromStorage('shop_acc_accounts_v1', INITIAL_ACCOUNTS)
  );
  const [products, setProducts] = useState<Product[]>(() =>
    loadFromStorage('shop_acc_products_v1', INITIAL_PRODUCTS)
  );
  const [categories, setCategories] = useState<ProductCategory[]>(() =>
    loadFromStorage('shop_acc_categories_v1', INITIAL_CATEGORIES)
  );
  const [suppliers, setSuppliers] = useState<Supplier[]>(() =>
    loadFromStorage('shop_acc_suppliers_v1', INITIAL_SUPPLIERS)
  );
  const [customers, setCustomers] = useState<Customer[]>(() =>
    loadFromStorage('shop_acc_customers_v1', INITIAL_CUSTOMERS)
  );
  const [salesInvoices, setSalesInvoices] = useState<SalesInvoice[]>(() =>
    loadFromStorage('shop_acc_sales_v1', INITIAL_SALES_INVOICES)
  );
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>(() =>
    loadFromStorage('shop_acc_purchases_v1', INITIAL_PURCHASE_INVOICES)
  );
  const [vouchers, setVouchers] = useState<PaymentVoucher[]>(() =>
    loadFromStorage('shop_acc_vouchers_v1', INITIAL_VOUCHERS)
  );
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(() =>
    loadFromStorage('shop_acc_journal_v1', INITIAL_JOURNAL_ENTRIES)
  );
  const [stockAdjustments, setStockAdjustments] = useState<StockAdjustment[]>(() =>
    loadFromStorage('shop_acc_stock_adj_v1', [])
  );
  const [users, setUsers] = useState<User[]>(() =>
    loadFromStorage('shop_acc_users_v1', INITIAL_USERS)
  );
  const [currentUser, setCurrentUser] = useState<User | null>(() =>
    loadFromStorage('shop_acc_current_user_v1', null)
  );

  const [showSwitchUserModal, setShowSwitchUserModal] = useState<boolean>(false);

  // Modal Print & Manual & PWA & Data Sync & Icon Customizer states
  const [printableInvoice, setPrintableInvoice] = useState<SalesInvoice | null>(null);
  const [showManualModal, setShowManualModal] = useState<boolean>(false);
  const [showPWAModal, setShowPWAModal] = useState<boolean>(false);
  const [showDataSyncModal, setShowDataSyncModal] = useState<boolean>(false);
  const [showAppIconModal, setShowAppIconModal] = useState<boolean>(false);

  // Central Database Synchronization State and Hook
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');

  // LAST UPDATED TIMESTAMP STATE (For timestamp-based sync model)
  const [lastUpdated, setLastUpdated] = useState<number>(() =>
    loadFromStorage('shop_acc_last_updated_v1', 0)
  );

  const lastUpdatedRef = useRef(lastUpdated);
  useEffect(() => {
    lastUpdatedRef.current = lastUpdated;
  }, [lastUpdated]);

  const lastSyncedStateRef = useRef<string>('');

  const addDeletedId = (id: string) => {
    try {
      const saved = localStorage.getItem('shop_acc_deleted_ids_v1');
      const list = saved ? JSON.parse(saved) : [];
      if (!list.includes(id)) {
        list.push(id);
        localStorage.setItem('shop_acc_deleted_ids_v1', JSON.stringify(list));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Keep track of the latest states inside a ref to bypass stale closures in empty dependency sync loop
  const stateRef = useRef({
    settings,
    accounts,
    products,
    categories,
    suppliers,
    customers,
    salesInvoices,
    purchaseInvoices,
    vouchers,
    journalEntries,
    stockAdjustments,
    users
  });

  useEffect(() => {
    stateRef.current = {
      settings,
      accounts,
      products,
      categories,
      suppliers,
      customers,
      salesInvoices,
      purchaseInvoices,
      vouchers,
      journalEntries,
      stockAdjustments,
      users
    };
  }, [
    settings,
    accounts,
    products,
    categories,
    suppliers,
    customers,
    salesInvoices,
    purchaseInvoices,
    vouchers,
    journalEntries,
    stockAdjustments,
    users
  ]);

  // Track any local changes to bump the local lastUpdated timestamp
  useEffect(() => {
    const currentStateStr = JSON.stringify({
      settings,
      accounts,
      products,
      categories,
      suppliers,
      customers,
      salesInvoices,
      purchaseInvoices,
      vouchers,
      journalEntries,
      stockAdjustments,
      users
    });

    if (!lastSyncedStateRef.current) {
      lastSyncedStateRef.current = currentStateStr;
      return;
    }

    if (currentStateStr !== lastSyncedStateRef.current) {
      const now = Date.now();
      setLastUpdated(now);
      lastSyncedStateRef.current = currentStateStr;
    }
  }, [
    settings,
    accounts,
    products,
    categories,
    suppliers,
    customers,
    salesInvoices,
    purchaseInvoices,
    vouchers,
    journalEntries,
    stockAdjustments,
    users
  ]);

  useEffect(() => {
    let isMounted = true;
    let syncTimeout: any;
    let consecutiveFailures = 0;

    const doSync = async () => {
      if (!isMounted) return;
      setSyncStatus('syncing');

      try {
        const deletedSaved = localStorage.getItem('shop_acc_deleted_ids_v1');
        const deletedIds = deletedSaved ? JSON.parse(deletedSaved) : [];

        // Access the ABSOLUTE LATEST states via our ref to avoid closures & infinite loops
        const current = stateRef.current;

        const response = await fetch('/api/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            settings: current.settings,
            accounts: current.accounts,
            products: current.products,
            categories: current.categories,
            suppliers: current.suppliers,
            customers: current.customers,
            salesInvoices: current.salesInvoices,
            purchaseInvoices: current.purchaseInvoices,
            vouchers: current.vouchers,
            journalEntries: current.journalEntries,
            stockAdjustments: current.stockAdjustments,
            users: current.users,
            lastUpdated: lastUpdatedRef.current
          })
        });

        if (!response.ok) throw new Error('Sync failed with status: ' + response.status);
        const result = await response.json();

        if (result.success && result.db && isMounted) {
          consecutiveFailures = 0; // Reset failure counter on success
          const db = result.db;

          // Compare with ref's current state to ensure we are looking at the latest possible values
          const active = stateRef.current;
          const serverLastUpdated = Number(db.lastUpdated) || 0;
          const clientLastUpdated = Number(lastUpdatedRef.current) || 0;

          if (serverLastUpdated > clientLastUpdated) {
            const serverStateStr = JSON.stringify({
              settings: db.settings,
              accounts: db.accounts,
              products: db.products,
              categories: db.categories,
              suppliers: db.suppliers,
              customers: db.customers,
              salesInvoices: db.salesInvoices,
              purchaseInvoices: db.purchaseInvoices,
              vouchers: db.vouchers,
              journalEntries: db.journalEntries,
              stockAdjustments: db.stockAdjustments,
              users: db.users
            });
            
            // Set the synced ref string before calling state setters to prevent redundant local timestamp bump
            lastSyncedStateRef.current = serverStateStr;

            if (JSON.stringify(db.settings) !== JSON.stringify(active.settings)) setSettings(db.settings);
            if (JSON.stringify(db.accounts) !== JSON.stringify(active.accounts)) setAccounts(db.accounts);
            if (JSON.stringify(db.products) !== JSON.stringify(active.products)) setProducts(db.products);
            if (JSON.stringify(db.categories) !== JSON.stringify(active.categories)) setCategories(db.categories);
            if (JSON.stringify(db.suppliers) !== JSON.stringify(active.suppliers)) setSuppliers(db.suppliers);
            if (JSON.stringify(db.customers) !== JSON.stringify(active.customers)) setCustomers(db.customers);
            if (JSON.stringify(db.salesInvoices) !== JSON.stringify(active.salesInvoices)) setSalesInvoices(db.salesInvoices);
            if (JSON.stringify(db.purchaseInvoices) !== JSON.stringify(active.purchaseInvoices)) setPurchaseInvoices(db.purchaseInvoices);
            if (JSON.stringify(db.vouchers) !== JSON.stringify(active.vouchers)) setVouchers(db.vouchers);
            if (JSON.stringify(db.journalEntries) !== JSON.stringify(active.journalEntries)) setJournalEntries(db.journalEntries);
            if (JSON.stringify(db.stockAdjustments) !== JSON.stringify(active.stockAdjustments)) setStockAdjustments(db.stockAdjustments);
            if (JSON.stringify(db.users) !== JSON.stringify(active.users)) setUsers(db.users);

            setLastUpdated(serverLastUpdated);
          }

          if (deletedIds.length > 0) {
            localStorage.setItem('shop_acc_deleted_ids_v1', JSON.stringify([]));
          }

          setSyncStatus('synced');
        } else {
          throw new Error(result.message || 'Sync response unsuccessful');
        }
      } catch (e) {
        consecutiveFailures++;
        console.warn(`Database Sync Attempt ${consecutiveFailures} failed:`, e);
        if (isMounted) {
          // Only show error state after 3 consecutive failures to avoid flashing transient errors
          if (consecutiveFailures >= 3) {
            setSyncStatus('error');
          } else {
            setSyncStatus('syncing');
          }
        }
      }

      if (isMounted) {
        // Retry faster (after 3 seconds) if there was a failure, otherwise wait for standard 8 seconds polling interval
        const nextDelay = consecutiveFailures > 0 ? 3000 : 8000;
        syncTimeout = setTimeout(doSync, nextDelay);
      }
    };

    // Initial sync after 1 second on mount
    syncTimeout = setTimeout(doSync, 1000);

    return () => {
      isMounted = false;
      clearTimeout(syncTimeout);
    };
  }, []);

  // Initialize PWA Icon and Title on app boot
  useEffect(() => {
    initPWAConfigOnLoad();

    // Auto-open Icon Customizer modal if URL requested it
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (
        params.get('customizer') === '1' || 
        params.get('openIconCustomizer') === 'true' || 
        params.get('iconModal') === 'true' ||
        params.get('pwa') === '1'
      ) {
        setShowAppIconModal(true);
      }
    }

    const handlePwaChange = () => {
      const savedIcon = getCustomIconUrl();
      const savedTitle = getCustomAppTitle();
      setSettings(prev => ({
        ...prev,
        shopName: savedTitle,
        logoUrl: savedIcon || prev.logoUrl
      }));
    };

    window.addEventListener('pwa-config-changed', handlePwaChange);
    return () => window.removeEventListener('pwa-config-changed', handlePwaChange);
  }, []);

  // Force manual sync to local storage
  const handleForceLocalSync = () => {
    saveToStorage('shop_acc_settings_v1', settings);
    saveToStorage('shop_acc_accounts_v1', accounts);
    saveToStorage('shop_acc_products_v1', products);
    saveToStorage('shop_acc_suppliers_v1', suppliers);
    saveToStorage('shop_acc_customers_v1', customers);
    saveToStorage('shop_acc_sales_v1', salesInvoices);
    saveToStorage('shop_acc_purchases_v1', purchaseInvoices);
    saveToStorage('shop_acc_vouchers_v1', vouchers);
    saveToStorage('shop_acc_journal_v1', journalEntries);
    saveToStorage('shop_acc_stock_adj_v1', stockAdjustments);
    saveToStorage('shop_acc_last_updated_v1', lastUpdated);
  };

  // Sync to local storage
  useEffect(() => saveToStorage('shop_acc_settings_v1', settings), [settings]);
  useEffect(() => saveToStorage('shop_acc_accounts_v1', accounts), [accounts]);
  useEffect(() => saveToStorage('shop_acc_categories_v1', categories), [categories]);
  useEffect(() => saveToStorage('shop_acc_last_updated_v1', lastUpdated), [lastUpdated]);

  // Keep-alive heartbeat interval to maintain active session
  useEffect(() => {
    const pingInterval = setInterval(() => {
      fetch('/', { method: 'HEAD' }).catch(() => {});
    }, 25000); // Send light heartbeat head request every 25 seconds
    return () => clearInterval(pingInterval);
  }, []);
  useEffect(() => saveToStorage('shop_acc_products_v1', products), [products]);
  useEffect(() => saveToStorage('shop_acc_suppliers_v1', suppliers), [suppliers]);
  useEffect(() => saveToStorage('shop_acc_customers_v1', customers), [customers]);
  useEffect(() => saveToStorage('shop_acc_sales_v1', salesInvoices), [salesInvoices]);
  useEffect(() => saveToStorage('shop_acc_purchases_v1', purchaseInvoices), [purchaseInvoices]);
  useEffect(() => saveToStorage('shop_acc_vouchers_v1', vouchers), [vouchers]);
  useEffect(() => saveToStorage('shop_acc_journal_v1', journalEntries), [journalEntries]);
  useEffect(() => saveToStorage('shop_acc_stock_adj_v1', stockAdjustments), [stockAdjustments]);
  useEffect(() => saveToStorage('shop_acc_users_v1', users), [users]);
  useEffect(() => saveToStorage('shop_acc_current_user_v1', currentUser), [currentUser]);

  // Force redirection if a user does not have permission to view the active tab
  useEffect(() => {
    if (!currentUser) return;
    
    // If on user management and not an admin, redirect to dashboard with warning
    if (activeTab === 'users' && currentUser.role !== 'admin') {
      alert('⚠️ تنبيه أمان: لا تملك صلاحية الوصول إلى "إدارة المستخدمين". هذه الشاشة مخصصة لمدير النظام (Admin) فقط!');
      setActiveTab('dashboard');
      return;
    }

    // If on shop settings and not an admin, redirect to dashboard with warning
    if (activeTab === 'settings' && currentUser.role !== 'admin') {
      alert('⚠️ تنبيه أمان: لا تملك صلاحية الوصول إلى "إعدادات المحل". هذه الشاشة مخصصة لمدير النظام (Admin) فقط!');
      setActiveTab('dashboard');
      return;
    }
    
    // Check permission of active view
    if (activeTab !== 'settings' && activeTab !== 'users') {
      const permKey = activeTab as keyof User['permissions'];
      if (currentUser.permissions && currentUser.permissions[permKey] === false) {
        const allowedTabs: TabType[] = [
          'dashboard', 'pos', 'products', 'purchases', 'customers', 
          'suppliers', 'chartOfAccounts', 'journal', 'reports'
        ];
        const firstAllowed = allowedTabs.find(tab => currentUser.permissions[tab as keyof User['permissions']]);
        if (firstAllowed) {
          setActiveTab(firstAllowed);
        } else {
          // If absolutely nothing is allowed, at least let them see POS if allowed, otherwise dashboard
          setActiveTab(currentUser.permissions.pos ? 'pos' : 'dashboard');
        }
      }
    }
  }, [currentUser, activeTab]);

  // Handler: Reset Data to Defaults
  const handleResetData = async () => {
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isReset: true,
          settings: INITIAL_SETTINGS,
          accounts: INITIAL_ACCOUNTS,
          products: INITIAL_PRODUCTS,
          categories: INITIAL_CATEGORIES,
          suppliers: INITIAL_SUPPLIERS,
          customers: INITIAL_CUSTOMERS,
          salesInvoices: INITIAL_SALES_INVOICES,
          purchaseInvoices: INITIAL_PURCHASE_INVOICES,
          vouchers: INITIAL_VOUCHERS,
          journalEntries: INITIAL_JOURNAL_ENTRIES,
          stockAdjustments: [],
          users: users,
          deletedIds: []
        })
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.db) {
          const db = result.db;
          const serverStateStr = JSON.stringify({
            settings: db.settings,
            accounts: db.accounts,
            products: db.products,
            categories: db.categories,
            suppliers: db.suppliers,
            customers: db.customers,
            salesInvoices: db.salesInvoices,
            purchaseInvoices: db.purchaseInvoices,
            vouchers: db.vouchers,
            journalEntries: db.journalEntries,
            stockAdjustments: db.stockAdjustments,
            users: db.users
          });
          lastSyncedStateRef.current = serverStateStr;

          setSettings(db.settings);
          setAccounts(db.accounts);
          setProducts(db.products);
          setCategories(db.categories);
          setSuppliers(db.suppliers);
          setCustomers(db.customers);
          setSalesInvoices(db.salesInvoices);
          setPurchaseInvoices(db.purchaseInvoices);
          setVouchers(db.vouchers);
          setJournalEntries(db.journalEntries);
          setStockAdjustments(db.stockAdjustments);
          setLastUpdated(db.lastUpdated || Date.now());
          alert('تم استعادة الأمثلة الافتراضية بنجاح.');
        }
      }
    } catch (e) {
      console.error('Reset error:', e);
      setSettings(INITIAL_SETTINGS);
      setAccounts(INITIAL_ACCOUNTS);
      setProducts(INITIAL_PRODUCTS);
      setSuppliers(INITIAL_SUPPLIERS);
      setCustomers(INITIAL_CUSTOMERS);
      setSalesInvoices(INITIAL_SALES_INVOICES);
      setPurchaseInvoices(INITIAL_PURCHASE_INVOICES);
      setVouchers(INITIAL_VOUCHERS);
      setJournalEntries(INITIAL_JOURNAL_ENTRIES);
      alert('تمت استعادة الأمثلة الافتراضية محلياً.');
    }
  };

  // Handler: Clear ALL Data completely (Start Clean)
  const handleClearAllData = async () => {
    try {
      const defaultCashCustomer = INITIAL_CUSTOMERS.find(c => c.id === 'cust-cash') || {
        id: 'cust-cash',
        code: 'CUST-00',
        name: 'زبون نقدي (عام)',
        phone: '0000000000',
        creditLimit: 0,
        openingBalance: 0,
        notes: 'زبون المبيعات المباشرة بالصندوق'
      };

      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isClearAll: true,
          settings: settings,
          accounts: accounts,
          products: [],
          categories: categories,
          suppliers: [],
          customers: [defaultCashCustomer], // Keep only the default cash customer so sales / POS don't break
          salesInvoices: [],
          purchaseInvoices: [],
          vouchers: [],
          journalEntries: [],
          stockAdjustments: [],
          users: users,
          deletedIds: []
        })
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.db) {
          const db = result.db;
          const serverStateStr = JSON.stringify({
            settings: db.settings,
            accounts: db.accounts,
            products: db.products,
            categories: db.categories,
            suppliers: db.suppliers,
            customers: db.customers,
            salesInvoices: db.salesInvoices,
            purchaseInvoices: db.purchaseInvoices,
            vouchers: db.vouchers,
            journalEntries: db.journalEntries,
            stockAdjustments: db.stockAdjustments,
            users: db.users
          });
          lastSyncedStateRef.current = serverStateStr;

          setProducts(db.products);
          setSuppliers(db.suppliers);
          setCustomers(db.customers);
          setSalesInvoices(db.salesInvoices);
          setPurchaseInvoices(db.purchaseInvoices);
          setVouchers(db.vouchers);
          setJournalEntries(db.journalEntries);
          setStockAdjustments(db.stockAdjustments);
          setLastUpdated(db.lastUpdated || Date.now());
          alert('تم تصفير ومسح جميع البيانات والحركات التجريبية بنجاح! يمكنك الآن البدء بإضافة منتجاتك وحركاتك الخاصة.');
        }
      }
    } catch (e) {
      console.error('Clear error:', e);
      const defaultCashCustomer = INITIAL_CUSTOMERS.find(c => c.id === 'cust-cash') || {
        id: 'cust-cash',
        code: 'CUST-00',
        name: 'زبون نقدي (عام)',
        phone: '0000000000',
        creditLimit: 0,
        openingBalance: 0,
        notes: 'زبون المبيعات المباشرة بالصندوق'
      };
      setSalesInvoices([]);
      setPurchaseInvoices([]);
      setVouchers([]);
      setJournalEntries([]);
      setProducts([]);
      setCustomers([defaultCashCustomer]);
      setSuppliers([]);
      alert('تم تصفير ومسح جميع البيانات محلياً.');
    }
  };

  // Export JSON Backup
  const handleExportData = () => {
    const backup = {
      settings,
      accounts,
      products,
      suppliers,
      customers,
      salesInvoices,
      purchaseInvoices,
      vouchers,
      journalEntries,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ShopAccounting_Backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON Backup
  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.accounts && data.products) {
          if (data.settings) setSettings(data.settings);
          if (data.accounts) setAccounts(data.accounts);
          if (data.products) setProducts(data.products);
          if (data.suppliers) setSuppliers(data.suppliers);
          if (data.customers) setCustomers(data.customers);
          if (data.salesInvoices) setSalesInvoices(data.salesInvoices);
          if (data.purchaseInvoices) setPurchaseInvoices(data.purchaseInvoices);
          if (data.vouchers) setVouchers(data.vouchers);
          if (data.journalEntries) setJournalEntries(data.journalEntries);
          alert('تم استعادة النسخة الاحتياطية بنجاح!');
        } else {
          alert('الملف غير صالح لاستعادة البيانات.');
        }
      } catch (err) {
        alert('حدث خطأ أثناء قراءة ملف النسخة الاحتياطية.');
      }
    };
    reader.readAsText(file);
  };

  // Handler: Record or Update Sales Invoice
  const handleSaveSalesInvoice = (invoice: SalesInvoice) => {
    setSalesInvoices(prev => {
      const exists = prev.some(s => s.id === invoice.id);
      if (exists) {
        return prev.map(s => s.id === invoice.id ? invoice : s);
      }
      return [invoice, ...prev];
    });

    setProducts(prevProducts => {
      // Find old invoice if editing
      const oldInvoice = salesInvoices.find(s => s.id === invoice.id);

      return prevProducts.map(p => {
        let newStock = p.stock;

        // Revert old quantity if editing
        if (oldInvoice) {
          const oldItem = oldInvoice.items.find(i => i.productId === p.id);
          if (oldItem) {
            newStock += oldItem.quantity;
          }
        }

        // Subtract new quantity
        const newItem = invoice.items.find(i => i.productId === p.id);
        if (newItem) {
          newStock = Math.max(0, newStock - newItem.quantity);
        }

        return { ...p, stock: newStock };
      });
    });

    // Update journal entries: remove old entry for this invoice and add updated entry
    const autoJE = createSalesJournalEntry(invoice);
    setJournalEntries(prev => [
      autoJE,
      ...prev.filter(je => je.referenceId !== invoice.id && je.referenceNumber !== invoice.invoiceNumber)
    ]);
  };

  // Handler: Record or Update Purchase Invoice
  const handleSavePurchaseInvoice = (invoice: PurchaseInvoice) => {
    setPurchaseInvoices(prev => {
      const exists = prev.some(p => p.id === invoice.id);
      if (exists) {
        return prev.map(p => p.id === invoice.id ? invoice : p);
      }
      return [invoice, ...prev];
    });

    setProducts(prevProducts => {
      const oldInvoice = purchaseInvoices.find(p => p.id === invoice.id);

      return prevProducts.map(p => {
        let newStock = p.stock;

        // Revert old stock increase if editing
        if (oldInvoice) {
          const oldItem = oldInvoice.items.find(i => i.productId === p.id);
          if (oldItem) {
            newStock = Math.max(0, newStock - oldItem.quantity);
          }
        }

        // Apply new stock increase
        const newItem = invoice.items.find(i => i.productId === p.id);
        if (newItem) {
          newStock += newItem.quantity;
          return {
            ...p,
            stock: newStock,
            costPrice: newItem.unitPrice > 0 ? newItem.unitPrice : p.costPrice
          };
        }

        return { ...p, stock: newStock };
      });
    });

    // Update journal entries
    const autoJE = createPurchaseJournalEntry(invoice);
    setJournalEntries(prev => [
      autoJE,
      ...prev.filter(je => je.referenceId !== invoice.id && je.referenceNumber !== invoice.invoiceNumber)
    ]);
  };

  // Handler: Delete Purchase Invoice & Restore Inventory & Journal
  const handleDeletePurchaseInvoice = (invoiceId: string) => {
    const invToDelete = purchaseInvoices.find(p => p.id === invoiceId);
    if (!invToDelete) return;

    if (!confirm(`هل أنت تأكد من إلغاء وحذف فاتورة المشتريات رقم (${invToDelete.invoiceNumber})؟\nسيتم خفض الكميات التي تمت إضافتها من المخزون وتعديل القيود المحاسبية تلقائياً.`)) {
      return;
    }

    addDeletedId(invoiceId);
    setPurchaseInvoices(prev => prev.filter(p => p.id !== invoiceId));

    setProducts(prevProducts => {
      return prevProducts.map(p => {
        const item = invToDelete.items.find(i => i.productId === p.id);
        if (item) {
          return { ...p, stock: Math.max(0, p.stock - item.quantity) };
        }
        return p;
      });
    });

    setJournalEntries(prev => prev.filter(je => 
      je.referenceId !== invoiceId && 
      je.referenceNumber !== invToDelete.invoiceNumber
    ));
  };

  // Handler: Delete Sales Invoice & Restore Inventory & Journal
  const handleDeleteSalesInvoice = (invoiceId: string) => {
    const invToDelete = salesInvoices.find(s => s.id === invoiceId);
    if (!invToDelete) return;

    if (!confirm(`هل أنت تأكد من إلغاء وحذف فاتورة المبيعات رقم (${invToDelete.invoiceNumber})؟\nسيتم إعادة الأصناف المباعة إلى المخزون تلقائياً وتعديل القيود المحاسبية.`)) {
      return;
    }

    addDeletedId(invoiceId);
    setSalesInvoices(prev => prev.filter(s => s.id !== invoiceId));

    setProducts(prevProducts => {
      return prevProducts.map(p => {
        const item = invToDelete.items.find(i => i.productId === p.id);
        if (item) {
          return { ...p, stock: p.stock + item.quantity };
        }
        return p;
      });
    });

    setJournalEntries(prev => prev.filter(je => 
      je.referenceId !== invoiceId && 
      je.referenceNumber !== invToDelete.invoiceNumber
    ));
  };

  // Handler: Delete Voucher & Journal Entry
  const handleDeleteVoucher = (voucherId: string) => {
    const vToDelete = vouchers.find(v => v.id === voucherId);
    if (!vToDelete) return;

    if (!confirm(`هل أنت تأكد من حذف السند رقم (${vToDelete.voucherNumber})؟`)) {
      return;
    }

    addDeletedId(voucherId);
    setVouchers(prev => prev.filter(v => v.id !== voucherId));
    setJournalEntries(prev => prev.filter(je => 
      je.referenceId !== voucherId && 
      je.referenceNumber !== vToDelete.voucherNumber
    ));
  };

  // Handler: Delete Manual Journal Entry
  const handleDeleteJournalEntry = (entryId: string) => {
    const jeToDelete = journalEntries.find(j => j.id === entryId);
    if (!jeToDelete) return;

    if (!confirm(`هل أنت تأكد من حذف القيد المحاسبي رقم (${jeToDelete.entryNumber})؟`)) {
      return;
    }

    addDeletedId(entryId);
    setJournalEntries(prev => prev.filter(j => j.id !== entryId));
  };

  // Handler: Add Voucher (Receipt / Disbursement)
  const handleAddVoucher = (voucher: PaymentVoucher) => {
    setVouchers(prev => [voucher, ...prev]);
    const autoJE = createVoucherJournalEntry(voucher);
    setJournalEntries(prev => [autoJE, ...prev]);
  };

  // Handlers for Items/Accounts
  const handleAddAccount = (acc: AccountNode) => {
    setAccounts(prev => [...prev, acc]);
  };

  const handleAddProduct = (prod: Product) => {
    setProducts(prev => [...prev, prod]);
  };

  const handleUpdateProduct = (updated: Product) => {
    setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const handleAddCustomer = (cust: Customer) => {
    setCustomers(prev => [...prev, cust]);
  };

  const handleUpdateCustomer = (updated: Customer) => {
    setCustomers(prev => prev.map(c => c.id === updated.id ? updated : c));
  };

  const handleDeleteCustomer = (customerId: string) => {
    const custToDelete = customers.find(c => c.id === customerId);
    if (!custToDelete) return;

    if (customerId === 'cust-cash') {
      alert('لا يمكن حذف الزبون النقدي العام الافتراضي.');
      return;
    }

    addDeletedId(customerId);
    setCustomers(prev => prev.filter(c => c.id !== customerId));
  };

  const handleAddSupplier = (sup: Supplier) => {
    setSuppliers(prev => [...prev, sup]);
  };

  const handleUpdateSupplier = (updated: Supplier) => {
    setSuppliers(prev => prev.map(s => s.id === updated.id ? updated : s));
  };

  const handleDeleteSupplier = (supplierId: string) => {
    const supToDelete = suppliers.find(s => s.id === supplierId);
    if (!supToDelete) return;

    addDeletedId(supplierId);
    setSuppliers(prev => prev.filter(s => s.id !== supplierId));
  };

  const handleAddManualJournalEntry = (je: JournalEntry) => {
    setJournalEntries(prev => [je, ...prev]);
  };

  const handleAddStockAdjustment = (adj: StockAdjustment) => {
    setStockAdjustments(prev => [adj, ...prev]);
  };

  const handleAddCategory = (cat: ProductCategory) => {
    setCategories(prev => [...prev, cat]);
  };

  const handleUpdateCategory = (updatedCat: ProductCategory, oldName?: string) => {
    setCategories(prev => prev.map(c => c.id === updatedCat.id ? updatedCat : c));
    if (oldName && oldName !== updatedCat.name) {
      setProducts(prev => prev.map(p => p.category === oldName ? { ...p, category: updatedCat.name } : p));
    }
  };

  const handleDeleteCategory = (catId: string, catName: string) => {
    addDeletedId(catId);
    setCategories(prev => prev.filter(c => c.id !== catId));
    setProducts(prev => prev.map(p => p.category === catName ? { ...p, category: 'عام / غير محدد' } : p));
  };

  const handleDeleteProduct = (productId: string) => {
    addDeletedId(productId);
    setProducts(prev => prev.filter(p => p.id !== productId));
  };

  // User Management State Handlers
  const handleAddUser = (user: User) => {
    setUsers(prev => [...prev, user]);
  };

  const handleUpdateUser = (updated: User) => {
    setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
    if (currentUser && currentUser.id === updated.id) {
      setCurrentUser(updated);
    }
  };

  const handleDeleteUser = (userId: string) => {
    addDeletedId(userId);
    setUsers(prev => prev.filter(u => u.id !== userId));
  };

  // Low stock counter & debt counter
  const lowStockCount = products.filter(p => p.stock <= p.minStockAlert).length;
  const pendingReceivablesCount = customers.filter(c => calculateCustomerBalance(c, salesInvoices, vouchers) > 0).length;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900 overflow-x-hidden" dir="rtl">
      
      {/* Top Header */}
      <Header
        settings={settings}
        products={products}
        salesInvoices={salesInvoices}
        customers={customers}
        suppliers={suppliers}
        purchaseInvoices={purchaseInvoices}
        onOpenQuickSale={() => setActiveTab('pos')}
        onOpenQuickPurchase={() => setActiveTab('purchases')}
        onOpenQuickVoucher={() => setActiveTab('journal')}
        onOpenManual={() => setShowManualModal(true)}
        onOpenPWA={() => setShowPWAModal(true)}
        onOpenAppIconCustomizer={() => setShowAppIconModal(true)}
        onOpenDataSync={() => setShowDataSyncModal(true)}
        onResetData={handleResetData}
        onExportData={handleExportData}
        onImportData={handleImportData}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        syncStatus={syncStatus}
        currentUser={currentUser}
        onOpenSwitchUser={() => setShowSwitchUserModal(true)}
        onNavigateToTab={(tab) => setActiveTab(tab)}
        onLogout={() => {
          setCurrentUser(null);
          // Go back to default dashboard view to avoid being on restricted tab upon re-login
          setActiveTab('dashboard');
        }}
      />

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col md:flex-row min-h-[calc(100vh-65px)]">
        
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          lowStockCount={lowStockCount}
          pendingReceivablesCount={pendingReceivablesCount}
          onOpenDataSync={() => setShowDataSyncModal(true)}
          onOpenAppIconCustomizer={() => setShowAppIconModal(true)}
          shopName={settings.shopName}
          logoUrl={settings.logoUrl}
          currentUser={currentUser}
        />

        {/* Dynamic Content View */}
        <main className="flex-1 bg-slate-50 overflow-y-auto pb-10">
          
          {activeTab === 'dashboard' && (
            <DashboardView
              settings={settings}
              products={products}
              salesInvoices={salesInvoices}
              purchaseInvoices={purchaseInvoices}
              customers={customers}
              suppliers={suppliers}
              accounts={accounts}
              journalEntries={journalEntries}
              onOpenPOS={() => setActiveTab('pos')}
              onOpenPurchases={() => setActiveTab('purchases')}
              onOpenVouchers={() => setActiveTab('journal')}
              onOpenProducts={() => setActiveTab('products')}
              onSelectInvoice={(inv) => setPrintableInvoice(inv)}
            />
          )}

          {activeTab === 'pos' && (
            <SalesPOSView
              products={products}
              customers={customers}
              settings={settings}
              salesInvoices={salesInvoices}
              onSaveSalesInvoice={handleSaveSalesInvoice}
              onDeleteSalesInvoice={handleDeleteSalesInvoice}
              onSelectInvoiceForPrint={(inv) => setPrintableInvoice(inv)}
            />
          )}

          {activeTab === 'products' && (
            <ProductsView
              products={products}
              categoriesList={categories}
              settings={settings}
              salesInvoices={salesInvoices}
              purchaseInvoices={purchaseInvoices}
              suppliers={suppliers}
              stockAdjustments={stockAdjustments}
              onAddProduct={handleAddProduct}
              onUpdateProduct={handleUpdateProduct}
              onAddStockAdjustment={handleAddStockAdjustment}
              onAddCategory={handleAddCategory}
              onUpdateCategory={handleUpdateCategory}
              onDeleteCategory={handleDeleteCategory}
              onDeleteProduct={handleDeleteProduct}
              onNavigateToPurchases={() => setActiveTab('purchases')}
            />
          )}

          {activeTab === 'purchases' && (
            <PurchasesView
              purchaseInvoices={purchaseInvoices}
              suppliers={suppliers}
              products={products}
              settings={settings}
              onSavePurchaseInvoice={handleSavePurchaseInvoice}
              onDeletePurchaseInvoice={handleDeletePurchaseInvoice}
            />
          )}

          {activeTab === 'customers' && (
            <CustomersView
              customers={customers}
              salesInvoices={salesInvoices}
              vouchers={vouchers}
              settings={settings}
              onAddCustomer={handleAddCustomer}
              onUpdateCustomer={handleUpdateCustomer}
              onDeleteCustomer={handleDeleteCustomer}
              onAddReceiptVoucher={handleAddVoucher}
            />
          )}

          {activeTab === 'suppliers' && (
            <SuppliersView
              suppliers={suppliers}
              purchaseInvoices={purchaseInvoices}
              vouchers={vouchers}
              settings={settings}
              onAddSupplier={handleAddSupplier}
              onUpdateSupplier={handleUpdateSupplier}
              onDeleteSupplier={handleDeleteSupplier}
              onAddDisbursementVoucher={handleAddVoucher}
            />
          )}

          {activeTab === 'chartOfAccounts' && (
            <ChartOfAccountsView
              accounts={accounts}
              journalEntries={journalEntries}
              settings={settings}
              onAddAccount={handleAddAccount}
            />
          )}

          {activeTab === 'journal' && (
            <JournalEntriesView
              journalEntries={journalEntries}
              vouchers={vouchers}
              accounts={accounts}
              settings={settings}
              onAddJournalEntry={handleAddManualJournalEntry}
              onAddVoucher={handleAddVoucher}
              onDeleteJournalEntry={handleDeleteJournalEntry}
              onDeleteVoucher={handleDeleteVoucher}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              accounts={accounts}
              journalEntries={journalEntries}
              salesInvoices={salesInvoices}
              purchaseInvoices={purchaseInvoices}
              products={products}
              settings={settings}
              customers={customers}
              suppliers={suppliers}
              vouchers={vouchers}
              onSaveSalesInvoice={handleSaveSalesInvoice}
              onDeleteSalesInvoice={handleDeleteSalesInvoice}
              onSavePurchaseInvoice={handleSavePurchaseInvoice}
              onDeletePurchaseInvoice={handleDeletePurchaseInvoice}
              onUpdateCustomer={handleUpdateCustomer}
              onUpdateSupplier={handleUpdateSupplier}
            />
          )}

          {activeTab === 'users' && currentUser && (
            <UsersView
              users={users}
              currentUser={currentUser}
              onAddUser={handleAddUser}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsModal
              settings={settings}
              onUpdateSettings={setSettings}
              onResetData={handleResetData}
              onClearAllData={handleClearAllData}
              onExportData={handleExportData}
              onImportData={handleImportData}
              onOpenDataSync={() => setShowDataSyncModal(true)}
              onOpenAppIconCustomizer={() => setShowAppIconModal(true)}
            />
          )}

        </main>

      </div>

      {/* Printable Receipt Modal */}
      {printableInvoice && (
        <ReceiptPrintModal
          invoice={printableInvoice}
          settings={settings}
          onClose={() => setPrintableInvoice(null)}
        />
      )}

      {/* Interactive User Manual Modal */}
      <UserManualModal
        isOpen={showManualModal}
        onClose={() => setShowManualModal(false)}
        settings={settings}
      />

      {/* PWA Offline & Install Modal */}
      <PWAInstallModal
        isOpen={showPWAModal}
        onClose={() => setShowPWAModal(false)}
        onOpenAppIconCustomizer={() => setShowAppIconModal(true)}
      />

      {/* App Icon Customizer Modal */}
      <AppIconCustomizerModal
        isOpen={showAppIconModal}
        onClose={() => setShowAppIconModal(false)}
      />

      {/* Data Sync & Offline LocalStorage Modal */}
      <DataSyncModal
        isOpen={showDataSyncModal}
        onClose={() => setShowDataSyncModal(false)}
        onExportData={handleExportData}
        onImportData={handleImportData}
        onForceLocalSync={handleForceLocalSync}
        settings={settings}
      />

      {/* Switch User PIN Login Modal */}
      {(currentUser === null || showSwitchUserModal) && (
        <PinLoginModal
          isOpen={currentUser === null || showSwitchUserModal}
          users={users}
          currentUser={currentUser}
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            setShowSwitchUserModal(false);
          }}
          onClose={() => setShowSwitchUserModal(false)}
          canCancel={currentUser !== null}
        />
      )}

    </div>
  );
}
