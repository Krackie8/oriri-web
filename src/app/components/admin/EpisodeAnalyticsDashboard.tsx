import React, { useState, useEffect } from 'react';
import { useEpisodeAnalytics, EpisodeAnalytics } from '../../contexts/EpisodeAnalyticsContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Progress } from '../ui/progress';
import { Skeleton } from '../ui/skeleton';
import { Alert, AlertDescription } from '../ui/alert';
import { Separator } from '../ui/separator';
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
  Cell,
  AreaChart,
  Area
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Play,
  Clock,
  Heart,
  MessageCircle,
  Share,
  Gift,
  Eye,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  Download,
  FileText,
  MapPin,
  Calendar,
  Target,
  Zap,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  DollarSign
} from 'lucide-react';

interface EpisodeAnalyticsDashboardProps {
  episodeId: string;
  episodeTitle?: string;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  description?: string;
  trend?: 'up' | 'down' | 'stable';
  color?: string;
}

function MetricCard({ title, value, change, icon, description, trend, color = 'blue' }: MetricCardProps) {
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
        <div className={`text-${color}-500`}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <div className={`flex items-center space-x-1 text-xs ${getTrendColor()}`}>
            {getTrendIcon()}
            <span>{change > 0 ? '+' : ''}{change.toFixed(1)}%</span>
            <span className="text-muted-foreground">vs avg</span>
          </div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function EpisodeAnalyticsDashboard({ episodeId, episodeTitle }: EpisodeAnalyticsDashboardProps) {
  const {
    getEpisodeAnalytics,
    getContentInsights,
    exportAnalytics,
    generateReport,
    analyticsTimeframe,
    setAnalyticsTimeframe,
    isLoading,
    error
  } = useEpisodeAnalytics();

  const [analytics, setAnalytics] = useState<EpisodeAnalytics | null>(null);
  const [insights, setInsights] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const [analyticsData, insightsData] = await Promise.all([
          getEpisodeAnalytics(episodeId),
          getContentInsights(episodeId)
        ]);
        setAnalytics(analyticsData);
        setInsights(insightsData);
      } catch (err) {
        console.error('Error loading episode analytics:', err);
      }
    };

    loadAnalytics();
  }, [episodeId, analyticsTimeframe]);

  const handleExport = async (format: 'csv' | 'pdf' | 'json') => {
    setIsExporting(true);
    try {
      await exportAnalytics(episodeId, format);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load episode analytics: {error}
        </AlertDescription>
      </Alert>
    );
  }

  // Prepare chart data
  const retentionChartData = insights?.audienceRetention.map((point: any) => ({
    time: `${Math.floor(point.timestamp / 60)}:${(point.timestamp % 60).toString().padStart(2, '0')}`,
    retention: point.retentionRate,
    listeners: point.activeListeners
  })) || [];

  const deviceChartData = analytics?.listeningSessions.deviceTypes.map(device => ({
    name: device.device,
    value: device.percentage,
    count: Math.floor((analytics.totalPlays * device.percentage) / 100)
  })) || [];

  const listeningHoursData = analytics?.listeningSessions.peakListeningHours.map(hour => ({
    hour: hour.hour < 12 ? `${hour.hour || 12}AM` : `${hour.hour === 12 ? 12 : hour.hour - 12}PM`,
    listens: hour.listens
  })) || [];

  const geographicData = analytics?.demographics.locations || [];
  const ageData = analytics?.demographics.ageGroups || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold">Episode Analytics</h2>
          <p className="text-muted-foreground">
            {episodeTitle || `Episode ${episodeId}`} • Detailed Performance Insights
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Select 
            value={analyticsTimeframe} 
            onValueChange={(value: any) => setAnalyticsTimeframe(value)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="all-time">All Time</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleExport('csv')}
            disabled={isExporting}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="audience">Audience</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
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
                  title="Total Plays"
                  value={analytics.totalPlays.toLocaleString()}
                  change={analytics.comparison.vs30DayAverage}
                  trend={analytics.comparison.trendDirection}
                  icon={<Play className="h-4 w-4" />}
                  description={`${analytics.uniqueListeners} unique listeners`}
                  color="blue"
                />
                <MetricCard
                  title="Completion Rate"
                  value={`${analytics.completionRate}%`}
                  change={5.2}
                  trend="up"
                  icon={<Target className="h-4 w-4" />}
                  description={`${analytics.averageListenDuration}m avg duration`}
                  color="green"
                />
                <MetricCard
                  title="Engagement"
                  value={analytics.likes + analytics.comments + analytics.shares}
                  change={8.7}
                  trend="up"
                  icon={<Heart className="h-4 w-4" />}
                  description="Total interactions"
                  color="pink"
                />
                <MetricCard
                  title="Revenue"
                  value={`$${analytics.revenue.totalAttribution}`}
                  change={12.3}
                  trend="up"
                  icon={<DollarSign className="h-4 w-4" />}
                  description="Total attributed"
                  color="green"
                />
                <MetricCard
                  title="Channel Rank"
                  value={`#${analytics.comparison.rankInChannel}`}
                  change={analytics.comparison.rankInChannel <= 5 ? 15 : -5}
                  trend={analytics.comparison.rankInChannel <= 5 ? 'up' : 'down'}
                  icon={<BarChart3 className="h-4 w-4" />}
                  description="Performance ranking"
                  color="purple"
                />
                <MetricCard
                  title="Virality Score"
                  value={analytics.socialMetrics.viralityScore}
                  change={3.1}
                  trend="up"
                  icon={<Zap className="h-4 w-4" />}
                  description="Social amplification"
                  color="yellow"
                />
                <MetricCard
                  title="Replay Rate"
                  value={`${analytics.replayRate}%`}
                  change={2.8}
                  trend="up"
                  icon={<Activity className="h-4 w-4" />}
                  description="Content rewatched"
                  color="orange"
                />
                <MetricCard
                  title="Retention"
                  value={`${analytics.performance.sustainedInterest}%`}
                  change={-1.5}
                  trend="down"
                  icon={<Users className="h-4 w-4" />}
                  description="30-day retention"
                  color="blue"
                />
              </>
            )}
          </div>

          {/* Performance Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Audience Retention */}
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle>Audience Retention</CardTitle>
                <CardDescription>How long listeners stay engaged</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading || !insights ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={retentionChartData.slice(0, 30)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="retention" 
                        stroke="#8B5CF6" 
                        fill="#8B5CF6/20" 
                        strokeWidth={2}
                        name="Retention %"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Listening Hours */}
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle>Peak Listening Hours</CardTitle>
                <CardDescription>When your audience is most active</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading || !analytics ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={listeningHoursData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="listens" fill="#06B6D4" name="Listens" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Performance Summary */}
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader>
              <CardTitle>Performance Summary</CardTitle>
              <CardDescription>Key takeaways and recommendations</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading || !analytics ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium text-green-500">🎯 Strengths</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• High completion rate ({analytics.completionRate}%)</li>
                        <li>• Strong engagement metrics</li>
                        <li>• Good audience retention</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium text-yellow-500">⚡ Opportunities</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Increase social sharing</li>
                        <li>• Optimize peak hours</li>
                        <li>• Enhance mobile experience</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium text-blue-500">📊 Next Steps</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Create more content like this</li>
                        <li>• Target {analytics.demographics.ageGroups[0]?.range} demographic</li>
                        <li>• Leverage viral potential</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audience" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Demographics */}
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle>Age Demographics</CardTitle>
                <CardDescription>Audience age distribution</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading || !analytics ? (
                  <Skeleton className="h-48 w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={ageData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="percentage"
                        nameKey="range"
                      >
                        {ageData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={`hsl(${index * 45 + 200}, 70%, 60%)`} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value}%`, 'Percentage']} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {ageData.slice(0, 4).map((item, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: `hsl(${index * 45 + 200}, 70%, 60%)` }}
                      />
                      <span className="text-xs">{item.range}: {item.percentage}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Device Types */}
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle>Device Usage</CardTitle>
                <CardDescription>How listeners access your content</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {deviceChartData.map((device, index) => (
                    <div key={device.name} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          {device.name === 'Mobile' && <Smartphone className="h-4 w-4" />}
                          {device.name === 'Desktop' && <Monitor className="h-4 w-4" />}
                          {device.name === 'Tablet' && <Tablet className="h-4 w-4" />}
                          {device.name === 'Smart Speaker' && <Users className="h-4 w-4" />}
                          <span className="text-sm font-medium">{device.name}</span>
                        </div>
                        <div className="text-sm">
                          {device.value}% • {device.count} listens
                        </div>
                      </div>
                      <Progress value={device.value} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Geographic Distribution */}
            <Card className="bg-card/50 backdrop-blur border-border/50 lg:col-span-2">
              <CardHeader>
                <CardTitle>Geographic Distribution</CardTitle>
                <CardDescription>Where your listeners are located</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {geographicData.map((location, index) => (
                    <div key={location.country} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{location.country}</span>
                        </div>
                        <Badge variant="outline">{location.percentage}%</Badge>
                      </div>
                      <Progress value={location.percentage} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {location.listens.toLocaleString()} listens
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-6">
          {/* Engagement Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {isLoading || !analytics ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="bg-card/50">
                  <CardHeader>
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-16" />
                  </CardContent>
                </Card>
              ))
            ) : (
              <>
                <MetricCard
                  title="Likes"
                  value={analytics.likes.toLocaleString()}
                  icon={<Heart className="h-4 w-4" />}
                  description={`${((analytics.likes / analytics.totalPlays) * 100).toFixed(1)}% like rate`}
                  color="red"
                />
                <MetricCard
                  title="Comments"
                  value={analytics.comments.toLocaleString()}
                  icon={<MessageCircle className="h-4 w-4" />}
                  description={`${((analytics.comments / analytics.totalPlays) * 100).toFixed(1)}% comment rate`}
                  color="blue"
                />
                <MetricCard
                  title="Shares"
                  value={analytics.shares.toLocaleString()}
                  icon={<Share className="h-4 w-4" />}
                  description={`${((analytics.shares / analytics.totalPlays) * 100).toFixed(1)}% share rate`}
                  color="green"
                />
                <MetricCard
                  title="Tips"
                  value={analytics.tips.toLocaleString()}
                  icon={<Gift className="h-4 w-4" />}
                  description={`$${analytics.tipAmount} total`}
                  color="yellow"
                />
              </>
            )}
          </div>

          {/* Drop-off Analysis */}
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader>
              <CardTitle>Content Analysis</CardTitle>
              <CardDescription>Key moments in your episode</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading || !analytics ? (
                <Skeleton className="h-32 w-full" />
              ) : (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-3 text-red-400">Drop-off Points</h4>
                    <div className="space-y-2">
                      {analytics.dropOffPoints.map((point, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Badge variant="outline" className="text-red-400 border-red-400">
                              {Math.floor(point.timestamp / 60)}:{(point.timestamp % 60).toString().padStart(2, '0')}
                            </Badge>
                            <span className="text-sm">{point.label}</span>
                          </div>
                          <span className="text-sm text-red-400">{point.percentage}% drop-off</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3 text-green-400">Rewind Points</h4>
                    <div className="space-y-2">
                      {analytics.rewindPoints.map((point, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Badge variant="outline" className="text-green-400 border-green-400">
                              {Math.floor(point.timestamp / 60)}:{(point.timestamp % 60).toString().padStart(2, '0')}
                            </Badge>
                            <span className="text-sm">{point.reason}</span>
                          </div>
                          <span className="text-sm text-green-400">{point.count} rewinds</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          {/* Revenue Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {isLoading || !analytics ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="bg-card/50">
                  <CardHeader>
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-16" />
                  </CardContent>
                </Card>
              ))
            ) : (
              <>
                <MetricCard
                  title="Direct Tips"
                  value={`$${analytics.revenue.directTips}`}
                  icon={<Gift className="h-4 w-4" />}
                  description={`From ${analytics.tips} tips`}
                  color="green"
                />
                <MetricCard
                  title="VIP Conversions"
                  value={`$${analytics.revenue.conversionToVip}`}
                  icon={<Users className="h-4 w-4" />}
                  description="New subscriptions"
                  color="purple"
                />
                <MetricCard
                  title="Store Referrals"
                  value={`$${analytics.revenue.storeReferrals}`}
                  icon={<ShoppingBag className="h-4 w-4" />}
                  description="Product sales"
                  color="blue"
                />
                <MetricCard
                  title="Total Attribution"
                  value={`$${analytics.revenue.totalAttribution}`}
                  icon={<DollarSign className="h-4 w-4" />}
                  description="All revenue sources"
                  color="green"
                />
              </>
            )}
          </div>

          {/* Revenue Analysis */}
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader>
              <CardTitle>Revenue Attribution Analysis</CardTitle>
              <CardDescription>How this episode contributes to your business</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading || !analytics ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <div className="space-y-6">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Tips', value: analytics.revenue.directTips, color: '#10B981' },
                          { name: 'VIP', value: analytics.revenue.conversionToVip, color: '#8B5CF6' },
                          { name: 'Store', value: analytics.revenue.storeReferrals, color: '#06B6D4' },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        <Cell fill="#10B981" />
                        <Cell fill="#8B5CF6" />
                        <Cell fill="#06B6D4" />
                      </Pie>
                      <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span className="text-sm font-medium">Direct Tips</span>
                      </div>
                      <p className="text-2xl font-bold">${analytics.revenue.directTips}</p>
                      <p className="text-xs text-muted-foreground">
                        {((analytics.revenue.directTips / analytics.revenue.totalAttribution) * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-purple-500" />
                        <span className="text-sm font-medium">VIP Subs</span>
                      </div>
                      <p className="text-2xl font-bold">${analytics.revenue.conversionToVip}</p>
                      <p className="text-xs text-muted-foreground">
                        {((analytics.revenue.conversionToVip / analytics.revenue.totalAttribution) * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-cyan-500" />
                        <span className="text-sm font-medium">Store Sales</span>
                      </div>
                      <p className="text-2xl font-bold">${analytics.revenue.storeReferrals}</p>
                      <p className="text-xs text-muted-foreground">
                        {((analytics.revenue.storeReferrals / analytics.revenue.totalAttribution) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          {/* AI Insights */}
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader>
              <CardTitle>AI-Powered Insights</CardTitle>
              <CardDescription>Recommendations based on performance data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <h4 className="font-medium text-blue-300 mb-2">🎯 Content Optimization</h4>
                  <p className="text-sm text-muted-foreground">
                    Your audience engagement peaks at 12:30 and 28:45. Consider placing key takeaways 
                    around these timestamps in future episodes for maximum impact.
                  </p>
                </div>
                
                <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                  <h4 className="font-medium text-green-300 mb-2">🚀 Growth Opportunity</h4>
                  <p className="text-sm text-muted-foreground">
                    This episode performs 23% better than your channel average. The success factors 
                    include high retention rate and strong social sharing. Replicate this format.
                  </p>
                </div>
                
                <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                  <h4 className="font-medium text-purple-300 mb-2">💰 Monetization Insight</h4>
                  <p className="text-sm text-muted-foreground">
                    Listeners who reach the 75% mark have a 40% higher conversion rate to VIP. 
                    Consider adding a subscription call-to-action at the 30-minute mark.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Export Options */}
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader>
              <CardTitle>Export & Reports</CardTitle>
              <CardDescription>Download detailed analytics for further analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => handleExport('csv')}
                  disabled={isExporting}
                  className="flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Export CSV</span>
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleExport('pdf')}
                  disabled={isExporting}
                  className="flex items-center space-x-2"
                >
                  <FileText className="h-4 w-4" />
                  <span>PDF Report</span>
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleExport('json')}
                  disabled={isExporting}
                  className="flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Raw Data</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}