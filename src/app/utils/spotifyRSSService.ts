/**
 * Spotify RSS Service
 * 
 * High-level service for managing Spotify podcast RSS feed data.
 * Provides caching, search, and filtering capabilities for episodes.
 * 
 * Features:
 * - Automatic caching with configurable expiration (5 minutes default)
 * - Stale-while-revalidate pattern (returns cached data on error)
 * - Episode search and filtering
 * - Podcast statistics generation
 * - Single episode lookup by ID
 * 
 * @example
 * ```typescript
 * import { spotifyRSSService } from './utils/spotifyRSSService';
 * 
 * // Fetch all episodes (uses cache if valid)
 * const result = await spotifyRSSService.fetchEpisodes();
 * if (result.success) {
 *   console.log(`Found ${result.episodes.length} episodes`);
 *   console.log(`Total plays: ${result.stats?.totalPlays}`);
 * }
 * 
 * // Search episodes
 * const searchResults = await spotifyRSSService.searchEpisodes('interview');
 * 
 * // Force refresh (bypass cache)
 * const freshData = await spotifyRSSService.refreshEpisodes();
 * ```
 */

import { rssParser, RSSEpisode } from './rssParser';

// Spotify RSS feed URL provided by user
const SPOTIFY_RSS_URL = 'https://anchor.fm/s/fe1eec8c/podcast/rss';

/**
 * Result object returned by Spotify RSS fetching operations
 */
export interface SpotifyRSSResult {
  /** Whether the fetch operation succeeded */
  success: boolean;
  /** Array of parsed RSS episodes */
  episodes: RSSEpisode[];
  /** Error message if operation failed */
  error?: string;
  /** Aggregated statistics about the podcast */
  stats?: {
    /** Total number of episodes */
    totalEpisodes: number;
    /** Sum of all episode view counts */
    totalPlays: number;
    /** Follower count (mocked for MVP) */
    followers: number;
  };
}

