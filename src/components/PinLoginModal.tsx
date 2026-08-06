import React, { useState, useEffect } from 'react';
import { Shield, Key, Eye, EyeOff, User, ArrowRight, CornerDownLeft } from 'lucide-react';
import { User as UserType } from '../types/accounting';

interface PinLoginModalProps {
  isOpen: boolean;
  users: UserType[];
  currentUser: UserType | null;
  onLoginSuccess: (user: UserType) => void;
  onClose?: () => void;
  canCancel?: boolean;
}

export const PinLoginModal: React.FC<PinLoginModalProps> = ({
  isOpen,
  users,
  currentUser,
  onLoginSuccess,
  onClose,
  canCancel = true
}) => {
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [showPlainPin, setShowPlainPin] = useState(false);

  // Reset states when modal is opened/closed or user is deselected
  useEffect(() => {
    if (!isOpen) {
      setSelectedUser(null);
      setPin('');
      setError(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleKeyPress = (num: string) => {
    setError(false);
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      
      // Auto-submit when 4 digits are reached
      if (newPin.length === 4) {
        verifyPin(newPin);
      }
    }
  };

  const handleDelete = () => {
    setError(false);
    setPin(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setError(false);
    setPin('');
  };

  const verifyPin = (enteredPin: string) => {
    if (!selectedUser) return;
    if (selectedUser.pin === enteredPin) {
      onLoginSuccess(selectedUser);
    } else {
      setError(true);
      // Shake animation effect, then clear pin
      setTimeout(() => {
        setPin('');
      }, 500);
    }
  };

  const selectProfile = (u: UserType) => {
    setSelectedUser(u);
    setPin('');
    setError(false);
  };

  const getRoleLabel = (role: UserType['role']) => {
    switch(role) {
      case 'admin': return 'مسؤول النظام';
      case 'accountant': return 'محاسب مالي';
      case 'seller': return 'بائع / كاشير';
      default: return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-indigo-950/80 backdrop-blur-md p-4 animate-fade-in" dir="rtl">
      <div className="bg-white rounded-[32px] shadow-2xl border border-indigo-100/50 max-w-md w-full overflow-hidden p-8 flex flex-col items-center">
        
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-indigo-900 flex items-center justify-center text-indigo-300 shadow-lg shadow-indigo-200 mb-3.5">
            <Shield className="w-7 h-7 text-indigo-400" />
          </div>
          <h2 className="text-xl font-black text-indigo-950">التاجر الذكي • تسجيل الدخول</h2>
          <p className="text-xs text-slate-400 mt-1">الرجاء اختيار حسابك والتحقق برمز الـ PIN للولوج</p>
        </div>

        {/* PROFILE SELECTOR SCREEN */}
        {!selectedUser ? (
          <div className="w-full space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider text-right mb-2">اختر حساب المستخدم:</h3>
            <div className="grid grid-cols-1 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
              {users.map((u) => {
                const isActive = currentUser?.id === u.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => selectProfile(u)}
                    className="w-full flex items-center justify-between p-4 rounded-2xl border border-gray-100 bg-slate-50/50 hover:bg-slate-50 hover:border-indigo-200 hover:shadow-xs transition-all text-right group cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-700 font-bold shadow-inner group-hover:bg-indigo-100">
                        <User className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
                          {u.name}
                          {isActive && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm" title="الحساب النشط حالياً"></span>
                          )}
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">@{u.username} • {getRoleLabel(u.role)}</p>
                      </div>
                    </div>
                    <span className="text-indigo-400 font-bold group-hover:translate-x-[-4px] transition-transform text-xs">
                      دخول ←
                    </span>
                  </button>
                );
              })}
            </div>

            {canCancel && onClose && (
              <button
                onClick={onClose}
                className="w-full mt-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-2xl transition-colors text-xs cursor-pointer"
              >
                إلغاء والعودة للتطبيق
              </button>
            )}
          </div>
        ) : (
          /* TACTILE KEYPAD SCREEN */
          <div className="w-full flex flex-col items-center animate-fade-in">
            {/* Back Arrow to Profile Select */}
            <button 
              onClick={() => setSelectedUser(null)}
              className="self-start flex items-center gap-1.5 text-slate-500 hover:text-indigo-600 font-bold text-xs mb-6 cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
              <span>العودة لقائمة المستخدمين</span>
            </button>

            {/* Selected User Info */}
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 mx-auto font-bold text-lg mb-2 shadow-inner">
                {selectedUser.name.charAt(0)}
              </div>
              <h3 className="font-bold text-base text-indigo-950">{selectedUser.name}</h3>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">@{selectedUser.username} • {getRoleLabel(selectedUser.role)}</p>
            </div>

            {/* PIN Display Indicators */}
            <div className={`flex justify-center gap-4 mb-6 ${error ? 'animate-shake' : ''}`}>
              {[0, 1, 2, 3].map((idx) => {
                const filled = pin.length > idx;
                return (
                  <div
                    key={idx}
                    className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                      error 
                        ? 'bg-rose-500 border-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' 
                        : filled 
                        ? 'bg-indigo-600 border-indigo-600 scale-110 shadow-[0_0_8px_rgba(79,70,229,0.4)]' 
                        : 'border-slate-300 bg-white'
                    }`}
                  ></div>
                );
              })}
            </div>

            {error && (
              <p className="text-rose-500 text-xs font-black mb-6 animate-pulse">رمز الـ PIN غير صحيح! أعد المحاولة.</p>
            )}

            {/* Keypad numbers */}
            <div className="grid grid-cols-3 gap-3.5 max-w-[280px] w-full">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeyPress(num)}
                  className="w-16 h-16 rounded-full bg-slate-50 hover:bg-indigo-50 border border-slate-100 text-indigo-950 font-black text-xl flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  {num}
                </button>
              ))}

              {/* Clear button */}
              <button
                type="button"
                onClick={handleClear}
                className="w-16 h-16 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs flex items-center justify-center transition-all cursor-pointer active:scale-95"
              >
                مسح
              </button>

              {/* Number 0 */}
              <button
                type="button"
                onClick={() => handleKeyPress('0')}
                className="w-16 h-16 rounded-full bg-slate-50 hover:bg-indigo-50 border border-slate-100 text-indigo-950 font-black text-xl flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
              >
                0
              </button>

              {/* Delete single button */}
              <button
                type="button"
                onClick={handleDelete}
                className="w-16 h-16 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-sm flex items-center justify-center transition-all cursor-pointer active:scale-95"
                title="حذف الرقم الأخير"
              >
                ⌫
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
