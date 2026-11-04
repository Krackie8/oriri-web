import React, { useState } from 'react';
import { useAdmin } from '../contexts/AdminContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Progress } from './ui/progress';
import { Skeleton } from './ui/skeleton';
import { Alert, AlertDescription } from './ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Play,
  DollarSign,
  Heart,
  MessageCircle,
  Share,
  Gift,
  Eye,
  Clock,
  ShoppingBag,
  Crown,
  Zap,
  Download,
  Bell,
  RefreshCw,
  Activity,
  Plus,
  Settings,
  Share2,
  Bot,
  ArrowLeft,
  BarChart3,
  Package
} from 'lucide-react';
import EpisodeManagement from './admin/EpisodeManagement';
import SimpleLiveSessionManagement from './admin/SimpleLiveSessionManagement';
import SocialMediaDashboard from './admin/SocialMediaDashboard';
import CommunityManagement from './admin/CommunityManagement';
import StoreManagement from './admin/StoreManagement';
import SocialLinksManagement from './admin/SocialLinksManagement';
import WellnessCalendarManagement from './admin/WellnessCalendarManagement';
import WellnessGuideManagement from './admin/WellnessGuideManagement';
import StepsistersManagement from './admin/StepsistersManagement';
import PlanSignupsManagement from './admin/PlanSignupsManagement';
import PilotApplicationsManagement from './admin/PilotApplicationsManagement';
import VipManagement from './admin/VipManagement';
import PlatformConfig from './admin/PlatformConfig';
import LiveSessionScheduler from './admin/LiveSessionScheduler';
import AdminManagement from './admin/AdminManagement';
import EpisodeDetailAnalytics from './admin/EpisodeDetailAnalytics';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
}

function MetricCard({ title, value, change, icon, description, trend }: MetricCardProps) {
  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-500';
    if (trend === 'down') return 'text-red-500';
    return 'text-muted-foreground';
  };

  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="h-3 w-3" />;
    if (trend === 'down') return <TrendingDown className="h-3 w-3" />;
    return null;
  };

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <div className={`flex items-center space-x-1 text-xs ${getTrendColor()}`}>
            {getTrendIcon()}
            <span>{change > 0 ? '+' : ''}{change.toFixed(1)}%</span>
            <span className="text-muted-foreground">vs last period</span>
          </div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

interface TopItemsListProps {
  items: Array<{
    id: string;
    title?: string;
    name?: string;
    value: number;
    subtitle?: string;
    metric?: string;
  }>;
  title: string;
  valuePrefix?: string;
  valueSuffix?: string;
}

