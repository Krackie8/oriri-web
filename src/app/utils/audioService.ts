// Comprehensive audio service for Oriri podcast app
import { audioGenerator } from './audioGenerator';

export interface AudioSource {
  url: string;
  type: 'external' | 'generated' | 'fallback' | 'vip';
  quality: 'high' | 'medium' | 'low';
  duration?: number;
}

export interface EpisodeAudioData {
  episodeId: string;
  title: string;
  primaryUrl: string;
  fallbackUrls: string[];
  duration?: number;
  isExternalPlatform?: boolean;
  platformUrl?: string;
  platform?: string;
}

class AudioService {
  private audioCache = new Map<string, AudioSource[]>();
  private generatedAudioCache = new Map<string, string>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  async getAudioSources(episodeId: string, title: string, episode?: any): Promise<AudioSource[]> {
    // Check cache first
    const cacheKey = `${episodeId}-${title}`;
    const cachedSources = this.getCachedSources(cacheKey);
    if (cachedSources) {
      return cachedSources;
    }

    const sources: AudioSource[] = [];

    try {
      // 1. Check if this is a VIP episode with direct audio URL
      if (episode && episode.audioUrl && episode.audioUrl !== '' && !episode.externalEpisode) {
        console.log('VIP episode with direct audio URL detected');
        sources.push({
          url: episode.audioUrl,
          type: 'vip',
          quality: 'high',
          duration: episode.duration
        });
      }

      // 2. Check if this is an external platform episode (Spotify, Apple, YouTube)
      if (episode && episode.externalEpisode) {
        console.log('External platform episode detected - no direct audio available');
        // For external platform episodes, we don't provide audio sources
        // as they should be played on their respective platforms
        
        // Only add demo audio as a last resort fallback
        const simpleToneUrl = audioGenerator.createSimpleToneDataUrl();
        sources.push({
          url: simpleToneUrl,
          type: 'fallback',
          quality: 'low'
        });
        
        // Cache and return early
        this.setCachedSources(cacheKey, sources);
        return sources;
      }

      // 3. For episodes without specific audio URLs, generate demo audio
      if (sources.length === 0) {
        console.log('No direct audio URL available, generating demo audio');
        const generatedUrl = await this.generateEpisodeAudio(episodeId, title);
        if (generatedUrl) {
          sources.push({
            url: generatedUrl,
            type: 'generated',
            quality: 'low'
          });
        }

        // 4. Add simple tone fallback
        const simpleToneUrl = audioGenerator.createSimpleToneDataUrl();
        sources.push({
          url: simpleToneUrl,
          type: 'fallback',
          quality: 'low'
        });
      }

    } catch (error) {
      console.error('Error getting audio sources:', error);
      
      // Fallback to simple tone if everything else fails
      const simpleToneUrl = audioGenerator.createSimpleToneDataUrl();
      sources.push({
        url: simpleToneUrl,
        type: 'fallback',
        quality: 'low'
      });
    }

    // Cache the sources
    this.setCachedSources(cacheKey, sources);
    return sources;
  }

  private getExternalAudioUrl(episodeId: string, title: string) {
    return this.externalAudioSources.find(source => 
      source.id === episodeId || source.title === title
    );
  }

  private getPublicDomainAudioUrl(episodeId: string): string | null {
    // Rotate through available public domain audio based on episode ID
    const hash = this.simpleHash(episodeId);
    const freeSoundIndex = hash % this.freeSoundAudio.length;
    const archiveIndex = hash % this.archiveOrgAudio.length;
    
    // Prefer Freesound for odd episodes, Archive.org for even
    return hash % 2 === 0 ? this.freeSoundAudio[freeSoundIndex] : this.archiveOrgAudio[archiveIndex];
  }

  private async generateEpisodeAudio(episodeId: string, title: string): Promise<string | null> {
    const cacheKey = `generated-${episodeId}`;
    
    // Check if we already generated audio for this episode
    if (this.generatedAudioCache.has(cacheKey)) {
      return this.generatedAudioCache.get(cacheKey)!;
    }

    try {
      // Generate different tones based on episode title/content
      const audioBlob = await this.generateContextualAudio(title);
      const url = URL.createObjectURL(audioBlob);
      
      // Cache the generated URL
      this.generatedAudioCache.set(cacheKey, url);
      
      return url;
    } catch (error) {
      console.error('Error generating episode audio:', error);
      return null;
    }
  }

