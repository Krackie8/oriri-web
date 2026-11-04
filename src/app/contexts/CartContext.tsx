import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { toast } from 'sonner@2.0.3';

export interface StoreItem {
  id: number;
  name: string;
  price: {
    usd: number;
    aed: number;
  };
  image: string;
  category: string;
  inStock: boolean;
  featured?: boolean;
  description: string;
  sizes?: string[];
  colors?: string[];
}

export interface CartItem extends StoreItem {
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
}

export type Currency = 'USD' | 'AED';

interface CartError {
  type: 'STORAGE_ERROR' | 'VALIDATION_ERROR' | 'NETWORK_ERROR';
  message: string;
  action?: string;
}

interface CartContextType {
  cart: CartItem[];
  currency: Currency;
  cartItemCount: number;
  cartTotal: number;
  isLoading: boolean;
  error: CartError | null;
  addToCart: (item: StoreItem, options?: { size?: string; color?: string }) => Promise<boolean>;
  updateCart: (itemId: number, quantity: number, size?: string, color?: string) => Promise<boolean>;
  removeFromCart: (itemId: number, size?: string, color?: string) => Promise<boolean>;
  clearCart: () => Promise<boolean>;
  setCurrency: (currency: Currency) => void;
  formatPrice: (price: { usd: number; aed: number }) => string;
  getCartItemKey: (item: CartItem, index: number) => string;
  retryLastAction: () => Promise<void>;
  clearError: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [currency, setCurrency] = useState<Currency>('USD');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<CartError | null>(null);
  const [lastAction, setLastAction] = useState<{ type: string; payload: any } | null>(null);

  // Validation helpers
  const validateCartItem = (item: StoreItem): boolean => {
    if (!item || typeof item.id !== 'number' || !item.name || !item.price) {
      setError({
        type: 'VALIDATION_ERROR',
        message: 'Invalid item data',
        action: 'Please try again with valid item information'
      });
      return false;
    }
    
    if (!item.inStock) {
      setError({
        type: 'VALIDATION_ERROR',
        message: `${item.name} is currently out of stock`,
        action: 'Please select a different item'
      });
      return false;
    }

    return true;
  };

  const validateQuantity = (quantity: number): boolean => {
    if (quantity < 0 || quantity > 99) {
      setError({
        type: 'VALIDATION_ERROR',
        message: 'Invalid quantity',
        action: 'Quantity must be between 1 and 99'
      });
      return false;
    }
    return true;
  };

