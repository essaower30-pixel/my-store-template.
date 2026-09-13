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
import { FiscalYearArchiveModal } from './components/FiscalYearArchiveModal';
import { UsersView } from './components/UsersView';
import { PinLoginModal } from './components/PinLoginModal';
import { ReceiptPrintModal } from './components/ReceiptPrintModal';
import { UserManualModal } from './components/UserManualModal';
import { PWAInstallModal } from './components/PWAInstallModal';
import { DataSyncModal } from './components/DataSyncModal';
import { AppIconCustomizerModal } from './components/AppIconCustomizerModal';
import { initPWAConfigOnLoad, getCustomIconUrl, getCustomAppTitle } from './utils/pwaIconUtils';
import { FirebaseSyncService } from './lib/firebaseSync';
import { getStoreQueryParam } from './utils/accountingEngine';

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
  User,
  CustomerOrder,
  FiscalYearArchive
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
  calculateCustomerBalance,
  calculateAccountBalance,
  calculateSupplierBalance,
  getStoreUrl
} from './utils/accountingEngine';

// Store routing context is automatically handled explicitly on API requests using getStoreUrl() helper

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
    const saved = loadFromStorage('shop_acc_settings_v2', INITIAL_SETTINGS);
    const defaultUrl = typeof window !== 'undefined' ? window.location.origin : 'https://ais-pre-lb77c3cfcml44alz4xw36x-105836077369.europe-west2.run.app';
    let currentAppUrl = saved?.appUrl || defaultUrl;
    if (currentAppUrl.includes('service-4115.ai.studio') || currentAppUrl.includes('vice-4115.ai.studio')) {
      currentAppUrl = defaultUrl;
    }
    return {
      ...INITIAL_SETTINGS,
      ...saved,
      appUrl: currentAppUrl
    };
  });
  const [accounts, rawSetAccounts] = useState<AccountNode[]>(() => {
    const loaded = loadFromStorage('shop_acc_accounts_v2', INITIAL_ACCOUNTS);
    return (loaded || []).filter((a: any) => a && a.code);
  });
  const setAccounts = (value: AccountNode[] | ((prev: AccountNode[]) => AccountNode[])) => {
    rawSetAccounts(prev => {
      const next = typeof value === 'function' ? value(prev) : value;
      return (next || []).filter((a: any) => a && a.code);
    });
  };

  const [products, rawSetProducts] = useState<Product[]>(() => {
    const loaded = loadFromStorage('shop_acc_products_v2', INITIAL_PRODUCTS);
    return (loaded || []).filter((p: any) => p && p.id);
  });
  const setProducts = (value: Product[] | ((prev: Product[]) => Product[])) => {
    rawSetProducts(prev => {
      const next = typeof value === 'function' ? value(prev) : value;
      return (next || []).filter((p: any) => p && p.id);
    });
  };

  const [categories, rawSetCategories] = useState<ProductCategory[]>(() => {
    const loaded = loadFromStorage('shop_acc_categories_v2', INITIAL_CATEGORIES);
    return (loaded || []).filter((c: any) => c && c.id);
  });
  const setCategories = (value: ProductCategory[] | ((prev: ProductCategory[]) => ProductCategory[])) => {
    rawSetCategories(prev => {
      const next = typeof value === 'function' ? value(prev) : value;
      return (next || []).filter((c: any) => c && c.id);
    });
  };

  const [suppliers, rawSetSuppliers] = useState<Supplier[]>(() => {
    const loaded = loadFromStorage('shop_acc_suppliers_v2', INITIAL_SUPPLIERS);
    return (loaded || []).filter((s: any) => s && s.id);
  });
  const setSuppliers = (value: Supplier[] | ((prev: Supplier[]) => Supplier[])) => {
    rawSetSuppliers(prev => {
      const next = typeof value === 'function' ? value(prev) : value;
      return (next || []).filter((s: any) => s && s.id);
    });
  };

  const [customers, rawSetCustomers] = useState<Customer[]>(() => {
    const loaded = loadFromStorage('shop_acc_customers_v2', INITIAL_CUSTOMERS);
    return (loaded || []).filter((c: any) => c && c.id);
  });
  const setCustomers = (value: Customer[] | ((prev: Customer[]) => Customer[])) => {
    rawSetCustomers(prev => {
      const next = typeof value === 'function' ? value(prev) : value;
      return (next || []).filter((c: any) => c && c.id);
    });
  };

  const [salesInvoices, rawSetSalesInvoices] = useState<SalesInvoice[]>(() => {
    const loaded = loadFromStorage('shop_acc_sales_v2', INITIAL_SALES_INVOICES);
    return (loaded || []).filter((s: any) => s && s.id);
  });
  const setSalesInvoices = (value: SalesInvoice[] | ((prev: SalesInvoice[]) => SalesInvoice[])) => {
    rawSetSalesInvoices(prev => {
      const next = typeof value === 'function' ? value(prev) : value;
      return (next || []).filter((s: any) => s && s.id);
    });
  };

  const [purchaseInvoices, rawSetPurchaseInvoices] = useState<PurchaseInvoice[]>(() => {
    const loaded = loadFromStorage('shop_acc_purchases_v2', INITIAL_PURCHASE_INVOICES);
    return (loaded || []).filter((p: any) => p && p.id);
  });
  const setPurchaseInvoices = (value: PurchaseInvoice[] | ((prev: PurchaseInvoice[]) => PurchaseInvoice[])) => {
    rawSetPurchaseInvoices(prev => {
      const next = typeof value === 'function' ? value(prev) : value;
      return (next || []).filter((p: any) => p && p.id);
    });
  };

  const [vouchers, rawSetVouchers] = useState<PaymentVoucher[]>(() => {
    const loaded = loadFromStorage('shop_acc_vouchers_v2', INITIAL_VOUCHERS);
    return (loaded || []).filter((v: any) => v && v.id);
  });
  const setVouchers = (value: PaymentVoucher[] | ((prev: PaymentVoucher[]) => PaymentVoucher[])) => {
    rawSetVouchers(prev => {
      const next = typeof value === 'function' ? value(prev) : value;
      return (next || []).filter((v: any) => v && v.id);
    });
  };

  const [journalEntries, rawSetJournalEntries] = useState<JournalEntry[]>(() => {
    const loaded = loadFromStorage('shop_acc_journal_v2', INITIAL_JOURNAL_ENTRIES);
    return (loaded || []).filter((je: any) => je && je.id);
  });
  const setJournalEntries = (value: JournalEntry[] | ((prev: JournalEntry[]) => JournalEntry[])) => {
    rawSetJournalEntries(prev => {
      const next = typeof value === 'function' ? value(prev) : value;
      return (next || []).filter((je: any) => je && je.id);
    });
  };

  const [stockAdjustments, rawSetStockAdjustments] = useState<StockAdjustment[]>(() => {
    const loaded = loadFromStorage('shop_acc_stock_adj_v2', []);
    return (loaded || []).filter((sa: any) => sa && sa.id);
  });
  const setStockAdjustments = (value: StockAdjustment[] | ((prev: StockAdjustment[]) => StockAdjustment[])) => {
    rawSetStockAdjustments(prev => {
      const next = typeof value === 'function' ? value(prev) : value;
      return (next || []).filter((sa: any) => sa && sa.id);
    });
  };
  const [users, setUsers] = useState<User[]>(() => {
    const saved = loadFromStorage('shop_acc_users_v2', INITIAL_USERS);
    return Array.isArray(saved) && saved.length > 0 ? saved : INITIAL_USERS;
  });
  const [currentUser, setCurrentUser] = useState<User | null>(() =>
    loadFromStorage('shop_acc_current_user_v2', null)
  );

  const [orders, rawSetOrders] = useState<CustomerOrder[]>(() => {
    const loaded = loadFromStorage('shop_acc_orders_v2', []);
    return (loaded || []).filter((o: any) => o && o.id);
  });
  const setOrders = (value: CustomerOrder[] | ((prev: CustomerOrder[]) => CustomerOrder[])) => {
    rawSetOrders(prev => {
      const next = typeof value === 'function' ? value(prev) : value;
      return (next || []).filter((o: any) => o && o.id);
    });
  };

  const [fiscalYearArchives, rawSetFiscalYearArchives] = useState<FiscalYearArchive[]>(() => {
    const loaded = loadFromStorage('shop_acc_fiscal_archives_v2', []);
    return (loaded || []).filter((a: any) => a && a.id);
  });
  const setFiscalYearArchives = (value: FiscalYearArchive[] | ((prev: FiscalYearArchive[]) => FiscalYearArchive[])) => {
    rawSetFiscalYearArchives(prev => {
      const next = typeof value === 'function' ? value(prev) : value;
      return (next || []).filter((a: any) => a && a.id);
    });
  };

  const [showSwitchUserModal, setShowSwitchUserModal] = useState<boolean>(false);
  const [isIframe, setIsIframe] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsIframe(window.self !== window.top || window.location.hostname.includes('template.ai.studio'));
    }
  }, []);

  // Modal Print & Manual & PWA & Data Sync & Icon Customizer states
  const [printableInvoice, setPrintableInvoice] = useState<SalesInvoice | null>(null);
  const [showManualModal, setShowManualModal] = useState<boolean>(false);
  const [showPWAModal, setShowPWAModal] = useState<boolean>(false);
  const [showDataSyncModal, setShowDataSyncModal] = useState<boolean>(false);
  const [showAppIconModal, setShowAppIconModal] = useState<boolean>(false);
  const [showArchiveModal, setShowArchiveModal] = useState<boolean>(false);

  // Trigger direct PWA Installation if possible, otherwise open manual modal
  const handleTriggerInstallApp = async () => {
    const promptEvent = (window as any).deferredPrompt;
    if (promptEvent) {
      try {
        promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        if (outcome === 'accepted') {
          (window as any).deferredPrompt = null;
        }
      } catch (err) {
        console.error('PWA direct install prompt failed:', err);
        setShowPWAModal(true);
      }
    } else {
      setShowPWAModal(true);
    }
  };

  // Central Database Synchronization State and Hook
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');

  // LAST UPDATED TIMESTAMP STATE (For granular collection sync model)
  const [lastUpdated, setLastUpdated] = useState<any>(() => {
    const saved = loadFromStorage('shop_acc_last_updated_v2', 0);
    const defaultTime = typeof saved === 'number' ? saved : 0;
    const t = (saved && typeof saved === 'object' ? saved : {}) as any;
    return {
      settings: t.settings ?? defaultTime,
      accounts: t.accounts ?? defaultTime,
      products: t.products ?? defaultTime,
      categories: t.categories ?? defaultTime,
      suppliers: t.suppliers ?? defaultTime,
      customers: t.customers ?? defaultTime,
      salesInvoices: t.salesInvoices ?? defaultTime,
      purchaseInvoices: t.purchaseInvoices ?? defaultTime,
      vouchers: t.vouchers ?? defaultTime,
      journalEntries: t.journalEntries ?? defaultTime,
      stockAdjustments: t.stockAdjustments ?? defaultTime,
      users: t.users ?? defaultTime,
      orders: t.orders ?? defaultTime,
    };
  });

  const lastUpdatedRef = useRef(lastUpdated);
  useEffect(() => {
    lastUpdatedRef.current = lastUpdated;
  }, [lastUpdated]);

  const lastSyncedStateRef = useRef<Record<string, string>>({});
  const isServerSyncRef = useRef<boolean>(false);
  const mainContentRef = useRef<HTMLElement | null>(null);

  // Smooth scroll to the main content container whenever activeTab changes
  useEffect(() => {
    if (mainContentRef.current) {
      // First, scroll the main content container to the top so the view starts from the beginning
      mainContentRef.current.scrollTo({ top: 0 });
      
      // Only scroll the window down to the content if enableAutoScroll is set to true in settings
      if (settings.enableAutoScroll === true) {
        setTimeout(() => {
          mainContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
      }
    }
  }, [activeTab, settings.enableAutoScroll]);

  const addDeletedId = (id: string) => {
    try {
      const saved = localStorage.getItem('shop_acc_deleted_ids_v2');
      const list = saved ? JSON.parse(saved) : [];
      if (!list.includes(id)) {
        list.push(id);
        localStorage.setItem('shop_acc_deleted_ids_v2', JSON.stringify(list));
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
    users,
    orders,
    fiscalYearArchives
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
      users,
      orders,
      fiscalYearArchives
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
    users,
    orders,
    fiscalYearArchives
  ]);

  // Track any local changes to bump the local lastUpdated timestamp
  useEffect(() => {
    const collections = {
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
      users,
      orders,
      fiscalYearArchives
    };

    let hasChanges = false;
    const newTimestamps = { ...lastUpdatedRef.current };
    const now = Date.now();

    (Object.keys(collections) as Array<keyof typeof collections>).forEach((key) => {
      const stateStr = JSON.stringify(collections[key]);
      const lastSynced = lastSyncedStateRef.current[key];

      if (!lastSynced) {
        lastSyncedStateRef.current[key] = stateStr;
        return;
      }

      if (stateStr !== lastSynced) {
        newTimestamps[key] = now;
        lastSyncedStateRef.current[key] = stateStr;
        hasChanges = true;
      }
    });

    if (hasChanges) {
      setLastUpdated(newTimestamps);
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
    users,
    orders,
    fiscalYearArchives
  ]);

  useEffect(() => {
    let isMounted = true;
    let syncTimeout: any;
    let consecutiveFailures = 0;

    const doSync = async () => {
      if (!isMounted) return;
      setSyncStatus('syncing');

      try {
        const deletedSaved = localStorage.getItem('shop_acc_deleted_ids_v2');
        const deletedIds = deletedSaved ? JSON.parse(deletedSaved) : [];

        // Access the ABSOLUTE LATEST states via our ref to avoid closures & infinite loops
        const current = stateRef.current;

        const response = await fetch(getStoreUrl('/api/sync'), {
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
            orders: current.orders,
            fiscalYearArchives: current.fiscalYearArchives,
            deletedIds: deletedIds,
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

          const serverTimestamps = db.timestamps || {};
          const clientTimestamps = lastUpdatedRef.current || {};

          let hasServerUpdates = false;
          (Object.keys(clientTimestamps) as Array<keyof typeof clientTimestamps>).forEach((key) => {
            const serverTime = Number(serverTimestamps[key]) || Number(db.lastUpdated) || 0;
            const clientTime = Number(clientTimestamps[key]) || 0;
            if (serverTime > clientTime) {
              hasServerUpdates = true;
            }
          });

          if (hasServerUpdates) {
            const updateIfNewer = (key: string, serverData: any, activeData: any, setter: (val: any) => void) => {
              const serverTime = Number(serverTimestamps[key]) || Number(db.lastUpdated) || 0;
              const clientTime = Number(clientTimestamps[key]) || 0;
              if (serverTime > clientTime) {
                if (JSON.stringify(serverData) !== JSON.stringify(activeData)) {
                  setter(serverData);
                }
                return serverTime;
              }
              return clientTime;
            };

            const updatedTimestamps = { ...clientTimestamps };

            updatedTimestamps.settings = updateIfNewer('settings', db.settings, active.settings, setSettings);
            updatedTimestamps.accounts = updateIfNewer('accounts', db.accounts, active.accounts, setAccounts);
            updatedTimestamps.products = updateIfNewer('products', db.products, active.products, setProducts);
            updatedTimestamps.categories = updateIfNewer('categories', db.categories, active.categories, setCategories);
            updatedTimestamps.suppliers = updateIfNewer('suppliers', db.suppliers, active.suppliers, setSuppliers);
            updatedTimestamps.customers = updateIfNewer('customers', db.customers, active.customers, setCustomers);
            updatedTimestamps.salesInvoices = updateIfNewer('salesInvoices', db.salesInvoices, active.salesInvoices, setSalesInvoices);
            updatedTimestamps.purchaseInvoices = updateIfNewer('purchaseInvoices', db.purchaseInvoices, active.purchaseInvoices, setPurchaseInvoices);
            updatedTimestamps.vouchers = updateIfNewer('vouchers', db.vouchers, active.vouchers, setVouchers);
            updatedTimestamps.journalEntries = updateIfNewer('journalEntries', db.journalEntries, active.journalEntries, setJournalEntries);
            updatedTimestamps.stockAdjustments = updateIfNewer('stockAdjustments', db.stockAdjustments, active.stockAdjustments, setStockAdjustments);
            updatedTimestamps.orders = updateIfNewer('orders', db.orders, active.orders, setOrders);
            updatedTimestamps.fiscalYearArchives = updateIfNewer('fiscalYearArchives', db.fiscalYearArchives, active.fiscalYearArchives, setFiscalYearArchives);
            if (db.users && Array.isArray(db.users) && db.users.length > 0) {
              updatedTimestamps.users = updateIfNewer('users', db.users, active.users, setUsers);
            }

            // Set the synced ref keys so our useEffect state-change tracking doesn't think we modified it locally
            (Object.keys(lastSyncedStateRef.current) as Array<keyof typeof lastSyncedStateRef.current>).forEach((key) => {
              if (db[key]) {
                lastSyncedStateRef.current[key] = JSON.stringify(db[key]);
              }
            });

            isServerSyncRef.current = true;
            setLastUpdated(updatedTimestamps);
          }

          if (deletedIds.length > 0) {
            localStorage.setItem('shop_acc_deleted_ids_v2', JSON.stringify([]));
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

    if (isServerSyncRef.current) {
      isServerSyncRef.current = false;
      // Do not trigger immediate sync, but set standard polling timeout
      syncTimeout = setTimeout(doSync, 8000);
    } else {
      // If lastUpdated changes locally, trigger the sync within 500ms (debounced) instead of waiting 8 seconds!
      syncTimeout = setTimeout(doSync, 500);
    }

    return () => {
      isMounted = false;
      clearTimeout(syncTimeout);
    };
  }, [lastUpdated]);

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
    saveToStorage('shop_acc_settings_v2', settings);
    saveToStorage('shop_acc_accounts_v2', accounts);
    saveToStorage('shop_acc_products_v2', products);
    saveToStorage('shop_acc_suppliers_v2', suppliers);
    saveToStorage('shop_acc_customers_v2', customers);
    saveToStorage('shop_acc_sales_v2', salesInvoices);
    saveToStorage('shop_acc_purchases_v2', purchaseInvoices);
    saveToStorage('shop_acc_vouchers_v2', vouchers);
    saveToStorage('shop_acc_journal_v2', journalEntries);
    saveToStorage('shop_acc_stock_adj_v2', stockAdjustments);
    saveToStorage('shop_acc_last_updated_v2', lastUpdated);
    saveToStorage('shop_acc_orders_v2', orders);
  };

  // Sync to local storage
  useEffect(() => saveToStorage('shop_acc_settings_v2', settings), [settings]);
  useEffect(() => saveToStorage('shop_acc_accounts_v2', accounts), [accounts]);
  useEffect(() => saveToStorage('shop_acc_categories_v2', categories), [categories]);
  useEffect(() => saveToStorage('shop_acc_last_updated_v2', lastUpdated), [lastUpdated]);

  // Sync shop summary to Firebase Firestore for cross-device cloud persistence
  useEffect(() => {
    const storeId = getStoreQueryParam() || 'main';
    const timer = setTimeout(() => {
      FirebaseSyncService.saveStoreData(storeId, {
        shopName: settings.shopName || 'متجر التاجر الذكي',
        productsCount: products.length,
        salesCount: salesInvoices.length,
        customersCount: customers.length,
        suppliersCount: suppliers.length,
        lastActive: new Date().toISOString()
      }).catch(() => {});
    }, 1500);
    return () => clearTimeout(timer);
  }, [settings.shopName, products.length, salesInvoices.length, customers.length, suppliers.length]);

  // Keep-alive heartbeat interval to maintain active session
  useEffect(() => {
    const pingInterval = setInterval(() => {
      fetch('/', { method: 'HEAD' }).catch(() => {});
    }, 25000); // Send light heartbeat head request every 25 seconds
    return () => clearInterval(pingInterval);
  }, []);
  useEffect(() => saveToStorage('shop_acc_products_v2', products), [products]);
  useEffect(() => saveToStorage('shop_acc_suppliers_v2', suppliers), [suppliers]);
  useEffect(() => saveToStorage('shop_acc_customers_v2', customers), [customers]);
  useEffect(() => saveToStorage('shop_acc_sales_v2', salesInvoices), [salesInvoices]);
  useEffect(() => saveToStorage('shop_acc_purchases_v2', purchaseInvoices), [purchaseInvoices]);
  useEffect(() => saveToStorage('shop_acc_vouchers_v2', vouchers), [vouchers]);
  useEffect(() => saveToStorage('shop_acc_journal_v2', journalEntries), [journalEntries]);
  useEffect(() => saveToStorage('shop_acc_stock_adj_v2', stockAdjustments), [stockAdjustments]);
  useEffect(() => saveToStorage('shop_acc_users_v2', users), [users]);
  useEffect(() => saveToStorage('shop_acc_current_user_v2', currentUser), [currentUser]);
  useEffect(() => saveToStorage('shop_acc_orders_v2', orders), [orders]);
  useEffect(() => saveToStorage('shop_acc_fiscal_archives_v2', fiscalYearArchives), [fiscalYearArchives]);

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
    if (activeTab !== 'settings' && activeTab !== 'users' && activeTab !== 'orders') {
      const permKey = activeTab as keyof User['permissions'];
      if (currentUser.permissions && currentUser.permissions[permKey] === false) {
        const allowedTabs: TabType[] = [
          'dashboard', 'pos', 'products', 'purchases', 'customers', 
          'suppliers', 'chartOfAccounts', 'journal', 'reports', 'orders'
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
      const response = await fetch(getStoreUrl('/api/sync'), {
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
          // Set the synced ref keys so our useEffect state-change tracking doesn't think we modified it locally
          (Object.keys(lastSyncedStateRef.current) as Array<keyof typeof lastSyncedStateRef.current>).forEach((key) => {
            if (db[key]) {
              lastSyncedStateRef.current[key] = JSON.stringify(db[key]);
            }
          });

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
          isServerSyncRef.current = true;

          try {
            localStorage.removeItem('cached_customer_store_data');
          } catch (e) {
            console.error('Failed to clear customer store cache:', e);
          }

          const defaultTime = db.lastUpdated || Date.now();
          const t = db.timestamps && typeof db.timestamps === 'object' ? db.timestamps : {};
          setLastUpdated({
            settings: t.settings ?? defaultTime,
            accounts: t.accounts ?? defaultTime,
            products: t.products ?? defaultTime,
            categories: t.categories ?? defaultTime,
            suppliers: t.suppliers ?? defaultTime,
            customers: t.customers ?? defaultTime,
            salesInvoices: t.salesInvoices ?? defaultTime,
            purchaseInvoices: t.purchaseInvoices ?? defaultTime,
            vouchers: t.vouchers ?? defaultTime,
            journalEntries: t.journalEntries ?? defaultTime,
            stockAdjustments: t.stockAdjustments ?? defaultTime,
            users: t.users ?? defaultTime,
          });
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

      const response = await fetch(getStoreUrl('/api/sync'), {
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
          // Set the synced ref keys so our useEffect state-change tracking doesn't think we modified it locally
          (Object.keys(lastSyncedStateRef.current) as Array<keyof typeof lastSyncedStateRef.current>).forEach((key) => {
            if (db[key]) {
              lastSyncedStateRef.current[key] = JSON.stringify(db[key]);
            }
          });

          setProducts(db.products);
          setSuppliers(db.suppliers);
          setCustomers(db.customers);
          setSalesInvoices(db.salesInvoices);
          setPurchaseInvoices(db.purchaseInvoices);
          setVouchers(db.vouchers);
          setJournalEntries(db.journalEntries);
          setStockAdjustments(db.stockAdjustments);
          isServerSyncRef.current = true;

          try {
            localStorage.removeItem('cached_customer_store_data');
          } catch (e) {
            console.error('Failed to clear customer store cache:', e);
          }

          const defaultTime = db.lastUpdated || Date.now();
          const t = db.timestamps && typeof db.timestamps === 'object' ? db.timestamps : {};
          setLastUpdated({
            settings: t.settings ?? defaultTime,
            accounts: t.accounts ?? defaultTime,
            products: t.products ?? defaultTime,
            categories: t.categories ?? defaultTime,
            suppliers: t.suppliers ?? defaultTime,
            customers: t.customers ?? defaultTime,
            salesInvoices: t.salesInvoices ?? defaultTime,
            purchaseInvoices: t.purchaseInvoices ?? defaultTime,
            vouchers: t.vouchers ?? defaultTime,
            journalEntries: t.journalEntries ?? defaultTime,
            stockAdjustments: t.stockAdjustments ?? defaultTime,
            users: t.users ?? defaultTime,
          });
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

  // Handler: Close Fiscal Year (automated rollover of accounts, stock and balances, resets invoices with an opening balanced entry)
  const handleCloseFiscalYear = async () => {
    try {
      // 1. Calculate balances
      const cashBal = calculateAccountBalance('1010', accounts, journalEntries).netBalance;
      const bankBal = calculateAccountBalance('1020', accounts, journalEntries).netBalance;
      const inventoryVal = products.reduce((sum, p) => sum + (p.stock * p.costPrice), 0);

      // 2. Customers and Suppliers new opening balances
      const updatedCustomers = customers.map(c => {
        const bal = calculateCustomerBalance(c, salesInvoices, vouchers);
        return {
          ...c,
          openingBalance: Number(bal.toFixed(2))
        };
      });

      const updatedSuppliers = suppliers.map(s => {
        const bal = calculateSupplierBalance(s, purchaseInvoices, vouchers);
        return {
          ...s,
          openingBalance: Number(bal.toFixed(2))
        };
      });

      const totalReceivables = updatedCustomers.reduce((sum, c) => sum + c.openingBalance, 0);
      const totalPayables = updatedSuppliers.reduce((sum, s) => sum + s.openingBalance, 0);

      // 3. Create Opening Entry
      const todayStr = new Date().toISOString().split('T')[0];
      const entryId = `journal-opening-${Date.now()}`;
      
      const lines: any[] = [];
      
      if (cashBal > 0) {
        lines.push({ accountCode: '1010', accountName: 'الصندوق والنقدية', debit: cashBal, credit: 0, memo: 'رصيد افتتاح الدورة المالية الجديدة' });
      } else if (cashBal < 0) {
        lines.push({ accountCode: '1010', accountName: 'الصندوق والنقدية', debit: 0, credit: Math.abs(cashBal), memo: 'رصيد افتتاح دائن للدورة الجديدة' });
      }
      
      if (bankBal > 0) {
        lines.push({ accountCode: '1020', accountName: 'حساب البنك / المدى', debit: bankBal, credit: 0, memo: 'رصيد افتتاح الدورة المالية الجديدة' });
      } else if (bankBal < 0) {
        lines.push({ accountCode: '1020', accountName: 'حساب البنك / المدى', debit: 0, credit: Math.abs(bankBal), memo: 'رصيد افتتاح دائن للدورة الجديدة' });
      }

      if (inventoryVal > 0) {
        lines.push({ accountCode: '1030', accountName: 'مخزون البضائع (الأصناف)', debit: inventoryVal, credit: 0, memo: 'بضاعة أول المدة للدورة الجديدة' });
      }

      if (totalReceivables > 0) {
        lines.push({ accountCode: '1040', accountName: 'ذمم الزبائن والعملاء', debit: totalReceivables, credit: 0, memo: 'إجمالي أرصدة الزبائن الافتتاحية المدونة' });
      }

      if (totalPayables > 0) {
        lines.push({ accountCode: '2010', accountName: 'ذمم الموردين', debit: 0, credit: totalPayables, memo: 'إجمالي أرصدة الموردين الافتتاحية المدونة' });
      }

      // Compute total debits and credits currently in lines
      const totalDebitsInLines = lines.reduce((sum, l) => sum + l.debit, 0);
      const totalCreditsInLines = lines.reduce((sum, l) => sum + l.credit, 0);
      const capitalDiff = totalDebitsInLines - totalCreditsInLines;

      if (capitalDiff > 0) {
        lines.push({ accountCode: '3010', accountName: 'رأس مال المتجر', debit: 0, credit: capitalDiff, memo: 'رأس مال الدورة الحالية المتوازن' });
      } else if (capitalDiff < 0) {
        lines.push({ accountCode: '3010', accountName: 'رأس مال المتجر', debit: Math.abs(capitalDiff), credit: 0, memo: 'رأس مال الدورة الحالية المتوازن' });
      }

      const openingEntry: any = {
        id: entryId,
        entryNumber: `JV-OPEN-${new Date().getFullYear()}`,
        date: todayStr,
        description: `قيد افتتاح الدورة المالية الجديدة لعام ${new Date().getFullYear()}`,
        lines: lines,
        referenceType: 'manual',
        createdAt: new Date().toISOString()
      };

      // Create an archived snapshot of the previous state before wiping
      const archiveId = `archive-${Date.now()}`;
      const closedYear = new Date().getFullYear() - 1; // Or current year if closing it
      const newArchive: FiscalYearArchive = {
        id: archiveId,
        year: closedYear,
        closedAt: todayStr,
        data: {
          salesInvoices: [...salesInvoices],
          purchaseInvoices: [...purchaseInvoices],
          vouchers: [...vouchers],
          journalEntries: [...journalEntries],
          stockAdjustments: [...stockAdjustments],
          products: [...products],
          customers: [...customers],
          suppliers: [...suppliers]
        }
      };
      const updatedArchives = [...fiscalYearArchives, newArchive];

      const response = await fetch(getStoreUrl('/api/sync'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: settings,
          accounts: accounts,
          products: products,
          categories: categories,
          suppliers: updatedSuppliers,
          customers: updatedCustomers,
          salesInvoices: [],
          purchaseInvoices: [],
          vouchers: [],
          journalEntries: [openingEntry],
          stockAdjustments: [],
          users: users,
          fiscalYearArchives: updatedArchives,
          deletedIds: []
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.db) {
          const db = result.db;
          
          (Object.keys(lastSyncedStateRef.current) as Array<keyof typeof lastSyncedStateRef.current>).forEach((key) => {
            if (db[key]) {
              lastSyncedStateRef.current[key] = JSON.stringify(db[key]);
            }
          });

          setProducts(db.products);
          setSuppliers(db.suppliers);
          setCustomers(db.customers);
          setSalesInvoices(db.salesInvoices);
          setPurchaseInvoices(db.purchaseInvoices);
          setVouchers(db.vouchers);
          setJournalEntries(db.journalEntries);
          setStockAdjustments(db.stockAdjustments);
          setFiscalYearArchives(db.fiscalYearArchives || []);
          isServerSyncRef.current = true;

          const defaultTime = db.lastUpdated || Date.now();
          const t = db.timestamps && typeof db.timestamps === 'object' ? db.timestamps : {};
          setLastUpdated({
            settings: t.settings ?? defaultTime,
            accounts: t.accounts ?? defaultTime,
            products: t.products ?? defaultTime,
            categories: t.categories ?? defaultTime,
            suppliers: t.suppliers ?? defaultTime,
            customers: t.customers ?? defaultTime,
            salesInvoices: t.salesInvoices ?? defaultTime,
            purchaseInvoices: t.purchaseInvoices ?? defaultTime,
            vouchers: t.vouchers ?? defaultTime,
            journalEntries: t.journalEntries ?? defaultTime,
            stockAdjustments: t.stockAdjustments ?? defaultTime,
            users: t.users ?? defaultTime,
            fiscalYearArchives: t.fiscalYearArchives ?? defaultTime,
          });

          alert('🎉 تم إغلاق السنة المالية بنجاح تام وبضغطة زر واحدة! تم تدوير الأرصدة المستحقة وإدراج القيد الافتتاحي المتوازن للعام الجديد وتصفير الفواتير القديمة بنجاح.');
        }
      }
    } catch (e) {
      console.error('Fiscal year closure error:', e);
      alert('حدث خطأ أثناء الاتصال بالخادم لإغلاق السنة المالية.');
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
        if (!p || !p.id) return p;
        let newStock = p.stock;

        // Revert old quantity if editing
        if (oldInvoice) {
          const oldItem = oldInvoice.items.find(i => i.productId === p.id);
          if (oldItem) {
            const factor = (oldItem.isSubUnit && p.subUnitsPerUnit) ? (1 / p.subUnitsPerUnit) : 1;
            newStock += oldItem.quantity * factor;
          }
        }

        // Subtract new quantity (only if NOT a converted customer order whose stock was already decremented on the server!)
        if (!invoice.notes?.includes('طلب إلكتروني رقم')) {
          const newItem = invoice.items.find(i => i.productId === p.id);
          if (newItem) {
            const factor = (newItem.isSubUnit && p.subUnitsPerUnit) ? (1 / p.subUnitsPerUnit) : 1;
            newStock = Math.max(0, newStock - newItem.quantity * factor);
          }
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
        if (!p || !p.id) return p;
        let newStock = p.stock;

        // Revert old stock increase if editing
        if (oldInvoice) {
          const oldItem = oldInvoice.items.find(i => i.productId === p.id);
          if (oldItem) {
            const factor = (oldItem.isSubUnit && p.subUnitsPerUnit) ? (1 / p.subUnitsPerUnit) : 1;
            newStock = Math.max(0, newStock - oldItem.quantity * factor);
          }
        }

        // Apply new stock increase
        const newItem = invoice.items.find(i => i.productId === p.id);
        if (newItem) {
          const factor = (newItem.isSubUnit && p.subUnitsPerUnit) ? (1 / p.subUnitsPerUnit) : 1;
          newStock += newItem.quantity * factor;
          
          // Cost price per carton: if item purchased as piece, cost price per carton is piece price * subUnitsPerUnit
          const costPricePerCarton = newItem.isSubUnit && p.subUnitsPerUnit 
            ? newItem.unitPrice * p.subUnitsPerUnit 
            : newItem.unitPrice;

          return {
            ...p,
            stock: newStock,
            costPrice: newItem.unitPrice > 0 ? costPricePerCarton : p.costPrice
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
        if (!p || !p.id) return p;
        const item = invToDelete.items.find(i => i.productId === p.id);
        if (item) {
          const factor = (item.isSubUnit && p.subUnitsPerUnit) ? (1 / p.subUnitsPerUnit) : 1;
          return { ...p, stock: Math.max(0, p.stock - item.quantity * factor) };
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
        if (!p || !p.id) return p;
        const item = invToDelete.items.find(i => i.productId === p.id);
        if (item) {
          const factor = (item.isSubUnit && p.subUnitsPerUnit) ? (1 / p.subUnitsPerUnit) : 1;
          return { ...p, stock: p.stock + item.quantity * factor };
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
        onOpenPWA={handleTriggerInstallApp}
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
          pendingOrdersCount={orders.filter(o => o.status === 'pending').length}
          onOpenDataSync={() => setShowDataSyncModal(true)}
          onOpenAppIconCustomizer={() => setShowAppIconModal(true)}
          onOpenPWA={handleTriggerInstallApp}
          shopName={settings.shopName}
          logoUrl={settings.logoUrl}
          currentUser={currentUser}
        />

        {/* Dynamic Content View */}
        <main ref={mainContentRef} className="flex-1 bg-slate-50 overflow-y-auto pb-10">
          
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
              onOpenCustomers={() => setActiveTab('customers')}
              onOpenSuppliers={() => setActiveTab('suppliers')}
              onOpenChartOfAccounts={() => setActiveTab('chartOfAccounts')}
              onOpenReports={() => setActiveTab('reports')}
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
              onAddProduct={handleAddProduct}
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
              onCloseFiscalYear={handleCloseFiscalYear}
              onOpenArchive={() => setShowArchiveModal(true)}
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

      {/* Fiscal Year Archive Browser Modal */}
      <FiscalYearArchiveModal
        isOpen={showArchiveModal}
        onClose={() => setShowArchiveModal(false)}
        archives={fiscalYearArchives}
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
