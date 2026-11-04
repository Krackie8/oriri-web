import { ExternalEpisode } from '../../types/podcast';

interface SpotifyEpisode {
  id: string;
  name: string;
  description: string;
  html_description: string;
  uri: string;
  external_urls: {
    spotify: string;
  };
  href: string;
  images: Array<{
    url: string;
    height: number;
    width: number;
  }>;
  is_externally_hosted: boolean;
  is_playable: boolean;
  language: string;
  languages: string[];
  release_date: string;
  release_date_precision: string;
  type: string;
  duration_ms: number;
  explicit: boolean;
  audio_preview_url: string | null;
}

interface SpotifyShow {
  id: string;
  name: string;
  description: string;
  episodes: {
    items: SpotifyEpisode[];
    total: number;
    limit: number;
    offset: number;
    next: string | null;
  };
}

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

class SpotifyPodcastAPI {
  private clientId: string;
  private clientSecret: string;
  private showId: string; // Your Spotify show ID
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    // These will be environment variables in production
    this.clientId = Deno.env.get('SPOTIFY_CLIENT_ID') || '';
    this.clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET') || '';
    this.showId = Deno.env.get('SPOTIFY_SHOW_ID') || ''; // Your podcast's Spotify show ID
  }

  /**
   * Get access token using Client Credentials flow
   * https://developer.spotify.com/documentation/general/guides/authorization/client-credentials/
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const auth = btoa(`${this.clientId}:${this.clientSecret}`);
    
    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials'
      });

      if (!response.ok) {
        throw new Error(`Spotify auth failed: ${response.status} ${response.statusText}`);
      }

      const data: SpotifyTokenResponse = await response.json();
      
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Subtract 1 minute for safety
      
      return this.accessToken;
    } catch (error) {
      console.error('Failed to get Spotify access token:', error);
      throw new Error('Failed to authenticate with Spotify');
    }
  }

  /**
   * Get show episodes from Spotify
   * https://developer.spotify.com/documentation/web-api/reference/get-a-shows-episodes
   */
  async getShowEpisodes(limit: number = 50, offset: number = 0): Promise<ExternalEpisode[]> {
    if (!this.showId) {
      console.warn('Spotify Show ID not configured');
      return [];
    }

    try {
      const token = await this.getAccessToken();
      
      const response = await fetch(
        `https://api.spotify.com/v1/shows/${this.showId}/episodes?limit=${limit}&offset=${offset}&market=US`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, retry once
          this.accessToken = null;
          const newToken = await this.getAccessToken();
          
          const retryResponse = await fetch(
            `https://api.spotify.com/v1/shows/${this.showId}/episodes?limit=${limit}&offset=${offset}&market=US`,
            {
              headers: {
                'Authorization': `Bearer ${newToken}`,
                'Content-Type': 'application/json',
              }
            }
          );
          
          if (!retryResponse.ok) {
            throw new Error(`Spotify API failed: ${retryResponse.status} ${retryResponse.statusText}`);
          }
          
          const retryData = await retryResponse.json();
          return this.transformEpisodes(retryData.items);
        }
        
        throw new Error(`Spotify API failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return this.transformEpisodes(data.items);
      
    } catch (error) {
      console.error('Failed to fetch Spotify episodes:', error);
      throw new Error('Failed to fetch episodes from Spotify');
    }
  }

  /**
   * Get show information
   */
  async getShowInfo(): Promise<{ totalEpisodes: number; followers: number; name: string; description: string }> {
    if (!this.showId) {
      return { totalEpisodes: 0, followers: 0, name: '', description: '' };
    }

    try {
      const token = await this.getAccessToken();
      
      const response = await fetch(
        `https://api.spotify.com/v1/shows/${this.showId}?market=US`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Spotify API failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        totalEpisodes: data.total_episodes || 0,
        followers: 0, // Spotify doesn't provide follower count in public API
        name: data.name,
        description: data.description
      };
      
    } catch (error) {
      console.error('Failed to fetch Spotify show info:', error);
      return { totalEpisodes: 0, followers: 0, name: '', description: '' };
    }
  }

  /**
   * Transform Spotify episode data to our internal format
   */
  private transformEpisodes(spotifyEpisodes: SpotifyEpisode[]): ExternalEpisode[] {
    return spotifyEpisodes.map(episode => ({
      id: `spotify_${episode.id}`,
      title: episode.name,
      description: this.cleanDescription(episode.description || episode.html_description),
      audioUrl: episode.audio_preview_url || '', // Note: Spotify only provides 30-second previews
      imageUrl: episode.images[0]?.url || '',
      duration: Math.floor(episode.duration_ms / 1000),
      publishedDate: episode.release_date,
      platform: 'spotify' as const,
      platformEpisodeId: episode.id,
      platformUrl: episode.external_urls.spotify,
      isExplicit: episode.explicit,
      // Extract additional info from description if available
      guest: this.extractGuest(episode.description || episode.html_description),
      category: this.extractCategory(episode.description || episode.html_description),
    }));
  }

  /**
   * Clean HTML from description
   */
  private cleanDescription(description: string): string {
    if (!description) return '';
    
    // Remove HTML tags
    return description
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  /**
   * Try to extract guest information from description
   */
  private extractGuest(description: string): string | undefined {
    if (!description) return undefined;
    
    // Common patterns for guest mentions
    const guestPatterns = [
      /with\s+([^,\n\.]+)/i,
      /guest:?\s*([^,\n\.]+)/i,
      /featuring\s+([^,\n\.]+)/i,
      /feat\.?\s+([^,\n\.]+)/i,
    ];
    
    for (const pattern of guestPatterns) {
      const match = description.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return undefined;
  }

  /**
   * Try to extract category from description
   */
  private extractCategory(description: string): string | undefined {
    if (!description) return undefined;
    
    // Common categories for urban planning/architecture podcast
    const categories = [
      'Urban Planning', 'Architecture', 'Sustainability', 'Transportation',
      'Smart Cities', 'Climate Change', 'Housing', 'Infrastructure',
      'Design', 'Technology', 'Environment', 'Community Development'
    ];
    
    const lowerDescription = description.toLowerCase();
    
    for (const category of categories) {
      if (lowerDescription.includes(category.toLowerCase())) {
        return category;
      }
    }
    
    return 'General';
  }

  /**
   * Search episodes
   */
  async searchEpisodes(query: string, limit: number = 20): Promise<ExternalEpisode[]> {
    try {
      const token = await this.getAccessToken();
      
      const encodedQuery = encodeURIComponent(`show:${this.showId} ${query}`);
      
      const response = await fetch(
        `https://api.spotify.com/v1/search?q=${encodedQuery}&type=episode&limit=${limit}&market=US`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Spotify search failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return this.transformEpisodes(data.episodes.items);
      
    } catch (error) {
      console.error('Failed to search Spotify episodes:', error);
      return [];
    }
  }
}

// Only export the class, not an instance to prevent Deno.env access in frontend
export { SpotifyPodcastAPI };

// For server-side use only - create instance when in Deno environment
let spotifyApiInstance: SpotifyPodcastAPI | null = null;

export const getSpotifyApi = (): SpotifyPodcastAPI => {
  if (typeof Deno === 'undefined') {
    throw new Error('Spotify API can only be used in server environment. Use frontendPodcastService instead.');
  }
  
  if (!spotifyApiInstance) {
    spotifyApiInstance = new SpotifyPodcastAPI();
  }
  
  return spotifyApiInstance;
};

// Legacy export for backwards compatibility (server-side only)
export const spotifyApi = typeof Deno !== 'undefined' ? new SpotifyPodcastAPI() : null;