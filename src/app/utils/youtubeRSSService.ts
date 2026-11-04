/**
 * YouTube RSS Service
 * Handles fetching and parsing YouTube episodes from RSS feeds
 */

import { rssParser, RSSEpisode } from './rssParser';

// YouTube RSS feed URL provided by user (YouTube playlist feed)
const YOUTUBE_RSS_URL = 'https://www.youtube.com/feeds/videos.xml?playlist_id=PLJvplLYky1RbiT_dMVrhmZc2_5kPxWVvH';

export interface YouTubeRSSResult {
  success: boolean;
  episodes: RSSEpisode[];
  error?: string;
  stats?: {
    totalEpisodes: number;
    totalViews: number;
    subscribers: number;
  };
}

class YouTubeRSSService {
  private cache: {
    episodes: RSSEpisode[];
    lastFetch: Date | null;
    channelInfo: any;
  } = {
    episodes: [],
    lastFetch: null,
    channelInfo: null
  };

  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Fetch episodes from YouTube RSS feed
   */
  async fetchEpisodes(): Promise<YouTubeRSSResult> {
    try {
      console.log('[YouTube RSS] Starting episode fetch...');

      // Check cache first
      if (this.isCacheValid()) {
        console.log('[YouTube RSS] Using cached episodes');
        return {
          success: true,
          episodes: this.cache.episodes,
          stats: this.generateStats(this.cache.episodes)
        };
      }

      console.log('[YouTube RSS] Cache expired or empty, fetching from RSS...');

      // Fetch from RSS using YouTube platform identifier
      const result = await rssParser.parseRSSFeed(YOUTUBE_RSS_URL, 'youtube');
      
      console.log(`[YouTube RSS] Successfully fetched ${result.episodes.length} episodes`);
      console.log('[YouTube RSS] Channel info:', result.podcastInfo);

      // Update cache
      this.cache.episodes = result.episodes;
      this.cache.lastFetch = new Date();
      this.cache.channelInfo = result.podcastInfo;

      return {
        success: true,
        episodes: result.episodes,
        stats: this.generateStats(result.episodes)
      };

    } catch (error) {
      console.error('[YouTube RSS] Failed to fetch episodes:', error);
      
      // Return cached episodes if available, even if stale
      if (this.cache.episodes.length > 0) {
        console.log('[YouTube RSS] Returning stale cached episodes due to error');
        return {
          success: false,
          episodes: this.cache.episodes,
          error: error instanceof Error ? error.message : 'Unknown error',
          stats: this.generateStats(this.cache.episodes)
        };
      }

      return {
        success: false,
        episodes: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get single episode by ID
   */
  async getEpisodeById(episodeId: string): Promise<RSSEpisode | null> {
    const result = await this.fetchEpisodes();
    if (result.success) {
      return result.episodes.find(ep => ep.id === episodeId || ep.platformEpisodeId === episodeId) || null;
    }
    return null;
  }

  /**
   * Search episodes by query
   */
  async searchEpisodes(query: string, limit?: number): Promise<RSSEpisode[]> {
    const result = await this.fetchEpisodes();
    if (!result.success) return [];

    const lowerQuery = query.toLowerCase();
    const filteredEpisodes = result.episodes.filter(episode =>
      episode.title.toLowerCase().includes(lowerQuery) ||
      episode.description.toLowerCase().includes(lowerQuery) ||
      episode.category?.toLowerCase().includes(lowerQuery)
    );

    return limit ? filteredEpisodes.slice(0, limit) : filteredEpisodes;
  }

  /**
   * Get latest episodes
   */
  async getLatestEpisodes(limit: number = 10): Promise<RSSEpisode[]> {
    const result = await this.fetchEpisodes();
    if (!result.success) return [];

    return result.episodes
      .sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime())
      .slice(0, limit);
  }

  /**
   * Get channel information
   */
  getChannelInfo() {
    return this.cache.channelInfo;
  }

  /**
   * Clear cache to force refresh
   */
  clearCache() {
    this.cache.episodes = [];
    this.cache.lastFetch = null;
    this.cache.channelInfo = null;
    console.log('[YouTube RSS] Cache cleared');
  }

  /**
   * Check if cache is valid
   */
  private isCacheValid(): boolean {
    if (!this.cache.lastFetch || this.cache.episodes.length === 0) {
      return false;
    }

    const now = new Date();
    const cacheAge = now.getTime() - this.cache.lastFetch.getTime();
    return cacheAge < this.CACHE_DURATION;
  }

  /**
   * Generate stats from episodes
   */
  private generateStats(episodes: RSSEpisode[]) {
    return {
      totalEpisodes: episodes.length,
      totalViews: episodes.reduce((total, ep) => total + (ep.views || 0), 0),
      subscribers: Math.floor(Math.random() * 50000) + 25000 // Mock subscriber count
    };
  }

  /**
   * Get RSS feed URL
   */
  getRSSUrl(): string {
    return YOUTUBE_RSS_URL;
  }

  /**
   * Force refresh episodes
   */
  async refreshEpisodes(): Promise<YouTubeRSSResult> {
    this.clearCache();
    return this.fetchEpisodes();
  }
}

// Export singleton instance
export const youtubeRSSService = new YouTubeRSSService();