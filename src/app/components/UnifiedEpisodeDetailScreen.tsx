import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Play, Pause, Volume2, ExternalLink, Heart, MessageCircle, Share2, Eye, MoreHorizontal, SkipBack, SkipForward, Crown, Lock, Bookmark } from 'lucide-react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { ShareModal } from './interactions/ShareModal';
import { CommentsModal } from './interactions/CommentsModal';
import { AuthModal } from './AuthModal';
import EpisodeCommentsSection from './comments/EpisodeCommentsSection';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { spotifyRSSService } from '../utils/spotifyRSSService';
import { getYouTubeVideoId } from '../utils/episodePlayback';
import { safeYouTubeAPIService } from '../utils/youtubeAPIServiceSafe';
import { useAuth } from '../hooks/useAuth';
import { useSavedEpisodes } from '../hooks/useSavedEpisodes';
import { supabase } from '../utils/supabase/client';
import { useEpisodeAnalytics } from '../contexts/EpisodeAnalyticsContext';

// Episode format from our episodes screen
interface SimpleEpisode {
  id: string;
  title: string;
  description: string;
  audioUrl: string;
  imageUrl: string;
  duration: number;
  publishedDate: string;
  episodeNumber?: string;
  platform: 'spotify' | 'youtube';
  views?: number;
  likes?: number;
  comments?: number;
}

// Real auth hook - now properly integrated!

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatViews(views?: number): string {
  if (!views) return '';
  
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M views`;
  } else if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}K views`;
  }
  return `${views} views`;
}

