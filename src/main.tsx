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

// Register Service Worker for offline PWA support
if ('serviceWorker' in navigator) {
  const registerSW = () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        console.log('ServiceWorker registered:', reg.scope);
        reg.update().catch(err => console.warn('SW update check failed:', err));

        // Proactively clean up any older caches and cache latest files
        if ('caches' in window) {
          caches.keys().then((keys) => {
            keys.forEach((key) => {
              if (key !== 'smart-trader-v27') {
                caches.delete(key);
              }
            });
          }).catch(() => {});

          caches.open('smart-trader-v27').then((cache) => {
            // Cache root and current navigation URL
            cache.add('/').catch(() => {});
            cache.add('/index.html').catch(() => {});

            // Cache script and css elements
            const scripts = Array.from(document.querySelectorAll('script[src]')).map(s => (s as HTMLScriptElement).src);
            const links = Array.from(document.querySelectorAll('link[rel="stylesheet"], link[rel="icon"], link[rel="apple-touch-icon"]')).map(l => (l as HTMLLinkElement).href);
            [...scripts, ...links].forEach((url) => {
              if (url && (url.startsWith(window.location.origin) || url.startsWith('/'))) {
                cache.add(url).catch(() => {});
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

