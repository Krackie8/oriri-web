import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner@2.0.3';
import { spotifyRSSService, SpotifyRSSResult } from '../utils/spotifyRSSService';
import { RSSEpisode } from '../utils/rssParser';

interface RSSEpisodesContextType {
  // Episodes
  episodes: RSSEpisode[];
  spotifyEpisodes: RSSEpisode[];
  
  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;
  lastSyncTime: Date | null;
  
  // Actions
  syncSpotifyRSS: () => Promise<void>;
  refreshEpisodes: () => Promise<void>;
  clearCache: () => void;
  
  // Utilities
  getEpisodeById: (episodeId: string) => RSSEpisode | null;
  getLatestEpisodes: (limit?: number) => RSSEpisode[];
  searchEpisodes: (query: string) => RSSEpisode[];
  
  // Stats
  stats: {
    totalEpisodes: number;
    totalPlays: number;
    followers: number;
  };
  
  // Error handling
  error: string | null;
  clearError: () => void;
}

const RSSEpisodesContext = createContext<RSSEpisodesContextType | null>(null);

export function RSSEpisodesProvider({ children }: { children: React.ReactNode }) {
  const [episodes, setEpisodes] = useState<RSSEpisode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalEpisodes: 0,
    totalPlays: 0,
    followers: 0
  });

  // Filter Spotify episodes (for now we only have Spotify)
  const spotifyEpisodes = episodes.filter(ep => ep.platform === 'spotify');

  // Sync Spotify RSS episodes
  const syncSpotifyRSS = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      console.log('[RSS Context] Starting Spotify RSS sync...');
      
      const result: SpotifyRSSResult = await spotifyRSSService.fetchEpisodes();
      
      if (result.success) {
        console.log(`[RSS Context] Successfully synced ${result.episodes.length} Spotify episodes`);
        
        // Update episodes
        setEpisodes(result.episodes);
        
        // Update stats
        if (result.stats) {
          setStats(result.stats);
        }
        
        setLastSyncTime(new Date());
        toast.success(`Synced ${result.episodes.length} Spotify episodes from RSS`);
        
      } else {
        console.error('[RSS Context] Spotify RSS sync failed:', result.error);
        
        // If we have episodes despite the error (cached), use them
        if (result.episodes.length > 0) {
          setEpisodes(result.episodes);
          if (result.stats) {
            setStats(result.stats);
          }
          toast.warning(`Using cached episodes. RSS sync failed: ${result.error}`);
        } else {
          throw new Error(result.error || 'Failed to sync Spotify RSS');
        }
      }
      
    } catch (error) {
      const errorMessage = `Failed to sync Spotify RSS: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('[RSS Context] Spotify RSS sync error:', error);
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    }
  }, []);

  // Refresh episodes (same as sync for now)
  const refreshEpisodes = useCallback(async (): Promise<void> => {
    setIsRefreshing(true);
    try {
      await syncSpotifyRSS();
    } finally {
      setIsRefreshing(false);
    }
  }, [syncSpotifyRSS]);

  // Clear cache
  const clearCache = useCallback(() => {
    spotifyRSSService.clearCache();
    setEpisodes([]);
    setStats({ totalEpisodes: 0, totalPlays: 0, followers: 0 });
    setLastSyncTime(null);
    toast.info('Episode cache cleared');
  }, []);

  // Utility functions
  const getEpisodeById = useCallback((episodeId: string): RSSEpisode | null => {
    return episodes.find(ep => ep.id === episodeId || ep.platformEpisodeId === episodeId) || null;
  }, [episodes]);

  const getLatestEpisodes = useCallback((limit: number = 10): RSSEpisode[] => {
    return [...episodes]
      .sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime())
      .slice(0, limit);
  }, [episodes]);

  const searchEpisodes = useCallback((query: string): RSSEpisode[] => {
    if (!query.trim()) return episodes;
    
    const lowerQuery = query.toLowerCase();
    return episodes.filter(episode =>
      episode.title.toLowerCase().includes(lowerQuery) ||
      episode.description.toLowerCase().includes(lowerQuery) ||
      episode.category?.toLowerCase().includes(lowerQuery)
    );
  }, [episodes]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initialize on mount
  useEffect(() => {
    const initializeRSSEpisodes = async () => {
      setIsLoading(true);
      try {
        console.log('[RSS Context] Initializing with Spotify RSS episodes...');
        await syncSpotifyRSS();
        console.log('[RSS Context] Initialization complete');
      } catch (error) {
        console.warn('[RSS Context] Failed to initialize RSS episodes:', error);
        // Don't throw - let the app continue with empty episodes
      } finally {
        setIsLoading(false);
      }
    };

    initializeRSSEpisodes();
  }, [syncSpotifyRSS]);

  const value: RSSEpisodesContextType = {
    episodes,
    spotifyEpisodes,
    isLoading,
    isRefreshing,
    lastSyncTime,
    syncSpotifyRSS,
    refreshEpisodes,
    clearCache,
    getEpisodeById,
    getLatestEpisodes,
    searchEpisodes,
    stats,
    error,
    clearError
  };

  return (
    <RSSEpisodesContext.Provider value={value}>
      {children}
    </RSSEpisodesContext.Provider>
  );
}

export function useRSSEpisodes() {
  const context = useContext(RSSEpisodesContext);
  if (!context) {
    throw new Error('useRSSEpisodes must be used within a RSSEpisodesProvider');
  }
  return context;
}