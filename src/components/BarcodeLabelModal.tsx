import React, { useRef } from 'react';
import { X, Printer, Barcode as BarcodeIcon, Tag } from 'lucide-react';
import { Product, ShopSettings } from '../types/accounting';

interface BarcodeLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  settings: ShopSettings;
}

export const BarcodeLabelModal: React.FC<BarcodeLabelModalProps> = ({
  isOpen,
  onClose,
  product,
  settings,
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [printCount, setPrintCount] = React.useState<number>(10);

  if (!isOpen || !product) return null;

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <title>طباعة ملصقات الباركود - ${product.name}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 10px; background: white; text-align: center; }
            .label-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; direction: rtl; }
            .label-card { border: 1px dashed #000; padding: 6px; border-radius: 4px; text-align: center; page-break-inside: avoid; }
            .shop-name { font-size: 9px; font-weight: bold; margin-bottom: 2px; }
            .prod-name { font-size: 11px; font-weight: bold; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; margin-bottom: 4px; }
            .price { font-size: 12px; font-weight: 900; color: #000; margin-top: 4px; }
            .barcode-box { height: 32px; background: repeating-linear-gradient(90deg, #000 0px, #000 2px, #fff 2px, #fff 4px, #000 4px, #000 7px, #fff 7px, #fff 9px); margin: 0 auto; width: 85%; }
            .barcode-text { font-family: monospace; font-size: 9px; margin-top: 2px; letter-spacing: 1px; }
            @media print {
              body { padding: 0; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="label-grid">
            ${Array.from({ length: printCount })
              .map(
                () => `
              <div class="label-card">
                <div class="shop-name">${settings.shopName || 'المتجر'}</div>
                <div class="prod-name">${product.name}</div>
                <div class="barcode-box"></div>
                <div class="barcode-text">${product.barcode}</div>
                <div class="price">${product.sellingPrice.toFixed(2)} ${settings.currencySymbol}</div>
              </div>
            `
              )
              .join('')}
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 dir-rtl text-right">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center border border-indigo-100 shadow-xs">
              <BarcodeIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">طباعة ملصقات الباركود للأصناف</h3>
              <p className="text-[11px] text-slate-500">طباعة ملصق السعر والباركود للصقها على المنتجات</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Settings */}
        <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100 flex items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-md">
              {product.barcode}
            </span>
            <h4 className="font-extrabold text-slate-900 text-sm mt-1">{product.name}</h4>
            <p className="text-xs font-black text-emerald-600 mt-0.5">
              السعر: {product.sellingPrice.toFixed(2)} {settings.currencySymbol}
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">عدد الملصقات:</label>
            <input
              type="number"
              min="1"
              max="100"
              value={printCount}
              onChange={(e) => setPrintCount(Math.max(1, Number(e.target.value)))}
              className="w-20 p-2 text-center text-xs font-black border border-indigo-200 bg-white rounded-xl focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Label Preview */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-700 flex items-center gap-1">
            <Tag className="w-3.5 h-3.5 text-indigo-600" />
            <span>معاينة ملصق الباركود:</span>
          </p>
          <div
            ref={printRef}
            className="bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-300 flex justify-center"
          >
            <div className="bg-white border-2 border-slate-900 p-3 rounded-xl w-44 text-center space-y-1 shadow-sm">
              <p className="text-[10px] font-extrabold text-slate-500 truncate">{settings.shopName || 'اسم المتجر'}</p>
              <p className="text-xs font-black text-slate-900 truncate">{product.name}</p>
              <div className="h-8 bg-[repeating-linear-gradient(90deg,#000_0px,#000_2px,#fff_2px,#fff_4px,#000_4px,#000_7px,#fff_7px,#fff_9px)] my-1.5 rounded-xs opacity-90"></div>
              <p className="text-[10px] font-mono font-extrabold text-slate-800 tracking-wider">{product.barcode}</p>
              <p className="text-sm font-black text-slate-950 border-t border-slate-200 pt-1 mt-1">
                {product.sellingPrice.toFixed(2)} {settings.currencySymbol}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-colors cursor-pointer"
          >
            إلغاء
          </button>
          <button
            onClick={handlePrint}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-2 shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة {printCount} ملصق الآن</span>
          </button>
        </div>

      </div>
    </div>
  );
};
