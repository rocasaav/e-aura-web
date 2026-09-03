'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

export interface CartItem {
  cartItemId: string; // Identificador único por variante personalizada
  id: number;
  name: string;
  price: number;
  image?: string;
  quantity: number;
  colorName?: string;
  colorHex?: string;
  selectedAroma?: string;
}

// Tipo flexible para recibir datos en `addToCart`
export type AddToCartInput = Omit<CartItem, 'quantity' | 'cartItemId'> & {
  cartItemId?: string;
  image_url?: string;
};

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: AddToCartInput, quantity?: number) => void;
  removeFromCart: (cartItemIdOrId: string | number) => void;
  updateQuantity: (cartItemIdOrId: string | number, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const isLoaded = useRef(false);

  // 1. Cargar carrito desde localStorage al montar
  useEffect(() => {
    const savedCart = localStorage.getItem('e_aura_cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error('Error al cargar el carrito:', e);
      }
    }
    isLoaded.current = true;
  }, []);

  // 2. Guardar en localStorage solo después de la carga inicial
  useEffect(() => {
    if (isLoaded.current) {
      localStorage.setItem('e_aura_cart', JSON.stringify(cart));
    }
  }, [cart]);

  const addToCart = (product: AddToCartInput, quantity = 1) => {
    const rawImage = product.image || product.image_url;

    const imageUrl = rawImage && typeof rawImage === 'string' && rawImage.trim() !== ''? rawImage: '/placeholder.png';

    
    // Generar un cartItemId único combinando ID, color y aroma
    const color = product.colorName || 'estandar';
    const aroma = product.selectedAroma || 'sin-aroma';
    const generatedItemId = product.cartItemId || `${product.id}-${color}-${aroma}`.toLowerCase().replace(/\s+/g, '-');

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex(
        (item) => item.cartItemId === generatedItemId || (item.id === product.id && item.colorName === product.colorName && item.selectedAroma === product.selectedAroma)
      );
      
      if (existingIndex > -1) {
        const updated = [...prevCart];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
        };
        return updated;
      }

      return [
        ...prevCart,
        {
          cartItemId: generatedItemId,
          id: product.id,
          name: product.name,
          price: product.price,
          image: imageUrl,
          colorName: product.colorName,
          colorHex: product.colorHex,
          selectedAroma: product.selectedAroma,
          quantity,
        },
      ];
    });

    setIsCartOpen(true);
  };

  const removeFromCart = (cartItemIdOrId: string | number) => {
    setCart((prevCart) =>
      prevCart.filter((item) => item.cartItemId !== String(cartItemIdOrId) && item.id !== Number(cartItemIdOrId))
    );
  };

  const updateQuantity = (cartItemIdOrId: string | number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(cartItemIdOrId);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.cartItemId === String(cartItemIdOrId) || item.id === Number(cartItemIdOrId)
          ? { ...item, quantity }
          : item
      )
    );
  };

  const clearCart = () => setCart([]);

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const totalPrice = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
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
  if (!context) {
    throw new Error('useCart debe ser usado dentro de un CartProvider');
  }
  return context;
}