function formatCount(count?: number): string {
  if (!count) return '0';
  
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

export default function UnifiedEpisodeDetailScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id: episodeId } = useParams<{ id: string }>();
  const { user, isLoggedIn } = useAuth();
  const isAuthenticated = isLoggedIn;
  const { savedIds, toggleSaved } = useSavedEpisodes();

  // ✅ PHASE 2: Analytics Integration
  const { trackPlay, trackEngagement, trackCompletion } = useEpisodeAnalytics();
  
  // Get episode from router state OR fetch by ID if not available
  const [episode, setEpisode] = useState<SimpleEpisode | null>(
    location.state?.episode || null
  );
  const [isLoadingEpisode, setIsLoadingEpisode] = useState(!location.state?.episode);
  
  // Audio player state (for Spotify)
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // ✅ PHASE 2: Track if play has been tracked (to avoid duplicate tracking)
  const [hasTrackedPlay, setHasTrackedPlay] = useState(false);
  
  // YouTube player state
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  
  // Interaction state with HYBRID METRICS SYSTEM
  const [isLiked, setIsLiked] = useState(false);
  
  // HYBRID METRICS: Use YouTube API data for YouTube episodes, internal tracking for Spotify
  const [internalLikeCount, setInternalLikeCount] = useState(0);  // Internal tracking
  const [internalViewCount, setInternalViewCount] = useState(0);  // Internal tracking
  
  // Exclusive content state
  const [exclusiveEpisodes, setExclusiveEpisodes] = useState([]);
  const [exclusiveLoading, setExclusiveLoading] = useState(true);
  const [isVipUser, setIsVipUser] = useState(false);
  const [activeTab, setActiveTab] = useState('discussion'); // 'discussion' or 'exclusive'
  
  // Choose metrics source based on platform
  const likeCount = episode?.platform === 'youtube' && episode?.likes !== undefined 
    ? episode.likes 
    : internalLikeCount;
    
  const viewCount = episode?.platform === 'youtube' && episode?.views !== undefined 
    ? episode.views 
    : internalViewCount;
  
  const [commentCount, setCommentCount] = useState(episode?.comments || 0);
  const [shareCount, setShareCount] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalAction, setAuthModalAction] = useState<'like' | 'comment' | 'general'>('general');
  
  // Recommended episodes state
  const [recommendedEpisodes, setRecommendedEpisodes] = useState<SimpleEpisode[]>([]);
  
  // Comments refresh trigger
  const [commentsRefreshTrigger, setCommentsRefreshTrigger] = useState(0);

  // Fetch episode by ID if not in state (e.g., page refresh or direct navigation)
  useEffect(() => {
    const fetchEpisodeById = async () => {
      if (episode || !episodeId) return;
      
      console.log('[Episode Detail] Fetching episode by ID:', episodeId);
      setIsLoadingEpisode(true);
      
      try {
        // Try to find episode in Spotify, YouTube, or managed episodes
        const [spotifyResult, youtubeResult] = await Promise.all([
          spotifyRSSService.fetchEpisodes().catch(() => ({ success: false, episodes: [] })),
          safeYouTubeAPIService.fetchEpisodes().catch(() => ({ success: false, episodes: [] }))
        ]);
        
        // Check Spotify episodes
        if (spotifyResult.success) {
          const spotifyEpisode = spotifyResult.episodes.find((ep: any) => ep.id === episodeId);
          if (spotifyEpisode) {
            console.log('[Episode Detail] Found episode in Spotify');
            setEpisode({
              id: spotifyEpisode.id,
              title: spotifyEpisode.title,
              description: spotifyEpisode.description,
              audioUrl: spotifyEpisode.audioUrl,
              imageUrl: spotifyEpisode.imageUrl || 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400&h=400&fit=crop',
              duration: spotifyEpisode.duration,
              publishedDate: spotifyEpisode.publishedDate,
              platform: 'spotify',
              views: spotifyEpisode.views,
              likes: spotifyEpisode.likes,
              comments: spotifyEpisode.comments
            });
            setIsLoadingEpisode(false);
            return;
          }
        }
        
        // Check YouTube episodes
        if (youtubeResult.success) {
          const youtubeEpisode = youtubeResult.episodes.find((ep: any) => ep.id === episodeId);
          if (youtubeEpisode) {
            console.log('[Episode Detail] Found episode in YouTube');
            setEpisode({
              id: youtubeEpisode.id,
              title: youtubeEpisode.title,
              description: youtubeEpisode.description,
              audioUrl: youtubeEpisode.audioUrl,
              imageUrl: youtubeEpisode.imageUrl || 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=400&fit=crop',
              duration: youtubeEpisode.duration,
              publishedDate: youtubeEpisode.publishedDate,
              platform: 'youtube',
              views: youtubeEpisode.views,
              likes: youtubeEpisode.likes,
              comments: youtubeEpisode.comments
            });
            setIsLoadingEpisode(false);
            return;
          }
        }
        
        // If not found in Spotify or YouTube, try managed episodes
        const managedResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/episodes/${episodeId}`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`
            }
          }
        );
        
        if (managedResponse.ok) {
          const data = await managedResponse.json();
          console.log('[Episode Detail] Found episode in managed episodes');
          setEpisode(data.episode);
        } else {
          console.error('[Episode Detail] Episode not found');
        }
      } catch (error) {
        console.error('[Episode Detail] Error fetching episode:', error);
      } finally {
        setIsLoadingEpisode(false);
      }
    };
    
    fetchEpisodeById();
  }, [episodeId, episode]);

  // Calculate engagement score for episode recommendations
  const calculateEngagementScore = (ep: SimpleEpisode): number => {
    const views = ep.platform === 'youtube' && ep.views !== undefined ? ep.views : 0;
    const likes = ep.platform === 'youtube' && ep.likes !== undefined ? ep.likes : 0;
    const comments = ep.platform === 'youtube' && ep.comments !== undefined ? ep.comments : 0;
    
    // Engagement score formula: weighted combination of metrics
    const score = (views * 0.1) + (likes * 2) + (comments * 5);
    
    // Boost recent episodes (within last 30 days)
    const daysSincePublished = Math.abs(new Date().getTime() - new Date(ep.publishedDate).getTime()) / (1000 * 3600 * 24);
    const recencyBoost = daysSincePublished <= 30 ? 1.5 : 1;
    
    return score * recencyBoost;
  };

  // Fetch and calculate recommended episodes using the same services as episodes screen
  const fetchRecommendedEpisodes = async () => {
    try {
      console.log('[Recommendations] Fetching episodes for recommendations...');
      
      // Fetch from both platforms like the main episodes screen
      const [spotifyResult, youtubeResult] = await Promise.all([
        spotifyRSSService.fetchEpisodes().catch(() => ({ success: false, episodes: [] })),
        safeYouTubeAPIService.fetchEpisodes().catch(() => ({ success: false, episodes: [] }))
      ]);

      // Format episodes to match our interface
      const allEpisodes: SimpleEpisode[] = [];

      // Add Spotify episodes
      if (spotifyResult.success && spotifyResult.episodes.length > 0) {
        const spotifyEpisodes = spotifyResult.episodes.map((ep, index) => ({
          id: ep.id,
          title: ep.title,
          description: ep.description,
          audioUrl: ep.audioUrl,
          imageUrl: ep.imageUrl || 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400&h=400&fit=crop',
          duration: ep.duration,
          publishedDate: ep.publishedDate,
          episodeNumber: `#${spotifyResult.episodes.length - index}`,
          platform: 'spotify' as const,
          views: ep.views,
          likes: ep.likes,
          comments: ep.comments
        }));
        allEpisodes.push(...spotifyEpisodes);
      }

      // Add YouTube episodes
      if (youtubeResult.success && youtubeResult.episodes.length > 0) {
        const youtubeEpisodes = youtubeResult.episodes.map((ep, index) => ({
          id: ep.id,
          title: ep.title,
          description: ep.description,
          audioUrl: ep.audioUrl,
          imageUrl: ep.imageUrl || 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=400&fit=crop',
          duration: ep.duration,
          publishedDate: ep.publishedDate,
          episodeNumber: `#${youtubeResult.episodes.length - index}`,
          platform: 'youtube' as const,
          views: ep.views,
          likes: ep.likes,
          comments: ep.comments
        }));
        allEpisodes.push(...youtubeEpisodes);
      }

      console.log(`[Recommendations] Found ${allEpisodes.length} total episodes`);
      
      // Filter out current episode and calculate engagement scores
      const otherEpisodes = allEpisodes
        .filter((ep: SimpleEpisode) => ep.id !== episode?.id)
        .map((ep: SimpleEpisode) => ({
          ...ep,
          engagementScore: calculateEngagementScore(ep)
        }))
        .sort((a: any, b: any) => b.engagementScore - a.engagementScore)
        .slice(0, 3); // Top 3 most engaged episodes
      
      console.log(`[Recommendations] Selected ${otherEpisodes.length} recommended episodes`);
      setRecommendedEpisodes(otherEpisodes);
    } catch (error) {
      console.error('[Recommendations] Error fetching recommended episodes:', error);
    }
  };

  // Initialize YouTube video ID and track episode view
  useEffect(() => {
    if (episode) {
      console.log('[Episode Detail] Initializing episode:', episode.id);
      
      if (episode.platform === 'youtube') {
        const videoId = getYouTubeVideoId(episode.audioUrl);
        setYoutubeVideoId(videoId);
      }
      
      // Track episode view
      trackEpisodeView();
      
      // Fetch recommended episodes
      console.log('[Episode Detail] Starting to fetch recommendations...');
      fetchRecommendedEpisodes();
    }
  }, [episode]);
  
  // Fetch exclusive content when user authentication changes
  useEffect(() => {
    fetchExclusiveContent();
  }, [isAuthenticated]);

  const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32`;
  
  // Fetch exclusive episodes for VIP users
  const fetchExclusiveContent = async () => {
    if (!isAuthenticated) {
      setExclusiveLoading(false);
      return;
    }
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      
      if (!accessToken) {
        setExclusiveLoading(false);
        return;
      }
      
      const response = await fetch(`${baseUrl}/episodes/exclusive`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setExclusiveEpisodes(data.data || []);
        setIsVipUser(data.isVip || false);
      } else if (response.status === 403) {
        // User is not VIP
        setIsVipUser(false);
        setExclusiveEpisodes([]);
      } else {
        console.error('Failed to fetch exclusive content:', response.status);
      }
    } catch (error) {
      console.error('Error fetching exclusive content:', error);
    } finally {
      setExclusiveLoading(false);
    }
  };

  const trackEpisodeView = async () => {
    try {
      const response = await fetch(`${baseUrl}/episode-view`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          episodeId: episode?.id,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        const result = await response.json();
        // Only update internal view count for non-YouTube episodes
        // YouTube episodes use real YouTube API metrics
        if (episode?.platform !== 'youtube' || episode?.views === undefined) {
          setInternalViewCount(result.totalViews);
        }
      }
    } catch (error) {
      console.error('Error tracking episode view:', error);
    }
  };

  if (!episode) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <h2 className="text-lg">Episode not found</h2>
          <p className="text-muted-foreground">The episode data could not be loaded.</p>
          <Button onClick={() => navigate('/episodes')}>
            Back to Episodes
          </Button>
        </div>
      </div>
    );
  }

  // Audio event handlers
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    // ✅ PHASE 2: Track completion with 100% completion rate
    if (episode && duration > 0) {
      const completionRate = 100; // Episode played to end
      trackCompletion(episode.id, completionRate);
    }
  };

  const togglePlayPause = () => {
    if (episode.platform === 'spotify' && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(error => {
          console.error('Error playing audio:', error);
        });
        // ✅ PHASE 2: Track play when starting playback
        if (!hasTrackedPlay && episode) {
          const deviceType = /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
          trackPlay(episode.id, currentTime, deviceType);
          setHasTrackedPlay(true);
        }
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100;
    }
  };

  const handleSkip = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, Math.min(duration, currentTime + seconds));
    }
  };

  const openInYouTube = () => {
    window.open(episode.audioUrl, '_blank');
  };

  const handleSave = () => {
    if (!isAuthenticated) {
      setAuthModalAction('general');
      setShowAuthModal(true);
      return;
    }
    if (!episode) return;
    const willSave = !savedIds.has(String(episode.id));
    void toggleSaved(episode);
    toast.success(willSave ? 'Saved to your library' : 'Removed from your library');
  };

  const handleLike = async () => {
    if (!isAuthenticated) {
      setAuthModalAction('like');
      setShowAuthModal(true);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      
      const response = await fetch(`${baseUrl}/episode-like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken || publicAnonKey}`
        },
        body: JSON.stringify({
          episodeId: episode.id
        })
      });

      if (response.ok) {
        const result = await response.json();
        setIsLiked(result.isLiked);
        
        // Only update internal like count for non-YouTube episodes
        // YouTube episodes display real YouTube API likes (read-only)
        if (episode.platform !== 'youtube' || episode.likes === undefined) {
          setInternalLikeCount(result.newCount);
        }
        
        // ✅ PHASE 2: Track engagement for like action
        if (result.isLiked) {
          trackEngagement(episode.id, 'like', currentTime);
        }
        
        toast.success(result.isLiked ? 'Added to favorites' : 'Removed from favorites');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to like episode');
      }
    } catch (error) {
      console.error('Error liking episode:', error);
      toast.error(`Failed to like episode: ${error.message}`);
    }
  };

  const handleComment = () => {
    if (!isAuthenticated) {
      setAuthModalAction('comment');
      setShowAuthModal(true);
      return;
    }
    
    setShowCommentsModal(true);
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const handleRecommendedEpisodeClick = (recommendedEpisode: SimpleEpisode) => {
    // Stop current audio if playing (Spotify)
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    
    // Navigate to the recommended episode using the correct route
    navigate(`/episode/${recommendedEpisode.id}`, { 
      state: { episode: recommendedEpisode },
      replace: true 
    });
  };

  const handleMetricsUpdate = (metrics: any) => {
    setCommentCount(metrics.totalComments);
    setShareCount(metrics.totalShares);
    
    // Only update internal metrics for non-YouTube episodes
    // YouTube episodes use real YouTube API data
    if (episode.platform !== 'youtube' || episode.likes === undefined) {
      setInternalLikeCount(metrics.totalLikes);
    }
    if (episode.platform !== 'youtube' || episode.views === undefined) {
      setInternalViewCount(metrics.totalViews);
    }
  };

  const handleCommentsModalAction = () => {
    // Trigger refresh of main comments section when modal is used
    setCommentsRefreshTrigger(prev => prev + 1);
  };

  const handleBack = () => {
    // Stop audio if playing (Spotify)
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    navigate('/episodes');
  };

  const episodeUrl = `${window.location.origin}/episode/${episode.id}`;

  return (
    <div className="w-full min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-sm text-center truncate mx-4">
            {episode.episodeNumber || `Episode ${episode.id}`}
          </h1>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 max-w-2xl mx-auto">
        {/* Episode Info */}
        <div className="text-center mb-6">
          <h1 className="text-xl mb-2">{episode.title}</h1>
          <p className="text-muted-foreground text-sm mb-3">
            {episode.description}
          </p>
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <span>{formatDuration(episode.duration)}</span>
            <span>{new Date(episode.publishedDate).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Unified Player Box */}
        <div className="bg-card/80 backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden mb-1.5">
          {episode.platform === 'spotify' ? (
            /* Spotify Audio Player with Visual Box */
            <div className="relative">
              {/* Hidden audio element */}
              <audio
                ref={audioRef}
                src={episode.audioUrl}
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
                preload="metadata"
              />

              {/* Visual Player Box */}
              <div className="relative w-full aspect-video bg-gradient-to-br from-green-900/20 to-black/40 flex items-center justify-center">
                {/* Album Art Background */}
                <div className="absolute inset-0 opacity-20">
                  <ImageWithFallback
                    src={episode.imageUrl}
                    alt={episode.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Player Controls Overlay */}
                <div className="relative z-10 flex items-center gap-6">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSkip(-15)}
                    className="text-white hover:bg-white/10"
                  >
                    <SkipBack className="w-5 h-5" />
                    <span className="text-xs ml-1">15</span>
                  </Button>
                  
                  <Button
                    onClick={togglePlayPause}
                    size="lg"
                    className="w-16 h-16 rounded-full bg-white text-black hover:bg-white/90"
                  >
                    {isPlaying ? (
                      <Pause className="w-8 h-8" />
                    ) : (
                      <Play className="w-8 h-8 ml-1" />
                    )}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSkip(30)}
                    className="text-white hover:bg-white/10"
                  >
                    <SkipForward className="w-5 h-5" />
                    <span className="text-xs ml-1">30</span>
                  </Button>
                </div>
                
                {/* Playback Speed */}
                <div className="absolute top-4 left-4">
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 text-sm">
                    1x
                  </Button>
                </div>
              </div>

              {/* Audio Controls Below */}
              <div className="p-4 space-y-4">
                {/* Progress Bar */}
                <div>
                  <Slider
                    value={[currentTime]}
                    max={duration || episode.duration}
                    step={1}
                    onValueChange={handleSeek}
                    className="mb-2"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{formatDuration(currentTime)}</span>
                    <span>{formatDuration(duration || episode.duration)}</span>
                  </div>
                </div>

                {/* Volume Control */}
                <div className="flex items-center gap-3">
                  <Volume2 className="w-4 h-4 text-muted-foreground" />
                  <Slider
                    value={[volume]}
                    max={100}
                    step={1}
                    onValueChange={handleVolumeChange}
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground w-8">{volume}</span>
                </div>
              </div>
            </div>
          ) : episode.platform === 'exclusive' ? (
            /* Exclusive Content Player - Handles Video and Audio */
            <div className="relative">
              {/* Check if episode has video content */}
              {episode.audioUrl && (episode.audioUrl.includes('.mp4') || episode.audioUrl.includes('.mov') || episode.audioUrl.includes('.webm') || episode.audioUrl.includes('video')) ? (
                /* Video Player for Exclusive Content */
                <div className="relative w-full aspect-video bg-black">
                  <video
                    controls
                    preload="metadata"
                    className="w-full h-full"
                    poster={episode.imageUrl}
                    onError={(e) => {
                      console.error('Video load error:', e);
                      toast.error('Unable to load video content');
                    }}
                  >
                    <source src={episode.audioUrl} type="video/mp4" />
                    <source src={episode.audioUrl} type="video/webm" />
                    <source src={episode.audioUrl} type="video/quicktime" />
                    Your browser does not support the video tag.
                  </video>
                </div>
              ) : (
                /* Audio Player for Exclusive Content */
                <div className="relative">
                  {/* Hidden audio element */}
                  <audio
                    ref={audioRef}
                    src={episode.audioUrl}
                    onLoadedMetadata={handleLoadedMetadata}
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={handleEnded}
                    preload="metadata"
                  />

                  {/* Visual Player Box */}
                  <div className="relative w-full aspect-video bg-gradient-to-br from-purple-900/30 to-black/50 flex items-center justify-center">
                    {/* Album Art Background */}
                    <div className="absolute inset-0 opacity-30">
                      <ImageWithFallback
                        src={episode.imageUrl}
                        alt={episode.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    {/* VIP Badge Overlay */}
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-purple-600/80 text-white border-purple-400/50">
                        <Crown className="w-3 h-3 mr-1" />
                        VIP Exclusive
                      </Badge>
                    </div>
                    
                    {/* Player Controls Overlay */}
                    <div className="relative z-10 flex items-center gap-6">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSkip(-15)}
                        className="text-white hover:bg-white/10"
                      >
                        <SkipBack className="w-5 h-5" />
                      </Button>
                      
                      <Button
                        onClick={togglePlay}
                        size="lg"
                        disabled={isLoading}
                        className="w-16 h-16 rounded-full bg-white/90 hover:bg-white text-black"
                      >
                        {isLoading ? (
                          <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                        ) : isPlaying ? (
                          <Pause className="w-8 h-8" />
                        ) : (
                          <Play className="w-8 h-8 ml-1" />
                        )}
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSkip(15)}
                        className="text-white hover:bg-white/10"
                      >
                        <SkipForward className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>

                  {/* Audio Controls Below */}
                  <div className="p-4 space-y-4">
                    {/* Progress Bar */}
                    <div>
                      <Slider
                        value={[currentTime]}
                        max={duration || episode.duration}
                        step={1}
                        onValueChange={handleSeek}
                        className="mb-2"
                      />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>{formatDuration(currentTime)}</span>
                        <span>{formatDuration(duration || episode.duration)}</span>
                      </div>
                    </div>

                    {/* Volume Control */}
                    <div className="flex items-center gap-3">
                      <Volume2 className="w-4 h-4 text-muted-foreground" />
                      <Slider
                        value={[volume]}
                        max={100}
                        step={1}
                        onValueChange={handleVolumeChange}
                        className="flex-1"
                      />
                      <span className="text-sm text-muted-foreground w-8">{volume}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* YouTube Video Player */
            youtubeVideoId ? (
              <div className="relative">
                {/* Embedded YouTube Player */}
                <div className="relative w-full aspect-video bg-black">
                  <iframe
                    src={`https://www.youtube.com/embed/${youtubeVideoId}?rel=0&modestbranding=1`}
                    title={episode.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full"
                  />
                </div>
                
                {/* YouTube External Link */}
                <div className="p-4 text-center">
                  <Button 
                    variant="outline" 
                    onClick={openInYouTube}
                    className="bg-red-600/10 hover:bg-red-600/20 border-red-600/20"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open in YouTube
                  </Button>
                </div>
              </div>
            ) : (
              /* Fallback */
              <div className="aspect-video bg-black/10 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto">
                    <Play className="w-8 h-8 text-white ml-1" />
                  </div>
                  <p className="text-muted-foreground">Unable to load video</p>
                  <Button onClick={openInYouTube} className="bg-red-600 hover:bg-red-700">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Watch on YouTube
                  </Button>
                </div>
              </div>
            )
          )}
        </div>

        {/* Compact Engagement Bar */}
        <div className="flex items-center justify-between px-1 py-1 mb-2">
          {/* Left Group: Views, Likes, Comments */}
          <div className="flex items-center gap-4">
            {/* Views Counter */}
            <button 
              className="flex items-center gap-1.5 text-muted-foreground cursor-default"
              disabled
            >
              <Eye className="w-4 h-4" />
              <span className="text-xs">{formatCount(viewCount)}</span>
            </button>

            {/* Like Button */}
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 hover:scale-105 transition-transform ${
                isLiked ? 'text-red-500' : 'text-muted-foreground hover:text-red-400'
              }`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
              <span className="text-xs">{formatCount(likeCount)}</span>
            </button>

            {/* Comment Button */}
            <button
              onClick={handleComment}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-primary hover:scale-105 transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="text-xs">{formatCount(commentCount)}</span>
            </button>

            {/* Save / Bookmark Button */}
            <button
              onClick={handleSave}
              className={`flex items-center gap-1.5 hover:scale-105 transition-transform ${
                episode && savedIds.has(String(episode.id))
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-primary'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${episode && savedIds.has(String(episode.id)) ? 'fill-current' : ''}`} />
              <span className="text-xs">{episode && savedIds.has(String(episode.id)) ? 'Saved' : 'Save'}</span>
            </button>
          </div>

          {/* Right Group: Share */}
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-primary hover:scale-105 transition-all"
          >
            <Share2 className="w-4 h-4" />
            <span className="text-xs">{shareCount > 0 ? formatCount(shareCount) : 'Share'}</span>
          </button>
        </div>

        {/* Recommended Episodes Section - Now positioned above comments */}
        <div className="mt-1.5 pt-1.5 border-t border-border">
          <h3 className="text-lg mb-4">You may also like these</h3>
          
          {recommendedEpisodes.length > 0 ? (
            <div className="space-y-3">
              {recommendedEpisodes.map((recommendedEpisode) => (
                <button
                  key={recommendedEpisode.id}
                  onClick={() => handleRecommendedEpisodeClick(recommendedEpisode)}
                  className="w-full text-left p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50"
                >
                  <div className="flex items-start gap-3">
                    {/* Episode thumbnail */}
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                      <ImageWithFallback
                        src={recommendedEpisode.imageUrl}
                        alt={recommendedEpisode.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    {/* Episode info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                          {recommendedEpisode.episodeNumber || `#${recommendedEpisode.id}`}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          recommendedEpisode.platform === 'youtube' 
                            ? 'bg-red-500/10 text-red-400' 
                            : 'bg-green-500/10 text-green-400'
                        }`}>
                          {recommendedEpisode.platform === 'youtube' ? '📺 YouTube' : '🎵 Spotify'}
                        </span>
                      </div>
                      
                      <h4 className="line-clamp-2 mb-1">
                        {recommendedEpisode.title}
                      </h4>
                      
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{formatDuration(recommendedEpisode.duration)}</span>
                        <span>•</span>
                        <span>{new Date(recommendedEpisode.publishedDate).toLocaleDateString()}</span>
                        
                        {/* Show engagement metrics */}
                        {recommendedEpisode.platform === 'youtube' && recommendedEpisode.views && (
                          <>
                            <span>•</span>
                            <span>{formatCount(recommendedEpisode.views)} views</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <div className="text-2xl mb-2">🎧</div>
              <p className="text-sm">Loading recommendations...</p>
              <p className="text-xs mt-2">Found {recommendedEpisodes.length} recommendations</p>
            </div>
          )}
        </div>

        {/* Comments Section - Now positioned below recommendations */}
        <div className="mt-1.5 pt-1.5 border-t border-border">
          <EpisodeCommentsSection
            episodeId={episode.id}
            episodeTitle={episode.title}
            isAuthenticated={isAuthenticated}
            onAuthRequired={() => {
              setAuthModalAction('comment');
              setShowAuthModal(true);
            }}
            onMetricsUpdate={handleMetricsUpdate}
            refreshTrigger={commentsRefreshTrigger}
          />
        </div>
      </div>

      {/* Modals */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title={episode.title}
        url={episodeUrl}
        episodeId={episode.id}
      />

      <CommentsModal
        isOpen={showCommentsModal}
        onClose={() => {
          setShowCommentsModal(false);
          handleCommentsModalAction(); // Trigger refresh when modal closes
        }}
        episodeId={episode.id}
        episodeTitle={episode.title}
        onCommentPosted={handleCommentsModalAction} // Add callback for when comments are posted
      />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        actionType={authModalAction}
      />
    </div>
  );
}