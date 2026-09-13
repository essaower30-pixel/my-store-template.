/// <reference types="vite/client" />
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Global event listener to capture the beforeinstallprompt event as early as possible
if (typeof window !== 'undefined') {
  const urlParams = new URLSearchParams(window.location.search);
  const storeId = urlParams.get('store');
  const manifestEl = document.getElementById('pwa-manifest') || document.querySelector('link[rel="manifest"]');
  if (manifestEl) {
    if (storeId) {
      manifestEl.setAttribute('href', `/manifest.json?store=${encodeURIComponent(storeId)}`);
    } else {
      manifestEl.setAttribute('href', '/manifest.json');
    }
  }

  (window as any).deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    (window as any).deferredPrompt = e;
    // Dispatch a custom event to notify listeners that the prompt is ready
    window.dispatchEvent(new CustomEvent('pwa-prompt-ready', { detail: e }));
  });
}

// Intercept HTMLMediaElement.prototype.play to catch and suppress "interrupted by a new load request" abort errors globally.
const originalPlay = HTMLMediaElement.prototype.play;
HTMLMediaElement.prototype.play = function(...args: any[]) {
  const promise = originalPlay.apply(this, args);
  if (promise !== undefined) {
    promise.catch(err => {
      const errMsg = err?.message || '';
      if (
        err?.name === 'AbortError' || 
        errMsg.includes('interrupted by a new load request') || 
        errMsg.includes('The play() request was interrupted') ||
        errMsg.includes('The play() request was paused')
      ) {
        // Quietly suppress benign play interruption or paused errors
        console.log('Suppressed media play() interruption error:', errMsg);
      } else {
        console.warn('Media play() deferred or failed:', err);
      }
    });
  }
  return promise;
};

// Register Service Worker for offline PWA support in production, or clean up in dev environments
const isDevEnvironment = typeof window !== 'undefined' && (
  import.meta.env.DEV ||
  window.location.hostname === 'localhost' || 
  window.location.hostname.includes('127.0.0.1') ||
  window.location.hostname.includes('ais-dev-')
);

if ('serviceWorker' in navigator) {
  if (isDevEnvironment) {
    // Unregister any active service workers in dev/preview environments to prevent caching Vite internal modules
    navigator.serviceWorker.getRegistrations().then(async (registrations) => {
      let removedAny = false;
      for (const registration of registrations) {
        const ok = await registration.unregister();
        if (ok) removedAny = true;
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        for (const key of keys) {
          await caches.delete(key);
          removedAny = true;
        }
      }
      if (removedAny) {
        console.log('Cleaned up dev service workers & caches to avoid React duplicate instance conflicts');
      }
    });
  } else {
    const registerSW = () => {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => {
          console.log('ServiceWorker registered:', reg.scope);
          reg.update().catch(err => console.warn('SW update check failed:', err));

          // Proactively cache all currently loaded scripts, styles, and html for guaranteed offline startup
          if ('caches' in window) {
            caches.open('smart-trader-v23').then((cache) => {
              // Cache current navigation URL
              const currentUrl = window.location.href;
              fetch(currentUrl, { cache: 'no-cache' }).then((res) => {
                if (res.ok) cache.put(currentUrl, res);
              }).catch(() => {});

              // Cache script and css elements
              const scripts = Array.from(document.querySelectorAll('script[src]')).map(s => (s as HTMLScriptElement).src);
              const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(l => (l as HTMLLinkElement).href);
              [...scripts, ...links].forEach((url) => {
                if (url && (url.startsWith(window.location.origin) || url.startsWith('/'))) {
                  fetch(url).then((res) => {
                    if (res.ok) cache.put(url, res);
                  }).catch(() => {});
                }
              });
            }).catch(() => {});
          }
        })
        .catch(err => console.log('ServiceWorker registration failed:', err));
    };

    if (document.readyState === 'complete') {
      registerSW();
    } else {
      window.addEventListener('load', registerSW);
    }

    // Automatically reload when a new service worker replaces the old one
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!navigator.serviceWorker.controller) return; // Only reload if there was an active controller before (genuine update)
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

