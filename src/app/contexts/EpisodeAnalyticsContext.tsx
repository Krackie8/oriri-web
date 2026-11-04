import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

// Detailed analytics data structure for individual episodes
export interface EpisodeAnalytics {
  episodeId: string;
  
  // Core metrics
  totalPlays: number;
  uniqueListeners: number;
  averageListenDuration: number;
  completionRate: number;
  replayRate: number;
  
  // Engagement metrics
  likes: number;
  comments: number;
  shares: number;
  tips: number;
  tipAmount: number;
  
  // Audience insights
  demographics: {
    ageGroups: Array<{ range: string; percentage: number }>;
    genderDistribution: Array<{ gender: string; percentage: number }>;
    locations: Array<{ country: string; percentage: number; listens: number }>;
  };
  
  // Listening behavior
  listeningSessions: {
    averageSessionLength: number;
    peakListeningHours: Array<{ hour: number; listens: number }>;
    dayOfWeekDistribution: Array<{ day: string; listens: number }>;
    deviceTypes: Array<{ device: string; percentage: number }>;
  };
  
  // Content performance
  dropOffPoints: Array<{ timestamp: number; percentage: number; label: string }>;
  rewindPoints: Array<{ timestamp: number; count: number; reason: string }>;
  skipPoints: Array<{ timestamp: number; count: number; reason: string }>;
  
  // Revenue attribution
  revenue: {
    directTips: number;
    conversionToVip: number;
    storeReferrals: number;
    totalAttribution: number;
  };
  
  // Social & discovery
  socialMetrics: {
    sharesBreakdown: Array<{ platform: string; shares: number }>;
    viralityScore: number;
    referralSources: Array<{ source: string; listeners: number }>;
    hashtags: Array<{ tag: string; mentions: number }>;
  };
  
  // Comparative data
  comparison: {
    vs30DayAverage: number;
    vsChannelAverage: number;
    rankInChannel: number;
    trendDirection: 'up' | 'down' | 'stable';
  };
  
  // Temporal data
  performance: {
    firstWeekPlays: number;
    growthRate: number;
    peakDay: string;
    sustainedInterest: number; // percentage of initial audience still listening after 30 days
  };
}

export interface ListenerJourney {
  timestamp: number;
  action: 'play' | 'pause' | 'skip' | 'rewind' | 'like' | 'comment' | 'tip' | 'share';
  position: number;
  deviceType: string;
  location: string;
  sessionId: string;
}

export interface ContentInsights {
  topPerformingSegments: Array<{
    start: number;
    end: number;
    engagementScore: number;
    reason: string;
  }>;
  
  audienceRetention: Array<{
    timestamp: number;
    retentionRate: number;
    activeListeners: number;
  }>;
  
  sentimentAnalysis: {
    overallSentiment: 'positive' | 'neutral' | 'negative';
    keyPhrases: Array<{ phrase: string; sentiment: number; mentions: number }>;
    emotionalJourney: Array<{ timestamp: number; emotion: string; intensity: number }>;
  };
}

export interface EpisodeAnalyticsContextType {
  // Analytics data
  analytics: Record<string, EpisodeAnalytics>;
  insights: Record<string, ContentInsights>;
  listenerJourneys: Record<string, ListenerJourney[]>;
  isLoading: boolean;
  error: string | null;
  
  // Data fetching
  getEpisodeAnalytics: (episodeId: string) => Promise<EpisodeAnalytics>;
  getContentInsights: (episodeId: string) => Promise<ContentInsights>;
  getListenerJourneys: (episodeId: string, limit?: number) => Promise<ListenerJourney[]>;
  
  // Real-time tracking
  trackPlay: (episodeId: string, position: number, deviceType: string) => void;
  trackEngagement: (episodeId: string, action: string, position: number) => void;
  trackCompletion: (episodeId: string, completionRate: number) => void;
  
