import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Send } from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';


import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../utils/supabase/client';

interface Comment {
  id: string;
  episodeId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  timestamp: string;
  likes: number;
  replies: Comment[];
  isLiked: boolean;
  isEdited?: boolean;
}

interface CommentMetrics {
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalViews: number;
  recentUsers: Array<{
    id: string;
    name: string;
    avatar: string;
  }>;
}

interface EpisodeCommentsSectionProps {
  episodeId: string;
  episodeTitle: string;
  isAuthenticated: boolean;
  onAuthRequired: () => void;
  onMetricsUpdate?: (metrics: CommentMetrics) => void;
  refreshTrigger?: number;
}

export default function EpisodeCommentsSection({
  episodeId,
  episodeTitle,
  isAuthenticated,
  onAuthRequired,
  onMetricsUpdate,
  refreshTrigger
}: EpisodeCommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [metrics, setMetrics] = useState<CommentMetrics>({
    totalLikes: 0,
    totalComments: 0,
    totalShares: 0,
    totalViews: 0,
    recentUsers: []
  });
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32`;

  // Load comments and metrics
  useEffect(() => {
    loadCommentsAndMetrics();
  }, [episodeId, refreshTrigger]);

  const loadCommentsAndMetrics = async () => {
    try {
      setLoading(true);
      
      // Load comments
      const commentsResponse = await fetch(`${baseUrl}/episode-comments/${episodeId}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });
      
      if (commentsResponse.ok) {
        const commentsData = await commentsResponse.json();
        setComments(commentsData.comments || []);
      }

      // Load metrics
      const metricsResponse = await fetch(`${baseUrl}/episode-metrics/${episodeId}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });
      
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        const newMetrics = metricsData.metrics || {
          totalLikes: 0,
          totalComments: 0,
          totalShares: 0,
          totalViews: 0,
          recentUsers: []
        };
        setMetrics(newMetrics);
        onMetricsUpdate?.(newMetrics);
      }
      
    } catch (error) {
      console.error('Error loading comments and metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!isAuthenticated) {
      onAuthRequired();
      return;
    }

    if (!newComment.trim()) {
      toast.error('Please write a comment');
      return;
    }

    setIsSubmitting(true);
    try {
      // Get current session with access token
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      
      console.log('Posting comment with auth:', { 
        episodeId, 
        hasUser: !!user, 
        hasSession: !!session,
        hasAccessToken: !!accessToken 
      });

      const response = await fetch(`${baseUrl}/episode-comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken || publicAnonKey}`
        },
        body: JSON.stringify({
          episodeId,
          content: newComment.trim()
        })
      });

      if (response.ok) {
        const result = await response.json();
        setComments(prev => [result.comment, ...prev]);
        setNewComment('');
        const updatedMetrics = {
          ...metrics,
          totalComments: metrics.totalComments + 1
        };
        setMetrics(updatedMetrics);
        onMetricsUpdate?.(updatedMetrics);
        toast.success('Comment posted successfully');
      } else {
        const errorData = await response.json();
        console.error('Comment posting failed:', errorData);
        throw new Error(errorData.error || 'Failed to post comment');
      }
    } catch (error) {
      console.error('Error posting comment:', error);
      toast.error(`Error posting comment: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!isAuthenticated) {
      onAuthRequired();
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      
      const response = await fetch(`${baseUrl}/comment-like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken || publicAnonKey}`
        },
        body: JSON.stringify({ commentId })
      });

      if (response.ok) {
        const result = await response.json();
        setComments(prev => prev.map(comment => 
          comment.id === commentId 
            ? { ...comment, isLiked: result.isLiked, likes: result.newCount }
            : comment
        ));
      }
    } catch (error) {
      console.error('Error liking comment:', error);
      toast.error('Failed to like comment');
    }
  };

  const handleReply = async (parentId: string) => {
    if (!isAuthenticated) {
      onAuthRequired();
      return;
    }

    if (!replyContent.trim()) {
      toast.error('Please write a reply');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      
      const response = await fetch(`${baseUrl}/episode-comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken || publicAnonKey}`
        },
        body: JSON.stringify({
          episodeId,
          content: replyContent.trim(),
          parentId
        })
      });

      if (response.ok) {
        const result = await response.json();
        setComments(prev => prev.map(comment => 
          comment.id === parentId
            ? { ...comment, replies: [...comment.replies, result.comment] }
            : comment
        ));
        setReplyContent('');
        setReplyingTo(null);
        toast.success('Reply posted successfully');
      }
    } catch (error) {
      console.error('Error posting reply:', error);
      toast.error('Failed to post reply');
    }
  };



  const formatTimeAgo = (timestamp: string) => {
    const now = new Date().getTime();
    const time = new Date(timestamp).getTime();
    const diffInSeconds = Math.floor((now - time) / 1000);

    if (diffInSeconds < 60) return 'now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d`;
    return `${Math.floor(diffInSeconds / 2592000)}mo`;
  };

  const renderComment = (comment: Comment, isReply = false) => (
    <div key={comment.id} className={`${isReply ? 'ml-12 mt-3' : 'mb-6'}`} id={`comment-${comment.id}`}>
      <div className="flex space-x-3">
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={comment.userAvatar} alt={comment.userName} />
          <AvatarFallback>{comment.userName.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-medium text-sm">{comment.userName}</span>
            <span className="text-xs text-muted-foreground">{formatTimeAgo(comment.timestamp)}</span>
            {comment.isEdited && (
              <span className="text-xs text-muted-foreground italic">Edited</span>
            )}
          </div>
          
          {comment.likes > 0 && (
            <div className="flex items-center space-x-1 mb-2">
              <Heart className="w-3 h-3 text-red-500 fill-current" />
              <span className="text-xs text-muted-foreground">
                Liked by {comment.likes} {comment.likes === 1 ? 'person' : 'people'}
              </span>
            </div>
          )}
          
          <div className="prose prose-sm max-w-none text-foreground mb-3">
            <p className="whitespace-pre-wrap">{comment.content}</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleLikeComment(comment.id)}
              className={`flex items-center space-x-1 text-xs h-8 px-2 ${
                comment.isLiked ? 'text-red-500' : 'text-muted-foreground'
              }`}
            >
              <Heart className={`w-4 h-4 ${comment.isLiked ? 'fill-current' : ''}`} />
              <span>LIKE ({comment.likes})</span>
            </Button>
            
            {!isReply && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                className="flex items-center space-x-1 text-xs text-muted-foreground h-8 px-2"
              >
                <MessageCircle className="w-4 h-4" />
                <span>REPLY</span>
              </Button>
            )}
          </div>
          
          {replyingTo === comment.id && (
            <div className="mt-4 space-y-3">
              <Textarea
                placeholder="Write a reply..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                className="min-h-[80px] bg-muted/30"
              />
              <div className="flex justify-end space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setReplyingTo(null);
                    setReplyContent('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleReply(comment.id)}
                  disabled={!replyContent.trim()}
                >
                  Reply
                </Button>
              </div>
            </div>
          )}
          
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-4">
              {comment.replies.map(reply => renderComment(reply, true))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-1/3 mb-4"></div>
          <div className="h-10 bg-muted rounded mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex space-x-3">
                <div className="w-8 h-8 bg-muted rounded-full flex-shrink-0"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/4"></div>
                  <div className="h-16 bg-muted rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Discussion Header */}
      <div>
        <h3 className="font-medium text-lg mb-6">Discussion about this episode</h3>
        
        <div className="space-y-6">
          {/* Comment Input */}
          <div className="flex space-x-3">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarFallback>?</AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <Textarea
                placeholder="Sign in to write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onFocus={(e) => {
                  if (!isAuthenticated) {
                    e.target.blur();
                    onAuthRequired();
                  }
                }}
                onClick={() => {
                  if (!isAuthenticated) {
                    onAuthRequired();
                  }
                }}
                className="min-h-[100px] bg-muted/30 border-muted resize-none cursor-pointer"
                readOnly={!isAuthenticated}
              />
              
              {isAuthenticated && (
                <div className="flex justify-end mt-3">
                  <Button
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim() || isSubmitting}
                    size="sm"
                    className="flex items-center space-x-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSubmitting ? 'Posting...' : 'Post Comment'}</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          {/* Comments List */}
          <div className="space-y-6">
            {comments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No comments yet. Be the first to share your thoughts!</p>
              </div>
            ) : (
              comments.map(comment => renderComment(comment))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}