/**
 * Safe YouTube API Service - Frontend Wrapper
 * 
 * Secure YouTube Data API v3 integration that proxies requests through
 * the backend server. API keys are kept server-side for security.
 * 
 * Features:
 * - Backend-proxied API calls (API keys never exposed to frontend)
 * - Automatic caching with 5-minute expiration
 * - Episode search capability
 * - Configuration status checking
 * - Error handling with graceful degradation
 * 
 * Architecture:
 * Frontend (this) → Backend (/youtube/* routes) → YouTube Data API v3
 * 
 * @example
 * ```typescript
 * import { safeYouTubeAPIService } from './utils/youtubeAPIServiceSafe';
 * 
 * // Check if YouTube is configured on backend
 * const isReady = await safeYouTubeAPIService.isConfigured();
 * if (!isReady) {
 *   console.warn('YouTube API not configured on backend');
 * }
 * 
 * // Fetch latest videos from channel/playlist
 * const result = await safeYouTubeAPIService.fetchEpisodes(20);
 * if (result.success) {
 *   console.log(`Loaded ${result.episodes.length} YouTube videos`);
 * }
 * 
 * // Search for specific videos
 * const searchResults = await safeYouTubeAPIService.searchEpisodes('podcast interview');
 * ```
 */

import { projectId, publicAnonKey } from './supabase/info';

/**
 * YouTube episode/video object structure
 */
interface YouTubeAPIEpisode {
  /** Unique video ID */
  id: string;
  /** Video title */
  title: string;
  /** Video description */
  description: string;
  /** YouTube video URL (can be used as audio source) */
  audioUrl: string;
  /** Thumbnail image URL (maxresdefault quality) */
  imageUrl: string;
  /** Video duration in seconds */
  duration: number;
  /** ISO 8601 publish date */
  publishedDate: string;
  /** Always 'youtube' for this service */
  platform: 'youtube';
  /** View count from YouTube */
  views?: number;
  /** Like count from YouTube */
  likes?: number;
  /** Comment count from YouTube */
  comments?: number;
  /** Video tags/keywords */
  tags?: string[];
}

/**
 * Standard response format for YouTube API operations
 */
interface YouTubeAPIResponse {
  /** Whether the operation succeeded */
  success: boolean;
  /** Array of video episodes */
  episodes: YouTubeAPIEpisode[];
  /** Error message if operation failed */
  error?: string;
  /** Total number of results available */
  totalResults?: number;
}

class SafeYouTubeAPIService {
  private cache: Map<string, { data: YouTubeAPIResponse; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly BASE_URL: string;

  constructor() {
    this.BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32`;
    console.log('[Safe YouTube API] Service initialized with backend URL');
  }

  /**
   * Fetch episodes from YouTube via backend API
   * 
   * Retrieves latest videos from the configured YouTube channel or playlist.
   * Results are cached for 5 minutes to reduce API quota usage.
   * 
   * @param maxResults - Maximum number of videos to fetch (default: 50)
   * @returns Promise resolving to response with episodes array
   * 
   * @example
   * ```typescript
   * // Fetch 20 most recent videos
   * const result = await safeYouTubeAPIService.fetchEpisodes(20);
   * 
   * if (result.success) {
   *   result.episodes.forEach(video => {
   *     console.log(`${video.title} - ${video.views} views`);
   *   });
   * } else {
   *   console.error('Failed to load YouTube videos:', result.error);
   * }
   * ```
   */
  async fetchEpisodes(maxResults: number = 50): Promise<YouTubeAPIResponse> {
    const cacheKey = `youtube_api_episodes_${maxResults}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log('[Safe YouTube API] Returning cached episodes');
      return cached.data;
    }

    try {
      console.log('[Safe YouTube API] Fetching episodes from backend...');

      const response = await fetch(`${this.BASE_URL}/youtube/episodes?maxResults=${maxResults}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend API failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Backend returned error');
      }

      const result: YouTubeAPIResponse = {
        success: true,
        episodes: data.episodes || [],
        totalResults: data.totalResults || 0
      };

      // Cache the result
      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      
      console.log(`[Safe YouTube API] Successfully fetched ${result.episodes.length} episodes`);
      return result;

    } catch (error) {
      console.error('[Safe YouTube API] Error fetching episodes:', error);
      return {
        success: false,
        episodes: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Search episodes via backend
   * 
   * Searches YouTube videos matching a query string.
   * Searches within the configured channel/playlist.
   * 
   * @param query - Search query string
   * @returns Promise resolving to response with matching episodes
   * 
   * @example
   * ```typescript
   * // Search for specific content
   * const results = await safeYouTubeAPIService.searchEpisodes('AI technology');
   * 
   * if (results.success) {
   *   console.log(`Found ${results.episodes.length} videos about AI`);
   * } else {
   *   console.error('Search failed:', results.error);
   * }
   * ```
   */
  async searchEpisodes(query: string): Promise<YouTubeAPIResponse> {
    try {
      console.log('[Safe YouTube API] Searching episodes via backend...');

      const response = await fetch(`${this.BASE_URL}/youtube/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Search API failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Search failed');
      }

      return {
        success: true,
        episodes: data.episodes || [],
        totalResults: data.totalResults || 0
      };

    } catch (error) {
      console.error('[Safe YouTube API] Error searching episodes:', error);
      return {
        success: false,
        episodes: [],
        error: error instanceof Error ? error.message : 'Search failed'
      };
    }
  }

  /**
   * Clear cached YouTube data
   * 
   * Forces fresh fetch on next request.
   * Useful for manual refresh operations.
   * 
   * @example
   * ```typescript
   * // Clear cache before fetching
   * safeYouTubeAPIService.clearCache();
   * const freshData = await safeYouTubeAPIService.fetchEpisodes();
   * ```
   */
  clearCache(): void {
    this.cache.clear();
    console.log('[Safe YouTube API] Cache cleared');
  }

  /**
   * Check if backend YouTube API is configured
   * 
   * Verifies that the backend has YouTube API credentials set up.
   * Returns false if API key is missing or invalid.
   * 
   * @returns Promise resolving to true if configured, false otherwise
   * 
   * @example
   * ```typescript
   * const isReady = await safeYouTubeAPIService.isConfigured();
   * 
   * if (isReady) {
   *   // Safe to fetch episodes
   *   const result = await safeYouTubeAPIService.fetchEpisodes();
   * } else {
   *   // Show setup instructions to admin
   *   console.log('YouTube API not configured. Please add YOUTUBE_API_KEY.');
   * }
   * ```
   */
  async isConfigured(): Promise<boolean> {
    try {
      const response = await fetch(`${this.BASE_URL}/youtube/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.configured === true;

    } catch (error) {
      console.error('[Safe YouTube API] Error checking configuration:', error);
      return false;
    }
  }
}

// Export singleton instance
export const safeYouTubeAPIService = new SafeYouTubeAPIService();