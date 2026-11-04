import { ExternalEpisode } from '../../types/podcast';

interface ApplePodcastsEpisode {
  id: number;
  title: string;
  description: string;
  websiteUrl: string;
  enclosureUrl: string;
  enclosureType: string;
  enclosureLength: number;
  publishDate: string;
  duration: number;
  explicit: boolean;
  episodeNumber?: number;
  seasonNumber?: number;
  episodeType: string;
  transcript?: string;
  artwork?: {
    url: string;
    width: number;
    height: number;
  };
}

interface ApplePodcastsShow {
  id: number;
  name: string;
  description: string;
  websiteUrl: string;
  artwork: {
    url: string;
    width: number;
    height: number;
  };
  copyright: string;
  language: string;
  episodeCount: number;
  categories: string[];
  episodes?: ApplePodcastsEpisode[];
}

interface iTunesSearchResponse {
  resultCount: number;
  results: Array<{
    trackId: number;
    trackName: string;
    description: string;
    feedUrl: string;
    artworkUrl100: string;
    artworkUrl600: string;
    releaseDate: string;
    trackTimeMillis: number;
    contentAdvisoryRating?: string;
    episodeUrl?: string;
    previewUrl?: string;
    trackViewUrl: string;
    episodeGuid?: string;
  }>;
}

interface RSSFeedItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  enclosure?: {
    url: string;
    type: string;
    length: string;
  };
  duration?: string;
  explicit?: string;
  guid?: string;
  'itunes:title'?: string;
  'itunes:author'?: string;
  'itunes:summary'?: string;
  'itunes:duration'?: string;
  'itunes:explicit'?: string;
  'itunes:episodeType'?: string;
  'itunes:episode'?: string;
  'itunes:season'?: string;
}

class ApplePodcastsAPI {
  private showId: string; // Your Apple Podcasts show ID
  private feedUrl: string; // RSS feed URL for your podcast
  private iTunesApiBase = 'https://itunes.apple.com/search';

  constructor() {
    // These will be environment variables in production
    this.showId = Deno.env.get('APPLE_PODCASTS_SHOW_ID') || '';
    this.feedUrl = Deno.env.get('APPLE_PODCASTS_FEED_URL') || '';
  }

  /**
   * Get podcast episodes from Apple Podcasts using iTunes Search API
   * Note: Apple Podcasts doesn't have a direct API, so we use iTunes Search API + RSS parsing
   */
  async getShowEpisodes(limit: number = 50): Promise<ExternalEpisode[]> {
    if (!this.showId && !this.feedUrl) {
      console.warn('Apple Podcasts Show ID or Feed URL not configured');
      return [];
    }

    try {
      // If we have a direct RSS feed URL, use that for more detailed episode data
      if (this.feedUrl) {
        return await this.getEpisodesFromRSS(limit);
      }
      
      // Otherwise, use iTunes Search API
      return await this.getEpisodesFromiTunes(limit);
      
    } catch (error) {
      console.error('Failed to fetch Apple Podcasts episodes:', error);
      throw new Error('Failed to fetch episodes from Apple Podcasts');
    }
  }

  /**
   * Get episodes using iTunes Search API
   * Limited data but more reliable for public podcasts
   */
  private async getEpisodesFromiTunes(limit: number): Promise<ExternalEpisode[]> {
    try {
      const searchParams = new URLSearchParams({
        id: this.showId,
        media: 'podcast',
        entity: 'podcastEpisode',
        limit: limit.toString(),
        sort: 'recent'
      });

      const response = await fetch(`${this.iTunesApiBase}?${searchParams.toString()}`);
      
      if (!response.ok) {
        throw new Error(`iTunes API failed: ${response.status} ${response.statusText}`);
      }

      const data: iTunesSearchResponse = await response.json();
      
      // Filter out the podcast info (first result) and keep only episodes
      const episodes = data.results.filter(result => result.trackTimeMillis);
      
      return this.transformiTunesEpisodes(episodes);
      
    } catch (error) {
      console.error('Failed to fetch from iTunes API:', error);
      throw error;
    }
  }