  // Safe localStorage operations with error handling
  const safeStorageSet = useCallback((key: string, value: string): boolean => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error(`Error saving to localStorage (${key}):`, error);
      setError({
        type: 'STORAGE_ERROR',
        message: 'Failed to save cart data',
        action: 'Your changes may not be preserved. Please try again.'
      });
      return false;
    }
  }, []);

  const safeStorageGet = useCallback((key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error(`Error reading from localStorage (${key}):`, error);
      setError({
        type: 'STORAGE_ERROR',
        message: 'Failed to load cart data',
        action: 'Please refresh the page to try again.'
      });
      return null;
    }
  }, []);

  const safeStorageRemove = useCallback((key: string): boolean => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing from localStorage (${key}):`, error);
      return false;
    }
  }, []);

  // Enhanced cart persistence with backup and recovery
  const saveCartToStorage = useCallback((cartData: CartItem[]): boolean => {
    const cartJson = JSON.stringify(cartData);
    const timestamp = Date.now();
    
    // Save main cart data
    const mainSaved = safeStorageSet('oriri-cart', cartJson);
    
    // Save backup with timestamp
    const backupSaved = safeStorageSet('oriri-cart-backup', JSON.stringify({
      cart: cartData,
      timestamp,
      version: '1.0'
    }));

    // Save cart metadata
    safeStorageSet('oriri-cart-meta', JSON.stringify({
      lastUpdated: timestamp,
      itemCount: cartData.length,
      totalItems: cartData.reduce((sum, item) => sum + item.quantity, 0)
    }));

    return mainSaved && backupSaved;
  }, [safeStorageSet]);

  const loadCartFromStorage = useCallback((): CartItem[] => {
    let cart: CartItem[] = [];
    
    // Try to load main cart
    const savedCart = safeStorageGet('oriri-cart');
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        if (Array.isArray(parsedCart)) {
          cart = parsedCart.filter(item => item && typeof item.id === 'number');
        }
      } catch (error) {
        console.error('Error parsing main cart data:', error);
        
        // Try to load from backup
        const backupData = safeStorageGet('oriri-cart-backup');
        if (backupData) {
          try {
            const backup = JSON.parse(backupData);
            if (backup.cart && Array.isArray(backup.cart)) {
              cart = backup.cart.filter(item => item && typeof item.id === 'number');
              toast.info('Cart restored from backup');
            }
          } catch (backupError) {
            console.error('Error loading cart backup:', backupError);
            setError({
              type: 'STORAGE_ERROR',
              message: 'Cart data corrupted',
              action: 'Your cart has been reset. Please add items again.'
            });
          }
        }
      }
    }

    return cart;
  }, [safeStorageGet]);

  // Load cart and currency from localStorage on mount
  useEffect(() => {
    setIsLoading(true);
    
    try {
      // Load cart data
      const loadedCart = loadCartFromStorage();
      setCart(loadedCart);

      // Load currency
      const savedCurrency = safeStorageGet('oriri-currency') as Currency;
      if (savedCurrency && (savedCurrency === 'USD' || savedCurrency === 'AED')) {
        setCurrency(savedCurrency);
      }

      // Mark as initialized
      safeStorageSet('oriri-cart-initialized', 'true');
      
    } catch (error) {
      console.error('Error initializing cart:', error);
      setError({
        type: 'STORAGE_ERROR',
        message: 'Failed to initialize cart',
        action: 'Please refresh the page to try again.'
      });
    } finally {
      setIsLoading(false);
    }
  }, [loadCartFromStorage, safeStorageGet, safeStorageSet]);

  // Save cart to localStorage when cart changes
  useEffect(() => {
    if (!isLoading) {
      if (cart.length > 0) {
        saveCartToStorage(cart);
      } else {
        const hasInitialized = safeStorageGet('oriri-cart-initialized');
        if (hasInitialized) {
          safeStorageRemove('oriri-cart');
          safeStorageRemove('oriri-cart-backup');
          safeStorageRemove('oriri-cart-meta');
        }
      }
    }
  }, [cart, isLoading, saveCartToStorage, safeStorageGet, safeStorageRemove]);

  // Save currency to localStorage when currency changes
  useEffect(() => {
    if (!isLoading) {
      safeStorageSet('oriri-currency', currency);
    }
  }, [currency, isLoading, safeStorageSet]);

  const addToCart = useCallback(async (item: StoreItem, options?: { size?: string; color?: string }): Promise<boolean> => {
    try {
      setError(null);
      
      if (!validateCartItem(item)) {
        return false;
      }

      // Check if size is required for this item
      if (item.sizes && item.sizes.length > 0 && !options?.size) {
        setError({
          type: 'VALIDATION_ERROR',
          message: 'Please select a size',
          action: 'Choose a size before adding to cart'
        });
        return false;
      }

      // Check if color is required for this item
      if (item.colors && item.colors.length > 0 && !options?.color) {
        setError({
          type: 'VALIDATION_ERROR',
          message: 'Please select a color',
          action: 'Choose a color before adding to cart'
        });
        return false;
      }

      setLastAction({ type: 'ADD_TO_CART', payload: { item, options } });

      const existingItem = cart.find(cartItem => 
        cartItem.id === item.id && 
        cartItem.selectedSize === options?.size && 
        cartItem.selectedColor === options?.color
      );

      if (existingItem) {
        // Check quantity limit
        if (existingItem.quantity >= 99) {
          setError({
            type: 'VALIDATION_ERROR',
            message: 'Maximum quantity reached',
            action: 'Cannot add more than 99 of the same item'
          });
          return false;
        }

        setCart(cart.map(cartItem => 
          cartItem.id === item.id && 
          cartItem.selectedSize === options?.size && 
          cartItem.selectedColor === options?.color
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        ));
      } else {
        setCart([...cart, { 
          ...item, 
          quantity: 1, 
          selectedSize: options?.size,
          selectedColor: options?.color
        }]);
      }

      toast.success(`${item.name} added to cart!`);
      return true;
      
    } catch (error) {
      console.error('Error adding item to cart:', error);
      setError({
        type: 'VALIDATION_ERROR',
        message: 'Failed to add item to cart',
        action: 'Please try again'
      });
      return false;
    }
  }, [cart, validateCartItem]);

  const updateCart = useCallback(async (itemId: number, quantity: number, size?: string, color?: string): Promise<boolean> => {
    try {
      setError(null);
      
      if (!validateQuantity(quantity)) {
        return false;
      }

      setLastAction({ type: 'UPDATE_CART', payload: { itemId, quantity, size, color } });

      if (quantity === 0) {
        setCart(cart.filter(item => !(
          item.id === itemId && 
          item.selectedSize === size && 
          item.selectedColor === color
        )));
        toast.success('Item removed from cart');
      } else {
        const itemExists = cart.some(item => 
          item.id === itemId && 
          item.selectedSize === size && 
          item.selectedColor === color
        );

        if (!itemExists) {
          setError({
            type: 'VALIDATION_ERROR',
            message: 'Item not found in cart',
            action: 'Please refresh and try again'
          });
          return false;
        }

        setCart(cart.map(item => 
          item.id === itemId && 
          item.selectedSize === size && 
          item.selectedColor === color
            ? { ...item, quantity } 
            : item
        ));
        
        toast.success('Cart updated');
      }

      return true;
      
    } catch (error) {
      console.error('Error updating cart:', error);
      setError({
        type: 'VALIDATION_ERROR',
        message: 'Failed to update cart',
        action: 'Please try again'
      });
      return false;
    }
  }, [cart, validateQuantity]);

  const removeFromCart = useCallback(async (itemId: number, size?: string, color?: string): Promise<boolean> => {
    try {
      setError(null);
      setLastAction({ type: 'REMOVE_FROM_CART', payload: { itemId, size, color } });

      const itemExists = cart.some(item => 
        item.id === itemId && 
        item.selectedSize === size && 
        item.selectedColor === color
      );

      if (!itemExists) {
        setError({
          type: 'VALIDATION_ERROR',
          message: 'Item not found in cart',
          action: 'Item may have already been removed'
        });
        return false;
      }

      setCart(cart.filter(item => !(
        item.id === itemId && 
        item.selectedSize === size && 
        item.selectedColor === color
      )));
      
      toast.success('Item removed from cart');
      return true;
      
    } catch (error) {
      console.error('Error removing item from cart:', error);
      setError({
        type: 'VALIDATION_ERROR',
        message: 'Failed to remove item',
        action: 'Please try again'
      });
      return false;
    }
  }, [cart]);

  const clearCart = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      setLastAction({ type: 'CLEAR_CART', payload: {} });
      
      setCart([]);
      toast.success('Cart cleared');
      return true;
      
    } catch (error) {
      console.error('Error clearing cart:', error);
      setError({
        type: 'VALIDATION_ERROR',
        message: 'Failed to clear cart',
        action: 'Please try again'
      });
      return false;
    }
  }, []);

  const retryLastAction = useCallback(async (): Promise<void> => {
    if (!lastAction) {
      toast.error('No action to retry');
      return;
    }

    try {
      setError(null);
      toast.info('Retrying last action...');

      switch (lastAction.type) {
        case 'ADD_TO_CART':
          await addToCart(lastAction.payload.item, lastAction.payload.options);
          break;
        case 'UPDATE_CART':
          await updateCart(
            lastAction.payload.itemId,
            lastAction.payload.quantity,
            lastAction.payload.size,
            lastAction.payload.color
          );
          break;
        case 'REMOVE_FROM_CART':
          await removeFromCart(
            lastAction.payload.itemId,
            lastAction.payload.size,
            lastAction.payload.color
          );
          break;
        case 'CLEAR_CART':
          await clearCart();
          break;
        default:
          toast.error('Unknown action to retry');
      }
    } catch (error) {
      console.error('Error retrying action:', error);
      toast.error('Failed to retry action');
    }
  }, [lastAction, addToCart, updateCart, removeFromCart, clearCart]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const formatPrice = useCallback((price: { usd: number; aed: number }) => {
    try {
      const amount = currency === 'USD' ? price.usd : price.aed;
      const symbol = currency === 'USD' ? '$' : 'AED ';
      
      if (typeof amount !== 'number' || isNaN(amount)) {
        return 'Price unavailable';
      }
      
      return `${symbol}${amount.toFixed(2)}`;
    } catch (error) {
      console.error('Error formatting price:', error);
      return 'Price unavailable';
    }
  }, [currency]);

  const getCartItemKey = useCallback((item: CartItem, index: number) => 
    `${item.id}-${item.selectedSize || 'no-size'}-${item.selectedColor || 'no-color'}-${index}`,
  []);

  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = cart.reduce((total, item) => {
    try {
      const price = item.price[currency.toLowerCase() as keyof typeof item.price];
      return total + (price * item.quantity);
    } catch (error) {
      console.error('Error calculating cart total:', error);
      return total;
    }
  }, 0);

  const value: CartContextType = {
    cart,
    currency,
    cartItemCount,
    cartTotal,
    isLoading,
    error,
    addToCart,
    updateCart,
    removeFromCart,
    clearCart,
    setCurrency,
    formatPrice,
    getCartItemKey,
    retryLastAction,
    clearError,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};