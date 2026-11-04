/**
 * Social configuration for Oriri.
 *
 * The live values are stored in the KV blob `social_config` and edited from the
 * admin dashboard. DEFAULT_SOCIAL_CONFIG below is both the seed for that blob and
 * the offline fallback, so no social surface ever renders empty if the Edge
 * Function is unreachable.
 */

import {
  Instagram,
  Youtube,
  Music2,
  Podcast,
  Mail,
  MessageCircle,
  Globe,
  type LucideIcon,
} from 'lucide-react';

export type SocialPlatformKey =
  | 'instagram'
  | 'tiktok'
  | 'youtube'
  | 'spotify'
  | 'applePodcasts'
  | 'email'
  | 'whatsapp'
  | 'website';

export interface SocialProfile {
  platform: SocialPlatformKey;
  handle: string;
  url: string;
  followerCount?: number;
  isVisible: boolean;
}

export interface BioLink {
  id: string;
  title: string;
  subtitle?: string;
  /** External destination. Mutually exclusive with internalPath. */
  url?: string;
  /** In-app route, e.g. "/nourish". Keeps the visitor on oriri.me. */
  internalPath?: string;
  emoji?: string;
  isFeatured: boolean;
  isVisible: boolean;
  order: number;
}

export interface ShowcasePost {
  id: string;
  platform: 'instagram' | 'tiktok' | 'youtube';
  postUrl: string;
  caption?: string;
  thumbnailUrl?: string;
  order: number;
}

export interface SocialConfig {
  profiles: SocialProfile[];
  links: BioLink[];
  showcase: ShowcasePost[];
  updatedAt: string;
}

export interface PlatformMeta {
  label: string;
  icon: LucideIcon;
  /** Brand colour, used for accents only — surfaces stay on the app palette. */
  color: string;
}

export const PLATFORM_META: Record<SocialPlatformKey, PlatformMeta> = {
  instagram: { label: 'Instagram', icon: Instagram, color: '#E1306C' },
  tiktok: { label: 'TikTok', icon: Music2, color: '#00F2EA' },
  youtube: { label: 'YouTube', icon: Youtube, color: '#FF0000' },
  spotify: { label: 'Spotify', icon: Podcast, color: '#1DB954' },
  applePodcasts: { label: 'Apple Podcasts', icon: Podcast, color: '#9933CC' },
  email: { label: 'Email', icon: Mail, color: '#8A8680' },
  whatsapp: { label: 'WhatsApp', icon: MessageCircle, color: '#25D366' },
  website: { label: 'Website', icon: Globe, color: '#7A8C6E' },
};

export const DEFAULT_SOCIAL_CONFIG: SocialConfig = {
  profiles: [
    {
      platform: 'instagram',
      handle: '@ren_reset',
      url: 'https://www.instagram.com/ren_reset/',
      isVisible: true,
    },
    {
      platform: 'tiktok',
      handle: '@rennnboww',
      url: 'https://www.tiktok.com/@rennnboww',
      isVisible: true,
    },
    {
      platform: 'youtube',
      handle: '@Renreset',
      url: 'https://www.youtube.com/@Renreset',
      isVisible: true,
    },
    // Show URLs are filled in by the server from the SPOTIFY_SHOW_ID /
    // APPLE_PODCASTS_SHOW_ID secrets — they aren't hardcoded here because the
    // ids only exist server-side. Hidden until a URL is resolved.
    { platform: 'spotify', handle: 'Tea for Two', url: '', isVisible: true },
    { platform: 'applePodcasts', handle: 'Tea for Two', url: '', isVisible: true },
  ],

  links: [
    {
      id: 'latest-episode',
      title: 'Listen to the latest episode',
      subtitle: 'Tea for Two — new every week',
      internalPath: '/episodes',
      emoji: '🎧',
      isFeatured: true,
      isVisible: true,
      order: 0,
    },
    {
      id: 'nourish',
      title: 'Nourish by Oriri',
      subtitle: 'Free weekly meal planner for your wellness goal',
      internalPath: '/nourish',
      emoji: '🌿',
      isFeatured: false,
      isVisible: true,
      order: 1,
    },
    {
      id: 'community',
      title: 'Join the community',
      subtitle: 'Conversations with other listeners',
      internalPath: '/community',
      emoji: '💬',
      isFeatured: false,
      isVisible: true,
      order: 2,
    },
    {
      id: 'store',
      title: 'Oriri Store',
      subtitle: 'Merch made with care',
      internalPath: '/store',
      emoji: '🛍️',
      isFeatured: false,
      isVisible: true,
      order: 3,
    },
    {
      id: 'instagram',
      title: 'Follow on Instagram',
      subtitle: '@ren_reset',
      url: 'https://www.instagram.com/ren_reset/',
      emoji: '📷',
      isFeatured: false,
      isVisible: true,
      order: 4,
    },
    {
      id: 'tiktok',
      title: 'Follow on TikTok',
      subtitle: '@rennnboww',
      url: 'https://www.tiktok.com/@rennnboww',
      emoji: '🎬',
      isFeatured: false,
      isVisible: true,
      order: 5,
    },
    {
      id: 'youtube',
      title: 'Watch on YouTube',
      subtitle: '@Renreset',
      url: 'https://www.youtube.com/@Renreset',
      emoji: '▶️',
      isFeatured: false,
      isVisible: true,
      order: 6,
    },
  ],

  showcase: [],
  updatedAt: '',
};

/** Sorted, visible-only links for public rendering. */
export function visibleLinks(config: SocialConfig): BioLink[] {
  return config.links
    .filter((link) => link.isVisible)
    .sort((a, b) => a.order - b.order);
}

/** Visible profiles that actually have a destination. */
export function visibleProfiles(config: SocialConfig): SocialProfile[] {
  return config.profiles.filter((p) => p.isVisible && !!p.url);
}

/** Compact follower display, e.g. 12400 → "12.4k". */
export function formatFollowers(count?: number): string | null {
  if (!count || count < 1) return null;
  if (count < 1000) return String(count);
  if (count < 1_000_000) return `${(count / 1000).toFixed(count < 10_000 ? 1 : 0)}k`;
  return `${(count / 1_000_000).toFixed(1)}m`;
}

/** Extract a TikTok video id from a post URL, for the embed player. */
export function getTikTokVideoId(url: string): string | null {
  const match = url?.match(/\/video\/(\d+)/);
  return match ? match[1] : null;
}