class SpotifyRSSService {
  private cache: {
    episodes: RSSEpisode[];
    lastFetch: Date | null;
    podcastInfo: any;
  } = {
    episodes: [],
    lastFetch: null,
    podcastInfo: null
  };

  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Fetch episodes from Spotify RSS feed
   * 
   * Primary method for retrieving episode data. Implements intelligent caching:
   * - Returns cached data if less than 5 minutes old
   * - Fetches fresh data if cache expired
   * - Falls back to stale cache if fetch fails (graceful degradation)
   * 
   * @returns Promise resolving to SpotifyRSSResult with episodes and stats
   * 
   * @example
   * ```typescript
   * const result = await spotifyRSSService.fetchEpisodes();
   * if (result.success) {
   *   result.episodes.forEach(ep => {
   *     console.log(`${ep.title} - ${ep.duration}s`);
   *   });
   * } else {
   *   console.error('Failed to load episodes:', result.error);
   * }
   * ```
   */
  async fetchEpisodes(): Promise<SpotifyRSSResult> {
    try {
      console.log('[Spotify RSS] Starting episode fetch...');

      // Check cache first
      if (this.isCacheValid()) {
        console.log('[Spotify RSS] Using cached episodes');
        return {
          success: true,
          episodes: this.cache.episodes,
          stats: this.generateStats(this.cache.episodes)
        };
      }

      console.log('[Spotify RSS] Cache expired or empty, fetching from RSS...');

      // Fetch from RSS
      const result = await rssParser.parseRSSFeed(SPOTIFY_RSS_URL, 'spotify');
      
      console.log(`[Spotify RSS] Successfully fetched ${result.episodes.length} episodes`);
      console.log('[Spotify RSS] Podcast info:', result.podcastInfo);

      // Update cache
      this.cache.episodes = result.episodes;
      this.cache.lastFetch = new Date();
      this.cache.podcastInfo = result.podcastInfo;

      return {
        success: true,
        episodes: result.episodes,
        stats: this.generateStats(result.episodes)
      };

    } catch (error) {
      console.error('[Spotify RSS] Failed to fetch episodes:', error);
      
      // Return cached episodes if available, even if stale
      if (this.cache.episodes.length > 0) {
        console.log('[Spotify RSS] Returning stale cached episodes due to error');
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
   * 
   * Searches for an episode matching either the internal ID or platform-specific ID.
   * Automatically fetches episodes if not cached.
   * 
   * @param episodeId - Internal episode ID or platform episode ID to search for
   * @returns Promise resolving to episode object or null if not found
   * 
   * @example
   * ```typescript
   * const episode = await spotifyRSSService.getEpisodeById('spotify_12345');
   * if (episode) {
   *   console.log(`Found: ${episode.title}`);
   * }
   * ```
   */
  async getEpisodeById(episodeId: string): Promise<RSSEpisode | null> {
    const result = await this.fetchEpisodes();
    if (result.success) {
      return result.episodes.find(ep => ep.id === episodeId || ep.platformEpisodeId === episodeId) || null;
    }
    return null;
  }

  /**
   * Search episodes by query string
   * 
   * Performs case-insensitive search across:
   * - Episode title
   * - Episode description
   * - Episode category
   * 
   * @param query - Search query string
   * @param limit - Optional maximum number of results to return
   * @returns Promise resolving to array of matching episodes
   * 
   * @example
   * ```typescript
   * // Search for episodes about 'technology'
   * const results = await spotifyRSSService.searchEpisodes('technology', 5);
   * console.log(`Found ${results.length} episodes about technology`);
   * ```
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
   * Get latest episodes sorted by publish date
   * 
   * Returns the most recently published episodes.
   * Episodes are sorted in descending order (newest first).
   * 
   * @param limit - Maximum number of episodes to return (default: 10)
   * @returns Promise resolving to array of latest episodes
   * 
   * @example
   * ```typescript
   * // Get 5 most recent episodes
   * const latest = await spotifyRSSService.getLatestEpisodes(5);
   * latest.forEach(ep => {
   *   console.log(`${ep.title} - ${new Date(ep.publishedDate).toLocaleDateString()}`);
   * });
   * ```
   */
  async getLatestEpisodes(limit: number = 10): Promise<RSSEpisode[]> {
    const result = await this.fetchEpisodes();
    if (!result.success) return [];

    return result.episodes
      .sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime())
      .slice(0, limit);
  }

  /**
   * Get cached podcast metadata
   * 
   * Returns channel-level information (title, description, author, etc.)
   * from the last successful RSS fetch.
   * 
   * @returns Podcast info object or null if not yet fetched
   * 
   * @example
   * ```typescript
   * const info = spotifyRSSService.getPodcastInfo();
   * if (info) {
   *   console.log(`Podcast: ${info.title} by ${info.author}`);
   * }
   * ```
   */
  getPodcastInfo() {
    return this.cache.podcastInfo;
  }

  /**
   * Clear cached data to force refresh on next fetch
   * 
   * Useful for manual refresh triggers or when you need to ensure fresh data.
   * 
   * @example
   * ```typescript
   * // Clear cache before fetching
   * spotifyRSSService.clearCache();
   * const freshData = await spotifyRSSService.fetchEpisodes();
   * ```
   */
  clearCache() {
    this.cache.episodes = [];
    this.cache.lastFetch = null;
    this.cache.podcastInfo = null;
    console.log('[Spotify RSS] Cache cleared');
  }

  /**
   * Check if cached data is still valid (< 5 minutes old)
   * 
   * @returns true if cache exists and is fresh, false otherwise
   * @private
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
   * Generate aggregated statistics from episode array
   * 
   * Calculates:
   * - Total episode count
   * - Sum of all episode views/plays
   * - Mock follower count (for MVP - replace with real API later)
   * 
   * @param episodes - Array of episodes to analyze
   * @returns Statistics object
   * @private
   */
  private generateStats(episodes: RSSEpisode[]) {
    return {
      totalEpisodes: episodes.length,
      totalPlays: episodes.reduce((total, ep) => total + (ep.views || 0), 0),
      followers: Math.floor(Math.random() * 10000) + 5000 // Mock follower count
    };
  }

  /**
   * Get the configured Spotify RSS feed URL
   * 
   * @returns The RSS feed URL string
   */
  getRSSUrl(): string {
    return SPOTIFY_RSS_URL;
  }

  /**
   * Force refresh episodes (clears cache first)
   * 
   * Convenience method that clears cache and fetches fresh data in one call.
   * Use this instead of clearCache() + fetchEpisodes() for manual refresh.
   * 
   * @returns Promise resolving to fresh SpotifyRSSResult
   * 
   * @example
   * ```typescript
   * // Trigger manual refresh
   * const freshData = await spotifyRSSService.refreshEpisodes();
   * console.log(`Refreshed: ${freshData.episodes.length} episodes`);
   * ```
   */
  async refreshEpisodes(): Promise<SpotifyRSSResult> {
    this.clearCache();
    return this.fetchEpisodes();
  }
}

// Export singleton instance
export const spotifyRSSService = new SpotifyRSSService();