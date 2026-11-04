import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { toast } from 'sonner@2.0.3';
import { useAuth } from '../hooks/useAuth';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export interface StoreProduct {
  id: string;
  name: string;
  description: string;
  price: {
    usd: number;
    aed: number;
  };
  category: string;
  image?: string;
  images?: string[];
  inStock: boolean;
  stock: number;
  featured: boolean;
  sizes?: string[];
  colors?: string[];
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  status: 'active' | 'inactive' | 'out_of_stock';
  // Digital products: link out to Gumroad / Stan / Payhip etc. instead of cart checkout
  externalUrl?: string;
  metadata?: {
    weight?: number;
    dimensions?: string;
    material?: string;
    care_instructions?: string;
  };
}

export interface StoreSettings {
  currency: 'USD' | 'AED';
  freeShippingThreshold: {
    usd: number;
    aed: number;
  };
  taxRate: number;
}

export type SortOption = 
  | 'price-low-high' 
  | 'price-high-low' 
  | 'name-az' 
  | 'name-za' 
  | 'newest';

interface StoreContextType {
  // Products
  products: StoreProduct[];
  featuredProducts: StoreProduct[];
  categories: string[];
  isLoading: boolean;
  error: string | null;

  // Product management
  getProduct: (id: string) => StoreProduct | undefined;
  getProductsByCategory: (category: string) => StoreProduct[];
  searchProducts: (query: string) => StoreProduct[];
  
  // Sorting
  sortProducts: (products: StoreProduct[], sortBy: SortOption, currency: 'USD' | 'AED') => StoreProduct[];

  // Pricing
  formatPrice: (price: { usd: number; aed: number }) => string;

  // Store settings
  settings: StoreSettings;
  updateSettings: (settings: Partial<StoreSettings>) => Promise<void>;

  // Admin functions
  createProduct: (product: Omit<StoreProduct, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<StoreProduct>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  updateStock: (id: string, stock: number) => Promise<void>;

  // Utility
  refreshProducts: () => Promise<void>;
  clearError: () => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, session } = useAuth();

  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Store settings without VIP discount configuration
  const [settings, setSettings] = useState<StoreSettings>({
    currency: 'USD',
    freeShippingThreshold: {
      usd: 50,
      aed: 180
    },
    taxRate: 0.08
  });

  // Load products on mount
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get access token from session (required for admin endpoints)
      const accessToken = session?.access_token || publicAnonKey;

      console.log('[Store Context] 📦 Fetching products from backend...');