  // Analytics queries
  getTopPerformingEpisodes: (limit?: number) => EpisodeAnalytics[];
  getAudienceOverlap: (episodeId1: string, episodeId2: string) => number;
  getPredictedPerformance: (episodeId: string) => { expectedPlays: number; confidence: number };
  
  // Export and reporting
  exportAnalytics: (episodeId: string, format: 'csv' | 'pdf' | 'json') => Promise<void>;
  generateReport: (episodeId: string, type: 'summary' | 'detailed' | 'comparative') => Promise<string>;
  
  // Settings
  analyticsTimeframe: 'daily' | 'weekly' | 'monthly' | 'all-time';
  setAnalyticsTimeframe: (timeframe: 'daily' | 'weekly' | 'monthly' | 'all-time') => void;
  enableRealTimeTracking: boolean;
  setEnableRealTimeTracking: (enabled: boolean) => void;
}

const EpisodeAnalyticsContext = createContext<EpisodeAnalyticsContextType | undefined>(undefined);

// Mock data generators
function generateMockEpisodeAnalytics(episodeId: string): EpisodeAnalytics {
  const baseViews = Math.floor(Math.random() * 3000 + 500);
  
  return {
    episodeId,
    
    totalPlays: baseViews,
    uniqueListeners: Math.floor(baseViews * 0.75),
    averageListenDuration: Math.floor(Math.random() * 25 + 15), // 15-40 minutes
    completionRate: Math.floor(Math.random() * 40 + 55), // 55-95%
    replayRate: Math.floor(Math.random() * 15 + 5), // 5-20%
    
    likes: Math.floor(baseViews * 0.08),
    comments: Math.floor(baseViews * 0.03),
    shares: Math.floor(baseViews * 0.02),
    tips: Math.floor(baseViews * 0.005),
    tipAmount: Math.floor(baseViews * 0.005 * 15), // Average $15 per tip
    
    demographics: {
      ageGroups: [
        { range: '18-24', percentage: Math.floor(Math.random() * 20 + 15) },
        { range: '25-34', percentage: Math.floor(Math.random() * 25 + 25) },
        { range: '35-44', percentage: Math.floor(Math.random() * 20 + 20) },
        { range: '45-54', percentage: Math.floor(Math.random() * 15 + 10) },
        { range: '55+', percentage: Math.floor(Math.random() * 10 + 5) },
      ],
      genderDistribution: [
        { gender: 'Male', percentage: Math.floor(Math.random() * 20 + 40) },
        { gender: 'Female', percentage: Math.floor(Math.random() * 20 + 40) },
        { gender: 'Other/Prefer not to say', percentage: Math.floor(Math.random() * 10 + 5) },
      ],
      locations: [
        { country: 'United States', percentage: Math.floor(Math.random() * 20 + 35), listens: Math.floor(baseViews * 0.4) },
        { country: 'Canada', percentage: Math.floor(Math.random() * 10 + 8), listens: Math.floor(baseViews * 0.12) },
        { country: 'United Kingdom', percentage: Math.floor(Math.random() * 8 + 7), listens: Math.floor(baseViews * 0.1) },
        { country: 'Australia', percentage: Math.floor(Math.random() * 6 + 5), listens: Math.floor(baseViews * 0.08) },
        { country: 'Germany', percentage: Math.floor(Math.random() * 5 + 4), listens: Math.floor(baseViews * 0.06) },
      ],
    },
    
    listeningSessions: {
      averageSessionLength: Math.floor(Math.random() * 15 + 20), // 20-35 minutes
      peakListeningHours: Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        listens: Math.floor(Math.random() * 200 + (i >= 7 && i <= 22 ? 100 : 20)),
      })),
      dayOfWeekDistribution: [
        { day: 'Monday', listens: Math.floor(baseViews * 0.12) },
        { day: 'Tuesday', listens: Math.floor(baseViews * 0.15) },
        { day: 'Wednesday', listens: Math.floor(baseViews * 0.16) },
        { day: 'Thursday', listens: Math.floor(baseViews * 0.17) },
        { day: 'Friday', listens: Math.floor(baseViews * 0.14) },
        { day: 'Saturday', listens: Math.floor(baseViews * 0.13) },
        { day: 'Sunday', listens: Math.floor(baseViews * 0.13) },
      ],
      deviceTypes: [
        { device: 'Mobile', percentage: Math.floor(Math.random() * 15 + 60) },
        { device: 'Desktop', percentage: Math.floor(Math.random() * 15 + 20) },
        { device: 'Tablet', percentage: Math.floor(Math.random() * 8 + 8) },
        { device: 'Smart Speaker', percentage: Math.floor(Math.random() * 5 + 5) },
      ],
    },
    
    dropOffPoints: [
      { timestamp: 300, percentage: 8, label: 'Introduction end' },
      { timestamp: 900, percentage: 15, label: 'Topic transition' },
      { timestamp: 1800, percentage: 25, label: 'Mid-episode' },
      { timestamp: 2400, percentage: 35, label: 'Before conclusion' },
    ],
    
    rewindPoints: [
      { timestamp: 450, count: 45, reason: 'Key insight repetition' },
      { timestamp: 1200, count: 32, reason: 'Complex concept clarification' },
      { timestamp: 2100, count: 28, reason: 'Important quote replay' },
    ],
    
    skipPoints: [
      { timestamp: 150, count: 12, reason: 'Long introduction' },
      { timestamp: 1950, count: 18, reason: 'Advertisement break' },
      { timestamp: 2550, count: 25, reason: 'Lengthy outro' },
    ],
    
    revenue: {
      directTips: Math.floor(baseViews * 0.005 * 15),
      conversionToVip: Math.floor(baseViews * 0.02 * 19.99), // 2% convert to VIP
      storeReferrals: Math.floor(baseViews * 0.01 * 45), // 1% buy from store
      totalAttribution: 0, // Will be calculated
    },
    
    socialMetrics: {
      sharesBreakdown: [
        { platform: 'Twitter', shares: Math.floor(baseViews * 0.008) },
        { platform: 'LinkedIn', shares: Math.floor(baseViews * 0.006) },
        { platform: 'Facebook', shares: Math.floor(baseViews * 0.004) },
        { platform: 'Instagram', shares: Math.floor(baseViews * 0.003) },
      ],
      viralityScore: Math.floor(Math.random() * 40 + 20), // 20-60
      referralSources: [
        { source: 'Direct', listeners: Math.floor(baseViews * 0.4) },
        { source: 'Social Media', listeners: Math.floor(baseViews * 0.25) },
        { source: 'Search', listeners: Math.floor(baseViews * 0.2) },
        { source: 'Referral', listeners: Math.floor(baseViews * 0.15) },
      ],
      hashtags: [
        { tag: 'motivation', mentions: Math.floor(Math.random() * 50 + 20) },
        { tag: 'success', mentions: Math.floor(Math.random() * 40 + 15) },
        { tag: 'business', mentions: Math.floor(Math.random() * 35 + 10) },
      ],
    },
    
    comparison: {
      vs30DayAverage: Math.floor(Math.random() * 40 - 20), // -20% to +20%
      vsChannelAverage: Math.floor(Math.random() * 30 - 15), // -15% to +15%
      rankInChannel: Math.floor(Math.random() * 20 + 1), // 1-20
      trendDirection: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)] as any,
    },
    
    performance: {
      firstWeekPlays: Math.floor(baseViews * 0.6),
      growthRate: Math.floor(Math.random() * 20 + 5), // 5-25% weekly growth
      peakDay: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'][Math.floor(Math.random() * 5)],
      sustainedInterest: Math.floor(Math.random() * 30 + 40), // 40-70%
    },
  };
}