  private async generateContextualAudio(title: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Generate different audio based on title keywords
        const duration = 10; // 10 seconds of demo audio
        const sampleRate = 44100;
        const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const channelData = buffer.getChannelData(0);

        // Determine audio characteristics based on title
        let baseFrequency = 440;
        let pattern = 'sine';
        
        if (title.toLowerCase().includes('ai') || title.toLowerCase().includes('tech')) {
          baseFrequency = 523; // C note
          pattern = 'digital';
        } else if (title.toLowerCase().includes('mindful') || title.toLowerCase().includes('wellness')) {
          baseFrequency = 396; // Healing frequency
          pattern = 'ambient';
        } else if (title.toLowerCase().includes('business') || title.toLowerCase().includes('startup')) {
          baseFrequency = 587; // D note
          pattern = 'energetic';
        }

        // Generate audio based on pattern
        for (let i = 0; i < channelData.length; i++) {
          const time = i / sampleRate;
          let sample = 0;

          switch (pattern) {
            case 'digital':
              // Digital-style beeps and bloops
              const noteIndex = Math.floor(time * 2) % 4;
              const frequencies = [baseFrequency, baseFrequency * 1.25, baseFrequency * 1.5, baseFrequency * 1.125];
              sample = 0.1 * Math.sin(2 * Math.PI * frequencies[noteIndex] * time);
              break;
              
            case 'ambient':
              // Ambient, calming tones
              sample = 0.05 * (
                Math.sin(2 * Math.PI * baseFrequency * time) +
                0.5 * Math.sin(2 * Math.PI * baseFrequency * 1.5 * time) +
                0.25 * Math.sin(2 * Math.PI * baseFrequency * 2 * time)
              );
              break;
              
            case 'energetic':
              // Upbeat, rhythmic pattern
              const beat = Math.floor(time * 4) % 2;
              sample = beat * 0.1 * Math.sin(2 * Math.PI * baseFrequency * time);
              break;
              
            default:
              // Simple sine wave
              sample = 0.1 * Math.sin(2 * Math.PI * baseFrequency * time);
          }

          // Apply envelope to prevent clicks
          const envelope = Math.exp(-time * 0.3);
          channelData[i] = sample * envelope;
        }

        // Convert to WAV blob
        const wavBlob = this.bufferToWav(buffer);
        audioContext.close();
        resolve(wavBlob);
        
      } catch (error) {
        reject(error);
      }
    });
  }

  private bufferToWav(buffer: AudioBuffer): Blob {
    const length = buffer.length;
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
    const view = new DataView(arrayBuffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * numberOfChannels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * numberOfChannels * 2, true);
    
    // Convert audio data
    const channelData = buffer.getChannelData(0);
    let offset = 44;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, sample * 0x7FFF, true);
      offset += 2;
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private getCachedSources(key: string): AudioSource[] | null {
    const expiry = this.cacheExpiry.get(key);
    if (expiry && Date.now() > expiry) {
      this.audioCache.delete(key);
      this.cacheExpiry.delete(key);
      return null;
    }
    return this.audioCache.get(key) || null;
  }

  private setCachedSources(key: string, sources: AudioSource[]): void {
    this.audioCache.set(key, sources);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_DURATION);
  }

  // Cleanup method to prevent memory leaks
  cleanup(): void {
    // Clean up generated blob URLs
    this.generatedAudioCache.forEach(url => {
      try {
        URL.revokeObjectURL(url);
      } catch (error) {
        console.warn('Error revoking blob URL:', error);
      }
    });
    
    this.generatedAudioCache.clear();
    this.audioCache.clear();
    this.cacheExpiry.clear();
  }

  // Get episode data with proper audio URLs
  async getEpisodeAudioData(episodeId: string, title: string, episode?: any): Promise<EpisodeAudioData> {
    // Check if this is an external platform episode (but not from RSS)
    if (episode && episode.externalEpisode) {
      const platform = episode.externalEpisode.platform || episode.platform;
      return {
        episodeId,
        title,
        primaryUrl: '', // No direct audio URL for external platform episodes
        fallbackUrls: [],
        duration: episode.duration,
        isExternalPlatform: true,
        platformUrl: episode.platformUrl,
        platform: platform
      };
    }

    // Check if this is an RSS episode with audio URL
    if (episode && episode.audioUrl && typeof episode.audioUrl === 'string' && episode.audioUrl.trim() !== '') {
      console.log(`[AudioService] RSS episode detected with audio URL: ${episode.audioUrl}`);
      
      // For RSS episodes, we have direct audio URLs that should work
      // But let's add some fallbacks in case of issues
      const fallbackUrls: string[] = [];
      
      // If original URL fails, try alternative extraction methods as fallback
      if (episode.audioUrl.includes('anchor.fm') && episode.audioUrl.includes('%')) {
        try {
          // Try double decoding for stubborn URLs
          const doubleDecode = decodeURIComponent(decodeURIComponent(episode.audioUrl));
          if (doubleDecode !== episode.audioUrl && doubleDecode.includes('.mp3')) {
            fallbackUrls.push(doubleDecode);
          }
        } catch (e) {
          console.warn('[AudioService] Double decode failed:', e);
        }
      }
      
      // Add generated audio as final fallback
      try {
        const generatedUrl = await this.generateEpisodeAudio(episodeId, title);
        if (generatedUrl) {
          fallbackUrls.push(generatedUrl);
        }
      } catch (e) {
        console.warn('[AudioService] Failed to generate fallback audio:', e);
      }
      
      return {
        episodeId,
        title,
        primaryUrl: episode.audioUrl,
        fallbackUrls,
        duration: episode.duration,
        isExternalPlatform: false
      };
    }

    // For episodes without direct audio URLs, get sources through the standard method
    const sources = await this.getAudioSources(episodeId, title, episode);
    
    return {
      episodeId,
      title,
      primaryUrl: sources[0]?.url || '',
      fallbackUrls: sources.slice(1).map(source => source.url),
      duration: sources[0]?.duration,
      isExternalPlatform: false
    };
  }

  // Validate audio URL is accessible
  async validateAudioUrl(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { 
        method: 'HEAD',
        mode: 'cors',
        cache: 'no-cache'
      });
      return response.ok;
    } catch (error) {
      console.warn('Audio URL validation failed:', url, error);
      return false;
    }
  }
}

export const audioService = new AudioService();