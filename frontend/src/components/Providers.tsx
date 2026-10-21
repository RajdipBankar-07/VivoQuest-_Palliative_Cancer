'use client';

import React from 'react';
import { CartProvider } from '@/context/CartContext';
import { CartDrawer } from './CartDrawer';

export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <CartProvider>
      {children}
      <CartDrawer />
    </CartProvider>
  );
};
