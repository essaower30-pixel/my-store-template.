import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Shield, 
  UserCheck, 
  UserX, 
  Lock, 
  Trash2, 
  Edit2, 
  Eye, 
  EyeOff, 
  CheckSquare, 
  Square,
  AlertCircle
} from 'lucide-react';
import { User } from '../types/accounting';

interface UsersViewProps {
  users: User[];
  currentUser: User;
  onAddUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
}

const DEFAULT_PERMISSIONS = {
  admin: {
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
  accountant: {
    dashboard: true,
    pos: false,
    products: true, // View/Read inventory
    purchases: true,
    customers: true,
    suppliers: true,
    chartOfAccounts: true,
    journal: true,
    reports: true,
    settings: false,
  },
  seller: {
    dashboard: false,
    pos: true,
    products: true, // Check product stock
    purchases: false,
    customers: true,
    suppliers: false,
    chartOfAccounts: false,
    journal: false,
    reports: false,
    settings: false,
  }
};

const PERMISSION_LABELS: Record<keyof User['permissions'], string> = {
  dashboard: 'لوحة التحكم والملخص المالي',
  pos: 'نقطة البيع وتسجيل المبيعات',
  products: 'إدارة المخزون والمنتجات',
  purchases: 'فواتير ومصاريف المشتريات',
  customers: 'إدارة الزبائن والعملاء',
  suppliers: 'إدارة الموردين والمستحقات',
  chartOfAccounts: 'شجرة الحسابات والدفاتر',
  journal: 'القيود والسندات اليومية',
  reports: 'التقارير المالية والأرباح',
  settings: 'إعدادات النظام والمستخدمين',
};

export const UsersView: React.FC<UsersViewProps> = ({
  users,
  currentUser,
  onAddUser,
  onUpdateUser,
  onDeleteUser
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPin, setShowPin] = useState<Record<string, boolean>>({});

  // Form States
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<User['role']>('seller');
  const [pin, setPin] = useState('');
  const [permissions, setPermissions] = useState<User['permissions']>({ ...DEFAULT_PERMISSIONS.seller });
  const [errorMsg, setErrorMsg] = useState('');

  const openAddModal = () => {
    setEditingUser(null);
    setName('');
    setUsername('');
    setRole('seller');
    setPin('');
    setPermissions({ ...DEFAULT_PERMISSIONS.seller });
    setErrorMsg('');
    setShowModal(true);
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setName(u.name);
    setUsername(u.username);
    setRole(u.role);
    setPin(u.pin);
    setPermissions({ ...u.permissions });
    setErrorMsg('');
    setShowModal(true);
  };

  const handleRoleChange = (selectedRole: User['role']) => {
    setRole(selectedRole);
    setPermissions({ ...DEFAULT_PERMISSIONS[selectedRole] });
  };

  const togglePermission = (key: keyof User['permissions']) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const togglePinVisibility = (userId: string) => {
    setShowPin(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) return setErrorMsg('الرجاء إدخال الاسم الكامل للمستخدم');
    if (!username.trim()) return setErrorMsg('الرجاء إدخال اسم مستخدم فريد');
    if (!/^\d{4}$/.test(pin)) return setErrorMsg('رمز الدخول PIN يجب أن يكون من 4 أرقام عددية فقط (مثل: 1234)');

    // Check username uniqueness
    const exists = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase() && u.id !== editingUser?.id);
    if (exists) return setErrorMsg('اسم المستخدم هذا مستخدم بالفعل، الرجاء اختيار اسم آخر');

    if (editingUser) {
      onUpdateUser({
        ...editingUser,
        name: name.trim(),
        username: username.trim(),
        role,
        pin,
        permissions
      });
    } else {
      onAddUser({
        id: `user-${Date.now()}`,
        name: name.trim(),
        username: username.trim(),
        role,
        pin,
        permissions,
        createdAt: new Date().toISOString()
      });
    }

    setShowModal(false);
  };

  const handleDelete = (userId: string) => {
    if (userId === currentUser.id) {
      alert('لا يمكنك حذف حسابك الحالي الذي تستخدمه لتسجيل الدخول!');
      return;
    }

    // Ensure we don't delete the last admin
    const adminCount = users.filter(u => u.role === 'admin').length;
    const targetUser = users.find(u => u.id === userId);
    if (targetUser?.role === 'admin' && adminCount <= 1) {
      alert('لا يمكن حذف هذا المسؤول. يجب أن يتبقى مسؤول واحد على الأقل في النظام لإدارته!');
      return;
    }

    if (confirm(`هل أنت متأكد من حذف المستخدم "${targetUser?.name}" نهائياً من النظام؟`)) {
      onDeleteUser(userId);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Header Info Block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-2xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-indigo-950">مستخدمو النظام والصلاحيات</h1>
              <p className="text-xs text-slate-500 mt-1">
                قم بإدارة طاقم عمل المحل (المحاسبين، البائعين) وتخصيص صلاحيات الوصول إلى الواجهات بدقة لضمان سرية وأمان البيانات.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-2xl transition-colors cursor-pointer shadow-md shadow-indigo-100"
        >
          <Plus className="w-5 h-5" />
          <span>إضافة مستخدم جديد</span>
        </button>
      </div>

      {/* Grid of Users */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map((u) => {
          const isMe = u.id === currentUser.id;
          return (
            <div 
              key={u.id}
              className={`bg-white rounded-3xl border transition-all p-6 relative flex flex-col justify-between h-full ${
                isMe 
                  ? 'border-indigo-500 shadow-lg shadow-indigo-500/5 ring-1 ring-indigo-500/20' 
                  : 'border-gray-200/80 hover:border-gray-300 shadow-xs'
              }`}
            >
              <div>
                {/* User Card Top Row */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-base text-indigo-950 flex items-center gap-2">
                      {u.name}
                      {isMe && (
                        <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-extrabold">
                          أنت الحالي
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">@{u.username}</p>
                  </div>
                  
                  <span className={`px-3 py-1 rounded-full text-xs font-black border ${
                    u.role === 'admin' 
                      ? 'bg-red-50 text-red-700 border-red-200' 
                      : u.role === 'accountant'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {u.role === 'admin' ? 'مسؤول (مدير)' : u.role === 'accountant' ? 'محاسب' : 'بائع / كاشير'}
                  </span>
                </div>

                {/* PIN Code Panel */}
                <div className="bg-slate-50 rounded-2xl p-3 flex items-center justify-between border border-slate-100 mb-5">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>رمز دخول PIN:</span>
                    <span className="font-mono font-extrabold text-indigo-950 tracking-wider">
                      {showPin[u.id] ? u.pin : '••••'}
                    </span>
                  </div>
                  <button 
                    onClick={() => togglePinVisibility(u.id)}
                    className="text-slate-400 hover:text-indigo-600 p-1 rounded-lg transition-colors cursor-pointer"
                  >
                    {showPin[u.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Active Permissions Badges */}
                <div className="space-y-2.5 mb-6">
                  <h4 className="text-[11px] font-black text-slate-400 tracking-wider uppercase">الصلاحيات الممنوحة:</h4>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                    {Object.entries(u.permissions).map(([key, value]) => {
                      if (!value) return null;
                      return (
                        <span 
                          key={key}
                          className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-slate-200/50"
                        >
                          {key === 'dashboard' && 'لوحة التحكم'}
                          {key === 'pos' && 'نقطة البيع'}
                          {key === 'products' && 'المخازن'}
                          {key === 'purchases' && 'المشتريات'}
                          {key === 'customers' && 'الزبائن'}
                          {key === 'suppliers' && 'الموردين'}
                          {key === 'chartOfAccounts' && 'شجرة الحسابات'}
                          {key === 'journal' && 'القيود اليومية'}
                          {key === 'reports' && 'التقارير'}
                          {key === 'settings' && 'الإعدادات'}
                        </span>
                      );
                    })}
                    {Object.values(u.permissions).every(v => !v) && (
                      <span className="text-rose-500 text-xs font-bold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        بلا أي صلاحيات حالياً
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t border-slate-100">
                <button
                  onClick={() => openEditModal(u)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-indigo-950 font-bold py-2 px-3 rounded-xl transition-colors text-xs border border-slate-200 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>تعديل الحساب</span>
                </button>

                <button
                  onClick={() => handleDelete(u.id)}
                  disabled={isMe}
                  className={`p-2 rounded-xl border transition-colors flex items-center justify-center ${
                    isMe 
                      ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed' 
                      : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200 cursor-pointer'
                  }`}
                  title="حذف حساب المستخدم نهائياً"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal - Create/Edit Form */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in" dir="rtl">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-gray-200 max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-950 rounded-t-3xl text-white">
              <h2 className="font-extrabold text-lg flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-300" />
                {editingUser ? `تعديل صلاحيات: ${editingUser.name}` : 'إضافة مستخدم جديد للنظام'}
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                className="text-indigo-200 hover:text-white text-sm font-bold bg-white/10 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-6">
              
              {errorMsg && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl flex items-center gap-2 animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Row 1: Name and Username */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-indigo-950 mb-1.5">الاسم الكامل للموظف <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: أحمد محمد علي"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-indigo-950 mb-1.5">اسم المستخدم (للدخول بـ @) <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                    placeholder="مثال: ahmed99"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                  />
                </div>
              </div>

              {/* Row 2: Role and PIN */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-indigo-950 mb-1.5">الصفة الوظيفية (الدور الافتراضي)</label>
                  <select
                    value={role}
                    onChange={(e) => handleRoleChange(e.target.value as User['role'])}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                  >
                    <option value="seller">بائع / كاشير (صلاحيات محدودة جداً للبيع فقط)</option>
                    <option value="accountant">محاسب (الوصول للمالية والقيود دون الإعدادات)</option>
                    <option value="admin">مسؤول / مدير النظام (وصول مطلق لكل شيء)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-indigo-950 mb-1.5">رمز دخول الموظف (PIN من 4 أرقام) <span className="text-rose-500">*</span></label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="رمز PIN مكون من 4 أرقام (مثال: 4321)"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-mono tracking-widest text-center text-lg font-bold"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">يستخدم لتبديل المستخدم والتحقق السريع عند استخدام كاشير مخصص.</p>
                </div>
              </div>

              {/* Section 3: Fine-tuned Permissions */}
              <div className="border-t border-gray-100 pt-5 space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black text-indigo-950 uppercase tracking-wider">تخصيص الصلاحيات يدوياً:</h3>
                  <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-bold">
                    يمكنك تعديل أي صلاحية بشكل منفرد
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                  {Object.entries(permissions).map(([key, value]) => {
                    const pKey = key as keyof User['permissions'];
                    return (
                      <button
                        type="button"
                        key={pKey}
                        onClick={() => togglePermission(pKey)}
                        className={`flex items-center gap-3 p-3 rounded-xl border text-right transition-all cursor-pointer ${
                          value 
                            ? 'bg-indigo-50/50 border-indigo-200 text-indigo-950' 
                            : 'bg-white border-gray-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <span className={value ? 'text-indigo-600' : 'text-slate-300'}>
                          {value ? <CheckSquare className="w-4 h-4 shrink-0" /> : <Square className="w-4 h-4 shrink-0" />}
                        </span>
                        <span className="text-xs font-bold leading-tight">{PERMISSION_LABELS[pKey]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="border-t border-gray-100 pt-5 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors cursor-pointer text-xs"
                >
                  {editingUser ? 'حفظ تعديلات الموظف' : 'إنشاء حساب الموظف المعتمد'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-6 rounded-xl transition-colors cursor-pointer text-xs"
                >
                  إلغاء التغييرات
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
