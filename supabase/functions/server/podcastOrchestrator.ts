// Server-specific podcast orchestrator for Deno environment
// Contains all types inline to avoid import path issues

// Shared podcast types
export interface ExternalEpisode {
  id: string;
  title: string;
  description: string;
  audioUrl: string;
  imageUrl: string;
  duration: number; // in seconds
  publishedDate: string;
  platform: 'spotify' | 'apple' | 'youtube';
  platformEpisodeId: string;
  platformUrl: string;
  guest?: string;
  category?: string;
  views?: number;
  likes?: number;
  isExplicit: boolean;
}

export interface PlatformStats {
  spotify: {
    totalEpisodes: number;
    totalPlays: number;
    followers: number;
    isConnected: boolean;
  };
  apple: {
    totalEpisodes: number;
    totalPlays: number;
    followers: number;
    isConnected: boolean;
  };
  youtube: {
    totalEpisodes: number;
    totalViews: number;
    subscribers: number;
    isConnected: boolean;
  };
}

export interface SyncResult {
  platform: 'spotify' | 'apple' | 'youtube';
  success: boolean;
  episodes: ExternalEpisode[];
  error?: string;
  stats?: {
    totalEpisodes?: number;
    followers?: number;
    subscribers?: number;
    totalViews?: number;
    totalPlays?: number;
  };
}

