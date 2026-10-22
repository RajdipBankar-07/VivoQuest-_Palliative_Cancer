'use client';

import React, { useEffect } from 'react';
import { CartProvider } from '@/context/CartContext';
import { CartDrawer } from './CartDrawer';

export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    // Purge stale Service Worker caches from previous builds (e.g. vivoquest-app-v1)
    if (typeof window !== 'undefined' && 'caches' in window) {
      caches.keys().then((keys) => {
        keys.forEach((key) => {
          if (key === 'vivoquest-app-v1') {
            caches.delete(key);
            console.log('[VivoQuest] Purged stale cache:', key);
          }
        });
      }).catch(() => null);

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((reg) => {
            reg.update().catch(() => null);
          });
        }).catch(() => null);
      }
    }
  }, []);

  return (
    <CartProvider>
      {children}
      <CartDrawer />
    </CartProvider>
  );
};

