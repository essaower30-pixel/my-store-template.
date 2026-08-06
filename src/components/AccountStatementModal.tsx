import React, { useState, useRef } from 'react';
import { X, Printer, FileText, Package, Download, MessageSquare, ChevronDown, ChevronUp, ArrowRight, User, Phone, MapPin, Hash, Wallet, ArrowUpLeft, ArrowDownRight, Scale, Store } from 'lucide-react';
import { Customer, Supplier, SalesInvoice, PurchaseInvoice, PaymentVoucher, ShopSettings, InvoiceItem } from '../types/accounting';
import { WhatsAppShareModal } from './WhatsAppShareModal';
import { formatStatementWhatsAppMessage } from '../utils/whatsappFormatter';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

interface AccountStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  party: Customer | Supplier | null;
  partyType: 'customer' | 'supplier';
  salesInvoices?: SalesInvoice[];
  purchaseInvoices?: PurchaseInvoice[];
  vouchers: PaymentVoucher[];
  settings: ShopSettings;
}

export const AccountStatementModal: React.FC<AccountStatementModalProps> = ({
  isOpen,
  onClose,
  party,
  partyType,
  salesInvoices = [],
  purchaseInvoices = [],
  vouchers = [],
  settings,
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [statementMode, setStatementMode] = useState<'summary' | 'detailed'>('summary');
  const [showMainDetails, setShowMainDetails] = useState(true);
  const [expandedInvoiceIds, setExpandedInvoiceIds] = useState<string[]>([]);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [fullPageInvoice, setFullPageInvoice] = useState<{
    refNumber: string;
    date: string;
    type: string;
    notes?: string;
    items: InvoiceItem[];
    total: number;
  } | null>(null);

  if (!isOpen || !party) return null;

  // Build transaction rows
  let transactions: Array<{
    id: string;
    date: string;
    type: string;
    refNumber: string;
    debit: number;
    credit: number;
    notes: string;
    items?: InvoiceItem[];
  }> = [];

  // Opening balance row
  if (party.openingBalance !== 0) {
    transactions.push({
      id: 'opening',
      date: 'بداية الفترة',
      type: 'رصيد افتتاحي سابق',
      refNumber: party.code,
      debit: partyType === 'customer' ? party.openingBalance : 0,
      credit: partyType === 'supplier' ? party.openingBalance : 0,
      notes: 'الرصيد الافتتاحي المرجعي للحساب',
    });
  }

  if (partyType === 'customer') {
    // Invoices for customer = Debit (زيادة دين الزبون)
    const custInvoices = salesInvoices.filter(
      (inv) =>
        inv.customerId === party.id ||
        (party.code && inv.customerId === party.code) ||
        (party.name && inv.customerName && inv.customerName.trim().toLowerCase() === party.name.trim().toLowerCase())
    );
    custInvoices.forEach((inv) => {
      transactions.push({
        id: inv.id,
        date: inv.date,
        type: `فاتورة مبيعات ${inv.paymentMethod === 'credit' ? 'آجلة' : 'نقداً'}`,
        refNumber: inv.invoiceNumber,
        debit: inv.netTotal,
        credit: inv.paidAmount,
        notes: inv.notes || '',
        items: inv.items,
      });
    });

    // Receipts from customer = Credit (تخفيض دين الزبون)
    const custVouchers = vouchers.filter(
      (v) =>
        v.partyType === 'customer' &&
        (v.partyId === party.id ||
          (party.code && v.partyId === party.code) ||
          (party.name && v.partyName && v.partyName.trim().toLowerCase() === party.name.trim().toLowerCase()))
    );
    custVouchers.forEach((v) => {
      transactions.push({
        id: v.id,
        date: v.date,
        type: 'سند قبض تحصيل',
        refNumber: v.voucherNumber,
        debit: 0,
        credit: v.amount,
        notes: v.notes || 'سداد وتحصيل مالي من الزبون',
      });
    });
  } else {
    // Invoices from supplier = Credit (زيادة دين المورد علينا)
    const suppInvoices = purchaseInvoices.filter(
      (inv) =>
        inv.supplierId === party.id ||
        (party.code && inv.supplierId === party.code) ||
        (party.name && inv.supplierName && inv.supplierName.trim().toLowerCase() === party.name.trim().toLowerCase())
    );
    suppInvoices.forEach((inv) => {
      transactions.push({
        id: inv.id,
        date: inv.date,
        type: `فاتورة مشتريات ${inv.paymentMethod === 'credit' ? 'آجلة' : 'نقداً'}`,
        refNumber: inv.invoiceNumber,
        debit: inv.paidAmount,
        credit: inv.netTotal,
        notes: inv.notes || '',
        items: inv.items,
      });
    });

    // Disbursement vouchers to supplier = Debit (سداد للمورد)
    const suppVouchers = vouchers.filter(
      (v) =>
        v.partyType === 'supplier' &&
        (v.partyId === party.id ||
          (party.code && v.partyId === party.code) ||
          (party.name && v.partyName && v.partyName.trim().toLowerCase() === party.name.trim().toLowerCase()))
    );
    suppVouchers.forEach((v) => {
      transactions.push({
        id: v.id,
        date: v.date,
        type: 'سند صرف سداد',
        refNumber: v.voucherNumber,
        debit: v.amount,
        credit: 0,
        notes: v.notes || 'سداد مالي للمورد',
      });
    });
  }

  // Sort by date
  transactions.sort((a, b) => a.date.localeCompare(b.date));

  // Calculate running balance
  let runningBalance = 0;
  const rowsWithBalance = transactions.map((t) => {
    if (partyType === 'customer') {
      runningBalance += t.debit - t.credit;
    } else {
      runningBalance += t.credit - t.debit;
    }
    return { ...t, runningBalance };
  });

  // Calculate summary metrics for Main Account Details
  const totalDebitSum = rowsWithBalance.reduce((sum, r) => sum + (r.debit || 0), 0);
  const totalCreditSum = rowsWithBalance.reduce((sum, r) => sum + (r.credit || 0), 0);
  const invoiceCount = transactions.filter((t) => t.type.includes('فاتورة')).length;
  const voucherCount = transactions.filter((t) => t.type.includes('سند')).length;
  const openingBal = party.openingBalance || 0;

  const toggleExpand = (id: string) => {
    setExpandedInvoiceIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const getHtmlDocument = () => `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <title>كشف حساب (${statementMode === 'detailed' ? 'تفصيلي بالأصناف' : 'مختصر'}) - ${party.name}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; direction: rtl; color: #0f172a; font-weight: bold; }
            .header { text-align: center; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 16px; }
            .shop-title { font-size: 22px; font-weight: 900; color: #0f172a; }
            .sub-title { font-size: 15px; color: #334155; font-weight: 800; }
            .welcome-card { background: #f0fdf4; border: 2px solid #16a34a; padding: 12px 16px; border-radius: 10px; margin-bottom: 16px; text-align: center; color: #14532d; font-size: 13px; line-height: 1.6; }
            .party-box { background: #f1f5f9; border: 2px solid #cbd5e1; padding: 14px; border-radius: 10px; margin-bottom: 16px; display: flex; justify-content: space-between; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
            th, td { border: 1px solid #94a3b8; padding: 8px; text-align: right; }
            th { background: #e2e8f0; font-weight: 900; color: #0f172a; }
            .balance-final { font-weight: 900; background: #e0f2fe; color: #0369a1; }
            .num { font-family: monospace; font-weight: 900; }
            .item-subtable { width: 98%; margin: 8px auto 12px auto; background: #ffffff; border: 2px solid #38bdf8; border-radius: 6px; font-size: 11px; }
            .item-subtable th { background: #0284c7; color: #ffffff; font-weight: 900; }
            .item-subtable td { border: 1px solid #cbd5e1; }
            .thanks-card { background: #f0fdf4; border: 2px solid #16a34a; padding: 12px; border-radius: 10px; margin-top: 20px; text-align: center; font-size: 13px; color: #15803d; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="shop-title">${settings.shopName || 'المتجر'}</div>
            <div class="sub-title">كشف حساب ${statementMode === 'detailed' ? 'تفصيلي شامل للأصناف والأسعار' : 'مختصر'} (${partyType === 'customer' ? 'زبون' : 'مورد'}): ${party.name}</div>
            <div style="font-size: 12px; color: #475569; margin-top: 4px;">تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-SA')}</div>
          </div>

          <!-- Welcome Header (ترويسة الترحيب) -->
          <div class="welcome-card">
            <strong style="font-size: 15px; color: #15803d;">🌸 أهلاً وسهلاً بكم في ${settings.shopName || 'متجرنا المحترم'}</strong><br/>
            عزيزنا/السيد المحترم: <strong>${party.name}</strong> - تحية طيبة وبعد، يسعدنا خدمتكم ورعايتكم دائماً ونرفق لكم كشف الحساب المعتمد التالي:
          </div>

          <div class="party-box">
            <div>
              <strong>رقم الحساب:</strong> ${party.code}<br/>
              <strong>الهاتف:</strong> ${party.phone || 'غير مسجل'}<br/>
              <strong>العنوان:</strong> ${party.address || 'غير مسجل'}
            </div>
            <div style="text-align: left;">
              <strong>الرصيد المتبقي المستحق الآن:</strong><br/>
              <span style="font-size: 20px; color: #0284c7; font-weight: 900;">
                ${runningBalance.toFixed(2)} ${settings.currencySymbol}
              </span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>التاريخ</th>
                <th>نوع الحركة</th>
                <th>رقم مرجعي</th>
                <th>مدين (له)</th>
                <th>دائن (عليه)</th>
                <th>الرصيد المتبقي</th>
                <th>ملاحظات والتفاصيل</th>
              </tr>
            </thead>
            <tbody>
              ${rowsWithBalance
                .map(
                  (r, idx) => `
                <tr style="background: ${r.items && r.items.length > 0 ? '#f0f9ff' : 'transparent'};">
                  <td>${idx + 1}</td>
                  <td>${r.date}</td>
                  <td><strong>${r.type}</strong></td>
                  <td class="num">${r.refNumber}</td>
                  <td class="num">${r.debit > 0 ? r.debit.toFixed(2) : '-'}</td>
                  <td class="num">${r.credit > 0 ? r.credit.toFixed(2) : '-'}</td>
                  <td class="num balance-final">${r.runningBalance.toFixed(2)} ${settings.currencySymbol}</td>
                  <td>${r.notes || ''}</td>
                </tr>
                ${
                  statementMode === 'detailed' && r.items && r.items.length > 0
                    ? `
                  <tr>
                    <td colSpan="8" style="padding: 4px; background: #f8fafc;">
                      <table class="item-subtable">
                        <thead>
                          <tr>
                            <th>م</th>
                            <th>اسم الصنف والتوصيف</th>
                            <th>الباركود</th>
                            <th>الكمية والوحدة</th>
                            <th>سعر الوحدة</th>
                            <th>خصم/تخفيض</th>
                            <th>الإجمالي الصافي</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${r.items
                            .map(
                              (it, iIdx) => `
                            <tr>
                              <td>${iIdx + 1}</td>
                              <td><strong>${it.productName}</strong></td>
                              <td class="num">${it.barcode || '-'}</td>
                              <td class="num">${it.quantity} ${it.unit}</td>
                              <td class="num">${it.unitPrice.toFixed(2)} ${settings.currencySymbol}</td>
                              <td class="num">${it.discount ? it.discount.toFixed(2) : '0.00'}</td>
                              <td class="num"><strong>${it.total.toFixed(2)} ${settings.currencySymbol}</strong></td>
                            </tr>
                          `
                            )
                            .join('')}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                `
                    : ''
                }
              `
                )
                .join('')}
            </tbody>
          </table>

          <!-- Closing Thank You Footer (خاتمة الشكر) -->
          <div class="thanks-card">
            <strong style="font-size: 14px;">✨ نشكركم جزيل الشكر على ثقتكم الغالية وحسن تعاملكم معنا!</strong><br/>
            <span>نعدكم دائماً بتقديم أفضل المنتجات وأعلى مستويات الخدمة. نتمنى لكم يوماً سعيداً ورائعاً 🌹</span>
            <div style="font-size: 11px; margin-top: 4px; opacity: 0.85;">${settings.shopName} • ${settings.address || 'العنوان الرئيسي'} • هاتف: ${settings.phone || 'غير مسجل'}</div>
          </div>

          <div style="margin-top: 30px; display: flex; justify-content: space-between; font-weight: 900; font-size: 13px;">
            <div>توقيع المحاسب / المتجر: ....................</div>
            <div>توقيع وتأكيد الطرف الآخر: ....................</div>
          </div>

          <script>
            window.onload = function() { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `;

  const handlePrint = () => {
    const htmlContent = getHtmlDocument();

    const printWindow = window.open('', '_blank', 'width=950,height=750');
    if (printWindow) {
      try {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        return;
      } catch (e) {
        console.error('Window open write error:', e);
      }
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1000);
      }, 300);
    } else {
      window.print();
    }
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    setIsGeneratingPDF(true);
    try {
      const element = printRef.current;
      const dataUrl = await toPng(element, {
        backgroundColor: '#faf9f6',
        quality: 0.98,
        pixelRatio: 2,
        style: {
          width: '1050px',
          padding: '24px',
          margin: '0',
          borderRadius: '0',
          boxShadow: 'none',
        }
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 297;
      
      const img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        const imgHeight = (img.height * imgWidth) / img.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
          heightLeft -= pageHeight;
        }

        const fileName = `كشف_حساب_${party.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
        pdf.save(fileName);
        setIsGeneratingPDF(false);
      };
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('حدث خطأ أثناء تصدير ملف PDF. يمكنك استخدام ميزة طباعة الكشف كبديل وحفظه كملف PDF.');
      setIsGeneratingPDF(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['م', 'التاريخ', 'نوع الحركة', 'رقم مرجعي', 'مدين (له)', 'دائن (عليه)', 'الرصيد المتبقي', 'ملاحظات وتفاصيل الأصناف'];
    const rows = rowsWithBalance.map((r, idx) => {
      let notesOrItems = r.notes || '';
      if (r.items && r.items.length > 0) {
        const itemStr = r.items.map(i => `${i.productName} (${i.quantity} ${i.unit} × ${i.unitPrice})`).join(' | ');
        notesOrItems = notesOrItems ? `${notesOrItems} [أصناف: ${itemStr}]` : `[أصناف: ${itemStr}]`;
      }
      return [
        idx + 1,
        `"${r.date}"`,
        `"${r.type}"`,
        `"${r.refNumber}"`,
        r.debit > 0 ? r.debit.toFixed(2) : '0.00',
        r.credit > 0 ? r.credit.toFixed(2) : '0.00',
        r.runningBalance.toFixed(2),
        `"${notesOrItems.replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `كشف_حساب_${party.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateWhatsAppStatementMessage = () => {
    const debitCount = rowsWithBalance.filter((r) => r.debit > 0).length;
    const creditCount = rowsWithBalance.filter((r) => r.credit > 0).length;

    return formatStatementWhatsAppMessage({
      shopName: settings.shopName,
      phone: settings.phone,
      currencySymbol: settings.currencySymbol,
      partyName: party.name,
      partyCode: party.code,
      partyType,
      partyPhone: party.phone,
      partyAddress: party.address,
      openingBalance: openingBal,
      totalDebitSum,
      totalCreditSum,
      debitCount,
      creditCount,
      statementMode,
      runningBalance,
      rows: rowsWithBalance
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-1 sm:p-2 dir-rtl text-right overflow-y-auto">
      {/* Full-screen modal container with smooth vertical scrolling */}
      <div className="bg-slate-50 w-full min-h-[92vh] max-h-[98vh] sm:h-[98vh] sm:w-[98vw] max-w-none sm:rounded-3xl p-2 sm:p-4 shadow-2xl border-2 border-slate-300 flex flex-col gap-3 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* STICKY TOP HEADER WITH HIGH-VISIBILITY BACK/CLOSE BUTTON */}
        <div className="sticky top-0 z-40 bg-slate-900 text-white p-2.5 sm:p-3 rounded-2xl shadow-md flex flex-wrap items-center justify-between gap-2.5 shrink-0 border-b-2 border-slate-800">
          
          {/* Prominent Back/Close Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-xs sm:text-sm rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-sm shrink-0 border border-rose-500"
              title="إغلاق النافذة والرجوع للشاشة السابقة"
            >
              <ArrowRight className="w-5 h-5" />
              <span>رجوع / إغلاق</span>
            </button>

            <div className="hidden sm:flex items-center gap-2 pr-2 border-r border-slate-700">
              <div className="w-8 h-8 bg-sky-600 text-white rounded-xl flex items-center justify-center shadow-xs shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-black text-white text-sm sm:text-base leading-tight">
                  كشف حساب: <span className="text-sky-300">{party.name}</span> <span className="text-slate-400 font-extrabold">({partyType === 'customer' ? 'زبون' : 'مورد'})</span>
                </h3>
                <p className="text-[11px] font-bold text-slate-300">تقرير كامل يتضمن الحركة المالية والتفاصيل</p>
              </div>
            </div>
          </div>

          {/* Mode Selector Toggle Switch & Close Icon */}
          <div className="flex items-center gap-2">
            <div className="flex items-center p-1 bg-slate-800 rounded-xl border border-slate-700 shadow-inner">
              <button
                onClick={() => setStatementMode('summary')}
                className={`px-2.5 py-1.5 rounded-lg font-black text-xs transition-all cursor-pointer ${
                  statementMode === 'summary'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                كشف مختصر (مالي)
              </button>
              <button
                onClick={() => setStatementMode('detailed')}
                className={`px-2.5 py-1.5 rounded-lg font-black text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                  statementMode === 'detailed'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>كشف تفصيلي بالأصناف</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center text-slate-300 hover:text-white bg-slate-800 hover:bg-rose-600 rounded-xl transition-colors cursor-pointer shrink-0 border border-slate-700"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div ref={printRef} className="flex flex-col gap-3 p-1">
        {/* WELCOME HEADER BANNER (ترويسة الترحيب) */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-3.5 sm:p-4 rounded-2xl shadow-sm space-y-2 border border-emerald-700 shrink-0">
          <div className="flex items-center justify-between border-b border-emerald-700/80 pb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-white/10 backdrop-blur-xs rounded-xl flex items-center justify-center border border-white/20 text-emerald-200 shrink-0">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-black text-sm sm:text-base leading-tight text-white">
                  {settings.shopName || 'متجرنا المحترم'}
                </h2>
                <p className="text-[11px] text-emerald-200/90 font-medium">
                  {settings.address || 'العنوان الرئيسي'} • هاتف: {settings.phone || 'غير مسجل'}
                </p>
              </div>
            </div>
            <span className="bg-emerald-500/30 border border-emerald-400/40 text-emerald-100 text-[10px] sm:text-[11px] font-black px-2.5 py-1 rounded-lg shrink-0">
              كشف حساب رسمي معتمد
            </span>
          </div>

          <div className="bg-white/10 backdrop-blur-xs p-2.5 rounded-xl border border-white/15 text-xs text-emerald-50 leading-relaxed font-bold">
            <p className="text-amber-300 font-black text-[11px] mb-0.5">🌸 ترويسة الترحيب بالعميل:</p>
            <p className="text-xs font-bold text-white">
              عزيزنا <span className="text-amber-200 font-black underline decoration-amber-400/50">{party.name}</span> المحترم، أهلاً وسهلاً بكم! يسعدنا خدمتكم ورعايتكم دائماً ونقدم لكم كشف الحساب المعتمد التالي:
            </p>
          </div>
        </div>

        {/* MAIN ACCOUNT DETAILS SECTION (تفاصيل الحساب الرئيسية) */}
        <div className="bg-white p-3 sm:p-4 rounded-2xl border-2 border-slate-200 shadow-sm shrink-0 space-y-3">
          
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-sky-600" />
              <span className="font-black text-slate-900 text-xs sm:text-base">
                تفاصيل الحساب والبيانات الرئيسية للطرف
              </span>
              <button
                onClick={() => setShowMainDetails(!showMainDetails)}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 px-2.5 py-1 rounded-xl font-bold transition-all flex items-center gap-1 cursor-pointer border border-slate-300 mr-2"
                title="إخفاء أو إظهار مربعات تفاصيل الحساب لترك مساحة أكبر للجدول"
              >
                <span>{showMainDetails ? 'إخفاء الملخص' : 'إظهار الملخص'}</span>
                {showMainDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
            <span className="text-xs font-mono font-black bg-sky-100 text-sky-900 px-2.5 py-1 rounded-lg border border-sky-200 shrink-0">
              كود: {party.code}
            </span>
          </div>

          {/* Detailed Account Metric Grid - Collapsible & Responsive */}
          {showMainDetails && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 animate-in fade-in duration-150">
              
              {/* Box 1: Party Basic Info */}
              <div className="col-span-2 sm:col-span-1 p-3 bg-slate-50 border-2 border-slate-200 rounded-2xl flex flex-col justify-between">
                <div className="space-y-1">
                  <p className="text-[11px] font-black text-slate-500 uppercase flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-600" />
                    <span>اسم الحساب والنوع</span>
                  </p>
                  <p className="font-black text-slate-950 text-base leading-snug">{party.name}</p>
                  <p className="text-xs font-black text-sky-700">
                    تصنيف الحساب: {partyType === 'customer' ? 'زبون (عميل)' : 'مورد (مزود)'}
                  </p>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200 text-xs font-bold text-slate-600 space-y-0.5">
                  <p className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                    <span>الهاتف: {party.phone || 'غير مسجل'}</span>
                  </p>
                  <p className="flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="truncate">العنوان: {party.address || 'غير محدد'}</span>
                  </p>
                </div>
              </div>

              {/* Box 2: Opening Balance */}
              <div className="p-3 bg-amber-50/70 border-2 border-amber-200 rounded-2xl flex flex-col justify-between">
                <div>
                  <p className="text-[11px] font-black text-amber-800 flex items-center gap-1">
                    <Wallet className="w-3.5 h-3.5 text-amber-700" />
                    <span>الرصيد الافتتاحي</span>
                  </p>
                  <p className="text-base sm:text-lg font-black text-amber-950 font-mono mt-1">
                    {openingBal.toFixed(2)} <span className="text-xs font-bold">{settings.currencySymbol}</span>
                  </p>
                </div>
                <p className="text-[10px] sm:text-[11px] font-bold text-amber-900 mt-1">
                  رصيد بداية التعامل
                </p>
              </div>

              {/* Box 3: Total Debits (مدين - له) */}
              <div className="p-3 bg-blue-50/70 border-2 border-blue-200 rounded-2xl flex flex-col justify-between">
                <div>
                  <p className="text-[11px] font-black text-blue-800 flex items-center gap-1">
                    <ArrowUpLeft className="w-3.5 h-3.5 text-blue-700" />
                    <span>إجمالي المدين (له)</span>
                  </p>
                  <p className="text-base sm:text-lg font-black text-blue-950 font-mono mt-1">
                    {totalDebitSum.toFixed(2)} <span className="text-xs font-bold">{settings.currencySymbol}</span>
                  </p>
                </div>
                <p className="text-[10px] sm:text-[11px] font-bold text-blue-900 mt-1">
                  يشتمل على {invoiceCount} عمليات
                </p>
              </div>

              {/* Box 4: Total Credits (دائن - عليه) */}
              <div className="p-3 bg-emerald-50/70 border-2 border-emerald-200 rounded-2xl flex flex-col justify-between">
                <div>
                  <p className="text-[11px] font-black text-emerald-800 flex items-center gap-1">
                    <ArrowDownRight className="w-3.5 h-3.5 text-emerald-700" />
                    <span>إجمالي الدائن (عليه)</span>
                  </p>
                  <p className="text-base sm:text-lg font-black text-emerald-950 font-mono mt-1">
                    {totalCreditSum.toFixed(2)} <span className="text-xs font-bold">{settings.currencySymbol}</span>
                  </p>
                </div>
                <p className="text-[10px] sm:text-[11px] font-bold text-emerald-900 mt-1">
                  يشتمل على {voucherCount} سندات
                </p>
              </div>

              {/* Box 5: Net Outstanding Current Balance */}
              <div className="col-span-2 sm:col-span-1 p-3 bg-sky-900 text-white border-2 border-sky-950 rounded-2xl flex flex-col justify-between shadow-xs">
                <div>
                  <p className="text-[11px] font-black text-sky-200 flex items-center gap-1">
                    <Scale className="w-3.5 h-3.5 text-sky-300" />
                    <span>صافي الرصيد المستحق</span>
                  </p>
                  <p className="text-xl sm:text-2xl font-black text-white font-mono mt-1">
                    {runningBalance.toFixed(2)} <span className="text-xs font-bold text-sky-200">{settings.currencySymbol}</span>
                  </p>
                </div>
                <div className="mt-1.5">
                  {runningBalance > 0 ? (
                    <span className="inline-block bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-md shadow-2xs">
                      {partyType === 'customer' ? 'مطلوب منه (دين على الزبون)' : 'مستحق له (دين علينا)'}
                    </span>
                  ) : runningBalance < 0 ? (
                    <span className="inline-block bg-emerald-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-md shadow-2xs">
                      {partyType === 'customer' ? 'له رصيد دائن زائد' : 'مدين لنا'}
                    </span>
                  ) : (
                    <span className="inline-block bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-md">
                      الحساب متزن ومخلص (0.00)
                    </span>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Transactions Full-screen Scrollable Table Box */}
        <div className="overflow-x-auto overflow-y-visible sm:overflow-y-auto flex-1 border-2 border-slate-300 rounded-2xl bg-white shadow-sm min-h-[250px]">
          <table className="w-full min-w-[780px] text-right text-xs sm:text-sm">
            <thead className="bg-slate-200 text-slate-950 font-black sticky top-0 border-b-2 border-slate-300 z-10 shadow-2xs">
              <tr>
                <th className="p-2.5 sm:p-3">التاريخ</th>
                <th className="p-2.5 sm:p-3">البيان / نوع الحركة</th>
                <th className="p-2.5 sm:p-3">المرجع</th>
                <th className="p-2.5 sm:p-3">مدين (له)</th>
                <th className="p-2.5 sm:p-3">دائن (عليه)</th>
                <th className="p-2.5 sm:p-3">الرصيد المتبقي</th>
                <th className="p-2.5 sm:p-3 text-center">
                  {statementMode === 'detailed' ? 'التفاصيل والأصناف' : 'الملاحظات / البيان'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-100 font-extrabold text-slate-900">
              {rowsWithBalance.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500 font-black text-base">
                    لا توجد عمليات أو حركات مسجلة لهذا الحساب حتى الآن.
                  </td>
                </tr>
              ) : (
                rowsWithBalance.map((r) => {
                  const hasItems = r.items && r.items.length > 0;
                  const isExpanded = statementMode === 'detailed' && expandedInvoiceIds.includes(r.id);

                  return (
                    <React.Fragment key={r.id}>
                      <tr className={`hover:bg-sky-50 transition-colors ${statementMode === 'detailed' && hasItems ? 'bg-sky-50/40' : ''}`}>
                        <td className="p-2.5 sm:p-3 font-mono font-bold text-slate-800 whitespace-nowrap">{r.date}</td>
                        <td className="p-2.5 sm:p-3 font-black text-slate-950">{r.type}</td>
                        <td className="p-2.5 sm:p-3 font-mono font-black text-slate-800">{r.refNumber}</td>
                        <td className="p-2.5 sm:p-3 font-mono font-black text-amber-900">
                          {r.debit > 0 ? `${r.debit.toFixed(2)} ${settings.currencySymbol}` : '-'}
                        </td>
                        <td className="p-2.5 sm:p-3 font-mono font-black text-emerald-900">
                          {r.credit > 0 ? `${r.credit.toFixed(2)} ${settings.currencySymbol}` : '-'}
                        </td>
                        <td className="p-2.5 sm:p-3 font-mono font-black text-sky-950 bg-sky-100/70 border-x border-sky-200">
                          {r.runningBalance.toFixed(2)} {settings.currencySymbol}
                        </td>
                        <td className="p-2.5 sm:p-3 text-center">
                          {statementMode === 'detailed' && hasItems ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => toggleExpand(r.id)}
                                className="px-2.5 py-1 bg-sky-100 hover:bg-sky-200 text-sky-900 font-black text-xs rounded-lg border border-sky-300 transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <Package className="w-3.5 h-3.5 text-sky-700" />
                                <span>{r.items!.length} أصناف</span>
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={() =>
                                  setFullPageInvoice({
                                    refNumber: r.refNumber,
                                    date: r.date,
                                    type: r.type,
                                    notes: r.notes || '',
                                    items: r.items!,
                                    total: r.debit || r.credit || 0,
                                  })
                                }
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-lg transition-colors cursor-pointer shadow-2xs"
                                title="عرض تفاصيل الأصناف في صفحة كاملة وواضحة"
                              >
                                معاينة كاملة
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-600 font-bold text-xs">{r.notes || '-'}</span>
                          )}
                        </td>
                      </tr>

                      {/* Expanded Sub-table for Invoice Items (Detailed Mode Only) */}
                      {statementMode === 'detailed' && hasItems && isExpanded && (
                        <tr className="bg-slate-100/90">
                          <td colSpan={7} className="p-2 sm:p-3">
                            <div className="bg-white border-2 border-sky-300 rounded-xl p-3 shadow-sm space-y-2">
                              <div className="flex items-center justify-between text-xs sm:text-sm border-b-2 border-slate-200 pb-2">
                                <span className="font-black text-sky-950 flex items-center gap-1.5">
                                  <Package className="w-3.5 h-3.5 text-sky-700" />
                                  تفاصيل أصناف الفاتورة المرجعية ({r.refNumber})
                                </span>
                                <button
                                  onClick={() =>
                                    setFullPageInvoice({
                                      refNumber: r.refNumber,
                                      date: r.date,
                                      type: r.type,
                                      notes: r.notes || '',
                                      items: r.items!,
                                      total: r.debit || r.credit || 0,
                                    })
                                  }
                                  className="text-indigo-800 font-black hover:underline text-xs flex items-center gap-1 cursor-pointer"
                                >
                                  <span>فتح المعاينة الشاملة للأصناف</span>
                                  <Package className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="overflow-x-auto">
                                <table className="w-full text-right text-xs sm:text-sm border-2 border-slate-200 rounded-lg overflow-hidden">
                                  <thead className="bg-slate-200 text-slate-950 font-black border-b border-slate-300">
                                    <tr>
                                      <th className="p-2 text-center">#</th>
                                      <th className="p-2">اسم الصنف والتوصيف</th>
                                      <th className="p-2">الباركود</th>
                                      <th className="p-2">الكمية والوحدة</th>
                                      <th className="p-2">سعر الوحدة</th>
                                      <th className="p-2">الخصم</th>
                                      <th className="p-2">الإجمالي الصافي</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-200 font-extrabold text-slate-900">
                                    {r.items!.map((it, idx) => (
                                      <tr key={idx} className="hover:bg-sky-50/50">
                                        <td className="p-2 font-mono text-center text-slate-600 font-black">{idx + 1}</td>
                                        <td className="p-2 font-black text-slate-950">{it.productName}</td>
                                        <td className="p-2 font-mono text-slate-700">{it.barcode || '-'}</td>
                                        <td className="p-2 font-mono font-black text-slate-900">
                                          {it.quantity} {it.unit}
                                        </td>
                                        <td className="p-2 font-mono text-slate-800 font-black">
                                          {it.unitPrice.toFixed(2)} {settings.currencySymbol}
                                        </td>
                                        <td className="p-2 font-mono text-amber-800 font-black">
                                          {it.discount ? `${it.discount.toFixed(2)} ${settings.currencySymbol}` : '0.00'}
                                        </td>
                                        <td className="p-2 font-mono font-black text-emerald-900 bg-emerald-50/50">
                                          {it.total.toFixed(2)} {settings.currencySymbol}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* THANK YOU CLOSING FOOTER (خاتمة الشكر) */}
        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-3 sm:p-4 text-center space-y-1 text-xs shrink-0 shadow-2xs">
          <p className="font-black text-emerald-950 text-xs sm:text-sm flex items-center justify-center gap-1.5">
            <span>✨ نشكركم جزيل الشكر على ثقتكم الغالية وحسن تعاملكم معنا!</span>
          </p>
          <p className="text-emerald-800 font-bold text-[11px] sm:text-xs">
            نعدكم دائماً بتقديم أفضل الخدمات والمنتجات بأعلى مستويات الجودة. نتمنى لكم يوماً سعيداً ورائعاً 🌹
          </p>
          <p className="text-[10px] sm:text-[11px] text-emerald-700 font-mono font-semibold pt-1 border-t border-emerald-200/80">
            {settings.shopName} • {settings.address || 'العنوان الرئيسي'} • هاتف: {settings.phone || 'غير مسجل'}
          </p>
        </div>

        </div>

        {/* STICKY FOOTER ACTIONS */}
        <div className="sticky bottom-0 z-30 bg-white p-2.5 rounded-2xl border-t-2 border-slate-300 flex flex-wrap items-center justify-between gap-2.5 shrink-0 shadow-lg">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-black text-xs sm:text-sm rounded-xl transition-colors cursor-pointer flex items-center gap-2 shadow-xs"
          >
            <ArrowRight className="w-4 h-4" />
            <span>رجوع / إغلاق</span>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowWhatsAppModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>إرسال عبر الواتساب</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white font-black text-xs sm:text-sm rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تصدير Excel / CSV</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs sm:text-sm rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
            >
              {isGeneratingPDF ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>جاري تصدير PDF...</span>
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5" />
                  <span>تنزيل كشف الحساب (PDF)</span>
                </>
              )}
            </button>
            <button
              onClick={handlePrint}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-black text-xs sm:text-sm rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة الكشف ({statementMode === 'detailed' ? 'التفصيلي' : 'المختصر'})</span>
            </button>
          </div>
        </div>

      </div>

      {/* WhatsApp Share Selection Modal */}
      <WhatsAppShareModal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        phone={party.phone || ''}
        partyName={party.name}
        title={`إرسال كشف حساب (${statementMode === 'detailed' ? 'تفصيلي' : 'مختصر'})`}
        message={generateWhatsAppStatementMessage()}
        cardData={{
          type: 'statement',
          shopName: settings.shopName,
          phone: settings.phone,
          currencySymbol: settings.currencySymbol,
          partyName: party.name,
          partyCode: party.code,
          statementMode,
          runningBalance,
          rows: rowsWithBalance
        }}
      />

      {/* Full Page Clear Items Breakdown Modal */}
      {fullPageInvoice && (
        <div className="fixed inset-0 z-60 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-0 sm:p-2 dir-rtl text-right">
          <div className="bg-white w-full h-full sm:h-[98vh] sm:w-[98vw] max-w-none max-h-none sm:rounded-3xl p-3 sm:p-6 shadow-2xl border-2 border-slate-300 flex flex-col gap-3 overflow-hidden animate-in zoom-in-95 duration-150">
            
            {/* Header with Prominent Back/Close Button */}
            <div className="flex items-center justify-between border-b-2 border-slate-200 pb-2.5 shrink-0 bg-indigo-50 p-3 rounded-2xl">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFullPageInvoice(null)}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs sm:text-sm rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-xs shrink-0"
                  title="رجوع لكشف الحساب"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>رجوع</span>
                </button>

                <div className="w-8 h-8 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-xs shrink-0">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-black text-slate-950 text-base sm:text-lg leading-tight">
                    معاينة تفاصيل الفاتورة الشاملة والأصناف
                  </h2>
                  <p className="text-xs font-bold text-slate-600 mt-0.5">
                    تفاصيل كاملة: الأسعار، الباركود، الكميات، الخصوم، وتوتال الفاتورة الصافي
                  </p>
                </div>
              </div>

              <button
                onClick={() => setFullPageInvoice(null)}
                className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-900 bg-slate-200 hover:bg-slate-300 rounded-full transition-colors cursor-pointer shrink-0"
                title="إغلاق النافذة"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="overflow-y-auto flex-1 space-y-3 pr-1 pl-1">
              {/* Detailed Invoice Metadata Box */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 bg-slate-100 p-3 rounded-2xl border-2 border-slate-200 text-xs sm:text-sm">
                <div>
                  <span className="text-slate-600 font-extrabold block text-xs">رقم الفاتورة / المرجع:</span>
                  <span className="font-mono font-black text-slate-950 text-sm sm:text-base">{fullPageInvoice.refNumber}</span>
                </div>
                <div>
                  <span className="text-slate-600 font-extrabold block text-xs">التاريخ:</span>
                  <span className="font-mono font-black text-slate-900 text-sm sm:text-base">{fullPageInvoice.date}</span>
                </div>
                <div>
                  <span className="text-slate-600 font-extrabold block text-xs">نوع الحركة والطرف:</span>
                  <span className="font-black text-sky-900 text-xs sm:text-sm">{fullPageInvoice.type} - {party.name}</span>
                </div>
                <div>
                  <span className="text-slate-600 font-extrabold block text-xs">البيان والملاحظات:</span>
                  <span className="font-extrabold text-slate-800 text-xs sm:text-sm">{fullPageInvoice.notes || 'لا توجد ملاحظات إضافية'}</span>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-3 bg-white border-2 border-slate-200 rounded-2xl shadow-2xs">
                  <p className="text-xs text-slate-600 font-extrabold">عدد أنواع الأصناف</p>
                  <p className="text-lg font-black text-slate-950 font-mono mt-0.5">
                    {fullPageInvoice.items.length} صنف / مادة
                  </p>
                </div>

                <div className="p-3 bg-white border-2 border-slate-200 rounded-2xl shadow-2xs">
                  <p className="text-xs text-slate-600 font-extrabold">مجموع الكميات والقطع</p>
                  <p className="text-lg font-black text-indigo-950 font-mono mt-0.5">
                    {fullPageInvoice.items.reduce((s, i) => s + i.quantity, 0)} قطعة / وحدة
                  </p>
                </div>

                <div className="p-3 bg-indigo-100 border-2 border-indigo-200 rounded-2xl">
                  <p className="text-xs text-indigo-900 font-extrabold">إجمالي قيمة الفاتورة الصافي</p>
                  <p className="text-xl font-black text-indigo-950 font-mono mt-0.5">
                    {fullPageInvoice.items.reduce((s, i) => s + i.total, 0).toFixed(2)} {settings.currencySymbol}
                  </p>
                </div>
              </div>

              {/* Items Section Header */}
              <div className="flex items-center justify-between bg-slate-900 text-white px-4 py-2 rounded-2xl shadow-xs">
                <span className="font-black text-xs sm:text-sm flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-indigo-300" />
                  جدول تفاصيل الأصناف والأسعار بالفاتورة
                </span>
                <span className="text-xs font-mono font-bold text-indigo-200">
                  {fullPageInvoice.items.length} أصناف
                </span>
              </div>

              {/* Desktop & Mobile Responsive Table */}
              <div className="border-2 border-slate-300 rounded-2xl overflow-x-auto shadow-2xs bg-white">
                <table className="w-full text-right text-xs sm:text-sm">
                  <thead className="bg-slate-200 text-slate-950 font-black border-b-2 border-slate-300 text-xs sm:text-sm">
                    <tr>
                      <th className="p-3 text-center">#</th>
                      <th className="p-3">اسم الصنف والتوصيف</th>
                      <th className="p-3">الباركود</th>
                      <th className="p-3">الكمية والوحدة</th>
                      <th className="p-3">سعر الوحدة</th>
                      <th className="p-3">الخصم</th>
                      <th className="p-3">الإجمالي الصافي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-extrabold text-slate-900">
                    {fullPageInvoice.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-mono text-center text-slate-500 font-black">{idx + 1}</td>
                        <td className="p-3 font-black text-slate-950 text-sm sm:text-base">{item.productName}</td>
                        <td className="p-3 font-mono text-slate-700">{item.barcode || '-'}</td>
                        <td className="p-3 font-mono font-black text-slate-950 text-sm">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="p-3 font-mono text-slate-800 font-black text-sm">
                          {item.unitPrice.toFixed(2)} {settings.currencySymbol}
                        </td>
                        <td className="p-3 font-mono text-amber-800 font-black text-sm">
                          {item.discount ? `${item.discount.toFixed(2)} ${settings.currencySymbol}` : '0.00'}
                        </td>
                        <td className="p-3 font-mono font-black text-indigo-950 text-sm sm:text-base bg-indigo-50/60">
                          {item.total.toFixed(2)} {settings.currencySymbol}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2.5 border-t-2 border-slate-200 shrink-0">
              <button
                onClick={() => setFullPageInvoice(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-black text-xs sm:text-sm rounded-xl cursor-pointer flex items-center gap-1.5"
              >
                <ArrowRight className="w-4 h-4" />
                <span>إغلاق المعاينة والرجوع</span>
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs sm:text-sm rounded-xl cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة تفاصيل الفاتورة</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
