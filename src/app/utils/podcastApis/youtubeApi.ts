import { ExternalEpisode } from '../../types/podcast';

interface YouTubeVideo {
  id: string;
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    thumbnails: {
      default: { url: string; width: number; height: number };
      medium: { url: string; width: number; height: number };
      high: { url: string; width: number; height: number };
      standard?: { url: string; width: number; height: number };
      maxres?: { url: string; width: number; height: number };
    };
    channelId: string;
    channelTitle: string;
    categoryId: string;
    defaultLanguage?: string;
    tags?: string[];
  };
  contentDetails: {
    duration: string; // ISO 8601 duration format (PT4M13S)
    dimension: string;
    definition: string;
    caption: string;
  };
  statistics: {
    viewCount: string;
    likeCount: string;
    dislikeCount?: string;
    favoriteCount: string;
    commentCount: string;
  };
  status: {
    uploadStatus: string;
    privacyStatus: string;
    license: string;
    embeddable: boolean;
    publicStatsViewable: boolean;
  };
}

interface YouTubeChannel {
  id: string;
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    thumbnails: {
      default: { url: string };
      medium: { url: string };
      high: { url: string };
    };
  };
  statistics: {
    viewCount: string;
    subscriberCount: string;
    hiddenSubscriberCount: boolean;
    videoCount: string;
  };
}

interface YouTubeSearchResponse {
  items: Array<{
    id: { videoId: string };
    snippet: {
      title: string;
      description: string;
      publishedAt: string;
      thumbnails: {
        default: { url: string };
        medium: { url: string };
        high: { url: string };
      };
    };
  }>;
  nextPageToken?: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
}

class YouTubePodcastAPI {
  private apiKey: string;
  private channelId: string; // Your YouTube channel ID
  private playlistId?: string; // Optional: specific playlist for podcast episodes

  constructor() {
    // These will be environment variables in production
    this.apiKey = Deno.env.get('YOUTUBE_API_KEY') || '';
    this.channelId = Deno.env.get('YOUTUBE_CHANNEL_ID') || '';
    this.playlistId = Deno.env.get('YOUTUBE_PLAYLIST_ID'); // Optional podcast-specific playlist
  }

