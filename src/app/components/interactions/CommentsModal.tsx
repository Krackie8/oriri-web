import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Avatar } from '../ui/avatar';
import { Heart, MessageCircle, Send } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../utils/supabase/client';

interface Comment {
  id: string;
  author: string;
  avatar?: string;
  content: string;
  timestamp: string;
  likes: number;
  isLiked: boolean;
  replies?: Comment[];
}

interface CommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  episodeId: string;
  episodeTitle: string;
  onCommentPosted?: () => void;
}

export function CommentsModal({ isOpen, onClose, episodeId, episodeTitle, onCommentPosted }: CommentsModalProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { user, isLoggedIn } = useAuth();

  const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32`;

  // Load real comments from backend
  useEffect(() => {
    if (isOpen && episodeId) {
      loadComments();
    }
  }, [isOpen, episodeId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${baseUrl}/episode-comments/${episodeId}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const backendComments = data.comments || [];
        
        // Convert backend format to modal format
        const formattedComments: Comment[] = backendComments.map((comment: any) => ({
          id: comment.id,
          author: comment.userName,
          avatar: comment.userAvatar || '',
          content: comment.content,
          timestamp: formatTimeAgo(comment.timestamp),
          likes: comment.likes || 0,
          isLiked: comment.isLiked || false,
          replies: comment.replies?.map((reply: any) => ({
            id: reply.id,
            author: reply.userName,
            avatar: reply.userAvatar || '',
            content: reply.content,
            timestamp: formatTimeAgo(reply.timestamp),
            likes: reply.likes || 0,
            isLiked: reply.isLiked || false,
          })) || []
        }));
        
        setComments(formattedComments);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date().getTime();
    const time = new Date(timestamp).getTime();
    const diffInSeconds = Math.floor((now - time) / 1000);

    if (diffInSeconds < 60) return 'now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
  };

  const handleSubmitComment = async () => {
    if (!isLoggedIn) {
      toast.error('Please sign in to comment');
      return;
    }

    if (!newComment.trim()) {
      toast.error('Please write a comment');
      return;
    }

    setIsSubmitting(true);
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
          content: newComment.trim(),
          parentId: replyTo || undefined
        })
      });

      if (response.ok) {
        const result = await response.json();
        const newCommentData = result.comment;
        
        const formattedComment: Comment = {
          id: newCommentData.id,
          author: newCommentData.userName,
          avatar: newCommentData.userAvatar || '',
          content: newCommentData.content,
          timestamp: 'Just now',
          likes: 0,
          isLiked: false,
        };

        if (replyTo) {
          // Add as reply
          setComments(prev => prev.map(c => 
            c.id === replyTo 
              ? { ...c, replies: [...(c.replies || []), formattedComment] }
              : c
          ));
          setReplyTo(null);
        } else {
          // Add as new comment
          setComments(prev => [formattedComment, ...prev]);
        }

        setNewComment('');
        toast.success('Comment posted successfully');
        onCommentPosted?.(); // Trigger refresh of main comments section
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to post comment');
      }
    } catch (error) {
      console.error('Error posting comment:', error);
      toast.error(`Failed to post comment: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLikeComment = async (commentId: string, isReply = false, parentId?: string) => {
    if (!isLoggedIn) {
      toast.error('Please sign in to like comments');
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
        
        if (isReply && parentId) {
          setComments(prev => prev.map(c => 
            c.id === parentId 
              ? {
                  ...c, 
                  replies: c.replies?.map(r => 
                    r.id === commentId 
                      ? { ...r, isLiked: result.isLiked, likes: result.newCount }
                      : r
                  )
                }
              : c
          ));
        } else {
          setComments(prev => prev.map(c => 
            c.id === commentId 
              ? { ...c, isLiked: result.isLiked, likes: result.newCount }
              : c
          ));
        }
      }
    } catch (error) {
      console.error('Error liking comment:', error);
      toast.error('Failed to like comment');
    }
  };

  const handleReply = (commentId: string, authorName: string) => {
    setReplyTo(commentId);
    setNewComment(`@${authorName} `);
  };

  const formatTimestamp = (timestamp: string) => {
    return timestamp;
  };

  const CommentItem = ({ comment, isReply = false, parentId }: { comment: Comment; isReply?: boolean; parentId?: string }) => (
    <div className={`space-y-3 ${isReply ? 'ml-8 pl-4 border-l border-border' : ''}`}>
      <div className="flex items-start space-x-3">
        <Avatar className="w-8 h-8">
          {comment.avatar ? (
            <img src={comment.avatar} alt={comment.author} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center text-sm">
              {comment.author.charAt(0)}
            </div>
          )}
        </Avatar>
        
        <div className="flex-1 space-y-1">
          <div className="flex items-center space-x-2">
            <span className="font-medium text-sm">{comment.author}</span>
            <span className="text-xs text-muted-foreground">{formatTimestamp(comment.timestamp)}</span>
          </div>
          
          <p className="text-sm">{comment.content}</p>
          
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleLikeComment(comment.id, isReply, parentId)}
              className={`h-auto p-1 ${comment.isLiked ? 'text-red-500' : 'text-muted-foreground'}`}
            >
              <Heart className={`w-4 h-4 mr-1 ${comment.isLiked ? 'fill-current' : ''}`} />
              <span className="text-xs">LIKE ({comment.likes})</span>
            </Button>
            
            {!isReply && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleReply(comment.id, comment.author)}
                className="h-auto p-1 text-muted-foreground"
              >
                <MessageCircle className="w-4 h-4 mr-1" />
                <span className="text-xs">REPLY</span>
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-3">
          {comment.replies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} isReply={true} parentId={comment.id} />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl h-[600px] flex flex-col" aria-describedby="comments-description">
        <DialogHeader>
          <DialogTitle>Comments</DialogTitle>
          <p id="comments-description" className="text-sm text-muted-foreground line-clamp-1">
            {episodeTitle}
          </p>
        </DialogHeader>
        
        {/* Comment Input */}
        <div className="space-y-3 border-b border-border pb-4">
          {replyTo && (
            <div className="flex items-center justify-between bg-muted/50 rounded-lg p-2">
              <span className="text-sm text-muted-foreground">
                Replying to comment...
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setReplyTo(null);
                  setNewComment('');
                }}
              >
                Cancel
              </Button>
            </div>
          )}
          
          <div className="flex space-x-3">
            <Avatar className="w-8 h-8">
              <div className="w-full h-full bg-primary text-primary-foreground flex items-center justify-center text-sm">
                Y
              </div>
            </Avatar>
            <div className="flex-1 space-y-2">
              <Textarea
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[80px] resize-none"
              />
              <div className="flex justify-end">
                <Button 
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || isSubmitting}
                  size="sm"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  {replyTo ? 'Reply' : 'Comment'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading comments...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No comments yet</p>
              <p className="text-sm text-muted-foreground">Be the first to share your thoughts!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}