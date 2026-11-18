import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { ShoppingCart, Plus, Minus, AlertCircle, RefreshCw, Trash2 } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useCart } from '../contexts/CartContext';
import { useModals } from '../contexts/ModalContext';
import { toast } from 'sonner@2.0.3';
import OririLoader from './OririLoader';

export const CartModal: React.FC = () => {
  const navigate = useNavigate();
  const { 
    cart, 
    cartItemCount, 
    cartTotal, 
    currency, 
    isLoading,
    error,
    updateCart, 
    removeFromCart, 
    clearCart,
    formatPrice,
    retryLastAction,
    clearError
  } = useCart();
  const { showCart, setShowCart } = useModals();
  const [processingItems, setProcessingItems] = useState<Set<string>>(new Set());

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error('Your cart is empty');
      return;
    }
    
    if (error) {
      toast.error('Please resolve cart errors before proceeding');
      return;
    }

    setShowCart(false);
    navigate('/store/checkout');
  };

  const handleBrowseStore = () => {
    setShowCart(false);
    navigate('/store');
  };

  const handleUpdateQuantity = async (itemId: number, newQuantity: number, size?: string, color?: string) => {
    const itemKey = `${itemId}-${size || 'no-size'}-${color || 'no-color'}`;
    
    setProcessingItems(prev => new Set(prev).add(itemKey));
    
    try {
      const success = await updateCart(itemId, newQuantity, size, color);
      if (!success) {
        toast.error('Failed to update quantity');
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast.error('Failed to update quantity');
    } finally {
      setProcessingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemKey);
        return newSet;
      });
    }
  };

  const handleRemoveItem = async (itemId: number, size?: string, color?: string) => {
    const itemKey = `${itemId}-${size || 'no-size'}-${color || 'no-color'}`;
    
    setProcessingItems(prev => new Set(prev).add(itemKey));
    
    try {
      const success = await removeFromCart(itemId, size, color);
      if (!success) {
        toast.error('Failed to remove item');
      }
    } catch (error) {
      console.error('Error removing item:', error);
      toast.error('Failed to remove item');
    } finally {
      setProcessingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemKey);
        return newSet;
      });
    }
  };

  const handleClearCart = async () => {
    if (cart.length === 0) return;
    
    const confirmClear = window.confirm('Are you sure you want to clear your entire cart?');
    if (!confirmClear) return;

    try {
      const success = await clearCart();
      if (!success) {
        toast.error('Failed to clear cart');
      }
    } catch (error) {
      console.error('Error clearing cart:', error);
      toast.error('Failed to clear cart');
    }
  };

  const handleRetryAction = async () => {
    try {
      await retryLastAction();
    } catch (error) {
      console.error('Error retrying action:', error);
      toast.error('Failed to retry action');
    }
  };

  return (
    <Dialog open={showCart} onOpenChange={setShowCart}>
      <DialogContent className="bg-background/95 backdrop-blur-sm border-border/50 max-w-sm mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Shopping Cart ({cartItemCount} items)
            {cart.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearCart}
                className="text-destructive hover:text-destructive/80"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </DialogTitle>
          <DialogDescription>
            Review your items and proceed to checkout
          </DialogDescription>
        </DialogHeader>

        {/* Error Alert */}
        {error && (
          <Alert className="border-destructive/50 bg-destructive/10">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive">
              <div className="space-y-2">
                <p className="font-medium">{error.message}</p>
                {error.action && <p className="text-sm">{error.action}</p>}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleRetryAction}
                    className="h-7"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Retry
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={clearError}
                    className="h-7 text-destructive hover:text-destructive/80"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        <div className="flex-1 overflow-y-auto py-4">
          {isLoading ? (
            <OririLoader variant="inline" />
          ) : cart.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Your cart is empty</p>
              <Button 
                className="mt-4" 
                onClick={handleBrowseStore}
              >
                Browse Store
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map(item => {
                const itemKey = `${item.id}-${item.selectedSize || 'no-size'}-${item.selectedColor || 'no-color'}`;
                const isProcessing = processingItems.has(itemKey);
                
                return (
                  <div 
                    key={itemKey} 
                    className={`flex gap-3 p-3 bg-card/30 rounded-lg transition-opacity ${
                      isProcessing ? 'opacity-50' : ''
                    }`}
                  >
                    <ImageWithFallback
                      src={item.image}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h3 className="font-medium text-sm line-clamp-1">{item.name}</h3>
                      {item.selectedSize && (
                        <p className="text-xs text-muted-foreground">Size: {item.selectedSize}</p>
                      )}
                      {item.selectedColor && (
                        <p className="text-xs text-muted-foreground">Color: {item.selectedColor}</p>
                      )}
                      <p className="font-medium text-sm mt-1">{formatPrice(item.price)}</p>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-6 h-6 p-0"
                          disabled={isProcessing || item.quantity <= 1}
                          onClick={() => handleUpdateQuantity(item.id, item.quantity - 1, item.selectedSize, item.selectedColor)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="text-sm font-medium w-8 text-center">
                          {isProcessing ? '...' : item.quantity}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-6 h-6 p-0"
                          disabled={isProcessing || item.quantity >= 99}
                          onClick={() => handleUpdateQuantity(item.id, item.quantity + 1, item.selectedSize, item.selectedColor)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-auto text-destructive"
                          disabled={isProcessing}
                          onClick={() => handleRemoveItem(item.id, item.selectedSize, item.selectedColor)}
                        >
                          {isProcessing ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Remove'}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {cart.length > 0 && !isLoading && (
          <div className="border-t border-border/50 pt-4">
            <div className="flex justify-between items-center mb-4">
              <span className="font-medium">Total:</span>
              <span className="font-medium text-lg">
                {currency === 'USD' ? '$' : 'AED '}{cartTotal.toFixed(2)}
              </span>
            </div>
            <Button 
              className="w-full bg-primary/90 hover:bg-primary text-primary-foreground"
              onClick={handleCheckout}
              disabled={!!error || isLoading}
            >
              {error ? 'Resolve Errors First' : 'Go to Checkout'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};