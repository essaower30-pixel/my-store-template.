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

  // Dynamic PWA Manifest Route
  app.get("/api/manifest.json", (req, res) => {
    const title = (req.query.title as string) || "التاجر الذكي (بقالة)";
    const icon = (req.query.icon as string) || "/icon.jpg";

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.json({
      short_name: title,
      name: title,
      icons: [
        {
          src: icon,
          sizes: "192x192",
          type: "image/jpeg",
          purpose: "any maskable"
        },
        {
          src: icon,
          sizes: "512x512",
          type: "image/jpeg",
          purpose: "any maskable"
        }
      ],
      start_url: "/",
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

  function readDatabase() {
    if (fs.existsSync(DB_FILE)) {
      try {
        return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
      } catch (e) {
        console.error("Error reading database file:", e);
      }
    }
    return null;
  }

  function writeDatabase(data: any) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
    } catch (e) {
      console.error("Error writing database file:", e);
    }
  }

  app.get("/api/sync", (req, res) => {
    const db = readDatabase();
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
        lastUpdated: clientLastUpdatedRaw
      } = req.body;

      const clientLastUpdated = Number(clientLastUpdatedRaw) || 0;
      let db = readDatabase();

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
          lastUpdated: Date.now()
        };
        writeDatabase(db);
        return res.json({ success: true, db });
      }

      // If database doesn't exist, initialize with first client's state
      if (!db) {
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
          lastUpdated: Date.now()
        };
        writeDatabase(db);
        return res.json({ success: true, db });
      }

      const serverLastUpdated = Number(db.lastUpdated) || 0;

      // TIMESTAMP-BASED SYNC:
      // If the client has newer edits, adopt the client's state fully.
      if (clientLastUpdated > serverLastUpdated) {
        db = {
          settings: settings !== undefined ? settings : db.settings,
          accounts: accounts !== undefined ? accounts : db.accounts,
          products: products !== undefined ? products : db.products,
          categories: categories !== undefined ? categories : db.categories,
          suppliers: suppliers !== undefined ? suppliers : db.suppliers,
          customers: customers !== undefined ? customers : db.customers,
          salesInvoices: salesInvoices !== undefined ? salesInvoices : db.salesInvoices,
          purchaseInvoices: purchaseInvoices !== undefined ? purchaseInvoices : db.purchaseInvoices,
          vouchers: vouchers !== undefined ? vouchers : db.vouchers,
          journalEntries: journalEntries !== undefined ? journalEntries : db.journalEntries,
          stockAdjustments: stockAdjustments !== undefined ? stockAdjustments : db.stockAdjustments,
          users: users !== undefined ? users : db.users,
          lastUpdated: clientLastUpdated
        };
        writeDatabase(db);
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
            errString.includes("503") ||
            errString.includes("429") ||
            errString.includes("unavailable") ||
            errString.includes("high demand") ||
            errString.includes("resource_exhausted") ||
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
        arabicFriendlyMessage = "عذراً، لقد تم تجاوز الحصة المخصصة لمفتاح Gemini API الخاص بك (Quota Exceeded / Resource Exhausted). يرجى التحقق من حد الاستخدام، أو الانتظار ريثما يتصفر العداد، أو استخدام مفتاح API آخر في الإعدادات.";
      }

      return res.status(500).json({
        error: arabicFriendlyMessage,
        details: error?.message || null
      });
    }
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
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
