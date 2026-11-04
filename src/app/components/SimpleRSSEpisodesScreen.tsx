import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Calendar, Clock, Search, Music, Video, Eye, Heart, Crown, Lock } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { PullToRefresh } from './ui/pull-to-refresh';
import { spotifyRSSService } from '../utils/spotifyRSSService';
import { safeYouTubeAPIService } from '../utils/youtubeAPIServiceSafe';
import { useEpisodeMetrics, formatCount } from '../hooks/useEpisodeMetrics';
import { VipGateComponent } from './vip/VipGateComponent';
import { useVipSubscription } from '../contexts/VipSubscriptionContext';
import { EpisodeGridSkeleton } from './skeletons/EpisodeSkeleton';
import { EmptyState } from './ui/empty-state';
import { ErrorState } from './ui/error-state';
import exampleImage from 'figma:asset/3f2af40ac3a53446bdfcc8a08e8c07325bdbbc05.png';

// Simple episode interface
interface Episode {
  id: string;
  title: string;
  description: string;
  audioUrl: string;
  imageUrl: string;
  duration: number;
  publishedDate: string;
  episodeNumber?: string;
  platform: 'spotify' | 'youtube' | 'exclusive';
  views?: number;
  likes?: number;
  comments?: number;
  isExclusive?: boolean;
  requiredTier?: string[];
}

// Fetch Spotify episodes using the service (SERVER-SIDE for CORS bypass)
async function fetchSpotifyRSS(): Promise<Episode[]> {
  try {
    console.log('[Episodes] Fetching Spotify episodes from server...');
    
    // Import project info
    const { projectId, publicAnonKey } = await import('../utils/supabase/info');
    
    const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32`;
    const fullUrl = `${baseUrl}/spotify/episodes`;
    
    console.log('[Episodes] Fetching from URL:', fullUrl);
    
    const response = await fetch(fullUrl, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`
      }
    });
    
    console.log('[Episodes] Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('[Episodes] Server response:', data);
      
      if (data.success && data.episodes && data.episodes.length > 0) {
        console.log(`[Episodes] Successfully loaded ${data.episodes.length} Spotify episodes from server`);
        return data.episodes;
      } else {
        console.log('[Episodes] No episodes in server response');
        return [];
      }
    } else {
      const errorText = await response.text();
      console.error(`[Episodes] Failed to fetch from server: ${response.status}`, errorText);
      return [];
    }
    
  } catch (error) {
    console.error('[Episodes] Failed to fetch Spotify episodes from server:', error);
    return [];
  }
}

// Fetch YouTube episodes using API service (SIMPLIFIED - API only)
async function fetchYouTubeAPI(): Promise<Episode[]> {
  try {
    console.log('[Episodes] Fetching YouTube API via backend...');
    const result = await safeYouTubeAPIService.fetchEpisodes();
    
    if (result.success && result.episodes.length > 0) {
      return result.episodes.map((episode, index) => ({
        id: episode.id,
        title: episode.title,
        description: episode.description,
        audioUrl: episode.audioUrl,
        imageUrl: episode.imageUrl || 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=400&fit=crop',
        duration: episode.duration,
        publishedDate: episode.publishedDate,
        episodeNumber: `#${result.episodes.length - index}`,
        platform: 'youtube',
        views: episode.views,
        likes: episode.likes,
        comments: episode.comments
      }));
    }
    
    console.log(`[Episodes] Parsed ${result.episodes.length} YouTube API episodes`);
    return [];
    
  } catch (error) {
    console.error('[Episodes] Failed to fetch YouTube API:', error);
    return [];
  }
}

// Helper functions
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
}

function formatViews(views: number): string {
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M views`;
  } else if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}K views`;
  }
  return `${views} views`;
}

