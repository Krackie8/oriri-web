import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form@7.55.0';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Alert, AlertDescription } from './ui/alert';
import {
  ArrowLeft,
  ChevronRight,
  ShoppingCartIcon,
  MapPinIcon,
  CreditCardIcon,
  CheckCircle,
  AlertCircle,
  Loader2,
  Package,
  Trash2
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useCart } from '../contexts/CartContext';
import { useStore } from '../contexts/StoreContext';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

// Shipping form data interface
interface ShippingFormData {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  notes?: string;
}

export default function CheckoutScreen() {
  const navigate = useNavigate();
  const { cart, cartTotal, formatPrice, currency, removeFromCart, clearCart, updateCart } = useCart();
  const { settings } = useStore();
  const { user } = useAuth();

  // Checkout steps: 1 = Review Cart, 2 = Shipping Info, 3 = Order Summary
  const [currentStep, setCurrentStep] = useState(1);
  const [shippingData, setShippingData] = useState<ShippingFormData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form validation using react-hook-form
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<ShippingFormData>({
    defaultValues: {
      fullName: '',
      email: user?.email || '',
      phone: '',
      address: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'UAE',
      notes: ''
    }
  });

  // Pre-fill form with user data if logged in
  useEffect(() => {
    if (user) {
      // Pre-fill email from auth
      setValue('email', user.email || '');
      
      // Pre-fill name from user metadata if available
      if (user.user_metadata?.name) {
        setValue('fullName', user.user_metadata.name);
      }
    }
  }, [user, setValue]);

  // Redirect if cart is empty
  useEffect(() => {
    if (cart.length === 0 && currentStep === 1) {
      toast.error('Your cart is empty');
      navigate('/store');
    }
  }, [cart, currentStep, navigate]);

  // Calculate totals
  const subtotal = cartTotal;
  const shippingCost = subtotal >= (currency === 'USD' 
    ? settings.freeShippingThreshold.usd 
    : settings.freeShippingThreshold.aed) 
    ? 0 
    : currency === 'USD' ? 10 : 35; // $10 or AED 35 shipping
  
  const taxAmount = subtotal * settings.taxRate;
  const total = subtotal + shippingCost + taxAmount;

  // Handle quantity update
  const handleQuantityChange = async (
    itemId: number, 
    newQuantity: number, 
    size?: string, 
    color?: string
  ) => {
    if (newQuantity < 1) {
      await removeFromCart(itemId, size, color);
    } else {
      await updateCart(itemId, newQuantity, size, color);
    }
  };

  // Handle shipping form submission
  const onSubmitShipping = (data: ShippingFormData) => {
    console.log('[Checkout] Shipping data submitted:', data);
    setShippingData(data);
    setCurrentStep(3); // Move to Order Summary
    toast.success('Shipping information saved');
  };

  // Handle final order placement
  const handlePlaceOrder = async () => {
    if (!shippingData) {
      toast.error('Shipping information missing');
      setCurrentStep(2);
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare order data
      const orderData = {
        items: cart.map(item => ({
          productId: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          selectedSize: item.selectedSize,
          selectedColor: item.selectedColor,
          image: item.image
        })),
        shippingAddress: shippingData,
        subtotal,
        shipping: shippingCost,
        tax: taxAmount,
        total,
        currency,
        userId: user?.id || null,
        userEmail: shippingData.email,
        createdAt: new Date().toISOString()
      };

      console.log('[Checkout] Placing order:', orderData);

      // Call backend API to create order
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/orders`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify(orderData)
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create order');
      }

      console.log('[Checkout] Order created successfully:', result.order);

      // Clear cart after successful order
      await clearCart();

      toast.success('Order placed successfully!');
      
      // Navigate to order confirmation with order details
      navigate('/store/order-confirmation', { 
        state: { 
          order: result.order,
          shippingAddress: shippingData,
          items: cart
        } 
      });

    } catch (error) {
      console.error('[Checkout] Error placing order:', error);
      toast.error(error.message || 'Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step navigation handlers
  const goToStep = (step: number) => {
    if (step === 1 || (step === 2 && cart.length > 0) || (step === 3 && shippingData)) {
      setCurrentStep(step);
    }
  };

  const handleContinueToShipping = () => {
    if (cart.length === 0) {
      toast.error('Your cart is empty');
      return;
    }
    setCurrentStep(2);
  };

  // Render empty cart state
  if (cart.length === 0) {
    return (
      <div className="flex flex-col h-full pt-[60px]">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center space-y-4 max-w-md">
            <ShoppingCartIcon className="w-16 h-16 mx-auto text-muted-foreground" />
            <h2 className="text-xl font-medium">Your cart is empty</h2>
            <p className="text-muted-foreground">
              Add some products to your cart before checking out.
            </p>
            <Button onClick={() => navigate('/store')} className="mt-4">
              Browse Store
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full pt-[60px]">
      {/* Header */}
      <div className="sticky top-[60px] z-10 p-4 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => currentStep === 1 ? navigate('/store') : setCurrentStep(currentStep - 1)}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {currentStep === 1 ? 'Back to Store' : 'Back'}
          </Button>
          
          <h1 className="text-lg font-medium">Checkout</h1>
          
          <div className="w-20" /> {/* Spacer for centering */}
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mt-4">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center gap-2">
              <button
                onClick={() => goToStep(step)}
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                  currentStep === step
                    ? 'bg-primary text-primary-foreground'
                    : currentStep > step
                    ? 'bg-primary/50 text-primary-foreground cursor-pointer'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {currentStep > step ? <CheckCircle className="w-4 h-4" /> : step}
              </button>
              {step < 3 && (
                <div className={`h-0.5 w-12 ${currentStep > step ? 'bg-primary' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Labels */}
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span className={currentStep === 1 ? 'text-foreground font-medium' : ''}>Cart</span>
          <span className={currentStep === 2 ? 'text-foreground font-medium' : ''}>Shipping</span>
          <span className={currentStep === 3 ? 'text-foreground font-medium' : ''}>Review</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {/* STEP 1: Review Cart Items */}
        {currentStep === 1 && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-medium">Your Cart</h2>
              <Badge variant="secondary">{cart.length} {cart.length === 1 ? 'item' : 'items'}</Badge>
            </div>

            {/* Cart Items */}
            <div className="space-y-3">
              {cart.map((item, index) => (
                <div 
                  key={`${item.id}-${item.selectedSize}-${item.selectedColor}-${index}`}
                  className="bg-card/30 border border-border/50 rounded-xl p-4"
                >
                  <div className="flex gap-4">
                    <ImageWithFallback
                      src={item.image}
                      alt={item.name}
                      className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm mb-1 line-clamp-2">{item.name}</h3>
                      <p className="text-xs text-muted-foreground mb-2">{item.category}</p>
                      
                      {/* Options */}
                      {(item.selectedSize || item.selectedColor) && (
                        <div className="flex gap-2 mb-2 text-xs">
                          {item.selectedSize && (
                            <Badge variant="outline" className="text-xs">
                              Size: {item.selectedSize}
                            </Badge>
                          )}
                          {item.selectedColor && (
                            <Badge variant="outline" className="text-xs">
                              Color: {item.selectedColor}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Quantity & Price */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => handleQuantityChange(
                              item.id, 
                              item.quantity - 1, 
                              item.selectedSize, 
                              item.selectedColor
                            )}
                          >
                            -
                          </Button>
                          <span className="text-sm font-medium w-8 text-center">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => handleQuantityChange(
                              item.id, 
                              item.quantity + 1, 
                              item.selectedSize, 
                              item.selectedColor
                            )}
                          >
                            +
                          </Button>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <span className="font-medium">
                            {formatPrice(item.price)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={() => removeFromCart(item.id, item.selectedSize, item.selectedColor)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary Card */}
            <div className="bg-card/50 border border-border/50 rounded-xl p-4 mt-6">
              <h3 className="font-medium mb-3">Order Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatPrice({ usd: subtotal, aed: subtotal })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="font-medium">
                    {shippingCost === 0 ? (
                      <span className="text-green-500">Free</span>
                    ) : (
                      formatPrice({ usd: shippingCost, aed: shippingCost })
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-medium">{formatPrice({ usd: taxAmount, aed: taxAmount })}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between text-base">
                  <span className="font-medium">Total</span>
                  <span className="font-bold text-primary">
                    {formatPrice({ usd: total, aed: total })}
                  </span>
                </div>
              </div>

              {/* Free Shipping Notice */}
              {shippingCost > 0 && (
                <Alert className="mt-3 border-blue-500/50 bg-blue-500/10">
                  <Package className="h-4 w-4 text-blue-500" />
                  <AlertDescription className="text-xs text-blue-500">
                    Add {formatPrice({ 
                      usd: settings.freeShippingThreshold.usd - subtotal, 
                      aed: settings.freeShippingThreshold.aed - subtotal 
                    })} more for free shipping!
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Continue Button */}
            <Button
              className="w-full bg-primary/90 hover:bg-primary text-primary-foreground py-6 text-lg mt-4"
              onClick={handleContinueToShipping}
            >
              Continue to Shipping
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        )}

        {/* STEP 2: Shipping Information */}
        {currentStep === 2 && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-xl font-medium mb-4">Shipping Information</h2>

            {/* User Status */}
            {user ? (
              <Alert className="mb-4 border-green-500/50 bg-green-500/10">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertDescription className="text-sm text-green-500">
                  Logged in as {user.email}
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="mb-4 border-blue-500/50 bg-blue-500/10">
                <AlertCircle className="h-4 w-4 text-blue-500" />
                <AlertDescription className="text-sm text-blue-500">
                  You're checking out as a guest. You can create an account later.
                </AlertDescription>
              </Alert>
            )}

            {/* Shipping Form */}
            <form onSubmit={handleSubmit(onSubmitShipping)} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Full Name <span className="text-destructive">*</span>
                </label>
                <Input
                  {...register('fullName', { 
                    required: 'Full name is required',
                    minLength: { value: 2, message: 'Name must be at least 2 characters' }
                  })}
                  placeholder="John Doe"
                  className={errors.fullName ? 'border-destructive' : ''}
                />
                {errors.fullName && (
                  <p className="text-xs text-destructive mt-1">{errors.fullName.message}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Email <span className="text-destructive">*</span>
                </label>
                <Input
                  type="email"
                  {...register('email', { 
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    }
                  })}
                  placeholder="john@example.com"
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && (
                  <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Phone Number <span className="text-destructive">*</span>
                </label>
                <Input
                  type="tel"
                  {...register('phone', { 
                    required: 'Phone number is required',
                    pattern: {
                      value: /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/,
                      message: 'Invalid phone number'
                    }
                  })}
                  placeholder="+971 50 123 4567"
                  className={errors.phone ? 'border-destructive' : ''}
                />
                {errors.phone && (
                  <p className="text-xs text-destructive mt-1">{errors.phone.message}</p>
                )}
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Street Address <span className="text-destructive">*</span>
                </label>
                <Input
                  {...register('address', { 
                    required: 'Address is required',
                    minLength: { value: 5, message: 'Address must be at least 5 characters' }
                  })}
                  placeholder="123 Main Street, Apt 4B"
                  className={errors.address ? 'border-destructive' : ''}
                />
                {errors.address && (
                  <p className="text-xs text-destructive mt-1">{errors.address.message}</p>
                )}
              </div>

              {/* City & State */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    City <span className="text-destructive">*</span>
                  </label>
                  <Input
                    {...register('city', { 
                      required: 'City is required',
                      minLength: { value: 2, message: 'City must be at least 2 characters' }
                    })}
                    placeholder="Dubai"
                    className={errors.city ? 'border-destructive' : ''}
                  />
                  {errors.city && (
                    <p className="text-xs text-destructive mt-1">{errors.city.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    State / Emirate <span className="text-destructive">*</span>
                  </label>
                  <Input
                    {...register('state', { 
                      required: 'State/Emirate is required'
                    })}
                    placeholder="Dubai"
                    className={errors.state ? 'border-destructive' : ''}
                  />
                  {errors.state && (
                    <p className="text-xs text-destructive mt-1">{errors.state.message}</p>
                  )}
                </div>
              </div>

              {/* Postal Code & Country */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Postal Code
                  </label>
                  <Input
                    {...register('postalCode')}
                    placeholder="12345"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Country <span className="text-destructive">*</span>
                  </label>
                  <Input
                    {...register('country', { required: 'Country is required' })}
                    placeholder="UAE"
                    className={errors.country ? 'border-destructive' : ''}
                  />
                  {errors.country && (
                    <p className="text-xs text-destructive mt-1">{errors.country.message}</p>
                  )}
                </div>
              </div>

              {/* Delivery Notes */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Delivery Notes (Optional)
                </label>
                <textarea
                  {...register('notes')}
                  placeholder="Any special instructions for delivery..."
                  className="w-full min-h-[80px] px-3 py-2 bg-background border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-primary/90 hover:bg-primary text-primary-foreground py-6 text-lg"
              >
                Continue to Review
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </form>
          </div>
        )}

        {/* STEP 3: Order Summary & Confirmation */}
        {currentStep === 3 && shippingData && (
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="text-xl font-medium mb-4">Review Your Order</h2>

            {/* Shipping Details */}
            <div className="bg-card/50 border border-border/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium flex items-center gap-2">
                  <MapPinIcon className="w-4 h-4 text-primary" />
                  Shipping Address
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentStep(2)}
                  className="text-xs"
                >
                  Edit
                </Button>
              </div>
              <div className="text-sm space-y-1 text-muted-foreground">
                <p className="font-medium text-foreground">{shippingData.fullName}</p>
                <p>{shippingData.email}</p>
                <p>{shippingData.phone}</p>
                <p>{shippingData.address}</p>
                <p>
                  {shippingData.city}, {shippingData.state} {shippingData.postalCode}
                </p>
                <p>{shippingData.country}</p>
                {shippingData.notes && (
                  <p className="mt-2 italic">Note: {shippingData.notes}</p>
                )}
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-card/50 border border-border/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  Order Items ({cart.length})
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentStep(1)}
                  className="text-xs"
                >
                  Edit
                </Button>
              </div>
              <div className="space-y-3">
                {cart.map((item, index) => (
                  <div 
                    key={`${item.id}-${item.selectedSize}-${item.selectedColor}-${index}`}
                    className="flex gap-3"
                  >
                    <ImageWithFallback
                      src={item.image}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium line-clamp-1">{item.name}</h4>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        {item.selectedSize && <span>Size: {item.selectedSize}</span>}
                        {item.selectedColor && <span>Color: {item.selectedColor}</span>}
                        <span>Qty: {item.quantity}</span>
                      </div>
                    </div>
                    <span className="text-sm font-medium">
                      {formatPrice(item.price)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Final Order Summary */}
            <div className="bg-card/50 border border-border/50 rounded-xl p-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <CreditCardIcon className="w-4 h-4 text-primary" />
                Payment Summary
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatPrice({ usd: subtotal, aed: subtotal })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="font-medium">
                    {shippingCost === 0 ? (
                      <span className="text-green-500">Free</span>
                    ) : (
                      formatPrice({ usd: shippingCost, aed: shippingCost })
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax ({(settings.taxRate * 100).toFixed(0)}%)</span>
                  <span className="font-medium">{formatPrice({ usd: taxAmount, aed: taxAmount })}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between text-lg">
                  <span className="font-bold">Total</span>
                  <span className="font-bold text-primary">
                    {formatPrice({ usd: total, aed: total })}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Notice */}
            <Alert className="border-yellow-500/50 bg-yellow-500/10">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <AlertDescription className="text-sm text-yellow-500">
                Payment integration will be available soon. For now, your order will be submitted for manual processing.
              </AlertDescription>
            </Alert>

            {/* Place Order Button */}
            <Button
              className="w-full bg-primary/90 hover:bg-primary text-primary-foreground py-6 text-lg"
              onClick={handlePlaceOrder}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Placing Order...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Place Order
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground mt-2">
              By placing your order, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}