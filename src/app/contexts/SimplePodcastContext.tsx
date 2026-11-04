import React, { createContext, useContext, useState, useEffect } from 'react';
import { simplePodcastApi, SimpleEpisode } from '../utils/simplePodcastApi';

interface SimplePodcastContextType {
  // Episodes data
  allEpisodes: SimpleEpisode[];
  spotifyEpisodes: SimpleEpisode[];
  appleEpisodes: SimpleEpisode[];
  youtubeEpisodes: SimpleEpisode[];
  
  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;
  
  // Sync methods
  syncSpotify: () => Promise<void>;
  syncApple: () => Promise<void>;
  syncYouTube: () => Promise<void>;
  syncAll: () => Promise<void>;
  
  // Backend connectivity
  testConnection: () => Promise<boolean>;
  isConnected: boolean;
  configStatus: any | null;
  
  // Metadata
  lastSyncTime: Date | null;
  error: string | null;
  clearError: () => void;
}

const SimplePodcastContext = createContext<SimplePodcastContextType | undefined>(undefined);

export function SimplePodcastProvider({ children }: { children: React.ReactNode }) {
  const [allEpisodes, setAllEpisodes] = useState<SimpleEpisode[]>([]);
  const [spotifyEpisodes, setSpotifyEpisodes] = useState<SimpleEpisode[]>([]);
  const [appleEpisodes, setAppleEpisodes] = useState<SimpleEpisode[]>([]);
  const [youtubeEpisodes, setYoutubeEpisodes] = useState<SimpleEpisode[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [configStatus, setConfigStatus] = useState<any | null>(null);

  const clearError = () => setError(null);

  // Test backend connectivity
  const testConnection = async (): Promise<boolean> => {
    try {
      console.log('🔍 [SimplePodcastContext] Testing backend connection...');
      const connected = await simplePodcastApi.testConnection();
      setIsConnected(connected);
      
      if (connected) {
        // Also fetch configuration status
        const config = await simplePodcastApi.getConfigStatus();
        setConfigStatus(config);
      }
      
      return connected;
    } catch (error) {
      console.error('❌ [SimplePodcastContext] Connection test failed:', error);
      setIsConnected(false);
      return false;
    }
  };

  // Sync Spotify episodes
  const syncSpotify = async () => {
    try {
      console.log('🎵 [SimplePodcastContext] Syncing Spotify episodes...');
      setError(null);
      setIsRefreshing(true);
      
      const episodes = await simplePodcastApi.getSpotifyEpisodes();
      setSpotifyEpisodes(episodes);
      
      // Update all episodes
      setAllEpisodes(prev => {
        const nonSpotify = prev.filter(ep => ep.platform !== 'spotify');
        const combined = [...nonSpotify, ...episodes];
        // Sort by published date (newest first)
        return combined.sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime());
      });
      
      setLastSyncTime(new Date());
      console.log(`✅ [SimplePodcastContext] Synced ${episodes.length} Spotify episodes`);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync Spotify';
      console.error('❌ [SimplePodcastContext] Spotify sync failed:', err);
      setError(`Spotify sync failed: ${errorMessage}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Sync Apple Podcasts episodes
  const syncApple = async () => {
    try {
      console.log('🎵 [SimplePodcastContext] Syncing Apple Podcasts episodes...');
      setError(null);
      setIsRefreshing(true);
      
      const episodes = await simplePodcastApi.getAppleEpisodes();
      setAppleEpisodes(episodes);
      
      // Update all episodes
      setAllEpisodes(prev => {
        const nonApple = prev.filter(ep => ep.platform !== 'apple');
        const combined = [...nonApple, ...episodes];
        // Sort by published date (newest first)
        return combined.sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime());
      });
      
      setLastSyncTime(new Date());
      console.log(`✅ [SimplePodcastContext] Synced ${episodes.length} Apple episodes`);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync Apple Podcasts';
      console.error('❌ [SimplePodcastContext] Apple sync failed:', err);
      setError(`Apple Podcasts sync failed: ${errorMessage}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Sync YouTube episodes
  const syncYouTube = async () => {
    try {
      console.log('🎵 [SimplePodcastContext] Syncing YouTube episodes...');
      setError(null);
      setIsRefreshing(true);
      
      const episodes = await simplePodcastApi.getYouTubeEpisodes();
      setYoutubeEpisodes(episodes);
      
      // Update all episodes
      setAllEpisodes(prev => {
        const nonYoutube = prev.filter(ep => ep.platform !== 'youtube');
        const combined = [...nonYoutube, ...episodes];
        // Sort by published date (newest first)
        return combined.sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime());
      });
      
      setLastSyncTime(new Date());
      console.log(`✅ [SimplePodcastContext] Synced ${episodes.length} YouTube episodes`);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync YouTube';
      console.error('❌ [SimplePodcastContext] YouTube sync failed:', err);
      setError(`YouTube sync failed: ${errorMessage}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Sync all platforms
  const syncAll = async () => {
    try {
      console.log('🎵 [SimplePodcastContext] Syncing all platforms...');
      setError(null);
      setIsLoading(true);
      
      const allEpisodesData = await simplePodcastApi.getAllEpisodes();
      
      // Separate by platform
      const spotify = allEpisodesData.filter(ep => ep.platform === 'spotify');
      const apple = allEpisodesData.filter(ep => ep.platform === 'apple');
      const youtube = allEpisodesData.filter(ep => ep.platform === 'youtube');
      
      setSpotifyEpisodes(spotify);
      setAppleEpisodes(apple);
      setYoutubeEpisodes(youtube);
      setAllEpisodes(allEpisodesData);
      
      setLastSyncTime(new Date());
      console.log(`✅ [SimplePodcastContext] Synced ${allEpisodesData.length} total episodes (${spotify.length} Spotify, ${apple.length} Apple, ${youtube.length} YouTube)`);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync episodes';
      console.error('❌ [SimplePodcastContext] Sync all failed:', err);
      setError(`Failed to sync episodes: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-sync on mount with connection test
  useEffect(() => {
    const initializeData = async () => {
      console.log('🚀 [SimplePodcastContext] Initializing podcast data...');
      
      // First test connection
      try {
        console.log('🔍 [SimplePodcastContext] Testing backend connection...');
        const connected = await simplePodcastApi.testConnection();
        setIsConnected(connected);
        
        if (connected) {
          // Also fetch configuration status
          const config = await simplePodcastApi.getConfigStatus();
          setConfigStatus(config);
          
          // If connected, sync all episodes
          console.log('🎵 [SimplePodcastContext] Syncing all platforms...');
          setError(null);
          setIsLoading(true);
          
          const allEpisodesData = await simplePodcastApi.getAllEpisodes();
          
          // Separate by platform
          const spotify = allEpisodesData.filter(ep => ep.platform === 'spotify');
          const apple = allEpisodesData.filter(ep => ep.platform === 'apple');
          const youtube = allEpisodesData.filter(ep => ep.platform === 'youtube');
          
          setSpotifyEpisodes(spotify);
          setAppleEpisodes(apple);
          setYoutubeEpisodes(youtube);
          setAllEpisodes(allEpisodesData);
          
          setLastSyncTime(new Date());
          console.log(`✅ [SimplePodcastContext] Synced ${allEpisodesData.length} total episodes (${spotify.length} Spotify, ${apple.length} Apple, ${youtube.length} YouTube)`);
          
        } else {
          console.warn('⚠️ [SimplePodcastContext] Backend not connected, skipping auto-sync');
          setError('Backend connection failed. Please check your internet connection and try again.');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize';
        console.error('❌ [SimplePodcastContext] Initialization failed:', err);
        setError(`Failed to initialize: ${errorMessage}`);
        setIsConnected(false);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, []); // Empty dependency array is safe here as we only want this to run on mount

  const value: SimplePodcastContextType = {
    allEpisodes,
    spotifyEpisodes,
    appleEpisodes,
    youtubeEpisodes,
    isLoading,
    isRefreshing,
    syncSpotify,
    syncApple,
    syncYouTube,
    syncAll,
    testConnection,
    isConnected,
    configStatus,
    lastSyncTime,
    error,
    clearError
  };

  return (
    <SimplePodcastContext.Provider value={value}>
      {children}
    </SimplePodcastContext.Provider>
  );
}

// Hook to use the context with better error reporting
export function useSimplePodcast() {
  const context = useContext(SimplePodcastContext);
  if (context === undefined) {
    console.error('[useSimplePodcast] Context is undefined! Make sure you are using SimplePodcastProvider.');
    console.error('[useSimplePodcast] Current component tree should include SimplePodcastProvider');
    throw new Error('useSimplePodcast must be used within a SimplePodcastProvider');
  }
  return context;
}