// Spotify API
class SpotifyPodcastAPI {
  public readonly clientId: string;
  public readonly clientSecret: string;
  public readonly showId: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.clientId = Deno.env.get('SPOTIFY_CLIENT_ID') || '';
    this.clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET') || '';
    this.showId = Deno.env.get('SPOTIFY_SHOW_ID') || '';
  }

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
        body: 'grant_type=client_credentials',
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`Spotify auth failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;
      
      return this.accessToken;
    } catch (error) {
      console.error('Failed to get Spotify access token:', error);
      throw new Error('Failed to authenticate with Spotify');
    }
  }

  async getShowEpisodes(limit: number = 50): Promise<ExternalEpisode[]> {
    if (!this.showId) {
      console.warn('Spotify Show ID not configured');
      return [];
    }

    const token = await this.getAccessToken();
    
    const response = await fetch(
      `https://api.spotify.com/v1/shows/${this.showId}/episodes?limit=${limit}&offset=0&market=US`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      }
    );

    if (!response.ok) {
      throw new Error(`Spotify API failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return this.transformEpisodes(data.items);
  }

  async getShowInfo(): Promise<{ totalEpisodes: number; followers: number; name: string; description: string }> {
    if (!this.showId) {
      return { totalEpisodes: 0, followers: 0, name: '', description: '' };
    }

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
      followers: 0,
      name: data.name,
      description: data.description
    };
  }

  private transformEpisodes(spotifyEpisodes: any[]): ExternalEpisode[] {
    return spotifyEpisodes.map(episode => ({
      id: `spotify_${episode.id}`,
      title: episode.name,
      description: this.cleanDescription(episode.description || episode.html_description),
      audioUrl: episode.audio_preview_url || '',
      imageUrl: episode.images[0]?.url || '',
      duration: Math.floor(episode.duration_ms / 1000),
      publishedDate: episode.release_date,
      platform: 'spotify' as const,
      platformEpisodeId: episode.id,
      platformUrl: episode.external_urls.spotify,
      isExplicit: episode.explicit,
      guest: this.extractGuest(episode.description || episode.html_description),
      category: this.extractCategory(episode.description || episode.html_description),
    }));
  }

  private cleanDescription(description: string): string {
    if (!description) return '';
    
    return description
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  private extractGuest(description: string): string | undefined {
    if (!description) return undefined;
    
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

  private extractCategory(description: string): string | undefined {
    if (!description) return undefined;
    
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
}

// YouTube API
class YouTubePodcastAPI {
  public readonly apiKey: string;
  public readonly channelId: string;

  constructor() {
    this.apiKey = Deno.env.get('YOUTUBE_API_KEY') || '';
    this.channelId = Deno.env.get('YOUTUBE_CHANNEL_ID') || '';
  }

  async getChannelVideos(maxResults: number = 50): Promise<ExternalEpisode[]> {
    if (!this.apiKey || !this.channelId) {
      console.warn('YouTube API credentials not configured');
      return [];
    }

    // Get videos list
    const searchParams = new URLSearchParams({
      part: 'snippet',
      channelId: this.channelId,
      type: 'video',
      order: 'date',
      maxResults: maxResults.toString(),
      key: this.apiKey
    });

    const searchResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${searchParams.toString()}`,
      {
        signal: AbortSignal.timeout(10000) // 10 second timeout
      }
    );

    if (!searchResponse.ok) {
      throw new Error(`YouTube search API failed: ${searchResponse.status}`);
    }
    
    const searchData = await searchResponse.json();
    
    if (!searchData.items || searchData.items.length === 0) {
      return [];
    }

    // Get detailed video information
    const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');
    const videosParams = new URLSearchParams({
      part: 'snippet,contentDetails,statistics',
      id: videoIds,
      key: this.apiKey
    });

    const videosResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?${videosParams.toString()}`,
      {
        signal: AbortSignal.timeout(10000) // 10 second timeout
      }
    );

    if (!videosResponse.ok) {
      throw new Error(`YouTube videos API failed: ${videosResponse.status}`);
    }

    const videosData = await videosResponse.json();
    return this.transformVideos(videosData.items);
  }

  async getChannelInfo(): Promise<{ totalVideos: number; subscribers: number; totalViews: number }> {
    if (!this.apiKey || !this.channelId) {
      return { totalVideos: 0, subscribers: 0, totalViews: 0 };
    }

    const params = new URLSearchParams({
      part: 'statistics',
      id: this.channelId,
      key: this.apiKey
    });

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`YouTube channel API failed: ${response.status}`);
    }

    const data = await response.json();
    const stats = data.items[0]?.statistics;
    
    return {
      totalVideos: parseInt(stats?.videoCount || '0'),
      subscribers: parseInt(stats?.subscriberCount || '0'),
      totalViews: parseInt(stats?.viewCount || '0')
    };
  }

  private transformVideos(youtubeVideos: any[]): ExternalEpisode[] {
    return youtubeVideos.map(video => ({
      id: `youtube_${video.id}`,
      title: video.snippet.title,
      description: video.snippet.description,
      audioUrl: '', // YouTube videos don't have direct audio URLs
      imageUrl: video.snippet.thumbnails?.high?.url || video.snippet.thumbnails?.default?.url || '',
      duration: this.parseDuration(video.contentDetails.duration),
      publishedDate: video.snippet.publishedAt.split('T')[0],
      platform: 'youtube' as const,
      platformEpisodeId: video.id,
      platformUrl: `https://www.youtube.com/watch?v=${video.id}`,
      views: parseInt(video.statistics?.viewCount || '0'),
      likes: parseInt(video.statistics?.likeCount || '0'),
      isExplicit: false,
      category: this.extractCategory(video.snippet.title, video.snippet.description),
    }));
  }

  private parseDuration(duration: string): number {
    // Parse ISO 8601 duration (e.g., PT4M13S)
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');
    
    return hours * 3600 + minutes * 60 + seconds;
  }

  private extractCategory(title: string, description: string): string | undefined {
    const text = `${title} ${description}`.toLowerCase();
    
    const categories = [
      'Urban Planning', 'Architecture', 'Sustainability', 'Transportation',
      'Smart Cities', 'Climate Change', 'Housing', 'Infrastructure',
      'Design', 'Technology', 'Environment', 'Community Development'
    ];
    
    for (const category of categories) {
      if (text.includes(category.toLowerCase())) {
        return category;
      }
    }
    
    return 'General';
  }
}

// Apple Podcasts API
class ApplePodcastsAPI {
  public readonly showId: string;
  public readonly feedUrl: string;

  constructor() {
    this.showId = Deno.env.get('APPLE_PODCASTS_SHOW_ID') || '';
    this.feedUrl = Deno.env.get('APPLE_PODCASTS_FEED_URL') || '';
  }

