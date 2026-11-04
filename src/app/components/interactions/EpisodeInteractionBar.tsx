import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Heart, MessageCircle, Share2, DollarSign, MoreHorizontal } from 'lucide-react';
import { useEpisodeInteraction } from '../../contexts/EpisodeInteractionContext';
import { CommentsModal } from './CommentsModal';
import { TipModal } from './TipModal';
import { ShareModal } from './ShareModal';
import { cn } from '../ui/utils';

interface EpisodeInteractionBarProps {
  episodeId: number;
  className?: string;
  variant?: 'compact' | 'full';
  showCounts?: boolean;
}

export function EpisodeInteractionBar({ 
  episodeId, 
  className, 
  variant = 'full',
  showCounts = true 
}: EpisodeInteractionBarProps) {
  const { 
    getEpisodeStats, 
    toggleLike, 
    shareEpisode,
    isLoading 
  } = useEpisodeInteraction();
  
  const [showComments, setShowComments] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const stats = getEpisodeStats(episodeId);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleLike(episodeId);
  };

  const handleShare = async (method: 'link' | 'social') => {
    await shareEpisode(episodeId, method);
    setShowShareModal(false);
  };

  const formatCount = (count: number) => {
    if (count < 1000) return count.toString();
    if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
    return `${(count / 1000000).toFixed(1)}M`;
  };

  if (variant === 'compact') {
    return (
      <>
        <div className={cn('flex items-center gap-1', className)}>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            disabled={isLoading}
            className="p-1.5 h-auto text-muted-foreground hover:text-red-500"
          >
            <Heart className={cn(
              'w-4 h-4',
              stats.isLiked && 'fill-red-500 text-red-500'
            )} />
            {showCounts && stats.likesCount > 0 && (
              <span className="ml-1 text-xs">{formatCount(stats.likesCount)}</span>
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setShowComments(true);
            }}
            className="p-1.5 h-auto text-muted-foreground hover:text-primary"
          >
            <MessageCircle className="w-4 h-4" />
            {showCounts && stats.commentsCount > 0 && (
              <span className="ml-1 text-xs">{formatCount(stats.commentsCount)}</span>
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setShowShareModal(true);
            }}
            className="p-1.5 h-auto text-muted-foreground hover:text-primary"
          >
            <Share2 className="w-4 h-4" />
            {showCounts && stats.sharesCount > 0 && (
              <span className="ml-1 text-xs">{formatCount(stats.sharesCount)}</span>
            )}
          </Button>

          {stats.totalTipAmount > 0 && (
            <Badge variant="secondary" className="text-xs px-2 py-0.5">
              ${stats.totalTipAmount}
            </Badge>
          )}
        </div>

        <CommentsModal
          episodeId={episodeId}
          isOpen={showComments}
          onClose={() => setShowComments(false)}
        />

        <ShareModal
          episodeId={episodeId}
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          onShare={handleShare}
        />
      </>
    );
  }

  return (
    <>
      <div className={cn('flex items-center gap-2', className)}>
        <Button
          variant={stats.isLiked ? "default" : "outline"}
          size="sm"
          onClick={handleLike}
          disabled={isLoading}
          className={cn(
            'gap-2',
            stats.isLiked && 'bg-red-500 hover:bg-red-600 text-white border-red-500'
          )}
        >
          <Heart className={cn(
            'w-4 h-4',
            stats.isLiked && 'fill-current'
          )} />
          <span className="text-sm">
            {stats.likesCount > 0 ? formatCount(stats.likesCount) : 'Like'}
          </span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setShowComments(true);
          }}
          className="gap-2"
        >
          <MessageCircle className="w-4 h-4" />
          <span className="text-sm">
            {stats.commentsCount > 0 ? formatCount(stats.commentsCount) : 'Comment'}
          </span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setShowShareModal(true);
          }}
          className="gap-2"
        >
          <Share2 className="w-4 h-4" />
          <span className="text-sm">
            {stats.sharesCount > 0 ? formatCount(stats.sharesCount) : 'Share'}
          </span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setShowTipModal(true);
          }}
          className="gap-2 text-green-600 border-green-600 hover:bg-green-600 hover:text-white"
        >
          <DollarSign className="w-4 h-4" />
          <span className="text-sm">Tip</span>
          {stats.totalTipAmount > 0 && (
            <Badge variant="secondary" className="ml-1 text-xs">
              ${stats.totalTipAmount}
            </Badge>
          )}
        </Button>
      </div>

      <CommentsModal
        episodeId={episodeId}
        isOpen={showComments}
        onClose={() => setShowComments(false)}
      />

      <TipModal
        episodeId={episodeId}
        isOpen={showTipModal}
        onClose={() => setShowTipModal(false)}
      />

      <ShareModal
        episodeId={episodeId}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        onShare={handleShare}
      />
    </>
  );
}