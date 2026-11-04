import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner@2.0.3';
import { frontendPodcastService } from '../utils/frontendPodcastService';
import { ExternalEpisode, PlatformStats } from '../types/podcast';

export type { ExternalEpisode, PlatformStats } from '../types/podcast';

interface PodcastPlatformContextType {
  // Episodes
  externalEpisodes: ExternalEpisode[];
  spotifyEpisodes: ExternalEpisode[];
  appleEpisodes: ExternalEpisode[];
  youtubeEpisodes: ExternalEpisode[];
  
  // Stats
  platformStats: PlatformStats;
  
  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;
  lastSyncTime: Date | null;
  
  // Actions
  syncAllPlatforms: () => Promise<void>;
  syncSpotify: () => Promise<void>;
  syncApplePodcasts: () => Promise<void>;
  syncYouTube: () => Promise<void>;
  refreshEpisodes: () => Promise<void>;
  
  // Utilities
  getEpisodeByPlatformId: (platformId: string, platform: 'spotify' | 'apple' | 'youtube') => ExternalEpisode | null;
  getLatestEpisodes: (limit?: number) => ExternalEpisode[];
  searchEpisodes: (query: string) => ExternalEpisode[];
  searchEpisodesAsync: (query: string, limit?: number) => Promise<ExternalEpisode[]>;
  
  // Error handling
  error: string | null;
  clearError: () => void;
}

const PodcastPlatformContext = createContext<PodcastPlatformContextType | null>(null);

