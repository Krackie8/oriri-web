import React, { useState, useEffect } from 'react';
import { useCommunityEngagement } from '../../contexts/CommunityEngagementContext';
import { useAuth } from '../../hooks/useAuth';
import { useUserProfile } from '../../hooks/useUserProfile';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Heart, Crown, Send, MoreHorizontal } from 'lucide-react';
import { CommunityPost, CommunityReply } from '../../contexts/CommunityEngagementContext';

interface PostCommentsModalProps {
  post: CommunityPost | null;
  isOpen: boolean;
  onClose: () => void;
}

interface CommentCardProps {
  reply: CommunityReply;
  onLike: (replyId: string) => void;
}

function CommentCard({ reply, onLike }: CommentCardProps) {
  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start space-x-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={reply.authorAvatar} />
          <AvatarFallback>{reply.authorName[0]}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1 space-y-2">
          <div className="flex items-center space-x-2">
            <h5 className="font-medium text-sm">{reply.authorName}</h5>
            {reply.isCreator && <Badge variant="default" className="text-xs">Creator</Badge>}
            {reply.isVip && <Crown className="h-3 w-3 text-yellow-500" />}
            {reply.authorBadges.map((badge, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {badge}
              </Badge>
            ))}
            <span className="text-xs text-muted-foreground">{formatTimeAgo(reply.createdAt)}</span>
          </div>
          
          <div className="bg-muted/20 rounded-lg p-3">
            <p className="text-sm whitespace-pre-wrap">{reply.content}</p>
            
            {/* Media attachments */}
            {reply.mediaUrls.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {reply.mediaUrls.map((url: string, index: number) => (
                  <img
                    key={index}
                    src={url}
                    alt="Reply attachment"
                    className="rounded object-cover w-full h-20"
                  />
                ))}
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onLike(reply.id)}
              className={`flex items-center space-x-1 h-7 ${reply.engagement.userLiked ? 'text-red-500' : ''}`}
            >
              <Heart className={`h-3 w-3 ${reply.engagement.userLiked ? 'fill-current' : ''}`} />
              <span className="text-xs">{reply.engagement.likes}</span>
            </Button>
            
            <Button variant="ghost" size="sm" className="h-7 text-xs">
              Reply
            </Button>
            
            <Button variant="ghost" size="sm" className="h-7">
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PostCommentsModal({ post, isOpen, onClose }: PostCommentsModalProps) {
  const { getReplies, createReply, likeReply } = useCommunityEngagement();
  const { user, isLoggedIn } = useAuth();
  const userProfile = useUserProfile();
  
  const [replies, setReplies] = useState<CommunityReply[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load replies when post changes
  useEffect(() => {
    if (post && isOpen) {
      loadReplies();
    }
  }, [post, isOpen]);

  const loadReplies = async () => {
    if (!post) return;
    
    setIsLoading(true);
    try {
      const postReplies = await getReplies(post.id);
      setReplies(postReplies);
    } catch (error) {
      console.error('Error loading replies:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !post || !isLoggedIn || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const newReply = await createReply({
        postId: post.id,
        authorId: user?.id || 'current-user',
        authorName: userProfile?.displayName || user?.email || 'Current User',
        authorAvatar: userProfile?.avatar,
        authorBadges: userProfile?.badges || [],
        isCreator: userProfile?.isAdmin || false,
        isVip: userProfile?.isVip || false,
        content: newComment,
        mediaUrls: [],
        parentReplyId: undefined,
      });

      setReplies(prev => [...prev, newReply]);
      setNewComment('');
    } catch (error) {
      console.error('Error creating reply:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLikeReply = async (replyId: string) => {
    try {
      await likeReply(replyId);
      // Update local state to reflect the like
      setReplies(prev => prev.map(reply => {
        if (reply.id === replyId) {
          const wasLiked = reply.engagement.userLiked;
          return {
            ...reply,
            engagement: {
              ...reply.engagement,
              likes: wasLiked ? reply.engagement.likes - 1 : reply.engagement.likes + 1,
              userLiked: !wasLiked,
            },
          };
        }
        return reply;
      }));
    } catch (error) {
      console.error('Error liking reply:', error);
    }
  };

  if (!post) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Comments</DialogTitle>
          <DialogDescription>
            {replies.length} {replies.length === 1 ? 'comment' : 'comments'} on this post
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Original Post */}
          <div className="pb-4 border-b border-border/50">
            <div className="flex items-start space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={post.authorAvatar} />
                <AvatarFallback>{post.authorName[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h4 className="font-medium">{post.authorName}</h4>
                  {post.isCreator && <Badge variant="default" className="text-xs">Creator</Badge>}
                  {post.isVip && <Crown className="h-4 w-4 text-yellow-500" />}
                </div>
                <p className="text-sm text-muted-foreground mb-2">{post.content}</p>
                <div className="text-xs text-muted-foreground">
                  {new Date(post.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Comments List */}
          <ScrollArea className="flex-1 py-4">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-start space-x-3">
                    <div className="h-8 w-8 bg-muted rounded-full animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                      <div className="h-12 w-full bg-muted rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : replies.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No comments yet.</p>
                <p className="text-sm text-muted-foreground">Be the first to share your thoughts!</p>
              </div>
            ) : (
              <div className="space-y-6">
                {replies.map((reply, index) => (
                  <div key={reply.id}>
                    <CommentCard reply={reply} onLike={handleLikeReply} />
                    {index < replies.length - 1 && <Separator className="mt-6" />}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Comment Input */}
          {isLoggedIn ? (
            <div className="pt-4 border-t border-border/50">
              <div className="flex items-start space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={userProfile?.avatar} />
                  <AvatarFallback>{userProfile?.displayName?.[0] || user?.email?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-3">
                  <Textarea
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                    disabled={isSubmitting}
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={handleSubmitComment}
                      disabled={!newComment.trim() || isSubmitting}
                      size="sm"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {isSubmitting ? 'Posting...' : 'Post Comment'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="pt-4 border-t border-border/50 text-center">
              <p className="text-muted-foreground">Please log in to post a comment</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}