function generateMockContentInsights(episodeId: string): ContentInsights {
  return {
    topPerformingSegments: [
      { start: 300, end: 600, engagementScore: 92, reason: 'High-value content introduction' },
      { start: 1200, end: 1500, engagementScore: 88, reason: 'Expert interview segment' },
      { start: 2100, end: 2400, engagementScore: 85, reason: 'Actionable advice section' },
    ],
    
    audienceRetention: Array.from({ length: 48 }, (_, i) => ({
      timestamp: i * 60, // Every minute for 48 minutes
      retentionRate: Math.max(20, 100 - (i * 1.5) - Math.random() * 10),
      activeListeners: Math.floor(Math.random() * 200 + 100),
    })),
    
    sentimentAnalysis: {
      overallSentiment: ['positive', 'neutral', 'negative'][Math.floor(Math.random() * 3)] as any,
      keyPhrases: [
        { phrase: 'extremely helpful', sentiment: 0.9, mentions: 45 },
        { phrase: 'great insights', sentiment: 0.8, mentions: 32 },
        { phrase: 'actionable advice', sentiment: 0.85, mentions: 28 },
        { phrase: 'well explained', sentiment: 0.7, mentions: 23 },
      ],
      emotionalJourney: Array.from({ length: 20 }, (_, i) => ({
        timestamp: i * 150, // Every 2.5 minutes
        emotion: ['excited', 'curious', 'inspired', 'engaged', 'thoughtful'][Math.floor(Math.random() * 5)],
        intensity: Math.random() * 0.8 + 0.2, // 0.2 to 1.0
      })),
    },
  };
}

