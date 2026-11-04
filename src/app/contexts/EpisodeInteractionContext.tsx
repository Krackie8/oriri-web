import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner@2.0.3';

export interface EpisodeLike {
  id: string;
  episodeId: number;
  userId: string;
  createdAt: string;
}

export interface EpisodeComment {
  id: string;
  episodeId: number;
  userId: string;
  userAvatar?: string;
  userName: string;
  content: string;
  createdAt: string;
  parentId?: string;
  replies?: EpisodeComment[];
  likesCount: number;
  isLiked: boolean;
}

export interface EpisodeTip {
  id: string;
  episodeId: number;
  userId: string;
  userName: string;
  amount: number;
  currency: string;
  message?: string;
  createdAt: string;
}

export interface EpisodeInteractionStats {
  episodeId: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  tipsCount: number;
  totalTipAmount: number;
  isLiked: boolean;
}

interface EpisodeInteractionContextType {
  // Stats
  getEpisodeStats: (episodeId: number) => EpisodeInteractionStats;
  
  // Likes
  toggleLike: (episodeId: number) => Promise<void>;
  
  // Comments
  getComments: (episodeId: number) => EpisodeComment[];
  addComment: (episodeId: number, content: string, parentId?: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  toggleCommentLike: (commentId: string) => Promise<void>;
  
  // Tips
  getTips: (episodeId: number) => EpisodeTip[];
  addTip: (episodeId: number, amount: number, message?: string) => Promise<void>;
  
  // Shares
  shareEpisode: (episodeId: number, method: 'link' | 'social') => Promise<void>;
  
  // Loading states
  isLoading: boolean;
  isCommenting: boolean;
  isTipping: boolean;
}

const EpisodeInteractionContext = createContext<EpisodeInteractionContextType | null>(null);

// Mock current user - in real app this would come from auth context
const currentUser = {
  id: 'user-123',
  name: 'John Doe',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face'
};

export function EpisodeInteractionProvider({ children }: { children: React.ReactNode }) {
  const [likes, setLikes] = useState<EpisodeLike[]>([]);
  const [comments, setComments] = useState<EpisodeComment[]>([]);
  const [tips, setTips] = useState<EpisodeTip[]>([]);
  const [shares, setShares] = useState<{episodeId: number, count: number}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCommenting, setIsCommenting] = useState(false);
  const [isTipping, setIsTipping] = useState(false);

  // Initialize with some mock data
  useEffect(() => {
    const mockComments: EpisodeComment[] = [
      {
        id: 'comment-1',
        episodeId: 42,
        userId: 'user-456',
        userName: 'Sarah Johnson',
        userAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b789?w=100&h=100&fit=crop&crop=face',
        content: "This episode was absolutely fascinating! The insights about Dubai's transformation really opened my eyes.",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        likesCount: 5,
        isLiked: false,
        replies: [
          {
            id: 'comment-1-1',
            episodeId: 42,
            userId: 'user-789',
            userName: 'Mike Chen',
            content: "Totally agree! The urban planning discussion was incredible.",
            createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
            likesCount: 2,
            isLiked: true
          }
        ]
      },
      {
        id: 'comment-2',
        episodeId: 42,
        userId: 'user-321',
        userName: 'Emma Wilson',
        userAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
        content: "Great guest choice! Would love to hear more episodes like this.",
        createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        likesCount: 3,
        isLiked: false
      }
    ];

    const mockTips: EpisodeTip[] = [
      {
        id: 'tip-1',
        episodeId: 42,
        userId: 'user-456',
        userName: 'Sarah Johnson',
        amount: 5,
        currency: 'USD',
        message: 'Amazing episode! Keep up the great work!',
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'tip-2',
        episodeId: 42,
        userId: 'user-789',
        userName: 'Mike Chen',
        amount: 10,
        currency: 'USD',
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
      }
    ];

    const mockLikes: EpisodeLike[] = [
      {
        id: 'like-1',
        episodeId: 42,
        userId: 'user-456',
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
      }
    ];

    const mockShares = [
      { episodeId: 42, count: 8 },
      { episodeId: 41, count: 12 }
    ];

    setComments(mockComments);
    setTips(mockTips);
    setLikes(mockLikes);
    setShares(mockShares);
  }, []);

  const getEpisodeStats = (episodeId: number): EpisodeInteractionStats => {
    const episodeLikes = likes.filter(like => like.episodeId === episodeId);
    const episodeComments = comments.filter(comment => comment.episodeId === episodeId);
    const episodeTips = tips.filter(tip => tip.episodeId === episodeId);
    const episodeShares = shares.find(share => share.episodeId === episodeId);
    
    const totalComments = episodeComments.reduce((total, comment) => {
      return total + 1 + (comment.replies?.length || 0);
    }, 0);

    const totalTipAmount = episodeTips.reduce((total, tip) => total + tip.amount, 0);
    const isLiked = episodeLikes.some(like => like.userId === currentUser.id);

    return {
      episodeId,
      likesCount: episodeLikes.length,
      commentsCount: totalComments,
      sharesCount: episodeShares?.count || 0,
      tipsCount: episodeTips.length,
      totalTipAmount,
      isLiked
    };
  };

