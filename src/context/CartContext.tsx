'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { CartResponse, CartItemDetail } from '@/services/cart.service';
import { getCartHeaders, setClientCartSessionId, dispatchCartUpdated } from '@/lib/cart-client';
import { toast } from 'sonner';

export interface CartContextType {
  cart: CartResponse | null;
  itemCount: number;
  subtotal: number;
  items: CartItemDetail[];
  loading: boolean;
  updatingItemId: string | null;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  refreshCart: () => Promise<void>;
  updateQuantity: (cartItemId: string, newQty: number) => Promise<boolean>;
  removeItem: (cartItemId: string) => Promise<boolean>;
  clearAll: () => Promise<boolean>;
  setCartDirectly: (cart: CartResponse | null) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const fetchCart = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/cart', { headers: getCartHeaders() });
      if (!res.ok) return;
      const json = await res.json();
      if (json.success && json.data) {
        if (json.data.sessionId) setClientCartSessionId(json.data.sessionId);
        setCart(json.data);
      }
    } catch {
      // Non-blocking background fetch failure
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCart();

    const handleOpenDrawer = (e: Event) => {
      const customEvt = e as CustomEvent<{ cart?: CartResponse }>;
      if (customEvt.detail?.cart) {
        if (customEvt.detail.cart.sessionId) {
          setClientCartSessionId(customEvt.detail.cart.sessionId);
        }
        setCart(customEvt.detail.cart);
      } else {
        fetchCart();
      }
      setIsDrawerOpen(true);
    };

    const handleCartUpdated = (e: Event) => {
      const customEvt = e as CustomEvent<{ cart?: CartResponse }>;
      if (customEvt.detail?.cart) {
        if (customEvt.detail.cart.sessionId) {
          setClientCartSessionId(customEvt.detail.cart.sessionId);
        }
        setCart(customEvt.detail.cart);
      } else {
        fetchCart();
      }
    };

    window.addEventListener('open-cart-drawer', handleOpenDrawer);
    window.addEventListener('cart-updated', handleCartUpdated);

    return () => {
      window.removeEventListener('open-cart-drawer', handleOpenDrawer);
      window.removeEventListener('cart-updated', handleCartUpdated);
    };
  }, [fetchCart]);

  const updateQuantity = async (cartItemId: string, newQty: number): Promise<boolean> => {
    try {
      setUpdatingItemId(cartItemId);
      const res = await fetch('/api/cart', {
        method: 'PATCH',
        headers: getCartHeaders(),
        body: JSON.stringify({ cartItemId, quantity: newQty }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update item quantity');
      }
      if (json.data) {
        setCart(json.data);
        dispatchCartUpdated(json.data, false);
      }
      return true;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error updating quantity');
      return false;
    } finally {
      setUpdatingItemId(null);
    }
  };

  const removeItem = async (cartItemId: string): Promise<boolean> => {
    try {
      setUpdatingItemId(cartItemId);
      const res = await fetch(`/api/cart?cartItemId=${cartItemId}`, {
        method: 'DELETE',
        headers: getCartHeaders(),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to remove item from cart');
      }
      if (json.data) {
        setCart(json.data);
        dispatchCartUpdated(json.data, false);
      }
      return true;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error removing item');
      return false;
    } finally {
      setUpdatingItemId(null);
    }
  };

  const clearAll = async (): Promise<boolean> => {
    try {
      setLoading(true);
      const res = await fetch('/api/cart?clear=true', {
        method: 'DELETE',
        headers: getCartHeaders(),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to clear cart');
      }
      if (json.data) {
        setCart(json.data);
        dispatchCartUpdated(json.data, false);
      }
      return true;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error clearing cart');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);
  const toggleDrawer = useCallback(() => setIsDrawerOpen((prev) => !prev), []);

  const value = useMemo(
    () => ({
      cart,
      itemCount: cart?.totalItemCount || 0,
      subtotal: cart?.subtotal || 0,
      items: cart?.items || [],
      loading,
      updatingItemId,
      isDrawerOpen,
      openDrawer,
      closeDrawer,
      toggleDrawer,
      refreshCart: fetchCart,
      updateQuantity,
      removeItem,
      clearAll,
      setCartDirectly: setCart,
    }),
    [cart, loading, updatingItemId, isDrawerOpen, openDrawer, closeDrawer, toggleDrawer, fetchCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextType {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