function generateMockListenerJourneys(episodeId: string, limit: number = 100): ListenerJourney[] {
  const journeys: ListenerJourney[] = [];
  
  for (let i = 0; i < limit; i++) {
    const sessionId = `session-${i}`;
    const deviceTypes = ['mobile', 'desktop', 'tablet'];
    const locations = ['US', 'CA', 'UK', 'AU', 'DE'];
    const actions: ListenerJourney['action'][] = ['play', 'pause', 'skip', 'rewind', 'like', 'comment', 'tip', 'share'];
    
    // Generate a journey with multiple actions
    const journeyLength = Math.floor(Math.random() * 8 + 3); // 3-10 actions per journey
    
    for (let j = 0; j < journeyLength; j++) {
      journeys.push({
        timestamp: Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000, // Last 7 days
        action: actions[Math.floor(Math.random() * actions.length)],
        position: Math.floor(Math.random() * 2700), // 45 minute episode
        deviceType: deviceTypes[Math.floor(Math.random() * deviceTypes.length)],
        location: locations[Math.floor(Math.random() * locations.length)],
        sessionId: `${sessionId}-${j}`,
      });
    }
  }
  
  return journeys.sort((a, b) => b.timestamp - a.timestamp);
}

interface EpisodeAnalyticsProviderProps {
  children: ReactNode;
}

