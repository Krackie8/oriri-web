import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import {
  Package,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  Truck,
  Clock,
  XCircle,
  CheckCircle,
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { useCart } from '../contexts/CartContext';

interface ProfileOrdersSectionProps {
  userId: string;
}

export default function ProfileOrdersSection({ userId }: ProfileOrdersSectionProps) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  
  const { formatPrice } = useCart();

  // Fetch user orders from backend
  useEffect(() => {
    if (!userId) return;

    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('[ProfileOrders] Fetching orders for user:', userId);

        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/orders/user/${userId}`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`
            }
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to fetch orders');
        }

        console.log('[ProfileOrders] Orders fetched successfully:', data.orders.length);
        setOrders(data.orders || []);
      } catch (err: any) {
        console.error('[ProfileOrders] Error fetching orders:', err);
        setError(err.message || 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [userId]);

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: {
        label: 'Pending',
        className: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
        icon: Clock
      },
      processing: {
        label: 'Processing',
        className: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
        icon: Package
      },
      shipped: {
        label: 'Shipped',
        className: 'bg-purple-500/20 text-purple-500 border-purple-500/30',
        icon: Truck
      },
      delivered: {
        label: 'Delivered',
        className: 'bg-green-500/20 text-green-500 border-green-500/30',
        icon: CheckCircle
      },
      cancelled: {
        label: 'Cancelled',
        className: 'bg-red-500/20 text-red-500 border-red-500/30',
        icon: XCircle
      }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.className} capitalize flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  // Filter orders
  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    return order.status === filter;
  });

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Toggle order expansion
  const toggleOrder = (orderId: string) => {
    setExpandedOrder(prev => prev === orderId ? null : orderId);
  };

  return (
    <div className="p-4 border-b border-border/50">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-medium">My Orders ({orders.length})</h2>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
          className="flex-shrink-0"
        >
          All
        </Button>
        <Button
          variant={filter === 'pending' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('pending')}
          className="flex-shrink-0"
        >
          Pending
        </Button>
        <Button
          variant={filter === 'processing' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('processing')}
          className="flex-shrink-0"
        >
          Processing
        </Button>
        <Button
          variant={filter === 'shipped' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('shipped')}
          className="flex-shrink-0"
        >
          Shipped
        </Button>
        <Button
          variant={filter === 'delivered' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('delivered')}
          className="flex-shrink-0"
        >
          Delivered
        </Button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-muted-foreground">Loading your orders...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="text-center py-12">
          <XCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
          <p className="text-destructive mb-2">Failed to load orders</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredOrders.length === 0 && (
        <div className="text-center py-12">
          <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-1">
            {filter === 'all' ? 'No orders yet' : `No ${filter} orders`}
          </p>
          <p className="text-sm text-muted-foreground">
            {filter === 'all' ? 'Start shopping in our store!' : 'Try a different filter'}
          </p>
        </div>
      )}

      {/* Orders List */}
      {!loading && !error && filteredOrders.length > 0 && (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <div
              key={order.orderId}
              className="bg-card/30 rounded-lg border border-border/50 overflow-hidden"
            >
              {/* Order Header */}
              <div
                className="p-4 cursor-pointer hover:bg-card/50 transition-colors"
                onClick={() => toggleOrder(order.orderId)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-mono text-sm font-medium">
                        {order.orderNumber}
                      </p>
                      {getStatusBadge(order.status)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Ordered on {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">
                      {formatPrice({ usd: order.total, aed: order.total })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {/* Quick Preview of First Item */}
                {order.items && order.items.length > 0 && (
                  <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border/30">
                    <div className="w-12 h-12 bg-muted/30 rounded overflow-hidden flex-shrink-0">
                      {order.items[0].image ? (
                        <ImageWithFallback
                          src={order.items[0].image}
                          alt={order.items[0].name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-5 h-5 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {order.items[0].name}
                      </p>
                      {order.items.length > 1 && (
                        <p className="text-xs text-muted-foreground">
                          +{order.items.length - 1} more item{order.items.length > 2 ? 's' : ''}
                        </p>
                      )}
                    </div>
                    {expandedOrder === order.orderId ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                )}
              </div>

              {/* Expanded Order Details */}
              {expandedOrder === order.orderId && (
                <div className="px-4 pb-4 border-t border-border/30">
                  {/* All Items */}
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground mb-2">ORDER ITEMS</p>
                    {order.items.map((item: any, index: number) => (
                      <div key={index} className="flex gap-3 py-2">
                        <div className="w-16 h-16 bg-muted/30 rounded overflow-hidden flex-shrink-0">
                          {item.image ? (
                            <ImageWithFallback
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-6 h-6 text-muted-foreground/30" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{item.name}</p>
                          {(item.selectedSize || item.selectedColor) && (
                            <div className="flex gap-2 mt-1">
                              {item.selectedSize && (
                                <span className="text-xs text-muted-foreground">
                                  Size: {item.selectedSize}
                                </span>
                              )}
                              {item.selectedColor && (
                                <span className="text-xs text-muted-foreground">
                                  Color: {item.selectedColor}
                                </span>
                              )}
                            </div>
                          )}
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-muted-foreground">
                              Qty: {item.quantity}
                            </span>
                            <span className="text-sm font-medium">
                              {formatPrice({ usd: item.price * item.quantity, aed: item.price * item.quantity })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Separator className="my-3" />

                  {/* Order Summary */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatPrice({ usd: order.subtotal, aed: order.subtotal })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shipping</span>
                      <span>
                        {order.shipping === 0 ? (
                          <span className="text-green-500">FREE</span>
                        ) : (
                          formatPrice({ usd: order.shipping, aed: order.shipping })
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax</span>
                      <span>{formatPrice({ usd: order.tax, aed: order.tax })}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span className="text-primary">
                        {formatPrice({ usd: order.total, aed: order.total })}
                      </span>
                    </div>
                  </div>

                  <Separator className="my-3" />

                  {/* Shipping Address */}
                  {order.shippingAddress && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">SHIPPING ADDRESS</p>
                      <div className="text-sm space-y-1">
                        <p className="font-medium">{order.shippingAddress.fullName}</p>
                        <p className="text-muted-foreground">{order.shippingAddress.address}</p>
                        <p className="text-muted-foreground">
                          {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
                        </p>
                        <p className="text-muted-foreground">{order.shippingAddress.country}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