  const toggleLike = async (episodeId: number): Promise<void> => {
    setIsLoading(true);
    try {
      const existingLike = likes.find(like => 
        like.episodeId === episodeId && like.userId === currentUser.id
      );

      if (existingLike) {
        // Unlike
        setLikes(prev => prev.filter(like => like.id !== existingLike.id));
        toast.success('Removed from favorites');
      } else {
        // Like
        const newLike: EpisodeLike = {
          id: `like-${Date.now()}`,
          episodeId,
          userId: currentUser.id,
          createdAt: new Date().toISOString()
        };
        setLikes(prev => [...prev, newLike]);
        toast.success('Added to favorites ❤️');
      }
    } catch (error) {
      toast.error('Failed to update favorite status');
    } finally {
      setIsLoading(false);
    }
  };

  const getComments = (episodeId: number): EpisodeComment[] => {
    return comments
      .filter(comment => comment.episodeId === episodeId && !comment.parentId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  const addComment = async (episodeId: number, content: string, parentId?: string): Promise<void> => {
    if (!content.trim()) return;
    
    setIsCommenting(true);
    try {
      const newComment: EpisodeComment = {
        id: `comment-${Date.now()}`,
        episodeId,
        userId: currentUser.id,
        userName: currentUser.name,
        userAvatar: currentUser.avatar,
        content: content.trim(),
        createdAt: new Date().toISOString(),
        parentId,
        likesCount: 0,
        isLiked: false
      };

      if (parentId) {
        // Add as reply
        setComments(prev => prev.map(comment => {
          if (comment.id === parentId) {
            return {
              ...comment,
              replies: [...(comment.replies || []), newComment]
            };
          }
          return comment;
        }));
        toast.success('Reply posted!');
      } else {
        // Add as main comment
        setComments(prev => [newComment, ...prev]);
        toast.success('Comment posted!');
      }
    } catch (error) {
      toast.error('Failed to post comment');
    } finally {
      setIsCommenting(false);
    }
  };

  const deleteComment = async (commentId: string): Promise<void> => {
    try {
      setComments(prev => prev.filter(comment => {
        if (comment.id === commentId) return false;
        if (comment.replies) {
          comment.replies = comment.replies.filter(reply => reply.id !== commentId);
        }
        return true;
      }));
      toast.success('Comment deleted');
    } catch (error) {
      toast.error('Failed to delete comment');
    }
  };

  const toggleCommentLike = async (commentId: string): Promise<void> => {
    try {
      setComments(prev => prev.map(comment => {
        if (comment.id === commentId) {
          return {
            ...comment,
            isLiked: !comment.isLiked,
            likesCount: comment.isLiked ? comment.likesCount - 1 : comment.likesCount + 1
          };
        }
        if (comment.replies) {
          comment.replies = comment.replies.map(reply => {
            if (reply.id === commentId) {
              return {
                ...reply,
                isLiked: !reply.isLiked,
                likesCount: reply.isLiked ? reply.likesCount - 1 : reply.likesCount + 1
              };
            }
            return reply;
          });
        }
        return comment;
      }));
    } catch (error) {
      toast.error('Failed to update comment like');
    }
  };

  const getTips = (episodeId: number): EpisodeTip[] => {
    return tips
      .filter(tip => tip.episodeId === episodeId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  const addTip = async (episodeId: number, amount: number, message?: string): Promise<void> => {
    setIsTipping(true);
    try {
      const newTip: EpisodeTip = {
        id: `tip-${Date.now()}`,
        episodeId,
        userId: currentUser.id,
        userName: currentUser.name,
        amount,
        currency: 'USD',
        message,
        createdAt: new Date().toISOString()
      };

      setTips(prev => [newTip, ...prev]);
      toast.success(`$${amount} tip sent! 🙏`, {
        description: 'Thank you for supporting the podcast!'
      });
    } catch (error) {
      toast.error('Failed to send tip');
    } finally {
      setIsTipping(false);
    }
  };

  const shareEpisode = async (episodeId: number, method: 'link' | 'social'): Promise<void> => {
    try {
      if (method === 'link') {
        const url = `${window.location.origin}/episode/${episodeId}`;
        await navigator.clipboard.writeText(url);
        toast.success('Episode link copied to clipboard!');
      } else {
        // For now, just copy link - in real app would integrate with social platforms
        const url = `${window.location.origin}/episode/${episodeId}`;
        await navigator.clipboard.writeText(url);
        toast.success('Episode link copied for sharing!');
      }

      // Update share count
      setShares(prev => {
        const existing = prev.find(share => share.episodeId === episodeId);
        if (existing) {
          return prev.map(share => 
            share.episodeId === episodeId 
              ? { ...share, count: share.count + 1 }
              : share
          );
        } else {
          return [...prev, { episodeId, count: 1 }];
        }
      });
    } catch (error) {
      toast.error('Failed to share episode');
    }
  };

  const value: EpisodeInteractionContextType = {
    getEpisodeStats,
    toggleLike,
    getComments,
    addComment,
    deleteComment,
    toggleCommentLike,
    getTips,
    addTip,
    shareEpisode,
    isLoading,
    isCommenting,
    isTipping
  };

  return (
    <EpisodeInteractionContext.Provider value={value}>
      {children}
    </EpisodeInteractionContext.Provider>
  );
}

export function useEpisodeInteraction() {
  const context = useContext(EpisodeInteractionContext);
  if (!context) {
    throw new Error('useEpisodeInteraction must be used within an EpisodeInteractionProvider');
  }
  return context;
}