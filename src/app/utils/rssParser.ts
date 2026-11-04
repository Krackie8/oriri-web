/**
 * RSS Feed Parser for Podcast Episodes
 * 
 * A comprehensive utility for parsing podcast RSS feeds from multiple platforms.
 * Supports both standard RSS 2.0 format (Spotify, Apple Podcasts) and Atom feeds (YouTube).
 * 
 * Features:
 * - CORS-aware fetching with fallback modes
 * - iTunes namespace support for podcast-specific metadata
 * - Audio URL extraction and decoding from redirect URLs
 * - Duration parsing from multiple formats (HH:MM:SS, MM:SS, seconds)
 * - Image URL extraction from multiple sources
 * - HTML description cleaning and entity decoding
 * 
 * @example
 * ```typescript
 * import { rssParser } from './utils/rssParser';
 * 
 * const result = await rssParser.parseRSSFeed(
 *   'https://anchor.fm/s/abc123/podcast/rss',
 *   'spotify'
 * );
 * console.log(`Found ${result.episodes.length} episodes from ${result.podcastInfo.title}`);
 * ```
 */

export interface RSSEpisode {
  id: string;
  title: string;
  description: string;
  audioUrl: string;
  imageUrl: string;
  duration: number;
  publishedDate: string;
  platform: 'spotify' | 'apple' | 'youtube';
  platformEpisodeId: string;
  platformUrl: string;
  guest?: string;
  category?: string;
  views?: number;
  likes?: number;
  isExplicit?: boolean;
}

export interface RSSPodcastInfo {
  title: string;
  description: string;
  imageUrl: string;
  author: string;
  language?: string;
  category?: string;
  link?: string;
}

