/**
 * Recently Viewed Products Utility
 * Manages localStorage for tracking recently viewed products
 */

const STORAGE_KEY = 'oriri_recently_viewed_products';
const MAX_ITEMS = 10;

export interface RecentlyViewedProduct {
  id: string;
  name: string;
  price: {
    usd: number;
    aed: number;
  };
  image?: string;
  category: string;
  viewedAt: string;
}

/**
 * Get recently viewed products from localStorage
 */
export const getRecentlyViewed = (): RecentlyViewedProduct[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const items: RecentlyViewedProduct[] = JSON.parse(stored);
    return items;
  } catch (error) {
    console.error('[RecentlyViewed] Error loading:', error);
    return [];
  }
};

/**
 * Add a product to recently viewed
 */
export const addToRecentlyViewed = (product: RecentlyViewedProduct): void => {
  try {
    let items = getRecentlyViewed();
    
    // Remove if already exists (to update timestamp)
    items = items.filter(item => item.id !== product.id);
    
    // Add to beginning
    items.unshift({
      ...product,
      viewedAt: new Date().toISOString()
    });
    
    // Keep only MAX_ITEMS
    items = items.slice(0, MAX_ITEMS);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    console.log('[RecentlyViewed] Added:', product.name);
  } catch (error) {
    console.error('[RecentlyViewed] Error saving:', error);
  }
};

/**
 * Clear all recently viewed products
 */
export const clearRecentlyViewed = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('[RecentlyViewed] Cleared all');
  } catch (error) {
    console.error('[RecentlyViewed] Error clearing:', error);
  }
};

/**
 * Remove a specific product from recently viewed
 */
export const removeFromRecentlyViewed = (productId: string): void => {
  try {
    let items = getRecentlyViewed();
    items = items.filter(item => item.id !== productId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    console.log('[RecentlyViewed] Removed:', productId);
  } catch (error) {
    console.error('[RecentlyViewed] Error removing:', error);
  }
};
