import { projectId, publicAnonKey } from './supabase/info';

interface Episode {
  id: string;
  title: string;
  description: string;
  audioUrl: string;
  imageUrl: string;
  duration: number;
  publishedDate: string;
  platform: string;
  platformEpisodeId?: string;
  platformUrl?: string;
  isExplicit?: boolean;
  guest?: string;
  category?: string;
  views?: number;
  likes?: number;
  comments?: number;
  tags?: string[];
}

interface APIResponse<T> {
  success: boolean;
  episodes?: T[];
  totalResults?: number;
  error?: string;
}

class FrontendPodcastService {
  private baseUrl: string;
  private headers: HeadersInit;

  constructor() {
    this.baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32`;
    this.headers = {
      'Authorization': `Bearer ${publicAnonKey}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Fetch Spotify episodes from the server
   */
  async getSpotifyEpisodes(limit: number = 50, offset: number = 0): Promise<Episode[]> {
    try {
      console.log(`[Frontend] Fetching ${limit} Spotify episodes from server...`);
      
      const response = await fetch(
        `${this.baseUrl}/spotify/episodes?limit=${limit}&offset=${offset}`,
        { headers: this.headers }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Frontend] Spotify episodes fetch failed:', errorText);
        throw new Error(`Server error: ${response.status}`);
      }

      const data: APIResponse<Episode> = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch Spotify episodes');
      }

      console.log(`[Frontend] Successfully fetched ${data.episodes?.length || 0} Spotify episodes`);
      return data.episodes || [];
      
    } catch (error) {
      console.error('[Frontend] Error fetching Spotify episodes:', error);
      throw error;
    }
  }

  /**
   * Fetch YouTube episodes from the server
   */
  async getYouTubeEpisodes(maxResults: number = 50): Promise<Episode[]> {
    try {
      console.log(`[Frontend] Fetching ${maxResults} YouTube episodes from server...`);
      
      const response = await fetch(
        `${this.baseUrl}/youtube/episodes?maxResults=${maxResults}`,
        { headers: this.headers }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Frontend] YouTube episodes fetch failed:', errorText);
        throw new Error(`Server error: ${response.status}`);
      }

      const data: APIResponse<Episode> = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch YouTube episodes');
      }

      console.log(`[Frontend] Successfully fetched ${data.episodes?.length || 0} YouTube episodes`);
      return data.episodes || [];
      
    } catch (error) {
      console.error('[Frontend] Error fetching YouTube episodes:', error);
      throw error;
    }
  }

  /**
   * Check Spotify API status
   */
  async getSpotifyStatus(): Promise<{ configured: boolean; hasClientId: string; hasClientSecret: string; hasShowId: string }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/spotify/status`,
        { headers: this.headers }
      );

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      return data;
      
    } catch (error) {
      console.error('[Frontend] Error checking Spotify status:', error);
      return { configured: false, hasClientId: 'Error', hasClientSecret: 'Error', hasShowId: 'Error' };
    }
  }

  /**
   * Check YouTube API status
   */
  async getYouTubeStatus(): Promise<{ configured: boolean; hasKey: string }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/youtube/status`,
        { headers: this.headers }
      );

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      return data;
      
    } catch (error) {
      console.error('[Frontend] Error checking YouTube status:', error);
      return { configured: false, hasKey: 'Error' };
    }
  }

  /**
   * Fetch all episodes from multiple platforms
   */
  async getAllPlatformEpisodes(limits: { spotify?: number; youtube?: number } = {}): Promise<{
    spotify: Episode[];
    youtube: Episode[];
    combined: Episode[];
  }> {
    try {
      console.log('[Frontend] Fetching episodes from all platforms...');
      
      const [spotifyEpisodes, youtubeEpisodes] = await Promise.allSettled([
        this.getSpotifyEpisodes(limits.spotify || 20),
        this.getYouTubeEpisodes(limits.youtube || 20)
      ]);

      const spotify = spotifyEpisodes.status === 'fulfilled' ? spotifyEpisodes.value : [];
      const youtube = youtubeEpisodes.status === 'fulfilled' ? youtubeEpisodes.value : [];

      // Combine and sort by published date (newest first)
      const combined = [...spotify, ...youtube].sort((a, b) => 
        new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()
      );

      console.log(`[Frontend] Combined ${spotify.length} Spotify + ${youtube.length} YouTube = ${combined.length} total episodes`);
      
      return { spotify, youtube, combined };
      
    } catch (error) {
      console.error('[Frontend] Error fetching all platform episodes:', error);
      return { spotify: [], youtube: [], combined: [] };
    }
  }
}

// Export singleton instance
export const frontendPodcastService = new FrontendPodcastService();
export default frontendPodcastService;