  /**
   * Get channel videos (podcast episodes)
   * https://developers.google.com/youtube/v3/docs/search/list
   */
  async getChannelVideos(maxResults: number = 50, pageToken?: string): Promise<ExternalEpisode[]> {
    if (!this.channelId || !this.apiKey) {
      console.warn('YouTube API key or Channel ID not configured');
      return [];
    }

    try {
      const searchParams = new URLSearchParams({
        part: 'snippet',
        channelId: this.channelId,
        type: 'video',
        order: 'date',
        maxResults: maxResults.toString(),
        key: this.apiKey
      });

      if (pageToken) {
        searchParams.append('pageToken', pageToken);
      }

      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?${searchParams.toString()}`
      );

      if (!response.ok) {
        throw new Error(`YouTube API failed: ${response.status} ${response.statusText}`);
      }

      const searchData: YouTubeSearchResponse = await response.json();
      
      if (!searchData.items || searchData.items.length === 0) {
        return [];
      }

      // Get detailed video information
      const videoIds = searchData.items.map(item => item.id.videoId).join(',');
      const videosData = await this.getVideoDetails(videoIds);
      
      return this.transformVideos(videosData);
      
    } catch (error) {
      console.error('Failed to fetch YouTube videos:', error);
      throw new Error('Failed to fetch episodes from YouTube');
    }
  }

  /**
   * Get detailed video information including duration, stats
   */
  private async getVideoDetails(videoIds: string): Promise<YouTubeVideo[]> {
    const searchParams = new URLSearchParams({
      part: 'snippet,contentDetails,statistics,status',
      id: videoIds,
      key: this.apiKey
    });

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?${searchParams.toString()}`
    );

    if (!response.ok) {
      throw new Error(`YouTube videos API failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.items || [];
  }

  /**
   * Get channel information and statistics
   */
  async getChannelInfo(): Promise<{ totalVideos: number; subscribers: number; totalViews: number; name: string; description: string }> {
    if (!this.channelId || !this.apiKey) {
      return { totalVideos: 0, subscribers: 0, totalViews: 0, name: '', description: '' };
    }

    try {
      const searchParams = new URLSearchParams({
        part: 'snippet,statistics',
        id: this.channelId,
        key: this.apiKey
      });

      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?${searchParams.toString()}`
      );

      if (!response.ok) {
        throw new Error(`YouTube channel API failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const channel: YouTubeChannel = data.items?.[0];
      
      if (!channel) {
        return { totalVideos: 0, subscribers: 0, totalViews: 0, name: '', description: '' };
      }

      return {
        totalVideos: parseInt(channel.statistics.videoCount) || 0,
        subscribers: channel.statistics.hiddenSubscriberCount ? 0 : parseInt(channel.statistics.subscriberCount) || 0,
        totalViews: parseInt(channel.statistics.viewCount) || 0,
        name: channel.snippet.title,
        description: channel.snippet.description
      };
      
    } catch (error) {
      console.error('Failed to fetch YouTube channel info:', error);
      return { totalVideos: 0, subscribers: 0, totalViews: 0, name: '', description: '' };
    }
  }

  /**
   * Search videos in channel
   */
  async searchChannelVideos(query: string, maxResults: number = 20): Promise<ExternalEpisode[]> {
    if (!this.channelId || !this.apiKey) {
      return [];
    }

    try {
      const searchParams = new URLSearchParams({
        part: 'snippet',
        channelId: this.channelId,
        type: 'video',
        q: query,
        order: 'relevance',
        maxResults: maxResults.toString(),
        key: this.apiKey
      });

      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?${searchParams.toString()}`
      );

      if (!response.ok) {
        throw new Error(`YouTube search failed: ${response.status} ${response.statusText}`);
      }

      const searchData: YouTubeSearchResponse = await response.json();
      
      if (!searchData.items || searchData.items.length === 0) {
        return [];
      }

      const videoIds = searchData.items.map(item => item.id.videoId).join(',');
      const videosData = await this.getVideoDetails(videoIds);
      
      return this.transformVideos(videosData);
      
    } catch (error) {
      console.error('Failed to search YouTube videos:', error);
      return [];
    }
  }

  /**
   * Transform YouTube video data to our internal format
   */
  private transformVideos(youtubeVideos: YouTubeVideo[]): ExternalEpisode[] {
    return youtubeVideos.map(video => ({
      id: `youtube_${video.id}`,
      title: video.snippet.title,
      description: video.snippet.description,
      audioUrl: `https://www.youtube.com/watch?v=${video.id}`, // Note: This is the video URL, not direct audio
      imageUrl: video.snippet.thumbnails.maxres?.url || 
                video.snippet.thumbnails.standard?.url || 
                video.snippet.thumbnails.high?.url ||
                video.snippet.thumbnails.medium?.url,
      duration: this.parseDuration(video.contentDetails.duration),
      publishedDate: video.snippet.publishedAt,
      platform: 'youtube' as const,
      platformEpisodeId: video.id,
      platformUrl: `https://www.youtube.com/watch?v=${video.id}`,
      isExplicit: false, // YouTube doesn't have explicit flag in API response
      views: parseInt(video.statistics.viewCount) || 0,
      likes: parseInt(video.statistics.likeCount) || 0,
      guest: this.extractGuest(video.snippet.description),
      category: this.extractCategory(video.snippet.description, video.snippet.tags),
    }));
  }

  /**
   * Parse ISO 8601 duration format (PT4M13S) to seconds
   */
  private parseDuration(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    
    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    const seconds = parseInt(match[3]) || 0;
    
    return hours * 3600 + minutes * 60 + seconds;
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
      /interview\s+with\s+([^,\n\.]+)/i,
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
   * Try to extract category from description and tags
   */
  private extractCategory(description: string, tags?: string[]): string | undefined {
    const categories = [
      'Urban Planning', 'Architecture', 'Sustainability', 'Transportation',
      'Smart Cities', 'Climate Change', 'Housing', 'Infrastructure',
      'Design', 'Technology', 'Environment', 'Community Development'
    ];
    
    // Check tags first
    if (tags) {
      for (const tag of tags) {
        for (const category of categories) {
          if (tag.toLowerCase().includes(category.toLowerCase())) {
            return category;
          }
        }
      }
    }
    
    // Check description
    if (description) {
      const lowerDescription = description.toLowerCase();
      for (const category of categories) {
        if (lowerDescription.includes(category.toLowerCase())) {
          return category;
        }
      }
    }
    
    return 'General';
  }

  /**
   * Get playlist videos if using a specific podcast playlist
   */
  async getPlaylistVideos(maxResults: number = 50): Promise<ExternalEpisode[]> {
    if (!this.playlistId || !this.apiKey) {
      return [];
    }

    try {
      const searchParams = new URLSearchParams({
        part: 'snippet',
        playlistId: this.playlistId,
        maxResults: maxResults.toString(),
        key: this.apiKey
      });

      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?${searchParams.toString()}`
      );

      if (!response.ok) {
        throw new Error(`YouTube playlist API failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const videoIds = data.items.map((item: any) => item.snippet.resourceId.videoId).join(',');
      
      if (!videoIds) return [];
      
      const videosData = await this.getVideoDetails(videoIds);
      return this.transformVideos(videosData);
      
    } catch (error) {
      console.error('Failed to fetch YouTube playlist videos:', error);
      return [];
    }
  }
}

export const youtubeApi = new YouTubePodcastAPI();