import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Share2, Copy, Check, Smartphone, Building2, Edit3 } from 'lucide-react';
import { formatWhatsAppPhone } from '../utils/searchUtils';

interface WhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  phone: string;
  partyName: string;
  title?: string;
  message: string;
  cardData?: any;
}

export const WhatsAppShareModal: React.FC<WhatsAppShareModalProps> = ({
  isOpen,
  onClose,
  phone,
  partyName,
  title = 'إرسال عبر الواتساب',
  message,
}) => {
  const [copied, setCopied] = useState(false);
  const [inputPhone, setInputPhone] = useState('');
  const [selectedCountryCode, setSelectedCountryCode] = useState('963'); // default Syria

  useEffect(() => {
    if (phone) {
      setInputPhone(phone);
    } else {
      setInputPhone('');
    }
  }, [phone, isOpen]);

  if (!isOpen) return null;

  // Process phone through intelligent sanitizer
  const sanitizedPhone = formatWhatsAppPhone(inputPhone, selectedCountryCode);

  const handleStandardWhatsApp = () => {
    if (!sanitizedPhone) {
      alert('الرجاء إدخال رقم هاتف صحيح للزبون لتتمكن من مراسلته عبر الواتساب');
      return;
    }
    const url = `https://wa.me/${sanitizedPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleWhatsAppBusiness = () => {
    if (!sanitizedPhone) {
      alert('الرجاء إدخال رقم هاتف صحيح للزبون لتتمكن من مراسلته عبر الواتساب');
      return;
    }
    const url = `whatsapp://send?phone=${sanitizedPhone}&text=${encodeURIComponent(message)}`;
    window.location.href = url;
  };

  const handleSystemShareText = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: message
        });
      } catch (err) {
        console.log('Share canceled or failed', err);
      }
    } else {
      handleCopyText();
      alert('المشاركة المباشرة غير مدعومة بالكامل على هذا المتصفح، تم نسخ النص تلقائياً للصقه في الواتساب.');
    }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const countryPresets = [
    { code: '963', label: '🇸🇾 +963 (سوريا)' },
    { code: '964', label: '🇮🇶 +964 (العراق)' },
    { code: '966', label: '🇸🇦 +966 (السعودية)' },
    { code: '20', label: '🇪🇬 +20 (مصر)' },
    { code: '962', label: '🇯🇴 +962 (الأردن)' },
    { code: '971', label: '🇦🇪 +971 (الإمارات)' },
  ];

  return (
    <div className="fixed inset-0 z-70 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 dir-rtl text-right overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-200 space-y-4 my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-100 shadow-xs">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                {title}
              </h3>
              <p className="text-[11px] text-slate-500">مشاركة الكشف كرسالة نصية مباشرة عبر الواتساب</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Phone Number Input */}
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-bold">المستلم:</span>
            <span className="font-extrabold text-slate-900">{partyName}</span>
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-slate-200/80">
            <select
              value={selectedCountryCode}
              onChange={(e) => setSelectedCountryCode(e.target.value)}
              className="bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 cursor-pointer shrink-0"
            >
              {countryPresets.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>

            <div className="relative flex-1">
              <input
                type="text"
                value={inputPhone}
                onChange={(e) => setInputPhone(e.target.value)}
                placeholder="رقم هاتف الواتساب"
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 dir-ltr text-right"
              />
              <Edit3 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Message Content Box */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span>نص الرسالة المجهزة:</span>
            <button
              type="button"
              onClick={handleCopyText}
              className="text-emerald-700 hover:text-emerald-800 text-[11px] flex items-center gap-1 cursor-pointer font-extrabold"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'تم النسخ!' : 'نسخ النص'}</span>
            </button>
          </div>
          <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-2xl p-3.5 text-xs text-slate-800 max-h-56 overflow-y-auto font-sans leading-relaxed whitespace-pre-wrap dir-rtl select-all">
            {message}
          </div>
        </div>

        {/* WhatsApp Send Action Buttons */}
        <div className="space-y-2 pt-1">
          <p className="text-xs font-black text-slate-800">اختر تطبيق الواتساب للإرسال المباشر:</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleStandardWhatsApp}
              className="p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl transition-all cursor-pointer flex items-center gap-2.5 shadow-sm font-bold text-xs"
            >
              <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                <Smartphone className="w-4 h-4 text-white" />
              </div>
              <div className="text-right">
                <span className="block font-black">واتساب العادي</span>
                <span className="text-[10px] text-emerald-100 font-normal">فتح WhatsApp</span>
              </div>
            </button>

            <button
              type="button"
              onClick={handleWhatsAppBusiness}
              className="p-3 bg-teal-700 hover:bg-teal-800 text-white rounded-2xl transition-all cursor-pointer flex items-center gap-2.5 shadow-sm font-bold text-xs"
            >
              <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <div className="text-right">
                <span className="block font-black">واتساب الأعمال</span>
                <span className="text-[10px] text-teal-100 font-normal">WhatsApp Business</span>
              </div>
            </button>
          </div>

          <button
            type="button"
            onClick={handleSystemShareText}
            className="w-full p-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm font-extrabold text-xs"
          >
            <Share2 className="w-4 h-4 text-amber-400" />
            <span>مشاركة النص عبر تطبيقات الجهاز</span>
          </button>
        </div>

      </div>
    </div>
  );
};
