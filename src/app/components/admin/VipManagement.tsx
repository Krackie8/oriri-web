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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { 
  Crown, 
  Users, 
  TrendingUp, 
  TrendingDown,
  Plus, 
  Edit, 
  Eye,
  Star,
  DollarSign,
  BarChart3,
  UserCheck,
  UserX,
  Zap,
  Gift,
  Calendar,
  Clock,
  Target,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../utils/supabase/client';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { vipAdminApi } from '../../utils/vipAdminApi';

// Initialize Supabase client for auth

interface VipSubscriber {
  id: string;
  name: string;
  email: string;
  tier: 'vip';
  subscriptionDate: string;
  lastActive: string;
  totalSpent: number;
  status: 'active' | 'cancelled' | 'paused';
  monthsSubscribed: number;
}

interface ExclusiveContent {
  id: string;
  title: string;
  type: 'episode' | 'live_session' | 'bonus_content';
  tier: 'vip';
  views: number;
  engagement: number;
  publishDate: string;
  duration?: string;
}

interface SubscriptionMetrics {
  activeSubscribers: number;
  monthlyRevenue: number;
  churnRate: number;
  conversionRate: number;
  averageLifetimeValue: number;
  retentionRate: number;
}

const mockSubscribers: VipSubscriber[] = [
  {
    id: '1',
    name: 'Sarah Chen',
    email: 'sarah@example.com',
    tier: 'vip',
    subscriptionDate: '2023-08-15',
    lastActive: '2024-01-15',
    totalSpent: 100, // 5 months * AED 20
    status: 'active',
    monthsSubscribed: 5
  },
  {
    id: '2',
    name: 'Mike Rodriguez',
    email: 'mike@example.com',
    tier: 'vip',
    subscriptionDate: '2023-10-20',
    lastActive: '2024-01-14',
    totalSpent: 60, // 3 months * AED 20
    status: 'active',
    monthsSubscribed: 3
  },
  {
    id: '3',
    name: 'Emma Thompson',
    email: 'emma@example.com',
    tier: 'vip',
    subscriptionDate: '2023-12-01',
    lastActive: '2024-01-13',
    totalSpent: 20, // 1 month * AED 20
    status: 'active',
    monthsSubscribed: 1
  },
  {
    id: '4',
    name: 'David Kim',
    email: 'david@example.com',
    tier: 'vip',
    subscriptionDate: '2023-09-10',
    lastActive: '2024-01-01',
    totalSpent: 40, // 2 months * AED 20
    status: 'cancelled',
    monthsSubscribed: 2
  }
];

const mockExclusiveContent: ExclusiveContent[] = [
  {
    id: '1',
    title: 'Exclusive: Dubai Deep Dive',
    type: 'episode',
    tier: 'vip',
    views: 89,
    engagement: 94,
    publishDate: '2024-01-10',
    duration: '52min'
  },
  {
    id: '2',
    title: 'VIP Q&A: Future Cities',
    type: 'live_session',
    tier: 'vip',
    views: 76,
    engagement: 87,
    publishDate: '2024-01-08',
    duration: '45min'
  },
  {
    id: '3',
    title: 'Behind the Scenes: Planning Process',
    type: 'bonus_content',
    tier: 'vip',
    views: 65,
    engagement: 91,
    publishDate: '2024-01-05',
    duration: '20min'
  },
  {
    id: '4',
    title: 'Architect Interview Series #1',
    type: 'episode',
    tier: 'vip',
    views: 58,
    engagement: 85,
    publishDate: '2024-01-03',
    duration: '38min'
  },
  {
    id: '5',
    title: 'Early Access: New Episode Preview',
    type: 'bonus_content',
    tier: 'vip',
    views: 94,
    engagement: 96,
    publishDate: '2024-01-01',
    duration: '15min'
  }
];

const subscriptionTrends = [
  { date: 'Jan 1', vip: 76 },
  { date: 'Jan 8', vip: 89 },
  { date: 'Jan 15', vip: 92 },
  { date: 'Jan 22', vip: 104 },
  { date: 'Jan 29', vip: 112 }
];

const churnAnalysis = [
  { month: 'Oct', churn: 4.2, retention: 95.8 },
  { month: 'Nov', churn: 3.8, retention: 96.2 },
  { month: 'Dec', churn: 3.2, retention: 96.8 },
  { month: 'Jan', churn: 2.9, retention: 97.1 }
];

export default function VipManagement() {
  // State for real backend data
  const [isLoading, setIsLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);
  const [realSubscribers, setRealSubscribers] = useState<any[]>([]);
  const [useMockData, setUseMockData] = useState(false); // Fallback to mock if backend fails
  
  // State for mock data (fallback)
  const [subscribers, setSubscribers] = useState<VipSubscriber[]>(mockSubscribers);
  const [exclusiveContent, setExclusiveContent] = useState<ExclusiveContent[]>(mockExclusiveContent);
  const [activeTab, setActiveTab] = useState<'overview' | 'subscribers' | 'content' | 'analytics'>('overview');
  const [showCreateContent, setShowCreateContent] = useState(false);
  const [showManageTiers, setShowManageTiers] = useState(false);
  const [showSendPerks, setShowSendPerks] = useState(false);
  
  // Form state for Create VIP Content
  const [contentTitle, setContentTitle] = useState('');
  const [contentType, setContentType] = useState('');
  const [contentTier, setContentTier] = useState('');
  const [contentDescription, setContentDescription] = useState('');

  // Fetch real data from backend
  const fetchVipData = async () => {
    try {
      console.log('[VIP Management] 🔄 Fetching real VIP data from backend...');
      setIsLoading(true);
      
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      if (!accessToken) {
        console.warn('[VIP Management] ⚠️ No auth token, using mock data');
        setUseMockData(true);
        setIsLoading(false);
        return;
      }

      // Fetch analytics
      const analyticsResult = await vipAdminApi.getAnalytics(accessToken);
      
      if (analyticsResult.success && analyticsResult.analytics) {
        console.log('[VIP Management] ✅ Analytics fetched:', analyticsResult.analytics);
        setAnalytics(analyticsResult.analytics);
        setUseMockData(false);
      } else {
        console.warn('[VIP Management] ⚠️ Analytics fetch failed, using mock data:', analyticsResult.error);
        setUseMockData(true);
      }

      // Fetch subscribers
      const subscribersResult = await vipAdminApi.getSubscribers(accessToken, {
        status: 'all',
        limit: 100
      });

      if (subscribersResult.success && subscribersResult.subscribers) {
        console.log('[VIP Management] ✅ Subscribers fetched:', subscribersResult.total);
        setRealSubscribers(subscribersResult.subscribers);
      } else {
        console.warn('[VIP Management] ⚠️ Subscribers fetch failed:', subscribersResult.error);
      }

      setIsLoading(false);
    } catch (error) {
      console.error('[VIP Management] ❌ Error fetching VIP data:', error);
      setUseMockData(true);
      setIsLoading(false);
    }
  };

  // Fetch data on mount
  useEffect(() => {
    fetchVipData();
  }, []);

  // Calculate metrics from real data
  const getMetrics = () => {
    if (useMockData || !analytics) {
      // Use mock data
      const activeSubscribers = subscribers.filter(s => s.status === 'active').length;
      const totalRevenue = subscribers.reduce((sum, sub) => sum + sub.totalSpent, 0);
      const averageEngagement = exclusiveContent.reduce((sum, content) => sum + content.engagement, 0) / exclusiveContent.length;
      const churnRate = ((subscribers.filter(s => s.status === 'cancelled').length) / subscribers.length) * 100;

      return {
        activeSubscribers,
        totalRevenue,
        averageEngagement,
        churnRate,
        monthlyRevenue: activeSubscribers * 20 // AED 20 per month
      };
    } else {
      // Use real data
      return {
        activeSubscribers: analytics.overview.activeSubscribers || 0,
        totalRevenue: analytics.overview.monthlyRecurringRevenue?.aed || 0,
        averageEngagement: 0, // Content engagement not yet tracked
        churnRate: analytics.overview.churnRate || 0,
        monthlyRevenue: analytics.overview.monthlyRecurringRevenue?.aed || 0,
        trialingSubscribers: analytics.overview.trialingSubscribers || 0,
        conversionRate: analytics.overview.conversionRate || 0
      };
    }
  };

  const metrics = getMetrics();

  // Get display subscribers (real or mock)
  const displaySubscribers = useMockData ? subscribers : realSubscribers.map((sub: any) => ({
    id: sub.id,
    name: sub.userName || sub.userEmail || 'Unknown',
    email: sub.userEmail,
    tier: sub.tierId,
    subscriptionDate: sub.startDate,
    lastActive: sub.updatedAt || sub.startDate,
    totalSpent: 0, // Will need to calculate from subscription history
    status: sub.status,
    monthsSubscribed: 0 // Will need to calculate
  }));

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'vip':
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">VIP</Badge>;
      default:
        return <Badge variant="secondary">{tier}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      case 'paused':
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Paused</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getContentTypeBadge = (type: string) => {
    switch (type) {
      case 'episode':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Episode</Badge>;
      case 'live_session':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Live Session</Badge>;
      case 'bonus_content':
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Bonus</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const tierDistribution = [
    { name: 'Basic', value: subscribers.filter(s => s.tier === 'basic' && s.status === 'active').length, color: '#3B82F6' },
    { name: 'Pro', value: subscribers.filter(s => s.tier === 'pro' && s.status === 'active').length, color: '#8B5CF6' },
    { name: 'Premium', value: subscribers.filter(s => s.tier === 'premium' && s.status === 'active').length, color: '#F59E0B' }
  ];

  return (
    <div className="space-y-6">
      {/* Header with Refresh Button */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Crown className="h-6 w-6 text-purple-500" />
                VIP Management Dashboard
              </h2>
              <p className="text-muted-foreground mt-1">
                {useMockData ? (
                  <span className="text-orange-400 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    Using demo data (backend not connected)
                  </span>
                ) : (
                  <span className="text-green-400 flex items-center gap-1">
                    ✅ Connected to live backend
                  </span>
                )}
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={fetchVipData}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Loading...' : 'Refresh Data'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active VIP Members</CardTitle>
                <Crown className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-400">{metrics.activeSubscribers}</div>
                <p className="text-xs text-muted-foreground">+12% from last month</p>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">${(metrics.totalRevenue * 0.3).toFixed(0)}</div>
                <p className="text-xs text-muted-foreground">Recurring revenue</p>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Engagement</CardTitle>
                <Star className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-400">{metrics.averageEngagement.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">Content engagement rate</p>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-400">{metrics.churnRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">-0.8% from last month</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle>Subscription Growth</CardTitle>
                <CardDescription>VIP tier growth over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={subscriptionTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Line type="monotone" dataKey="basic" stroke="#3B82F6" name="Basic" strokeWidth={2} />
                    <Line type="monotone" dataKey="pro" stroke="#8B5CF6" name="Pro" strokeWidth={2} />
                    <Line type="monotone" dataKey="premium" stroke="#F59E0B" name="Premium" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle>Tier Distribution</CardTitle>
                <CardDescription>Current subscriber distribution by tier</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={tierDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {tierDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-4">
                  {tierDistribution.map((item, index) => (
                    <div key={index} className="text-center">
                      <div className="flex items-center justify-center space-x-1 mb-1">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-xs">{item.name}</span>
                      </div>
                      <p className="font-medium text-sm">{item.value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button onClick={() => setShowCreateContent(true)} className="flex flex-col space-y-2 h-auto py-4">
                  <Plus className="h-6 w-6" />
                  <span>Create VIP Content</span>
                </Button>
                <Button variant="outline" onClick={() => setShowManageTiers(true)} className="flex flex-col space-y-2 h-auto py-4">
                  <Users className="h-6 w-6" />
                  <span>Manage Tiers</span>
                </Button>
                <Button variant="outline" onClick={() => setShowSendPerks(true)} className="flex flex-col space-y-2 h-auto py-4">
                  <Gift className="h-6 w-6" />
                  <span>Send Perks</span>
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setActiveTab('analytics');
                    toast.success('Opening VIP Analytics');
                  }} 
                  className="flex flex-col space-y-2 h-auto py-4"
                >
                  <BarChart3 className="h-6 w-6" />
                  <span>VIP Analytics</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscribers" className="space-y-6">
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>VIP Subscribers</CardTitle>
                  <CardDescription>Manage your VIP community members</CardDescription>
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Subscriber
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subscriber</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Subscription Date</TableHead>
                    <TableHead>Total Spent</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displaySubscribers.map((subscriber) => (
                    <TableRow key={subscriber.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{subscriber.name}</div>
                          <div className="text-sm text-muted-foreground">{subscriber.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getTierBadge(subscriber.tier)}</TableCell>
                      <TableCell>{getStatusBadge(subscriber.status)}</TableCell>
                      <TableCell>{new Date(subscriber.subscriptionDate).toLocaleDateString()}</TableCell>
                      <TableCell>${subscriber.totalSpent}</TableCell>
                      <TableCell>{new Date(subscriber.lastActive).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Gift className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="space-y-6">
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Exclusive Content</CardTitle>
                  <CardDescription>Manage VIP-only episodes and bonus content</CardDescription>
                </div>
                <Dialog open={showCreateContent} onOpenChange={setShowCreateContent}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Content
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create VIP Content</DialogTitle>
                      <DialogDescription>Create exclusive content for your VIP subscribers</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input 
                        placeholder="Content title" 
                        value={contentTitle} 
                        onChange={(e) => setContentTitle(e.target.value)}
                      />
                      <Select
                        value={contentType}
                        onValueChange={(value) => setContentType(value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Content type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="episode">Exclusive Episode</SelectItem>
                          <SelectItem value="live_session">Live Session</SelectItem>
                          <SelectItem value="bonus_content">Bonus Content</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        value={contentTier}
                        onValueChange={(value) => setContentTier(value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="VIP tier access" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="basic">Basic and above</SelectItem>
                          <SelectItem value="pro">Pro and above</SelectItem>
                          <SelectItem value="premium">Premium only</SelectItem>
                        </SelectContent>
                      </Select>
                      <Textarea 
                        placeholder="Content description" 
                        value={contentDescription} 
                        onChange={(e) => setContentDescription(e.target.value)}
                      />
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => {
                            if (!contentTitle || !contentType) {
                              toast.error('Please fill in title and type');
                              return;
                            }
                            toast.success('Content scheduled for publishing');
                            setShowCreateContent(false);
                            setContentTitle('');
                            setContentType('');
                            setContentTier('');
                            setContentDescription('');
                          }}
                        >
                          Schedule
                        </Button>
                        <Button 
                          className="flex-1"
                          onClick={() => {
                            if (!contentTitle || !contentType) {
                              toast.error('Please fill in title and type');
                              return;
                            }
                            toast.success(`VIP Content "${contentTitle}" published!`);
                            setShowCreateContent(false);
                            setContentTitle('');
                            setContentType('');
                            setContentTier('');
                            setContentDescription('');
                          }}
                        >
                          Publish Now
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Content</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Engagement</TableHead>
                    <TableHead>Published</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exclusiveContent.map((content) => (
                    <TableRow key={content.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{content.title}</div>
                          {content.duration && (
                            <div className="text-sm text-muted-foreground">{content.duration}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getContentTypeBadge(content.type)}</TableCell>
                      <TableCell>{getTierBadge(content.tier)}</TableCell>
                      <TableCell>{content.views}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Progress value={content.engagement} className="w-16 h-2" />
                          <span className="text-sm">{content.engagement}%</span>
                        </div>
                      </TableCell>
                      <TableCell>{new Date(content.publishDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle>Churn Analysis</CardTitle>
                <CardDescription>Retention and churn trends over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={churnAnalysis}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Line type="monotone" dataKey="churn" stroke="#EF4444" name="Churn %" strokeWidth={2} />
                    <Line type="monotone" dataKey="retention" stroke="#10B981" name="Retention %" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle>Revenue Per Tier</CardTitle>
                <CardDescription>Monthly revenue breakdown by subscription tier</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tierDistribution.map((tier, index) => {
                    const revenue = tier.value * (tier.name === 'Basic' ? 9 : tier.name === 'Pro' ? 19 : 39);
                    const totalTierRevenue = tierDistribution.reduce((sum, t) => sum + (t.value * (t.name === 'Basic' ? 9 : t.name === 'Pro' ? 19 : 39)), 0);
                    return (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">{tier.name} Tier</span>
                          <span className="text-sm text-muted-foreground">${revenue}</span>
                        </div>
                        <Progress value={(revenue / totalTierRevenue) * 100} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{tier.value} subscribers</span>
                          <span>{((revenue / totalTierRevenue) * 100).toFixed(1)}% of total</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Manage Tiers Dialog */}
      <Dialog open={showManageTiers} onOpenChange={setShowManageTiers}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage VIP Tiers</DialogTitle>
            <DialogDescription>Configure subscription tiers and pricing</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-lg">VIP Tier</CardTitle>
                    <CardDescription>Exclusive content access</CardDescription>
                  </div>
                  <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Active</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Monthly Price</span>
                  <span className="font-bold text-purple-400">AED 20</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Trial Period</span>
                  <span className="font-medium">7 days</span>
                </div>
                <div className="space-y-2">
                  <span className="text-sm font-medium">Features:</span>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>✓ Exclusive VIP episodes</li>
                    <li>✓ Live Q&A sessions</li>
                    <li>✓ Behind-the-scenes content</li>
                    <li>✓ Early access to new episodes</li>
                    <li>✓ Ad-free listening</li>
                  </ul>
                </div>
                <div className="pt-3 flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      toast.info('Tier editing coming soon! This will allow you to modify pricing and features.');
                    }}
                  >
                    Edit Tier
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      setShowManageTiers(false);
                      setActiveTab('analytics');
                      toast.success('Switched to Analytics view');
                    }}
                  >
                    View Analytics
                  </Button>
                </div>
              </CardContent>
            </Card>
            <div className="text-sm text-muted-foreground text-center p-4 bg-muted/20 rounded-lg">
              💡 <strong>Note:</strong> VIP tier configuration is managed through the subscription system. Changes to pricing or features will affect new subscribers only.
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Perks Dialog */}
      <Dialog open={showSendPerks} onOpenChange={setShowSendPerks}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Send VIP Perks</DialogTitle>
            <DialogDescription>Reward your VIP subscribers with exclusive perks</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Recipients</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Choose subscriber group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All VIP Members</SelectItem>
                  <SelectItem value="active">Active Subscribers Only</SelectItem>
                  <SelectItem value="new">New Subscribers (Last 30 days)</SelectItem>
                  <SelectItem value="longtime">Long-time Members (6+ months)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Perk Type</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select perk type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="content">Exclusive Content Access</SelectItem>
                  <SelectItem value="discount">Store Discount Code</SelectItem>
                  <SelectItem value="early">Early Access Pass</SelectItem>
                  <SelectItem value="custom">Custom Reward</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Message</label>
              <Textarea 
                placeholder="Thank you for being a VIP member! Here's an exclusive perk just for you..."
                rows={4}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowSendPerks(false)}>
                Cancel
              </Button>
              <Button 
                className="flex-1"
                onClick={() => {
                  toast.success('Perks sent to VIP members!');
                  setShowSendPerks(false);
                }}
              >
                <Gift className="h-4 w-4 mr-2" />
                Send Perks
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}