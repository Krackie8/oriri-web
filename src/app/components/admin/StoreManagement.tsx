import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Progress } from '../ui/progress';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { Skeleton } from '../ui/skeleton';
import { useStore } from '../../contexts/StoreContext';
import { useAuth } from '../../hooks/useAuth';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner@2.0.3';
import AdminOrderManagement from './AdminOrderManagement';
import { 
  ShoppingBag, 
  Package, 
  TrendingUp, 
  Plus, 
  Edit, 
  Trash2,
  Eye,
  AlertTriangle,
  DollarSign,
  BarChart3,
  Upload,
  Download,
  Save,
  RefreshCw,
  Box,
  AlertCircle
} from 'lucide-react';

// Store statistics from backend
interface StoreStats {
  totalProducts: number;
  activeProducts: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
  byCategory: Record<string, number>;
  totalInventoryValue: number;
  averagePrice: number;
  featuredProducts: number;
  generatedAt: string;
}

export default function StoreManagement() {
  const {
    products,
    categories,
    isLoading: productsLoading,
    error: productsError,
    createProduct,
    updateProduct,
    deleteProduct,
    updateStock,
    settings,
    updateSettings,
    refreshProducts
  } = useStore();

  const { session } = useAuth();

  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'analytics' | 'settings'>('products');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  // Store statistics state
  const [storeStats, setStoreStats] = useState<StoreStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  // New product form state
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    category: '',
    priceUsd: '',
    priceAed: '',
    stock: '',
    featured: false,
    sizes: '',
    colors: '',
    tags: '',
    externalUrl: ''
  });

  // Edit product form state
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    category: '',
    priceUsd: '',
    priceAed: '',
    stock: '',
    featured: false,
    sizes: '',
    colors: '',
    tags: '',
    externalUrl: '',
    status: 'active'
  });

  // Load store statistics on mount and when products change
  useEffect(() => {
    // Only load stats if we have a session
    if (session?.access_token) {
      loadStoreStats();
    }
  }, [products.length, session?.access_token]);

  const loadStoreStats = async () => {
    // Don't attempt to load if no session
    if (!session?.access_token) {
      console.log('[StoreManagement] ⏸️ Skipping stats load - no session available');
      return;
    }

    setStatsLoading(true);
    setStatsError(null);

    try {
      const accessToken = session.access_token;

      console.log('[StoreManagement] 📊 Fetching store statistics...');
      console.log('[StoreManagement] 🔑 Using access token:', accessToken.substring(0, 20) + '...');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/admin/analytics/store`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('[StoreManagement] 📡 Response status:', response.status);
      console.log('[StoreManagement] 📡 Response headers:', Object.fromEntries(response.headers.entries()));

      // Get the raw response text first
      const responseText = await response.text();
      console.log('[StoreManagement] 📄 Raw response:', responseText.substring(0, 200));

      // Try to parse as JSON
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('[StoreManagement] ❌ JSON parse failed. Response was:', responseText);
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}`);
      }

      if (!response.ok || !result.success) {
        console.error('[StoreManagement] ❌ Failed to fetch store stats:', result);
        throw new Error(result.error || 'Failed to fetch store statistics');
      }

      console.log('[StoreManagement] ✅ Store statistics loaded:', result.data);
      setStoreStats(result.data);

    } catch (error) {
      console.error('[StoreManagement] ❌ Error loading store stats:', error);
      setStatsError(error instanceof Error ? error.message : 'Failed to load statistics');
    } finally {
      setStatsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>;
      case 'low_stock':
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Low Stock</Badge>;
      case 'out_of_stock':
        return <Badge variant="destructive">Out of Stock</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      case 'pending':
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Pending</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Processing</Badge>;
      case 'shipped':
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Shipped</Badge>;
      case 'delivered':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Delivered</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleCreateProduct = async () => {
    try {
      await createProduct({
        name: newProduct.name,
        description: newProduct.description,
        price: {
          usd: parseFloat(newProduct.priceUsd) || 0,
          aed: parseFloat(newProduct.priceAed) || 0
        },
        category: newProduct.category,
        inStock: parseInt(newProduct.stock) > 0,
        stock: parseInt(newProduct.stock) || 0,
        featured: newProduct.featured,
        status: parseInt(newProduct.stock) > 0 ? 'active' : 'out_of_stock',
        sizes: newProduct.sizes ? newProduct.sizes.split(',').map(s => s.trim()) : undefined,
        colors: newProduct.colors ? newProduct.colors.split(',').map(c => c.trim()) : undefined,
        tags: newProduct.tags ? newProduct.tags.split(',').map(t => t.trim()) : undefined,
        externalUrl: newProduct.externalUrl.trim()
      });

      // Reset form
      setNewProduct({
        name: '',
        description: '',
        category: '',
        priceUsd: '',
        priceAed: '',
        stock: '',
        featured: false,
        sizes: '',
        colors: '',
        tags: ''
      });
      setShowAddProduct(false);

      // Reload stats after creating product
      loadStoreStats();
    } catch (error) {
      console.error('Error creating product:', error);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteProduct(productId);
        // Reload stats after deleting product
        loadStoreStats();
      } catch (error) {
        console.error('Error deleting product:', error);
      }
    }
  };

  const handleUpdateStock = async (productId: string, newStock: number) => {
    try {
      await updateStock(productId, newStock);
      // Reload stats after updating stock
      loadStoreStats();
    } catch (error) {
      console.error('Error updating stock:', error);
    }
  };

  // Open edit dialog and populate form with product data
  const handleOpenEdit = (product: any) => {
    setEditingProduct(product);
    setEditForm({
      name: product.name,
      description: product.description || '',
      category: product.category,
      priceUsd: product.price.usd.toString(),
      priceAed: product.price.aed.toString(),
      stock: product.stock.toString(),
      featured: product.featured || false,
      sizes: product.sizes ? product.sizes.join(', ') : '',
      colors: product.colors ? product.colors.join(', ') : '',
      tags: product.tags ? product.tags.join(', ') : '',
      externalUrl: product.externalUrl || '',
      status: product.status || 'active'
    });
  };

  // Handle product update
  const handleEditProduct = async () => {
    if (!editingProduct) return;

    try {
      await updateProduct(editingProduct.id, {
        name: editForm.name,
        description: editForm.description,
        price: {
          usd: parseFloat(editForm.priceUsd) || 0,
          aed: parseFloat(editForm.priceAed) || 0
        },
        category: editForm.category,
        stock: parseInt(editForm.stock) || 0,
        featured: editForm.featured,
        status: editForm.status,
        sizes: editForm.sizes ? editForm.sizes.split(',').map(s => s.trim()) : undefined,
        colors: editForm.colors ? editForm.colors.split(',').map(c => c.trim()) : undefined,
        tags: editForm.tags ? editForm.tags.split(',').map(t => t.trim()) : undefined,
        externalUrl: editForm.externalUrl.trim()
      });

      // Close dialog and reset
      setEditingProduct(null);
      toast.success('Product updated successfully!');

      // Reload stats after updating product
      loadStoreStats();
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Failed to update product');
    }
  };

  // Calculate local metrics for display (fallback if stats aren't loaded yet)
  const localLowStockCount = products.filter(p => p.stock > 0 && p.stock <= 10).length;
  const localOutOfStockCount = products.filter(p => p.stock === 0).length;

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {(productsError || statsError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {productsError || statsError}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                refreshProducts();
                loadStoreStats();
              }}
              className="ml-3"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Store Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Inventory Value Card */}
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-500">
                  {settings.currency === 'USD' ? '$' : 'AED '}
                  {storeStats?.totalInventoryValue.toLocaleString() || '0'}
                </div>
                <p className="text-xs text-muted-foreground">Total stock value</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Total Products Card */}
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{storeStats?.totalProducts || products.length}</div>
                <p className="text-xs text-muted-foreground">
                  {storeStats?.activeProducts || products.filter(p => p.status === 'active').length} active
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* In Stock Card */}
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Healthy Stock</CardTitle>
            <Box className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-500">{storeStats?.inStock || 0}</div>
                <p className="text-xs text-muted-foreground">Well stocked items</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Stock Alerts Card */}
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-orange-500">
                  {(storeStats?.lowStock || localLowStockCount) + (storeStats?.outOfStock || localOutOfStockCount)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {storeStats?.lowStock || localLowStockCount} low, {storeStats?.outOfStock || localOutOfStockCount} out
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-muted/50 p-1 rounded-lg">
        <Button
          variant={activeTab === 'products' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('products')}
          className="flex-1"
        >
          <Package className="h-4 w-4 mr-2" />
          Products
        </Button>
        <Button
          variant={activeTab === 'orders' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('orders')}
          className="flex-1"
        >
          <ShoppingBag className="h-4 w-4 mr-2" />
          Orders
        </Button>
        <Button
          variant={activeTab === 'analytics' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('analytics')}
          className="flex-1"
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          Analytics
        </Button>
        <Button
          variant={activeTab === 'settings' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('settings')}
          className="flex-1"
        >
          <Save className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </div>

      {/* Products Tab */}
      {activeTab === 'products' && (
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Product Management</CardTitle>
                <CardDescription>Manage your merchandise inventory and pricing</CardDescription>
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    refreshProducts();
                    loadStoreStats();
                  }}
                  disabled={productsLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${productsLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Dialog open={showAddProduct} onOpenChange={setShowAddProduct}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Product
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Product</DialogTitle>
                      <DialogDescription>Create a new merchandise item for your store</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                      <Input 
                        placeholder="Product name" 
                        value={newProduct.name}
                        onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                      />
                      
                      <Select onValueChange={(value) => setNewProduct({...newProduct, category: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Apparel">Apparel</SelectItem>
                          <SelectItem value="Drinkware">Drinkware</SelectItem>
                          <SelectItem value="Stationery">Stationery</SelectItem>
                          <SelectItem value="Accessories">Accessories</SelectItem>
                          <SelectItem value="Artwork">Artwork</SelectItem>
                        </SelectContent>
                      </Select>

                      <div className="grid grid-cols-2 gap-2">
                        <Input 
                          placeholder="Price USD" 
                          type="number" 
                          step="0.01"
                          value={newProduct.priceUsd}
                          onChange={(e) => setNewProduct({...newProduct, priceUsd: e.target.value})}
                        />
                        <Input 
                          placeholder="Price AED" 
                          type="number" 
                          step="0.01"
                          value={newProduct.priceAed}
                          onChange={(e) => setNewProduct({...newProduct, priceAed: e.target.value})}
                        />
                      </div>

                      <Input 
                        placeholder="Initial stock" 
                        type="number" 
                        value={newProduct.stock}
                        onChange={(e) => setNewProduct({...newProduct, stock: e.target.value})}
                      />
                      
                      <Textarea 
                        placeholder="Product description" 
                        value={newProduct.description}
                        onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                      />

                      <Input 
                        placeholder="Sizes (comma separated, e.g., S, M, L, XL)" 
                        value={newProduct.sizes}
                        onChange={(e) => setNewProduct({...newProduct, sizes: e.target.value})}
                      />

                      <Input 
                        placeholder="Colors (comma separated, e.g., Black, White, Navy)" 
                        value={newProduct.colors}
                        onChange={(e) => setNewProduct({...newProduct, colors: e.target.value})}
                      />

                      <Input 
                        placeholder="Tags (comma separated, e.g., cotton, premium, limited)" 
                        value={newProduct.tags}
                        onChange={(e) => setNewProduct({...newProduct, tags: e.target.value})}
                      />

                      <Input
                        type="url"
                        placeholder="Digital product link (optional, e.g., https://gumroad.com/...)"
                        value={newProduct.externalUrl}
                        onChange={(e) => setNewProduct({...newProduct, externalUrl: e.target.value})}
                      />

                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="featured" 
                          checked={newProduct.featured}
                          onCheckedChange={(checked) => setNewProduct({...newProduct, featured: checked})}
                        />
                        <Label htmlFor="featured">Featured Product</Label>
                      </div>

                      <div className="flex space-x-2 pt-4">
                        <Button variant="outline" className="flex-1">
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Image
                        </Button>
                        <Button 
                          className="flex-1" 
                          onClick={handleCreateProduct}
                          disabled={!newProduct.name || !newProduct.category || !newProduct.priceUsd}
                        >
                          Create Product
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Edit Product Dialog */}
                <Dialog open={editingProduct !== null} onOpenChange={(open) => !open && setEditingProduct(null)}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Product</DialogTitle>
                      <DialogDescription>Update product information</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                      <Input 
                        placeholder="Product name" 
                        value={editForm.name}
                        onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                      />
                      
                      <Select value={editForm.category} onValueChange={(value) => setEditForm({...editForm, category: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Apparel">Apparel</SelectItem>
                          <SelectItem value="Drinkware">Drinkware</SelectItem>
                          <SelectItem value="Stationery">Stationery</SelectItem>
                          <SelectItem value="Accessories">Accessories</SelectItem>
                          <SelectItem value="Artwork">Artwork</SelectItem>
                        </SelectContent>
                      </Select>

                      <div className="grid grid-cols-2 gap-2">
                        <Input 
                          placeholder="Price USD" 
                          type="number" 
                          step="0.01"
                          value={editForm.priceUsd}
                          onChange={(e) => setEditForm({...editForm, priceUsd: e.target.value})}
                        />
                        <Input 
                          placeholder="Price AED" 
                          type="number" 
                          step="0.01"
                          value={editForm.priceAed}
                          onChange={(e) => setEditForm({...editForm, priceAed: e.target.value})}
                        />
                      </div>

                      <Input 
                        placeholder="Stock" 
                        type="number" 
                        value={editForm.stock}
                        onChange={(e) => setEditForm({...editForm, stock: e.target.value})}
                      />
                      
                      <Textarea 
                        placeholder="Product description" 
                        value={editForm.description}
                        onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                      />

                      <Input 
                        placeholder="Sizes (comma separated, e.g., S, M, L, XL)" 
                        value={editForm.sizes}
                        onChange={(e) => setEditForm({...editForm, sizes: e.target.value})}
                      />

                      <Input 
                        placeholder="Colors (comma separated, e.g., Black, White, Navy)" 
                        value={editForm.colors}
                        onChange={(e) => setEditForm({...editForm, colors: e.target.value})}
                      />

                      <Input 
                        placeholder="Tags (comma separated, e.g., cotton, premium, limited)" 
                        value={editForm.tags}
                        onChange={(e) => setEditForm({...editForm, tags: e.target.value})}
                      />

                      <Input
                        type="url"
                        placeholder="Digital product link (optional, e.g., https://gumroad.com/...)"
                        value={editForm.externalUrl}
                        onChange={(e) => setEditForm({...editForm, externalUrl: e.target.value})}
                      />

                      <Select value={editForm.status} onValueChange={(value) => setEditForm({...editForm, status: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>

                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="edit-featured" 
                          checked={editForm.featured}
                          onCheckedChange={(checked) => setEditForm({...editForm, featured: checked})}
                        />
                        <Label htmlFor="edit-featured">Featured Product</Label>
                      </div>

                      <div className="flex space-x-2 pt-4">
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => setEditingProduct(null)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          className="flex-1" 
                          onClick={handleEditProduct}
                          disabled={!editForm.name || !editForm.category || !editForm.priceUsd}
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {productsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No products yet</h3>
                <p className="text-muted-foreground mb-4">Get started by adding your first product</p>
                <Button onClick={() => setShowAddProduct(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price ({settings.currency})</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{product.name}</div>
                          {product.featured && (
                            <Badge variant="outline" className="text-xs mt-1">Featured</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{product.category}</TableCell>
                      <TableCell>
                        {settings.currency === 'USD' 
                          ? `$${product.price.usd.toFixed(2)}` 
                          : `AED ${product.price.aed.toFixed(2)}`
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span className={product.stock === 0 ? 'text-red-500' : product.stock <= 10 ? 'text-orange-500' : ''}>
                            {product.stock}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newStock = prompt('Enter new stock quantity:', product.stock.toString());
                              if (newStock && !isNaN(parseInt(newStock))) {
                                handleUpdateStock(product.id, parseInt(newStock));
                              }
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(product.status)}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(product)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteProduct(product.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Orders Tab - Coming Soon */}
      {activeTab === 'orders' && (
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader>
            <CardTitle>Order Management</CardTitle>
            <CardDescription>Track and manage customer orders</CardDescription>
          </CardHeader>
          <CardContent>
            <AdminOrderManagement />
          </CardContent>
        </Card>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Breakdown */}
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Category Breakdown</CardTitle>
                  <CardDescription>Products by category</CardDescription>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={loadStoreStats}
                  disabled={statsLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${statsLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : storeStats && Object.keys(storeStats.byCategory).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(storeStats.byCategory).map(([category, count]) => {
                    const percentage = (count / storeStats.totalProducts) * 100;
                    return (
                      <div key={category} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">{category}</span>
                          <span className="text-sm text-muted-foreground">{count} products</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{percentage.toFixed(1)}% of total</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No category data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Inventory Health */}
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader>
              <CardTitle>Inventory Health</CardTitle>
              <CardDescription>Stock levels and alerts</CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-green-500/10 p-4 rounded-lg text-center border border-green-500/30">
                      <div className="text-2xl font-bold text-green-500">
                        {storeStats?.inStock || 0}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Healthy Stock</p>
                    </div>
                    <div className="bg-orange-500/10 p-4 rounded-lg text-center border border-orange-500/30">
                      <div className="text-2xl font-bold text-orange-500">
                        {storeStats?.lowStock || localLowStockCount}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Low Stock</p>
                    </div>
                    <div className="bg-red-500/10 p-4 rounded-lg text-center border border-red-500/30">
                      <div className="text-2xl font-bold text-red-500">
                        {storeStats?.outOfStock || localOutOfStockCount}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Out of Stock</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mt-6">
                    <h4 className="font-medium flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-2 text-orange-500" />
                      Reorder Recommendations
                    </h4>
                    {products.filter(p => p.stock <= 10).length > 0 ? (
                      products
                        .filter(p => p.stock <= 10)
                        .map(product => (
                          <div key={product.id} className="flex justify-between items-center p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                            <div>
                              <span className="text-sm font-medium">{product.name}</span>
                              <p className="text-xs text-muted-foreground">
                                {product.stock === 0 ? 'Out of stock' : `Only ${product.stock} left`}
                              </p>
                            </div>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                const newStock = prompt('Enter reorder quantity:', '50');
                                if (newStock && !isNaN(parseInt(newStock))) {
                                  handleUpdateStock(product.id, product.stock + parseInt(newStock));
                                }
                              }}
                            >
                              Restock
                            </Button>
                          </div>
                        ))
                    ) : (
                      <div className="text-center py-6 text-muted-foreground text-sm">
                        All products are well stocked! 🎉
                      </div>
                    )}
                  </div>

                  {/* Additional Stats */}
                  <div className="mt-6 pt-6 border-t border-border">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-lg font-bold">
                          {settings.currency === 'USD' ? '$' : 'AED '}
                          {storeStats?.averagePrice || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">Average Price</p>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-purple-500">
                          {storeStats?.featuredProducts || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">Featured Products</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader>
            <CardTitle>Store Settings</CardTitle>
            <CardDescription>Configure your store preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <Label className="mb-2 block">Default Currency</Label>
                <Select 
                  value={settings.currency} 
                  onValueChange={(value: 'USD' | 'AED') => updateSettings({ currency: value })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="AED">AED (د.إ)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-2 block">Free Shipping Threshold</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">USD</Label>
                    <Input 
                      type="number"
                      value={settings.freeShippingThreshold.usd}
                      onChange={(e) => updateSettings({ 
                        freeShippingThreshold: { 
                          ...settings.freeShippingThreshold, 
                          usd: parseFloat(e.target.value) || 0 
                        } 
                      })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">AED</Label>
                    <Input 
                      type="number"
                      value={settings.freeShippingThreshold.aed}
                      onChange={(e) => updateSettings({ 
                        freeShippingThreshold: { 
                          ...settings.freeShippingThreshold, 
                          aed: parseFloat(e.target.value) || 0 
                        } 
                      })}
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Tax Rate (%)</Label>
                <Input 
                  type="number"
                  step="0.01"
                  value={(settings.taxRate * 100).toFixed(2)}
                  onChange={(e) => updateSettings({ taxRate: parseFloat(e.target.value) / 100 || 0 })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Current tax rate: {(settings.taxRate * 100).toFixed(2)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button 
              variant="outline" 
              className="flex flex-col space-y-2 h-auto py-4"
              onClick={() => {
                toast.info('Export feature coming soon!');
              }}
            >
              <Download className="h-6 w-6" />
              <span>Export Products</span>
            </Button>
            <Button 
              variant="outline" 
              className="flex flex-col space-y-2 h-auto py-4"
              onClick={() => {
                toast.info('Import feature coming soon!');
              }}
            >
              <Upload className="h-6 w-6" />
              <span>Import Products</span>
            </Button>
            <Button 
              variant="outline" 
              className="flex flex-col space-y-2 h-auto py-4"
              onClick={loadStoreStats}
              disabled={statsLoading}
            >
              <BarChart3 className={`h-6 w-6 ${statsLoading ? 'animate-pulse' : ''}`} />
              <span>Refresh Stats</span>
            </Button>
            <Button 
              variant="outline" 
              className="flex flex-col space-y-2 h-auto py-4"
              onClick={() => {
                refreshProducts();
                loadStoreStats();
              }}
              disabled={productsLoading || statsLoading}
            >
              <RefreshCw className={`h-6 w-6 ${(productsLoading || statsLoading) ? 'animate-spin' : ''}`} />
              <span>Refresh All</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}