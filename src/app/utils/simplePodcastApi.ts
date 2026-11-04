// Simple browser-compatible podcast API for testing
// This bypasses all server-side environment variable issues

import { projectId, publicAnonKey } from './supabase/info';

export interface SimpleEpisode {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  duration: number; // in seconds
  publishedDate: string;
  platformUrl: string;
  platform: 'spotify' | 'apple' | 'youtube';
}

// Helper function to clean HTML from descriptions
function cleanDescription(description: string): string {
  if (!description) return '';
  
  // Remove HTML tags
  return description
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

// Transform Spotify API response to SimpleEpisode format
function transformSpotifyEpisodes(spotifyEpisodes: any[]): SimpleEpisode[] {
  if (!Array.isArray(spotifyEpisodes)) {
    console.warn('Invalid Spotify episodes data:', spotifyEpisodes);
    return [];
  }

  return spotifyEpisodes.map(episode => ({
    id: `spotify_${episode.id}`,
    title: episode.name || 'Untitled Episode',
    description: cleanDescription(episode.description || episode.html_description || ''),
    imageUrl: episode.images?.[0]?.url || 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=400&fit=crop',
    duration: Math.floor((episode.duration_ms || 0) / 1000),
    publishedDate: episode.release_date || new Date().toISOString(),
    platformUrl: episode.external_urls?.spotify || '',
    platform: 'spotify' as const
  }));
}

class SimplePodcastAPI {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32`;
    this.apiKey = publicAnonKey;
  }

  // Make API request to the backend
  private async apiRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    try {
      console.log(`🌐 [SimplePodcastAPI] Making request to: ${endpoint}`);
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`✅ [SimplePodcastAPI] Request successful: ${endpoint}`);
      return data;
    } catch (error) {
      console.error(`❌ [SimplePodcastAPI] Request failed: ${endpoint}`, error);
      throw error;
    }
  }

  async getSpotifyEpisodes(limit: number = 20): Promise<SimpleEpisode[]> {
    console.log(`🎵 [SimplePodcastAPI] Fetching ${limit} Spotify episodes from backend...`);
    
    try {
      const response = await this.apiRequest(`/podcast/spotify/episodes?limit=${limit}`);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch Spotify episodes');
      }

      const spotifyEpisodes = response.data?.items || [];
      const transformedEpisodes = transformSpotifyEpisodes(spotifyEpisodes);
      
      console.log(`✅ [SimplePodcastAPI] Retrieved ${transformedEpisodes.length} Spotify episodes from backend`);
      return transformedEpisodes;
      
    } catch (error) {
      console.error('❌ [SimplePodcastAPI] Error fetching Spotify episodes:', error);
      
      // Return empty array instead of throwing to prevent app crashes
      console.warn('🔄 [SimplePodcastAPI] Returning empty array due to Spotify API error');
      return [];
    }
  }

  async getAppleEpisodes(limit: number = 20): Promise<SimpleEpisode[]> {
    console.log(`🎵 [SimplePodcastAPI] Fetching ${limit} Apple Podcast episodes...`);
    
    try {
      // For now, Apple Podcasts integration is not implemented in the backend
      // We'll return empty array but with success message
      console.log(`✅ [SimplePodcastAPI] Apple Podcasts integration coming soon`);
      return [];
      
    } catch (error) {
      console.error('❌ [SimplePodcastAPI] Error fetching Apple episodes:', error);
      return [];
    }
  }

  async getYouTubeEpisodes(limit: number = 20): Promise<SimpleEpisode[]> {
    console.log(`🎵 [SimplePodcastAPI] Fetching ${limit} YouTube episodes...`);
    
    try {
      // YouTube integration exists in the backend but we'll implement it later
      // For now, return empty array
      console.log(`✅ [SimplePodcastAPI] YouTube integration coming soon`);
      return [];
      
    } catch (error) {
      console.error('❌ [SimplePodcastAPI] Error fetching YouTube episodes:', error);
      return [];
    }
  }

  async getAllEpisodes(): Promise<SimpleEpisode[]> {
    console.log(`🎵 [SimplePodcastAPI] Fetching all episodes from all platforms...`);
    
    try {
      const [spotifyEpisodes, appleEpisodes, youtubeEpisodes] = await Promise.all([
        this.getSpotifyEpisodes(),
        this.getAppleEpisodes(),
        this.getYouTubeEpisodes()
      ]);

      const allEpisodes = [...spotifyEpisodes, ...appleEpisodes, ...youtubeEpisodes];
      
      // Sort by published date (newest first)
      allEpisodes.sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime());
      
      console.log(`✅ [SimplePodcastAPI] Retrieved ${allEpisodes.length} total episodes from backend`);
      return allEpisodes;
      
    } catch (error) {
      console.error(`❌ [SimplePodcastAPI] Error fetching episodes:`, error);
      
      // Return empty array instead of throwing to prevent app crashes
      console.warn('🔄 [SimplePodcastAPI] Returning empty array due to API errors');
      return [];
    }
  }

  // Test connectivity to the backend
  async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 [SimplePodcastAPI] Testing backend connection...');
      const response = await this.apiRequest('/health');
      
      if (response.success) {
        console.log('✅ [SimplePodcastAPI] Backend connection successful');
        return true;
      } else {
        console.error('❌ [SimplePodcastAPI] Backend health check failed:', response);
        return false;
      }
    } catch (error) {
      console.error('❌ [SimplePodcastAPI] Backend connection failed:', error);
      return false;
    }
  }

  // Get configuration status from backend
  async getConfigStatus(): Promise<any> {
    try {
      console.log('🔍 [SimplePodcastAPI] Checking platform configuration status...');
      const response = await this.apiRequest('/podcast/config-status');
      
      if (response.success) {
        console.log('✅ [SimplePodcastAPI] Configuration status retrieved:', response.data);
        return response.data;
      } else {
        console.error('❌ [SimplePodcastAPI] Failed to get configuration status:', response);
        return null;
      }
    } catch (error) {
      console.error('❌ [SimplePodcastAPI] Error getting configuration status:', error);
      return null;
    }
  }
}

// Export a singleton instance
export const simplePodcastApi = new SimplePodcastAPI();

// Export the class for testing
export { SimplePodcastAPI };