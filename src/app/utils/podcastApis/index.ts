// Safe exports for frontend/server compatibility
export { getSpotifyApi, SpotifyPodcastAPI } from './spotifyApi';
export { youtubeApi } from './youtubeApi';
export { applePodcastsApi } from './applePodcastsApi';

// Warning for direct spotifyApi import
export const spotifyApi = typeof Deno !== 'undefined' 
  ? (async () => {
      const { getSpotifyApi } = await import('./spotifyApi');
      return getSpotifyApi();
    })()
  : (() => {
      throw new Error('spotifyApi is not available in frontend. Use frontendPodcastService instead.');
    })();

// Centralized API orchestrator
import { getSpotifyApi } from './spotifyApi';
import { youtubeApi } from './youtubeApi';
import { applePodcastsApi } from './applePodcastsApi';
import { ExternalEpisode, PlatformStats, SyncResult } from '../../types/podcast';

class PodcastAPIOrchestrator {
  /**
   * Sync all platforms simultaneously
   */
  async syncAllPlatforms(): Promise<{
    results: SyncResult[];
    allEpisodes: ExternalEpisode[];
    platformStats: PlatformStats;
  }> {
    const syncPromises = [
      this.syncSpotify(),
      this.syncApplePodcasts(),
      this.syncYouTube()
    ];

    const results = await Promise.allSettled(syncPromises);
    
    const syncResults: SyncResult[] = results.map((result, index) => {
      const platforms = ['spotify', 'apple', 'youtube'] as const;
      const platform = platforms[index];
      
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          platform,
          success: false,
          episodes: [],
          error: result.reason?.message || 'Unknown error'
        };
      }
    });

    // Combine all episodes
    const allEpisodes = syncResults.flatMap(result => result.episodes);
    
    // Build platform stats
    const platformStats: PlatformStats = {
      spotify: {
        totalEpisodes: syncResults[0]?.episodes.length || 0,
        totalPlays: syncResults[0]?.stats?.totalPlays || 0,
        followers: syncResults[0]?.stats?.followers || 0,
        isConnected: syncResults[0]?.success || false
      },
      apple: {
        totalEpisodes: syncResults[1]?.episodes.length || 0,
        totalPlays: syncResults[1]?.stats?.totalPlays || 0,
        followers: syncResults[1]?.stats?.followers || 0,
        isConnected: syncResults[1]?.success || false
      },
      youtube: {
        totalEpisodes: syncResults[2]?.episodes.length || 0,
        totalViews: syncResults[2]?.stats?.totalViews || 0,
        subscribers: syncResults[2]?.stats?.subscribers || 0,
        isConnected: syncResults[2]?.success || false
      }
    };

    return {
      results: syncResults,
      allEpisodes,
      platformStats
    };
  }

  /**
   * Sync Spotify episodes
   */
  async syncSpotify(): Promise<SyncResult> {
    try {
      if (typeof Deno === 'undefined') {
        throw new Error('Spotify sync only available in server environment');
      }
      
      const spotifyApi = getSpotifyApi();
      const [episodes, showInfo] = await Promise.all([
        spotifyApi.getShowEpisodes(50),
        spotifyApi.getShowInfo()
      ]);

      return {
        platform: 'spotify',
        success: true,
        episodes,
        stats: {
          totalEpisodes: showInfo.totalEpisodes,
          followers: showInfo.followers,
          totalPlays: 0 // Spotify doesn't provide play counts in public API
        }
      };
    } catch (error) {
      console.error('Spotify sync failed:', error);
      return {
        platform: 'spotify',
        success: false,
        episodes: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Sync Apple Podcasts episodes
   */
  async syncApplePodcasts(): Promise<SyncResult> {
    try {
      const [episodes, showInfo] = await Promise.all([
        applePodcastsApi.getShowEpisodes(50),
        applePodcastsApi.getShowInfo()
      ]);

      return {
        platform: 'apple',
        success: true,
        episodes,
        stats: {
          totalEpisodes: showInfo.totalEpisodes,
          followers: showInfo.followers,
          totalPlays: 0 // Apple Podcasts doesn't provide play counts
        }
      };
    } catch (error) {
      console.error('Apple Podcasts sync failed:', error);
      return {
        platform: 'apple',
        success: false,
        episodes: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Sync YouTube episodes
   */
  async syncYouTube(): Promise<SyncResult> {
    try {
      const [episodes, channelInfo] = await Promise.all([
        youtubeApi.getChannelVideos(50),
        youtubeApi.getChannelInfo()
      ]);

      return {
        platform: 'youtube',
        success: true,
        episodes,
        stats: {
          totalEpisodes: channelInfo.totalVideos,
          subscribers: channelInfo.subscribers,
          totalViews: channelInfo.totalViews
        }
      };
    } catch (error) {
      console.error('YouTube sync failed:', error);
      return {
        platform: 'youtube',
        success: false,
        episodes: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Search across all platforms
   */
  async searchAllPlatforms(query: string, limit: number = 20): Promise<ExternalEpisode[]> {
    const searchPromises = [];
    
    // Add Spotify search if in server environment
    if (typeof Deno !== 'undefined') {
      const spotifyApi = getSpotifyApi();
      searchPromises.push(spotifyApi.searchEpisodes(query, Math.ceil(limit / 3)));
    }
    
    searchPromises.push(
      applePodcastsApi.searchEpisodes(query, Math.ceil(limit / 3)),
      youtubeApi.searchChannelVideos(query, Math.ceil(limit / 3))
    );

    const results = await Promise.allSettled(searchPromises);
    
    const allResults = results
      .filter((result): result is PromiseFulfilledResult<ExternalEpisode[]> => 
        result.status === 'fulfilled'
      )
      .flatMap(result => result.value);

    // Sort by published date (newest first) and limit results
    return allResults
      .sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime())
      .slice(0, limit);
  }

  /**
   * Search episodes - alias for searchAllPlatforms
   */
  async searchEpisodes(query: string, limit: number = 20): Promise<ExternalEpisode[]> {
    return this.searchAllPlatforms(query, limit);
  }

  /**
   * Get episodes from specific platform
   */
  async getEpisodesByPlatform(platform: 'spotify' | 'apple' | 'youtube', limit: number = 20): Promise<ExternalEpisode[]> {
    switch (platform) {
      case 'spotify':
        if (typeof Deno === 'undefined') {
          throw new Error('Spotify episodes only available in server environment');
        }
        const spotifyApi = getSpotifyApi();
        return await spotifyApi.getShowEpisodes(limit);
      case 'apple':
        return await applePodcastsApi.getShowEpisodes(limit);
      case 'youtube':
        return await youtubeApi.getChannelVideos(limit);
      default:
        return [];
    }
  }

  /**
   * Check if platform APIs are configured
   */
  getConfigurationStatus(): {
    spotify: boolean;
    apple: boolean;
    youtube: boolean;
  } {
    // In browser context, we can't access Deno.env, so we'll assume they're configured
    // The actual configuration check should happen on the server side
    try {
      if (typeof Deno !== 'undefined' && Deno.env) {
        return {
          spotify: Boolean(Deno.env.get('SPOTIFY_CLIENT_ID') && Deno.env.get('SPOTIFY_CLIENT_SECRET')),
          apple: Boolean(Deno.env.get('APPLE_PODCASTS_SHOW_ID') || Deno.env.get('APPLE_PODCASTS_FEED_URL')),
          youtube: Boolean(Deno.env.get('YOUTUBE_API_KEY') && Deno.env.get('YOUTUBE_CHANNEL_ID'))
        };
      }
    } catch (error) {
      console.warn('Could not access environment variables:', error);
    }
    
    // Fallback for browser context - assume all are configured
    return {
      spotify: true,
      apple: true,
      youtube: true
    };
  }
}

export const podcastAPIOrchestrator = new PodcastAPIOrchestrator();

// Export convenience function for easy import
export const syncAllPlatforms = () => podcastAPIOrchestrator.syncAllPlatforms();