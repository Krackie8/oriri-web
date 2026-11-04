import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Separator } from '../ui/separator';
import {
  Package,
  ShoppingBag,
  Truck,
  Clock,
  XCircle,
  CheckCircle,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  ChevronDown,
  ChevronUp,
  DollarSign,
  TrendingUp,
  Users,
  Calendar,
  Edit,
} from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { useCart } from '../../contexts/CartContext';
import { supabase } from '../../utils/supabase/client';
import { toast } from 'sonner@2.0.3';

interface AdminOrderManagementProps {
  // Optional props if needed
}

export default function AdminOrderManagement({}: AdminOrderManagementProps) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'total' | 'customer'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Expanded order details
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  
  // Status update dialog
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);
  
  const { formatPrice } = useCart();

  // Fetch all orders (admin endpoint)
  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[AdminOrderManagement] Fetching all orders...');
      
      // Get fresh session like AdminContext does
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated - please login');
      }

      console.log('[AdminOrderManagement] Session:', {
        hasSession: !!session,
        hasAccessToken: !!session?.access_token,
        tokenLength: session?.access_token?.length,
        user: session?.user?.email
      });

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/orders`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch orders');
      }

      console.log('[AdminOrderManagement] Orders fetched successfully:', data.orders.length);
      setOrders(data.orders || []);
    } catch (err: any) {
      console.error('[AdminOrderManagement] Error fetching orders:', err);
      setError(err.message || 'Failed to load orders');
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  // Update order status
  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      setIsUpdating(true);

      console.log('[AdminOrderManagement] Updating order status:', orderId, status);

      // Get fresh session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated - please login');
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/orders/${orderId}/status`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status })
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update order status');
      }

      console.log('[AdminOrderManagement] Order status updated successfully');
      
      // Update local state
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.orderId === orderId
            ? { ...order, status, updatedAt: new Date().toISOString() }
            : order
        )
      );

      toast.success('Order status updated successfully');
      setUpdatingOrderId(null);
    } catch (err: any) {
      console.error('[AdminOrderManagement] Error updating order status:', err);
      toast.error(err.message || 'Failed to update order status');
    } finally {
      setIsUpdating(false);
    }
  };

  // Export orders to CSV
  const exportToCSV = () => {
    try {
      console.log('[AdminOrderManagement] Exporting orders to CSV...');

      // Prepare CSV data
      const headers = [
        'Order Number',
        'Customer Email',
        'Status',
        'Items',
        'Subtotal',
        'Shipping',
        'Tax',
        'Total',
        'Order Date',
        'Shipping Address'
      ];

      const rows = filteredAndSortedOrders.map(order => [
        order.orderNumber,
        order.userEmail || 'N/A',
        order.status,
        order.items?.length || 0,
        order.subtotal || 0,
        order.shipping || 0,
        order.tax || 0,
        order.total || 0,
        new Date(order.createdAt).toLocaleString(),
        order.shippingAddress 
          ? `${order.shippingAddress.address}, ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postalCode}, ${order.shippingAddress.country}`
          : 'N/A'
      ]);

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `orders_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Orders exported successfully');
      console.log('[AdminOrderManagement] CSV export completed');
    } catch (err: any) {
      console.error('[AdminOrderManagement] Error exporting CSV:', err);
      toast.error('Failed to export orders');
    }
  };

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

  // Filter and sort orders
  const filteredAndSortedOrders = orders
    .filter(order => {
      // Status filter
      if (statusFilter !== 'all' && order.status !== statusFilter) {
        return false;
      }

      // Search filter (order number or email)
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesOrderNumber = order.orderNumber?.toLowerCase().includes(search);
        const matchesEmail = order.userEmail?.toLowerCase().includes(search);
        return matchesOrderNumber || matchesEmail;
      }

      return true;
    })
    .sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'total':
          comparison = (a.total || 0) - (b.total || 0);
          break;
        case 'customer':
          comparison = (a.userEmail || '').localeCompare(b.userEmail || '');
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Calculate analytics
  const analytics = {
    totalOrders: orders.length,
    totalRevenue: orders.reduce((sum, order) => sum + (order.total || 0), 0),
    pendingOrders: orders.filter(o => o.status === 'pending').length,
    processingOrders: orders.filter(o => o.status === 'processing').length,
    shippedOrders: orders.filter(o => o.status === 'shipped').length,
    deliveredOrders: orders.filter(o => o.status === 'delivered').length,
    cancelledOrders: orders.filter(o => o.status === 'cancelled').length,
    averageOrderValue: orders.length > 0 
      ? orders.reduce((sum, order) => sum + (order.total || 0), 0) / orders.length 
      : 0,
    uniqueCustomers: new Set(orders.map(o => o.userId)).size,
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Toggle order expansion
  const toggleOrder = (orderId: string) => {
    setExpandedOrder(prev => prev === orderId ? null : orderId);
  };

  return (
    <div className="space-y-6">
      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.uniqueCustomers} unique customers
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPrice({ usd: analytics.totalRevenue, aed: analytics.totalRevenue })}
            </div>
            <p className="text-xs text-muted-foreground">
              Avg: {formatPrice({ usd: analytics.averageOrderValue, aed: analytics.averageOrderValue })}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.pendingOrders}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.processingOrders} processing
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fulfilled</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.deliveredOrders}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.shippedOrders} in transit
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Order Management</CardTitle>
              <CardDescription>
                View, search, and manage all customer orders
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchOrders}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
                disabled={orders.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by order # or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select
              value={`${sortBy}-${sortOrder}`}
              onValueChange={(value) => {
                const [by, order] = value.split('-') as [typeof sortBy, typeof sortOrder];
                setSortBy(by);
                setSortOrder(order);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Newest First</SelectItem>
                <SelectItem value="date-asc">Oldest First</SelectItem>
                <SelectItem value="total-desc">Highest Value</SelectItem>
                <SelectItem value="total-asc">Lowest Value</SelectItem>
                <SelectItem value="customer-asc">Customer A-Z</SelectItem>
                <SelectItem value="customer-desc">Customer Z-A</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-muted-foreground">Loading orders...</p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="text-center py-12">
              <XCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
              <p className="text-destructive mb-2">Failed to load orders</p>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button variant="outline" onClick={fetchOrders}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && filteredAndSortedOrders.length === 0 && (
            <div className="text-center py-12">
              <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-1">
                {searchTerm || statusFilter !== 'all' 
                  ? 'No orders match your filters' 
                  : 'No orders yet'}
              </p>
              <p className="text-sm text-muted-foreground">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Orders will appear here when customers make purchases'}
              </p>
            </div>
          )}

          {/* Orders Table */}
          {!loading && !error && filteredAndSortedOrders.length > 0 && (
            <div className="space-y-3">
              {filteredAndSortedOrders.map((order) => (
                <div
                  key={order.orderId}
                  className="bg-card/30 rounded-lg border border-border/50 overflow-hidden"
                >
                  {/* Order Header */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="font-mono text-sm font-medium">
                            {order.orderNumber}
                          </p>
                          {getStatusBadge(order.status)}
                        </div>
                        <div className="text-sm space-y-1">
                          <p className="text-muted-foreground">
                            <Users className="w-3 h-3 inline mr-1" />
                            {order.userEmail || 'Unknown customer'}
                          </p>
                          <p className="text-muted-foreground">
                            <Calendar className="w-3 h-3 inline mr-1" />
                            {formatDate(order.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-lg text-foreground">
                          {formatPrice({ usd: order.total, aed: order.total })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleOrder(order.orderId)}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            {expandedOrder === order.orderId ? 'Hide' : 'View'}
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setUpdatingOrderId(order.orderId);
                                  setNewStatus(order.status);
                                }}
                              >
                                <Edit className="w-3 h-3 mr-1" />
                                Status
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-background/95 backdrop-blur-sm border-border/50">
                              <DialogHeader>
                                <DialogTitle>Update Order Status</DialogTitle>
                                <DialogDescription>
                                  Change the status of order {order.orderNumber}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <Select
                                  value={newStatus}
                                  onValueChange={setNewStatus}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="processing">Processing</SelectItem>
                                    <SelectItem value="shipped">Shipped</SelectItem>
                                    <SelectItem value="delivered">Delivered</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <DialogFooter>
                                <Button
                                  onClick={() => updateOrderStatus(order.orderId, newStatus)}
                                  disabled={isUpdating || newStatus === order.status}
                                >
                                  {isUpdating ? 'Updating...' : 'Update Status'}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Order Details */}
                  {expandedOrder === order.orderId && (
                    <div className="px-4 pb-4 border-t border-border/30">
                      {/* Order Items */}
                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground mb-2">ORDER ITEMS</p>
                        {order.items?.map((item: any, index: number) => (
                          <div key={index} className="flex gap-3 py-2 border-b border-border/20 last:border-0">
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
                                  Qty: {item.quantity} × {formatPrice({ usd: item.price, aed: item.price })}
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
                          <div className="text-sm space-y-1 bg-muted/30 p-3 rounded">
                            <p className="font-medium">{order.shippingAddress.fullName}</p>
                            <p className="text-muted-foreground">{order.shippingAddress.address}</p>
                            <p className="text-muted-foreground">
                              {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
                            </p>
                            <p className="text-muted-foreground">{order.shippingAddress.country}</p>
                            {order.shippingAddress.phone && (
                              <p className="text-muted-foreground">📞 {order.shippingAddress.phone}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Results Summary */}
              <div className="text-center text-sm text-muted-foreground pt-2">
                Showing {filteredAndSortedOrders.length} of {orders.length} orders
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}