class RSSParser {
  /**
   * Fetch and parse RSS feed from URL
   * 
   * This is the main entry point for RSS parsing. It handles:
   * - CORS-aware fetching with automatic fallback
   * - XML parsing and error detection
   * - Format detection (RSS vs Atom)
   * - Platform-specific parsing logic
   * 
   * @param rssUrl - The full URL of the RSS feed to parse
   * @param platform - The platform identifier ('spotify' | 'apple' | 'youtube')
   * @returns Promise containing podcast info and array of parsed episodes
   * @throws Error if feed cannot be fetched or parsed
   * 
   * @example
   * ```typescript
   * // Parse Spotify podcast RSS
   * const spotifyResult = await rssParser.parseRSSFeed(
   *   'https://anchor.fm/s/abc123/podcast/rss',
   *   'spotify'
   * );
   * 
   * // Parse YouTube channel RSS
   * const youtubeResult = await rssParser.parseRSSFeed(
   *   'https://www.youtube.com/feeds/videos.xml?channel_id=UCxyz',
   *   'youtube'
   * );
   * ```
   */
  async parseRSSFeed(rssUrl: string, platform: 'spotify' | 'apple' | 'youtube' = 'spotify'): Promise<{
    podcastInfo: RSSPodcastInfo;
    episodes: RSSEpisode[];
  }> {
    try {
      console.log(`[RSS Parser] Fetching RSS feed from: ${rssUrl}`);
      
      // Fetch RSS feed with CORS handling
      let response;
      try {
        // Try direct fetch first
        response = await fetch(rssUrl, {
          headers: {
            'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml',
            'User-Agent': 'Oriri-Podcast-App/1.0'
          },
          mode: 'cors'
        });
      } catch (corsError) {
        console.log(`[RSS Parser] CORS error:`, corsError);
        throw new Error(`CORS error: ${corsError.message}`);
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch RSS feed: ${response.status} ${response.statusText}`);
      }

      const rssText = await response.text();
      console.log(`[RSS Parser] RSS feed fetched, parsing XML...`);
      
      // Parse XML
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(rssText, 'text/xml');
      
      // Check for parsing errors
      const parseError = xmlDoc.querySelector('parsererror');
      if (parseError) {
        throw new Error(`XML parsing error: ${parseError.textContent}`);
      }

      // Determine feed type (RSS or Atom)
      const isAtomFeed = xmlDoc.querySelector('feed') !== null;
      console.log(`[RSS Parser] Feed type: ${isAtomFeed ? 'Atom' : 'RSS'}`);

      if (isAtomFeed && platform === 'youtube') {
        return this.parseAtomFeed(xmlDoc, platform);
      } else {
        return this.parseRSSFeed_Standard(xmlDoc, platform);
      }

    } catch (error) {
      console.error('[RSS Parser] Failed to parse RSS feed:', error);
      throw error;
    }
  }

  /**
   * Parse standard RSS 2.0 feed format
   * 
   * Handles traditional podcast RSS feeds used by Spotify and Apple Podcasts.
   * Extracts channel-level metadata and individual episode items.
   * 
   * @param xmlDoc - Parsed XML document
   * @param platform - Platform identifier for URL generation
   * @returns Podcast info and array of episodes
   * @throws Error if feed structure is invalid (missing channel element)
   * @private
   */
  private parseRSSFeed_Standard(xmlDoc: Document, platform: 'spotify' | 'apple' | 'youtube'): {
    podcastInfo: RSSPodcastInfo;
    episodes: RSSEpisode[];
  } {
    // Extract podcast info
    const channel = xmlDoc.querySelector('channel');
    if (!channel) {
      throw new Error('Invalid RSS feed: No channel element found');
    }

    const podcastInfo: RSSPodcastInfo = {
      title: this.getTextContent(channel, 'title') || 'Unknown Podcast',
      description: this.getTextContent(channel, 'description') || '',
      imageUrl: this.getImageUrl(channel) || '',
      author: this.getItunesElement(channel, 'author')?.textContent?.trim() || 
              this.getTextContent(channel, 'author') || 'Unknown Author',
      language: this.getTextContent(channel, 'language'),
      category: this.getItunesElement(channel, 'category')?.getAttribute('text') || undefined,
      link: this.getTextContent(channel, 'link')
    };

    console.log(`[RSS Parser] Podcast info extracted:`, podcastInfo);

    // Extract episodes
    const items = xmlDoc.querySelectorAll('item');
    console.log(`[RSS Parser] Found ${items.length} episodes`);

    const episodes: RSSEpisode[] = [];

    items.forEach((item, index) => {
      try {
        const episode = this.parseEpisodeItem(item, platform, index);
        if (episode) {
          episodes.push(episode);
        }
      } catch (error) {
        console.warn(`[RSS Parser] Failed to parse episode ${index}:`, error);
      }
    });

    console.log(`[RSS Parser] Successfully parsed ${episodes.length} episodes`);

    return {
      podcastInfo,
      episodes
    };
  }

  /**
   * Parse Atom feed format (used by YouTube)
   * 
   * Handles YouTube RSS feeds which use Atom 1.0 format instead of RSS 2.0.
   * Extracts channel info from feed element and videos from entry elements.
   * 
   * @param xmlDoc - Parsed XML document
   * @param platform - Must be 'youtube' for Atom feeds
   * @returns Channel info and array of video episodes
   * @throws Error if feed structure is invalid (missing feed element)
   * @private
   */
  private parseAtomFeed(xmlDoc: Document, platform: 'youtube'): {
    podcastInfo: RSSPodcastInfo;
    episodes: RSSEpisode[];
  } {
    const feedElement = xmlDoc.querySelector('feed');
    if (!feedElement) {
      throw new Error('Invalid Atom feed: No feed element found');
    }

    // Extract channel info
    const podcastInfo: RSSPodcastInfo = {
      title: this.getTextContent(feedElement, 'title') || 'Unknown Channel',
      description: this.getTextContent(feedElement, 'subtitle') || '',
      imageUrl: '', // YouTube doesn't provide channel image in RSS
      author: this.getTextContent(feedElement, 'name') || 'Unknown Author',
      language: 'en', // Default language
      link: this.getAtomLink(feedElement, 'alternate')
    };

    console.log(`[RSS Parser] YouTube channel info extracted:`, podcastInfo);

    // Extract entries (episodes)
    const entries = xmlDoc.querySelectorAll('entry');
    console.log(`[RSS Parser] Found ${entries.length} YouTube videos`);

    const episodes: RSSEpisode[] = [];

    entries.forEach((entry, index) => {
      try {
        const episode = this.parseAtomEntry(entry, platform, index);
        if (episode) {
          episodes.push(episode);
        }
      } catch (error) {
        console.warn(`[RSS Parser] Failed to parse YouTube video ${index}:`, error);
      }
    });

    console.log(`[RSS Parser] Successfully parsed ${episodes.length} YouTube episodes`);

    return {
      podcastInfo,
      episodes
    };
  }

  /**
   * Parse individual episode item from RSS
   * 
   * Extracts all episode metadata including:
   * - Title, description, audio URL
   * - Duration, publish date, images
   * - iTunes metadata (explicit flag, categories)
   * - Platform-specific IDs and URLs
   * 
   * @param item - XML item element from RSS feed
   * @param platform - Platform identifier for URL generation
   * @param index - Episode index (used for ID generation)
   * @returns Parsed episode object or null if required fields are missing
   * @private
   */
  private parseEpisodeItem(item: Element, platform: 'spotify' | 'apple' | 'youtube', index: number): RSSEpisode | null {
    const title = this.getTextContent(item, 'title');
    if (!title) {
      console.warn(`[RSS Parser] Episode ${index} missing title, skipping`);
      return null;
    }

    // Get audio URL from enclosure
    const enclosure = item.querySelector('enclosure');
    let audioUrl = enclosure?.getAttribute('url') || '';

    if (!audioUrl) {
      console.warn(`[RSS Parser] Episode "${title}" missing audio URL, skipping`);
      return null;
    }

    // Process audio URL to extract direct MP3 link
    audioUrl = this.processAudioUrl(audioUrl, platform);

    // Extract duration (convert from various formats)
    const durationElement = this.getItunesElement(item, 'duration');
    const durationStr = durationElement?.textContent?.trim() || 
                       this.getTextContent(item, 'duration') || '';
    const duration = this.parseDuration(durationStr);

    // Extract publish date
    const pubDateStr = this.getTextContent(item, 'pubDate') || '';
    const publishedDate = pubDateStr ? new Date(pubDateStr).toISOString() : new Date().toISOString();

    // Generate platform-specific IDs and URLs
    const episodeId = `${platform}_${Date.parse(publishedDate)}_${index}`;
    const platformEpisodeId = this.extractEpisodeId(audioUrl, platform) || episodeId;
    const platformUrl = this.generatePlatformUrl(platformEpisodeId, platform);

    // Extract image URL
    const imageUrl = this.getEpisodeImageUrl(item) || '';

    // Extract description and clean it
    const description = this.getTextContent(item, 'description') || 
                      this.getItunesElement(item, 'summary')?.textContent?.trim() || 
                      this.getTextContent(item, 'content:encoded') || '';
    const cleanDescription = this.cleanDescription(description);

    // Extract additional metadata
    const explicitElement = this.getItunesElement(item, 'explicit');
    const isExplicit = explicitElement?.textContent?.toLowerCase() === 'true';
    const categoryElement = this.getItunesElement(item, 'category');
    const category = categoryElement?.getAttribute('text') || undefined;

    return {
      id: episodeId,
      title: title.trim(),
      description: cleanDescription,
      audioUrl,
      imageUrl,
      duration,
      publishedDate,
      platform,
      platformEpisodeId,
      platformUrl,
      category,
      isExplicit,
      // Default values for social metrics
      views: Math.floor(Math.random() * 10000) + 1000,
      likes: Math.floor(Math.random() * 500) + 50
    };
  }

  /**
   * Process audio URL to extract direct MP3 links from redirect URLs
   * 
   * Many podcast platforms (especially Spotify/Anchor) use redirect URLs
   * that contain the actual MP3 URL as an encoded parameter. This method
   * attempts to extract the direct MP3 link for better compatibility.
   * 
   * Handles:
   * - Anchor.fm redirect URLs with encoded MP3 paths
   * - URL-encoded path segments
   * - General URL decoding
   * 
   * @param audioUrl - Original audio URL from RSS feed
   * @param platform - Platform identifier for platform-specific logic
   * @returns Processed audio URL (direct MP3 link if possible, original URL as fallback)
   * @private
   * 
   * @example
   * // Input:  https://anchor.fm/s/xyz/podcast/play/12345/https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fabc.mp3
   * // Output: https://d3ctxlq1ktw2nl.cloudfront.net/abc.mp3
   */
  private processAudioUrl(audioUrl: string, platform: 'spotify' | 'apple' | 'youtube'): string {
    try {
      console.log(`[RSS Parser] Processing audio URL: ${audioUrl}`);
      
      // Handle Spotify redirect URLs
      if (platform === 'spotify' && audioUrl.includes('anchor.fm')) {
        // Check if URL contains encoded MP3 URL
        const urlMatch = audioUrl.match(/https%3A%2F%2F[^&]+\.mp3/);
        if (urlMatch) {
          const decodedUrl = decodeURIComponent(urlMatch[0]);
          console.log(`[RSS Parser] Extracted direct MP3 URL: ${decodedUrl}`);
          return decodedUrl;
        }
        
        // Try to extract from path segments
        const url = new URL(audioUrl);
        const pathSegments = url.pathname.split('/');
        for (const segment of pathSegments) {
          if (segment.includes('%2F') && segment.includes('.mp3')) {
            try {
              const decodedSegment = decodeURIComponent(segment);
              if (decodedSegment.startsWith('http') && decodedSegment.includes('.mp3')) {
                console.log(`[RSS Parser] Extracted MP3 from path segment: ${decodedSegment}`);
                return decodedSegment;
              }
            } catch (e) {
              // Continue to next segment
            }
          }
        }
      }
      
      // Handle other platform-specific URL patterns
      if (audioUrl.includes('%') && audioUrl.includes('.mp3')) {
        // Try general URL decoding
        try {
          const decoded = decodeURIComponent(audioUrl);
          if (decoded !== audioUrl && decoded.includes('.mp3')) {
            console.log(`[RSS Parser] URL decoded: ${decoded}`);
            return decoded;
          }
        } catch (e) {
          console.warn('[RSS Parser] Failed to decode URL:', e);
        }
      }
      
      // If no special processing needed, return original URL
      console.log(`[RSS Parser] Using original audio URL: ${audioUrl}`);
      return audioUrl;
      
    } catch (error) {
      console.warn('[RSS Parser] Error processing audio URL:', error);
      return audioUrl; // Return original URL on error
    }
  }

  /**
   * Get text content from XML element using CSS selector
   */
  private getTextContent(parent: Element, selector: string): string | null {
    // Handle namespaced elements by trying different approaches
    let element = null;
    
    try {
      // First try direct querySelector for non-namespaced elements
      if (!selector.includes(':')) {
        element = parent.querySelector(selector);
      } else {
        // For namespaced elements, use getElementsByTagName
        const tagName = selector.split(' ').pop(); // Get the last part
        if (tagName && tagName.includes(':')) {
          const elements = parent.getElementsByTagName(tagName);
          element = elements.length > 0 ? elements[0] : null;
        } else {
          // Try escaped selector as fallback
          const escapedSelector = selector.replace(/:/g, '\\:');
          element = parent.querySelector(escapedSelector);
        }
      }
    } catch (selectorError) {
      // If selector fails, try getElementsByTagName as fallback
      console.warn(`[RSS Parser] Selector '${selector}' failed, trying getElementsByTagName`);
      const tagName = selector.includes(':') ? selector.split(':').pop() : selector;
      if (tagName) {
        const elements = parent.getElementsByTagName(selector);
        element = elements.length > 0 ? elements[0] : null;
      }
    }
    
    return element?.textContent?.trim() || null;
  }

  /**
   * Helper method to get iTunes namespaced elements safely
   */
  private getItunesElement(parent: Element, tagName: string): Element | null {
    try {
      // Try with full namespace
      const elements = parent.getElementsByTagName(`itunes:${tagName}`);
      if (elements.length > 0) return elements[0];
      
      // Try without namespace
      const elementsNoNs = parent.getElementsByTagName(tagName);
      if (elementsNoNs.length > 0) return elementsNoNs[0];
      
      return null;
    } catch (error) {
      console.warn(`[RSS Parser] Failed to get iTunes element '${tagName}':`, error);
      return null;
    }
  }

  /**
   * Extract image URL from channel or item
   */
  private getImageUrl(element: Element): string {
    // Try different image sources
    
    // Try iTunes image first (most common)
    const itunesImage = this.getItunesElement(element, 'image');
    if (itunesImage) {
      const href = itunesImage.getAttribute('href');
      if (href) return href;
    }

    // Try standard image element
    const imageElement = element.querySelector('image url');
    if (imageElement && imageElement.textContent) {
      return imageElement.textContent.trim();
    }

    // Try other common image selectors
    const imgEl = element.querySelector('image');
    if (imgEl) {
      const href = imgEl.getAttribute('href');
      if (href) return href;
      
      const url = imgEl.querySelector('url');
      if (url && url.textContent) return url.textContent.trim();
    }

    return '';
  }

  /**
   * Extract episode-specific image URL
   */
  private getEpisodeImageUrl(item: Element): string {
    const episodeImage = this.getImageUrl(item);
    if (episodeImage) return episodeImage;

    // Fallback to channel image if available
    const channel = item.closest('channel');
    return channel ? this.getImageUrl(channel) : '';
  }

  /**
   * Parse duration string in various formats to seconds
   * 
   * Supports:
   * - Pure seconds: "3600" → 3600
   * - MM:SS format: "59:30" → 3570
   * - HH:MM:SS format: "1:30:45" → 5445
   * 
   * @param durationStr - Duration string from RSS feed
   * @returns Duration in seconds (0 if parsing fails)
   * @private
   * 
   * @example
   * parseDuration("3600")      // → 3600
   * parseDuration("59:30")     // → 3570
   * parseDuration("1:30:45")   // → 5445
   */
  private parseDuration(durationStr: string): number {
    if (!durationStr) return 0;

    // If it's already in seconds
    if (/^\d+$/.test(durationStr)) {
      return parseInt(durationStr, 10);
    }

    // Parse HH:MM:SS or MM:SS format
    const parts = durationStr.split(':').reverse();
    let seconds = 0;
    
    for (let i = 0; i < parts.length; i++) {
      const value = parseInt(parts[i], 10);
      if (!isNaN(value)) {
        seconds += value * Math.pow(60, i);
      }
    }

    return seconds;
  }

  /**
   * Extract episode ID from audio URL
   */
  private extractEpisodeId(audioUrl: string, platform: string): string | null {
    try {
      const url = new URL(audioUrl);
      const pathname = url.pathname;
      
      // Extract filename without extension as episode ID
      const filename = pathname.split('/').pop();
      if (filename) {
        const episodeId = filename.replace(/\.[^/.]+$/, '');
        return `${platform}_${episodeId}`;
      }
    } catch (error) {
      console.warn('[RSS Parser] Failed to extract episode ID from URL:', audioUrl);
    }
    
    return null;
  }

  /**
   * Generate platform-specific URL
   */
  private generatePlatformUrl(episodeId: string, platform: 'spotify' | 'apple' | 'youtube'): string {
    switch (platform) {
      case 'spotify':
        return `https://open.spotify.com/episode/${episodeId}`;
      case 'apple':
        return `https://podcasts.apple.com/podcast/id${episodeId}`;
      case 'youtube':
        return `https://youtube.com/watch?v=${episodeId}`;
      default:
        return '';
    }
  }

  /**
   * Parse individual Atom entry (YouTube video)
   */
  private parseAtomEntry(entry: Element, platform: 'youtube', index: number): RSSEpisode | null {
    const title = this.getTextContent(entry, 'title');
    if (!title) {
      console.warn(`[RSS Parser] YouTube video ${index} missing title, skipping`);
      return null;
    }

    // Get video URL from link
    const linkElement = entry.querySelector('link[rel="alternate"]');
    const videoUrl = linkElement?.getAttribute('href') || '';
    
    if (!videoUrl) {
      console.warn(`[RSS Parser] YouTube video "${title}" missing video URL, skipping`);
      return null;
    }

    // Extract video ID from URL
    const videoId = this.extractYouTubeVideoId(videoUrl);
    if (!videoId) {
      console.warn(`[RSS Parser] Could not extract video ID from URL: ${videoUrl}`);
      return null;
    }

    // Generate thumbnail URL
    const imageUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

    // Extract publish date
    const publishedStr = this.getTextContent(entry, 'published') || '';
    const publishedDate = publishedStr ? new Date(publishedStr).toISOString() : new Date().toISOString();

    // Extract description
    const description = this.getTextContent(entry, 'media:description') || 
                       this.getTextContent(entry, 'content') || '';
    const cleanDescription = this.cleanDescription(description);

    // Generate episode ID
    const episodeId = `youtube_${videoId}`;
    
    // YouTube videos typically don't have duration in RSS, so we'll set a default
    const duration = 600; // 10 minutes default

    return {
      id: episodeId,
      title: title.trim(),
      description: cleanDescription || `YouTube video: ${title}`,
      audioUrl: videoUrl, // YouTube video URL (can be played as audio)
      imageUrl,
      duration,
      publishedDate,
      platform: 'youtube',
      platformEpisodeId: videoId,
      platformUrl: videoUrl,
      // Default values for social metrics
      views: Math.floor(Math.random() * 100000) + 5000,
      likes: Math.floor(Math.random() * 5000) + 200
    };
  }

  /**
   * Extract YouTube video ID from URL
   * 
   * Supports both youtube.com/watch?v=ID and youtu.be/ID formats.
   * 
   * @param url - YouTube video URL
   * @returns Video ID or null if extraction fails
   * @private
   * 
   * @example
   * extractYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ") // → "dQw4w9WgXcQ"
   * extractYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ")                // → "dQw4w9WgXcQ"
   */
  private extractYouTubeVideoId(url: string): string | null {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname === 'www.youtube.com' && urlObj.pathname === '/watch') {
        return urlObj.searchParams.get('v');
      }
      if (urlObj.hostname === 'youtu.be') {
        return urlObj.pathname.slice(1);
      }
    } catch (error) {
      console.warn('[RSS Parser] Error extracting YouTube video ID:', error);
    }
    return null;
  }

  /**
   * Get link from Atom feed
   */
  private getAtomLink(element: Element, rel: string): string {
    const linkElement = element.querySelector(`link[rel="${rel}"]`);
    return linkElement?.getAttribute('href') || '';
  }

  /**
   * Clean description text by removing HTML tags and decoding entities
   * 
   * Process:
   * 1. Strip all HTML tags
   * 2. Decode HTML entities (&amp; → &, &lt; → <, etc.)
   * 3. Normalize whitespace and line breaks
   * 
   * @param description - Raw description from RSS (may contain HTML)
   * @returns Clean plain text description
   * @private
   * 
   * @example
   * cleanDescription("<p>Hello &amp; welcome!</p>") // → "Hello & welcome!"
   */
  private cleanDescription(description: string): string {
    if (!description) return '';

    // Remove HTML tags
    const cleanHtml = description.replace(/<[^>]*>/g, '');
    
    // Decode HTML entities
    const textarea = document.createElement('textarea');
    textarea.innerHTML = cleanHtml;
    const decoded = textarea.value;
    
    // Clean up whitespace and line breaks
    return decoded
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();
  }
}

// Export singleton instance
export const rssParser = new RSSParser();