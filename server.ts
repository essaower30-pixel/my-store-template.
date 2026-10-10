import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit for base64 product images
  app.use(express.json({ limit: "15mb" }));
  app.use(express.static(path.join(process.cwd(), "public")));

  // Dynamic PWA Manifest Route
  app.get("/api/manifest.json", (req, res) => {
    const title = (req.query.title as string) || "التاجر الذكي (بقالة)";
    const icon = (req.query.icon as string) || "/icon.jpg";

    const isDefaultIcon = icon === "/icon.jpg" || icon === "icon.jpg" || icon.includes("icon-192") || icon.includes("icon-512");
    
    const iconsList = isDefaultIcon 
      ? [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable"
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      : [
          {
            src: icon,
            sizes: "192x192",
            type: icon.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg",
            purpose: "any"
          },
          {
            src: icon,
            sizes: "512x512",
            type: icon.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg",
            purpose: "any"
          },
          {
            src: icon,
            sizes: "192x192",
            type: icon.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg",
            purpose: "maskable"
          },
          {
            src: icon,
            sizes: "512x512",
            type: icon.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg",
            purpose: "maskable"
          }
        ];

    res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    
    const storeVal = (req.query.store as string || (req.query.isStore === 'true' ? 'true' : '')) || '';
    const startUrl = storeVal ? `/?store=${encodeURIComponent(storeVal)}` : "/";

    let finalTitle = title;
    if (storeVal && storeVal.startsWith("store_")) {
      const branchNum = storeVal.replace("store_", "");
      finalTitle = `التاجر - فرع ${branchNum}`;
    } else if (storeVal === "true") {
      finalTitle = "التاجر - متجر الشريك";
    }

    res.json({
      id: startUrl,
      short_name: finalTitle.length > 12 ? 'التاجر الذكي' : finalTitle,
      name: finalTitle,
      description: "برنامج محاسبة وإدارة البقالة والسوبرماركت المتكامل",
      icons: iconsList,
      start_url: startUrl,
      scope: "/",
      background_color: "#0f172a",
      theme_color: "#059669",
      display: "standalone",
      orientation: "portrait",
      lang: "ar",
      dir: "rtl"
    });
  });

  // Global in-memory custom icon storage for PWA home screen manifest
  let customIconBuffer: Buffer | null = null;
  let customIconMime = "image/jpeg";

  app.post("/api/upload-app-icon", (req, res) => {
    try {
      const { imageBase64 } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: "لم يتم إرسال بيانات الصورة" });
      }
      const matches = imageBase64.match(/^data:(image\/\w+);base64,(.+)$/);
      if (matches) {
        customIconMime = matches[1];
        customIconBuffer = Buffer.from(matches[2], "base64");
      } else {
        customIconBuffer = Buffer.from(imageBase64, "base64");
      }
      return res.json({ 
        success: true, 
        iconUrl: `/api/custom-icon?v=${Date.now()}` 
      });
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || "فشل معالجة أيقونة التطبيق" });
    }
  });

  app.get("/api/custom-icon", (req, res) => {
    if (customIconBuffer) {
      res.setHeader("Content-Type", customIconMime);
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.send(customIconBuffer);
    } else {
      return res.redirect("/icon.jpg");
    }
  });

  // Central Database Sync Endpoints
  const DB_FILE = path.join(process.cwd(), "db.json");

  function getStoreId(req: any) {
    return (req.headers["x-store-id"] || req.query.storeId || req.query.store || "") as string;
  }

  function getDatabasePath(storeId?: string) {
    if (storeId && storeId.trim() !== "" && storeId !== "main") {
      const safeStoreId = storeId.replace(/[^a-zA-Z0-9_\-]/g, "");
      if (safeStoreId) {
        return path.join(process.cwd(), `db_${safeStoreId}.json`);
      }
    }
    return DB_FILE;
  }

  function readDatabase(storeId?: string) {
    const dbFile = getDatabasePath(storeId);
    if (fs.existsSync(dbFile)) {
      try {
        const db = JSON.parse(fs.readFileSync(dbFile, "utf-8"));
        if (db && typeof db === "object") {
          db.settings = db.settings || {};
          db.accounts = db.accounts || [];
          db.products = db.products || [];
          db.categories = db.categories || [];
          db.suppliers = db.suppliers || [];
          db.customers = db.customers || [];
          db.salesInvoices = db.salesInvoices || [];
          db.purchaseInvoices = db.purchaseInvoices || [];
          db.vouchers = db.vouchers || [];
          db.journalEntries = db.journalEntries || [];
          db.stockAdjustments = db.stockAdjustments || [];
          db.users = db.users || [];
          db.orders = db.orders || [];
          db.fiscalYearArchives = db.fiscalYearArchives || [];

          // Migrate/Clean users if it's a sub-store and they were copied from the main manager app
          if (storeId && storeId.trim() !== "" && storeId !== "main") {
            const mainDbFile = getDatabasePath();
            if (fs.existsSync(mainDbFile)) {
              try {
                const mainDb = JSON.parse(fs.readFileSync(mainDbFile, "utf-8"));
                if (mainDb && Array.isArray(mainDb.users)) {
                  const mainUsernames = new Set((mainDb.users || []).map((u: any) => u.username));
                  const hasMainCashiers = db.users.some((u: any) => u.username !== 'admin' && mainUsernames.has(u.username));
                  const hasCustomUsers = db.users.some((u: any) => !mainUsernames.has(u.username));

                  // If they have main cashiers but no custom users, let's reset to default admin
                  if (hasMainCashiers && !hasCustomUsers) {
                    console.log(`Cleaning up copied main users for sub-store ${storeId}`);
                    db.users = [
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
                    fs.writeFileSync(dbFile, JSON.stringify(db, null, 2), "utf-8");
                  }
                }
              } catch (err) {
                console.error("Error doing user cleanup migration:", err);
              }
            }
          }
        }
        return db;
      } catch (e) {
        console.error("Error reading database file:", e);
      }
    } else if (storeId && storeId.trim() !== "" && storeId !== "main") {
      const mainDb = readDatabase();
      if (mainDb) {
        const cleanDb = {
          settings: {
            ...mainDb.settings,
            shopName: `فرع ${storeId}`,
            appUrl: mainDb.settings.appUrl ? `${mainDb.settings.appUrl}?store=${encodeURIComponent(storeId)}` : ""
          },
          accounts: mainDb.accounts || [],
          products: [],
          categories: mainDb.categories || [],
          suppliers: [],
          customers: [
            {
              id: 'cust-cash',
              code: 'CUST-00',
              name: 'زبون نقدي (عام)',
              phone: '0000000000',
              creditLimit: 0,
              openingBalance: 0,
              notes: 'زبون المبيعات المباشرة بالصندوق'
            }
          ],
          salesInvoices: [],
          purchaseInvoices: [],
          vouchers: [],
          journalEntries: [],
          stockAdjustments: [],
          users: [
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
          ],
          orders: [],
          fiscalYearArchives: []
        };
        writeDatabase(cleanDb, storeId);
        return cleanDb;
      }
    }
    return null;
  }

  function writeDatabase(data: any, storeId?: string) {
    const dbFile = getDatabasePath(storeId);
    try {
      fs.writeFileSync(dbFile, JSON.stringify(data, null, 2), "utf-8");
    } catch (e) {
      console.error("Error writing database file:", e);
    }
  }

  // Public customer-facing storefront endpoints
  app.get("/api/customer-store-data", (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    
    const storeId = getStoreId(req);
    const db = readDatabase(storeId);
    if (!db) {
      return res.status(404).json({ success: false, message: "Database not found" });
    }
    // Return only active products (stock > 0 and showInStore !== false), settings and categories
    const activeProducts = (db.products || []).filter((p: any) => p && p.stock > 0 && p.showInStore !== false);
    return res.json({
      success: true,
      settings: db.settings || {},
      categories: db.categories || [],
      products: activeProducts
    });
  });

  app.get("/api/orders/track", (req, res) => {
    try {
      const storeId = getStoreId(req);
      const db = readDatabase(storeId);
      if (!db) {
        return res.status(404).json({ success: false, message: "Database not found" });
      }
      const idsQuery = req.query.ids as string;
      if (!idsQuery) {
        return res.json({ success: true, orders: [] });
      }
      const ids = idsQuery.split(",");
      const matchedOrders = (db.orders || []).filter((o: any) => o && ids.includes(o.id));
      return res.json({ success: true, orders: matchedOrders });
    } catch (e: any) {
      console.error("Error tracking orders:", e);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  });

  app.post("/api/orders", (req, res) => {
    try {
      const storeId = getStoreId(req);
      const db = readDatabase(storeId);
      if (!db) {
        return res.status(404).json({ success: false, message: "Database not found" });
      }

      const { customerName, customerPhone, customerAddress, deliveryMethod, items, notes, paymentMethod, paymentReceiptNumber, paymentReceiptImage, storeId: payloadStoreId } = req.body;
      if (!customerName || !customerPhone || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: "بيانات الطلب غير مكتملة" });
      }

      let subtotal = 0;
      const validatedItems = [];

      for (const item of items) {
        const prod = (db.products || []).find((p: any) => p.id === item.productId);
        if (!prod) {
          return res.status(400).json({ success: false, message: `المنتج غير موجود: ${item.productName}` });
        }

        const isSubUnit = !!item.isSubUnit && !!prod.hasSubUnits;
        const factor = isSubUnit ? (1 / (prod.subUnitsPerUnit || 1)) : 1;
        const requiredStock = item.quantity * factor;

        if (prod.stock < requiredStock) {
          return res.status(400).json({ 
            success: false, 
            message: `الكمية المطلوبة من (${prod.name}) غير متوفرة. المتبقي في المخزن: ${prod.stock}` 
          });
        }
        
        const unitPrice = isSubUnit 
          ? (prod.subUnitSellingPrice || (prod.sellingPrice / (prod.subUnitsPerUnit || 1))) 
          : prod.sellingPrice;

        const itemTotal = item.quantity * unitPrice;
        subtotal += itemTotal;
        validatedItems.push({
          productId: prod.id,
          barcode: prod.barcode,
          productName: prod.name,
          unit: isSubUnit ? (prod.subUnitName || "حبة") : prod.unit,
          quantity: item.quantity,
          unitPrice: unitPrice,
          discount: 0,
          total: itemTotal,
          isSubUnit: isSubUnit
        });

        // Decrement stock in real time
        prod.stock -= requiredStock;
      }

      const taxRate = db.settings?.enableTax ? (db.settings?.defaultTaxRate || 0) : 0;
      const taxAmount = Math.round((subtotal * (taxRate / 100)) * 100) / 100;
      
      const deliveryFee = deliveryMethod === 'delivery' ? Number(db.settings?.deliveryFee || 0) : 0;
      const netTotal = subtotal + taxAmount + deliveryFee;

      const orderCount = (db.orders || []).length + 1;
      const orderNumber = `ORD-${Date.now().toString().slice(-4)}-${orderCount}`;

      const newOrder = {
        id: `ord-${Date.now()}`,
        orderNumber,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('ar-EG', { hour12: false }).slice(0, 5),
        customerName,
        customerPhone,
        customerAddress: customerAddress || "",
        deliveryMethod,
        items: validatedItems,
        subtotal,
        taxAmount,
        deliveryFee,
        netTotal,
        status: 'pending',
        notes: notes || "",
        paymentMethod: paymentMethod || "cash",
        paymentReceiptNumber: paymentReceiptNumber || "",
        paymentReceiptImage: paymentReceiptImage || "",
        storeId: payloadStoreId || storeId || "main"
      };

      db.orders = db.orders || [];
      db.orders.push(newOrder);

      db.timestamps = db.timestamps || {};
      db.timestamps.products = Date.now();
      db.timestamps.orders = Date.now();
      db.lastUpdated = Date.now();

      writeDatabase(db, storeId);

      return res.json({ 
        success: true, 
        order: newOrder,
        message: "تم تسجيل طلبك بنجاح!" 
      });

    } catch (e: any) {
      console.error("Error placing order:", e);
      return res.status(500).json({ success: false, message: e?.message || "Internal server error" });
    }
  });

  app.get("/api/sync", (req, res) => {
    const storeId = getStoreId(req);
    const db = readDatabase(storeId);
    if (db) {
      return res.json({ success: true, db });
    }
    return res.json({ success: false, message: "No database file yet" });
  });

  app.post("/api/sync", (req, res) => {
    try {
      const {
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
        deletedIds,
        lastUpdated: clientLastUpdatedRaw
      } = req.body;

      // Get granular timestamps helper
      const getTimestamps = (raw: any) => {
        const defaultTime = typeof raw === "number" ? raw : (raw && typeof raw.lastUpdated === "number" ? raw.lastUpdated : 0);
        const t = raw && typeof raw === "object" ? (raw.timestamps || raw) : {};
        return {
          settings: Number(t.settings) || defaultTime,
          accounts: Number(t.accounts) || defaultTime,
          products: Number(t.products) || defaultTime,
          categories: Number(t.categories) || defaultTime,
          suppliers: Number(t.suppliers) || defaultTime,
          customers: Number(t.customers) || defaultTime,
          salesInvoices: Number(t.salesInvoices) || defaultTime,
          purchaseInvoices: Number(t.purchaseInvoices) || defaultTime,
          vouchers: Number(t.vouchers) || defaultTime,
          journalEntries: Number(t.journalEntries) || defaultTime,
          stockAdjustments: Number(t.stockAdjustments) || defaultTime,
          users: Number(t.users) || defaultTime,
          orders: Number(t.orders) || defaultTime
        };
      };

      const clientTimestamps = getTimestamps(clientLastUpdatedRaw);
      const storeId = getStoreId(req);
      let db = readDatabase(storeId);

      // If resetting or clearing all data, overwrite and return immediately to prevent standard merge
      if (req.body.isReset || req.body.isClearAll) {
        db = {
          settings: settings || db?.settings || {},
          accounts: accounts || db?.accounts || [],
          products: products || [],
          categories: categories || db?.categories || [],
          suppliers: suppliers || [],
          customers: customers || [],
          salesInvoices: salesInvoices || [],
          purchaseInvoices: purchaseInvoices || [],
          vouchers: vouchers || [],
          journalEntries: journalEntries || [],
          stockAdjustments: stockAdjustments || [],
          users: users || db?.users || [], // Keep existing users
          orders: orders || db?.orders || [],
          fiscalYearArchives: db?.fiscalYearArchives || [],
          lastUpdated: Date.now(),
          timestamps: clientTimestamps
        };
        // Sanitize appUrl
        if (db.settings.appUrl && (db.settings.appUrl.includes("service-4115.ai.studio") || db.settings.appUrl.includes("vice-4115.ai.studio"))) {
          db.settings.appUrl = "";
        }
        writeDatabase(db, storeId);
        return res.json({ success: true, db });
      }

      if (!db) {
        const now = Date.now();
        db = {
          settings: settings || {},
          accounts: accounts || [],
          products: products || [],
          categories: categories || [],
          suppliers: suppliers || [],
          customers: customers || [],
          salesInvoices: salesInvoices || [],
          purchaseInvoices: purchaseInvoices || [],
          vouchers: vouchers || [],
          journalEntries: journalEntries || [],
          stockAdjustments: stockAdjustments || [],
          users: users || [],
          orders: orders || [],
          fiscalYearArchives: req.body.fiscalYearArchives || [],
          lastUpdated: now,
          timestamps: clientTimestamps
        };
        // Sanitize appUrl in initial settings
        if (db.settings.appUrl && (db.settings.appUrl.includes("service-4115.ai.studio") || db.settings.appUrl.includes("vice-4115.ai.studio"))) {
          db.settings.appUrl = "";
        }
        writeDatabase(db, storeId);
        return res.json({ success: true, db });
      }
      if (!db.users || db.users.length === 0) {
        if (users && users.length > 0) {
          db.users = users;
        }
      }

      // Read current server timestamps
      const serverTimestamps = getTimestamps(db);
      const mergedTimestamps = { ...serverTimestamps };
      let dbChanged = false;

      // 1. Process deleted IDs first
      const deleteSet = new Set(Array.isArray(deletedIds) ? deletedIds : []);
      if (deleteSet.size > 0) {
        db.products = (db.products || []).filter((p: any) => p && !deleteSet.has(p.id));
        db.categories = (db.categories || []).filter((c: any) => c && !deleteSet.has(c.id));
        db.suppliers = (db.suppliers || []).filter((s: any) => s && !deleteSet.has(s.id));
        db.customers = (db.customers || []).filter((c: any) => c && !deleteSet.has(c.id));
        db.salesInvoices = (db.salesInvoices || []).filter((s: any) => s && !deleteSet.has(s.id));
        db.purchaseInvoices = (db.purchaseInvoices || []).filter((p: any) => p && !deleteSet.has(p.id));
        db.vouchers = (db.vouchers || []).filter((v: any) => v && !deleteSet.has(v.id));
        db.journalEntries = (db.journalEntries || []).filter((j: any) => j && !deleteSet.has(j.id));
        db.stockAdjustments = (db.stockAdjustments || []).filter((s: any) => s && !deleteSet.has(s.id));
        db.users = (db.users || []).filter((u: any) => u && !deleteSet.has(u.id));
        db.orders = (db.orders || []).filter((o: any) => o && !deleteSet.has(o.id));
        db.accounts = (db.accounts || []).filter((a: any) => a && !deleteSet.has(a.code));
        dbChanged = true;
      }

      // Helper function to merge arrays of objects by key (id or code)
      const mergeArray = (serverArr: any[] = [], clientArr: any[] = [], key = 'id', preferClient = false, collectionName = '') => {
        const map = new Map();
        // Add server items
        for (const item of serverArr) {
          if (item && item[key]) {
            map.set(item[key], item);
          }
        }
        // Merge client items
        if (Array.isArray(clientArr)) {
          for (const item of clientArr) {
            if (item && item[key]) {
              if (deleteSet.has(item[key])) {
                continue; // Skip if deleted
              }
              if (!map.has(item[key])) {
                // New item on client
                map.set(item[key], item);
              } else {
                // Overlapping item: choose based on preferClient flag for this collection
                if (preferClient) {
                  map.set(item[key], item);
                } else {
                  // For orders, allow progressive status upgrades to take priority (e.g. rejected or completed over pending)
                  if (collectionName === 'orders') {
                    const serverItem = map.get(item[key]);
                    const clientItem = item;
                    const statusWeights = { 'pending': 0, 'accepted': 1, 'rejected': 2, 'completed': 3 };
                    const serverWeight = statusWeights[serverItem.status as keyof typeof statusWeights] ?? 0;
                    const clientWeight = statusWeights[clientItem.status as keyof typeof statusWeights] ?? 0;
                    if (clientWeight > serverWeight) {
                      map.set(item[key], item);
                    }
                  }
                }
              }
            }
          }
        }
        return Array.from(map.values());
      };

      // Helper for collection-level merge
      const mergeCollection = (key: string, clientData: any, serverData: any, mergeFn: (srv: any, cli: any, pref: boolean) => any) => {
        const clientTime = clientTimestamps[key as keyof typeof clientTimestamps] || 0;
        const serverTime = serverTimestamps[key as keyof typeof serverTimestamps] || 0;
        const preferClient = clientTime > serverTime;

        if (clientData !== undefined) {
          const merged = mergeFn(serverData, clientData, preferClient);
          if (JSON.stringify(merged) !== JSON.stringify(serverData)) {
            db[key] = merged;
            mergedTimestamps[key as keyof typeof mergedTimestamps] = preferClient ? clientTime : serverTime;
            dbChanged = true;
          }
        }
      };

      // 2. Perform merge for each collection based on individual timestamps
      mergeCollection('settings', settings, db.settings, (srv, cli, pref) => {
        const merged = pref ? cli : srv;
        // Sanitize appUrl
        if (merged.appUrl && (merged.appUrl.includes("service-4115.ai.studio") || merged.appUrl.includes("vice-4115.ai.studio"))) {
          merged.appUrl = "";
        }
        return merged;
      });

      mergeCollection('accounts', accounts, db.accounts, (srv, cli, pref) => mergeArray(srv, cli, 'code', pref));
      mergeCollection('products', products, db.products, (srv, cli, pref) => mergeArray(srv, cli, 'id', pref));
      mergeCollection('categories', categories, db.categories, (srv, cli, pref) => mergeArray(srv, cli, 'id', pref));
      mergeCollection('suppliers', suppliers, db.suppliers, (srv, cli, pref) => mergeArray(srv, cli, 'id', pref));
      mergeCollection('customers', customers, db.customers, (srv, cli, pref) => mergeArray(srv, cli, 'id', pref));
      mergeCollection('salesInvoices', salesInvoices, db.salesInvoices, (srv, cli, pref) => mergeArray(srv, cli, 'id', pref));
      mergeCollection('purchaseInvoices', purchaseInvoices, db.purchaseInvoices, (srv, cli, pref) => mergeArray(srv, cli, 'id', pref));
      mergeCollection('vouchers', vouchers, db.vouchers, (srv, cli, pref) => mergeArray(srv, cli, 'id', pref));
      mergeCollection('journalEntries', journalEntries, db.journalEntries, (srv, cli, pref) => mergeArray(srv, cli, 'id', pref));
      mergeCollection('stockAdjustments', stockAdjustments, db.stockAdjustments, (srv, cli, pref) => mergeArray(srv, cli, 'id', pref));
      mergeCollection('users', users, db.users, (srv, cli, pref) => mergeArray(srv, cli, 'id', pref));
      mergeCollection('orders', orders, db.orders, (srv, cli, pref) => mergeArray(srv, cli, 'id', pref, 'orders'));
      mergeCollection('fiscalYearArchives', req.body.fiscalYearArchives, db.fiscalYearArchives, (srv, cli, pref) => mergeArray(srv, cli, 'id', pref));

      // Save merged timestamps
      db.timestamps = mergedTimestamps;
      db.lastUpdated = Math.max(...Object.values(mergedTimestamps), Date.now());

      // 3. Write database if anything changed
      if (dbChanged) {
        writeDatabase(db, storeId);
      }

      // In all cases, return the master database state (either updated or unchanged)
      return res.json({ success: true, db });
    } catch (e: any) {
      console.error("Central Sync Error:", e);
      return res.status(500).json({ error: e?.message || "Internal sync error" });
    }
  });



  // API Endpoint: Identify product from photo using Gemini 3.6 Flash
  app.post("/api/identify-product", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({
          error: "لم يتم ضبط مفتاح Gemini API في خادم التطبيق."
        });
      }

      const { imageBase64, products } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: "لم يتم إرسال صورة للمنتج" });
      }

      // Extract raw base64 data and mimeType
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      const mimeMatch = imageBase64.match(/^data:([^;]+);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });

      const maxProducts = 300;
      const slicedProducts = (products || []).slice(0, maxProducts);

      const productListFormatted = slicedProducts.map((p: any) => {
        const cleanName = String(p.name || "").replace(/[|]/g, " ");
        const cleanBarcode = String(p.barcode || "").replace(/[|]/g, " ");
        const cleanCategory = String(p.category || "").replace(/[|]/g, " ");
        return `${p.id}|${cleanName}|${cleanBarcode}|${cleanCategory}`;
      }).join("\n");

      const prompt = `أنت نظام ذكي ومتقدم للغاية للتعرف البصري والذكي على المنتجات في السوبرماركت ومحلات التجزئة (Visual Product Recognition & OCR System).
لديك صورة ملتقطة لمنتج، وقائمة بالمنتجات المسجلة حالياً في قاعدة بيانات المحل بصيغة مضغوطة (id|name|barcode|category):
${productListFormatted}

المطلوب منك:
1. فحص الصورة بدقة بالغة واستخراج النصوص (OCR) المكتوبة على العبوة أو المنتج (العربية أو الإنجليزية)، وتحديد العلامة التجارية، والنوع، وحجم العبوة أو وزنها إن وجد.
2. في حال وجود رمز باركود (Barcode) مطبوع وواضح في الصورة (مثل باركود EAN-13 أو غيره)، يرجى استخراج أرقامه بدقة بالغة ومطابقته فوراً مع حقل الباركود في القائمة.
3. مقارنة هذه الخصائص البصرية والنصية والباركود المستخرج بقائمة أصناف المحل المزودة أعلاه.
4. كن مرناً ومسامحاً للغاية في المطابقة:
   - إذا تطابق الباركود المستخرج من الصورة مع أي باركود صنف في القائمة، فهذا تطابق مؤكد ومثالي بنسبة 100%، يرجى اختياره فوراً ورفع الـ confidence إلى 100%.
   - إذا كان الاسم في قاعدة البيانات مختلفاً قليلاً في الصياغة (مثلاً "عصير راني برتقال" في الصورة يطابق "راني برتقال 250 مل" في قاعدة البيانات)، قم بمطابقته فوراً.
   - إذا وجدت تطابقاً قوياً، ضع معرّف المنتج في "matchedProductId" واجعل الـ "confidence" عالية (85-100%).
   - إذا كان المنتج مشابهاً لنوع أو ماركة لدينا ولكن بحجم أو نكهة مختلفة، قم بوضع الأصناف الأكثر شبهاً في "candidateProductIds" (أفضل 3 مرشحين).
   - إذا لم تجد أي صنف مناسب في قاعدة البيانات على الإطلاق، ضع "matchedProductId" كـ نص فارغ "" واقترح أفضل 3 أصناف قريبة أو بديلة من قاعدة البيانات في "candidateProductIds".
5. أعد النتيجة بصيغة JSON تحتوي على الحقول التالية فقط:
   - "matchedProductId": الـ ID المطابق (أو نص فارغ "" إذا لم تجد تطابقاً).
   - "confidence": نسبة اليقين والتطابق (رقم من 0 إلى 100).
   - "candidateProductIds": مصفوفة تحتوي على معرّفات (IDs) أفضل 3 أصناف محتملة أو بديلة.
   - "reasoning": شرح دقيق وموجز باللغة العربية (لا يتجاوز سطرين) يوضح ما رأيته في الصورة وسبب المطابقة (واذكر الباركود إن تم قراءته).`;

      // Ultra-robust call helper with exponential backoff, jitter, and automatic multi-model failover
      const generateWithFallback = async (
        modelsList: string[],
        currentModelIndex = 0,
        modelRetriesLeft = 1,
        delay = 1000
      ): Promise<any> => {
        const modelName = modelsList[currentModelIndex];
        try {
          return await ai.models.generateContent({
            model: modelName,
            contents: {
              parts: [
                {
                  inlineData: {
                    mimeType,
                    data: cleanBase64
                  }
                },
                { text: prompt }
              ]
            },
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  matchedProductId: { type: Type.STRING },
                  confidence: { type: Type.NUMBER },
                  candidateProductIds: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  reasoning: { type: Type.STRING }
                }
              }
            }
          });
        } catch (err: any) {
          const errString = String(err?.message || "").toLowerCase();
          const isTransient = 
            err?.status === 503 || 
            err?.statusCode === 503 || 
            err?.status === 429 || 
            err?.statusCode === 429 ||
            err?.status === 403 ||
            err?.statusCode === 403 ||
            errString.includes("503") ||
            errString.includes("429") ||
            errString.includes("403") ||
            errString.includes("unavailable") ||
            errString.includes("high demand") ||
            errString.includes("resource_exhausted") ||
            errString.includes("quota") ||
            errString.includes("exhausted") ||
            errString.includes("limit") ||
            errString.includes("overloaded") ||
            errString.includes("transient");

          if (isTransient) {
            const jitter = Math.floor(Math.random() * 300);
            const nextDelay = delay * 1.5 + jitter;

            if (modelRetriesLeft > 0) {
              console.log(`[Gemini Info] Model ${modelName} returned temporary status. Retrying in ${delay}ms... (Remaining retries: ${modelRetriesLeft})`);
              await new Promise(resolve => setTimeout(resolve, delay));
              return generateWithFallback(modelsList, currentModelIndex, modelRetriesLeft - 1, nextDelay);
            } else if (currentModelIndex < modelsList.length - 1) {
              const nextModel = modelsList[currentModelIndex + 1];
              console.log(`[Gemini Info] Model ${modelName} status updated. Switching to next model: ${nextModel} in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              return generateWithFallback(modelsList, currentModelIndex + 1, 1, 1000);
            }
          }
          throw err;
        }
      };

      const modelsToTry = ["gemini-3.1-flash-lite", "gemini-3.6-flash", "gemini-flash-latest"];
      const response = await generateWithFallback(modelsToTry);
      const resultText = response.text || "{}";
      
      let parsed: any = {};
      try {
        let cleanText = resultText.trim();
        if (cleanText.startsWith("```json")) {
          cleanText = cleanText.substring(7);
        } else if (cleanText.startsWith("```")) {
          cleanText = cleanText.substring(3);
        }
        if (cleanText.endsWith("```")) {
          cleanText = cleanText.substring(0, cleanText.length - 3);
        }
        cleanText = cleanText.trim();
        parsed = JSON.parse(cleanText);
      } catch (jsonErr) {
        console.log("[Gemini Parser] Attempting repair extraction:", jsonErr);
        // Robust fallback parser
        const matchedProductMatch = resultText.match(/"matchedProductId"\s*:\s*(?:"([^"]*)"|null)/);
        const confidenceMatch = resultText.match(/"confidence"\s*:\s*(\d+)/);
        const reasoningMatch = resultText.match(/"reasoning"\s*:\s*"([^"]+)"/);
        
        parsed = {
          matchedProductId: (matchedProductMatch && matchedProductMatch[1]) ? matchedProductMatch[1] : null,
          confidence: confidenceMatch ? parseInt(confidenceMatch[1], 10) : 0,
          candidateProductIds: [],
          reasoning: reasoningMatch ? reasoningMatch[1] : "تم تحليل المنتج ومطابقته بنجاح."
        };

        // Try extracting candidate IDs using regex
        const arrayPart = resultText.match(/"candidateProductIds"\s*:\s*\[([^\]]*)\]/);
        if (arrayPart && arrayPart[1]) {
          const ids = arrayPart[1].match(/"([^"]+)"/g);
          if (ids) {
            parsed.candidateProductIds = ids.map(id => id.replace(/"/g, ""));
          }
        }
      }

      // Standardize matchedProductId to null if empty or non-existent
      if (!parsed.matchedProductId || parsed.matchedProductId === "") {
        parsed.matchedProductId = null;
      }

      return res.json({
        success: true,
        ...parsed
      });
    } catch (error: any) {
      console.error("Gemini identify product error:", error);
      
      const errString = String(error?.message || "").toLowerCase();
      let arabicFriendlyMessage = "حدث خطأ أثناء تحليل الصورة بالذكاء الاصطناعي. يرجى المحاولة مرة أخرى.";
      
      if (errString.includes("503") || errString.includes("unavailable") || errString.includes("high demand") || errString.includes("overloaded")) {
        arabicFriendlyMessage = "خدمة الذكاء الاصطناعي تعاني من ضغط مؤقت في الطلبات حالياً (503). يرجى الانتظار ثوانٍ معدودة وإعادة المحاولة.";
      } else if (errString.includes("resource_exhausted") || errString.includes("quota") || errString.includes("exceeded") || errString.includes("429") || errString.includes("rate limit")) {
        arabicFriendlyMessage = "عذراً، لقد تم تجاوز الحصة المخصصة لمفتاح Gemini API الخاص بك (Quota Exceeded / Resource Exhausted). يرجى التحقق من حد الاستخدام، أو الانتظار ريثما يتصفر العداد، أو ضبط مفتاح API جديد من قائمة إعدادات المنصة.";
      }

      return res.status(500).json({
        error: arabicFriendlyMessage,
        details: error?.message || null
      });
    }
  });

  // Prevent sw.js caching so updates are delivered instantly to PWA users
  app.get("/manifest.json", (req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");

    const storeId = req.query.store as string || "";
    const manifestPath = path.join(process.cwd(), "public", "manifest.json");
    
    let manifestData: any = {
      "short_name": "التاجر الذكي",
      "name": "التاجر الذكي - إدارة البقالة والسوبرماركت",
      "id": "/",
      "icons": [
        { "src": "/icon-192.png", "type": "image/png", "sizes": "192x192", "purpose": "any" },
        { "src": "/icon-512.png", "type": "image/png", "sizes": "512x512", "purpose": "any" },
        { "src": "/icon-192.png", "type": "image/png", "sizes": "192x192", "purpose": "maskable" },
        { "src": "/icon-512.png", "type": "image/png", "sizes": "512x512", "purpose": "maskable" }
      ],
      "start_url": "/",
      "scope": "/",
      "background_color": "#0f172a",
      "theme_color": "#059669",
      "display": "standalone",
      "orientation": "portrait",
      "lang": "ar",
      "dir": "rtl"
    };

    if (fs.existsSync(manifestPath)) {
      try {
        manifestData = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      } catch (e) {
        console.error("Failed to read manifest.json file", e);
      }
    }

    if (storeId && storeId.trim() !== "") {
      const cleanStore = storeId.trim();
      manifestData.start_url = `/?store=${encodeURIComponent(cleanStore)}`;
      manifestData.id = `/?store=${encodeURIComponent(cleanStore)}`;
      
      // Map store IDs to branch number nicely
      const branchNum = cleanStore.replace("store_", "");
      manifestData.short_name = `التاجر - فرع ${branchNum}`;
      manifestData.name = `التاجر الذكي - فرع ${branchNum}`;
    }

    res.json(manifestData);
  });

  // Serve sw.js with proper headers so PWA installability criteria are satisfied
  app.get("/sw.js", (req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.setHeader("Service-Worker-Allowed", "/");
    
    const swPath = path.join(process.cwd(), "dist", "sw.js");
    if (fs.existsSync(swPath)) {
      return res.sendFile(swPath);
    }
    const publicSw = path.join(process.cwd(), "public", "sw.js");
    if (fs.existsSync(publicSw)) {
      return res.sendFile(publicSw);
    }
    return res.status(404).send("Not found");
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
