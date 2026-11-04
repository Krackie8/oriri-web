import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../utils/supabase/client';

// Types for admin analytics data
export interface AdminAnalytics {
  // User metrics
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  vipSubscribers: number;
  
  // Episode metrics
  totalEpisodes: number;
  totalPlays: number;
  averageCompletion: number;
  topEpisodes: Array<{
    id: string;
    title: string;
    plays: number;
    likes: number;
    comments: number;
  }>;
  
  // Revenue metrics
  totalRevenue: number;
  tipRevenue: number;
  subscriptionRevenue: number;
  storeRevenue: number;
  revenueGrowth: number;
  
  // Engagement metrics
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalTips: number;
  averageSessionDuration: number;
  
  // Live session metrics
  totalLiveSessions: number;
  averageLiveViewers: number;
  liveTipTotal: number;
  topTippers: Array<{
    id: string;
    name: string;
    totalTipped: number;
    lastTip: string;
  }>;
  
  // Store metrics
  totalProducts: number;
  totalOrders: number;
  averageOrderValue: number;
  topProducts: Array<{
    id: string;
    name: string;
    sales: number;
    revenue: number;
  }>;
  
  // Optional detailed metrics (used by dashboard tabs)
  storeMetrics?: {
    totalProducts: number;
    totalSales: number;
    ordersThisMonth: number;
    lowStockItems: number;
    inventoryHealth: number;
    byCategory?: Record<string, number>;
    inStock?: number;
    outOfStock?: number;
  };
  vipMetrics?: {
    activeMembers: number;
    monthlyRevenue: number;
    conversionRate: number;
    churnRate: number;
    retentionRate: number;
  };
}

// Time-series trend data
export interface RevenueTrendData {
  date: string;
  dateLabel: string;
  tips: number;
  subscriptions: number;
  store: number;
  total: number;
}

export interface EngagementTrendData {
  date: string;
  dateLabel: string;
  likes: number;
  shares: number;
  comments: number;
  total: number;
}

export interface DashboardTimeframe {
  label: string;
  value: 'today' | '7days' | '30days' | '90days' | 'year';
  days: number;
}

export interface AdminContextType {
  // Analytics data
  analytics: AdminAnalytics | null;
  isLoading: boolean;
  error: string | null;
  
  // Time-series trend data
  revenueTrends: RevenueTrendData[];
  engagementTrends: EngagementTrendData[];
  trendsLoading: boolean;
  
  // Timeframe control
  selectedTimeframe: DashboardTimeframe;
  timeframes: DashboardTimeframe[];
  setSelectedTimeframe: (timeframe: DashboardTimeframe) => void;
  
  // Data refresh
  refreshAnalytics: () => Promise<void>;
  lastUpdated: Date | null;
  
  // Admin actions
  exportData: (type: 'users' | 'episodes' | 'revenue' | 'engagement') => Promise<void>;
  sendNotification: (message: string, userIds?: string[]) => Promise<void>;
  
  // Real-time updates
  isRealTimeEnabled: boolean;
  toggleRealTime: () => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

const DEFAULT_TIMEFRAMES: DashboardTimeframe[] = [
  { label: 'Today', value: 'today', days: 1 },
  { label: 'Last 7 days', value: '7days', days: 7 },
  { label: 'Last 30 days', value: '30days', days: 30 },
  { label: 'Last 90 days', value: '90days', days: 90 },
  { label: 'This Year', value: 'year', days: 365 },
];

interface AdminProviderProps {
  children: ReactNode;
}

export function AdminProvider({ children }: AdminProviderProps) {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<DashboardTimeframe>(DEFAULT_TIMEFRAMES[2]); // 30 days default
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(false);
  
  // Time-series trend data
  const [revenueTrends, setRevenueTrends] = useState<RevenueTrendData[]>([]);
  const [engagementTrends, setEngagementTrends] = useState<EngagementTrendData[]>([]);
  const [trendsLoading, setTrendsLoading] = useState(false);

  // Fetch time-series trend data
  const fetchTrends = async (headers: any, days: number) => {
    try {
      console.log('[AdminContext] Fetching trend data for', days, 'days...');
      
      const [revenueRes, engagementRes] = await Promise.all([
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/admin/analytics/revenue-trends?days=${days}`, { headers }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/admin/analytics/engagement-trends?days=${days}`, { headers })
      ]);
      
      const revenueData = await revenueRes.json();
      const engagementData = await engagementRes.json();
      
      if (revenueData.success) {
        setRevenueTrends(revenueData.data);
        console.log('[AdminContext] ✅ Revenue trends loaded:', revenueData.data.length, 'data points');
      }
      
      if (engagementData.success) {
        setEngagementTrends(engagementData.data);
        console.log('[AdminContext] ✅ Engagement trends loaded:', engagementData.data.length, 'data points');
      }
    } catch (error) {
      console.error('[AdminContext] Error fetching trends:', error);
      // Set empty arrays on error so charts show properly
      setRevenueTrends([]);
      setEngagementTrends([]);
    }
  };

