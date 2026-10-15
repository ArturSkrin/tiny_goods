import React, { createContext, useContext, useEffect, useState } from 'react';
import { Product } from '@workspace/api-client-react';

export interface CartItem {
  /** productId + chosen options; one cart line per distinct variant */
  key: string;
  productId: number;
  productName: string;
  /** Display price incl. option surcharges; the server recalculates on checkout */
  price: number;
  quantity: number;
  imageUrl?: string | null;
  size?: string;
  color?: string;
}

export interface CartOptions {
  size?: string;
  color?: string;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity: number, options?: CartOptions) => void;
  removeFromCart: (key: string) => void;
  updateQuantity: (key: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const lineKey = (productId: number, o: CartOptions = {}) => `${productId}|${o.size ?? ''}|${o.color ?? ''}`;

/** Base price plus the surcharges of the chosen size and colour. */
export function variantPrice(product: Product, o: CartOptions = {}) {
  const delta = (list: Product['sizes'], name?: string) => list.find((x) => x.name === name)?.priceDelta ?? 0;
  return Math.max(0, product.price + delta(product.sizes ?? [], o.size) + delta(product.colors ?? [], o.color));
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved: CartItem[] = JSON.parse(localStorage.getItem('tinygoods-cart') ?? '[]');
      // Carts saved before variants existed have no key.
      return saved.map((i) => ({ ...i, key: i.key ?? lineKey(i.productId, i) }));
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('tinygoods-cart', JSON.stringify(items));
  }, [items]);

  const addToCart = (product: Product, quantity: number, options: CartOptions = {}) => {
    const key = lineKey(product.id, options);
    setItems((current) => {
      if (current.some((item) => item.key === key)) {
        return current.map((item) => (item.key === key ? { ...item, quantity: item.quantity + quantity } : item));
      }
      return [
        ...current,
        {
          key,
          productId: product.id,
          productName: product.name,
          price: variantPrice(product, options),
          quantity,
          imageUrl: product.imageUrl,
          size: options.size,
          color: options.color,
        },
      ];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (key: string) => {
    setItems((current) => current.filter((item) => item.key !== key));
  };

  const updateQuantity = (key: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(key);
      return;
    }
    setItems((current) => current.map((item) => (item.key === key ? { ...item, quantity } : item)));
  };

  const clearCart = () => setItems([]);

  const cartTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = items.reduce((count, item) => count + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartTotal,
        cartCount,
        isCartOpen,
        setIsCartOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

export const variantLabel = (i: { size?: string; color?: string }) => [i.size, i.color].filter(Boolean).join(' · ');
