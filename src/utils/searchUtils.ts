/**
 * Helper utilities for Arabic and case-insensitive search matching
 */

export const convertArabicDigits = (str: string | number | undefined | null): string => {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/[٠۰]/g, '0')
    .replace(/[١۱]/g, '1')
    .replace(/[٢۲]/g, '2')
    .replace(/[٣۳]/g, '3')
    .replace(/[٤۴]/g, '4')
    .replace(/[٥۵]/g, '5')
    .replace(/[٦۶]/g, '6')
    .replace(/[٧۷]/g, '7')
    .replace(/[٨۸]/g, '8')
    .replace(/[٩۹]/g, '9');
};

export const cleanBarcode = (code: string | number | undefined | null): string => {
  if (code === undefined || code === null) return '';
  const converted = convertArabicDigits(code);
  const basicClean = converted.trim().replace(/[\s\r\n\t]/g, '').toLowerCase();
  const stripped = basicClean.replace(/^0+/, '');
  return stripped.length > 0 ? stripped : basicClean;
};

export const isBarcodeMatch = (
  code1: string | number | undefined | null,
  code2: string | number | undefined | null,
  strict: boolean = false
): boolean => {
  const c1 = cleanBarcode(code1);
  const c2 = cleanBarcode(code2);
  if (!c1 || !c2) return false;
  return c1 === c2;
};

export const normalizeText = (text: string | number | undefined | null): string => {
  if (text === undefined || text === null) return '';
  const str = String(text).trim().toLowerCase();
  return str
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u0652]/g, ''); // remove Arabic tashkeel marks
};

export const matchesSearch = (haystack: string | number | undefined | null, needle: string): boolean => {
  if (!needle || !needle.trim()) return true;
  const normNeedle = normalizeText(needle);
  const normHaystack = normalizeText(haystack);
  if (normHaystack.includes(normNeedle)) return true;
  // Check cleaned barcode match
  if (isBarcodeMatch(haystack, needle)) return true;
  return false;
};

/**
 * Sanitizes phone numbers into valid E.164 WhatsApp numbers
 * e.g., '00964308902' -> '964308902'
 * e.g., '0964308902' -> '964308902'
 * e.g., '+964308902' -> '964308902'
 * e.g., '0933123456' -> '963933123456' (with country code prepend when local)
 */
export const formatWhatsAppPhone = (phone: string, defaultCountryCode: string = '963'): string => {
  if (!phone) return '';

  // 1. Convert Arabic & Persian digits to standard Western digits
  let cleaned = phone
    .replace(/[٠۰]/g, '0')
    .replace(/[١۱]/g, '1')
    .replace(/[٢۲]/g, '2')
    .replace(/[٣۳]/g, '3')
    .replace(/[٤۴]/g, '4')
    .replace(/[٥۵]/g, '5')
    .replace(/[٦۶]/g, '6')
    .replace(/[٧۷]/g, '7')
    .replace(/[٨۸]/g, '8')
    .replace(/[٩۹]/g, '9')
    .replace(/[^0-9]/g, ''); // strip non-digits

  if (!cleaned) return '';

  // 2. Remove leading double zero "00"
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  }

  // Common Arab / Middle East Country Codes
  const knownCountryCodes = [
    '963', // Syria
    '964', // Iraq
    '966', // Saudi Arabia
    '962', // Jordan
    '961', // Lebanon
    '971', // UAE
    '965', // Kuwait
    '968', // Oman
    '973', // Bahrain
    '974', // Qatar
    '20',  // Egypt
    '90',  // Turkey
    '967', // Yemen
    '212', // Morocco
    '213', // Algeria
    '216', // Tunisia
    '218', // Libya
    '249', // Sudan
  ];

  // 3. If phone starts with '0':
  if (cleaned.startsWith('0')) {
    const withoutZero = cleaned.replace(/^0+/, '');
    
    // Check if after removing leading 0 it starts with a recognized country code (e.g. 0964308902 -> 964308902)
    const hasKnownCode = knownCountryCodes.some(code => withoutZero.startsWith(code));
    if (hasKnownCode) {
      return withoutZero;
    }

    // Otherwise it's a local number with leading zero (e.g. 0933123456 or 07701234567)
    return `${defaultCountryCode}${withoutZero}`;
  }

  // 4. Check if cleaned already starts with a known country code
  if (knownCountryCodes.some(code => cleaned.startsWith(code))) {
    return cleaned;
  }

  // 5. If it's a local number without leading zero (e.g. 933123456 or 7701234567, length 8-10)
  if (cleaned.length >= 8 && cleaned.length <= 10 && !cleaned.startsWith(defaultCountryCode)) {
    return `${defaultCountryCode}${cleaned}`;
  }

  return cleaned;
};