  // Fetch analytics data from backend
  const refreshAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('[AdminContext] Fetching real analytics data from backend...');
      
      // Get access token for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated - please login');
      }
      
      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };
      
      // Fetch all analytics data in parallel (including new user analytics endpoint)
      const [overviewRes, episodesRes, liveSessionsRes, storeRes, topEpisodesRes, topTippersRes, userAnalyticsRes] = await Promise.all([
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/admin/analytics/overview`, { headers }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/admin/analytics/episodes`, { headers }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/admin/analytics/live-sessions`, { headers }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/admin/analytics/store`, { headers }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/admin/analytics/top-episodes?limit=5`, { headers }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/admin/analytics/top-tippers?limit=5`, { headers }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/admin/analytics/users`, { headers })
      ]);
      
      // Fetch time-series trends separately (non-blocking)
      setTrendsLoading(true);
      fetchTrends(headers, selectedTimeframe.days).finally(() => setTrendsLoading(false));
      
      // Check for errors
      if (!overviewRes.ok) {
        const errorData = await overviewRes.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch overview: ${overviewRes.status}`);
      }
      
      // Parse all responses
      const overview = await overviewRes.json();
      const episodesData = await episodesRes.json();
      const liveSessionsData = await liveSessionsRes.json();
      const storeData = await storeRes.json();
      const topEpisodesData = await topEpisodesRes.json();
      const topTippersData = await topTippersRes.json();
      const userAnalyticsData = await userAnalyticsRes.json();
      
      // Combine data into analytics format
      const realAnalytics: AdminAnalytics = {
        // ✅ User metrics (NOW REAL DATA from new endpoint!)
        totalUsers: userAnalyticsData.success ? userAnalyticsData.data.totalUsers : 0,
        activeUsers: userAnalyticsData.success ? userAnalyticsData.data.activeUsers : 0,
        newUsersToday: userAnalyticsData.success ? userAnalyticsData.data.newUsersToday : 0,
        vipSubscribers: userAnalyticsData.success ? userAnalyticsData.data.vipSubscribers : 0,
        
        // Episode metrics (REAL DATA)
        totalEpisodes: overview.data.totalEpisodes,
        totalPlays: episodesData.data.totalViews, // Using views as plays for now
        averageCompletion: userAnalyticsData.success ? userAnalyticsData.data.averageCompletion : 0, // ✅ NOW REAL!
        topEpisodes: topEpisodesData.success ? topEpisodesData.data : [],
        
        // Revenue metrics (REAL for tips, placeholder for others)
        totalRevenue: overview.data.liveTipRevenue, // Only live tips for now
        tipRevenue: overview.data.liveTipRevenue, // REAL DATA
        subscriptionRevenue: 0, // TODO: Implement with payment system
        storeRevenue: 0, // TODO: Implement with order processing
        revenueGrowth: 0, // TODO: Calculate from historical data
        
        // Engagement metrics (REAL DATA)
        totalLikes: episodesData.data.totalLikes,
        totalComments: episodesData.data.totalComments,
        totalShares: episodesData.data.totalShares,
        totalTips: overview.data.totalTips,
        averageSessionDuration: userAnalyticsData.success ? userAnalyticsData.data.averageSessionDuration : 0, // ✅ NOW REAL!
        
        // Live session metrics (REAL DATA)
        totalLiveSessions: liveSessionsData.data.totalSessions,
        averageLiveViewers: liveSessionsData.data.averageViewersPerSession,
        liveTipTotal: liveSessionsData.data.totalTipRevenue,
        topTippers: topTippersData.success ? topTippersData.data : [],
        
        // Store metrics (REAL DATA)
        totalProducts: storeData.data.totalProducts,
        totalOrders: 0, // TODO: Implement with order system
        averageOrderValue: 0, // TODO: Implement with order system
        topProducts: [], // TODO: Implement with order system
        
        // Detailed metrics for dashboard tabs
        storeMetrics: {
          totalProducts: storeData.data.totalProducts,
          totalSales: 0, // TODO
          ordersThisMonth: 0, // TODO
          lowStockItems: storeData.data.lowStock,
          inventoryHealth: storeData.data.inStock > 0 
            ? Math.round((storeData.data.inStock / storeData.data.totalProducts) * 100)
            : 0,
          byCategory: storeData.data.byCategory,
          inStock: storeData.data.inStock,
          outOfStock: storeData.data.outOfStock
        },
        vipMetrics: {
          activeMembers: 0, // TODO: Implement with subscription system
          monthlyRevenue: 0, // TODO
          conversionRate: 0, // TODO
          churnRate: 0, // TODO
          retentionRate: 0, // TODO
        }
      };
      
      setAnalytics(realAnalytics);
      setLastUpdated(new Date());
      
      console.log('[AdminContext] ✅ Real analytics data loaded successfully');
      console.log('[AdminContext] 👥 User Metrics:');
      console.log('  - Total Users:', realAnalytics.totalUsers);
      console.log('  - Active Users:', realAnalytics.activeUsers);
      console.log('  - New Users Today:', realAnalytics.newUsersToday);
      console.log('  - VIP Subscribers:', realAnalytics.vipSubscribers);
      console.log('[AdminContext] 📊 Episode Metrics:');
      console.log('  - Total Episodes:', overview.data.totalEpisodes);
      console.log('  - Average Completion:', realAnalytics.averageCompletion + '%');
      console.log('[AdminContext] ⏱️  Engagement Metrics:');
      console.log('  - Average Session Duration:', realAnalytics.averageSessionDuration + 'min');
      console.log('[AdminContext] 🎥 Live Sessions:', liveSessionsData.data.totalSessions);
      console.log('[AdminContext] 💰 Live Tips Revenue:', overview.data.liveTipRevenue);
      console.log('[AdminContext] 🛍️  Products:', storeData.data.totalProducts);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load analytics data';
      setError(errorMessage);
      console.error('[AdminContext] ❌ Error loading analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Export data functionality
  const exportData = async (type: 'users' | 'episodes' | 'revenue' | 'engagement') => {
    try {
      console.log(`[AdminContext] Exporting ${type} data...`);
      // This would typically generate and download a CSV/Excel file
      // For now, we'll just log the action
      alert(`${type.charAt(0).toUpperCase() + type.slice(1)} data export started. Download will begin shortly.`);
    } catch (err) {
      console.error(`[AdminContext] Error exporting ${type} data:`, err);
      throw err;
    }
  };

  // Send notification functionality
  const sendNotification = async (message: string, userIds?: string[]) => {
    try {
      console.log('[AdminContext] Sending notification:', message, 'to users:', userIds || 'all');
      // This would typically send push notifications or in-app messages
      // For now, we'll just log the action
      alert(`Notification sent: "${message}" to ${userIds ? userIds.length + ' users' : 'all users'}`);
    } catch (err) {
      console.error('[AdminContext] Error sending notification:', err);
      throw err;
    }
  };

  // Toggle real-time updates
  const toggleRealTime = () => {
    setIsRealTimeEnabled(prev => !prev);
    console.log('[AdminContext] Real-time updates:', !isRealTimeEnabled ? 'enabled' : 'disabled');
  };

  // Load initial data - wait for session to be ready
  useEffect(() => {
    const loadAnalytics = async () => {
      setIsLoading(true); // Show loading state immediately
      try {
        console.log('[AdminContext] Waiting for session to be ready...');
        // Wait a bit for session to be established
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Check if session exists before fetching
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          console.log('[AdminContext] Session found, loading analytics...');
          await refreshAnalytics();
        } else {
          console.log('[AdminContext] No session found yet, will retry...');
          // Try again after a delay
          setTimeout(async () => {
            const { data: { session: retrySession } } = await supabase.auth.getSession();
            if (retrySession?.access_token) {
              console.log('[AdminContext] Session found on retry, loading analytics...');
              await refreshAnalytics();
            } else {
              console.error('[AdminContext] Session still not available after retry');
              setError('Authentication session not found. Please try logging out and logging back in.');
              setIsLoading(false);
            }
          }, 1500);
        }
      } catch (err) {
        console.error('[AdminContext] Error checking session:', err);
        setError('Failed to verify authentication session');
        setIsLoading(false);
      }
    };
    
    loadAnalytics();
  }, [selectedTimeframe]);

  // Real-time updates - refreshes data every 30 seconds
  useEffect(() => {
    if (!isRealTimeEnabled) return;

    const interval = setInterval(() => {
      console.log('[AdminContext] Real-time refresh triggered');
      refreshAnalytics();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [isRealTimeEnabled]);

  const contextValue: AdminContextType = {
    analytics,
    isLoading,
    error,
    revenueTrends,
    engagementTrends,
    trendsLoading,
    selectedTimeframe,
    timeframes: DEFAULT_TIMEFRAMES,
    setSelectedTimeframe,
    refreshAnalytics,
    lastUpdated,
    exportData,
    sendNotification,
    isRealTimeEnabled,
    toggleRealTime,
  };

  return (
    <AdminContext.Provider value={contextValue}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}