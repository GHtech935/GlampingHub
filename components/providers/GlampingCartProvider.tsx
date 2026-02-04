"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// TypeScript Interfaces
export interface MenuProductSelection {
  quantity: number;
  price: number;
  name: string;
  voucher?: {
    code: string;
    id: string;
    discountAmount: number;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
  } | null;
}

export interface AddonSelection {
  addonItemId: string;
  selected: boolean;
  quantity: number;
  parameterQuantities: Record<string, number>;
  dates?: { from: string; to: string }; // for custom dates (range for pricing)
  selectedDate?: string; // single date selected by customer (YYYY-MM-DD)
  voucher?: {
    code: string;
    id: string;
    discountAmount: number;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
  } | null;
  totalPrice?: number;   // Computed total price for this addon (before voucher)
  addonName?: string;    // Display name of the addon
  parameterPricing?: Record<string, {  // Per-parameter pricing details
    unitPrice: number;       // Unit price (after price_percentage)
    pricingMode: string;     // 'per_person' | 'per_group'
    paramName: string;       // Parameter name for display
  }>;
}

export interface GlampingCartItem {
  id: string; // unique cart item ID (UUID)
  itemId: string; // glamping_items.id
  itemName: string;
  itemSku: string;
  zoneId: string;
  zoneName: { vi: string; en: string };
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  nights: number;
  adults: number;
  children: number;

  // Parameter quantities (e.g., bedrooms)
  parameterQuantities: Record<string, number>; // parameterId -> quantity

  // Parameter details for display
  parameters: Array<{
    id: string;
    name: string | { vi?: string; en?: string };
    color_code?: string;
    quantity: number;
    counted_for_menu?: boolean;
  }>;

  // Menu products selections with per-item vouchers
  // Supports both formats: flat (old) or per-night (new)
  menuProducts:
    | Record<string, MenuProductSelection>  // Old format: flat
    | Record<number, Record<string, MenuProductSelection>>; // New format: per-night

  // Menu products details for display (deprecated, use menuProducts instead)
  menuProductsDetails?: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;

  // Add-on selections (common items from step 5)
  addonSelections?: Record<string, AddonSelection>; // keyed by addonItemId

  // Pricing
  basePrice: number;
  totalPrice?: number; // calculated from API

  // Accommodation voucher
  accommodationVoucher?: {
    code: string;
    id: string;
    discountAmount: number;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
  } | null;

  // Pricing breakdown (computed)
  pricingBreakdown?: {
    accommodationCost: number;
    menuProductsCost: number;
    accommodationDiscount: number;
    menuDiscount: number;
    addonsCost: number;      // Total add-on cost (before voucher)
    addonsDiscount: number;  // Total add-on voucher discount
    subtotal: number;
  };

  // Media
  itemImageUrl?: string;

  // Metadata
  addedAt: number; // timestamp
}

export interface GlampingCart {
  version: string; // "1.0"
  zoneId: string; // all items must share same zone
  zoneName: { vi: string; en: string };
  items: GlampingCartItem[];
  lastUpdated: number; // timestamp
  expiresAt?: number; // optional expiration (e.g., 24 hours)
}

interface GlampingCartContextType {
  cart: GlampingCart | null;
  cartCount: number;
  isInitialized: boolean;
  addToCart: (item: GlampingCartItem) => { success: boolean; error?: string };
  removeFromCart: (cartItemId: string) => void;
  updateCartItem: (cartItemId: string, updates: Partial<GlampingCartItem>) => void;
  clearCart: () => void;
  isInCart: (itemId: string) => boolean;
  getCartItem: (cartItemId: string) => GlampingCartItem | undefined;
}

const GlampingCartContext = createContext<GlampingCartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'glamping_cart';
const CART_VERSION = '1.0';
const CART_EXPIRATION_HOURS = 24;

