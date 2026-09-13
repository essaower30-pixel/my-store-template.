import React, { useState } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Edit3, 
  Barcode, 
  AlertTriangle, 
  AlertCircle,
  ArrowUpDown,
  History,
  ClipboardList,
  CheckCircle2,
  TrendingUp,
  ShoppingCart,
  Boxes,
  MapPin,
  ArrowRight,
  Filter,
  DollarSign,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  AlertOctagon,
  RefreshCw,
  PlusCircle,
  FileCheck,
  Camera,
  FolderPlus,
  Folder,
  Trash2,
  Tag,
  ImageIcon,
  Upload,
  ChevronRight,
  ChevronLeft,
  X
} from 'lucide-react';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { BarcodeLabelModal } from './BarcodeLabelModal';
import { ProductImageSearchModal } from './ProductImageSearchModal';
import { ProductCameraCaptureModal } from './ProductCameraCaptureModal';
import { 
  Product, 
  ProductCategory,
  ShopSettings, 
  SalesInvoice, 
  PurchaseInvoice, 
  Supplier, 
  StockAdjustment, 
  StockMovement 
} from '../types/accounting';
import { matchesSearch, isBarcodeMatch } from '../utils/searchUtils';

interface ProductsViewProps {
  products: Product[];
  categoriesList?: ProductCategory[];
  settings: ShopSettings;
  salesInvoices?: SalesInvoice[];
  purchaseInvoices?: PurchaseInvoice[];
  suppliers?: Supplier[];
  stockAdjustments?: StockAdjustment[];
  stockMovements?: StockMovement[];
  onAddProduct: (prod: Product) => void;
  onUpdateProduct: (prod: Product) => void;
  onAddStockAdjustment?: (adj: StockAdjustment) => void;
  onAddCategory?: (cat: ProductCategory) => void;
  onUpdateCategory?: (cat: ProductCategory, oldName?: string) => void;
  onDeleteCategory?: (catId: string, catName: string) => void;
  onDeleteProduct?: (productId: string) => void;
  onNavigateToPurchases?: () => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  products: rawProducts,
  categoriesList = [],
  settings,
  salesInvoices = [],
  purchaseInvoices = [],
  suppliers = [],
  stockAdjustments = [],
  stockMovements = [],
  onAddProduct,
  onUpdateProduct,
  onAddStockAdjustment,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onDeleteProduct,
  onNavigateToPurchases
}) => {
  const products = (rawProducts || []).filter(p => p && p.id);

  // Active Tab inside Inventory Module
  const [activeSubTab, setActiveSubTab] = useState<'catalog' | 'alerts' | 'adjustment' | 'categories' | 'movements' | 'offers'>('catalog');

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [showOffersOnly, setShowOffersOnly] = useState(false);

  // Modal State for Add / Edit Product
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Category Management Modal State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catColor, setCatColor] = useState('indigo');

  // Inline Quick Add Category State (Inside Product Modal)
  const [showQuickAddCat, setShowQuickAddCat] = useState(false);
  const [quickCatName, setQuickCatName] = useState('');

  // Offers quick management states
  const [offerProductIdToAdd, setOfferProductIdToAdd] = useState('');
  const [quickOriginalPrice, setQuickOriginalPrice] = useState<string>('');
  const [quickOfferPrice, setQuickOfferPrice] = useState<string>('');
  const [quickEditOfferId, setQuickEditOfferId] = useState<string | null>(null);
  const [quickEditOriginalPrice, setQuickEditOriginalPrice] = useState<string>('');
  const [quickEditOfferPrice, setQuickEditOfferPrice] = useState<string>('');

  // Product Form Fields
  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [unit, setUnit] = useState('قطعة');
  const [costPrice, setCostPrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [stock, setStock] = useState<number>(0);
  const [minStockAlert, setMinStockAlert] = useState<number>(5);
  const [location, setLocation] = useState('');
  const [image, setImage] = useState('');
  const [showInStore, setShowInStore] = useState<boolean>(true);
  const [originalPrice, setOriginalPrice] = useState<number>(0);
  const [isOffer, setIsOffer] = useState<boolean>(false);
  const [storeId, setStoreId] = useState<string>('main');

  // Sub-units states
  const [hasSubUnits, setHasSubUnits] = useState<boolean>(false);
  const [subUnitsPerUnit, setSubUnitsPerUnit] = useState<number>(24);
  const [subUnitName, setSubUnitName] = useState<string>('حبة');
  const [subUnitSellingPrice, setSubUnitSellingPrice] = useState<number>(0);

  // Camera & Image Search States
  const [showFormCameraScanner, setShowFormCameraScanner] = useState(false);
  const [showCatalogCameraScanner, setShowCatalogCameraScanner] = useState(false);
  const [showImageSearchModal, setShowImageSearchModal] = useState(false);
  const [showProductCameraCaptureModal, setShowProductCameraCaptureModal] = useState(false);
  const [inputMethod, setInputMethod] = useState<'barcode' | 'manual'>('barcode');
  const [quickRestockQty, setQuickRestockQty] = useState<number>(10);

  // Custom Confirmation Dialog State
  const [customConfirm, setCustomConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Barcode Label Printing State
  const [selectedProductForBarcode, setSelectedProductForBarcode] = useState<Product | null>(null);

  // Stock Adjustment Form State
  const [adjProductId, setAdjProductId] = useState<string>(products[0]?.id || '');
  const [actualStock, setActualStock] = useState<number>(0);
  const [adjReason, setAdjReason] = useState<'inventory_count' | 'damage' | 'expired' | 'intake' | 'other'>('inventory_count');
  const [adjNotes, setAdjNotes] = useState('');
  const [adjSuccessMsg, setAdjSuccessMsg] = useState('');

  // Movement Log Filter
  const [movementTypeFilter, setMovementTypeFilter] = useState<'all' | 'sale' | 'purchase' | 'adjustment'>('all');

  const existingProductWithBarcode = React.useMemo(() => {
    if (!barcode || barcode.trim() === '') return null;
    return products.find(p => 
      isBarcodeMatch(p.barcode, barcode, true) && 
      (!editingProduct || p.id !== editingProduct.id)
    );
  }, [barcode, products, editingProduct]);

  // All unique category names for selects and filters
  const availableCategoryNames = Array.from(new Set([
    ...(categoriesList.map(c => c.name)),
    ...(products.map(p => p.category).filter(Boolean))
  ])).filter(c => c && c !== 'عام / غير محدد');

  const handleOpenAddCategoryModal = () => {
    setEditingCategory(null);
    setCatName('');
    setCatDesc('');
    setCatColor('indigo');
    setShowCategoryModal(true);
  };

  const handleOpenEditCategoryModal = (cat: ProductCategory) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatDesc(cat.description || '');
    setCatColor(cat.color || 'indigo');
    setShowCategoryModal(true);
  };

  const handleSaveCategoryModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    if (editingCategory) {
      if (onUpdateCategory) {
        onUpdateCategory({
          ...editingCategory,
          name: catName.trim(),
          description: catDesc.trim(),
          color: catColor
        }, editingCategory.name);
      }
    } else {
      if (onAddCategory) {
        onAddCategory({
          id: `cat-${Date.now()}`,
          name: catName.trim(),
          description: catDesc.trim(),
          color: catColor
        });
      }
    }
    setShowCategoryModal(false);
  };

  const handleDeleteCategoryClick = (cat: ProductCategory) => {
    const countInCat = products.filter(p => p.category === cat.name).length;
    let msg = `هل أنت متأكد من حذف القسم/التصنيف الرئيسي (${cat.name})؟`;
    if (countInCat > 0) {
      msg += `\nتنبيه: يوجد ${countInCat} أصناف مسجلة تحت هذا القسم. سيتم إزالة ربطها به وتحويلها لـ "عام / غير محدد".`;
    }
    setCustomConfirm({
      isOpen: true,
      title: 'حذف القسم الرئيسي',
      message: msg,
      onConfirm: () => {
        if (onDeleteCategory) {
          onDeleteCategory(cat.id, cat.name);
        }
        setCustomConfirm(null);
      }
    });
  };

  const handleDeleteProductClick = (prod: Product) => {
    const productSales = salesInvoices.some(inv => 
      inv.items.some(item => item.productId === prod.id)
    );
    const productPurchases = purchaseInvoices.some(inv => 
      inv.items.some(item => item.productId === prod.id)
    );

    let msg = `هل أنت متأكد من رغبتك في حذف الصنف "${prod.name}" نهائياً من النظام؟`;
    if (productSales || productPurchases) {
      msg = `عذراً، هذا الصنف ("${prod.name}") مرتبط بحركات مبيعات أو مشتريات سابقة.\nحذف الصنف قد يؤثر على الفواتير والتقارير المحاسبية السابقة.\n\nهل أنت متأكد تماماً من رغبتك في حذف هذا الصنف بشكل نهائي؟`;
    }

    setCustomConfirm({
      isOpen: true,
      title: 'حذف الصنف',
      message: msg,
      onConfirm: () => {
        if (onDeleteProduct) {
          onDeleteProduct(prod.id);
        }
        setCustomConfirm(null);
      }
    });
  };

  const handleSaveQuickCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCatName.trim()) return;
    const nameToUse = quickCatName.trim();
    if (onAddCategory) {
      onAddCategory({
        id: `cat-${Date.now()}`,
        name: nameToUse,
        description: 'قسم مخصص تم إنشاؤه أثناء التكشيف',
        color: 'indigo'
      });
    }
    setCategory(nameToUse);
    setQuickCatName('');
    setShowQuickAddCat(false);
  };

  // Filtered Products for Catalog
  const filteredProducts = products.filter(p => {
    const isMatched = !searchTerm.trim() || 
      matchesSearch(p.name, searchTerm) || 
      matchesSearch(p.barcode, searchTerm) || 
      matchesSearch(p.category, searchTerm) ||
      matchesSearch(p.location, searchTerm);
    const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesLowStock = !showLowStockOnly || p.stock <= p.minStockAlert;
    const matchesOffers = !showOffersOnly || p.isOffer === true;
    return isMatched && matchesCat && matchesLowStock && matchesOffers;
  });

  // Low stock products list
  const lowStockProducts = products.filter(p => p.stock <= p.minStockAlert);

  // Computed Financial KPI Metrics
  const totalItemsCount = products.length;
  const totalStockUnits = products.reduce((sum, p) => sum + p.stock, 0);
  const totalStockCostValue = products.reduce((sum, p) => sum + (p.stock * p.costPrice), 0);
  const totalStockSalesValue = products.reduce((sum, p) => sum + (p.stock * p.sellingPrice), 0);
  const totalPotentialProfit = totalStockSalesValue - totalStockCostValue;

  // Selected product for stock count adjustment
  const selectedAdjProduct = products.find(p => p.id === adjProductId) || products[0];
  const stockDifference = selectedAdjProduct ? actualStock - selectedAdjProduct.stock : 0;

  // Derive All Stock Movements dynamically from Sales & Purchase Invoices + Manual Adjustments
  const derivedMovements: StockMovement[] = [];

  // 1. Movements from Sales
  salesInvoices.forEach(inv => {
    inv.items.forEach(item => {
      derivedMovements.push({
        id: `mov-s-${inv.id}-${item.productId}`,
        date: inv.date,
        time: inv.time || '12:00',
        productId: item.productId,
        productName: item.productName,
        type: 'sale',
        quantityChange: -item.quantity,
        previousStock: 0,
        newStock: 0,
        refNumber: inv.invoiceNumber,
        notes: `مبيعات فاتورة رقم ${inv.invoiceNumber} - العميل: ${inv.customerName}`
      });
    });
  });

  // 2. Movements from Purchases
  purchaseInvoices.forEach(inv => {
    inv.items.forEach(item => {
      derivedMovements.push({
        id: `mov-p-${inv.id}-${item.productId}`,
        date: inv.date,
        time: '10:00',
        productId: item.productId,
        productName: item.productName,
        type: 'purchase',
        quantityChange: item.quantity,
        previousStock: 0,
        newStock: 0,
        refNumber: inv.invoiceNumber,
        notes: `مشتريات فاتورة رقم ${inv.invoiceNumber} - المورد: ${inv.supplierName}`
      });
    });
  });

  // Combine passed movements + derived, sorted by date desc
  const allMovements = [...stockMovements, ...derivedMovements].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const filteredMovements = allMovements.filter(m => {
    if (movementTypeFilter === 'all') return true;
    return m.type === movementTypeFilter;
  });

  const handleProductImageUpload = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 600;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_DIM) {
            height *= MAX_DIM / width;
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width *= MAX_DIM / height;
            height = MAX_DIM;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          setImage(canvas.toDataURL('image/jpeg', 0.8));
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Handle Open Add Modal
  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setBarcode(`628${Math.floor(1000000 + Math.random() * 9000000)}`);
    setName('');
    setCategory('مواد غذائية');
    setUnit('قطعة');
    setCostPrice(0);
    setSellingPrice(0);
    setStock(10);
    setMinStockAlert(5);
    setLocation('');
    setImage('');
    setShowInStore(true);
    setOriginalPrice(0);
    setIsOffer(false);
    setInputMethod('barcode');
    setHasSubUnits(false);
    setSubUnitsPerUnit(24);
    setSubUnitName('حبة');
    setSubUnitSellingPrice(0);
    setStoreId('main');
    setShowProductModal(true);
  };

  // Handle Open Edit Modal
  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    setBarcode(p.barcode);
    setName(p.name);
    setCategory(p.category);
    setUnit(p.unit);
    setCostPrice(p.costPrice);
    setSellingPrice(p.sellingPrice);
    setStock(p.stock);
    setMinStockAlert(p.minStockAlert);
    setLocation(p.location || '');
    setImage(p.image || '');
    setShowInStore(p.showInStore !== false);
    setOriginalPrice(p.originalPrice || 0);
    setIsOffer(!!p.isOffer);
    setInputMethod('barcode');
    setHasSubUnits(!!p.hasSubUnits);
    setSubUnitsPerUnit(p.subUnitsPerUnit || 24);
    setSubUnitName(p.subUnitName || 'حبة');
    setSubUnitSellingPrice(p.subUnitSellingPrice || 0);
    setStoreId(p.storeId || 'main');
    setShowProductModal(true);
  };

  // Product navigation for modal editing
  const currentProductIndex = editingProduct ? products.findIndex(p => p.id === editingProduct.id) : -1;

  const handleNavigateProduct = (direction: 'prev' | 'next') => {
    if (currentProductIndex === -1) return;
    const newIdx = direction === 'next' ? currentProductIndex + 1 : currentProductIndex - 1;
    if (newIdx >= 0 && newIdx < products.length) {
      handleOpenEditModal(products[newIdx]);
    }
  };

  const handleQuickRestock = (existingProd: Product) => {
    const qtyToAdd = Number(quickRestockQty);
    if (isNaN(qtyToAdd) || qtyToAdd <= 0) {
      alert("الرجاء إدخال كمية تزويد صحيحة أكبر من الصفر.");
      return;
    }
    const updatedProd: Product = {
      ...existingProd,
      stock: existingProd.stock + qtyToAdd
    };
    onUpdateProduct(updatedProd);
    alert(`تم بنجاح تزويد الصنف "${existingProd.name}" بإضافة +${qtyToAdd} قطعة. المخزون الجديد: ${updatedProd.stock} قطعة.`);
    setShowProductModal(false);
    setQuickRestockQty(10);
  };

  // Save Add / Edit Product
  const handleSaveProductInternal = (andAddAnother: boolean = false) => {
    if (!name || !barcode) return;

    if (existingProductWithBarcode) {
      alert(`عذراً، هذا الباركود (${barcode}) مسجل بالفعل لصنف آخر باسم "${existingProductWithBarcode.name}".\nيمكنك استخدام خيار "تعديل وتزويد الصنف الحالي" لتحديثه.`);
      return;
    }

    if (editingProduct) {
      const updated: Product = {
        ...editingProduct,
        barcode,
        name,
        category,
        unit,
        costPrice: Number(costPrice),
        sellingPrice: Number(sellingPrice),
        stock: Number(stock),
        minStockAlert: Number(minStockAlert),
        location,
        image,
        showInStore,
        originalPrice: Number(originalPrice) || undefined,
        isOffer,
        hasSubUnits,
        subUnitsPerUnit: hasSubUnits ? Number(subUnitsPerUnit) : undefined,
        subUnitName: hasSubUnits ? subUnitName : undefined,
        subUnitSellingPrice: hasSubUnits ? (Number(subUnitSellingPrice) || (Number(sellingPrice) / Number(subUnitsPerUnit))) : undefined,
        storeId: storeId || 'main'
      };
      onUpdateProduct(updated);
    } else {
      const newProd: Product = {
        id: `p-${Date.now()}`,
        barcode,
        name,
        category,
        unit,
        costPrice: Number(costPrice),
        sellingPrice: Number(sellingPrice),
        stock: Number(stock),
        minStockAlert: Number(minStockAlert),
        location,
        image,
        showInStore,
        originalPrice: Number(originalPrice) || undefined,
        isOffer,
        hasSubUnits,
        subUnitsPerUnit: hasSubUnits ? Number(subUnitsPerUnit) : undefined,
        subUnitName: hasSubUnits ? subUnitName : undefined,
        subUnitSellingPrice: hasSubUnits ? (Number(subUnitSellingPrice) || (Number(sellingPrice) / Number(subUnitsPerUnit))) : undefined,
        storeId: storeId || 'main'
      };
      onAddProduct(newProd);
    }

    if (andAddAnother) {
      setEditingProduct(null);
      setBarcode(`628${Math.floor(1000000 + Math.random() * 9000000)}`);
      setName('');
      setCostPrice(0);
      setSellingPrice(0);
      setStock(10);
      setMinStockAlert(5);
      setLocation('');
      setImage('');
      setShowInStore(true);
      setOriginalPrice(0);
      setIsOffer(false);
      setHasSubUnits(false);
      setSubUnitsPerUnit(24);
      setSubUnitName('حبة');
      setSubUnitSellingPrice(0);
      setShowProductModal(true);
    } else {
      setShowProductModal(false);
    }
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    handleSaveProductInternal(false);
  };

  // Submit Stock Adjustment Count
  const handleSaveStockAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdjProduct) return;

    const previousStock = selectedAdjProduct.stock;
    const diff = actualStock - previousStock;

    // Update Product stock directly
    const updatedProd: Product = {
      ...selectedAdjProduct,
      stock: Number(actualStock)
    };
    onUpdateProduct(updatedProd);

    // Record Stock Adjustment
    const newAdj: StockAdjustment = {
      id: `adj-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      productId: selectedAdjProduct.id,
      productName: selectedAdjProduct.name,
      previousStock,
      actualStock: Number(actualStock),
      difference: diff,
      reason: adjReason,
      notes: adjNotes || 'جرد وتعديل كمية المخزن'
    };

    if (onAddStockAdjustment) {
      onAddStockAdjustment(newAdj);
    }

    const reasonText = 
      adjReason === 'inventory_count' ? 'جرد دوري' :
      adjReason === 'damage' ? 'تلفيات' :
      adjReason === 'expired' ? 'منتهي الصلاحية' :
      adjReason === 'intake' ? 'بضاعة جديدة' : 'تسوية أخرى';

    setAdjSuccessMsg(`تم تحديث مخزون (${selectedAdjProduct.name}) بنجاح! المخزون الجديد: ${actualStock} ${selectedAdjProduct.unit} (الفرق: ${diff > 0 ? `+${diff}` : diff}) [السبب: ${reasonText}]`);
    
    // Reset form notes
    setAdjNotes('');
    setTimeout(() => setAdjSuccessMsg(''), 5000);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto text-right">
      
      {/* Module Title Header & Quick Alert Banner */}
      <div className="bg-gradient-to-r from-indigo-950 via-indigo-900 to-slate-900 rounded-[2rem] p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-indigo-800/60">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-3.5 py-1 rounded-full text-xs font-bold">
            <Boxes className="w-4 h-4 text-indigo-300" />
            <span>وحدة إدارة وتتبع المخزون الشاملة</span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <span>مخزون وحركة الأصناف</span>
            {lowStockProducts.length > 0 && (
              <span className="bg-rose-500 text-white text-xs px-3 py-0.5 rounded-full font-bold animate-pulse">
                {lowStockProducts.length} صنف وصل حد الأمان!
              </span>
            )}
          </h2>
          <p className="text-xs sm:text-sm text-indigo-200 leading-relaxed">
            تتبع كميات البضائع المتاحة، تحديد الحدود الدنيا للإنذار بالنقص، تسوية وجرد المخزن، وسجل الحركة الآلي المربوط بالمبيعات والمشتريات.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">

          <button
            onClick={() => {
              setActiveSubTab('adjustment');
              if (products.length > 0) {
                setAdjProductId(products[0].id);
                setActualStock(products[0].stock);
              }
            }}
            className="flex items-center gap-2 bg-indigo-800/90 hover:bg-indigo-700 text-white border border-indigo-600/60 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <ClipboardList className="w-4 h-4 text-indigo-300" />
            <span>الجرد والتسوية السريعة</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white font-extrabold px-4 py-2.5 rounded-2xl text-xs shadow-lg transition-all cursor-pointer hover:scale-105 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة صنف جديد +</span>
          </button>
        </div>
      </div>

      {/* Bento KPI Summary Metrics */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Total Items */}
        <div className="bg-white rounded-[2rem] p-5 border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500">إجمالي الأصناف والقطع</p>
            <h3 className="text-2xl font-extrabold text-indigo-950 font-mono mt-1">
              {totalItemsCount} <span className="text-xs font-bold text-gray-500">أنواع</span>
            </h3>
            <p className="text-[11px] font-bold text-indigo-600 mt-1 font-mono">
              إجمالي {totalStockUnits.toLocaleString()} قطعة بالمخزن
            </p>
          </div>
          <div className="w-12 h-12 bg-indigo-50 text-indigo-700 rounded-2xl flex items-center justify-center shrink-0">
            <Package className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 2: Inventory Cost Value */}
        <div className="bg-white rounded-[2rem] p-5 border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500">قيمة المخزون (بسعر التكلفة)</p>
            <h3 className="text-2xl font-extrabold text-sky-900 font-mono mt-1">
              {totalStockCostValue.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[11px] font-bold text-gray-500 mt-1">
              {settings.currencySymbol} رأسمال المكنون بالمحل
            </p>
          </div>
          <div className="w-12 h-12 bg-sky-50 text-sky-700 rounded-2xl flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 3: Projected Sales Revenue */}
        <div className="bg-white rounded-[2rem] p-5 border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500">القيمة البيعية المتوقعة</p>
            <h3 className="text-2xl font-extrabold text-emerald-900 font-mono mt-1">
              {Math.round(totalStockSalesValue).toLocaleString('ar-SA')}
            </h3>
            <p className="text-[11px] font-bold text-emerald-600 mt-1 font-mono">
              ربح متوقع: +{totalPotentialProfit.toFixed(0)} {settings.currencySymbol}
            </p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 4: Low Stock Alert Warning */}
        <div className={`rounded-[2rem] p-5 border shadow-xs flex items-center justify-between transition-all ${
          lowStockProducts.length > 0
            ? 'bg-rose-50 border-rose-200 text-rose-950'
            : 'bg-white border-gray-100 text-gray-900'
        }`}>
          <div>
            <p className="text-xs font-bold text-gray-500">تنبيهات الحد الأدنى للنقص</p>
            <h3 className={`text-2xl font-extrabold font-mono mt-1 ${
              lowStockProducts.length > 0 ? 'text-rose-700' : 'text-emerald-700'
            }`}>
              {lowStockProducts.length} <span className="text-xs font-bold">أصناف</span>
            </h3>
            <p className="text-[11px] font-bold mt-1">
              {lowStockProducts.length > 0 ? 'تتطلب إعادة طلب وتوريد' : 'جميع الأصناف بوضع آمن'}
            </p>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
            lowStockProducts.length > 0 ? 'bg-rose-500 text-white animate-pulse' : 'bg-emerald-50 text-emerald-600'
          }`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

      </section>

      {/* Interactive Sub-Tabs Navigation */}
      <div className="bg-white p-2 rounded-2xl border border-gray-200/80 shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1">
          <button
            onClick={() => setActiveSubTab('catalog')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'catalog'
                ? 'bg-indigo-950 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>دليل الأصناف والكميات ({products.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('alerts')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'alerts'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>تنبيهات النقص والحد الأدنى</span>
            {lowStockProducts.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeSubTab === 'alerts' ? 'bg-white text-rose-950' : 'bg-rose-100 text-rose-700'
              }`}>
                {lowStockProducts.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('adjustment')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'adjustment'
                ? 'bg-indigo-950 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>الجرد وتسوية المحزون</span>
          </button>

          <button
            onClick={() => setActiveSubTab('categories')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'categories'
                ? 'bg-indigo-950 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FolderPlus className="w-4 h-4 text-amber-400" />
            <span>الأصناف والأقسام الرئيسية ({categoriesList.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('movements')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'movements'
                ? 'bg-indigo-950 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <History className="w-4 h-4" />
            <span>حركة وسجل المخزون الموحد</span>
          </button>

          <button
            onClick={() => setActiveSubTab('offers')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'offers'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Tag className="w-4 h-4 text-rose-500" />
            <span>إدارة العروض والخصومات</span>
            {products.filter(p => p.isOffer).length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeSubTab === 'offers' ? 'bg-white text-rose-950' : 'bg-rose-100 text-rose-700'
              }`}>
                {products.filter(p => p.isOffer).length}
              </span>
            )}
          </button>
        </div>

        {activeSubTab === 'catalog' && (
          <button
            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              showLowStockOnly
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>الأصناف المنخفضة فقط</span>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: CATALOG & STOCK LEVELS (دليل الأصناف والكميات المتاحة) */}
      {/* ========================================================================= */}
      {activeSubTab === 'catalog' && (
        <div className="space-y-4">
          
          {/* Search and Filters */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-1 max-w-lg min-w-[280px]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="البحث باسم الصنف أو رقم الباركود..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-10 pl-4 py-2 text-xs rounded-full border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="p-2 text-xs border border-gray-200 rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-700"
              >
                <option value="all">جميع الأقسام والتصنيفات ({availableCategoryNames.length})</option>
                <option value="عام / غير محدد">عام / غير محدد</option>
                {availableCategoryNames.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table of Available Stock Quantities */}
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b border-gray-200 font-bold">
                    <th className="p-3.5">الباركود</th>
                    <th className="p-3.5">اسم الصنف والتصنيف</th>
                    <th className="p-3.5">الموقع ببيئة المحل</th>
                    <th className="p-3.5">سعر الشراء</th>
                    <th className="p-3.5">سعر البيع</th>
                    <th className="p-3.5">الربح المتوقع</th>
                    <th className="p-3.5 text-center">الكمية المتاحة</th>
                    <th className="p-3.5 text-center">الحد الأدنى (الإنذار)</th>
                    <th className="p-3.5 text-center">حالة المخزون</th>
                    <th className="p-3.5 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredProducts.map(prod => {
                    const margin = prod.sellingPrice - prod.costPrice;
                    const marginPct = prod.costPrice > 0 ? ((margin / prod.costPrice) * 100).toFixed(0) : '0';
                    const isOut = prod.stock <= 0;
                    const isLow = prod.stock <= prod.minStockAlert && !isOut;

                    return (
                      <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 font-mono text-gray-600 flex items-center gap-1.5 font-bold">
                          <Barcode className="w-4 h-4 text-gray-400" />
                          <span>{prod.barcode}</span>
                        </td>

                        <td className="p-3.5">
                          <div className="flex items-center gap-2.5">
                            {prod.image ? (
                              <img
                                src={prod.image}
                                alt={prod.name}
                                className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-50"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-extrabold text-xs shrink-0">
                                {prod.name ? prod.name[0] : 'ص'}
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-indigo-950 text-xs">{prod.name}</p>
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                <span className="text-[10px] text-gray-500 font-medium bg-slate-50 px-1 py-0.5 rounded-md border border-slate-100">
                                  {prod.category} ({prod.unit}
                                  {prod.hasSubUnits && ` شد ${prod.subUnitsPerUnit} ${prod.subUnitName || 'حبة'}`})
                                </span>
                                {prod.isOffer && (
                                  <span className="bg-rose-50 text-rose-700 text-[9px] px-1.5 py-0.5 rounded-md font-black border border-rose-100 flex items-center gap-0.5" title={`عرض خاص - السعر السابق: ${prod.originalPrice || 0}`}>
                                    <span>🔥</span> عرض خاص {prod.originalPrice && `(${Math.round(((prod.originalPrice - prod.sellingPrice)/prod.originalPrice)*100)}%-)`}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5 text-gray-600 font-medium">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                            <span>{prod.location || 'المستودع الرئيسي'}</span>
                          </span>
                        </td>

                        <td className="p-3.5 font-mono font-bold text-gray-700">
                          {prod.costPrice.toFixed(0)} {settings.currencySymbol}
                        </td>

                        <td className="p-3.5 font-mono font-extrabold text-emerald-700">
                          <div>{prod.sellingPrice.toFixed(0)} {settings.currencySymbol}</div>
                          {prod.hasSubUnits && prod.subUnitsPerUnit && (
                            <div className="text-[10px] text-slate-500 font-normal mt-0.5" dir="rtl">
                              {(prod.subUnitSellingPrice || (prod.sellingPrice / prod.subUnitsPerUnit)).toFixed(0)} {settings.currencySymbol} / {prod.subUnitName || 'حبة'}
                            </div>
                          )}
                        </td>

                        <td className="p-3.5 font-mono font-bold text-indigo-900">
                          +{margin.toFixed(0)} <span className="text-[10px] text-indigo-500">({marginPct}%)</span>
                        </td>

                        {/* Available Quantity */}
                        <td className="p-3.5 text-center">
                          <span className={`px-3 py-1 rounded-full font-mono font-extrabold text-xs inline-block ${
                            isOut ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                            isLow ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                            'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}>
                            {(() => {
                              if (!prod.hasSubUnits || !prod.subUnitsPerUnit || !prod.subUnitName) {
                                return `${prod.stock} ${prod.unit}`;
                              }
                              const wholeUnits = Math.floor(prod.stock);
                              const fraction = prod.stock - wholeUnits;
                              const pieces = Math.round(fraction * prod.subUnitsPerUnit);
                              
                              if (pieces === 0) {
                                return `${wholeUnits} ${prod.unit}`;
                              }
                              if (wholeUnits === 0) {
                                return `${pieces} ${prod.subUnitName}`;
                              }
                              return `${wholeUnits} ${prod.unit} و ${pieces} ${prod.subUnitName}`;
                            })()}
                          </span>
                        </td>

                        {/* Minimum Stock Alert Threshold */}
                        <td className="p-3.5 text-center font-mono font-bold text-gray-600">
                          {prod.minStockAlert} {prod.unit}
                        </td>

                        {/* Stock Status Badge */}
                        <td className="p-3.5 text-center">
                          {isOut ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-600 text-white shadow-xs inline-flex items-center gap-1">
                              <AlertOctagon className="w-3 h-3" />
                              <span>نفذ بالكامل</span>
                            </span>
                          ) : isLow ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-500 text-white shadow-xs inline-flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              <span>حد الإنذار</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>متوفر بالمخزن</span>
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedProductForBarcode(prod)}
                              className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg cursor-pointer transition-colors"
                              title="طباعة ملصق الباركود للصنف"
                            >
                              <Barcode className="w-4 h-4 text-amber-600" />
                            </button>

                            <button
                              onClick={() => {
                                setActiveSubTab('adjustment');
                                setAdjProductId(prod.id);
                                setActualStock(prod.stock);
                              }}
                              className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg cursor-pointer transition-colors"
                              title="جرد وتسوية الكمية"
                            >
                              <ClipboardList className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleOpenEditModal(prod)}
                              className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg cursor-pointer transition-colors"
                              title="تعديل بيانات الصنف"
                            >
                              <Edit3 className="w-4 h-4 text-emerald-600" />
                            </button>

                            {onDeleteProduct && (
                              <button
                                onClick={() => handleDeleteProductClick(prod)}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg cursor-pointer transition-colors"
                                title="حذف الصنف"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: LOW STOCK ALERTS & REORDER CENTER (مركز تنبيهات نقص المخزون) */}
      {/* ========================================================================= */}
      {activeSubTab === 'alerts' && (
        <div className="space-y-6">
          
          {/* Warning Header Card */}
          <div className="bg-amber-50 border border-amber-200 rounded-[2rem] p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-md">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="font-extrabold text-amber-950 text-base">مركز مراقبة وتنبيهات حدود الأمان</h3>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  هذه أصناف وصل مخزونها الحالي إلى الحد الأدنى المحدد أو أقل. يوصى بإصدار طلبية شراء سريعة لتجنب نفاد الصنف لدى الزبائن.
                </p>
              </div>
            </div>

            {onNavigateToPurchases && lowStockProducts.length > 0 && (
              <button
                onClick={onNavigateToPurchases}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-full text-xs font-extrabold shadow-md transition-all cursor-pointer flex items-center gap-2 shrink-0"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>إصدار فاتورة شراء سريعة للأصناف المنخفضة ←</span>
              </button>
            )}
          </div>

          {lowStockProducts.length === 0 ? (
            <div className="bg-white rounded-[2rem] p-12 text-center border border-gray-100 shadow-xs space-y-3">
              <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto" />
              <h3 className="text-lg font-bold text-indigo-950">ممتاز! جميع الأصناف متوفرة بنسب أمان ممتازة</h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                لا توجد أي أصناف وصلت حد الإنذار بالنقص حالياً. يمكنك المتابعة وتسجيل المبيعات بكل أرياحية.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {lowStockProducts.map(prod => {
                const deficit = Math.max(0, prod.minStockAlert - prod.stock);
                const recommendedOrder = (prod.minStockAlert * 2) - prod.stock;
                const estimatedCost = recommendedOrder * prod.costPrice;

                return (
                  <div key={prod.id} className="bg-white rounded-[2rem] p-6 border border-rose-200/90 shadow-xs space-y-4 relative overflow-hidden">
                    <div className="absolute top-0 left-0 bg-rose-500 text-white text-[10px] font-extrabold px-3 py-1 rounded-br-2xl">
                      تنبيه نقص حاد!
                    </div>

                    <div className="pt-2">
                      <span className="text-[10px] font-bold text-gray-400 font-mono">{prod.barcode}</span>
                      <h4 className="font-extrabold text-indigo-950 text-sm mt-0.5">{prod.name}</h4>
                      <p className="text-xs text-gray-500 font-medium">{prod.category} | الرف: {prod.location || 'المستودع الرئيسي'}</p>
                    </div>

                    {/* Stock Status Bar */}
                    <div className="bg-rose-50 p-3.5 rounded-2xl border border-rose-100 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-rose-900">المخزون الحالي:</span>
                        <span className="font-mono font-extrabold text-rose-700 bg-white px-2.5 py-0.5 rounded-full border border-rose-200">
                          {prod.stock} {prod.unit}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-gray-600">الحد الأدنى المطلوبة:</span>
                        <span className="font-mono font-bold text-gray-700">{prod.minStockAlert} {prod.unit}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs border-t border-rose-200/60 pt-2">
                        <span className="font-bold text-indigo-950">الكمية المقترحة لإعادة الطلب:</span>
                        <span className="font-mono font-extrabold text-indigo-700">{recommendedOrder} {prod.unit}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs pt-1 text-gray-500">
                      <span>سعر الشراء المتوقع:</span>
                      <span className="font-mono font-bold text-indigo-950">{estimatedCost.toFixed(0)} {settings.currencySymbol}</span>
                    </div>

                    {onNavigateToPurchases && (
                      <button
                        onClick={onNavigateToPurchases}
                        className="w-full py-2.5 bg-indigo-950 hover:bg-indigo-900 text-white text-xs font-extrabold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <ShoppingCart className="w-3.5 h-3.5 text-indigo-300" />
                        <span>طلب الشراء من المورد</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: STOCK COUNT & ADJUSTMENTS (الجرد وتسوية المخزون) */}
      {/* ========================================================================= */}
      {activeSubTab === 'adjustment' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Stock Count Entry Form */}
          <div className="lg:col-span-1 bg-white rounded-[2rem] p-6 border border-gray-100 shadow-xs space-y-5">
            <div className="border-b border-gray-100 pb-3">
              <h3 className="font-extrabold text-indigo-950 text-base flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-indigo-600" />
                <span>تسوية وجرد المخزون يدويًا</span>
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                تحديث الكميات الفعلية بعد الجرد أو معالجة التلفيات والزيادات.
              </p>
            </div>

            {adjSuccessMsg && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 leading-relaxed">
                {adjSuccessMsg}
              </div>
            )}

            <form onSubmit={handleSaveStockAdjustment} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">اختيار الصنف المراد جرده *</label>
                <select
                  value={adjProductId}
                  onChange={(e) => {
                    setAdjProductId(e.target.value);
                    const prod = products.find(p => p.id === e.target.value);
                    if (prod) setActualStock(prod.stock);
                  }}
                  className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-bold"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (المخزون الحالي: {p.stock} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              {selectedAdjProduct && (
                <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-600">المخزون المسجل بالنظام:</span>
                    <span className="font-mono font-extrabold text-indigo-900">{selectedAdjProduct.stock} {selectedAdjProduct.unit}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-gray-500">
                    <span>مكان الصنف: {selectedAdjProduct.location || 'غير محدد'}</span>
                    <span>سعر التكلفة: {selectedAdjProduct.costPrice} {settings.currencySymbol}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-gray-700 mb-1">العدد والكمية الفعلية بالجرد *</label>
                <input
                  type="number"
                  required
                  value={actualStock}
                  onChange={(e) => setActualStock(Number(e.target.value))}
                  className="w-full p-3 border border-gray-200 rounded-xl font-mono text-base font-extrabold text-indigo-950 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {selectedAdjProduct && (
                <div className={`p-3 rounded-xl border text-xs font-bold flex justify-between items-center ${
                  stockDifference === 0 ? 'bg-gray-50 border-gray-200 text-gray-600' :
                  stockDifference > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                  <span>الفارق الناتج عن الجرد:</span>
                  <span className="font-mono font-extrabold text-sm">
                    {stockDifference > 0 ? `+${stockDifference}` : stockDifference} {selectedAdjProduct.unit}
                  </span>
                </div>
              )}

              <div>
                <label className="block font-bold text-gray-700 mb-1">سبب التسوية / الجرد *</label>
                <select
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value as any)}
                  className="w-full p-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 font-bold"
                >
                  <option value="inventory_count">جرد دوري ومطابقة مع المخزن</option>
                  <option value="damage">تلف بضاعة أو كسر</option>
                  <option value="expired">انتهاء فترة الصلاحية</option>
                  <option value="intake">توريد بضاعة جديدة بدون فاتورة</option>
                  <option value="other">سبب آخر</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">ملاحظات وبيانات إضافية</label>
                <textarea
                  rows={2}
                  placeholder="اكتب ملاحظة حول سبب هذا الفارق إن وجد..."
                  value={adjNotes}
                  onChange={(e) => setAdjNotes(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <FileCheck className="w-4 h-4" />
                <span>اعتماد وتسجيل تسوية الجرد</span>
              </button>
            </form>
          </div>

          {/* Adjustment History Ledger */}
          <div className="lg:col-span-2 bg-white rounded-[2rem] p-6 border border-gray-100 shadow-xs space-y-4">
            <div>
              <h3 className="font-extrabold text-indigo-950 text-base">سجل تسويات وجرد المخزون السابقة</h3>
              <p className="text-xs text-gray-500 mt-0.5">تتبع تاريخ تعديلات الجرد وتلفيات البضاعة بالكامل</p>
            </div>

            {stockAdjustments.length === 0 ? (
              <div className="p-10 text-center text-gray-400 space-y-2 border border-dashed border-gray-200 rounded-2xl">
                <ClipboardList className="w-10 h-10 mx-auto text-gray-300" />
                <p className="text-xs font-bold">لم تُسجل أي عملية جرد أو تسوية يدويًا بعد</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600 border-b border-gray-200 font-bold">
                      <th className="p-3">التاريخ والوقت</th>
                      <th className="p-3">اسم الصنف</th>
                      <th className="p-3">السبب</th>
                      <th className="p-3 text-center">المخزون السابق</th>
                      <th className="p-3 text-center">الكمية الفعلية</th>
                      <th className="p-3 text-center">الفارق</th>
                      <th className="p-3">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {stockAdjustments.map(adj => (
                      <tr key={adj.id} className="hover:bg-gray-50">
                        <td className="p-3 text-gray-500 font-mono">{adj.date} {adj.time}</td>
                        <td className="p-3 font-bold text-indigo-950">{adj.productName}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">
                            {adj.reason === 'inventory_count' ? 'جرد دوري' :
                             adj.reason === 'damage' ? 'تلفيات' :
                             adj.reason === 'expired' ? 'منتهي الصلاحية' :
                             adj.reason === 'intake' ? 'بضاعة جديدة' : 'تسوية أخرى'}
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-gray-600">{adj.previousStock}</td>
                        <td className="p-3 text-center font-mono font-extrabold text-indigo-900">{adj.actualStock}</td>
                        <td className="p-3 text-center font-mono font-bold">
                          <span className={adj.difference >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                            {adj.difference > 0 ? `+${adj.difference}` : adj.difference}
                          </span>
                        </td>
                        <td className="p-3 text-gray-500 text-[11px]">{adj.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 4: UNIFIED STOCK MOVEMENTS LEDGER (حركة وسجل المخزون الموحد) */}
      {/* ========================================================================= */}
      {activeSubTab === 'movements' && (
        <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-xs space-y-5">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4">
            <div>
              <h3 className="font-extrabold text-indigo-950 text-base flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                <span>سجل حركة المخزون الموحد الآلي</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                تتبع شامل لكافة عمليات الخصم (المبيعات) والإضافة (المشتريات) والتسويات.
              </p>
            </div>

            {/* Movement Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-600">تصفية حسب نوع العملية:</span>
              <select
                value={movementTypeFilter}
                onChange={(e) => setMovementTypeFilter(e.target.value as any)}
                className="p-2 text-xs border border-gray-200 rounded-full bg-white font-bold text-indigo-950 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">كافة الحركات ({allMovements.length})</option>
                <option value="sale">المبيعات فقط (خصم)</option>
                <option value="purchase">المشتريات فقط (إضافة)</option>
                <option value="adjustment">تسويات الجرد</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-700 border-b border-gray-200 font-bold">
                  <th className="p-3.5">التاريخ والوقت</th>
                  <th className="p-3.5">اسم الصنف</th>
                  <th className="p-3.5">نوع الحركة</th>
                  <th className="p-3.5 text-center">مقدار التغير</th>
                  <th className="p-3.5">رقم المرجع / الفاتورة</th>
                  <th className="p-3.5">الملاحظات والتفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredMovements.map((mov, idx) => {
                  const isPositive = mov.quantityChange > 0;
                  return (
                    <tr key={`${mov.id}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 font-mono text-gray-500">{mov.date} {mov.time}</td>
                      <td className="p-3.5 font-extrabold text-indigo-950">{mov.productName}</td>
                      <td className="p-3.5">
                        {mov.type === 'sale' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 inline-flex items-center gap-1">
                            <ArrowDownRight className="w-3 h-3 text-amber-600" />
                            <span>مبيعات (خصم)</span>
                          </span>
                        ) : mov.type === 'purchase' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 inline-flex items-center gap-1">
                            <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                            <span>مشتريات (إضافة)</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 inline-flex items-center gap-1">
                            <RefreshCw className="w-3 h-3 text-sky-600" />
                            <span>تسوية جرد</span>
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-center font-mono font-extrabold">
                        <span className={`px-2.5 py-1 rounded-full ${
                          isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {isPositive ? `+${mov.quantityChange}` : mov.quantityChange}
                        </span>
                      </td>

                      <td className="p-3.5 font-mono font-bold text-indigo-900">{mov.refNumber}</td>
                      <td className="p-3.5 text-gray-600 text-[11px]">{mov.notes || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 5: CATEGORIES MANAGEMENT (إدارة الأصناف والأقسام الرئيسية) */}
      {/* ========================================================================= */}
      {activeSubTab === 'categories' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-[2rem] p-6 shadow-md flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-xl font-extrabold flex items-center gap-2">
                <FolderPlus className="w-6 h-6 text-amber-400" />
                <span>إدارة الأصناف والأقسام الرئيسية للسوبرماركت</span>
              </h2>
              <p className="text-xs text-indigo-200">
                قسّم أصناف المتجر (مواد غذائية، ألبان، شوكولاتة، إلخ) أو قم بإدارتها وإضافة أقسام جديدة وتحديد المنتجات التابعة لكل قسم بكل حرية.
              </p>
            </div>
            <button
              onClick={handleOpenAddCategoryModal}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-xl shadow-sm flex items-center gap-2 cursor-pointer text-xs"
            >
              <Plus className="w-4 h-4" />
              <span>+ إضافة قسم/تصنيف رئيسي جديد</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoriesList.map(cat => {
              const count = products.filter(p => p.category === cat.name).length;
              return (
                <div key={cat.id} className="bg-white rounded-[2rem] p-5 border border-gray-100 shadow-xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-indigo-50 text-indigo-800 border border-indigo-100 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{cat.name}</span>
                      </span>
                      <span className="text-xs font-bold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
                        {count} أصناف
                      </span>
                    </div>
                    {cat.description && (
                      <p className="text-xs text-gray-600 font-medium leading-relaxed">
                        {cat.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        setSelectedCategory(cat.name);
                        setActiveSubTab('catalog');
                      }}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Boxes className="w-3.5 h-3.5" />
                      <span>عرض المنتجات</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditCategoryModal(cat)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                        title="تعديل الاسم والوصف"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategoryClick(cat)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                        title="حذف القسم"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* General / Unclassified Card */}
            {(() => {
              const unclassifiedCount = products.filter(p => !p.category || p.category === 'عام / غير محدد').length;
              return (
                <div className="bg-slate-50/80 rounded-[2rem] p-5 border border-dashed border-slate-300 shadow-xs space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-slate-200 text-slate-800 flex items-center gap-1.5">
                        <Folder className="w-3.5 h-3.5 text-slate-600" />
                        <span>عام / بدون تصنيف</span>
                      </span>
                      <span className="text-xs font-bold text-slate-600 bg-white px-2.5 py-1 rounded-full border border-slate-200">
                        {unclassifiedCount} أصناف
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      الأصناف التي لم يتم ربطها بقسم محدد وتعتبر اختياري.
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        setSelectedCategory('عام / غير محدد');
                        setActiveSubTab('catalog');
                      }}
                      className="text-xs font-bold text-slate-700 hover:text-indigo-600 flex items-center gap-1 cursor-pointer"
                    >
                      <Boxes className="w-3.5 h-3.5" />
                      <span>استعراض هذه الأصناف</span>
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 6: SPECIAL OFFERS MANAGEMENT (إدارة العروض الترويجية والخصومات) */}
      {/* ========================================================================= */}
      {activeSubTab === 'offers' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-rose-700 via-rose-950 to-slate-900 text-white rounded-[2rem] p-6 shadow-md flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-xl font-extrabold flex items-center gap-2">
                <Tag className="w-6 h-6 text-rose-400 animate-pulse" />
                <span>إدارة العروض الترويجية والخصومات الحية بالمتجر</span>
              </h2>
              <p className="text-xs text-rose-100">
                من هنا يمكنك متابعة وإضافة وإلغاء العروض الخاصة على السلع والمنتجات. يتم عرض السعر القديم مشطوباً ونسبة الخصم بجانب السلعة في متجر الزبون فوراً!
              </p>
            </div>
          </div>

          {/* Quick Add Offer Box */}
          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xs space-y-4">
            <h3 className="text-xs font-black text-rose-950 flex items-center gap-1.5 border-b border-gray-100 pb-3">
              <span>✨</span>
              <span>تفعيل عرض خاص جديد على صنف موجود</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-1.5 md:col-span-2">
                <label className="block text-[11px] font-bold text-gray-700">اختر المنتج المراد تفعيل العرض له:</label>
                <select
                  value={offerProductIdToAdd}
                  onChange={(e) => {
                    const id = e.target.value;
                    setOfferProductIdToAdd(id);
                    const prod = products.find(p => p.id === id);
                    if (prod) {
                      setQuickOriginalPrice(prod.sellingPrice.toString());
                      setQuickOfferPrice((prod.sellingPrice * 0.8).toString()); // suggest 20% discount
                    } else {
                      setQuickOriginalPrice('');
                      setQuickOfferPrice('');
                    }
                  }}
                  className="w-full p-2.5 text-xs border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-bold"
                >
                  <option value="">-- اختر صنفاً من المخزن لتنزيل عرض عليه --</option>
                  {products.filter(p => !p.isOffer).map(prod => (
                    <option key={prod.id} value={prod.id}>
                      {prod.name} ({prod.category}) - السعر الحالي: {prod.sellingPrice} {settings.currencySymbol} [المخزون: {prod.stock}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-gray-700">السعر السابق (قبل الخصم):</label>
                <input
                  type="number"
                  placeholder="السعر الأصلي..."
                  value={quickOriginalPrice}
                  onChange={(e) => setQuickOriginalPrice(e.target.value)}
                  className="w-full p-2 text-xs border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-bold font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-gray-700">سعر العرض الحالي الجديد:</label>
                <input
                  type="number"
                  placeholder="سعر البيع بالعرض..."
                  value={quickOfferPrice}
                  onChange={(e) => setQuickOfferPrice(e.target.value)}
                  className="w-full p-2 text-xs border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-bold font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  if (!offerProductIdToAdd) {
                    alert('الرجاء اختيار المنتج أولاً!');
                    return;
                  }
                  const original = parseFloat(quickOriginalPrice);
                  const offer = parseFloat(quickOfferPrice);
                  if (isNaN(original) || original <= 0) {
                    alert('الرجاء إدخال سعر سابق صحيح أكبر من الصفر');
                    return;
                  }
                  if (isNaN(offer) || offer <= 0) {
                    alert('الرجاء إدخال سعر العرض صحيح أكبر من الصفر');
                    return;
                  }
                  if (offer >= original) {
                    alert('تنبيه: سعر العرض يجب أن يكون أقل من السعر السابق لكي تظهر نسبة الخصم للزبائن بشكل صحيح!');
                  }

                  const prod = products.find(p => p.id === offerProductIdToAdd);
                  if (prod) {
                    const updated: Product = {
                      ...prod,
                      isOffer: true,
                      originalPrice: original,
                      sellingPrice: offer
                    };
                    onUpdateProduct(updated);
                    setOfferProductIdToAdd('');
                    setQuickOriginalPrice('');
                    setQuickOfferPrice('');
                    alert('تم تفعيل العرض الخاص على الصنف بنجاح!');
                  }
                }}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl shadow-xs text-xs flex items-center gap-1.5 cursor-pointer transform active:scale-95 transition-all"
              >
                <span>🔥</span>
                <span>تنشيط وتفعيل العرض الخاص</span>
              </button>
            </div>
          </div>

          {/* Active Offers Table */}
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xs font-black text-gray-800 flex items-center gap-1.5">
                <span>📦</span>
                <span>العروض النشطة حالياً ({products.filter(p => p.isOffer).length})</span>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-gray-200 font-bold">
                    <th className="p-3.5">الباركود</th>
                    <th className="p-3.5">اسم الصنف والقسم</th>
                    <th className="p-3.5 text-center">المخزون المتوفر</th>
                    <th className="p-3.5">السعر الأصلي</th>
                    <th className="p-3.5">سعر العرض الحالي</th>
                    <th className="p-3.5 text-center">نسبة التخفيض</th>
                    <th className="p-3.5 text-center">الإجراءات والتحكم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.filter(p => p.isOffer).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-400 font-bold">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <span className="text-3xl">🎁</span>
                          <span>لا يوجد عروض نشطة حالياً. اختر منتجاً من المربع أعلاه لتنشيطه كعرض خاص!</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    products.filter(p => p.isOffer).map(prod => {
                      const savings = prod.originalPrice && prod.originalPrice > prod.sellingPrice 
                        ? Math.round(((prod.originalPrice - prod.sellingPrice) / prod.originalPrice) * 100) 
                        : 0;

                      const isEditing = quickEditOfferId === prod.id;

                      return (
                        <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3.5 font-mono text-gray-600 font-bold">
                            {prod.barcode || '#'}
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-2">
                              {prod.image ? (
                                <img src={prod.image} alt={prod.name} className="w-8 h-8 rounded-lg object-cover border" />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-rose-50 border text-rose-700 flex items-center justify-center text-xs font-bold">🎁</div>
                              )}
                              <div>
                                <span className="font-extrabold text-indigo-950 block">{prod.name}</span>
                                <span className="text-[10px] text-gray-400 font-bold">{prod.category}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5 text-center">
                            {prod.stock <= 0 ? (
                              <span className="bg-rose-100 text-rose-700 font-black px-2.5 py-1 rounded-full text-[10px] inline-flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                نفد (مخفي للزبون)
                              </span>
                            ) : (
                              <span className="bg-emerald-100 text-emerald-800 font-black px-2.5 py-1 rounded-full text-[10px]">
                                متوفر: {prod.stock} {prod.unit}
                              </span>
                            )}
                          </td>
                          
                          <td className="p-3.5 font-mono">
                            {isEditing ? (
                              <input
                                type="number"
                                value={quickEditOriginalPrice}
                                onChange={(e) => setQuickEditOriginalPrice(e.target.value)}
                                className="w-20 p-1 text-xs border border-gray-300 rounded-md font-bold font-mono"
                              />
                            ) : (
                              <span className="text-gray-400 line-through font-bold">{prod.originalPrice || prod.sellingPrice} {settings.currencySymbol}</span>
                            )}
                          </td>

                          <td className="p-3.5 font-mono">
                            {isEditing ? (
                              <input
                                type="number"
                                value={quickEditOfferPrice}
                                onChange={(e) => setQuickEditOfferPrice(e.target.value)}
                                className="w-20 p-1 text-xs border border-gray-300 rounded-md font-bold font-mono"
                              />
                            ) : (
                              <span className="text-rose-600 font-extrabold">{prod.sellingPrice} {settings.currencySymbol}</span>
                            )}
                          </td>

                          <td className="p-3.5 text-center font-bold">
                            <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded-md font-mono text-[10px] font-black">
                              خصم {savings}%
                            </span>
                          </td>

                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={() => {
                                      const orig = parseFloat(quickEditOriginalPrice);
                                      const offer = parseFloat(quickEditOfferPrice);
                                      if (isNaN(orig) || orig <= 0 || isNaN(offer) || offer <= 0) {
                                        alert('الرجاء إدخال قيم صحيحة للأسعار!');
                                        return;
                                      }
                                      const updated: Product = {
                                        ...prod,
                                        originalPrice: orig,
                                        sellingPrice: offer
                                      };
                                      onUpdateProduct(updated);
                                      setQuickEditOfferId(null);
                                      alert('تم تعديل أسعار العرض بنجاح!');
                                    }}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg cursor-pointer"
                                  >
                                    حفظ
                                  </button>
                                  <button
                                    onClick={() => setQuickEditOfferId(null)}
                                    className="px-2.5 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-[10px] font-bold rounded-lg cursor-pointer"
                                  >
                                    إلغاء
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => {
                                      setQuickEditOfferId(prod.id);
                                      setQuickEditOriginalPrice((prod.originalPrice || prod.sellingPrice).toString());
                                      setQuickEditOfferPrice(prod.sellingPrice.toString());
                                    }}
                                    className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold rounded-lg text-[10px] cursor-pointer flex items-center gap-1"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                    تعديل الأسعار
                                  </button>

                                  <button
                                    onClick={() => {
                                      if (confirm(`هل أنت متأكد من إلغاء العرض الترويجي عن المنتج "${prod.name}" وإعادته لوضعه العادي؟`)) {
                                        const updated: Product = {
                                          ...prod,
                                          isOffer: false,
                                          originalPrice: undefined
                                        };
                                        onUpdateProduct(updated);
                                        alert('تم إلغاء العرض الترويجي بنجاح!');
                                      }
                                    }}
                                    className="px-2 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold rounded-lg text-[10px] cursor-pointer flex items-center gap-1"
                                  >
                                    <X className="w-3 h-3" />
                                    إلغاء العرض 🗑️
                                  </button>
                                </>
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

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT PRODUCT */}
      {/* ========================================================================= */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-[2rem] max-w-xl w-full shadow-2xl border border-gray-100 flex flex-col max-h-[92vh] overflow-hidden text-right">
            
            {/* Sticky Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-800/40 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/20 border border-indigo-400/30 rounded-xl text-indigo-300">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base">
                    {editingProduct ? 'تعديل بيانات الصنف والحد الأدنى' : 'إضافة صنف جديد لدليل المخزن'}
                  </h3>
                  {editingProduct && currentProductIndex !== -1 && (
                    <span className="text-[11px] text-indigo-200 block">
                      صنف {currentProductIndex + 1} من {products.length}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {editingProduct && currentProductIndex !== -1 && (
                  <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl border border-white/10">
                    <button
                      type="button"
                      onClick={() => handleNavigateProduct('prev')}
                      disabled={currentProductIndex <= 0}
                      className="p-1.5 text-white hover:bg-white/20 disabled:opacity-30 rounded-lg transition-all cursor-pointer"
                      title="الصنف السابق"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <span className="text-[10px] font-mono font-bold px-1 text-indigo-200">
                      {currentProductIndex + 1}/{products.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleNavigateProduct('next')}
                      disabled={currentProductIndex >= products.length - 1}
                      className="p-1.5 text-white hover:bg-white/20 disabled:opacity-30 rounded-lg transition-all cursor-pointer"
                      title="الصنف التالي"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <button 
                  onClick={() => setShowProductModal(false)} 
                  className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                  title="إغلاق"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveProduct} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto flex-1">
              
              {/* طريقة الإدخال */}
              <div className="flex bg-slate-100 p-1 rounded-2xl mb-2 gap-1 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setInputMethod('barcode')}
                  className={`flex-1 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    inputMethod === 'barcode'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-600 hover:text-indigo-900 hover:bg-white/40'
                  }`}
                >
                  <Barcode className="w-4 h-4" />
                  <span>الإدخال بالباركود</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInputMethod('manual');
                    if (!barcode || barcode.trim() === '') {
                      setBarcode(`628${Math.floor(1000000 + Math.random() * 9000000)}`);
                    }
                  }}
                  className={`flex-1 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    inputMethod === 'manual'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-600 hover:text-indigo-900 hover:bg-white/40'
                  }`}
                >
                  <Edit3 className="w-4 h-4" />
                  <span>الإدخال اليدوي</span>
                </button>
              </div>

              {existingProductWithBarcode && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3 text-amber-900 font-bold animate-in fade-in">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                    <div className="space-y-1 flex-1">
                      <div className="text-xs font-black text-amber-950">تنبيه: هذا الباركود مسجل بالفعل لصنف آخر!</div>
                      <div className="text-[11px] text-amber-800 font-semibold leading-relaxed">
                        اسم الصنف: <span className="font-extrabold text-amber-950 underline">{existingProductWithBarcode.name}</span>
                        <br />
                        المخزون الحالي: <span className="font-extrabold text-amber-950 bg-amber-100 px-1.5 py-0.5 rounded-md">{existingProductWithBarcode.stock} قطعة</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-white/80 rounded-xl border border-amber-100 space-y-2">
                    <span className="block text-[11px] text-amber-900 font-extrabold">تزويد سريع للمخزون الحالي:</span>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-slate-100 rounded-xl px-2 border border-slate-200">
                        <span className="text-[10px] text-slate-500 font-bold pl-1 shrink-0">الكمية المضافة:</span>
                        <input
                          type="number"
                          value={quickRestockQty}
                          onChange={(e) => setQuickRestockQty(Math.max(1, Number(e.target.value)))}
                          className="w-16 p-1.5 text-center font-mono font-bold text-xs bg-transparent border-none outline-none text-indigo-950 focus:ring-0"
                          min="1"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleQuickRestock(existingProductWithBarcode)}
                        className="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold py-2 px-3 rounded-xl shadow-xs transition-all active:scale-95 flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span>تأكيد التزويد السريع ➕</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        handleOpenEditModal(existingProductWithBarcode);
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] px-3 py-2 rounded-xl font-extrabold shadow-xs transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                    >
                      <span>تعديل بيانات الصنف بالكامل ✏️</span>
                    </button>
                  </div>
                </div>
              )}

              {inputMethod === 'barcode' ? (
                <div className="p-3.5 bg-indigo-50/60 rounded-2xl border border-indigo-100/80 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="font-extrabold text-indigo-950 flex items-center gap-1.5 text-[11px]">
                      <Barcode className="w-4 h-4 text-indigo-600" />
                      <span>بيانات رمز الباركود والاسم الخاص بالمنتج</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowFormCameraScanner(true)}
                      className="inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-3 py-1.5 rounded-xl text-[10px] shadow-xs transition-all cursor-pointer active:scale-95 shrink-0"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>مسح الباركود بالكاميرا الحية (اختياري)</span>
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="block font-bold text-slate-700 mb-1">رمز الباركود *</span>
                      <input
                        type="text"
                        required
                        value={barcode}
                        onChange={(e) => setBarcode(e.target.value)}
                        className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono text-center font-bold text-xs bg-white"
                        placeholder="امسح أو اكتب الباركود"
                      />
                    </div>
                    <div>
                      <span className="block font-bold text-slate-700 mb-1">اسم الصنف الكامل *</span>
                      <input
                        type="text"
                        required
                        placeholder="مثال: حليب المراعي 1 لتر"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold bg-white"
                      />
                    </div>
                  </div>
                  <BarcodeScannerModal
                    isOpen={showFormCameraScanner}
                    onClose={() => setShowFormCameraScanner(false)}
                    onScanSuccess={(code) => setBarcode(code)}
                    title="مسح باركود الصنف بالكاميرا"
                    products={products}
                  />
                </div>
              ) : (
                <div className="p-3.5 bg-emerald-50/40 rounded-2xl border border-emerald-100/60 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <label className="font-extrabold text-emerald-950 text-[11px]">
                      إدخال صنف جديد يدوياً (توليد باركود تلقائي فريد)
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="block font-bold text-slate-700 mb-1">اسم الصنف الكامل *</span>
                      <input
                        type="text"
                        required
                        placeholder="مثال: حليب المراعي 1 لتر"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold bg-white"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-500 text-[10px]">الباركود المولد للصنف</span>
                        <button
                          type="button"
                          onClick={() => setBarcode(`628${Math.floor(1000000 + Math.random() * 9000000)}`)}
                          className="text-[9px] text-emerald-700 hover:underline font-bold cursor-pointer"
                        >
                          توليد رمز جديد
                        </button>
                      </div>
                      <input
                        type="text"
                        required
                        value={barcode}
                        onChange={(e) => setBarcode(e.target.value)}
                        className="w-full p-2.5 border border-gray-200 bg-slate-50 text-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono text-center text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Product Image Input Field */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-gray-700 flex items-center gap-1.5 text-[11px]">
                    <ImageIcon className="w-4 h-4 text-purple-600" />
                    <span>صورة المنتج (اختيارية)</span>
                  </label>
                  {image && (
                    <button
                      type="button"
                      onClick={() => setImage('')}
                      className="text-rose-600 hover:text-rose-800 text-[11px] font-bold cursor-pointer"
                    >
                      حذف الصورة
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  {image ? (
                    <img
                      src={image}
                      alt="معاينة الصنف"
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-purple-500 shadow-xs shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-400 shrink-0">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                  )}

                  <div className="flex-1 space-y-2 w-full">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold px-3 py-2 rounded-xl text-xs cursor-pointer shadow-xs transition-all">
                        <Upload className="w-4 h-4 text-purple-600" />
                        <span>{image ? 'تغيير الملف' : 'رفع صورة من الجهاز'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleProductImageUpload(file);
                          }}
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => setShowProductCameraCaptureModal(true)}
                        className="inline-flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold px-3 py-2 rounded-xl text-xs shadow-xs transition-all cursor-pointer active:scale-95"
                      >
                        <Camera className="w-4 h-4 text-purple-200" />
                        <span>التقاط بالكاميرا الحية (ميزة اختيارية) 📷</span>
                      </button>
                    </div>

                    <p className="text-[10px] text-slate-500 font-medium">
                      التقط صورة المنتج مباشرة بالكاميرا أو قم برفعها كملف لتسهيل التعرف البصري عليه وعرضه.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-gray-700">التصنيف الرئيسي (اختياري)</label>
                    <button
                      type="button"
                      onClick={() => setShowQuickAddCat(!showQuickAddCat)}
                      className="text-[11px] font-extrabold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                      <span>+ قسم جديد</span>
                    </button>
                  </div>

                  {showQuickAddCat && (
                    <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl flex flex-col gap-2 w-full">
                      <input
                        type="text"
                        placeholder="اسم القسم الجديد..."
                        value={quickCatName}
                        onChange={(e) => setQuickCatName(e.target.value)}
                        className="w-full p-2 border border-indigo-200 rounded-lg text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={handleSaveQuickCategory}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-lg text-xs cursor-pointer text-center"
                      >
                        إضافة وتحديد
                      </button>
                    </div>
                  )}

                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white font-bold text-gray-800"
                  >
                    <option value="">-- بدون تصنيف (صنف عام / اختياري) --</option>
                    {availableCategoryNames.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">وحدة القياس</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white font-bold"
                  >
                    <option value="قطعة">قطعة</option>
                    <option value="عبوة">عبوة</option>
                    <option value="علبة">علبة</option>
                    <option value="كيس">كيس</option>
                    <option value="شدة">شدة</option>
                    <option value="كرتون">كرتون</option>
                    <option value="كجم">كجم</option>
                    <option value="لتر">لتر</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">سعر الشراء (التكلفة) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={costPrice}
                    onChange={(e) => setCostPrice(Number(e.target.value))}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">سعر البيع للمستهلك *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(Number(e.target.value))}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono font-extrabold text-emerald-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                <div>
                  <label className="block font-bold text-indigo-950 mb-1">الكمية الافتتاحية/المتوفرة حالياً</label>
                  <input
                    type="number"
                    required
                    value={stock}
                    onChange={(e) => setStock(Number(e.target.value))}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono font-extrabold text-indigo-950 bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-rose-900 mb-1">حد إنذار نقص المخزون (الحد الأدنى)</label>
                  <input
                    type="number"
                    value={minStockAlert}
                    onChange={(e) => setMinStockAlert(Number(e.target.value))}
                    className="w-full p-3 border border-rose-200 rounded-xl focus:ring-2 focus:ring-rose-500 font-mono font-bold text-rose-800 bg-white"
                  />
                </div>
              </div>

              {/* تفعيل التجزئة والتعبئة الفرعية */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="pl-3">
                    <label className="block font-bold text-indigo-950 text-sm">تفعيل البيع بالتجزئة (شد كرتون / بيع بالحبة والقطع فردياً)</label>
                    <p className="text-[10px] text-gray-500 font-medium">يتيح لك هذا الخيار بيع كرتون كامل أو كقطع فردية مجزأة بسعر وحساب تلقائي للمخزون.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={hasSubUnits}
                    onChange={(e) => setHasSubUnits(e.target.checked)}
                    className="w-5 h-5 accent-indigo-600 rounded cursor-pointer shrink-0"
                  />
                </div>

                {hasSubUnits && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-200/60">
                    <div>
                      <label className="block font-bold text-gray-700 text-xs mb-1">العدد داخل الكرتون/الكيس *</label>
                      <input
                        type="number"
                        min="2"
                        required
                        value={subUnitsPerUnit}
                        onChange={(e) => setSubUnitsPerUnit(Math.max(2, Number(e.target.value)))}
                        className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-xs"
                        placeholder="مثال: 24"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 text-xs mb-1">اسم الوحدة الفرعية *</label>
                      <input
                        type="text"
                        required
                        value={subUnitName}
                        onChange={(e) => setSubUnitName(e.target.value)}
                        className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-xs"
                        placeholder="مثال: حبة، كيس، قطعة"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 text-xs mb-1">سعر بيع الحبة (تلقائي/مخصص)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={subUnitSellingPrice || ''}
                        onChange={(e) => setSubUnitSellingPrice(Number(e.target.value))}
                        className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono font-extrabold text-xs text-emerald-700"
                        placeholder={(sellingPrice / subUnitsPerUnit).toFixed(0)}
                      />
                      <p className="text-[9px] text-gray-400 mt-0.5">التلقائي المحسوب: {(sellingPrice / subUnitsPerUnit).toFixed(0)} {settings.currencySymbol}</p>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">مكان وتوضيع الصنف بالمتجر (رف/مستودع)</label>
                <input
                  type="text"
                  placeholder="مثال: رف B3 - المستودع الخلفي"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Marketing and Online Store Settings */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 space-y-4">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider pb-2 border-b border-slate-200/60">إعدادات العروض والخصومات</h4>

                <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-100">
                  <div>
                    <label className="block font-bold text-gray-800 text-xs">تفعيل كعرض ترويجي خاص</label>
                    <p className="text-[10px] text-gray-400">سيتم إدراج هذا المنتج في قسم العروض الخاصة والخصومات.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isOffer}
                    onChange={(e) => setIsOffer(e.target.checked)}
                    className="w-5 h-5 accent-indigo-600 rounded-lg cursor-pointer"
                  />
                </div>

                {isOffer && (
                  <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-100/50 grid grid-cols-2 gap-3 items-center animate-fade-in">
                    <div>
                      <label className="block font-bold text-rose-950 text-xs mb-1">السعر الأصلي السابق قبل الخصم</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="مثال: 50.00"
                        value={originalPrice || ''}
                        onChange={(e) => setOriginalPrice(Number(e.target.value))}
                        className="w-full p-2.5 bg-white border border-rose-200 rounded-xl focus:ring-2 focus:ring-rose-500 font-mono font-bold text-rose-800"
                      />
                    </div>
                    <div>
                      <span className="block font-bold text-slate-500 text-[10px] mb-1">سعر العرض المخفض الحالي</span>
                      <p className="font-mono font-black text-emerald-700 text-sm bg-white p-2.5 border border-slate-100 rounded-xl">{sellingPrice} {settings.currencySymbol}</p>
                    </div>
                  </div>
                )}
              </div>

              </div>

              {/* Sticky Footer Action Bar */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 shrink-0 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowProductModal(false)}
                    className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                  >
                    إلغاء / رجوع
                  </button>

                  {editingProduct && onDeleteProduct && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowProductModal(false);
                        handleDeleteProductClick(editingProduct);
                      }}
                      className="px-4 py-2.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 font-extrabold rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>حذف هذا الصنف نهائياً</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSaveProductInternal(true)}
                    className="px-4 py-2.5 bg-indigo-100 border border-indigo-200 hover:bg-indigo-200 text-indigo-950 font-extrabold rounded-xl text-xs transition-all cursor-pointer"
                  >
                    {editingProduct ? 'حفظ وإضافة صنف جديد' : 'حفظ وإضافة صنف آخر'}
                  </button>

                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs shadow-md transition-all cursor-pointer active:scale-95"
                  >
                    حفظ وإغلاق
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal: Barcode Label Printing */}
      <BarcodeLabelModal
        isOpen={!!selectedProductForBarcode}
        onClose={() => setSelectedProductForBarcode(null)}
        product={selectedProductForBarcode}
        settings={settings}
      />

      {/* Modal: ADD / EDIT CATEGORY */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-5 text-right">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-extrabold text-indigo-950 text-base flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-indigo-600" />
                <span>{editingCategory ? 'تعديل بيانات القسم/التصنيف' : 'إضافة قسم رئيسي جديد'}</span>
              </h3>
              <button 
                onClick={() => setShowCategoryModal(false)} 
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-base cursor-pointer flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCategoryModal} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">اسم القسم/التصنيف الرئيسي *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: ألبان وأجبان، مواد غذائية، شوكولاتة..."
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">وصف القسم أو توضيحه (اختياري)</label>
                <textarea
                  rows={3}
                  placeholder="مثال: الحليب، اللبن، الأجبان، القشطة والزبدة..."
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl shadow-xs cursor-pointer"
                >
                  حفظ القسم
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Live Camera Capture for Product Image */}
      <ProductCameraCaptureModal
        isOpen={showProductCameraCaptureModal}
        onClose={() => setShowProductCameraCaptureModal(false)}
        onCapture={(imgDataUrl) => setImage(imgDataUrl)}
      />

      {/* Modal: Custom Delete Confirmation */}
      {customConfirm?.isOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-5 text-right animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-extrabold text-indigo-950 text-base flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5 animate-pulse" />
                <span>{customConfirm.title}</span>
              </h3>
              <button 
                onClick={() => setCustomConfirm(null)} 
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-base cursor-pointer flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-700 font-bold leading-relaxed whitespace-pre-line">
              {customConfirm.message}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setCustomConfirm(null)}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl cursor-pointer text-xs"
              >
                تراجع / إلغاء
              </button>
              <button
                type="button"
                onClick={customConfirm.onConfirm}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl shadow-md cursor-pointer text-xs transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>تأكيد الحذف</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
