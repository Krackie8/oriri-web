import React, { useEffect, useState } from 'react';
import { skipThisDevice } from '../wellness/analytics/firstParty';
import { useAdmin } from '../contexts/AdminContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Skeleton } from './ui/skeleton';
import { Alert, AlertDescription } from './ui/alert';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Play,
  DollarSign,
  Heart,
  MessageCircle,
  Eye,
  Clock,
  RefreshCw,
  Activity,
  Share2
} from 'lucide-react';
import WellnessGuideManagement from './admin/WellnessGuideManagement';
import TrafficDashboard from './admin/TrafficDashboard';
import ShopEarnings from './admin/ShopEarnings';
import PlanSignupsManagement from './admin/PlanSignupsManagement';
import WaitlistLeadsManagement from './admin/WaitlistLeadsManagement';

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

const LEGACY_TABS = ['overview', 'guide', 'traffic', 'shop', 'plan'];

export default function AdminDashboard() {
  // Ren's own visits on this device stop counting in the Traffic tab.
  useEffect(() => skipThisDevice(), []);
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
    isRealTimeEnabled,
    toggleRealTime
  } = useAdmin();

  // Open straight on the Directory; /admin/legacy?tab=guide deep-links. Stepsisters & events moved
  // to the new Admin's Events (#100 piece 3). An unknown or removed tab value falls back to the
  // Directory, never a blank panel.
  const [activeTab, setActiveTab] = useState(() => {
    const t = new URLSearchParams(window.location.search).get('tab');
    return t && LEGACY_TABS.includes(t) ? t : 'guide';
  });

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
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="guide">Directory</TabsTrigger>
          <TabsTrigger value="traffic">Traffic</TabsTrigger>
          <TabsTrigger value="shop">Shop</TabsTrigger>
          <TabsTrigger value="plan">Sign-ups</TabsTrigger>
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

        <TabsContent value="guide" className="space-y-6">
          <WellnessGuideManagement />
        </TabsContent>

        <TabsContent value="traffic" className="space-y-6">
          <TrafficDashboard />
        </TabsContent>

        <TabsContent value="shop" className="space-y-6">
          <ShopEarnings />
        </TabsContent>

        <TabsContent value="plan" className="space-y-6">
          <WaitlistLeadsManagement />
          <PlanSignupsManagement source="nourish" />
        </TabsContent>

      </Tabs>

    </div>
  );
}