  /**
   * Get episodes from RSS feed for more detailed information
   * This requires CORS proxy or server-side fetching in production
   */
  private async getEpisodesFromRSS(limit: number): Promise<ExternalEpisode[]> {
    try {
      // In production, this should be handled server-side to avoid CORS issues
      // For now, we'll use a CORS proxy or handle this on the backend
      
      const proxyUrl = 'https://api.allorigins.win/get?url=';
      const response = await fetch(`${proxyUrl}${encodeURIComponent(this.feedUrl)}`);
      
      if (!response.ok) {
        throw new Error(`RSS fetch failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const xmlText = data.contents;
      
      // Parse RSS XML
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      
      const items = xmlDoc.querySelectorAll('item');
      const episodes: RSSFeedItem[] = [];
      
      for (let i = 0; i < Math.min(items.length, limit); i++) {
        const item = items[i];
        episodes.push(this.parseRSSItem(item));
      }
      
      return this.transformRSSEpisodes(episodes);
      
    } catch (error) {
      console.error('Failed to fetch from RSS feed:', error);
      // Fallback to iTunes API if RSS fails
      return await this.getEpisodesFromiTunes(limit);
    }
  }

  /**
   * Parse individual RSS item
   */
  private parseRSSItem(item: Element): RSSFeedItem {
    const getTextContent = (selector: string): string => {
      const element = item.querySelector(selector);
      return element?.textContent?.trim() || '';
    };

    const enclosureElement = item.querySelector('enclosure');
    
    return {
      title: getTextContent('title'),
      description: getTextContent('description'),
      link: getTextContent('link'),
      pubDate: getTextContent('pubDate'),
      duration: getTextContent('itunes\\:duration') || getTextContent('duration'),
      explicit: getTextContent('itunes\\:explicit'),
      guid: getTextContent('guid'),
      'itunes:title': getTextContent('itunes\\:title'),
      'itunes:author': getTextContent('itunes\\:author'),
      'itunes:summary': getTextContent('itunes\\:summary'),
      'itunes:duration': getTextContent('itunes\\:duration'),
      'itunes:explicit': getTextContent('itunes\\:explicit'),
      'itunes:episodeType': getTextContent('itunes\\:episodeType'),
      'itunes:episode': getTextContent('itunes\\:episode'),
      'itunes:season': getTextContent('itunes\\:season'),
      enclosure: enclosureElement ? {
        url: enclosureElement.getAttribute('url') || '',
        type: enclosureElement.getAttribute('type') || '',
        length: enclosureElement.getAttribute('length') || '0'
      } : undefined
    };
  }

  /**
   * Get podcast information
   */
  async getShowInfo(): Promise<{ totalEpisodes: number; followers: number; name: string; description: string }> {
    if (!this.showId) {
      return { totalEpisodes: 0, followers: 0, name: '', description: '' };
    }

    try {
      const searchParams = new URLSearchParams({
        id: this.showId,
        media: 'podcast',
        entity: 'podcast',
        limit: '1'
      });

      const response = await fetch(`${this.iTunesApiBase}?${searchParams.toString()}`);
      
      if (!response.ok) {
        throw new Error(`iTunes API failed: ${response.status} ${response.statusText}`);
      }

      const data: iTunesSearchResponse = await response.json();
      const podcast = data.results[0];
      
      if (!podcast) {
        return { totalEpisodes: 0, followers: 0, name: '', description: '' };
      }

      return {
        totalEpisodes: 0, // iTunes API doesn't provide total episode count
        followers: 0, // Apple Podcasts doesn't provide follower count
        name: podcast.trackName,
        description: podcast.description
      };
      
    } catch (error) {
      console.error('Failed to fetch Apple Podcasts show info:', error);
      return { totalEpisodes: 0, followers: 0, name: '', description: '' };
    }
  }

  /**
   * Search episodes (limited with iTunes API)
   */
  async searchEpisodes(query: string, limit: number = 20): Promise<ExternalEpisode[]> {
    try {
      // iTunes Search API doesn't support episode search within a specific podcast
      // We'll fetch recent episodes and filter them locally
      const allEpisodes = await this.getShowEpisodes(100);
      
      const lowerQuery = query.toLowerCase();
      return allEpisodes
        .filter(episode => 
          episode.title.toLowerCase().includes(lowerQuery) ||
          episode.description.toLowerCase().includes(lowerQuery)
        )
        .slice(0, limit);
      
    } catch (error) {
      console.error('Failed to search Apple Podcasts episodes:', error);
      return [];
    }
  }

  /**
   * Transform iTunes API episode data to our internal format
   */
  private transformiTunesEpisodes(iTunesResults: any[]): ExternalEpisode[] {
    return iTunesResults.map(episode => ({
      id: `apple_${episode.trackId}`,
      title: episode.trackName,
      description: episode.description || '',
      audioUrl: episode.episodeUrl || episode.previewUrl || '',
      imageUrl: episode.artworkUrl600 || episode.artworkUrl100 || '',
      duration: Math.floor((episode.trackTimeMillis || 0) / 1000),
      publishedDate: episode.releaseDate,
      platform: 'apple' as const,
      platformEpisodeId: episode.trackId.toString(),
      platformUrl: episode.trackViewUrl,
      isExplicit: episode.contentAdvisoryRating === 'Explicit',
      guest: this.extractGuest(episode.description || ''),
      category: this.extractCategory(episode.description || ''),
    }));
  }

  /**
   * Transform RSS episode data to our internal format
   */
  private transformRSSEpisodes(rssEpisodes: RSSFeedItem[]): ExternalEpisode[] {
    return rssEpisodes.map((episode, index) => ({
      id: `apple_rss_${episode.guid || index}`,
      title: episode['itunes:title'] || episode.title,
      description: episode['itunes:summary'] || episode.description,
      audioUrl: episode.enclosure?.url || '',
      imageUrl: '', // RSS items typically don't have individual artwork
      duration: this.parseDuration(episode['itunes:duration'] || episode.duration || '0'),
      publishedDate: episode.pubDate,
      platform: 'apple' as const,
      platformEpisodeId: episode.guid || `rss_${index}`,
      platformUrl: episode.link,
      isExplicit: (episode['itunes:explicit'] || episode.explicit) === 'true',
      guest: this.extractGuest(episode.description),
      category: this.extractCategory(episode.description),
    }));
  }

  /**
   * Parse duration string (HH:MM:SS or MM:SS or seconds) to seconds
   */
  private parseDuration(duration: string): number {
    if (!duration) return 0;
    
    // If it's just a number, assume seconds
    if (/^\d+$/.test(duration)) {
      return parseInt(duration);
    }
    
    // Parse HH:MM:SS or MM:SS format
    const parts = duration.split(':').map(part => parseInt(part) || 0);
    
    if (parts.length === 3) {
      // HH:MM:SS
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      // MM:SS
      return parts[0] * 60 + parts[1];
    }
    
    return 0;
  }

  /**
   * Try to extract guest information from description
   */
  private extractGuest(description: string): string | undefined {
    if (!description) return undefined;
    
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
   * Try to extract category from description
   */
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

export const applePodcastsApi = new ApplePodcastsAPI();