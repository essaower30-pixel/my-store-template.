/**
 * WhatsApp Message Formatter for Mobile & Desktop
 * Formats invoices, account statements, and reminders into beautifully structured,
 * clean, and mobile-friendly Arabic layouts that never break or wrap awkwardly on phone screens.
 */

// Helper to format currency numbers cleanly
function fmtNum(val: number): string {
  return (val || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// ----------------------------------------------------------------------
// 1. INVOICE TABLE FORMATTER
// ----------------------------------------------------------------------
export interface InvoiceWhatsAppParams {
  shopName: string;
  phone?: string;
  address?: string;
  currencySymbol: string;
  partyName: string;
  invoiceNumber: string;
  date: string;
  paymentMethod: string;
  netTotal: number;
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
}

export function formatInvoiceWhatsAppMessage(params: InvoiceWhatsAppParams): string {
  const {
    shopName,
    phone,
    currencySymbol,
    partyName,
    invoiceNumber,
    date,
    paymentMethod,
    netTotal,
    items
  } = params;

  const paymentLabel = paymentMethod === 'cash' ? 'نقداً' : paymentMethod === 'bank' ? 'تحويل بنكي' : 'آجل (حساب)';

  let itemsList = '';
  items.forEach((it, idx) => {
    itemsList += `▫️ *[${idx + 1}] ${it.productName}*\n`;
    itemsList += `├ 🔢 *الكمية:* ${it.quantity}\n`;
    itemsList += `├ 🏷️ *السعر:* ${fmtNum(it.unitPrice)} ${currencySymbol}\n`;
    itemsList += `└ 💰 *الإجمالي:* *${fmtNum(it.total)}* ${currencySymbol}\n\n`;
  });

  let msg = `🌸 *أهلاً وسهلاً بكم في ${shopName || 'متجرنا المحترم'}*\n\n`;
  msg += `عزيزنا/السيد المحترم: *${partyName}*\n`;
  msg += `يسعدنا خدمتكم ونرفق لكم تفاصيل الفاتورة رقم (*${invoiceNumber}*):\n\n`;
  msg += `📅 *التاريخ:* ${date}\n`;
  msg += `💳 *طريقة الدفع:* ${paymentLabel}\n\n`;
  msg += `═════════════════════════════\n`;
  msg += `📋 *جدول أصناف الفاتورة التفصيلي:*\n`;
  msg += `═════════════════════════════\n\n`;
  msg += `${itemsList}`;
  msg += `─────────────────────────────\n`;
  msg += `💰 *إجمالي الفاتورة الصافي:* *${fmtNum(netTotal)}* ${currencySymbol}\n`;
  msg += `─────────────────────────────\n\n`;
  msg += `✨ *نشكركم جزيل الشكر على ثقتكم الغالية وحسن تعاملكم معنا!*\n`;
  msg += `نعدكم بتقديم أفضل الخدمات والمنتجات دائماً 🌹\n`;
  msg += `${shopName || 'المتجر'}${phone ? ` • هاتف: ${phone}` : ''}`;

  return msg;
}

// ----------------------------------------------------------------------
// 2. ACCOUNT STATEMENT TABLE FORMATTER
// ----------------------------------------------------------------------
export interface StatementRow {
  date: string;
  type: string;
  refNumber: string;
  debit: number;
  credit: number;
  runningBalance: number;
  items?: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
}

export interface StatementWhatsAppParams {
  shopName: string;
  phone?: string;
  currencySymbol: string;
  partyName: string;
  partyCode: string;
  partyType?: 'customer' | 'supplier' | string;
  partyPhone?: string;
  partyAddress?: string;
  openingBalance?: number;
  totalDebitSum?: number;
  totalCreditSum?: number;
  debitCount?: number;
  creditCount?: number;
  statementMode: 'detailed' | 'summary';
  runningBalance: number;
  rows: StatementRow[];
}

export function formatStatementWhatsAppMessage(params: StatementWhatsAppParams): string {
  const {
    shopName,
    phone,
    currencySymbol,
    partyName,
    partyCode,
    partyType = 'customer',
    partyPhone,
    partyAddress,
    openingBalance = 0,
    statementMode,
    runningBalance,
    rows
  } = params;

  const partyTypeLabel = partyType === 'supplier' ? 'مورد (حساب موردين)' : 'زبون (عميل)';
  const totalDebitSum = params.totalDebitSum !== undefined ? params.totalDebitSum : rows.reduce((s, r) => s + (r.debit || 0), 0);
  const totalCreditSum = params.totalCreditSum !== undefined ? params.totalCreditSum : rows.reduce((s, r) => s + (r.credit || 0), 0);
  const debitCount = params.debitCount !== undefined ? params.debitCount : rows.filter(r => (r.debit || 0) > 0).length;
  const creditCount = params.creditCount !== undefined ? params.creditCount : rows.filter(r => (r.credit || 0) > 0).length;

  let msg = `🌸 *أهلاً وسهلاً بكم في ${shopName || 'متجرنا المحترم'}*\n\n`;
  msg += `📋 *كشف حساب ${statementMode === 'detailed' ? 'تفصيلي بالأصناف' : 'مختصر'}*\n`;
  msg += `═════════════════════════════\n`;
  msg += `👤 *معلومات اسم الحساب والنوع:*\n`;
  msg += `• *اسم الحساب:* *${partyName}*\n`;
  msg += `• *تصنيف الحساب:* ${partyTypeLabel}\n`;
  msg += `• *كود الحساب:* \`${partyCode}\`\n`;
  if (partyPhone) msg += `• 📞 *الهاتف:* ${partyPhone}\n`;
  if (partyAddress) msg += `• 📍 *العنوان:* ${partyAddress}\n`;
  msg += `• 📅 *تاريخ الاستخراج:* ${new Date().toISOString().split('T')[0]}\n`;
  msg += `═════════════════════════════\n\n`;

  msg += `📊 *ملخص وإحصائيات الحساب:*\n\n`;
  msg += `📂 *الرصيد الافتتاحي:* *${fmtNum(openingBalance)}* ${currencySymbol}\n`;
  msg += `_(رصيد بداية التعامل)_\n\n`;

  msg += `↗️ *إجمالي المدين (له):* *${fmtNum(totalDebitSum)}* ${currencySymbol}\n`;
  msg += `_(يشتمل على ${debitCount} عمليات)_\n\n`;

  msg += `↘️ *إجمالي الدائن (عليه):* *${fmtNum(totalCreditSum)}* ${currencySymbol}\n`;
  msg += `_(يشتمل على ${creditCount} عمليات)_\n\n`;

  msg += `─────────────────────────────\n`;
  msg += `💰 *صافي الرصيد المتبقي النهائي:* *${fmtNum(runningBalance)}* ${currencySymbol}\n`;
  msg += `─────────────────────────────\n\n`;

  // Detailed mode includes full itemized transaction list
  if (statementMode === 'detailed' && rows.length > 0) {
    let rowsList = '';
    rows.forEach((r, idx) => {
      const shortDate = r.date ? r.date.split('T')[0] : '';
      rowsList += `▫️ *[${idx + 1}] ${r.type}* (\`#${r.refNumber}\`)\n`;
      rowsList += `├ 📅 *التاريخ:* ${shortDate}\n`;
      if (r.debit > 0) {
        rowsList += `├ 💵 *له (مدين):* ${fmtNum(r.debit)} ${currencySymbol}\n`;
      }
      if (r.credit > 0) {
        rowsList += `├ 💳 *عليه (دائن):* ${fmtNum(r.credit)} ${currencySymbol}\n`;
      }
      rowsList += `└ 📊 *الرصيد التراكمي:* *${fmtNum(r.runningBalance)}* ${currencySymbol}\n`;

      if (r.items && r.items.length > 0) {
        rowsList += `   📦 *الأصناف:* `;
        const itemsSummary = r.items.map(it => `${it.productName} (${it.quantity}×${fmtNum(it.unitPrice)})`).join(' • ');
        rowsList += `${itemsSummary}\n`;
      }
      rowsList += `\n`;
    });

    msg += `📋 *جدول الحركات التفصيلية:*\n`;
    msg += `═════════════════════════════\n\n`;
    msg += `${rowsList}`;
    msg += `─────────────────────────────\n`;
    msg += `📊 *إجمالي الرصيد المستحق النهائي:* *${fmtNum(runningBalance)}* ${currencySymbol}\n`;
    msg += `─────────────────────────────\n\n`;
  }

  msg += `✨ *نشكركم جزيل الشكر على ثقتكم الغالية وحسن تعاملكم معنا!*\n`;
  msg += `نعدكم بتقديم أفضل الخدمات والمنتجات دائماً 🌹\n`;
  msg += `${shopName || 'المتجر'}${phone ? ` • هاتف: ${phone}` : ''}`;

  return msg;
}

// ----------------------------------------------------------------------
// 3. ACCOUNT BALANCE REMINDER TABLE FORMATTER (For Customers / Suppliers)
// ----------------------------------------------------------------------
export interface BalanceReminderWhatsAppParams {
  shopName: string;
  phone?: string;
  currencySymbol: string;
  partyName: string;
  partyCode?: string;
  partyType: 'customer' | 'supplier';
  balance: number;
}

export function formatBalanceReminderWhatsAppMessage(params: BalanceReminderWhatsAppParams): string {
  const {
    shopName,
    phone,
    currencySymbol,
    partyName,
    partyCode = '-',
    partyType,
    balance
  } = params;

  const statusText = partyType === 'customer'
    ? (balance > 0 ? 'مستحق للمتجر (مدين)' : balance < 0 ? 'رصيد دائن للزبون' : 'حساب متوازن')
    : (balance > 0 ? 'مستحق للمورد (دائن)' : balance < 0 ? 'رصيد مدين للمتجر' : 'حساب متوازن');

  let msg = `🌸 *أهلاً وسهلاً بكم في ${shopName || 'متجرنا المحترم'}*\n\n`;
  msg += `عزيزنا/السيد المحترم: *${partyName}*\n`;
  msg += `تحية طيبة وبعد، يسعدنا خدمتكم ورعايتكم ونرفق لكم ملخص الحساب والمطابقة:\n\n`;
  msg += `═════════════════════════════\n`;
  msg += `📊 *جدول ملخص الحساب والرصيد:*\n`;
  msg += `═════════════════════════════\n\n`;
  msg += `👤 *اسم الحساب:* ${partyName}\n`;
  msg += `🏷️ *كود الحساب:* \`${partyCode}\`\n`;
  msg += `⚖️ *حالة الحساب:* ${statusText}\n`;
  msg += `💰 *الرصيد المتبقي:* *${fmtNum(balance)}* ${currencySymbol}\n\n`;
  msg += `─────────────────────────────\n`;
  msg += `✨ *نشكركم جزيل الشكر على ثقتكم الغالية وحسن تعاملكم معنا!*\n`;
  msg += `نعدكم بتقديم أفضل الخدمات والمنتجات دائماً 🌹\n`;
  msg += `${shopName || 'المتجر'}${phone ? ` • هاتف: ${phone}` : ''}`;

  return msg;
}