export function PodcastPlatformProvider({ children }: { children: React.ReactNode }) {
  const [externalEpisodes, setExternalEpisodes] = useState<ExternalEpisode[]>([]);
  const [platformStats, setPlatformStats] = useState<PlatformStats>({
    spotify: { totalEpisodes: 0, totalPlays: 0, followers: 0, isConnected: false },
    apple: { totalEpisodes: 0, totalPlays: 0, followers: 0, isConnected: false },
    youtube: { totalEpisodes: 0, totalViews: 0, subscribers: 0, isConnected: false }
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filter episodes by platform
  const spotifyEpisodes = externalEpisodes.filter(ep => ep.platform === 'spotify');
  const appleEpisodes = externalEpisodes.filter(ep => ep.platform === 'apple');
  const youtubeEpisodes = externalEpisodes.filter(ep => ep.platform === 'youtube');

  // Initialize with mock data - will be replaced with real API calls
  const initializeWithMockData = useCallback(() => {
    const mockEpisodes: ExternalEpisode[] = [
      {
        id: 'spotify_1',
        title: 'Urban Planning Revolution: Future Cities Today',
        description: 'Exploring how modern cities are adapting to technological advancement and sustainable development. We discuss smart infrastructure, green building initiatives, and the role of AI in urban planning.',
        audioUrl: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
        imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=400&fit=crop',
        duration: 2850, // 47:30
        publishedDate: '2025-01-10T10:00:00Z',
        platform: 'spotify',
        platformEpisodeId: 'spotify_episode_123',
        platformUrl: 'https://open.spotify.com/episode/123',
        guest: 'Dr. Sarah Chen, Urban Development Expert',
        category: 'Urban Planning',
        views: 0,
        likes: 0,
        isExplicit: false
      },
      {
        id: 'youtube_1',
        title: 'The Psychology of Space: How Architecture Affects Human Behavior',
        description: 'A deep dive into environmental psychology and how the spaces we inhabit influence our emotions, productivity, and wellbeing. From workplace design to residential architecture.',
        audioUrl: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
        imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=400&fit=crop',
        duration: 3120, // 52:00
        publishedDate: '2025-01-08T15:30:00Z',
        platform: 'youtube',
        platformEpisodeId: 'youtube_video_456',
        platformUrl: 'https://youtube.com/watch?v=456',
        guest: 'Prof. Michael Torres, Environmental Psychologist',
        category: 'Psychology & Design',
        views: 0,
        likes: 0,
        isExplicit: false
      },
      {
        id: 'apple_1',
        title: 'Sustainable Cities: The Green Revolution in Urban Design',
        description: 'How cities worldwide are implementing sustainable practices, from renewable energy grids to vertical farming. We explore case studies from Copenhagen, Singapore, and Vancouver.',
        audioUrl: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
        imageUrl: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=400&fit=crop',
        duration: 2640, // 44:00
        publishedDate: '2025-01-05T12:00:00Z',
        platform: 'apple',
        platformEpisodeId: 'apple_episode_789',
        platformUrl: 'https://podcasts.apple.com/podcast/id789',
        guest: 'Emma Rodriguez, Sustainability Consultant',
        category: 'Sustainability',
        views: 0,
        likes: 0,
        isExplicit: false
      },
      {
        id: 'spotify_2',
        title: 'Transportation Evolution: From Traffic Jams to Smart Mobility',
        description: 'The future of urban transportation, including autonomous vehicles, hyperloop technology, and integrated public transport systems. How cities can reduce congestion and pollution.',
        audioUrl: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
        imageUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400&h=400&fit=crop',
        duration: 3300, // 55:00
        publishedDate: '2025-01-03T09:15:00Z',
        platform: 'spotify',
        platformEpisodeId: 'spotify_episode_124',
        platformUrl: 'https://open.spotify.com/episode/124',
        guest: 'James Liu, Transportation Engineer',
        category: 'Transportation',
        views: 0,
        likes: 0,
        isExplicit: false
      },
      {
        id: 'youtube_2',
        title: 'Digital Nomads and the Future of Remote Work Spaces',
        description: 'How the rise of digital nomadism is reshaping city planning and co-working spaces. We discuss flexible living arrangements, nomad-friendly infrastructure, and economic impacts.',
        audioUrl: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
        imageUrl: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=400&h=400&fit=crop',
        duration: 2940, // 49:00
        publishedDate: '2025-01-01T14:20:00Z',
        platform: 'youtube',
        platformEpisodeId: 'youtube_video_457',
        platformUrl: 'https://youtube.com/watch?v=457',
        guest: 'Alex Kim, Remote Work Strategist',
        category: 'Future of Work',
        views: 0,
        likes: 0,
        isExplicit: false
      },
      {
        id: 'apple_2',
        title: 'Climate-Resilient Cities: Preparing for Environmental Change',
        description: 'How cities are adapting to climate change through innovative infrastructure, flood management systems, and disaster preparedness. Case studies from Miami, Amsterdam, and Tokyo.',
        audioUrl: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
        imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop',
        duration: 3480, // 58:00
        publishedDate: '2024-12-28T11:45:00Z',
        platform: 'apple',
        platformEpisodeId: 'apple_episode_790',
        platformUrl: 'https://podcasts.apple.com/podcast/id790',
        guest: 'Dr. Maria Santos, Climate Adaptation Specialist',
        category: 'Climate & Environment',
        views: 0,
        likes: 0,
        isExplicit: false
      }
    ];

    setExternalEpisodes(mockEpisodes);
    
    // Update platform stats
    setPlatformStats({
      spotify: {
        totalEpisodes: mockEpisodes.filter(ep => ep.platform === 'spotify').length,
        totalPlays: 125000,
        followers: 8500,
        isConnected: true
      },
      apple: {
        totalEpisodes: mockEpisodes.filter(ep => ep.platform === 'apple').length,
        totalPlays: 89000,
        followers: 6200,
        isConnected: true
      },
      youtube: {
        totalEpisodes: mockEpisodes.filter(ep => ep.platform === 'youtube').length,
        totalViews: 245000,
        subscribers: 12300,
        isConnected: true
      }
    });
    
    setLastSyncTime(new Date());
  }, []);

  // Define sync functions BEFORE the useEffect that uses them
  const syncSpotify = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      console.log('Spotify sync: Starting...');
      const result = await podcastAPIOrchestrator.syncSpotify();
      console.log('Spotify sync: API result received:', result);
      
      if (result.success) {
        console.log(`Spotify sync: Success - found ${result.episodes?.length || 0} episodes`);
        
        // Update episodes in state
        setExternalEpisodes(prev => [
          ...prev.filter(ep => ep.platform !== 'spotify'),
          ...result.episodes
        ]);
        
        // Update platform stats
        setPlatformStats(prev => ({
          ...prev,
          spotify: {
            totalEpisodes: result.episodes.length,
            totalPlays: result.stats?.totalPlays || 0,
            followers: result.stats?.followers || 0,
            isConnected: true
          }
        }));
        
        toast.success(`Synced ${result.episodes.length} Spotify episodes`);
      } else {
        console.error('Spotify sync: Failed with error:', result.error);
        throw new Error(result.error || 'Failed to sync Spotify');
      }
      
      setLastSyncTime(new Date());
      
    } catch (error) {
      const errorMessage = `Failed to sync Spotify episodes: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('Spotify sync: Exception caught:', error);
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    }
  }, []);

  const syncApplePodcasts = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      const result = await podcastAPIOrchestrator.syncApplePodcasts();
      
      if (result.success) {
        // Update episodes in state
        setExternalEpisodes(prev => [
          ...prev.filter(ep => ep.platform !== 'apple'),
          ...result.episodes
        ]);
        
        // Update platform stats
        setPlatformStats(prev => ({
          ...prev,
          apple: {
            totalEpisodes: result.episodes.length,
            totalPlays: result.stats?.totalPlays || 0,
            followers: result.stats?.followers || 0,
            isConnected: true
          }
        }));
        
        toast.success(`Synced ${result.episodes.length} Apple Podcasts episodes`);
      } else {
        throw new Error(result.error || 'Failed to sync Apple Podcasts');
      }
      
      setLastSyncTime(new Date());
      
    } catch (error) {
      const errorMessage = `Failed to sync Apple Podcasts episodes: ${error instanceof Error ? error.message : 'Unknown error'}`;
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    }
  }, []);

  const syncYouTube = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      const result = await podcastAPIOrchestrator.syncYouTube();
      
      if (result.success) {
        // Update episodes in state
        setExternalEpisodes(prev => [
          ...prev.filter(ep => ep.platform !== 'youtube'),
          ...result.episodes
        ]);
        
        // Update platform stats
        setPlatformStats(prev => ({
          ...prev,
          youtube: {
            totalEpisodes: result.episodes.length,
            totalViews: result.stats?.totalViews || 0,
            subscribers: result.stats?.subscribers || 0,
            isConnected: true
          }
        }));
        
        toast.success(`Synced ${result.episodes.length} YouTube episodes`);
      } else {
        throw new Error(result.error || 'Failed to sync YouTube');
      }
      
      setLastSyncTime(new Date());
      
    } catch (error) {
      const errorMessage = `Failed to sync YouTube episodes: ${error instanceof Error ? error.message : 'Unknown error'}`;
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    }
  }, []);

  // Define syncAllPlatforms before useEffect to avoid temporal dead zone
  const syncAllPlatforms = useCallback(async (): Promise<void> => {
    setIsRefreshing(true);
    try {
      const { results, allEpisodes, platformStats: newStats } = await podcastAPIOrchestrator.syncAllPlatforms();
      
      // Update episodes
      setExternalEpisodes(allEpisodes);
      
      // Update platform stats
      setPlatformStats(newStats);
      
      // Show results
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;
      
      if (failureCount === 0) {
        toast.success(`All platforms synced successfully! Found ${allEpisodes.length} episodes.`);
      } else if (successCount > 0) {
        toast.warning(`${successCount} platforms synced, ${failureCount} failed. Found ${allEpisodes.length} episodes.`);
      } else {
        toast.error('All platform syncs failed');
      }
      
      setLastSyncTime(new Date());
    } catch (error) {
      toast.error('Failed to sync platforms');
      setError('Failed to sync platforms');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Initialize on mount with real API calls
  useEffect(() => {
    const initializeWithRealData = async () => {
      setIsLoading(true);
      try {
        // For now, we're using RSS-based episodes instead of API sync
        // so we'll skip the platform sync and just initialize with mock data
        console.log('Initializing with mock data (RSS episodes used for main episodes screen)...');
        initializeWithMockData();
        
      } catch (error) {
        console.warn('Failed to initialize platform context:', error);
        // Initialize with mock data as fallback to ensure episodes are visible
        initializeWithMockData();
      } finally {
        // Always set loading to false after initialization
        setIsLoading(false);
      }
    };

    initializeWithRealData();
  }, [initializeWithMockData]);

  const refreshEpisodes = async (): Promise<void> => {
    await syncAllPlatforms();
  };

  const getEpisodeByPlatformId = useCallback((platformId: string, platform: 'spotify' | 'apple' | 'youtube'): ExternalEpisode | null => {
    return externalEpisodes.find(ep => ep.platformEpisodeId === platformId && ep.platform === platform) || null;
  }, [externalEpisodes]);

  const getLatestEpisodes = useCallback((limit: number = 10): ExternalEpisode[] => {
    return [...externalEpisodes]
      .sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime())
      .slice(0, limit);
  }, [externalEpisodes]);

  const searchEpisodes = useCallback((query: string): ExternalEpisode[] => {
    if (!query.trim()) return externalEpisodes;
    
    const lowerQuery = query.toLowerCase();
    return externalEpisodes.filter(episode =>
      episode.title.toLowerCase().includes(lowerQuery) ||
      episode.description.toLowerCase().includes(lowerQuery) ||
      episode.guest?.toLowerCase().includes(lowerQuery) ||
      episode.category?.toLowerCase().includes(lowerQuery)
    );
  }, [externalEpisodes]);

  const searchEpisodesAsync = useCallback(async (query: string, limit?: number): Promise<ExternalEpisode[]> => {
    if (!query.trim()) return externalEpisodes;
    
    const lowerQuery = query.toLowerCase();
    const results = await podcastAPIOrchestrator.searchEpisodes(lowerQuery, limit);
    
    return results;
  }, [externalEpisodes]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: PodcastPlatformContextType = {
    externalEpisodes,
    spotifyEpisodes,
    appleEpisodes,
    youtubeEpisodes,
    platformStats,
    isLoading,
    isRefreshing,
    lastSyncTime,
    syncAllPlatforms,
    syncSpotify,
    syncApplePodcasts,
    syncYouTube,
    refreshEpisodes,
    getEpisodeByPlatformId,
    getLatestEpisodes,
    searchEpisodes,
    searchEpisodesAsync,
    error,
    clearError
  };

  return (
    <PodcastPlatformContext.Provider value={value}>
      {children}
    </PodcastPlatformContext.Provider>
  );
}

export function usePodcastPlatforms() {
  const context = useContext(PodcastPlatformContext);
  if (!context) {
    throw new Error('usePodcastPlatforms must be used within a PodcastPlatformProvider');
  }
  return context;
}