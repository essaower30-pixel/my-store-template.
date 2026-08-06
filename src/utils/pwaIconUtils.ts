/**
 * Utility functions to dynamically update PWA Icon, App Title, and Manifest
 * for home screen customization.
 */

export interface PresetIcon {
  id: string;
  name: string;
  url: string;
  description: string;
}

export const PRESET_ICONS: PresetIcon[] = [
  {
    id: 'grocery_3d',
    name: 'أيقونة البقالة والسوبرماركت (3D)',
    url: '/icon.jpg',
    description: 'أيقونة ملونة حديثة بسلة تبضع خضروات ومواد غذائية'
  },
  {
    id: 'smart_merchant_bag',
    name: 'أيقونة التاجر الذكي الأنيقة',
    url: 'https://images.unsplash.com/photo-1556740758-90de374c12ad?w=500&auto=format&fit=crop&q=80',
    description: 'حقيبة تسوق عصرية مع فاتورة ودفع إلكتروني'
  },
  {
    id: 'cashier_pos',
    name: 'أيقونة الكاشير والمتجر الذهبية',
    url: 'https://images.unsplash.com/photo-1556742049-0a6708957724?w=500&auto=format&fit=crop&q=80',
    description: 'جهاز كاشير مع بطاقة سداد وتجارة ذكية'
  }
];

export const STORAGE_KEY_ICON = 'pwa_custom_icon_url';
export const STORAGE_KEY_TITLE = 'pwa_custom_app_title';

export function getCustomIconUrl(): string {
  if (typeof window === 'undefined') return '/icon.jpg';
  return localStorage.getItem(STORAGE_KEY_ICON) || '/icon.jpg';
}

export function getCustomAppTitle(): string {
  if (typeof window === 'undefined') return 'التاجر الذكي (بقالة)';
  return localStorage.getItem(STORAGE_KEY_TITLE) || 'التاجر الذكي (بقالة)';
}

export async function uploadCustomIconServer(imageBase64: string): Promise<string> {
  if (!imageBase64 || !imageBase64.startsWith('data:image')) {
    return imageBase64;
  }
  try {
    const res = await fetch('/api/upload-app-icon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64 })
    });
    if (!res.ok) throw new Error('Server icon upload failed');
    const data = await res.json();
    if (data.iconUrl) return data.iconUrl;
  } catch (err) {
    console.warn('Fallback to local image base64:', err);
  }
  return imageBase64;
}

export function updatePWAConfig(iconUrl: string, title: string): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY_ICON, iconUrl);
    localStorage.setItem(STORAGE_KEY_TITLE, title);

    // Also sync with shop_acc_settings_v1 if present in localStorage
    const rawSettings = localStorage.getItem('shop_acc_settings_v1');
    if (rawSettings) {
      try {
        const parsed = JSON.parse(rawSettings);
        parsed.shopName = title;
        if (iconUrl) parsed.logoUrl = iconUrl;
        localStorage.setItem('shop_acc_settings_v1', JSON.stringify(parsed));
      } catch (e) {
        console.warn('Failed to update settings in storage:', e);
      }
    }

    // 1. Update Document Title & Meta
    document.title = title + ' - برنامج المحاسبة وإدارة البقالة';

    const appleTitleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (appleTitleMeta) {
      appleTitleMeta.setAttribute('content', title);
    }

    // 2. Update favicons & apple touch icons
    const favicons = document.querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="apple-touch-icon"]');
    favicons.forEach(link => {
      link.href = iconUrl;
    });

    // 3. Dynamically inject clean HTTP Manifest URL
    // Create a stable version key from the icon URL's own query parameter or a stable fallback
    let version = '1';
    const match = iconUrl.match(/[?&]v=([^&]+)/);
    if (match) {
      version = match[1];
    }
    const manifestUrl = `/api/manifest.json?title=${encodeURIComponent(title)}&icon=${encodeURIComponent(iconUrl)}&v=${version}`;

    let manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      document.head.appendChild(manifestLink);
    }
    manifestLink.href = manifestUrl;

    // Dispatch custom event to sync React state live across header, settings and sidebar
    window.dispatchEvent(new CustomEvent('pwa-config-changed', { detail: { iconUrl, title } }));

  } catch (err) {
    console.warn('Failed to update dynamic PWA config:', err);
  }
}

export function initPWAConfigOnLoad(): void {
  const savedIcon = getCustomIconUrl();
  const savedTitle = getCustomAppTitle();
  updatePWAConfig(savedIcon, savedTitle);
}