// Fetch ALL episodes from admin dashboard (simplified - no VIP filtering)
async function fetchExclusiveEpisodes(): Promise<Episode[]> {
  try {
    console.log('[Episodes] Fetching ALL episodes from admin dashboard...', new Date().toISOString());
    
    // Import project info
    const { projectId, publicAnonKey } = await import('../utils/supabase/info');
    console.log('[Episodes] Using projectId:', projectId);
    
    const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32`;
    const fullUrl = `${baseUrl}/episodes`;
    console.log('[Episodes] Fetching from URL:', fullUrl);
    
    // Simple fetch to get all episodes from admin dashboard
    const response = await fetch(fullUrl, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`
      }
    });
    
    console.log('[Episodes] Response status:', response.status);
    console.log('[Episodes] Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log('[Episodes] Raw response data:', data);
      
      if (Array.isArray(data) && data.length > 0) {
        // Show ALL published episodes (no VIP filtering)
        const publishedEpisodes = data.filter((episode: any) => episode.status === 'published');
        console.log('[Episodes] All episodes:', data.map(ep => ({ id: ep.id, title: ep.title, status: ep.status })));
        console.log('[Episodes] Published episodes:', publishedEpisodes.map(ep => ({ id: ep.id, title: ep.title, status: ep.status })));
        console.log(`[Episodes] Successfully loaded ${publishedEpisodes.length} admin episodes (${data.length} total, ${publishedEpisodes.length} published)`);
        return transformAdminEpisodes(publishedEpisodes);
      } else {
        console.log('[Episodes] No episodes in response or response is not an array:', data);
      }
    } else {
      const errorText = await response.text();
      console.error(`[Episodes] Failed to fetch admin episodes: ${response.status} ${response.statusText}`);
      console.error('[Episodes] Error response body:', errorText);
    }
    
    console.log('[Episodes] No admin episodes available');
    return [];
    
  } catch (error) {
    console.error('[Episodes] Failed to fetch admin episodes:', error);
    console.error('[Episodes] Error stack:', error.stack);
    return [];
  }
}

// Helper function to transform admin episodes to our Episode format
function transformAdminEpisodes(adminEpisodes: any[]): Episode[] {
  return adminEpisodes.map((adminEpisode: any, index: number) => {
    // Parse duration string (e.g., "45:30" or "1:23:45") to seconds
    let durationInSeconds = 0;
    if (adminEpisode.duration) {
      const parts = adminEpisode.duration.split(':').map(Number);
      if (parts.length === 2) {
        durationInSeconds = parts[0] * 60 + parts[1]; // MM:SS
      } else if (parts.length === 3) {
        durationInSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2]; // HH:MM:SS
      } else {
        durationInSeconds = adminEpisode.durationSeconds || 0;
      }
    }
    
    return {
      id: adminEpisode.id,
      title: adminEpisode.title,
      description: adminEpisode.description || adminEpisode.fullDescription || 'Exclusive content available to VIP members.',
      audioUrl: adminEpisode.audioUrl || adminEpisode.videoUrl || '#',
      imageUrl: adminEpisode.image || exampleImage,
      duration: durationInSeconds,
      publishedDate: adminEpisode.publishedDate || adminEpisode.createdAt,
      episodeNumber: `VIP #${index + 1}`,
      platform: 'exclusive' as const,
      isExclusive: true,
      requiredTier: adminEpisode.vipTier ? [adminEpisode.vipTier] : ['vip'], // Use admin-specified tier or default to 'vip'
      views: adminEpisode.views || 0,
      likes: adminEpisode.likes || 0,
      comments: adminEpisode.comments || 0
    };
  });
}

