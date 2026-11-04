import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Alert, AlertDescription } from './ui/alert';
import {
  ShoppingCartIcon,
  ArrowLeft,
  Share2,
  ChevronLeft,
  ChevronRight,
  PackageIcon,
  TruckIcon,
  RefreshCw,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useCart } from '../contexts/CartContext';
import { useStore } from '../contexts/StoreContext';
import { useModals } from '../contexts/ModalContext';
import { toast } from 'sonner@2.0.3';
import { addToRecentlyViewed } from '../utils/recentlyViewed';

export default function ProductDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    getProduct, 
    getProductsByCategory, 
    formatPrice, 
    settings,
    isLoading: storeLoading,
    error: storeError 
  } = useStore();
  const { addToCart } = useCart();
  const { setShowCart } = useModals();

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // Get product
  const product = id ? getProduct(id) : undefined;

  // Initialize size and color when product loads
  useEffect(() => {
    if (product) {
      if (product.sizes && product.sizes.length > 0) {
        setSelectedSize(product.sizes[0]);
      }
      if (product.colors && product.colors.length > 0) {
        setSelectedColor(product.colors[0]);
      }
    }
  }, [product]);

  // Add product to recently viewed
  useEffect(() => {
    if (product) {
      addToRecentlyViewed(product);
    }
  }, [product]);

  // Get related products (same category, exclude current product)
  const relatedProducts = product 
    ? getProductsByCategory(product.category).filter(p => p.id !== product.id).slice(0, 4)
    : [];

  // Handle image navigation
  const images = product?.images && product.images.length > 0 
    ? product.images 
    : product?.image 
      ? [product.image] 
      : [];

  const handlePreviousImage = () => {
    setSelectedImageIndex(prev => 
      prev === 0 ? images.length - 1 : prev - 1
    );
  };

  const handleNextImage = () => {
    setSelectedImageIndex(prev => 
      prev === images.length - 1 ? 0 : prev + 1
    );
  };

  // Handle add to cart
  const handleAddToCart = async () => {
    if (!product) return;

    // Validation
    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      toast.error('Please select a size');
      return;
    }

    if (product.colors && product.colors.length > 0 && !selectedColor) {
      toast.error('Please select a color');
      return;
    }

    setIsAddingToCart(true);

    try {
      // Convert store product to cart item format
      const cartItem = {
        id: parseInt(product.id.replace('prod_', '')),
        name: product.name,
        price: product.price,
        image: product.image || images[0] || '',
        category: product.category,
        inStock: product.inStock,
        description: product.description,
        sizes: product.sizes,
        colors: product.colors
      };

      const options = {
        size: selectedSize || undefined,
        color: selectedColor || undefined
      };

      // Add to cart with quantity
      for (let i = 0; i < quantity; i++) {
        const success = await addToCart(cartItem, options);
        if (!success) {
          toast.error('Failed to add item to cart');
          setIsAddingToCart(false);
          return;
        }
      }

      toast.success(`Added ${quantity} item(s) to cart`);
      
      // Optionally show cart modal
      // setShowCart(true);
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add to cart');
    } finally {
      setIsAddingToCart(false);
    }
  };

  // Handle share
  const handleShare = async () => {
    if (!product) return;

    setIsSharing(true);

    const shareData = {
      title: product.name,
      text: `Check out ${product.name} - ${product.description}`,
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        toast.success('Product shared successfully');
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Product link copied to clipboard');
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Error sharing:', error);
        toast.error('Failed to share product');
      }
    } finally {
      setIsSharing(false);
    }
  };

  // Handle related product click
  const handleRelatedProductClick = (productId: string) => {
    navigate(`/store/product/${productId}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Loading state
  if (storeLoading) {
    return (
      <div className="flex flex-col h-full pt-[60px]">
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Image skeleton */}
            <div className="aspect-square bg-muted/50 rounded-xl animate-pulse" />
            
            {/* Content skeleton */}
            <div className="space-y-4">
              <div className="h-8 bg-muted/50 rounded w-3/4 animate-pulse" />
              <div className="h-4 bg-muted/30 rounded w-1/2 animate-pulse" />
              <div className="h-6 bg-muted/50 rounded w-1/4 animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 bg-muted/30 rounded animate-pulse" />
                <div className="h-4 bg-muted/30 rounded animate-pulse" />
                <div className="h-4 bg-muted/30 rounded w-2/3 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (storeError) {
    return (
      <div className="flex flex-col h-full pt-[60px]">
        <div className="flex-1 overflow-y-auto p-4">
          <Alert className="border-destructive/50 bg-destructive/10 max-w-md mx-auto">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive">
              {storeError}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Product not found
  if (!product) {
    return (
      <div className="flex flex-col h-full pt-[60px]">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center space-y-4">
            <PackageIcon className="w-16 h-16 mx-auto text-muted-foreground" />
            <h2 className="text-xl font-medium">Product Not Found</h2>
            <p className="text-muted-foreground">
              The product you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => navigate('/store')}>
              Browse Store
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const lowStock = product.stock > 0 && product.stock <= 5;
  const outOfStock = !product.inStock || product.stock === 0;

  return (
    <div className="flex flex-col h-full pt-[60px]">
      {/* Header */}
      <div className="sticky top-[60px] z-10 p-4 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/store')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Store
          </Button>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              disabled={isSharing}
            >
              {isSharing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4 space-y-6">
          {/* Image Gallery */}
          <div className="relative">
            <div className="aspect-square bg-card/30 rounded-xl overflow-hidden">
              <ImageWithFallback
                src={images[selectedImageIndex] || ''}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              
              {/* Out of stock overlay */}
              {outOfStock && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
                  <Badge variant="secondary" className="text-lg px-4 py-2">
                    Out of Stock
                  </Badge>
                </div>
              )}

              {/* Featured badge */}
              {product.featured && (
                <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground">
                  Featured
                </Badge>
              )}
            </div>

            {/* Image navigation */}
            {images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm"
                  onClick={handlePreviousImage}
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm"
                  onClick={handleNextImage}
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>

                {/* Image indicators */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === selectedImageIndex
                          ? 'bg-primary'
                          : 'bg-background/50'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-4">
            {/* Title and Category */}
            <div>
              <Badge variant="outline" className="mb-2">
                {product.category}
              </Badge>
              <h1 className="text-2xl font-bold mb-2">{product.name}</h1>
              <div className="flex items-center gap-4">
                <span className="text-2xl font-bold text-primary">
                  {formatPrice(product.price)}
                </span>
                {lowStock && (
                  <Badge variant="outline" className="text-orange-500 border-orange-500">
                    Only {product.stock} left!
                  </Badge>
                )}
              </div>
            </div>

            <Separator />

            {/* Description */}
            <div>
              <h3 className="font-medium mb-2">Description</h3>
              <p className="text-muted-foreground leading-relaxed">
                {product.description}
              </p>
            </div>

            {/* Metadata */}
            {product.metadata && Object.keys(product.metadata).length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-medium mb-2">Product Details</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {product.metadata.material && (
                      <div>
                        <span className="text-muted-foreground">Material:</span>
                        <p className="font-medium">{product.metadata.material}</p>
                      </div>
                    )}
                    {product.metadata.dimensions && (
                      <div>
                        <span className="text-muted-foreground">Dimensions:</span>
                        <p className="font-medium">{product.metadata.dimensions}</p>
                      </div>
                    )}
                    {product.metadata.weight && (
                      <div>
                        <span className="text-muted-foreground">Weight:</span>
                        <p className="font-medium">{product.metadata.weight}g</p>
                      </div>
                    )}
                  </div>
                  {product.metadata.care_instructions && (
                    <div className="mt-3">
                      <span className="text-muted-foreground">Care Instructions:</span>
                      <p className="text-sm mt-1">{product.metadata.care_instructions}</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Tags */}
            {product.tags && product.tags.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-medium mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {product.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Size Selection */}
            {product.sizes && product.sizes.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Size {selectedSize && `(${selectedSize})`}
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
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

            {/* Color Selection */}
            {product.colors && product.colors.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Color {selectedColor && `(${selectedColor})`}
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
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

            {/* Quantity Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">Quantity</label>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  -
                </Button>
                <span className="text-lg font-medium w-12 text-center">
                  {quantity}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity(Math.min(product.stock || 99, quantity + 1))}
                  disabled={quantity >= (product.stock || 99)}
                >
                  +
                </Button>
                <span className="text-sm text-muted-foreground ml-2">
                  {product.stock > 0 ? `${product.stock} available` : 'Out of stock'}
                </span>
              </div>
            </div>

            {/* Add to Cart Button */}
            <Button
              className="w-full bg-primary/90 hover:bg-primary text-primary-foreground py-6 text-lg"
              onClick={handleAddToCart}
              disabled={outOfStock || isAddingToCart}
            >
              {isAddingToCart ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  Adding to Cart...
                </>
              ) : outOfStock ? (
                'Out of Stock'
              ) : (
                <>
                  <ShoppingCartIcon className="w-5 h-5 mr-2" />
                  Add to Cart
                </>
              )}
            </Button>

            {/* Shipping Info */}
            <div className="bg-muted/30 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <TruckIcon className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Free Shipping</p>
                  <p className="text-sm text-muted-foreground">
                    On orders over {settings.currency === 'USD' 
                      ? `$${settings.freeShippingThreshold.usd}` 
                      : `AED ${settings.freeShippingThreshold.aed}`}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">30-Day Returns</p>
                  <p className="text-sm text-muted-foreground">
                    Easy returns within 30 days of purchase
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <PackageIcon className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Secure Packaging</p>
                  <p className="text-sm text-muted-foreground">
                    Your items are carefully packaged for safe delivery
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-bold mb-4">Related Products</h2>
              <div className="grid grid-cols-2 gap-4">
                {relatedProducts.map((relatedProduct) => (
                  <button
                    key={relatedProduct.id}
                    onClick={() => handleRelatedProductClick(relatedProduct.id)}
                    className="bg-card/30 border border-border/50 rounded-xl p-4 text-left hover:bg-card/50 transition-colors"
                  >
                    <div className="relative mb-3">
                      <ImageWithFallback
                        src={relatedProduct.image || ''}
                        alt={relatedProduct.name}
                        className="w-full aspect-square object-cover rounded-lg"
                      />
                      {!relatedProduct.inStock && (
                        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-lg flex items-center justify-center">
                          <Badge variant="secondary" className="text-xs">
                            Out of Stock
                          </Badge>
                        </div>
                      )}
                    </div>
                    <h3 className="font-medium text-sm mb-1 line-clamp-2">
                      {relatedProduct.name}
                    </h3>
                    <p className="font-medium text-primary">
                      {formatPrice(relatedProduct.price)}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}