function TopItemsList({ items, title, valuePrefix = '', valueSuffix = '' }: TopItemsListProps) {
  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item, index) => (
          <div key={item.id} className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Badge variant="outline" className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs">
                {index + 1}
              </Badge>
              <div>
                <p className="font-medium text-sm">{item.title || item.name}</p>
                {item.subtitle && (
                  <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="font-medium text-sm">
                {valuePrefix}{item.value.toLocaleString()}{valueSuffix}
              </p>
              {item.metric && (
                <p className="text-xs text-muted-foreground">{item.metric}</p>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const {
    analytics,
    isLoading,
    error,
    revenueTrends,
    engagementTrends,
    trendsLoading,
    selectedTimeframe,
    timeframes,
    setSelectedTimeframe,
    refreshAnalytics,
    lastUpdated,
    exportData,
    sendNotification,
    isRealTimeEnabled,
    toggleRealTime
  } = useAdmin();

  // Open straight on the posting tabs; /admin/dashboard?tab=stepsisters deep-links
  const [activeTab, setActiveTab] = useState(() => new URLSearchParams(window.location.search).get('tab') || 'calendar');
  const [showEpisodeManagementPage, setShowEpisodeManagementPage] = useState(false);
  const [showLiveSessionManagementPage, setShowLiveSessionManagementPage] = useState(false);
  const [showCommunityManagementPage, setShowCommunityManagementPage] = useState(false);
  const [showStoreManagementPage, setShowStoreManagementPage] = useState(false);
  const [isSocialMediaOpen, setIsSocialMediaOpen] = useState(false);
  
  // Phase 3: Episode Detail Analytics
  const [selectedEpisodeForAnalytics, setSelectedEpisodeForAnalytics] = useState<{ id: string; title: string } | null>(null);
  const [isLiveSessionSchedulerOpen, setIsLiveSessionSchedulerOpen] = useState(false);

  // Show full-page episode management
  if (showEpisodeManagementPage) {
    return (
      <div className="min-h-screen bg-background">
        <div className="p-6 border-b border-border">
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              onClick={() => setShowEpisodeManagementPage(false)}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Episode Management</h1>
              <p className="text-muted-foreground">Create, edit, and manage your podcast episodes</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <EpisodeManagement 
            onEpisodeSelect={(episode) => {
              setSelectedEpisodeForAnalytics(episode);
              setActiveTab('analytics');
              setShowEpisodeManagementPage(false); // Return to main dashboard
            }}
          />
        </div>
      </div>
    );
  }

  // Show full-page live session management
  if (showLiveSessionManagementPage) {
    return (
      <div className="min-h-screen bg-background">
        <div className="p-6 border-b border-border">
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              onClick={() => setShowLiveSessionManagementPage(false)}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Live Session Management</h1>
              <p className="text-muted-foreground">Schedule, edit, and manage your live streaming sessions</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <SimpleLiveSessionManagement />
        </div>
      </div>
    );
  }

  // Show full-page community management
  if (showCommunityManagementPage) {
    return (
      <div className="min-h-screen bg-background">
        <div className="p-6 border-b border-border">
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              onClick={() => setShowCommunityManagementPage(false)}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Community Management</h1>
              <p className="text-muted-foreground">Moderate content, manage challenges, and track community health</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <CommunityManagement />
        </div>
      </div>
    );
  }

  // Show full-page store management
  if (showStoreManagementPage) {
    return (
      <div className="min-h-screen bg-background">
        <div className="p-6 border-b border-border">
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              onClick={() => setShowStoreManagementPage(false)}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Store Management</h1>
              <p className="text-muted-foreground">Manage your merchandise store, inventory, and sales analytics</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <StoreManagement />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>
            <div className="space-y-3">
              <p className="font-semibold">Failed to load admin dashboard</p>
              <p className="text-sm">{error}</p>
              <Button 
                onClick={() => {
                  console.log('[AdminDashboard] Retry button clicked - refreshing analytics...');
                  refreshAnalytics();
                }}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                Retry
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Revenue distribution data for pie chart
  const revenueDistribution = analytics ? [
    { name: 'Subscriptions', value: analytics.subscriptionRevenue, color: '#8B5CF6' },
    { name: 'Tips', value: analytics.tipRevenue, color: '#06B6D4' },
    { name: 'Store', value: analytics.storeRevenue, color: '#10B981' },
  ] : [];

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your podcast platform and track performance
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Real-time toggle */}
          <Button
            variant={isRealTimeEnabled ? 'default' : 'outline'}
            size="sm"
            onClick={toggleRealTime}
            className="flex items-center space-x-2"
          >
            <Activity className="h-4 w-4" />
            <span>Real-time</span>
          </Button>

          {/* Timeframe selector */}
          <Select 
            value={selectedTimeframe.value} 
            onValueChange={(value) => {
              const timeframe = timeframes.find(t => t.value === value);
              if (timeframe) setSelectedTimeframe(timeframe);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timeframes.map((timeframe) => (
                <SelectItem key={timeframe.value} value={timeframe.value}>
                  {timeframe.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Refresh button */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshAnalytics}
            disabled={isLoading}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Last updated indicator */}
      {lastUpdated && (
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
          {isRealTimeEnabled && (
            <Badge variant="outline" className="text-green-500 border-green-500">
              Live
            </Badge>
          )}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex w-full justify-start overflow-x-auto scrollbar-none">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="guide">Guide</TabsTrigger>
          <TabsTrigger value="stepsisters">Stepsisters</TabsTrigger>
          <TabsTrigger value="plan">Sign-ups</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="platforms">Platforms</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="store">Store</TabsTrigger>
          <TabsTrigger value="vip">VIP</TabsTrigger>
          <TabsTrigger value="social">Social</TabsTrigger>
          <TabsTrigger value="admin">Admin</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {isLoading || !analytics ? (
              Array.from({ length: 8 }).map((_, i) => (
                <Card key={i} className="bg-card/50">
                  <CardHeader className="space-y-0 pb-2">
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-16 mb-2" />
                    <Skeleton className="h-3 w-32" />
                  </CardContent>
                </Card>
              ))
            ) : (
              <>
                <MetricCard
                  title="Total Users"
                  value={analytics.totalUsers.toLocaleString()}
                  change={8.2}
                  trend="up"
                  icon={<Users className="h-4 w-4" />}
                  description={`${analytics.activeUsers} active today`}
                />
                <MetricCard
                  title="Total Plays"
                  value={analytics.totalPlays.toLocaleString()}
                  change={12.5}
                  trend="up"
                  icon={<Play className="h-4 w-4" />}
                  description={`${analytics.averageCompletion.toFixed(1)}% completion rate`}
                />
                <MetricCard
                  title="Revenue"
                  value={`$${analytics.totalRevenue.toLocaleString()}`}
                  change={analytics.revenueGrowth}
                  trend={analytics.revenueGrowth > 0 ? 'up' : 'down'}
                  icon={<DollarSign className="h-4 w-4" />}
                  description={`${selectedTimeframe.label.toLowerCase()}`}
                />
                <MetricCard
                  title="Total Views"
                  value={analytics.totalViews?.toLocaleString() || '0'}
                  change={11.4}
                  trend="up"
                  icon={<Eye className="h-4 w-4" />}
                  description="Episode views"
                />
                <MetricCard
                  title="Total Likes"
                  value={analytics.totalLikes?.toLocaleString() || '0'}
                  change={9.7}
                  trend="up"
                  icon={<Heart className="h-4 w-4" />}
                  description="Across all episodes"
                />
                <MetricCard
                  title="Comments"
                  value={analytics.totalComments?.toLocaleString() || '0'}
                  change={6.8}
                  trend="up"
                  icon={<MessageCircle className="h-4 w-4" />}
                  description="Community engagement"
                />
                <MetricCard
                  title="Shares"
                  value={analytics.totalShares?.toLocaleString() || '0'}
                  change={12.3}
                  trend="up"
                  icon={<Share2 className="h-4 w-4" />}
                  description="Social shares"
                />
                <MetricCard
                  title="Avg Session"
                  value={`${analytics.averageSessionDuration.toFixed(1)}m`}
                  change={4.3}
                  trend="up"
                  icon={<Clock className="h-4 w-4" />}
                  description="User engagement time"
                />
              </>
            )}
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Chart */}
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle>Revenue Trends</CardTitle>
                <CardDescription>
                  Revenue breakdown by source over {selectedTimeframe.label.toLowerCase()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {trendsLoading || isLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : revenueTrends.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    <div className="text-center space-y-2">
                      <p className="text-sm">No revenue data available yet</p>
                      <p className="text-xs">Revenue will appear here once payments are implemented</p>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={revenueTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="dateLabel" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="subscriptions" stackId="a" fill="#8B5CF6" name="Subscriptions" />
                      <Bar dataKey="tips" stackId="a" fill="#06B6D4" name="Tips" />
                      <Bar dataKey="store" stackId="a" fill="#10B981" name="Store" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Engagement Chart */}
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle>Engagement Trends</CardTitle>
                <CardDescription>
                  User engagement metrics over {selectedTimeframe.label.toLowerCase()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {trendsLoading || isLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : engagementTrends.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    <div className="text-center space-y-2">
                      <p className="text-sm">No engagement data available yet</p>
                      <p className="text-xs">Engagement will appear here as users interact with episodes</p>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={engagementTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="dateLabel" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Line type="monotone" dataKey="likes" stroke="#F59E0B" name="Likes" strokeWidth={2} />
                      <Line type="monotone" dataKey="comments" stroke="#8B5CF6" name="Comments" strokeWidth={2} />
                      <Line type="monotone" dataKey="shares" stroke="#10B981" name="Shares" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top Performance Lists */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {isLoading || !analytics ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="bg-card/50">
                  <CardHeader>
                    <Skeleton className="h-6 w-32" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <div key={j} className="flex justify-between">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))
            ) : (
              <>
                <TopItemsList
                  title="Top Episodes"
                  items={analytics.topEpisodes.map(ep => ({
                    id: ep.id,
                    title: ep.title,
                    value: ep.plays,
                    subtitle: `${ep.likes} likes • ${ep.comments} comments`
                  }))}
                  valueSuffix=" plays"
                />
                <TopItemsList
                  title="Top Tippers"
                  items={analytics.topTippers.map(tipper => ({
                    id: tipper.id,
                    name: tipper.name,
                    value: tipper.totalTipped,
                    subtitle: tipper.lastTip
                  }))}
                  valuePrefix="$"
                />
                <TopItemsList
                  title="Top Products"
                  items={analytics.topProducts.map(product => ({
                    id: product.id,
                    name: product.name,
                    value: product.revenue,
                    subtitle: `${product.sales} sales`
                  }))}
                  valuePrefix="$"
                />
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="content" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Episode Management */}
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle>Episode Management</CardTitle>
                <CardDescription>Manage your podcast episodes and content</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Total Episodes</span>
                  <Badge variant="secondary">{analytics?.totalEpisodes || 0}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Average Completion Rate</span>
                  <Badge variant="secondary">{analytics?.averageCompletion.toFixed(1) || 0}%</Badge>
                </div>
                <Progress value={analytics?.averageCompletion || 0} className="w-full" />
                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    className="flex-1"
                    onClick={() => setShowEpisodeManagementPage(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Episode
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setShowEpisodeManagementPage(true)}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Manage Content
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Social Media Automation */}
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle>Social Media Automation</CardTitle>
                <CardDescription>Automate your content distribution and growth</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Connected Platforms</span>
                  <Badge variant="secondary">2 active</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Scheduled Posts</span>
                  <Badge variant="secondary">12 pending</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>This Week's Reach</span>
                  <Badge variant="secondary">15.2K</Badge>
                </div>
                <div className="flex space-x-2">
                  <Dialog open={isSocialMediaOpen} onOpenChange={setIsSocialMediaOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="flex-1">
                        <Share2 className="h-4 w-4 mr-2" />
                        Quick Post
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-7xl max-h-[95vh] overflow-auto">
                      <DialogHeader>
                        <DialogTitle>Social Media Automation</DialogTitle>
                        <DialogDescription>
                          Manage your social media presence and automation
                        </DialogDescription>
                      </DialogHeader>
                      <SocialMediaDashboard />
                    </DialogContent>
                  </Dialog>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setIsSocialMediaOpen(true)}
                  >
                    <Bot className="h-4 w-4 mr-2" />
                    Automation
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Live Sessions */}
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle>Live Sessions</CardTitle>
                <CardDescription>Manage live streaming and interactions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Total Sessions</span>
                  <Badge variant="secondary">{analytics?.totalLiveSessions || 0}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Average Viewers</span>
                  <Badge variant="secondary">{analytics?.averageLiveViewers || 0}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Live Tips Earned</span>
                  <Badge variant="secondary">${analytics?.liveTipTotal || 0}</Badge>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    className="w-full"
                    onClick={() => setShowLiveSessionManagementPage(true)}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Manage Sessions
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Community Management */}
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle>Community Management</CardTitle>
                <CardDescription>Moderate content and manage community engagement</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Community Members</span>
                  <Badge variant="secondary">1.2K</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Pending Posts</span>
                  <Badge variant="secondary">5</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Active Challenges</span>
                  <Badge variant="secondary">2</Badge>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    className="flex-1"
                    onClick={() => setShowCommunityManagementPage(true)}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Manage Community
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setShowCommunityManagementPage(true)}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Moderate
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="platforms" className="space-y-6">
          <PlatformConfig />
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Stats */}
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle>User Analytics</CardTitle>
                <CardDescription>Track user growth and engagement</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Total Users</span>
                  <Badge variant="secondary">{analytics?.totalUsers.toLocaleString() || 0}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Active Today</span>
                  <Badge variant="secondary">{analytics?.activeUsers.toLocaleString() || 0}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>New Users Today</span>
                  <Badge variant="secondary">{analytics?.newUsersToday || 0}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>VIP Subscribers</span>
                  <Badge variant="secondary" className="bg-purple-500/20 text-purple-300">
                    {analytics?.vipSubscribers.toLocaleString() || 0}
                  </Badge>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => sendNotification('Welcome to our community! 🎉')}
                  className="w-full flex items-center space-x-2"
                >
                  <Bell className="h-4 w-4" />
                  <span>Send Notification</span>
                </Button>
              </CardContent>
            </Card>

            {/* User Actions */}
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage your community and subscribers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => exportData('users')}
                  className="w-full flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Export User Data</span>
                </Button>
                <Button size="sm" variant="outline" className="w-full">
                  View User Details
                </Button>
                <Button size="sm" variant="outline" className="w-full">
                  Manage VIP Subscribers
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setShowCommunityManagementPage(true)}
                >
                  Community Moderation
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Breakdown */}
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle>Revenue Breakdown</CardTitle>
                <CardDescription>Revenue sources and distribution</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading || !analytics ? (
                  <Skeleton className="h-48 w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={revenueDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {revenueDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                <div className="grid grid-cols-3 gap-2 mt-4">
                  {revenueDistribution.map((item, index) => (
                    <div key={index} className="text-center">
                      <div className="flex items-center justify-center space-x-1 mb-1">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-xs">{item.name}</span>
                      </div>
                      <p className="font-medium text-sm">${item.value.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Revenue Actions */}
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle>Revenue Management</CardTitle>
                <CardDescription>Manage payments and financial data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Total Revenue</span>
                    <Badge variant="secondary" className="text-green-500">
                      ${analytics?.totalRevenue.toLocaleString() || 0}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Growth Rate</span>
                    <Badge variant="secondary" className="text-green-500">
                      +{analytics?.revenueGrowth.toFixed(1) || 0}%
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => exportData('revenue')}
                    className="w-full flex items-center space-x-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>Export Revenue Data</span>
                  </Button>
                  <Button size="sm" variant="outline" className="w-full">
                    Payment Settings
                  </Button>
                  <Button size="sm" variant="outline" className="w-full">
                    Tax Reports
                  </Button>
                  <Button size="sm" variant="outline" className="w-full">
                    Financial Analytics
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-6">
          <WellnessCalendarManagement />
        </TabsContent>

        <TabsContent value="guide" className="space-y-6">
          <WellnessGuideManagement />
        </TabsContent>

        <TabsContent value="stepsisters" className="space-y-6">
          <StepsistersManagement />
        </TabsContent>

        <TabsContent value="plan" className="space-y-6">
          <PilotApplicationsManagement />
          <PlanSignupsManagement source="nourish" />
        </TabsContent>

        <TabsContent value="social" className="space-y-6">
          <SocialLinksManagement />
        </TabsContent>

        <TabsContent value="store" className="space-y-6">
          {/* Store Management Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Store Overview */}
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle>Store Overview</CardTitle>
                <CardDescription>Merchandise sales and inventory management</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Total Products</span>
                  <Badge variant="secondary">{analytics?.storeMetrics?.totalProducts ?? 0}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Total Sales</span>
                  <Badge variant="secondary" className="text-green-500">
                    ${analytics?.storeMetrics?.totalSales ?? 0}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Orders This Month</span>
                  <Badge variant="secondary">{analytics?.storeMetrics?.ordersThisMonth ?? 0}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Low Stock Items</span>
                  <Badge variant="destructive">{analytics?.storeMetrics?.lowStockItems ?? 0}</Badge>
                </div>
                <Progress value={analytics?.storeMetrics?.inventoryHealth ?? 0} className="w-full" />
                <p className="text-xs text-muted-foreground">Overall inventory health</p>
              </CardContent>
            </Card>

            {/* Store Actions */}
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle>Store Management</CardTitle>
                <CardDescription>Manage products, orders, and inventory</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  size="sm" 
                  className="w-full flex items-center space-x-2"
                  onClick={() => setShowStoreManagementPage(true)}
                >
                  <Plus className="h-4 w-4" />
                  <span>Add New Product</span>
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full flex items-center space-x-2"
                  onClick={() => setShowStoreManagementPage(true)}
                >
                  <ShoppingBag className="h-4 w-4" />
                  <span>Manage Store</span>
                </Button>
                <Button size="sm" variant="outline" className="w-full flex items-center space-x-2">
                  <Eye className="h-4 w-4" />
                  <span>View Orders</span>
                </Button>
                <Button size="sm" variant="outline" className="w-full flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4" />
                  <span>Sales Analytics</span>
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => exportData('store')}
                  className="w-full flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Export Store Data</span>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Store Analytics Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle>Sales Trends</CardTitle>
                <CardDescription>Store revenue over {selectedTimeframe.label.toLowerCase()}</CardDescription>
              </CardHeader>
              <CardContent>
                {trendsLoading || isLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : revenueTrends.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    <div className="text-center space-y-2">
                      <p className="text-sm">No store sales data yet</p>
                      <p className="text-xs">Sales will appear here once orders are placed</p>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={revenueTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="dateLabel" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Line type="monotone" dataKey="store" stroke="#10B981" name="Store Sales" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle>Top Products</CardTitle>
                <CardDescription>Best performing merchandise</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics?.topProducts && analytics.topProducts.length > 0 ? (
                  <div className="space-y-4">
                    {analytics.topProducts.slice(0, 5).map((product, index) => (
                      <div key={product.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Badge variant="outline" className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs">
                            {index + 1}
                          </Badge>
                          <div>
                            <p className="font-medium text-sm">{product.name}</p>
                            <p className="text-xs text-muted-foreground">{product.sales} sales</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-sm">${product.revenue}</p>
                          <p className="text-xs text-muted-foreground">revenue</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    <div className="text-center space-y-2">
                      <Package className="h-12 w-12 mx-auto text-muted-foreground/50" />
                      <p className="text-sm font-medium">No sales data yet</p>
                      <p className="text-xs">Top selling products will appear here once orders are placed</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Inventory Management */}
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader>
              <CardTitle>Inventory Status</CardTitle>
              <CardDescription>Current stock levels and alerts</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics?.storeMetrics?.byCategory && Object.keys(analytics.storeMetrics.byCategory).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Object.entries(analytics.storeMetrics.byCategory).map(([category, count], index) => {
                    const status = count === 0 ? 'critical' : count <= 2 ? 'low' : 'normal';
                    const color = status === 'critical' ? 'text-red-500' : status === 'low' ? 'text-orange-500' : 'text-green-500';
                    
                    return (
                      <div key={category} className="bg-muted/30 rounded-lg p-4 text-center">
                        <h4 className="font-medium mb-2">{category}</h4>
                        <div className={`text-2xl font-bold ${color}`}>
                          {count}
                        </div>
                        <p className="text-xs text-muted-foreground">products</p>
                        <Badge 
                          variant={status === 'critical' ? 'destructive' : status === 'low' ? 'secondary' : 'default'}
                          className="mt-2"
                        >
                          {status}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-muted-foreground">
                  <div className="text-center space-y-2">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground/50" />
                    <p className="text-sm font-medium">No products in inventory</p>
                    <p className="text-xs">Add products to see inventory status by category</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vip" className="space-y-6">
          {/* VIP Management - Full Dashboard Directly Embedded */}
          <VipManagement />
        </TabsContent>
        {/* ✅ PHASE 3: Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          {selectedEpisodeForAnalytics ? (
            <EpisodeDetailAnalytics
              episodeId={selectedEpisodeForAnalytics.id}
              episodeTitle={selectedEpisodeForAnalytics.title}
              onBack={() => setSelectedEpisodeForAnalytics(null)}
            />
          ) : (
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Episode Analytics
                </CardTitle>
                <CardDescription>
                  Select an episode to view detailed analytics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Activity className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Episode Selected</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Go to the Content tab and click "View Analytics" on any episode
                  </p>
                  <Button onClick={() => setActiveTab('content')}>
                    Go to Content
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="admin" className="space-y-6">
          {/* Admin Management Section */}
          <AdminManagement />
        </TabsContent>
      </Tabs>

      {/* Live Session Scheduler Modal */}
      <LiveSessionScheduler
        isOpen={isLiveSessionSchedulerOpen}
        onClose={() => setIsLiveSessionSchedulerOpen(false)}
      />
    </div>
  );
}