  async getShowEpisodes(limit: number = 50): Promise<ExternalEpisode[]> {
    if (!this.showId && !this.feedUrl) {
      console.warn('Apple Podcasts configuration not found');
      return [];
    }

    // If we have RSS feed URL, fetch from that (preferred)
    if (this.feedUrl) {
      return await this.fetchFromRSS();
    }
    
    // Otherwise use iTunes Search API
    if (this.showId) {
      return await this.fetchFromiTunes(limit);
    }
    
    return [];
  }

  async getShowInfo(): Promise<{ totalEpisodes: number; followers: number; name: string; description: string }> {
    if (this.feedUrl) {
      // For RSS feeds, we'd need to parse the RSS to get show info
      // For now, return basic info
      return { totalEpisodes: 0, followers: 0, name: 'RSS Feed', description: '' };
    }
    
    if (this.showId) {
      try {
        const params = new URLSearchParams({
          id: this.showId,
          media: 'podcast',
          entity: 'podcast',
          limit: '1'
        });

        const response = await fetch(`https://itunes.apple.com/lookup?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error(`iTunes API failed: ${response.status}`);
        }
        
        const data = await response.json();
        const show = data.results[0];
        
        return {
          totalEpisodes: show?.trackCount || 0,
          followers: 0,
          name: show?.trackName || '',
          description: show?.description || ''
        };
      } catch (error) {
        console.error('Failed to fetch Apple Podcasts show info:', error);
        return { totalEpisodes: 0, followers: 0, name: '', description: '' };
      }
    }
    
    return { totalEpisodes: 0, followers: 0, name: '', description: '' };
  }

  private async fetchFromRSS(): Promise<ExternalEpisode[]> {
    try {
      const response = await fetch(this.feedUrl, {
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      if (!response.ok) {
        throw new Error(`RSS feed fetch failed: ${response.status}`);
      }
      
      const rssText = await response.text();
      
      // For now, return empty array since RSS parsing would need XML parser
      // In production, you'd want to properly parse the RSS XML
      console.log('RSS feed fetched successfully, but parsing not implemented yet');
      return [];
    } catch (error) {
      console.error('Failed to fetch RSS feed:', error);
      return [];
    }
  }

  private async fetchFromiTunes(limit: number): Promise<ExternalEpisode[]> {
    try {
      const params = new URLSearchParams({
        id: this.showId,
        media: 'podcast',
        entity: 'podcastEpisode',
        limit: limit.toString()
      });

      const response = await fetch(`https://itunes.apple.com/lookup?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`iTunes API failed: ${response.status}`);
      }
      
      const data = await response.json();
      return this.transformEpisodes(data.results.slice(1)); // First result is the show itself
    } catch (error) {
      console.error('Failed to fetch from iTunes:', error);
      return [];
    }
  }

  private transformEpisodes(episodes: any[]): ExternalEpisode[] {
    return episodes.map(episode => ({
      id: `apple_${episode.trackId}`,
      title: episode.trackName,
      description: episode.description || '',
      audioUrl: episode.episodeUrl || '',
      imageUrl: episode.artworkUrl600 || episode.artworkUrl100 || '',
      duration: Math.floor((episode.trackTimeMillis || 0) / 1000),
      publishedDate: episode.releaseDate?.split('T')[0] || '',
      platform: 'apple' as const,
      platformEpisodeId: episode.trackId.toString(),
      platformUrl: episode.trackViewUrl || '',
      isExplicit: episode.trackExplicitness === 'explicit',
      category: episode.primaryGenreName || 'General',
    }));
  }
}

// Main orchestrator
class PodcastAPIOrchestrator {
  private spotifyApi: SpotifyPodcastAPI;
  private youtubeApi: YouTubePodcastAPI;
  private appleApi: ApplePodcastsAPI;

  constructor() {
    this.spotifyApi = new SpotifyPodcastAPI();
    this.youtubeApi = new YouTubePodcastAPI();
    this.appleApi = new ApplePodcastsAPI();
  }

