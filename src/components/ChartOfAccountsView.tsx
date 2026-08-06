import React, { useState } from 'react';
import { 
  FolderTree, 
  Plus, 
  FileText, 
  ChevronDown, 
  ChevronLeft, 
  Search, 
  BookOpen, 
  CheckCircle2, 
  Folder, 
  FolderOpen
} from 'lucide-react';
import { AccountNode, JournalEntry, ShopSettings, AccountType } from '../types/accounting';
import { calculateAccountBalance } from '../utils/accountingEngine';

interface ChartOfAccountsViewProps {
  accounts: AccountNode[];
  journalEntries: JournalEntry[];
  settings: ShopSettings;
  onAddAccount: (acc: AccountNode) => void;
}

export const ChartOfAccountsView: React.FC<ChartOfAccountsViewProps> = ({
  accounts,
  journalEntries,
  settings,
  onAddAccount
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    '1000': true,
    '2000': true,
    '3000': true,
    '4000': true,
    '5000': true,
  });

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [ledgerAccount, setLedgerAccount] = useState<AccountNode | null>(null);

  // New Account Form State
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<AccountType>('asset');
  const [newCategory, setNewCategory] = useState('أصول متداولة');
  const [newParentCode, setNewParentCode] = useState('1000');
  const [newDescription, setNewDescription] = useState('');

  const toggleExpand = (code: string) => {
    setExpandedNodes(prev => ({ ...prev, [code]: !prev[code] }));
  };

  // Group main headers vs child accounts
  const mainHeaders = accounts.filter(a => a.isHeader || !a.parentCode);

  const filteredAccounts = accounts.filter(acc => {
    const matchesSearch = acc.name.includes(searchTerm) || acc.code.includes(searchTerm);
    const matchesCategory = selectedCategoryFilter === 'all' || acc.type === selectedCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newName) return;

    const newAcc: AccountNode = {
      code: newCode,
      name: newName,
      type: newType,
      category: newCategory,
      parentCode: newParentCode,
      isHeader: false,
      description: newDescription
    };

    onAddAccount(newAcc);
    setShowAddModal(false);
    setNewCode('');
    setNewName('');
    setNewDescription('');
  };

  // Calculate Ledger Transactions for selected account
  const ledgerLines: Array<{
    date: string;
    entryNumber: string;
    description: string;
    debit: number;
    credit: number;
    runningBalance: number;
  }> = [];

  if (ledgerAccount) {
    let running = 0;
    journalEntries.forEach(je => {
      je.lines.forEach(line => {
        if (
          line.accountCode === ledgerAccount.code ||
          (ledgerAccount.isHeader && line.accountCode.startsWith(ledgerAccount.code))
        ) {
          const debit = Number(line.debit || 0);
          const credit = Number(line.credit || 0);

          if (ledgerAccount.type === 'asset' || ledgerAccount.type === 'expense') {
            running += (debit - credit);
          } else {
            running += (credit - debit);
          }

          ledgerLines.push({
            date: je.date,
            entryNumber: je.entryNumber,
            description: line.memo || je.description,
            debit,
            credit,
            runningBalance: running
          });
        }
      });
    });
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <FolderTree className="w-6 h-6 text-emerald-600" />
            <span>شجرة الحسابات المحاسبية (Chart of Accounts)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            الهيكل الهرمي الكامل لأصول وخصوم وحقوق ملكية وإيرادات ومصروفات المحل.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة حساب جديد</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        
        {/* Search Input */}
        <div className="relative min-w-[240px] flex-1 max-w-md">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="البحث باسم الحساب أو الكود..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-9 pl-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto text-xs bg-slate-100 p-1 rounded-xl">
          {[
            { id: 'all', label: 'الكل' },
            { id: 'asset', label: '1- الأصول' },
            { id: 'liability', label: '2- الخصوم' },
            { id: 'equity', label: '3- حقوق الملكية' },
            { id: 'revenue', label: '4- الإيرادات' },
            { id: 'expense', label: '5- المصروفات' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategoryFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                selectedCategoryFilter === tab.id
                  ? 'bg-white text-slate-800 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

      </div>

      {/* Tree Accounts Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        
        <div className="p-4 bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-xs grid grid-cols-12 gap-2">
          <span className="col-span-5">كود واسم الحساب المحاسبي</span>
          <span className="col-span-2 text-center">نوع الحساب</span>
          <span className="col-span-2 text-left">إجمالي إمدين/الدائن</span>
          <span className="col-span-2 text-left">الرصيد الحالي</span>
          <span className="col-span-1 text-center">دفتر الأستاذ</span>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredAccounts.map(account => {
            const isExpanded = expandedNodes[account.code];
            const children = accounts.filter(a => a.parentCode === account.code);
            const hasChildren = children.length > 0;
            const bal = calculateAccountBalance(account.code, accounts, journalEntries);

            // Indentation based on code length or header status
            const indentClass = account.isHeader ? 'pl-2' : account.parentCode ? 'pr-6' : 'pr-2';

            return (
              <div key={account.code} className="hover:bg-slate-50/80 transition-colors">
                <div className={`p-3.5 text-xs grid grid-cols-12 gap-2 items-center ${indentClass}`}>
                  
                  {/* Account Code & Name */}
                  <div className="col-span-5 flex items-center gap-2">
                    {hasChildren ? (
                      <button
                        onClick={() => toggleExpand(account.code)}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
                      >
                        {isExpanded ? (
                          <FolderOpen className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Folder className="w-4 h-4 text-amber-500" />
                        )}
                      </button>
                    ) : (
                      <span className="w-6 text-center text-slate-300">•</span>
                    )}

                    <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                      {account.code}
                    </span>

                    <span className={`font-bold ${account.isHeader ? 'text-slate-900 text-sm' : 'text-slate-700'}`}>
                      {account.name}
                    </span>

                    {account.description && (
                      <span className="text-[10px] text-slate-400 hidden md:inline-block">
                        ({account.description})
                      </span>
                    )}
                  </div>

                  {/* Account Type Badge */}
                  <div className="col-span-2 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      account.type === 'asset' ? 'bg-sky-100 text-sky-800' :
                      account.type === 'liability' ? 'bg-amber-100 text-amber-800' :
                      account.type === 'equity' ? 'bg-purple-100 text-purple-800' :
                      account.type === 'revenue' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {account.type === 'asset' ? 'أصل' :
                       account.type === 'liability' ? 'خصم/التزام' :
                       account.type === 'equity' ? 'حقوق ملكية' :
                       account.type === 'revenue' ? 'إيراد' : 'مصروف'}
                    </span>
                  </div>

                  {/* Debit / Credit Summary */}
                  <div className="col-span-2 text-left font-mono text-[11px] text-slate-500">
                    <div>م: {bal.debit.toFixed(2)}</div>
                    <div>د: {bal.credit.toFixed(2)}</div>
                  </div>

                  {/* Net Balance */}
                  <div className="col-span-2 text-left font-mono font-bold text-xs text-slate-800">
                    <span className={bal.netBalance < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                      {bal.netBalance.toFixed(2)} {settings.currencySymbol}
                    </span>
                  </div>

                  {/* Ledger Button */}
                  <div className="col-span-1 text-center">
                    <button
                      onClick={() => setLedgerAccount(account)}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer transition-colors"
                      title="عرض كشف حساب / دفتر الأستاذ"
                    >
                      <BookOpen className="w-4 h-4 text-emerald-600" />
                    </button>
                  </div>

                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Modal: Add New Account */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-emerald-600" />
                <span>إضافة حساب جديد إلى شجرة الحسابات</span>
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">كود الحساب المحاسبي *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: 1015"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">نوع الحساب *</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as AccountType)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="asset">1- الأصول (Asset)</option>
                    <option value="liability">2- الخصوم (Liability)</option>
                    <option value="equity">3- حقوق الملكية (Equity)</option>
                    <option value="revenue">4- الإيرادات (Revenue)</option>
                    <option value="expense">5- المصروفات (Expense)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">اسم الحساب المحاسبي *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: حساب بنك الراجحي الفرعي"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">الحساب الرئيسي الأب</label>
                  <select
                    value={newParentCode}
                    onChange={(e) => setNewParentCode(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    {accounts.filter(a => a.isHeader || !a.parentCode).map(hdr => (
                      <option key={hdr.code} value={hdr.code}>
                        {hdr.code} - {hdr.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">التصنيف المحاسبي</label>
                  <input
                    type="text"
                    placeholder="مثال: أصول متداولة"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ملاحظات / الوصف</label>
                <textarea
                  rows={2}
                  placeholder="وصف اختياري لنشاط هذا الحساب..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs"
                >
                  حفظ الحساب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Ledger View (دفتر الأستاذ) */}
      {ledgerAccount && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] flex flex-col">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div>
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-emerald-600" />
                  <span>دفتر الأستاذ للحساب: {ledgerAccount.code} - {ledgerAccount.name}</span>
                </h3>
                <p className="text-xs text-slate-500">سجل الحركة المالية التفصيلية القيود الخاصة بهذا الحساب</p>
              </div>
              <button 
                onClick={() => setLedgerAccount(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <th className="p-3 font-semibold">التاريخ</th>
                    <th className="p-3 font-semibold">رقم القيد</th>
                    <th className="p-3 font-semibold">البيان / التوضيح</th>
                    <th className="p-3 font-semibold">مدين (+)</th>
                    <th className="p-3 font-semibold">دائن (-)</th>
                    <th className="p-3 font-semibold">الرصيد التراكمي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ledgerLines.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400">
                        لا توجد قيود يومية حركية مسجلة لهذا الحساب حتى الآن.
                      </td>
                    </tr>
                  ) : (
                    ledgerLines.map((line, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 text-slate-500 font-mono">{line.date}</td>
                        <td className="p-3 font-bold text-slate-700 font-mono">{line.entryNumber}</td>
                        <td className="p-3 text-slate-800">{line.description}</td>
                        <td className="p-3 font-mono font-semibold text-emerald-700">
                          {line.debit > 0 ? line.debit.toFixed(2) : '-'}
                        </td>
                        <td className="p-3 font-mono font-semibold text-rose-700">
                          {line.credit > 0 ? line.credit.toFixed(2) : '-'}
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-900 bg-slate-50">
                          {line.runningBalance.toFixed(2)} {settings.currencySymbol}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end shrink-0">
              <button
                onClick={() => setLedgerAccount(null)}
                className="px-4 py-2 bg-slate-800 text-white font-bold rounded-xl text-xs"
              >
                إغلاق دفتر الأستاذ
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
