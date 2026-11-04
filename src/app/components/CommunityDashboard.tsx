import React, { useState, useEffect } from 'react';
import { useCommunityEngagement } from '../contexts/CommunityEngagementContext';
import { useAuth } from '../hooks/useAuth';
import { useUserProfile } from '../hooks/useUserProfile';
import { useCommunityProfile } from '../hooks/useCommunityProfile';
import { useModals } from '../contexts/ModalContext';
import PostCommentsModal from './interactions/PostCommentsModal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Progress } from './ui/progress';
import { Skeleton } from './ui/skeleton';
import { Alert, AlertDescription } from './ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  MessageSquare,
  Heart,
  Eye,
  Pin,
  Lock,
  MoreHorizontal,
  Search,
  Filter,
  Plus,
  Send,
  ThumbsUp,
  Calendar,
  Trophy,
  Star,
  Users,
  TrendingUp,
  Clock,
  Flag,
  Award,
  Target,
  Zap,
  BookOpen,
  Camera,
  Video,
  Mic,
  Gift,
  Crown,
  Bell,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface CommunityPostCardProps {
  post: any;
  onLike: (postId: string) => void;
  onSave: (postId: string) => void;
  onReply: (post: any) => void;
}

function CommunityPostCard({ post, onLike, onSave, onReply }: CommunityPostCardProps) {
  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'question': return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'story': return <BookOpen className="h-4 w-4 text-green-500" />;
      case 'poll': return <BarChart className="h-4 w-4 text-purple-500" />;
      case 'feedback': return <Star className="h-4 w-4 text-yellow-500" />;
      default: return <MessageSquare className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Card className={`bg-card/50 backdrop-blur border-border/50 ${post.isPinned ? 'ring-1 ring-blue-500/50' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={post.authorAvatar} />
              <AvatarFallback>{post.authorName[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h4 className="font-medium">{post.authorName}</h4>
                {post.isCreator && <Badge variant="default" className="text-xs">Creator</Badge>}
                {post.isVip && <Crown className="h-4 w-4 text-yellow-500" />}
                {post.authorBadges.map((badge, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {badge}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                {getTypeIcon(post.type)}
                <span>{post.category}</span>
                <span>•</span>
                <span>{formatTimeAgo(post.createdAt)}</span>
                {post.isPinned && <Pin className="h-3 w-3 text-blue-500" />}
                {post.isLocked && <Lock className="h-3 w-3 text-red-500" />}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Post Content */}
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <p className="whitespace-pre-wrap">{post.content}</p>
        </div>

        {/* Media Attachments */}
        {post.mediaUrls.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {post.mediaUrls.map((url: string, index: number) => (
              <img
                key={index}
                src={url}
                alt="Post attachment"
                className="rounded-lg object-cover w-full h-32"
              />
            ))}
          </div>
        )}

        {/* Poll */}
        {post.poll && (
          <div className="space-y-3 p-4 bg-muted/20 rounded-lg">
            <h5 className="font-medium">{post.poll.question}</h5>
            <div className="space-y-2">
              {post.poll.options.map((option: any) => (
                <div key={option.id} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{option.text}</span>
                    <span className="text-sm text-muted-foreground">{option.votes} votes</span>
                  </div>
                  <Progress value={(option.votes / Math.max(...post.poll.options.map((o: any) => o.votes))) * 100} className="h-2" />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Poll ends {new Date(post.poll.endsAt).toLocaleDateString()}
            </p>
          </div>
        )}

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {post.tags.map((tag: string, index: number) => (
              <Badge key={index} variant="outline" className="text-xs">
                #{tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Engagement Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onLike(post.id)}
              className={`flex items-center space-x-1 ${post.engagement.userLiked ? 'text-red-500' : ''}`}
            >
              <Heart className={`h-4 w-4 ${post.engagement.userLiked ? 'fill-current' : ''}`} />
              <span>{post.engagement.likes}</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReply(post)}
              className="flex items-center space-x-1"
            >
              <MessageSquare className="h-4 w-4" />
              <span>{post.engagement.replies}</span>
            </Button>
            
            <div className="flex items-center space-x-1 text-sm text-muted-foreground">
              <Eye className="h-4 w-4" />
              <span>{post.engagement.views}</span>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSave(post.id)}
            className={post.engagement.userSaved ? 'text-blue-500' : ''}
          >
            <BookOpen className={`h-4 w-4 ${post.engagement.userSaved ? 'fill-current' : ''}`} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface UserSubmissionCardProps {
  submission: any;
  onVote: (submissionId: string) => void;
  onRespond?: (submissionId: string, response: string) => void;
  isCreator?: boolean;
}

function UserSubmissionCard({ submission, onVote, onRespond, isCreator = false }: UserSubmissionCardProps) {
  const [response, setResponse] = useState('');
  const [showResponseForm, setShowResponseForm] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-500 border-green-500';
      case 'featured': return 'text-purple-500 border-purple-500';
      case 'used': return 'text-blue-500 border-blue-500';
      case 'rejected': return 'text-red-500 border-red-500';
      default: return 'text-yellow-500 border-yellow-500';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'question': return <MessageSquare className="h-4 w-4" />;
      case 'story': return <BookOpen className="h-4 w-4" />;
      case 'topic_suggestion': return <Target className="h-4 w-4" />;
      case 'guest_suggestion': return <Users className="h-4 w-4" />;
      case 'feedback': return <Star className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const handleSubmitResponse = () => {
    if (onRespond && response.trim()) {
      onRespond(submission.id, response);
      setResponse('');
      setShowResponseForm(false);
    }
  };

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={submission.userAvatar} />
              <AvatarFallback>{submission.userName[0]}</AvatarFallback>
            </Avatar>
            <div>
              <h4 className="font-medium">{submission.userName}</h4>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                {getTypeIcon(submission.type)}
                <span className="capitalize">{submission.type.replace('_', ' ')}</span>
                <span>•</span>
                <span>{new Date(submission.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          <Badge variant="outline" className={getStatusColor(submission.status)}>
            {submission.status}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div>
          <h5 className="font-medium mb-2">{submission.title}</h5>
          <p className="text-sm text-muted-foreground">{submission.content}</p>
        </div>

        {/* Tags */}
        {submission.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {submission.tags.map((tag: string, index: number) => (
              <Badge key={index} variant="outline" className="text-xs">
                #{tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Used in Episode */}
        {submission.usedInEpisode && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Used in <strong>{submission.usedInEpisode.episodeTitle}</strong>
              {submission.usedInEpisode.timestamp && (
                <span> at {Math.floor(submission.usedInEpisode.timestamp / 60)}:{String(submission.usedInEpisode.timestamp % 60).padStart(2, '0')}</span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Creator Response */}
        {submission.creatorResponse && (
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Crown className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium text-blue-500">Creator Response</span>
            </div>
            <p className="text-sm">{submission.creatorResponse.message}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(submission.creatorResponse.respondedAt).toLocaleDateString()}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onVote(submission.id)}
            className={`flex items-center space-x-1 ${submission.userVoted ? 'text-blue-500' : ''}`}
          >
            <ThumbsUp className={`h-4 w-4 ${submission.userVoted ? 'fill-current' : ''}`} />
            <span>{submission.votes}</span>
          </Button>
          
          {isCreator && !submission.creatorResponse && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowResponseForm(!showResponseForm)}
            >
              Respond
            </Button>
          )}
        </div>

        {/* Response Form */}
        {showResponseForm && (
          <div className="space-y-3 pt-3 border-t border-border/50">
            <Textarea
              placeholder="Write your response..."
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              rows={3}
            />
            <div className="flex space-x-2">
              <Button size="sm" onClick={handleSubmitResponse}>
                Send Response
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowResponseForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface CommunityMetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
}

function CommunityMetricCard({ title, value, change, icon, description, trend }: CommunityMetricCardProps) {
  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-500';
    if (trend === 'down') return 'text-red-500';
    return 'text-muted-foreground';
  };

  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="h-3 w-3" />;
    if (trend === 'down') return <TrendingUp className="h-3 w-3 rotate-180" />;
    return null;
  };

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <div className={`flex items-center space-x-1 text-xs ${getTrendColor()}`}>
            {getTrendIcon()}
            <span>{change > 0 ? '+' : ''}{change}%</span>
            <span className="text-muted-foreground">vs last week</span>
          </div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function CommunityDashboard() {
  const {
    filteredPosts,
    submissions,
    activeChallenges,
    upcomingQASessions,
    userProfile: contextUserProfile,
    analytics,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    likePost,
    savePost,
    voteOnSubmission,
    respondToSubmission,
    createPost,
    createSubmission,
    isLoading,
    communityNotifications
  } = useCommunityEngagement();

  const { user, isLoggedIn } = useAuth();
  const userProfile = useUserProfile();
  const communityProfile = useCommunityProfile();
  const { setShowLogin } = useModals();

  const [activeTab, setActiveTab] = useState('feed');
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [isCreateSubmissionOpen, setIsCreateSubmissionOpen] = useState(false);
  const [selectedPostForComments, setSelectedPostForComments] = useState<any>(null);
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostType, setNewPostType] = useState<'discussion' | 'question' | 'story' | 'feedback'>('discussion');
  const [newSubmissionTitle, setNewSubmissionTitle] = useState('');
  const [newSubmissionContent, setNewSubmissionContent] = useState('');
  const [newSubmissionType, setNewSubmissionType] = useState<'question' | 'story' | 'topic_suggestion' | 'guest_suggestion' | 'feedback'>('question');

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return;

    try {
      await createPost({
        authorId: userProfile?.displayName || user?.id || 'current-user',
        authorName: userProfile?.displayName || 'Current User',
        authorBadges: communityProfile?.badges || [],
        isCreator: userProfile?.isAdmin || false,
        isVip: userProfile?.isVip || false,
        content: newPostContent,
        mediaUrls: [],
        type: newPostType,
        category: selectedCategory === 'All' ? 'General Discussion' : selectedCategory,
        tags: [],
        isPinned: false,
        isLocked: false,
      });

      setNewPostContent('');
      setIsCreatePostOpen(false);
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  const handleCreateSubmission = async () => {
    if (!newSubmissionTitle.trim() || !newSubmissionContent.trim()) return;

    try {
      await createSubmission({
        userId: user?.id || 'current-user',
        userName: userProfile?.displayName || 'Current User',
        type: newSubmissionType,
        title: newSubmissionTitle,
        content: newSubmissionContent,
        mediaUrls: [],
        tags: [],
      });

      setNewSubmissionTitle('');
      setNewSubmissionContent('');
      setIsCreateSubmissionOpen(false);
    } catch (error) {
      console.error('Error creating submission:', error);
    }
  };

  const handleOpenComments = (post: any) => {
    setSelectedPostForComments(post);
    setIsCommentsModalOpen(true);
  };

  const handleCloseComments = () => {
    setSelectedPostForComments(null);
    setIsCommentsModalOpen(false);
  };

  const handleCreatePostClick = () => {
    if (!isLoggedIn) {
      setShowLogin(true);
      return;
    }
    setIsCreatePostOpen(true);
  };

  const unreadNotifications = communityNotifications.filter(n => !n.isRead).length;
  const categories = ['All', 'General Discussion', 'Episode Feedback', 'Success Stories', 'Questions', 'Off-Topic'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div>
          <h1 className="text-3xl font-bold">Community</h1>
          <p className="text-muted-foreground">
            Connect, share, and grow with fellow listeners
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search community..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Notifications */}
          <Button variant="outline" size="sm" className="relative shrink-0">
            <Bell className="h-4 w-4" />
            {unreadNotifications > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                {unreadNotifications}
              </Badge>
            )}
          </Button>

          {/* Create Content */}
          <Button onClick={handleCreatePostClick} className="shrink-0">
            <Plus className="h-4 w-4 mr-2" />
            Create Post
          </Button>
          
          <Dialog open={isCreatePostOpen} onOpenChange={setIsCreatePostOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Post</DialogTitle>
                <DialogDescription>
                  Share your thoughts, questions, or stories with the community
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Post Type</Label>
                  <Select value={newPostType} onValueChange={(value: any) => setNewPostType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="discussion">Discussion</SelectItem>
                      <SelectItem value="question">Question</SelectItem>
                      <SelectItem value="story">Success Story</SelectItem>
                      <SelectItem value="feedback">Feedback</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Content</Label>
                  <Textarea
                    placeholder="What's on your mind?"
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    rows={4}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCreatePostOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreatePost}>
                    Create Post
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="feed">Feed</TabsTrigger>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
          <TabsTrigger value="challenges">Challenges</TabsTrigger>
          <TabsTrigger value="qa">Live Q&A</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="profile">My Profile</TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="space-y-6">
          {/* Community Metrics */}
          {analytics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <CommunityMetricCard
                title="Total Members"
                value={analytics.totalMembers.toLocaleString()}
                change={analytics.weekOverWeekChanges?.totalMembers}
                trend={analytics.weekOverWeekChanges?.totalMembers && analytics.weekOverWeekChanges.totalMembers > 0 ? "up" : analytics.weekOverWeekChanges?.totalMembers && analytics.weekOverWeekChanges.totalMembers < 0 ? "down" : undefined}
                icon={<Users className="h-4 w-4" />}
                description={`${analytics.activeMembers} active this week`}
              />
              <CommunityMetricCard
                title="New Posts"
                value={analytics.postsThisWeek}
                change={analytics.weekOverWeekChanges?.posts}
                trend={analytics.weekOverWeekChanges?.posts && analytics.weekOverWeekChanges.posts > 0 ? "up" : analytics.weekOverWeekChanges?.posts && analytics.weekOverWeekChanges.posts < 0 ? "down" : undefined}
                icon={<MessageSquare className="h-4 w-4" />}
                description="This week"
              />
              <CommunityMetricCard
                title="Engagement Rate"
                value={`${analytics.engagementRate}%`}
                change={analytics.weekOverWeekChanges?.engagementRate}
                trend={analytics.weekOverWeekChanges?.engagementRate && analytics.weekOverWeekChanges.engagementRate > 0 ? "up" : analytics.weekOverWeekChanges?.engagementRate && analytics.weekOverWeekChanges.engagementRate < 0 ? "down" : undefined}
                icon={<Heart className="h-4 w-4" />}
                description="Community engagement"
              />
              <CommunityMetricCard
                title="New Members"
                value={analytics.newMembersThisWeek}
                change={analytics.weekOverWeekChanges?.newMembers}
                trend={analytics.weekOverWeekChanges?.newMembers && analytics.weekOverWeekChanges.newMembers > 0 ? "up" : analytics.weekOverWeekChanges?.newMembers && analytics.weekOverWeekChanges.newMembers < 0 ? "down" : undefined}
                icon={<TrendingUp className="h-4 w-4" />}
                description="This week"
              />
            </div>
          )}

          {/* Category Filter */}
          <div className="flex items-center space-x-4">
            <Label>Category:</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground">
              {filteredPosts.length} posts
            </div>
          </div>

          {/* Community Feed */}
          <div className="space-y-4">
            {filteredPosts.length === 0 ? (
              <Card className="bg-card/50 backdrop-blur border-border/50">
                <CardContent className="text-center py-12">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No posts found</h3>
                  <p className="text-muted-foreground mb-4">
                    Be the first to start a conversation in this category!
                  </p>
                  <Button onClick={() => setIsCreatePostOpen(true)}>
                    Create First Post
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredPosts.map((post) => (
                <CommunityPostCard
                  key={post.id}
                  post={post}
                  onLike={likePost}
                  onSave={savePost}
                  onReply={handleOpenComments}
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="submissions" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">User Submissions</h2>
              <p className="text-muted-foreground">
                Questions, stories, and suggestions from the community
              </p>
            </div>
            <Dialog open={isCreateSubmissionOpen} onOpenChange={setIsCreateSubmissionOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Submit Content
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Submit Content</DialogTitle>
                  <DialogDescription>
                    Submit questions, stories, or suggestions for the creator
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Type</Label>
                    <Select value={newSubmissionType} onValueChange={(value: any) => setNewSubmissionType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="question">Question</SelectItem>
                        <SelectItem value="story">Success Story</SelectItem>
                        <SelectItem value="topic_suggestion">Topic Suggestion</SelectItem>
                        <SelectItem value="guest_suggestion">Guest Suggestion</SelectItem>
                        <SelectItem value="feedback">Feedback</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Title</Label>
                    <Input
                      placeholder="Brief title for your submission"
                      value={newSubmissionTitle}
                      onChange={(e) => setNewSubmissionTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Content</Label>
                    <Textarea
                      placeholder="Describe your submission in detail"
                      value={newSubmissionContent}
                      onChange={(e) => setNewSubmissionContent(e.target.value)}
                      rows={4}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsCreateSubmissionOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateSubmission}>
                      Submit
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-4">
            {submissions.map((submission) => (
              <UserSubmissionCard
                key={submission.id}
                submission={submission}
                onVote={voteOnSubmission}
                onRespond={respondToSubmission}
                isCreator={userProfile?.isAdmin || false}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="challenges" className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold">Community Challenges</h2>
            <p className="text-muted-foreground">
              Participate in community activities and earn rewards
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeChallenges.map((challenge) => (
              <Card key={challenge.id} className="bg-card/50 backdrop-blur border-border/50">
                {challenge.banner && (
                  <div className="aspect-video relative rounded-t-lg overflow-hidden">
                    <img
                      src={challenge.banner}
                      alt={challenge.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{challenge.title}</CardTitle>
                      <CardDescription>{challenge.description}</CardDescription>
                    </div>
                    <Badge variant={challenge.userParticipated ? 'default' : 'outline'}>
                      {challenge.userParticipated ? 'Joined' : 'Available'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Participants</span>
                    <span className="font-medium">{challenge.participantCount}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Ends</span>
                    <span className="font-medium">{new Date(challenge.endDate).toLocaleDateString()}</span>
                  </div>

                  {challenge.prizes && challenge.prizes.length > 0 && (
                    <div>
                      <h5 className="font-medium mb-2">Prizes</h5>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {challenge.prizes.map((prize, index) => (
                          <li key={index} className="flex items-center space-x-2">
                            <Gift className="h-3 w-3" />
                            <span>{prize}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <Button className="w-full" disabled={challenge.userParticipated}>
                    {challenge.userParticipated ? 'Already Joined' : 'Join Challenge'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="qa" className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold">Live Q&A Sessions</h2>
            <p className="text-muted-foreground">
              Join live sessions and get your questions answered directly
            </p>
          </div>

          <div className="space-y-4">
            {upcomingQASessions.map((session) => (
              <Card key={session.id} className="bg-card/50 backdrop-blur border-border/50">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <span>{session.title}</span>
                        {session.isVipOnly && <Crown className="h-4 w-4 text-yellow-500" />}
                      </CardTitle>
                      <CardDescription>{session.description}</CardDescription>
                    </div>
                    <Badge variant={session.userRegistered ? 'default' : 'outline'}>
                      {session.userRegistered ? 'Registered' : 'Available'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Date & Time</span>
                      <p className="font-medium">{new Date(session.scheduledFor).toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Duration</span>
                      <p className="font-medium">{session.duration} minutes</p>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button className="flex-1" disabled={session.userRegistered || session.isVipOnly}>
                      {session.userRegistered ? 'Registered' : session.isVipOnly ? 'VIP Only' : 'Register'}
                    </Button>
                    <Button variant="outline">
                      <Calendar className="h-4 w-4 mr-2" />
                      Add to Calendar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold">Community Leaderboard</h2>
            <p className="text-muted-foreground">
              Top contributors and most active community members
            </p>
          </div>

          {analytics && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-card/50 backdrop-blur border-border/50">
                <CardHeader>
                  <CardTitle>Top Contributors</CardTitle>
                  <CardDescription>Most active community members this month</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.topContributors.map((contributor, index) => (
                      <div key={contributor.userId} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Badge variant="outline" className="w-8 h-8 rounded-full p-0 flex items-center justify-center">
                            {index + 1}
                          </Badge>
                          <div>
                            <p className="font-medium">{contributor.userName}</p>
                            <p className="text-sm text-muted-foreground capitalize">
                              {contributor.contributions} {contributor.type}
                            </p>
                          </div>
                        </div>
                        {index === 0 && <Trophy className="h-5 w-5 text-yellow-500" />}
                        {index === 1 && <Award className="h-5 w-5 text-gray-400" />}
                        {index === 2 && <Award className="h-5 w-5 text-amber-600" />}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur border-border/50">
                <CardHeader>
                  <CardTitle>Trending Topics</CardTitle>
                  <CardDescription>Most discussed topics this week</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.popularTopics.map((topic, index) => (
                      <div key={topic.tag} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Badge variant="outline" className="w-8 h-8 rounded-full p-0 flex items-center justify-center">
                            {index + 1}
                          </Badge>
                          <div>
                            <p className="font-medium">#{topic.tag}</p>
                            <p className="text-sm text-muted-foreground">
                              {topic.count} posts
                            </p>
                          </div>
                        </div>
                        {topic.trending && (
                          <Badge variant="secondary" className="text-xs">
                            Trending
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="profile" className="space-y-6">
          {communityProfile && isLoggedIn ? (
            <>
              {/* Profile Header */}
              <Card className="bg-card/50 backdrop-blur border-border/50">
                <CardContent className="pt-6">
                  <div className="flex items-start space-x-6">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={communityProfile.avatar} />
                      <AvatarFallback className="text-lg">
                        {communityProfile.displayName[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h2 className="text-2xl font-bold">{communityProfile.displayName}</h2>
                        <Badge className="bg-blue-500">Level {communityProfile.level}</Badge>
                        {userProfile?.isVip && (
                          <Badge variant="secondary" className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-300 border-yellow-500/30">
                            <Crown className="w-3 h-3 mr-1" />
                            VIP
                          </Badge>
                        )}
                      </div>
                      {communityProfile.bio && (
                        <p className="text-muted-foreground mb-3">{communityProfile.bio}</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {communityProfile.badges.map((badge, index) => (
                          <Badge key={index} variant="outline">
                            {badge}
                          </Badge>
                        ))}
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground">
                        Member since {new Date(communityProfile.joinedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* Level Progress */}
                  <div className="mt-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-muted-foreground">
                        Level {communityProfile.level} Progress
                      </span>
                      <span className="text-sm font-medium">
                        {communityProfile.experience} / {communityProfile.nextLevelExperience} XP
                      </span>
                    </div>
                    <Progress 
                      value={(communityProfile.experience / communityProfile.nextLevelExperience) * 100} 
                      className="h-2"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Stats and Achievements */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Community Stats */}
                <Card className="bg-card/50 backdrop-blur border-border/50">
                  <CardHeader>
                    <CardTitle>Community Stats</CardTitle>
                    <CardDescription>Your contribution to the community</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold">{communityProfile.stats.postsCount}</p>
                        <p className="text-sm text-muted-foreground">Posts</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">{communityProfile.stats.repliesCount}</p>
                        <p className="text-sm text-muted-foreground">Replies</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">{communityProfile.stats.likesReceived}</p>
                        <p className="text-sm text-muted-foreground">Likes Received</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">{communityProfile.stats.challengesParticipated}</p>
                        <p className="text-sm text-muted-foreground">Challenges</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Achievements */}
                <Card className="bg-card/50 backdrop-blur border-border/50">
                  <CardHeader>
                    <CardTitle>Achievements</CardTitle>
                    <CardDescription>Your community accomplishments</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {communityProfile.achievements.length > 0 ? (
                        communityProfile.achievements.map((achievement) => (
                          <div key={achievement.id} className="flex items-center space-x-3">
                            <div className="text-2xl">{achievement.icon}</div>
                            <div>
                              <p className="font-medium">{achievement.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {achievement.description}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Earned {new Date(achievement.earnedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <Trophy className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">No achievements yet</p>
                          <p className="text-xs text-muted-foreground">Start participating to earn your first achievement!</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : !isLoggedIn ? (
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardContent className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Sign in to view your profile</h3>
                <p className="text-muted-foreground mb-4">
                  Join the community to track your stats, earn achievements, and connect with others.
                </p>
                <Button>Sign In</Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardContent className="text-center py-12">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading your profile...</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Comments Modal */}
      <PostCommentsModal
        post={selectedPostForComments}
        isOpen={isCommentsModalOpen}
        onClose={handleCloseComments}
      />
    </div>
  );
}