  async syncAllPlatforms(): Promise<{
    results: SyncResult[];
    allEpisodes: ExternalEpisode[];
    platformStats: PlatformStats;
  }> {
    console.log('Starting sync all platforms...');
    
    // Use Promise.allSettled with individual timeouts for faster execution
    const SYNC_TIMEOUT = 15000; // 15 seconds per platform
    
    const syncPromises = [
      this.withTimeout(this.syncSpotify(), SYNC_TIMEOUT, 'spotify'),
      this.withTimeout(this.syncApplePodcasts(), SYNC_TIMEOUT, 'apple'),
      this.withTimeout(this.syncYouTube(), SYNC_TIMEOUT, 'youtube')
    ];

    const results = await Promise.allSettled(syncPromises);
    
    const syncResults: SyncResult[] = results.map((result, index) => {
      const platforms = ['spotify', 'apple', 'youtube'] as const;
      const platform = platforms[index];
      
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error(`${platform} sync failed:`, result.reason);
        return {
          platform,
          success: false,
          episodes: [],
          error: result.reason?.message || 'Sync timeout or unknown error'
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

    console.log('Sync all platforms completed:', { 
      resultsCount: syncResults.length, 
      totalEpisodes: allEpisodes.length,
      platformStats 
    });

    return {
      results: syncResults,
      allEpisodes,
      platformStats
    };
  }

  // Helper method to add timeout to promises
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, platformName: string): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`${platformName} sync timeout after ${timeoutMs}ms`)), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  async syncSpotify(): Promise<SyncResult> {
    try {
      console.log('Syncing Spotify...');
      
      // Check if credentials are available first
      if (!this.spotifyApi.clientId || !this.spotifyApi.clientSecret || !this.spotifyApi.showId) {
        console.warn('Spotify credentials not configured, skipping...');
        return {
          platform: 'spotify',
          success: false,
          episodes: [],
          error: 'Spotify credentials not configured'
        };
      }

      // Fetch with smaller limit for faster response
      const [episodes, showInfo] = await Promise.all([
        this.spotifyApi.getShowEpisodes(10), // Reduced from 50 to 10 for speed
        this.spotifyApi.getShowInfo()
      ]);

      console.log(`Spotify sync success: ${episodes.length} episodes`);
      return {
        platform: 'spotify',
        success: true,
        episodes,
        stats: {
          totalEpisodes: showInfo.totalEpisodes,
          followers: showInfo.followers,
          totalPlays: 0
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

  async syncApplePodcasts(): Promise<SyncResult> {
    try {
      console.log('Syncing Apple Podcasts...');
      
      if (!this.appleApi.showId && !this.appleApi.feedUrl) {
        console.warn('Apple Podcasts credentials not configured, skipping...');
        return {
          platform: 'apple',
          success: false,
          episodes: [],
          error: 'Apple Podcasts credentials not configured'
        };
      }

      const [episodes, showInfo] = await Promise.all([
        this.appleApi.getShowEpisodes(10), // Reduced from 50 to 10 for speed
        this.appleApi.getShowInfo()
      ]);

      console.log(`Apple Podcasts sync success: ${episodes.length} episodes`);
      return {
        platform: 'apple',
        success: true,
        episodes,
        stats: {
          totalEpisodes: showInfo.totalEpisodes,
          followers: showInfo.followers,
          totalPlays: 0
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

  async syncYouTube(): Promise<SyncResult> {
    try {
      console.log('Syncing YouTube...');
      
      if (!this.youtubeApi.apiKey || !this.youtubeApi.channelId) {
        console.warn('YouTube credentials not configured, skipping...');
        return {
          platform: 'youtube',
          success: false,
          episodes: [],
          error: 'YouTube credentials not configured'
        };
      }

      const [episodes, channelInfo] = await Promise.all([
        this.youtubeApi.getChannelVideos(10), // Reduced from 50 to 10 for speed
        this.youtubeApi.getChannelInfo()
      ]);

      console.log(`YouTube sync success: ${episodes.length} episodes`);
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
}

export const podcastAPIOrchestrator = new PodcastAPIOrchestrator();