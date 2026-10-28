'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { productsApi } from '@/lib/api';

export interface CartItem {
  productId: string;
  sku: string;
  title: string;
  category: string;
  images: string[];
  unitPrice: number;
  monthlyRentalPrice?: number;
  isRental: boolean;
  rentalDurationMonths: number;
  quantity: number;
  itemSubtotal: number;
  inStock: boolean;
  stockAvailable: number;
  setupRequired: boolean;
  isDemo: boolean;
  installationSelected?: boolean;
  installationCharge?: number;
}

export interface CartPricing {
  subtotal: number;
  deliveryFee: number;
  taxGst: number;
  totalAmount: number;
  discountTotal?: number;
  installationCharge?: number;
}

interface CartContextType {
  items: CartItem[];
  pricing: CartPricing;
  warnings: string[];
  totalItemCount: number;
  isCartOpen: boolean;
  isLoading: boolean;
  hasUnavailableItems: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addItem: (
    product: any,
    quantity?: number,
    isRental?: boolean,
    rentalDurationMonths?: number,
    installationSelected?: boolean
  ) => Promise<void>;
  removeItem: (productId: string, isRental?: boolean) => Promise<void>;
  updateQuantity: (
    productId: string,
    quantity: number,
    isRental?: boolean
  ) => Promise<void>;
  clearCart: () => Promise<void>;
  revalidateCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'vivoquest_cart_items_v2';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [pricing, setPricing] = useState<CartPricing>({
    subtotal: 0,
    deliveryFee: 0,
    taxGst: 0,
    totalAmount: 0,
  });
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnavailableItems, setHasUnavailableItems] = useState(false);

  // Total quantity of items
  const totalItemCount = items.reduce((sum, item) => sum + (item.inStock ? item.quantity : 0), 0);

  // Sync state to local storage and optionally backend
  const syncCart = useCallback(async (cartItems: any[]) => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cartItems));

      const token = localStorage.getItem('vivo_token');
      if (token) {
        // Sync with backend persistent shopping cart
        const simpleItems = cartItems.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          isRental: i.isRental,
          rentalDurationMonths: i.rentalDurationMonths || 1,
          installationSelected: Boolean(i.installationSelected),
        }));
        await productsApi.saveCart(simpleItems).catch(() => null);
      }
    } catch {
      // LocalStorage or sync error fallback
    }
  }, []);

  // Server-side revalidation of current items
  const revalidateItems = useCallback(async (rawItems: any[]) => {
    if (!rawItems || rawItems.length === 0) {
      setItems([]);
      setPricing({ subtotal: 0, deliveryFee: 0, taxGst: 0, totalAmount: 0 });
      setWarnings([]);
      setHasUnavailableItems(false);
      return;
    }

    try {
      setIsLoading(true);
      const res = await productsApi.validateCart(
        rawItems.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          isRental: i.isRental,
          rentalDurationMonths: i.rentalDurationMonths,
          installationSelected: Boolean(i.installationSelected),
        }))
      );

      if (res) {
        setItems(res.items || []);
        setPricing(res.pricing || { subtotal: 0, deliveryFee: 0, taxGst: 0, totalAmount: 0 });
        setWarnings(res.warnings || []);
        setHasUnavailableItems(Boolean(res.hasUnavailableItems));
        await syncCart(res.items || []);
      }
    } catch {
      // In offline / network failure, keep existing items
    } finally {
      setIsLoading(false);
    }
  }, [syncCart]);

  // Initial cart load: from backend if signed in, otherwise localStorage
  useEffect(() => {
    const initializeCart = async () => {
      if (typeof window === 'undefined') return;

      const token = localStorage.getItem('vivo_token');
      if (token) {
        try {
          setIsLoading(true);
          const backendCart = await productsApi.getCart();
          if (backendCart && backendCart.items && backendCart.items.length > 0) {
            setItems(backendCart.items);
            setPricing(backendCart.pricing);
            setWarnings(backendCart.warnings || []);
            setHasUnavailableItems(Boolean(backendCart.hasUnavailableItems));
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(backendCart.items));
            setIsLoading(false);
            return;
          }
        } catch {
          // Fallback to local storage
        } finally {
          setIsLoading(false);
        }
      }

      // Guest / offline fallback
      try {
        const local = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length > 0) {
            await revalidateItems(parsed);
          }
        }
      } catch {
        // Corrupt storage recovery
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    };

    initializeCart();
  }, [revalidateItems]);

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);
  const toggleCart = () => setIsCartOpen((prev) => !prev);

  const addItem = async (
    product: any,
    quantity = 1,
    isRental = false,
    rentalDurationMonths = 1,
    installationSelected = false
  ) => {
    const productId = product.id || product._id || product.productId;
    const existingIndex = items.findIndex(
      (item) => item.productId === productId && item.isRental === isRental && Boolean(item.installationSelected) === Boolean(installationSelected)
    );

    let updatedRaw: any[] = [];

    if (existingIndex > -1) {
      updatedRaw = items.map((item, idx) => {
        if (idx === existingIndex) {
          const newQty = item.quantity + quantity;
          return {
            productId: item.productId,
            quantity: item.stockAvailable ? Math.min(newQty, item.stockAvailable) : newQty,
            isRental: item.isRental,
            rentalDurationMonths: item.rentalDurationMonths,
            installationSelected: Boolean(item.installationSelected),
          };
        }
        return {
          productId: item.productId,
          quantity: item.quantity,
          isRental: item.isRental,
          rentalDurationMonths: item.rentalDurationMonths,
          installationSelected: Boolean(item.installationSelected),
        };
      });
    } else {
      updatedRaw = [
        ...items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          isRental: i.isRental,
          rentalDurationMonths: i.rentalDurationMonths,
          installationSelected: Boolean(i.installationSelected),
        })),
        {
          productId,
          quantity,
          isRental,
          rentalDurationMonths: isRental ? rentalDurationMonths : 1,
          installationSelected: Boolean(installationSelected),
        },
      ];
    }

    await revalidateItems(updatedRaw);
    openCart();
  };

  const removeItem = async (productId: string, isRental = false) => {
    const updatedRaw = items
      .filter((item) => !(item.productId === productId && item.isRental === isRental))
      .map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        isRental: i.isRental,
        rentalDurationMonths: i.rentalDurationMonths,
        installationSelected: Boolean(i.installationSelected),
      }));

    await revalidateItems(updatedRaw);
  };

  const updateQuantity = async (
    productId: string,
    quantity: number,
    isRental = false
  ) => {
    if (quantity <= 0) {
      await removeItem(productId, isRental);
      return;
    }

    const updatedRaw = items.map((item) => {
      if (item.productId === productId && item.isRental === isRental) {
        return {
          productId: item.productId,
          quantity,
          isRental: item.isRental,
          rentalDurationMonths: item.rentalDurationMonths,
          installationSelected: Boolean(item.installationSelected),
        };
      }
      return {
        productId: item.productId,
        quantity: item.quantity,
        isRental: item.isRental,
        rentalDurationMonths: item.rentalDurationMonths,
        installationSelected: Boolean(item.installationSelected),
      };
    });

    await revalidateItems(updatedRaw);
  };

  const clearCart = async () => {
    setItems([]);
    setPricing({ subtotal: 0, deliveryFee: 0, taxGst: 0, totalAmount: 0 });
    setWarnings([]);
    setHasUnavailableItems(false);

    if (typeof window !== 'undefined') {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      const token = localStorage.getItem('vivo_token');
      if (token) {
        await productsApi.clearCart().catch(() => null);
      }
    }
  };

  const revalidateCart = async () => {
    const raw = items.map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
      isRental: i.isRental,
      rentalDurationMonths: i.rentalDurationMonths,
    }));
    await revalidateItems(raw);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        pricing,
        warnings,
        totalItemCount,
        isCartOpen,
        isLoading,
        hasUnavailableItems,
        openCart,
        closeCart,
        toggleCart,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        revalidateCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
