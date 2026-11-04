import React, { useState, useEffect } from 'react';
import { useEpisodeAnalytics } from '../../contexts/EpisodeAnalyticsContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Skeleton } from '../ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Eye,
  Heart,
  MessageCircle,
  DollarSign,
  Users,
  Clock,
  Target,
  ShoppingBag
} from 'lucide-react';
import EpisodeAnalyticsDashboard from './EpisodeAnalyticsDashboard';

interface EpisodeAnalyticsOverviewProps {
  episodeId: string;
  episodeTitle?: string;
  compact?: boolean;
}

export default function EpisodeAnalyticsOverview({ 
  episodeId, 
  episodeTitle, 
  compact = false 
}: EpisodeAnalyticsOverviewProps) {
  const { getEpisodeAnalytics, isLoading } = useEpisodeAnalytics();
  const [analytics, setAnalytics] = useState<any>(null);
  const [isDetailedOpen, setIsDetailedOpen] = useState(false);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const data = await getEpisodeAnalytics(episodeId);
        setAnalytics(data);
      } catch (err) {
        console.error('Error loading analytics overview:', err);
      }
    };

    loadAnalytics();
  }, [episodeId]);

  if (isLoading && !analytics) {
    return (
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-6 w-12" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!analytics) return null;

  // Prepare mini chart data for retention
  const retentionData = Array.from({ length: 12 }, (_, i) => ({
    time: i * 5, // 5-minute intervals
    retention: Math.max(20, 100 - (i * 6) - Math.random() * 10)
  }));

  const getPerformanceColor = (value: number) => {
    if (value >= 80) return 'text-green-500';
    if (value >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getPerformanceBadge = (value: number, threshold: { good: number; average: number }) => {
    if (value >= threshold.good) return 'default';
    if (value >= threshold.average) return 'secondary';
    return 'destructive';
  };

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Episode Analytics</CardTitle>
            <CardDescription>
              {episodeTitle || `Episode ${episodeId}`} • Performance Overview
            </CardDescription>
          </div>
          <Dialog open={isDetailedOpen} onOpenChange={setIsDetailedOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4" />
                <span>Detailed</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-7xl max-h-[95vh] overflow-auto">
              <DialogHeader>
                <DialogTitle>Detailed Episode Analytics</DialogTitle>
                <DialogDescription>
                  Comprehensive performance insights and audience analytics
                </DialogDescription>
              </DialogHeader>
              <EpisodeAnalyticsDashboard episodeId={episodeId} episodeTitle={episodeTitle} />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-1">
              <Eye className="h-3 w-3 text-blue-500" />
              <span className="text-xs text-muted-foreground">Views</span>
            </div>
            <p className="text-lg font-bold">{analytics.totalPlays.toLocaleString()}</p>
            <div className="flex items-center space-x-1">
              {analytics.comparison.vs30DayAverage > 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span className={`text-xs ${analytics.comparison.vs30DayAverage > 0 ? 'text-green-500' : 'text-red-500'}`}>
                {analytics.comparison.vs30DayAverage > 0 ? '+' : ''}{analytics.comparison.vs30DayAverage.toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center space-x-1">
              <Target className="h-3 w-3 text-green-500" />
              <span className="text-xs text-muted-foreground">Completion</span>
            </div>
            <p className="text-lg font-bold">{analytics.completionRate}%</p>
            <Badge 
              variant={getPerformanceBadge(analytics.completionRate, { good: 75, average: 60 })}
              className="text-xs px-1 py-0"
            >
              {analytics.completionRate >= 75 ? 'Excellent' : analytics.completionRate >= 60 ? 'Good' : 'Needs Work'}
            </Badge>
          </div>

          <div className="space-y-1">
            <div className="flex items-center space-x-1">
              <Heart className="h-3 w-3 text-red-500" />
              <span className="text-xs text-muted-foreground">Engagement</span>
            </div>
            <p className="text-lg font-bold">
              {((analytics.likes + analytics.comments + analytics.shares) / analytics.totalPlays * 100).toFixed(1)}%
            </p>
            <span className="text-xs text-muted-foreground">
              {(analytics.likes + analytics.comments + analytics.shares).toLocaleString()} total
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center space-x-1">
              <DollarSign className="h-3 w-3 text-green-500" />
              <span className="text-xs text-muted-foreground">Revenue</span>
            </div>
            <p className="text-lg font-bold">${analytics.revenue.totalAttribution}</p>
            <span className="text-xs text-muted-foreground">
              ${(analytics.revenue.totalAttribution / analytics.totalPlays).toFixed(2)} per view
            </span>
          </div>
        </div>

        {/* Mini Retention Chart */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Audience Retention</h4>
            <span className="text-xs text-muted-foreground">
              Avg: {analytics.averageListenDuration}m
            </span>
          </div>
          <div className="h-16">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={retentionData}>
                <XAxis dataKey="time" hide />
                <YAxis hide />
                <Tooltip 
                  formatter={(value) => [`${value.toFixed(0)}%`, 'Retention']}
                  labelFormatter={(time) => `${time} min`}
                />
                <Line 
                  type="monotone" 
                  dataKey="retention" 
                  stroke="#8B5CF6" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Performance Indicators */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/50">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Channel Rank</span>
              <Badge variant="outline" className="text-xs">
                #{analytics.comparison.rankInChannel}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Virality Score</span>
              <span className={`text-xs font-medium ${getPerformanceColor(analytics.socialMetrics.viralityScore)}`}>
                {analytics.socialMetrics.viralityScore}/100
              </span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Unique Listeners</span>
              <span className="text-xs font-medium">
                {((analytics.uniqueListeners / analytics.totalPlays) * 100).toFixed(0)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Replay Rate</span>
              <span className="text-xs font-medium">
                {analytics.replayRate}%
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions - Only if not compact */}
        {!compact && (
          <div className="flex space-x-2 pt-2 border-t border-border/50">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsDetailedOpen(true)}
              className="flex-1"
            >
              View Details
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
            >
              Export Data
            </Button>
          </div>
        )}

        {/* Performance Summary */}
        <div className="bg-muted/20 rounded-lg p-3 space-y-2">
          <h4 className="text-sm font-medium">Performance Summary</h4>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              • <span className="text-green-400">Strong completion rate</span> indicates engaging content
            </p>
            <p>
              • <span className="text-blue-400">Above-average engagement</span> with {analytics.likes + analytics.comments} interactions
            </p>
            {analytics.revenue.totalAttribution > 100 && (
              <p>
                • <span className="text-green-400">High revenue attribution</span> of ${analytics.revenue.totalAttribution}
              </p>
            )}
            {analytics.comparison.rankInChannel <= 5 && (
              <p>
                • <span className="text-purple-400">Top performer</span> ranking #{analytics.comparison.rankInChannel} in channel
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}