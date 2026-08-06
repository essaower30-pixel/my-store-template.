import React, { useState } from 'react';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Receipt, 
  Calendar, 
  FileText,
  DollarSign,
  Edit3
} from 'lucide-react';
import { JournalEntry, JournalLine, AccountNode, ShopSettings, PaymentVoucher } from '../types/accounting';

interface JournalEntriesViewProps {
  journalEntries: JournalEntry[];
  vouchers: PaymentVoucher[];
  accounts: AccountNode[];
  settings: ShopSettings;
  onAddJournalEntry: (entry: JournalEntry) => void;
  onAddVoucher: (voucher: PaymentVoucher) => void;
  onDeleteJournalEntry?: (entryId: string) => void;
  onDeleteVoucher?: (voucherId: string) => void;
}

export const JournalEntriesView: React.FC<JournalEntriesViewProps> = ({
  journalEntries,
  vouchers,
  accounts,
  settings,
  onAddJournalEntry,
  onAddVoucher,
  onDeleteJournalEntry,
  onDeleteVoucher
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'journal' | 'newManual' | 'vouchers'>('journal');

  // Manual Entry Form State
  const [editingJEId, setEditingJEId] = useState<string | null>(null);
  const [editingJENumber, setEditingJENumber] = useState<string | null>(null);
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<JournalLine[]>([
    { accountCode: '1010', accountName: 'الصندوق والنقدية', debit: 0, credit: 0, memo: '' },
    { accountCode: '4010', accountName: 'إيراد المبيعات', debit: 0, credit: 0, memo: '' }
  ]);

  const handleStartEditJE = (entry: JournalEntry) => {
    setEditingJEId(entry.id);
    setEditingJENumber(entry.entryNumber);
    setEntryDate(entry.date);
    setDescription(entry.description);
    setLines(entry.lines);
    setActiveSubTab('newManual');
  };

  const handleCancelEditJE = () => {
    setEditingJEId(null);
    setEditingJENumber(null);
    setDescription('');
    setLines([
      { accountCode: '1010', accountName: 'الصندوق والنقدية', debit: 0, credit: 0, memo: '' },
      { accountCode: '4010', accountName: 'إيراد المبيعات', debit: 0, credit: 0, memo: '' }
    ]);
  };

  // Balance checks for manual entry
  const totalDebit = lines.reduce((sum, l) => sum + Number(l.debit || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + Number(l.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const addLine = () => {
    setLines(prev => [
      ...prev,
      { accountCode: accounts[0]?.code || '1010', accountName: accounts[0]?.name || '', debit: 0, credit: 0, memo: '' }
    ]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 2) return;
    setLines(prev => prev.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: keyof JournalLine, value: any) => {
    setLines(prev => {
      const updated = [...prev];
      if (field === 'accountCode') {
        const acc = accounts.find(a => a.code === value);
        updated[index].accountCode = value;
        updated[index].accountName = acc ? acc.name : '';
      } else {
        (updated[index] as any)[field] = value;
      }
      return updated;
    });
  };

  const handleSaveManualEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced || !description) return;

    const newJE: JournalEntry = {
      id: editingJEId || `je-manual-${Date.now()}`,
      entryNumber: editingJENumber || `JE-M-${Math.floor(1000 + Math.random() * 9000)}`,
      date: entryDate,
      description,
      lines: lines.map(l => ({ ...l, debit: Number(l.debit), credit: Number(l.credit) })),
      referenceType: 'manual',
      createdAt: new Date().toISOString()
    };

    onAddJournalEntry(newJE);
    setEditingJEId(null);
    setEditingJENumber(null);
    setDescription('');
    setLines([
      { accountCode: '1010', accountName: 'الصندوق والنقدية', debit: 0, credit: 0, memo: '' },
      { accountCode: '4010', accountName: 'إيراد المبيعات', debit: 0, credit: 0, memo: '' }
    ]);
    setActiveSubTab('journal');
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-emerald-600" />
            <span>القيود اليومية والسندات المالية</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            تسجيل وتوثيق القيود المزدوجة وسندات القبض والصرف لضمان توازن الحسابات.
          </p>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveSubTab('journal')}
            className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'journal' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600'
            }`}
          >
            سجل القيود ({journalEntries.length})
          </button>

          <button
            onClick={() => setActiveSubTab('newManual')}
            className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
              activeSubTab === 'newManual' ? 'bg-emerald-600 text-white shadow-xs font-bold' : 'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>قيد يدوي جديد</span>
          </button>

          <button
            onClick={() => setActiveSubTab('vouchers')}
            className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'vouchers' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600'
            }`}
          >
            السندات ({vouchers.length})
          </button>
        </div>
      </div>

      {/* View 1: List of Journal Entries */}
      {activeSubTab === 'journal' && (
        <div className="space-y-4">
          {journalEntries.map(entry => {
            const entryDebit = entry.lines.reduce((s, l) => s + (l.debit || 0), 0);
            return (
              <div key={entry.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold bg-slate-200 text-slate-800 px-2.5 py-1 rounded-lg">
                      {entry.entryNumber}
                    </span>
                    <span className="text-slate-500 flex items-center gap-1 font-mono">
                      <Calendar className="w-3.5 h-3.5" />
                      {entry.date}
                    </span>
                    <span className="font-bold text-slate-800">{entry.description}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      {entry.referenceType === 'sales' ? 'قيد مبيعات' :
                       entry.referenceType === 'purchase' ? 'قيد مشتريات' :
                       entry.referenceType === 'receipt' ? 'سند قبض' :
                       entry.referenceType === 'payment' ? 'سند صرف' : 'قيد يدوي'}
                    </span>
                    <span className="font-mono font-black text-slate-800">
                      إجمالي: {entryDebit.toFixed(2)} {settings.currencySymbol}
                    </span>
                    {entry.referenceType === 'manual' && (
                      <button
                        onClick={() => handleStartEditJE(entry)}
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                        title="تعديل هذا القيد اليدوي"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                    {onDeleteJournalEntry && (
                      <button
                        onClick={() => onDeleteJournalEntry(entry.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="حذف هذا القيد"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-4">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-100 pb-2">
                        <th className="pb-2 font-semibold">كود الحساب</th>
                        <th className="pb-2 font-semibold">اسم الحساب</th>
                        <th className="pb-2 font-semibold">البيان / التوضيح</th>
                        <th className="pb-2 font-semibold text-emerald-700">مدين (+)</th>
                        <th className="pb-2 font-semibold text-rose-700">دائن (-)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {entry.lines.map((line, idx) => (
                        <tr key={idx}>
                          <td className="py-2 font-mono font-bold text-slate-500">{line.accountCode}</td>
                          <td className="py-2 font-bold text-slate-800">{line.accountName}</td>
                          <td className="py-2 text-slate-500">{line.memo || '-'}</td>
                          <td className="py-2 font-mono font-bold text-emerald-700">
                            {line.debit > 0 ? line.debit.toFixed(2) : '-'}
                          </td>
                          <td className="py-2 font-mono font-bold text-rose-700">
                            {line.credit > 0 ? line.credit.toFixed(2) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View 2: Create Manual Double Entry */}
      {activeSubTab === 'newManual' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="font-bold text-slate-800 text-base">إنشاء قيد يومي جديد (قيد يدوي مزدوج)</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              يشترط النظام توازن إجمالي الطرف المدين مع إجمالي الطرف الدائن لتسجيل القيد.
            </p>
          </div>

          <form onSubmit={handleSaveManualEntry} className="space-y-6 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">تاريخ القيد *</label>
                <input
                  type="date"
                  required
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">شرح وبيان القيد المحاسبي *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: إثبات مصاريف ضيافة أو سداد إيجار المحل نقداً..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Lines Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-xs">أطراف القيد المحاسبي (أسطر المدين والدائن)</span>
                <button
                  type="button"
                  onClick={addLine}
                  className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-bold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة سطر حساب آخر</span>
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="p-3 w-1/3">الحساب المحاسبي</th>
                      <th className="p-3 w-1/6">مدين (+)</th>
                      <th className="p-3 w-1/6">دائن (-)</th>
                      <th className="p-3 w-1/4">ملاحظة / بيان السطر</th>
                      <th className="p-3 text-center">حذف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lines.map((line, idx) => (
                      <tr key={idx}>
                        <td className="p-2">
                          <select
                            value={line.accountCode}
                            onChange={(e) => updateLine(idx, 'accountCode', e.target.value)}
                            className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                          >
                            {accounts.map(acc => (
                              <option key={acc.code} value={acc.code}>
                                {acc.code} - {acc.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="p-2">
                          <input
                            type="number"
                            step="0.01"
                            value={line.debit || ''}
                            onChange={(e) => updateLine(idx, 'debit', e.target.value)}
                            className="w-full p-2 border border-slate-200 rounded-lg font-mono font-bold text-emerald-700"
                            placeholder="0.00"
                          />
                        </td>

                        <td className="p-2">
                          <input
                            type="number"
                            step="0.01"
                            value={line.credit || ''}
                            onChange={(e) => updateLine(idx, 'credit', e.target.value)}
                            className="w-full p-2 border border-slate-200 rounded-lg font-mono font-bold text-rose-700"
                            placeholder="0.00"
                          />
                        </td>

                        <td className="p-2">
                          <input
                            type="text"
                            value={line.memo || ''}
                            onChange={(e) => updateLine(idx, 'memo', e.target.value)}
                            className="w-full p-2 border border-slate-200 rounded-lg"
                            placeholder="بيان اختياري..."
                          />
                        </td>

                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeLine(idx)}
                            disabled={lines.length <= 2}
                            className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Total Balance Validation Bar */}
            <div className={`p-4 rounded-xl border flex items-center justify-between font-mono text-xs ${
              isBalanced ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
              <div className="flex items-center gap-2 font-bold">
                {isBalanced ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>القيد متوازن وجاهز للحفظ!</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-rose-600" />
                    <span>غير متوازن! الفارق بين المدين والدائن: {Math.abs(totalDebit - totalCredit).toFixed(2)} {settings.currencySymbol}</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-6 font-bold">
                <div>إجمالي المدين: <span className="text-emerald-700">{totalDebit.toFixed(2)}</span></div>
                <div>إجمالي الدائن: <span className="text-rose-700">{totalCredit.toFixed(2)}</span></div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveSubTab('journal')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={!isBalanced}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-md transition-colors cursor-pointer"
              >
                حفظ وترحيل القيد اليومي
              </button>
            </div>

          </form>
        </div>
      )}

      {/* View 3: Vouchers */}
      {activeSubTab === 'vouchers' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
          <h3 className="font-bold text-slate-800 text-sm mb-4">سجل سندات القبض والصرف</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <th className="p-3 font-semibold">رقم السند</th>
                  <th className="p-3 font-semibold">النوع</th>
                  <th className="p-3 font-semibold">التاريخ</th>
                  <th className="p-3 font-semibold">اسم الطرف / الجهة</th>
                  <th className="p-3 font-semibold">المبلغ</th>
                  <th className="p-3 font-semibold">طريقة الدفع</th>
                  <th className="p-3 font-semibold">البيان والتفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vouchers.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-slate-800">{v.voucherNumber}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        v.type === 'receipt' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {v.type === 'receipt' ? 'سند قبض' : 'سند صرف'}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-slate-500">{v.date}</td>
                    <td className="p-3 font-bold text-slate-800">{v.partyName}</td>
                    <td className="p-3 font-mono font-bold text-emerald-700">
                      {v.amount.toFixed(2)} {settings.currencySymbol}
                    </td>
                    <td className="p-3 text-slate-600">{v.paymentMethod === 'cash' ? 'نقداً (الصندوق)' : 'بنكي'}</td>
                    <td className="p-3 text-slate-500">{v.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
