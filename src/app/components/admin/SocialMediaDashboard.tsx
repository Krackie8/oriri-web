import React, { useState, useEffect } from 'react';
import { useSocialMediaAutomation } from '../../contexts/SocialMediaAutomationContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Progress } from '../ui/progress';
import { Skeleton } from '../ui/skeleton';
import { Alert, AlertDescription } from '../ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
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
  Cell
} from 'recharts';
import {
  Share2,
  Calendar,
  TrendingUp,
  TrendingDown,
  Users,
  Heart,
  MessageCircle,
  Eye,
  Clock,
  Zap,
  Settings,
  Plus,
  Play,
  Pause,
  RefreshCw,
  Download,
  Link,
  Hash,
  Bot,
  Target,
  BarChart3
} from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
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

interface PlatformCardProps {
  platform: any;
  onConnect: (platformId: string) => void;
  onDisconnect: (platformId: string) => void;
  onToggle: (platformId: string, enabled: boolean) => void;
}

function PlatformCard({ platform, onConnect, onDisconnect, onToggle }: PlatformCardProps) {
  const getStatusColor = () => {
    if (!platform.isConnected) return 'text-gray-500';
    if (!platform.isEnabled) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getStatusText = () => {
    if (!platform.isConnected) return 'Not Connected';
    if (!platform.isEnabled) return 'Connected but Disabled';
    return 'Active';
  };

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">{platform.icon}</div>
            <div>
              <CardTitle className="text-base">{platform.displayName}</CardTitle>
              <CardDescription className={getStatusColor()}>
                {getStatusText()}
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" style={{ color: platform.color, borderColor: platform.color }}>
            {platform.characterLimit} chars
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center space-x-1">
            <span className={platform.supportsImages ? 'text-green-500' : 'text-gray-500'}>📷</span>
            <span>Images</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className={platform.supportsVideo ? 'text-green-500' : 'text-gray-500'}>🎥</span>
            <span>Video</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className={platform.supportsThreads ? 'text-green-500' : 'text-gray-500'}>🧵</span>
            <span>Threads</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className={platform.supportsHashtags ? 'text-green-500' : 'text-gray-500'}>#</span>
            <span>Hashtags</span>
          </div>
        </div>
        
        {platform.isConnected && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={`toggle-${platform.id}`} className="text-sm">
                Enable posting
              </Label>
              <Switch
                id={`toggle-${platform.id}`}
                checked={platform.isEnabled}
                onCheckedChange={(enabled) => onToggle(platform.id, enabled)}
              />
            </div>
          </div>
        )}
        
        <div className="flex space-x-2">
          {!platform.isConnected ? (
            <Button
              size="sm"
              onClick={() => onConnect(platform.id)}
              className="flex-1"
            >
              <Link className="h-4 w-4 mr-2" />
              Connect
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDisconnect(platform.id)}
              className="flex-1"
            >
              Disconnect
            </Button>
          )}
          <Button size="sm" variant="outline">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SocialMediaDashboard() {
  const {
    platforms,
    connectedPlatforms,
    connectPlatform,
    disconnectPlatform,
    updatePlatformSettings,
    templates,
    scheduledPosts,
    socialAnalytics,
    getSocialAnalytics,
    getCrossplatformInsights,
    hashtagSuggestions,
    analyzeHashtags,
    contentSettings,
    updateContentSettings,
    generatePostContent,
    scheduleEpisodePromotion,
    isLoading,
    error,
    lastSync,
    refreshData,
    exportSocialData
  } = useSocialMediaAutomation();

  const [activeTab, setActiveTab] = useState('overview');
  const [selectedTimeframe, setSelectedTimeframe] = useState('7d');
  const [crossplatformInsights, setCrossplatformInsights] = useState<any>(null);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);

  useEffect(() => {
    const loadInsights = async () => {
      try {
        const insights = await getCrossplatformInsights();
        setCrossplatformInsights(insights);
      } catch (err) {
        console.error('Error loading crossplatform insights:', err);
      }
    };

    loadInsights();
  }, []);

  const handleConnectPlatform = async (platformId: string) => {
    setIsConnecting(platformId);
    try {
      // Mock credentials for demo
      await connectPlatform(platformId, { apiKey: 'demo-key', secret: 'demo-secret' });
    } catch (err) {
      console.error(`Failed to connect ${platformId}:`, err);
    } finally {
      setIsConnecting(null);
    }
  };

  const handleTogglePlatform = async (platformId: string, enabled: boolean) => {
    await updatePlatformSettings(platformId, { isEnabled: enabled });
  };

  const handleQuickPost = async () => {
    const activePlatforms = platforms.filter(p => p.isConnected && p.isEnabled).map(p => p.id);
    if (activePlatforms.length === 0) {
      alert('Please connect and enable at least one platform first.');
      return;
    }
    
    try {
      await scheduleEpisodePromotion('episode-demo', activePlatforms);
      alert('Posts scheduled successfully!');
    } catch (err) {
      console.error('Failed to schedule posts:', err);
    }
  };

  // Mock data for charts
  const engagementData = Array.from({ length: 7 }, (_, i) => ({
    day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
    twitter: Math.floor(Math.random() * 100 + 50),
    linkedin: Math.floor(Math.random() * 80 + 40),
    tiktok: Math.floor(Math.random() * 200 + 100), // TikTok typically has higher engagement
    instagram: Math.floor(Math.random() * 120 + 60),
  }));

  const reachData = platforms.filter(p => p.isConnected).map(p => ({
    name: p.displayName,
    reach: Math.floor(Math.random() * 1000 + 500),
    engagement: Math.floor(Math.random() * 200 + 100),
    color: p.color,
  }));

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load social media dashboard: {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold">Social Media Automation</h1>
          <p className="text-muted-foreground">
            Automate your content distribution and grow your audience
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={refreshData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button onClick={handleQuickPost} disabled={connectedPlatforms.length === 0}>
            <Share2 className="h-4 w-4 mr-2" />
            Quick Post
          </Button>
        </div>
      </div>

      {/* Last sync indicator */}
      {lastSync && (
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Last synced: {lastSync.toLocaleTimeString()}</span>
          {connectedPlatforms.length > 0 && (
            <Badge variant="outline" className="text-green-500 border-green-500">
              {connectedPlatforms.length} platforms connected
            </Badge>
          )}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="platforms">Platforms</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
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
                  title="Total Reach"
                  value={crossplatformInsights?.totalReach?.toLocaleString() || '0'}
                  change={12.5}
                  trend="up"
                  icon={<Eye className="h-4 w-4" />}
                  description="Across all platforms"
                  color="blue"
                />
                <MetricCard
                  title="Engagement"
                  value={crossplatformInsights?.totalEngagement?.toLocaleString() || '0'}
                  change={8.2}
                  trend="up"
                  icon={<Heart className="h-4 w-4" />}
                  description="Likes, shares, comments"
                  color="red"
                />
                <MetricCard
                  title="Scheduled Posts"
                  value={scheduledPosts.filter(p => p.status === 'scheduled').length}
                  icon={<Calendar className="h-4 w-4" />}
                  description="Ready to publish"
                  color="purple"
                />
                <MetricCard
                  title="Active Templates"
                  value={templates.filter(t => t.isActive).length}
                  icon={<Bot className="h-4 w-4" />}
                  description="Automation ready"
                  color="green"
                />
              </>
            )}
          </div>

          {/* Performance Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Engagement Trends */}
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle>Engagement Trends</CardTitle>
                <CardDescription>
                  Daily engagement across platforms
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={engagementData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Line type="monotone" dataKey="twitter" stroke="#000000" name="Twitter" strokeWidth={2} />
                      <Line type="monotone" dataKey="linkedin" stroke="#0077B5" name="LinkedIn" strokeWidth={2} />
                      <Line type="monotone" dataKey="tiktok" stroke="#000000" name="TikTok" strokeWidth={2} />
                      <Line type="monotone" dataKey="instagram" stroke="#E4405F" name="Instagram" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Platform Reach */}
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle>Platform Reach</CardTitle>
                <CardDescription>
                  Audience reach by platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={reachData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="reach" fill="#8B5CF6" name="Reach" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common automation tasks and shortcuts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" className="h-20 flex-col space-y-2">
                  <Zap className="h-6 w-6" />
                  <span>Auto-post New Episode</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col space-y-2">
                  <Hash className="h-6 w-6" />
                  <span>Optimize Hashtags</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col space-y-2">
                  <Target className="h-6 w-6" />
                  <span>Find Best Times</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="platforms" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {platforms.map((platform) => (
              <PlatformCard
                key={platform.id}
                platform={platform}
                onConnect={handleConnectPlatform}
                onDisconnect={disconnectPlatform}
                onToggle={handleTogglePlatform}
              />
            ))}
          </div>

          {connectedPlatforms.length > 0 && (
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle>Platform Performance</CardTitle>
                <CardDescription>
                  Comparative performance across connected platforms
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {connectedPlatforms.map((platform) => {
                    const performance = Math.floor(Math.random() * 40 + 60); // 60-100%
                    return (
                      <div key={platform.id} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{platform.icon}</span>
                            <span className="font-medium">{platform.displayName}</span>
                          </div>
                          <Badge variant="outline">{performance}% engagement</Badge>
                        </div>
                        <Progress value={performance} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="content" className="space-y-6">
          {/* Content Generation Settings */}
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader>
              <CardTitle>Content Generation Settings</CardTitle>
              <CardDescription>
                Configure how AI generates your social media content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="tone">Content Tone</Label>
                    <Select
                      value={contentSettings.tone}
                      onValueChange={(value: any) => updateContentSettings({ tone: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="energetic">Energetic</SelectItem>
                        <SelectItem value="inspirational">Inspirational</SelectItem>
                        <SelectItem value="conversational">Conversational</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={contentSettings.includeQuotes}
                        onCheckedChange={(checked) => updateContentSettings({ includeQuotes: checked })}
                      />
                      <Label>Include episode quotes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={contentSettings.includeStats}
                        onCheckedChange={(checked) => updateContentSettings({ includeStats: checked })}
                      />
                      <Label>Include statistics</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={contentSettings.includeCallToAction}
                        onCheckedChange={(checked) => updateContentSettings({ includeCallToAction: checked })}
                      />
                      <Label>Include call-to-action</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="hashtags">Custom Hashtags</Label>
                    <Input
                      placeholder="Enter hashtags separated by commas"
                      value={contentSettings.customHashtags.join(', ')}
                      onChange={(e) => {
                        const hashtags = e.target.value.split(',').map(h => h.trim()).filter(Boolean);
                        updateContentSettings({ customHashtags: hashtags });
                      }}
                    />
                  </div>

                  <div>
                    <Label>Mention Strategy</Label>
                    <Select
                      value={contentSettings.mentionStrategy}
                      onValueChange={(value: any) => updateContentSettings({ mentionStrategy: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No mentions</SelectItem>
                        <SelectItem value="guests">Mention guests</SelectItem>
                        <SelectItem value="collaborators">Mention collaborators</SelectItem>
                        <SelectItem value="all">Mention all relevant accounts</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Post Templates */}
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Post Templates</CardTitle>
                  <CardDescription>
                    Manage your automated post templates
                  </CardDescription>
                </div>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Template
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {templates.map((template) => (
                  <div key={template.id} className="border border-border/50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{template.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          For {template.platform} • {template.engagement.averageLikes} avg likes
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch checked={template.isActive} />
                        <Button variant="ghost" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="bg-muted/20 rounded p-3 text-sm">
                      {template.template.length > 150 
                        ? `${template.template.substring(0, 150)}...` 
                        : template.template
                      }
                    </div>
                    <div className="flex space-x-2">
                      {template.variables.map((variable) => (
                        <Badge key={variable} variant="outline" className="text-xs">
                          {`{${variable}}`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-6">
          {/* Scheduled Posts */}
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Scheduled Posts</CardTitle>
                  <CardDescription>
                    Upcoming and recent social media posts
                  </CardDescription>
                </div>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Post
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {scheduledPosts.slice(0, 8).map((post) => (
                  <div key={post.id} className="flex items-center space-x-4 p-3 border border-border/50 rounded-lg">
                    <div className="text-2xl">
                      {post.platform === 'twitter' && '𝕏'}
                      {post.platform === 'linkedin' && '💼'}
                      {post.platform === 'tiktok' && '🎵'}
                      {post.platform === 'instagram' && '📷'}
                      {post.platform === 'facebook' && '👥'}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium truncate">{post.episodeTitle}</h4>
                        <Badge variant={
                          post.status === 'scheduled' ? 'default' :
                          post.status === 'posted' ? 'secondary' :
                          post.status === 'failed' ? 'destructive' : 'outline'
                        }>
                          {post.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {post.content.length > 100 ? `${post.content.substring(0, 100)}...` : post.content}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {post.status === 'scheduled' ? 'Scheduled for' : 'Posted'}: {' '}
                        {new Date(post.scheduledTime).toLocaleString()}
                      </p>
                    </div>
                    
                    {post.engagement && (
                      <div className="text-sm text-muted-foreground">
                        <div className="flex items-center space-x-2">
                          <Heart className="h-3 w-3" />
                          <span>{post.engagement.likes}</span>
                          <MessageCircle className="h-3 w-3" />
                          <span>{post.engagement.comments}</span>
                        </div>
                      </div>
                    )}
                    
                    <Button variant="ghost" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {/* Analytics Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle>Performance by Platform</CardTitle>
                <CardDescription>
                  Engagement rates across connected platforms
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {connectedPlatforms.map((platform) => {
                    const engagement = Math.floor(Math.random() * 8 + 2); // 2-10%
                    const reach = Math.floor(Math.random() * 5000 + 1000);
                    return (
                      <div key={platform.id} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{platform.icon}</span>
                            <span className="font-medium">{platform.displayName}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{engagement}% engagement</p>
                            <p className="text-xs text-muted-foreground">{reach.toLocaleString()} reach</p>
                          </div>
                        </div>
                        <Progress value={engagement * 10} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle>Best Performing Content</CardTitle>
                <CardDescription>
                  Your top posts from the last 30 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {scheduledPosts
                    .filter(p => p.status === 'posted' && p.engagement)
                    .sort((a, b) => (b.engagement?.likes || 0) - (a.engagement?.likes || 0))
                    .slice(0, 3)
                    .map((post) => (
                      <div key={post.id} className="border border-border/50 rounded-lg p-3">
                        <div className="flex items-start space-x-3">
                          <div className="text-lg">
                            {post.platform === 'twitter' && '𝕏'}
                            {post.platform === 'linkedin' && '💼'}
                            {post.platform === 'tiktok' && '🎵'}
                            {post.platform === 'instagram' && '📷'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">{post.content}</p>
                            <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center space-x-1">
                                <Heart className="h-3 w-3" />
                                <span>{post.engagement?.likes}</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <MessageCircle className="h-3 w-3" />
                                <span>{post.engagement?.comments}</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <Share2 className="h-3 w-3" />
                                <span>{post.engagement?.shares}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Export Options */}
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader>
              <CardTitle>Export & Reports</CardTitle>
              <CardDescription>
                Download your social media performance data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => exportSocialData('csv', selectedTimeframe)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => exportSocialData('pdf', selectedTimeframe)}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}