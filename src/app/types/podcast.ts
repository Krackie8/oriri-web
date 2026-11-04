// Core podcast episode interface
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

// Platform statistics interface
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

// Sync result interface for orchestrator
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