export function EpisodeAnalyticsProvider({ children }: EpisodeAnalyticsProviderProps) {
  const [analytics, setAnalytics] = useState<Record<string, EpisodeAnalytics>>({});
  const [insights, setInsights] = useState<Record<string, ContentInsights>>({});
  const [listenerJourneys, setListenerJourneys] = useState<Record<string, ListenerJourney[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState<'daily' | 'weekly' | 'monthly' | 'all-time'>('weekly');
  const [enableRealTimeTracking, setEnableRealTimeTracking] = useState(true);

  const getEpisodeAnalytics = async (episodeId: string): Promise<EpisodeAnalytics> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      if (!analytics[episodeId]) {
        const newAnalytics = generateMockEpisodeAnalytics(episodeId);
        // Calculate total attribution
        newAnalytics.revenue.totalAttribution = 
          newAnalytics.revenue.directTips + 
          newAnalytics.revenue.conversionToVip + 
          newAnalytics.revenue.storeReferrals;
        
        setAnalytics(prev => ({ ...prev, [episodeId]: newAnalytics }));
      }
      
      console.log('[EpisodeAnalytics] Analytics loaded for episode:', episodeId);
      return analytics[episodeId];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load episode analytics';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const getContentInsights = async (episodeId: string): Promise<ContentInsights> => {
    if (!insights[episodeId]) {
      const newInsights = generateMockContentInsights(episodeId);
      setInsights(prev => ({ ...prev, [episodeId]: newInsights }));
    }
    return insights[episodeId];
  };

  const getListenerJourneys = async (episodeId: string, limit: number = 100): Promise<ListenerJourney[]> => {
    if (!listenerJourneys[episodeId]) {
      const journeys = generateMockListenerJourneys(episodeId, limit);
      setListenerJourneys(prev => ({ ...prev, [episodeId]: journeys }));
    }
    return listenerJourneys[episodeId].slice(0, limit);
  };

  // Real-time tracking functions
  const trackPlay = async (episodeId: string, position: number, deviceType: string) => {
    if (!enableRealTimeTracking) return;
    
    console.log('[EpisodeAnalytics] Play tracked:', { episodeId, position, deviceType });
    
    try {
      // Get API credentials
      if (!projectId || !publicAnonKey) {
        console.warn('[EpisodeAnalytics] Supabase credentials not available, tracking locally only');
        return;
      }
      
      const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32`;
      
      // Generate or get session ID
      let sessionId = localStorage.getItem('analytics_session_id');
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('analytics_session_id', sessionId);
      }
      
      // Call backend tracking API
      const response = await fetch(`${baseUrl}/analytics/track-play`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          episodeId,
          position,
          deviceType,
          sessionId,
          userId: null, // Will be enhanced with actual user ID if logged in
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('[EpisodeAnalytics] Play tracked successfully on backend:', result.data);
      } else {
        console.warn('[EpisodeAnalytics] Failed to track play on backend');
      }
    } catch (error) {
      console.error('[EpisodeAnalytics] Error tracking play:', error);
    }
    
    // Update analytics in real-time (optimistic update)
    setAnalytics(prev => {
      if (prev[episodeId]) {
        return {
          ...prev,
          [episodeId]: {
            ...prev[episodeId],
            totalPlays: prev[episodeId].totalPlays + 1,
          }
        };
      }
      return prev;
    });
  };

  const trackEngagement = async (episodeId: string, action: string, position: number) => {
    if (!enableRealTimeTracking) return;
    
    console.log('[EpisodeAnalytics] Engagement tracked:', { episodeId, action, position });
    
    try {
      // Get API credentials
      if (!projectId || !publicAnonKey) {
        console.warn('[EpisodeAnalytics] Supabase credentials not available, tracking locally only');
        return;
      }
      
      const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32`;
      
      // Call backend tracking API
      const response = await fetch(`${baseUrl}/analytics/track-engagement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          episodeId,
          action,
          position,
          userId: null, // Will be enhanced with actual user ID if logged in
          metadata: {},
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('[EpisodeAnalytics] Engagement tracked successfully on backend:', result.data);
      } else {
        console.warn('[EpisodeAnalytics] Failed to track engagement on backend');
      }
    } catch (error) {
      console.error('[EpisodeAnalytics] Error tracking engagement:', error);
    }
    
    // Update engagement metrics (optimistic update)
    setAnalytics(prev => {
      if (prev[episodeId]) {
        const updated = { ...prev[episodeId] };
        switch (action) {
          case 'like':
            updated.likes += 1;
            break;
          case 'comment':
            updated.comments += 1;
            break;
          case 'share':
            updated.shares += 1;
            break;
          case 'tip':
            updated.tips += 1;
            updated.tipAmount += 15; // Average tip amount
            break;
        }
        return { ...prev, [episodeId]: updated };
      }
      return prev;
    });
  };

  const trackCompletion = async (episodeId: string, completionRate: number) => {
    if (!enableRealTimeTracking) return;
    
    console.log('[EpisodeAnalytics] Completion tracked:', { episodeId, completionRate });
    
    try {
      // Get API credentials
      if (!projectId || !publicAnonKey) {
        console.warn('[EpisodeAnalytics] Supabase credentials not available, tracking locally only');
        return;
      }
      
      const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32`;
      
      // Get session ID
      const sessionId = localStorage.getItem('analytics_session_id') || null;
      
      // Calculate listen time (rough estimate based on completion rate)
      // Assuming average episode is 30 minutes
      const estimatedListenTime = Math.floor((completionRate / 100) * 30 * 60); // in seconds
      
      // Call backend tracking API
      const response = await fetch(`${baseUrl}/analytics/track-completion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          episodeId,
          completionRate,
          listenTime: estimatedListenTime,
          userId: null, // Will be enhanced with actual user ID if logged in
          sessionId,
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('[EpisodeAnalytics] Completion tracked successfully on backend:', result.data);
      } else {
        console.warn('[EpisodeAnalytics] Failed to track completion on backend');
      }
    } catch (error) {
      console.error('[EpisodeAnalytics] Error tracking completion:', error);
    }
  };

  // Analytics queries
  const getTopPerformingEpisodes = (limit: number = 10): EpisodeAnalytics[] => {
    return Object.values(analytics)
      .sort((a, b) => b.totalPlays - a.totalPlays)
      .slice(0, limit);
  };

  const getAudienceOverlap = (episodeId1: string, episodeId2: string): number => {
    // Mock audience overlap calculation
    return Math.floor(Math.random() * 60 + 20); // 20-80% overlap
  };

  const getPredictedPerformance = (episodeId: string): { expectedPlays: number; confidence: number } => {
    const currentAnalytics = analytics[episodeId];
    if (!currentAnalytics) {
      return { expectedPlays: 0, confidence: 0 };
    }
    
    // Simple prediction based on current trajectory
    const growthRate = currentAnalytics.performance.growthRate / 100;
    const expectedPlays = Math.floor(currentAnalytics.totalPlays * (1 + growthRate));
    const confidence = Math.floor(Math.random() * 30 + 70); // 70-100% confidence
    
    return { expectedPlays, confidence };
  };

  // Export and reporting
  const exportAnalytics = async (episodeId: string, format: 'csv' | 'pdf' | 'json'): Promise<void> => {
    console.log(`[EpisodeAnalytics] Exporting ${format} for episode:`, episodeId);
    // Simulate export process
    await new Promise(resolve => setTimeout(resolve, 1500));
    alert(`Analytics exported as ${format.toUpperCase()} file`);
  };

  const generateReport = async (episodeId: string, type: 'summary' | 'detailed' | 'comparative'): Promise<string> => {
    console.log(`[EpisodeAnalytics] Generating ${type} report for episode:`, episodeId);
    await new Promise(resolve => setTimeout(resolve, 2000));
    return `${type.charAt(0).toUpperCase() + type.slice(1)} report generated for episode ${episodeId}`;
  };

  const contextValue: EpisodeAnalyticsContextType = {
    analytics,
    insights,
    listenerJourneys,
    isLoading,
    error,
    getEpisodeAnalytics,
    getContentInsights,
    getListenerJourneys,
    trackPlay,
    trackEngagement,
    trackCompletion,
    getTopPerformingEpisodes,
    getAudienceOverlap,
    getPredictedPerformance,
    exportAnalytics,
    generateReport,
    analyticsTimeframe,
    setAnalyticsTimeframe,
    enableRealTimeTracking,
    setEnableRealTimeTracking,
  };

  return (
    <EpisodeAnalyticsContext.Provider value={contextValue}>
      {children}
    </EpisodeAnalyticsContext.Provider>
  );
}

export function useEpisodeAnalytics() {
  const context = useContext(EpisodeAnalyticsContext);
  if (context === undefined) {
    throw new Error('useEpisodeAnalytics must be used within an EpisodeAnalyticsProvider');
  }
  return context;
}