export function GlampingCartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<GlampingCart | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const storedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (storedCart) {
        const parsedCart: GlampingCart = JSON.parse(storedCart);

        // Check if cart has expired
        if (parsedCart.expiresAt && Date.now() > parsedCart.expiresAt) {
          localStorage.removeItem(CART_STORAGE_KEY);
          setCart(null);
        } else {
          setCart(parsedCart);
        }
      }
    } catch (error) {
      console.error('Error loading cart from localStorage:', error);
      localStorage.removeItem(CART_STORAGE_KEY);
    }
    setIsInitialized(true);
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (!isInitialized) return;

    if (cart) {
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
      } catch (error) {
        console.error('Error saving cart to localStorage:', error);
      }
    } else {
      localStorage.removeItem(CART_STORAGE_KEY);
    }
  }, [cart, isInitialized]);

  const addToCart = useCallback((item: GlampingCartItem): { success: boolean; error?: string } => {
    // Zone validation: Check if cart already has items from a different zone
    if (cart && cart.items.length > 0 && cart.zoneId !== item.zoneId) {
      return {
        success: false,
        error: `Bạn chỉ có thể chọn lều trong cùng một khu glamping. Vui lòng xóa giỏ hàng hoặc chọn lều từ ${cart.zoneName.vi}.`
      };
    }

    const now = Date.now();
    const expiresAt = now + (CART_EXPIRATION_HOURS * 60 * 60 * 1000);

    setCart((prevCart) => {
      if (!prevCart) {
        // Create new cart
        return {
          version: CART_VERSION,
          zoneId: item.zoneId,
          zoneName: item.zoneName,
          items: [item],
          lastUpdated: now,
          expiresAt
        };
      } else {
        // Add to existing cart
        return {
          ...prevCart,
          items: [...prevCart.items, item],
          lastUpdated: now,
          expiresAt
        };
      }
    });

    return { success: true };
  }, [cart]);

  const removeFromCart = useCallback((cartItemId: string) => {
    setCart((prevCart) => {
      if (!prevCart) return null;

      const updatedItems = prevCart.items.filter(item => item.id !== cartItemId);

      // If cart is empty after removal, clear it completely
      if (updatedItems.length === 0) {
        return null;
      }

      return {
        ...prevCart,
        items: updatedItems,
        lastUpdated: Date.now()
      };
    });
  }, []);

  const updateCartItem = useCallback((cartItemId: string, updates: Partial<GlampingCartItem>) => {
    setCart((prevCart) => {
      if (!prevCart) return null;

      const updatedItems = prevCart.items.map(item => {
        if (item.id === cartItemId) {
          return { ...item, ...updates };
        }
        return item;
      });

      return {
        ...prevCart,
        items: updatedItems,
        lastUpdated: Date.now()
      };
    });
  }, []);

  const clearCart = useCallback(() => {
    setCart(null);
  }, []);

  const isInCart = useCallback((itemId: string): boolean => {
    if (!cart) return false;
    return cart.items.some(item => item.itemId === itemId);
  }, [cart]);

  const getCartItem = useCallback((cartItemId: string): GlampingCartItem | undefined => {
    if (!cart) return undefined;
    return cart.items.find(item => item.id === cartItemId);
  }, [cart]);

  const cartCount = cart?.items.length || 0;

  const value: GlampingCartContextType = {
    cart,
    cartCount,
    isInitialized,
    addToCart,
    removeFromCart,
    updateCartItem,
    clearCart,
    isInCart,
    getCartItem
  };

  return (
    <GlampingCartContext.Provider value={value}>
      {children}
    </GlampingCartContext.Provider>
  );
}

export function useGlampingCart() {
  const context = useContext(GlampingCartContext);
  if (context === undefined) {
    throw new Error('useGlampingCart must be used within a GlampingCartProvider');
  }
  return context;
}

/**
 * Type guard to detect if menu products use per-night structure
 */
export function isPerNightMenuProducts(
  products: any
): products is Record<number, Record<string, MenuProductSelection>> {
  if (!products || typeof products !== 'object') return false;
  const firstKey = Object.keys(products)[0];
  if (!firstKey) return false;
  // Check if first key is a number (night index)
  return !isNaN(parseInt(firstKey)) && typeof products[firstKey] === 'object';
}