// Episode Card component with hybrid metrics system and VIP gating
function EpisodeCardWithRealMetrics({
  episode,
  onClick,
  variant = 'grid',
  rank
}: {
  episode: Episode;
  onClick: () => void;
  variant?: 'grid' | 'featured' | 'row';
  rank?: number;
}) {
  const { hasAccess } = useVipSubscription();
  
  // HYBRID METRICS SYSTEM:
  // - YouTube episodes: Use real YouTube API metrics (authentic YouTube data)
  // - Spotify episodes: Use internal tracking metrics (no metrics available from RSS)
  // - Exclusive episodes: Use provided mock metrics
  const { viewCount: internalViewCount, likeCount: internalLikeCount } = useEpisodeMetrics(episode.id);

  // Choose metrics source based on platform
  const viewCount = (episode.platform === 'youtube' || episode.platform === 'exclusive') && episode.views !== undefined 
    ? episode.views 
    : internalViewCount;
    
  const likeCount = (episode.platform === 'youtube' || episode.platform === 'exclusive') && episode.likes !== undefined 
    ? episode.likes 
    : internalLikeCount;

  // Check if user has access to this exclusive content
  const canAccess = !episode.isExclusive || (episode.requiredTier && hasAccess(episode.requiredTier));
  
  const handleClick = () => {
    if (episode.isExclusive && !canAccess) {
      // Don't navigate for exclusive content without access - VipGateComponent will handle this
      return;
    }
    onClick();
  };

  const locked = !!episode.isExclusive && !canAccess;
  const fallbackImage = 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400&h=400&fit=crop';
  const PlatformIcon = episode.platform === 'spotify' ? Music : episode.platform === 'youtube' ? Video : Crown;

  // Featured: compact poster card for the Top 5 carousel
  const featuredContent = (
    <button
      type="button"
      onClick={handleClick}
      className={`group w-60 shrink-0 snap-start text-left ${locked ? 'opacity-80' : ''}`}
    >
      <div className="relative aspect-video overflow-hidden rounded-xl border border-border">
        <img
          src={episode.imageUrl}
          alt={episode.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => { (e.target as HTMLImageElement).src = fallbackImage; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
        {rank !== undefined && (
          <span className="absolute bottom-1 left-3 text-5xl font-black leading-none text-white/90 drop-shadow">
            {rank}
          </span>
        )}
        <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px] text-white backdrop-blur-sm">
          {locked ? <Lock className="h-3 w-3" /> : <PlatformIcon className="h-3 w-3" />}
          {formatDuration(episode.duration)}
        </span>
        <span className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-white opacity-0 transition-opacity group-hover:opacity-100">
          {locked ? <Lock className="h-4 w-4 text-black" /> : <Play className="ml-0.5 h-4 w-4 fill-black text-black" />}
        </span>
      </div>
      <h3 className="mt-2 line-clamp-2 text-sm font-medium leading-snug">{episode.title}</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(episode.publishedDate)}</p>
    </button>
  );

  // Row: small thumbnail + title list item
  const rowContent = (
    <button
      type="button"
      onClick={handleClick}
      className={`group flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-accent/40 ${locked ? 'opacity-80' : ''}`}
    >
      <img
        src={episode.imageUrl}
        alt=""
        className="h-12 w-12 shrink-0 rounded-lg object-cover"
        onError={(e) => { (e.target as HTMLImageElement).src = fallbackImage; }}
      />
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-medium">{episode.title}</h3>
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <PlatformIcon className="h-3 w-3 shrink-0" />
          <span>{formatDate(episode.publishedDate)}</span>
          <span>·</span>
          <span>{formatDuration(episode.duration)}</span>
        </div>
      </div>
      {episode.isExclusive && !locked && <Crown className="h-4 w-4 shrink-0 text-purple-500" />}
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border transition-colors group-hover:bg-foreground group-hover:text-background">
        {locked ? <Lock className="h-3.5 w-3.5" /> : <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />}
      </span>
    </button>
  );

  const cardContent = variant === 'featured' ? featuredContent : variant === 'row' ? rowContent : (
    <Card
      className={`cursor-pointer hover:bg-accent/50 transition-colors group ${episode.isExclusive && !canAccess ? 'opacity-80' : ''}`}
      onClick={handleClick}
    >
      <CardContent className="p-0">
        {/* Episode Image - Substack Style */}
        <div className="relative aspect-square">
          <img
            src={episode.imageUrl}
            alt={episode.title}
            className="w-full h-full object-cover rounded-t-lg"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              img.src = 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400&h=400&fit=crop';
            }}
          />
          
          {/* Episode Number Overlay */}
          {episode.episodeNumber && (
            <div className="absolute top-3 left-3 bg-black/70 text-white px-2 py-1 rounded text-sm font-medium">
              {episode.episodeNumber}
            </div>
          )}
          
          {/* Platform Indicator */}
          <div className="absolute top-3 right-3 bg-black/70 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
            {episode.platform === 'spotify' ? <Music className="w-3 h-3" /> : 
             episode.platform === 'youtube' ? <Video className="w-3 h-3" /> :
             <Crown className="w-3 h-3" />}
            {episode.platform === 'exclusive' ? 'VIP' : episode.platform.charAt(0).toUpperCase() + episode.platform.slice(1)}
          </div>
          
          {/* Exclusive Lock Indicator */}
          {episode.isExclusive && !canAccess && (
            <div className="absolute top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
              <Lock className="w-3 h-3" />
              VIP Only
            </div>
          )}
          
          {/* Play Button Overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-lg">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
              {episode.isExclusive && !canAccess ? (
                <Lock className="w-6 h-6 text-black" />
              ) : (
                <Play className="w-6 h-6 text-black fill-black ml-1" />
              )}
            </div>
          </div>
        </div>
        
        {/* Episode Info */}
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold line-clamp-2 flex-1">{episode.title}</h3>
            {episode.isExclusive && (
              <Crown className="w-4 h-4 text-purple-500 ml-2 flex-shrink-0" />
            )}
          </div>
          
          <p className="text-muted-foreground text-sm line-clamp-3 mb-3">
            {episode.description}
          </p>
          
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(episode.publishedDate)}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDuration(episode.duration)}
            </div>
          </div>
          
          {/* Hybrid Episode Metrics - YouTube API data for YouTube, Internal tracking for Spotify */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              <span>{formatCount(viewCount)} views</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="w-3 h-3" />
              <span>{formatCount(likeCount)} likes</span>
            </div>
            {/* Show comments count for YouTube and exclusive episodes */}
            {(episode.platform === 'youtube' || episode.platform === 'exclusive') && episode.comments !== undefined && (
              <div className="flex items-center gap-1">
                <span>{formatCount(episode.comments)} comments</span>
              </div>
            )}
          </div>
          
          {/* VIP Access Indicator */}
          {episode.isExclusive && !canAccess && (
            <div className="mt-3 text-xs text-purple-400 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              <span>VIP membership required</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // Wrap with VIP gate for exclusive content without access
  if (episode.isExclusive && !canAccess && episode.requiredTier) {
    return (
      <VipGateComponent
        requiredTier={episode.requiredTier}
        contentType="episode"
        title="Be Oriri Member to View Exclusive Contents"
        description="Subscribe for AED 20/month to unlock all exclusive Oriri content and premium features."
        variant="overlay"
        showPreview={true}
      >
        {cardContent}
      </VipGateComponent>
    );
  }

  return cardContent;
}

export function SimpleRSSEpisodesScreen() {
  const navigate = useNavigate();
  const [spotifyEpisodes, setSpotifyEpisodes] = useState<Episode[]>([]);
  const [youtubeEpisodes, setYoutubeEpisodes] = useState<Episode[]>([]);
  const [exclusiveEpisodes, setExclusiveEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('spotify');
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(20);

  useEffect(() => {
    loadEpisodes();
  }, []);

  useEffect(() => {
    setVisibleCount(20);
  }, [activeTab, searchQuery]);

  const loadEpisodes = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('[Episodes] Loading episodes from all platforms...');
      
      // Spotify always uses RSS (PROTECTED - never changes)
      const spotifyPromise = fetchSpotifyRSS();
      
      // YouTube always uses API (simplified)
      const youtubePromise = fetchYouTubeAPI();
      
      // Load exclusive episodes from admin dashboard
      const exclusivePromise = fetchExclusiveEpisodes();
      
      // Load all platforms concurrently
      const [spotifyData, youtubeData, exclusiveData] = await Promise.all([
        spotifyPromise,
        youtubePromise,
        exclusivePromise
      ]);
      
      setSpotifyEpisodes(spotifyData);
      setYoutubeEpisodes(youtubeData);
      setExclusiveEpisodes(exclusiveData);
      
      console.log(`[Episodes] Loaded ${spotifyData.length} Spotify episodes, ${youtubeData.length} YouTube episodes, and ${exclusiveData.length} exclusive episodes`);
    } catch (error) {
      console.error('[Episodes] Error loading episodes:', error);
      // Set empty arrays as fallback
      setSpotifyEpisodes([]);
      setYoutubeEpisodes([]);
      setExclusiveEpisodes([]);
      setError('Failed to load episodes. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Get current episodes based on active tab
  const currentEpisodes = activeTab === 'spotify' ? spotifyEpisodes : 
                         activeTab === 'youtube' ? youtubeEpisodes : 
                         exclusiveEpisodes;
  
  const filteredEpisodes = currentEpisodes.filter(episode =>
    episode.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    episode.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Newest first; Top 5 featured, the rest as a compact list
  const sortedEpisodes = [...filteredEpisodes].sort(
    (a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()
  );
  const isSearching = searchQuery.trim().length > 0;
  const topEpisodes = isSearching ? [] : sortedEpisodes.slice(0, 5);
  const restEpisodes = isSearching ? sortedEpisodes : sortedEpisodes.slice(5);
  const visibleRest = restEpisodes.slice(0, visibleCount);

  const handleEpisodeClick = (episode: Episode) => {
    // Navigate to episode detail page
    navigate(`/episode/${episode.id}`, { state: { episode } });
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col bg-background">
        {/* Show header immediately even while loading */}
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-semibold">Episodes</h1>
              <p className="text-sm text-muted-foreground">Loading episodes...</p>
            </div>
            <Button variant="outline" size="sm" disabled>
              Refresh
            </Button>
          </div>

          {/* Platform Tabs - Show structure even while loading */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="spotify" className="flex items-center gap-2">
                <Music className="w-4 h-4" />
                Spotify
              </TabsTrigger>
              <TabsTrigger value="youtube" className="flex items-center gap-2">
                <Video className="w-4 h-4" />
                YouTube
              </TabsTrigger>
              <TabsTrigger value="exclusive" className="flex items-center gap-2">
                <Crown className="w-4 h-4" />
                Exclusive
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Search - Show but disabled while loading */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Loading episodes..."
              value=""
              readOnly
              disabled
              className="pl-10"
            />
          </div>
        </div>

        {/* Skeleton Grid - Shows content structure while loading */}
        <div className="flex-1 overflow-y-auto">
          <EpisodeGridSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col bg-background">
        {/* Show header immediately even while loading */}
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-semibold">Episodes</h1>
              <p className="text-sm text-muted-foreground">Loading episodes...</p>
            </div>
            <Button variant="outline" size="sm" disabled>
              Refresh
            </Button>
          </div>

          {/* Platform Tabs - Show structure even while loading */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="spotify" className="flex items-center gap-2">
                <Music className="w-4 h-4" />
                Spotify
              </TabsTrigger>
              <TabsTrigger value="youtube" className="flex items-center gap-2">
                <Video className="w-4 h-4" />
                YouTube
              </TabsTrigger>
              <TabsTrigger value="exclusive" className="flex items-center gap-2">
                <Crown className="w-4 h-4" />
                Exclusive
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Search - Show but disabled while loading */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Loading episodes..."
              value=""
              readOnly
              disabled
              className="pl-10"
            />
          </div>
        </div>

        {/* Error State - Shows error message */}
        <div className="flex-1 overflow-y-auto">
          <ErrorState
            type="API_ERROR"
            customMessage={error}
            onRetry={loadEpisodes}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold">Episodes</h1>
            <p className="text-sm text-muted-foreground">
              {spotifyEpisodes.length + youtubeEpisodes.length + exclusiveEpisodes.length} episodes from all platforms
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={loadEpisodes}>
            Refresh
          </Button>
        </div>

        {/* Platform Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="spotify" className="flex items-center gap-2">
              <Music className="w-4 h-4" />
              Spotify ({spotifyEpisodes.length})
            </TabsTrigger>
            <TabsTrigger value="youtube" className="flex items-center gap-2">
              <Video className="w-4 h-4" />
              YouTube ({youtubeEpisodes.length})
            </TabsTrigger>
            <TabsTrigger value="exclusive" className="flex items-center gap-2">
              <Crown className="w-4 h-4" />
              Exclusive ({exclusiveEpisodes.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder={`Search ${activeTab} episodes...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Episodes Grid - Substack Style with Pull-to-Refresh */}
      <PullToRefresh 
        onRefresh={loadEpisodes}
        disabled={loading}
        className="flex-1"
      >
        <div className="p-4">
          {filteredEpisodes.length === 0 ? (
            searchQuery ? (
              <EmptyState
                title="No Results Found"
                message={`No episodes found for "${searchQuery}". Try different keywords or browse another platform.`}
                action="Clear Search"
                onAction={() => setSearchQuery('')}
                secondaryAction="Browse All"
                onSecondaryAction={() => navigate('/episodes')}
                compact={false}
              />
            ) : currentEpisodes.length === 0 ? (
              <EmptyState
                title={`No ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Episodes`}
                message={
                  activeTab === 'spotify' ? "Spotify episodes will appear here once they're available." :
                  activeTab === 'youtube' ? "YouTube episodes will appear here once they're available." :
                  "Exclusive VIP content will appear here once it's published."
                }
                action="Refresh"
                onAction={loadEpisodes}
                secondaryAction={
                  activeTab === 'exclusive' ? "Browse Public Episodes" : 
                  activeTab === 'spotify' ? "Try YouTube" : 
                  "Try Spotify"
                }
                onSecondaryAction={() => {
                  if (activeTab === 'exclusive') {
                    setActiveTab('spotify');
                  } else if (activeTab === 'spotify') {
                    setActiveTab('youtube');
                  } else {
                    setActiveTab('spotify');
                  }
                }}
                compact={false}
              />
            ) : null
          ) : (
            <div className="space-y-8">
              {topEpisodes.length > 0 && (
                <section>
                  <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Top 5 · Latest
                  </h2>
                  <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
                    {topEpisodes.map((episode, i) => (
                      <EpisodeCardWithRealMetrics
                        key={episode.id}
                        episode={episode}
                        variant="featured"
                        rank={i + 1}
                        onClick={() => handleEpisodeClick(episode)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {restEpisodes.length > 0 && (
                <section>
                  <h2 className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {isSearching ? `${restEpisodes.length} results` : 'All episodes'}
                  </h2>
                  <div className="divide-y divide-border">
                    {visibleRest.map((episode) => (
                      <EpisodeCardWithRealMetrics
                        key={episode.id}
                        episode={episode}
                        variant="row"
                        onClick={() => handleEpisodeClick(episode)}
                      />
                    ))}
                  </div>
                  {restEpisodes.length > visibleCount && (
                    <Button
                      variant="ghost"
                      className="mt-3 w-full"
                      onClick={() => setVisibleCount((c) => c + 20)}
                    >
                      Show more ({restEpisodes.length - visibleCount})
                    </Button>
                  )}
                </section>
              )}
            </div>
          )}
        </div>
      </PullToRefresh>
    </div>
  );
}

export default SimpleRSSEpisodesScreen;