      // Fetch products from backend GET /products endpoint
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/products`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error('[Store Context] Failed to fetch products:', result);
        throw new Error(result.error || 'Failed to fetch products');
      }

      console.log('[Store Context] ✅ Products loaded successfully:', result.data.length, 'products');
      
      // Set products from backend response (data is the array directly)
      setProducts(result.data || []);

    } catch (err) {
      setError('Failed to load products');
      console.error('[Store Context] Error loading products:', err);
      // Set empty array on error so app doesn't break
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Format price with currency
  const formatPrice = useCallback((price: { usd: number; aed: number }) => {
    try {
      const amount = settings.currency === 'USD' ? price.usd : price.aed;
      const symbol = settings.currency === 'USD' ? '$' : 'AED ';
      
      if (typeof amount !== 'number' || isNaN(amount)) {
        return 'Price unavailable';
      }
      
      return `${symbol}${amount.toFixed(2)}`;
    } catch (error) {
      console.error('Error formatting price:', error);
      return 'Price unavailable';
    }
  }, [settings.currency]);

  // Product getters
  const getProduct = useCallback((id: string) => {
    return products.find(product => product.id === id);
  }, [products]);

  const getProductsByCategory = useCallback((category: string) => {
    return products.filter(product => 
      product.category === category && product.status === 'active'
    );
  }, [products]);

  const searchProducts = useCallback((query: string) => {
    const lowercaseQuery = query.toLowerCase();
    return products.filter(product =>
      product.status === 'active' && (
        product.name.toLowerCase().includes(lowercaseQuery) ||
        product.description.toLowerCase().includes(lowercaseQuery) ||
        product.tags?.some(tag => tag.toLowerCase().includes(lowercaseQuery))
      )
    );
  }, [products]);

  // Computed properties
  const featuredProducts = products.filter(product => 
    product.featured && product.status === 'active'
  );

  const categories = [...new Set(products.map(product => product.category))];

  // Admin functions (in a real app, these would make API calls)
  const createProduct = async (productData: Omit<StoreProduct, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => {
    try {
      // Get access token from session
      const accessToken = session?.access_token;
      
      console.log('[Store Context] 🔐 Attempting to create product...');
      console.log('[Store Context] 🔑 Access token present:', !!accessToken);
      console.log('[Store Context] 👤 User:', user?.email);
      console.log('[Store Context] 📝 User metadata:', user?.user_metadata);
      
      if (!accessToken) {
        console.error('[Store Context] ❌ No access token found in session');
        throw new Error('Authentication required to create products');
      }

      console.log('[Store Context] 📝 Creating product via backend...');

      // Call POST /products endpoint
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/products`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(productData)
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error('[Store Context] ❌ Failed to create product:', result);
        console.error('[Store Context] ❌ Response status:', response.status);
        console.error('[Store Context] ❌ Error message:', result.error);
        throw new Error(result.error || 'Failed to create product');
      }

      console.log('[Store Context] ✅ Product created successfully:', result.data);

      // Add new product to local state
      setProducts(prev => [...prev, result.data]);
      
      toast.success('Product created successfully');
    } catch (error) {
      console.error('[Store Context] ❌ Error creating product:', error);
      setError('Failed to create product');
      toast.error('Failed to create product');
      throw error;
    }
  };

  const updateProduct = async (id: string, updates: Partial<StoreProduct>) => {
    try {
      // Get access token from session
      const accessToken = session?.access_token;
      
      if (!accessToken) {
        throw new Error('Authentication required to update products');
      }

      console.log('[Store Context] ✏️ Updating product via backend...');

      // Call PUT /products/:id endpoint
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/products/${id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updates)
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error('[Store Context] Failed to update product:', result);
        throw new Error(result.error || 'Failed to update product');
      }

      console.log('[Store Context] ✅ Product updated successfully:', result.data);

      // Update local state with updated product
      setProducts(prev => prev.map(product =>
        product.id === id ? result.data : product
      ));
      
      toast.success('Product updated successfully');
    } catch (error) {
      console.error('[Store Context] Error updating product:', error);
      setError('Failed to update product');
      toast.error('Failed to update product');
      throw error;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      // Get access token from session
      const accessToken = session?.access_token;
      
      if (!accessToken) {
        throw new Error('Authentication required to delete products');
      }

      // Call DELETE endpoint
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/products/${id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error('[Store Context] Failed to delete product:', result);
        throw new Error(result.error || 'Failed to delete product');
      }

      console.log('[Store Context] ✅ Product deleted successfully:', result);

      // Remove from local state
      setProducts(prev => prev.filter(product => product.id !== id));
      
      toast.success('Product deleted successfully');
    } catch (error) {
      console.error('[Store Context] Error deleting product:', error);
      setError('Failed to delete product');
      toast.error('Failed to delete product');
      throw error;
    }
  };

  const updateStock = async (id: string, stock: number) => {
    try {
      // Get access token from session
      const accessToken = session?.access_token;
      
      if (!accessToken) {
        throw new Error('Authentication required to update stock');
      }

      console.log('[Store Context] 📦 Updating stock via backend...');

      // Call PATCH /products/:id/stock endpoint
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/products/${id}/stock`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            operation: 'set',
            amount: stock
          })
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error('[Store Context] Failed to update stock:', result);
        throw new Error(result.error || 'Failed to update stock');
      }

      console.log('[Store Context] ✅ Stock updated successfully:', result.data);

      // Update local state with updated product from backend
      setProducts(prev => prev.map(product =>
        product.id === id ? result.data : product
      ));
      
      toast.success('Stock updated successfully');
    } catch (error) {
      console.error('[Store Context] Error updating stock:', error);
      setError('Failed to update stock');
      toast.error('Failed to update stock');
      throw error;
    }
  };

  const updateSettings = async (newSettings: Partial<StoreSettings>) => {
    try {
      setSettings(prev => ({ ...prev, ...newSettings }));
      toast.success('Store settings updated');
    } catch (error) {
      setError('Failed to update settings');
      throw error;
    }
  };

  const refreshProducts = async () => {
    await loadProducts();
  };

  const clearError = () => {
    setError(null);
  };

  const sortProducts = useCallback((products: StoreProduct[], sortBy: SortOption, currency: 'USD' | 'AED') => {
    switch (sortBy) {
      case 'price-low-high':
        return [...products].sort((a, b) => a.price[currency] - b.price[currency]);
      case 'price-high-low':
        return [...products].sort((a, b) => b.price[currency] - a.price[currency]);
      case 'name-az':
        return [...products].sort((a, b) => a.name.localeCompare(b.name));
      case 'name-za':
        return [...products].sort((a, b) => b.name.localeCompare(a.name));
      case 'newest':
        return [...products].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      default:
        return products;
    }
  }, []);

  const value: StoreContextType = {
    products,
    featuredProducts,
    categories,
    isLoading,
    error,
    getProduct,
    getProductsByCategory,
    searchProducts,
    sortProducts,
    formatPrice,
    settings,
    updateSettings,
    createProduct,
    updateProduct,
    deleteProduct,
    updateStock,
    refreshProducts,
    clearError
  };

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
};