import React, { useState } from 'react';
import { Printer, Store, CheckCircle2, MessageSquare } from 'lucide-react';
import { SalesInvoice, ShopSettings } from '../types/accounting';
import { WhatsAppShareModal } from './WhatsAppShareModal';
import { formatInvoiceWhatsAppMessage } from '../utils/whatsappFormatter';

interface ReceiptPrintModalProps {
  invoice: SalesInvoice;
  settings: ShopSettings;
  onClose: () => void;
}

export const ReceiptPrintModal: React.FC<ReceiptPrintModalProps> = ({
  invoice,
  settings,
  onClose
}) => {
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const whatsAppMessage = formatInvoiceWhatsAppMessage({
    shopName: settings.shopName,
    phone: settings.phone,
    address: settings.address,
    currencySymbol: settings.currencySymbol,
    partyName: invoice.customerName,
    invoiceNumber: invoice.invoiceNumber,
    date: invoice.date,
    paymentMethod: invoice.paymentMethod,
    netTotal: invoice.netTotal,
    items: invoice.items
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[95vh] overflow-y-auto">
        
        {/* Printable Area with print styling */}
        <div id="printable-receipt" className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4 font-sans text-right">
          
          {/* Receipt Header */}
          <div className="text-center space-y-1 border-b border-dashed border-slate-300 pb-3">
            <div className="w-10 h-10 mx-auto rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold mb-1">
              <Store className="w-5 h-5" />
            </div>
            <h2 className="font-bold text-slate-900 text-base">{settings.shopName}</h2>
            <p className="text-[11px] text-slate-500">{settings.address} • هاتف: {settings.phone}</p>
            {settings.taxNumber && (
              <p className="text-[10px] font-mono text-slate-400">الرقم الضريبي: {settings.taxNumber}</p>
            )}
            <p className="text-xs font-bold text-emerald-800 bg-emerald-50 py-1 px-3 rounded-full inline-block border border-emerald-200 mt-1">
              فاتورة ضريبية مبسطة
            </p>
          </div>

          {/* Invoice Meta */}
          <div className="text-xs space-y-1 font-mono text-slate-600 border-b border-dashed border-slate-300 pb-3">
            <div className="flex justify-between">
              <span>رقم الفاتورة:</span>
              <span className="font-bold text-slate-800">{invoice.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>التاريخ والوقت:</span>
              <span>{invoice.date} - {invoice.time}</span>
            </div>
            <div className="flex justify-between">
              <span>اسم العميل:</span>
              <span className="font-bold text-slate-800">{invoice.customerName}</span>
            </div>
            {invoice.delegateName && (
              <div className="flex justify-between">
                <span>اسم المندوب (المستلم):</span>
                <span className="font-bold text-slate-800">{invoice.delegateName}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>طريقة الدفع:</span>
              <span className="font-bold text-slate-800">
                {invoice.paymentMethod === 'cash' ? 'نقداً' : invoice.paymentMethod === 'bank' ? 'مدى/شبكة' : 'آجل'}
              </span>
            </div>
          </div>

          {/* Invoice Items Table */}
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-300 text-slate-500 font-bold">
                <th className="pb-1">الصنف</th>
                <th className="pb-1 text-center">الكمية</th>
                <th className="pb-1 text-left">السعر</th>
                <th className="pb-1 text-left">الإجمالي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {invoice.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-1.5 font-semibold text-slate-800">{item.productName}</td>
                  <td className="py-1.5 text-center font-mono">{item.quantity}</td>
                  <td className="py-1.5 text-left font-mono">{item.unitPrice.toFixed(0)}</td>
                  <td className="py-1.5 text-left font-mono font-bold text-slate-900">{item.total.toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Invoice Totals */}
          <div className="border-t border-dashed border-slate-300 pt-3 space-y-1 text-xs font-mono">
            <div className="flex justify-between text-slate-600">
              <span>المجموع الفرعي:</span>
              <span>{invoice.subtotal.toFixed(0)} {settings.currencySymbol}</span>
            </div>

            {invoice.discountTotal > 0 && (
              <div className="flex justify-between text-amber-700">
                <span>الخصم:</span>
                <span>-{invoice.discountTotal.toFixed(0)} {settings.currencySymbol}</span>
              </div>
            )}

            {invoice.taxAmount > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>ضريبة القيمة المضافة ({settings.defaultTaxRate}%):</span>
                <span>{invoice.taxAmount.toFixed(0)} {settings.currencySymbol}</span>
              </div>
            )}

            <div className="flex justify-between text-sm font-black text-slate-900 border-t border-slate-300 pt-1">
              <span>الصافي المطلوب:</span>
              <span>{invoice.netTotal.toFixed(0)} {settings.currencySymbol}</span>
            </div>

            <div className="flex justify-between text-emerald-700 font-bold">
              <span>المبلغ المدفوع:</span>
              <span>{invoice.paidAmount.toFixed(0)} {settings.currencySymbol}</span>
            </div>

            {invoice.remainingAmount > 0 && (
              <div className="flex justify-between text-rose-700 font-bold">
                <span>المتبقي (آجل):</span>
                <span>{invoice.remainingAmount.toFixed(0)} {settings.currencySymbol}</span>
              </div>
            )}
          </div>

          {/* Thermal Receipt Footer */}
          <div className="text-center pt-2 text-[10px] text-slate-500 border-t border-dashed border-slate-300">
            <p className="font-bold text-slate-700">{settings.receiptFooter}</p>
            <p className="mt-0.5">نظام المحاسبة للمحلات الصغيرة</p>
          </div>

        </div>

        {/* Modal Buttons */}
        <div className="space-y-2 pt-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setShowWhatsAppModal(true)}
              className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>إرسال بطاقة للواتساب</span>
            </button>

            <button
              onClick={handlePrint}
              className="py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة الإيصال</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
          >
            إغلاق المعاينة
          </button>
        </div>

      </div>

      {/* WhatsApp Share Modal */}
      <WhatsAppShareModal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        phone=""
        partyName={invoice.customerName}
        title="إرسال الفاتورة عبر الواتساب"
        message={whatsAppMessage}
        cardData={{
          type: 'invoice',
          shopName: settings.shopName,
          phone: settings.phone,
          address: settings.address,
          currencySymbol: settings.currencySymbol,
          partyName: invoice.customerName,
          invoiceNumber: invoice.invoiceNumber,
          date: invoice.date,
          paymentMethod: invoice.paymentMethod,
          netTotal: invoice.netTotal,
          items: invoice.items
        }}
      />
    </div>
  );
};
