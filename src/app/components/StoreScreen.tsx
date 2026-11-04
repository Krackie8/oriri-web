import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Alert, AlertDescription } from './ui/alert';
import { 
  ShoppingCartIcon, 
  AlertCircle,
  RefreshCw,
  Search,
  X,
  ArrowUpDown,
  History,
  Sparkles
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useCart } from '../contexts/CartContext';
import { useModals } from '../contexts/ModalContext';
import { useStore, SortOption } from '../contexts/StoreContext';
import { toast } from 'sonner@2.0.3';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { getRecentlyViewed, type RecentlyViewedProduct } from '../utils/recentlyViewed';

export default function StoreScreen() {
  const navigate = useNavigate();
  
  const { 
    addToCart,
    cartItemCount,
    error: cartError,
    clearError: clearCartError,
    retryLastAction
  } = useCart();
  const { showCart, setShowCart } = useModals();
  
  // Store context
  const {
    products,
    featuredProducts,
    categories,
    isLoading: storeLoading,
    error: storeError,
    getProductsByCategory,
    searchProducts,
    sortProducts,
    formatPrice,
    settings,
    clearError: clearStoreError
  } = useStore();
  
  // State
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  
  // UI state
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [processingAdd, setProcessingAdd] = useState<string | null>(null);

  // Get filtered and sorted products
  const filteredAndSortedProducts = useMemo(() => {
    let result = products.filter(p => p.status === 'active');
    
    // Apply category filter
    if (selectedCategory !== 'all') {
      result = getProductsByCategory(selectedCategory);
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const searchResults = searchProducts(searchQuery);
      result = result.filter(p => searchResults.some(sr => sr.id === p.id));
    }
    
    // Apply sorting
    result = sortProducts(result, sortOption, settings.currency.toLowerCase() as 'usd' | 'aed');
    
    return result;
  }, [products, selectedCategory, searchQuery, sortOption, settings.currency]);

  // Generate category options with counts
  const categoryOptions = useMemo(() => [
    { id: 'all', label: 'All Products', count: products.filter(p => p.status === 'active').length },
    ...categories.map(category => ({
      id: category,
      label: category,
      count: getProductsByCategory(category).length
    }))
  ], [products, categories, getProductsByCategory]);

  // Handle add to cart
  const handleAddToCart = async (item: any) => {
    // Digital products link out to the external storefront
    if (item.externalUrl) {
      window.open(item.externalUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    // Check if the item requires size/color selection
    if ((item.sizes && item.sizes.length > 0) || (item.colors && item.colors.length > 0)) {
      setSelectedItem(item);
      setSelectedSize(item.sizes?.[0] || '');
      setSelectedColor(item.colors?.[0] || '');
      setShowItemModal(true);
      return;
    }
    
    // Add directly if no options needed
    setProcessingAdd(item.id);
    try {
      const cartItem = {
        id: parseInt(item.id.replace('prod_', '')),
        name: item.name,
        price: item.price,
        image: item.image || '',
        category: item.category,
        inStock: item.inStock,
        description: item.description,
        sizes: item.sizes,
        colors: item.colors
      };

      const success = await addToCart(cartItem);
      if (!success) {
        toast.error('Failed to add item to cart');
      }
    } catch (error) {
      console.error('Error adding item to cart:', error);
      toast.error('Failed to add item to cart');
    } finally {
      setProcessingAdd(null);
    }
  };

  const handleConfirmAddToCart = async () => {
    if (!selectedItem) return;
    
    setProcessingAdd(selectedItem.id);
    try {
      const cartItem = {
        id: parseInt(selectedItem.id.replace('prod_', '')),
        name: selectedItem.name,
        price: selectedItem.price,
        image: selectedItem.image || '',
        category: selectedItem.category,
        inStock: selectedItem.inStock,
        description: selectedItem.description,
        sizes: selectedItem.sizes,
        colors: selectedItem.colors
      };

      const success = await addToCart(cartItem, { 
        size: selectedSize || undefined, 
        color: selectedColor || undefined 
      });
      
      if (success) {
        setShowItemModal(false);
        setSelectedItem(null);
        setSelectedSize('');
        setSelectedColor('');
      }
    } catch (error) {
      console.error('Error adding item to cart:', error);
      toast.error('Failed to add item to cart');
    } finally {
      setProcessingAdd(null);
    }
  };

  // Sort options display
  const getSortLabel = (option: SortOption) => {
    switch (option) {
      case 'price-low-high': return 'Price: Low to High';
      case 'price-high-low': return 'Price: High to Low';
      case 'name-az': return 'Name: A-Z';
      case 'name-za': return 'Name: Z-A';
      case 'newest': return 'Newest First';
      default: return 'Newest First';
    }
  };

  return (
    <div className="flex flex-col h-full pt-[60px]">
      {/* Header */}
      <div className="p-4 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-medium">Store</h1>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-32"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
            
            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <ArrowUpDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Sort By</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSortOption('newest')}>
                  Newest First
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortOption('price-low-high')}>
                  Price: Low to High
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortOption('price-high-low')}>
                  Price: High to Low
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortOption('name-az')}>
                  Name: A-Z
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortOption('name-za')}>
                  Name: Z-A
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Cart Button */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="relative"
              onClick={() => setShowCart(true)}
            >
              <ShoppingCartIcon className="w-5 h-5" />
              {cartItemCount > 0 && (
                <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs">
                  {cartItemCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-2">
          {categoryOptions.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm transition-colors ${
                selectedCategory === category.id
                  ? 'bg-primary/90 text-primary-foreground'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              {category.label} ({category.count})
            </button>
          ))}
        </div>
      </div>

      {/* Error Alert */}
      {(cartError || storeError) && (
        <div className="px-4 pt-4">
          <Alert className="border-destructive/50 bg-destructive/10">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive">
              <div className="space-y-2">
                <p className="font-medium">{cartError?.message || storeError}</p>
                {cartError?.action && <p className="text-sm">{cartError.action}</p>}
                <div className="flex gap-2">
                  {cartError && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={retryLastAction}
                      className="h-7"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Retry
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (cartError) clearCartError();
                      if (storeError) clearStoreError();
                    }}
                    className="h-7 text-destructive hover:text-destructive/80"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {storeLoading ? (
          <div className="grid grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-card/30 border border-border/50 rounded-xl p-4">
                <div className="aspect-square bg-muted/50 rounded-lg mb-3 animate-pulse" />
                <div className="h-4 bg-muted/50 rounded mb-2 animate-pulse" />
                <div className="h-3 bg-muted/30 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Results count and sort display */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                {filteredAndSortedProducts.length} {filteredAndSortedProducts.length === 1 ? 'product' : 'products'} found
              </p>
              <p className="text-xs text-muted-foreground">
                Sorted by: {getSortLabel(sortOption)}
              </p>
            </div>

            {/* Featured Items (only show when no search and on 'all' category) */}
            {selectedCategory === 'all' && 
             !searchQuery && 
             featuredProducts.length > 0 && (
              <div className="mb-6">
                <h2 className="font-medium mb-3">Featured</h2>
                <div className="grid grid-cols-2 gap-4">
                  {featuredProducts.map(item => (
                    <div key={item.id} className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-4">
                      <div 
                        className="relative mb-3 cursor-pointer"
                        onClick={() => navigate(`/store/product/${item.id}`)}
                      >
                        <ImageWithFallback
                          src={item.image || ''}
                          alt={item.name}
                          className="w-full aspect-square object-cover rounded-lg"
                        />
                        <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs">
                          Featured
                        </Badge>
                      </div>
                      <h3 
                        className="font-medium text-sm mb-1 cursor-pointer hover:text-primary transition-colors line-clamp-1"
                        onClick={() => navigate(`/store/product/${item.id}`)}
                      >
                        {item.name}
                      </h3>
                      <p className="text-muted-foreground text-xs mb-2">{item.category}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="font-medium">{formatPrice(item.price)}</span>
                        </div>
                        <Button 
                          size="sm" 
                          className="bg-primary/90 hover:bg-primary text-primary-foreground"
                          disabled={!item.inStock || processingAdd === item.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToCart(item);
                          }}
                        >
                          {processingAdd === item.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <ShoppingCartIcon className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Product Grid */}
            <div>
              {filteredAndSortedProducts.length === 0 ? (
                <div className="text-center py-12">
                  {/* Show different messages based on whether it's a search or truly empty */}
                  {searchQuery ? (
                    <>
                      <p className="text-muted-foreground mb-4">
                        No products found.
                      </p>
                      <Button variant="outline" onClick={() => setSearchQuery('')}>
                        Clear Search
                      </Button>
                    </>
                  ) : products.length === 0 ? (
                    /* Coming Soon State - when store is truly empty */
                    <div className="flex flex-col items-center justify-center max-w-md mx-auto py-12">
                      <div className="relative mb-8">
                        <div className="bg-primary/10 backdrop-blur-sm rounded-full p-8">
                          <Sparkles className="w-16 h-16 text-primary animate-pulse" />
                        </div>
                      </div>
                      <h3 className="text-xl font-semibold mb-3">We'll be launching something soon!</h3>
                      <p className="text-muted-foreground text-sm max-w-sm text-center">
                        Exciting products are on the way. Stay tuned for exclusive merchandise and more!
                      </p>
                    </div>
                  ) : (
                    /* No products in selected category */
                    <>
                      <p className="text-muted-foreground mb-4">
                        No products found in this category.
                      </p>
                      <Button variant="outline" onClick={() => setSelectedCategory('all')}>
                        View All Products
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {filteredAndSortedProducts.map(item => (
                    <div key={item.id} className="bg-card/30 border border-border/50 rounded-xl p-4">
                      <div 
                        className="relative mb-3 cursor-pointer"
                        onClick={() => navigate(`/store/product/${item.id}`)}
                      >
                        <ImageWithFallback
                          src={item.image || ''}
                          alt={item.name}
                          className="w-full aspect-square object-cover rounded-lg"
                        />
                        {!item.inStock && (
                          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-lg flex items-center justify-center">
                            <Badge variant="secondary" className="text-xs">Out of Stock</Badge>
                          </div>
                        )}
                      </div>
                      <h3 
                        className="font-medium text-sm mb-1 cursor-pointer hover:text-primary transition-colors line-clamp-1"
                        onClick={() => navigate(`/store/product/${item.id}`)}
                      >
                        {item.name}
                      </h3>
                      <p className="text-muted-foreground text-xs mb-2 line-clamp-2">{item.description}</p>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{formatPrice(item.price)}</span>
                          {item.stock > 0 && item.stock <= 5 && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 text-orange-500 border-orange-500/50 w-fit">
                              Only {item.stock} left!
                            </Badge>
                          )}
                        </div>
                        <Button 
                          size="sm" 
                          className="bg-primary/90 hover:bg-primary text-primary-foreground"
                          disabled={!item.inStock || processingAdd === item.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToCart(item);
                          }}
                        >
                          {processingAdd === item.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <ShoppingCartIcon className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Shipping Info */}
        {!storeLoading && (
          <div className="mt-6 p-4 bg-muted/30 rounded-lg">
            <h3 className="font-medium mb-2">Shipping Information</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Free shipping on orders over {settings.currency === 'USD' ? `$${settings.freeShippingThreshold.usd}` : `AED ${settings.freeShippingThreshold.aed}`}</li>
              <li>• 3-5 business days delivery</li>
              <li>• 30-day return policy</li>
              <li>• All proceeds support the podcast</li>
            </ul>
          </div>
        )}
      </div>

      {/* Item Selection Modal */}
      <Dialog open={showItemModal} onOpenChange={setShowItemModal}>
        <DialogContent className="bg-background/95 backdrop-blur-sm border-border/50 max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle>Select Options</DialogTitle>
            <DialogDescription>
              Choose size and color options for your item
            </DialogDescription>
          </DialogHeader>
          
          {selectedItem && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <ImageWithFallback
                  src={selectedItem.image || ''}
                  alt={selectedItem.name}
                  className="w-20 h-20 object-cover rounded-lg"
                />
                <div>
                  <h3 className="font-medium">{selectedItem.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{selectedItem.description}</p>
                  <div className="mt-1">
                    <span className="font-medium">{formatPrice(selectedItem.price)}</span>
                  </div>
                </div>
              </div>
              
              {selectedItem.sizes && selectedItem.sizes.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2">Size</label>
                  <div className="flex gap-2 flex-wrap">
                    {selectedItem.sizes.map((size: string) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`px-3 py-1 rounded border text-sm ${
                          selectedSize === size
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background border-border hover:bg-muted'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedItem.colors && selectedItem.colors.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2">Color</label>
                  <div className="flex gap-2 flex-wrap">
                    {selectedItem.colors.map((color: string) => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`px-3 py-1 rounded border text-sm ${
                          selectedColor === color
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background border-border hover:bg-muted'
                        }`}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <Button 
                className="w-full bg-primary/90 hover:bg-primary text-primary-foreground"
                onClick={handleConfirmAddToCart}
                disabled={
                  (selectedItem.sizes && selectedItem.sizes.length > 0 && !selectedSize) || 
                  (selectedItem.colors && selectedItem.colors.length > 0 && !selectedColor) ||
                  processingAdd === selectedItem.id
                }
              >
                {processingAdd === selectedItem.id ? (
                  <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Adding...</>
                ) : (
                  'Add to Cart'
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}