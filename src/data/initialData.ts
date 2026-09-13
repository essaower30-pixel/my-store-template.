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
  ShopSettings
} from '../types/accounting';

export const INITIAL_SETTINGS: ShopSettings = {
  shopName: "متجر جديد",
  activityType: "تجارة التجزئة",
  phone: "0500000000",
  address: "العنوان",
  taxNumber: "",
  currencySymbol: "ر.س",
  defaultTaxRate: 15,
  enableTax: true,
  receiptHeader: "أهلاً وسهلاً بكم في متجرنا",
  receiptFooter: "شكراً لزيارتكم",
  appUrl: "",
  enableAutoScroll: false,
  enableShamCash: true,
  shamCashNumber: "963900000000",
  shamCashQR: ""
};

export const INITIAL_ACCOUNTS: AccountNode[] = [
  // 1. الأصول
  { code: '1000', name: 'الأصول', type: 'asset', category: 'رئيسي', isHeader: true },
  { code: '1010', name: 'الصندوق والنقدية', type: 'asset', category: 'الأصول المتداولة', parentCode: '1000', description: 'أموال الصندوق الرئيسي للمحل' },
  { code: '1020', name: 'حساب البنك / المدى', type: 'asset', category: 'الأصول المتداولة', parentCode: '1000', description: 'الحساب البنكي والشبكة' },
  { code: '1030', name: 'مخزون البضائع (الأصناف)', type: 'asset', category: 'الأصول المتداولة', parentCode: '1000', description: 'قيمة البضاعة المتوفرة بالمتجر' },
  { code: '1040', name: 'ذمم الزبائن والعملاء', type: 'asset', category: 'الأصول المتداولة', parentCode: '1000', description: 'الديون المستحقة على الزبائن' },

  // 2. الخصوم / الالتزامات
  { code: '2000', name: 'الخصوم والالتزامات', type: 'liability', category: 'رئيسي', isHeader: true },
  { code: '2010', name: 'ذمم الموردين', type: 'liability', category: 'الخصوم المتداولة', parentCode: '2000', description: 'المبالغ المستحقة للموردين' },
  { code: '2020', name: 'ضريبة القيمة المضافة المستحقة', type: 'liability', category: 'الخصوم المتداولة', parentCode: '2000', description: 'أمانات الضريبة لهيئة الزكاة والدخل' },

  // 3. حقوق الملكية
  { code: '3000', name: 'حقوق الملكية', type: 'equity', category: 'رئيسي', isHeader: true },
  { code: '3010', name: 'رأس مال المتجر', type: 'equity', category: 'حقوق الملكية', parentCode: '3000', description: 'رأس المال المخصص للتجارة' },
  { code: '3020', name: 'الأرباح والخسائر المدورة', type: 'equity', category: 'حقوق الملكية', parentCode: '3000', description: 'صافي الأرباح المتراكمة' },

  // 4. الإيرادات
  { code: '4000', name: 'الإيرادات', type: 'revenue', category: 'رئيسي', isHeader: true },
  { code: '4010', name: 'إيراد المبيعات', type: 'revenue', category: 'الإيرادات التشغيلية', parentCode: '4000', description: 'أرباح ومبيعات الأصناف والبضائع' },
  { code: '4020', name: 'إيرادات متنوعة أخرى', type: 'revenue', category: 'إيرادات أخرى', parentCode: '4000', description: 'إيرادات تقديم خدمات أو أخرى' },

  // 5. المصروفات
  { code: '5000', name: 'المصروفات', type: 'expense', category: 'رئيسي', isHeader: true },
  { code: '5010', name: 'تكلفة البضاعة المباعة (COGS)', type: 'expense', category: 'تكاليف المبيعات', parentCode: '5000', description: 'تكلفة الشراء للبضاعة التي تم بيعها' },
  { code: '5020', name: 'مصروف إيجار المحل', type: 'expense', category: 'المصروفات التشغيلية', parentCode: '5000', description: 'إيجار العقار السنوي/الشهري' },
  { code: '5030', name: 'مصاريف الكهرباء والمياه', type: 'expense', category: 'المصروفات التشغيلية', parentCode: '5000', description: 'الفواتير والخدمات العامة' },
  { code: '5040', name: 'رواتب وأجور العمالة', type: 'expense', category: 'المصروفات التشغيلية', parentCode: '5000', description: 'رواتب الموظفين' },
  { code: '5050', name: 'مصاريف صيانة ونثريات', type: 'expense', category: 'المصروفات التشغيلية', parentCode: '5000', description: 'أدوات تنظيف وأثاث ومصروفات نثرية' },
];

export const INITIAL_PRODUCTS: Product[] = [];

export const INITIAL_SUPPLIERS: Supplier[] = [];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-cash',
    code: 'CUST-00',
    name: 'زبون نقدي (عام)',
    phone: '0000000000',
    creditLimit: 0,
    openingBalance: 0,
    notes: 'زبون المبيعات المباشرة بالصندوق'
  }
];

export const INITIAL_SALES_INVOICES: SalesInvoice[] = [];

export const INITIAL_PURCHASE_INVOICES: PurchaseInvoice[] = [];

export const INITIAL_VOUCHERS: PaymentVoucher[] = [];

export const INITIAL_JOURNAL_ENTRIES: JournalEntry[] = [];

export const INITIAL_CATEGORIES: ProductCategory[] = [
  { id: 'cat-1', name: 'مواد غذائية', description: 'الأرز، السكر، الزيوت، المعكرونة والمعلبات', color: 'emerald' },
  { id: 'cat-2', name: 'ألبان وأجبان', description: 'الحليب، اللبن، الأجبان، القشطة والزبدة', color: 'amber' },
  { id: 'cat-3', name: 'مشروبات وغازيات', description: 'العصائر، المياه، الغازيات، الشاي والقهوة', color: 'sky' },
  { id: 'cat-4', name: 'منظفات ومطهرات', description: 'مساحيق الغسيل، الصابون والمعقمات', color: 'indigo' },
  { id: 'cat-5', name: 'حلويات وسكاكر', description: 'البسكويت، الشوكولاتة والشيبس', color: 'purple' },
  { id: 'cat-6', name: 'عام / غير محدد', description: 'أصناف متنوعة أو غير مصنفة', color: 'slate' }
];
