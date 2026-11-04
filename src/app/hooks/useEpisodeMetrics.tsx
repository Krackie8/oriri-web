import { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

// Extract the EXACT same metrics logic from UnifiedEpisodeDetailScreen.tsx
export function useEpisodeMetrics(episodeId: string) {
  const [viewCount, setViewCount] = useState(0);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [shareCount, setShareCount] = useState(0);

  const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32`;

  // EXACT same trackEpisodeView function from Episode Detail screen (lines 122-143)
  const trackEpisodeView = async () => {
    try {
      const response = await fetch(`${baseUrl}/episode-view`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          episodeId: episodeId,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        const result = await response.json();
        setViewCount(result.totalViews);
      }
    } catch (error) {
      console.error('Error tracking episode view:', error);
    }
  };

  // EXACT same handleMetricsUpdate function from Episode Detail screen (lines 241-248)
  const handleMetricsUpdate = (metrics: any) => {
    setCommentCount(metrics.totalComments);
    setShareCount(metrics.totalShares);
    setLikeCount(metrics.totalLikes);
    if (metrics.totalViews !== undefined) {
      setViewCount(metrics.totalViews);
    }
  };

  // Track episode view on mount (same as Episode Detail screen line 116)
  useEffect(() => {
    if (episodeId) {
      trackEpisodeView();
    }
  }, [episodeId]);

  return {
    viewCount,
    likeCount,
    commentCount,
    shareCount,
    handleMetricsUpdate
  };
}

// EXACT same formatCount function from Episode Detail screen (lines 58-67)
export function formatCount(count?: number): string {
  if (!count) return '0';
  
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}