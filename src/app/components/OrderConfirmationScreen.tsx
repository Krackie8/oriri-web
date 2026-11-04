import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Alert, AlertDescription } from './ui/alert';
import {
  CheckCircle2,
  Package,
  MapPin,
  Calendar,
  Mail,
  Phone,
  ShoppingBag,
  FileText,
  ArrowRight,
  Home,
  Info
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../contexts/CartContext';

interface OrderConfirmationLocationState {
  order: {
    orderId: string;
    orderNumber: string;
    status: string;
    total: number;
    currency: string;
    createdAt: string;
  };
  shippingAddress: {
    fullName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    notes?: string;
  };
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    image?: string;
    selectedSize?: string;
    selectedColor?: string;
  }>;
}

export default function OrderConfirmationScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { formatPrice } = useCart();

  // Get order data from navigation state
  const state = location.state as OrderConfirmationLocationState | null;

  // If no order data, redirect to store
  useEffect(() => {
    if (!state?.order) {
      console.warn('[OrderConfirmation] No order data found, redirecting to store');
      navigate('/store', { replace: true });
    }
  }, [state, navigate]);

  if (!state?.order) {
    return null; // Will redirect in useEffect
  }

  const { order, shippingAddress, items } = state;

  // Calculate estimated delivery date (7-10 business days from now)
  const orderDate = new Date(order.createdAt);
  const estimatedDeliveryStart = new Date(orderDate);
  estimatedDeliveryStart.setDate(orderDate.getDate() + 7);
  const estimatedDeliveryEnd = new Date(orderDate);
  estimatedDeliveryEnd.setDate(orderDate.getDate() + 10);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = subtotal >= 500 ? 0 : 50; // Free shipping over 500
  const tax = subtotal * 0.05; // 5% tax
  const total = subtotal + shipping + tax;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Success Header */}
      <div className="bg-gradient-to-b from-green-500/10 to-transparent pt-6 pb-12">
        <div className="max-w-3xl mx-auto px-4">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-green-500/20 rounded-full blur-2xl animate-pulse" />
              <div className="relative bg-green-500/10 backdrop-blur-xl border border-green-500/30 rounded-full p-6">
                <CheckCircle2 className="w-16 h-16 text-green-500" />
              </div>
            </div>
          </div>

          {/* Success Message */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-foreground">
              Order Placed Successfully!
            </h1>
            <p className="text-muted-foreground">
              Thank you for your order. We'll send a confirmation email shortly.
            </p>
          </div>

          {/* Order Number */}
          <div className="mt-8 bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Order Number</p>
                <p className="text-2xl font-bold text-foreground font-mono">
                  {order.orderNumber}
                </p>
              </div>
              <Badge className="bg-green-500/20 text-green-500 border-green-500/30 capitalize px-4 py-2">
                {order.status}
              </Badge>
            </div>

            <Separator className="my-4" />

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Order Date</p>
                <p className="text-foreground font-medium">
                  {formatDate(orderDate)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Total Amount</p>
                <p className="text-foreground font-bold">
                  {formatPrice({ usd: order.total, aed: order.total })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 -mt-6 space-y-6">
        {/* Email Confirmation Notice */}
        <Alert className="border-blue-500/50 bg-blue-500/10">
          <Mail className="h-4 w-4 text-blue-500" />
          <AlertDescription className="text-sm text-blue-500">
            A confirmation email has been sent to <strong>{shippingAddress.email}</strong>
          </AlertDescription>
        </Alert>

        {/* Estimated Delivery */}
        <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="bg-primary/10 rounded-lg p-3">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Estimated Delivery
              </h3>
              <p className="text-foreground font-medium mb-1">
                {formatDate(estimatedDeliveryStart)} - {formatDate(estimatedDeliveryEnd)}
              </p>
              <p className="text-sm text-muted-foreground">
                7-10 business days from order date
              </p>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Package className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">
              Order Items ({items.length})
            </h3>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => (
              <React.Fragment key={`${item.id}-${item.selectedSize}-${item.selectedColor}-${index}`}>
                {index > 0 && <Separator />}
                <div className="flex gap-4">
                  {/* Product Image */}
                  <div className="flex-shrink-0">
                    <div className="w-20 h-20 bg-muted/30 rounded-lg overflow-hidden">
                      {item.image ? (
                        <ImageWithFallback
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-8 h-8 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground truncate mb-1">
                      {item.name}
                    </h4>
                    
                    {/* Variants */}
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

                    {/* Price & Quantity */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Qty: {item.quantity}
                      </span>
                      <span className="font-semibold text-foreground">
                        {formatPrice({ usd: item.price * item.quantity, aed: item.price * item.quantity })}
                      </span>
                    </div>
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>

          {/* Order Summary */}
          <Separator className="my-6" />

          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground">
                {formatPrice({ usd: subtotal, aed: subtotal })}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Shipping</span>
              <span className="text-foreground">
                {shipping === 0 ? (
                  <span className="text-green-500 font-medium">FREE</span>
                ) : (
                  formatPrice({ usd: shipping, aed: shipping })
                )}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax (5%)</span>
              <span className="text-foreground">
                {formatPrice({ usd: tax, aed: tax })}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg">
              <span className="font-bold text-foreground">Total</span>
              <span className="font-bold text-primary">
                {formatPrice({ usd: total, aed: total })}
              </span>
            </div>
          </div>
        </div>

        {/* Shipping Address */}
        <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <MapPin className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">
              Shipping Address
            </h3>
          </div>

          <div className="space-y-3">
            <div>
              <p className="font-medium text-foreground">{shippingAddress.fullName}</p>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>{shippingAddress.address}</p>
              <p>
                {shippingAddress.city}, {shippingAddress.state} {shippingAddress.postalCode}
              </p>
              <p>{shippingAddress.country}</p>
            </div>
            <Separator />
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">{shippingAddress.phone}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">{shippingAddress.email}</span>
            </div>
            {shippingAddress.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Delivery Notes:</p>
                  <p className="text-sm text-foreground">{shippingAddress.notes}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Payment Status Notice */}
        <Alert className="border-yellow-500/50 bg-yellow-500/10">
          <Info className="h-4 w-4 text-yellow-500" />
          <AlertDescription className="text-sm text-yellow-500">
            Payment processing will be available soon. We'll contact you via email with payment instructions.
          </AlertDescription>
        </Alert>

        {/* Action Buttons */}
        <div className="space-y-3 pt-4">
          {/* View Orders (if logged in) */}
          {user && (
            <Button
              className="w-full bg-primary/90 hover:bg-primary text-primary-foreground h-12"
              onClick={() => navigate('/profile?tab=orders')}
            >
              <FileText className="w-5 h-5 mr-2" />
              View My Orders
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          )}

          {/* Continue Shopping */}
          <Button
            variant="outline"
            className="w-full h-12"
            onClick={() => navigate('/store')}
          >
            <ShoppingBag className="w-5 h-5 mr-2" />
            Continue Shopping
          </Button>

          {/* Back to Home */}
          <Button
            variant="ghost"
            className="w-full h-12"
            onClick={() => navigate('/')}
          >
            <Home className="w-5 h-5 mr-2" />
            Back to Home
          </Button>
        </div>

        {/* Additional Info */}
        <div className="text-center text-sm text-muted-foreground pt-4">
          <p>Questions about your order?</p>
          <p className="mt-1">
            Contact us at{' '}
            <a href="mailto:support@oriri.com" className="text-primary hover:underline">
              support@oriri.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
