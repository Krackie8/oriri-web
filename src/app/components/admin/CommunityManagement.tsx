import React, { useState, useEffect } from 'react';
import { useCommunityEngagement } from '../../contexts/CommunityEngagementContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Progress } from '../ui/progress';
import { Skeleton } from '../ui/skeleton';
import { Alert, AlertDescription } from '../ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';
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
  Users,
  MessageSquare,
  Heart,
  TrendingUp,
  TrendingDown,
  Shield,
  Flag,
  Award,
  Crown,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  ThumbsUp,
  AlertTriangle,
  Star,
  Calendar,
  Target,
  Zap,
  Filter,
  Search,
  MoreHorizontal,
  Pin,
  Lock,
  Unlock,
  Trash2,
  Edit,
  Send,
  BookOpen,
  Gift,
  Trophy
} from 'lucide-react';

interface CommunityMetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
}

function CommunityMetricCard({ title, value, change, icon, description, trend, color = 'blue' }: CommunityMetricCardProps) {
  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-500';
    if (trend === 'down') return 'text-red-500';
    return 'text-muted-foreground';
  };

  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="h-3 w-3" />;
    if (trend === 'down') return <TrendingDown className="h-3 w-3" />;
    return null;
  };

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={`text-${color}-500`}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <div className={`flex items-center space-x-1 text-xs ${getTrendColor()}`}>
            {getTrendIcon()}
            <span>{change > 0 ? '+' : ''}{change.toFixed(1)}%</span>
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

interface PostModerationCardProps {
  post: any;
  onApprove: (postId: string) => void;
  onReject: (postId: string) => void;
  onPin: (postId: string) => void;
  onLock: (postId: string) => void;
  onDelete: (postId: string) => void;
}

function PostModerationCard({ post, onApprove, onReject, onPin, onLock, onDelete }: PostModerationCardProps) {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-500 border-green-500';
      case 'rejected': return 'text-red-500 border-red-500';
      case 'flagged': return 'text-yellow-500 border-yellow-500';
      default: return 'text-blue-500 border-blue-500';
    }
  };

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={post.authorAvatar} />
              <AvatarFallback>{post.authorName[0]}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="font-medium">{post.authorName}</h4>
                {post.isVip && <Crown className="h-4 w-4 text-yellow-500" />}
                {post.authorBadges.map((badge: string, index: number) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {badge}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span>{post.category}</span>
                <span>•</span>
                <span>{formatTimeAgo(post.createdAt)}</span>
                {post.isPinned && <Pin className="h-3 w-3 text-blue-500" />}
                {post.isLocked && <Lock className="h-3 w-3 text-red-500" />}
              </div>
            </div>
          </div>
          <Badge variant="outline" className={getStatusColor(post.status || 'pending')}>
            {post.status || 'pending'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium mb-1">{post.content}</p>
        </div>

        {/* Engagement Stats */}
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <div className="flex items-center space-x-1">
            <Heart className="h-3 w-3" />
            <span>{post.engagement.likes}</span>
          </div>
          <div className="flex items-center space-x-1">
            <MessageSquare className="h-3 w-3" />
            <span>{post.engagement.replies}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Eye className="h-3 w-3" />
            <span>{post.engagement.views}</span>
          </div>
        </div>

        {/* Moderation Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <div className="flex space-x-2">
            <Button size="sm" variant="outline" onClick={() => onPin(post.id)}>
              <Pin className="h-3 w-3 mr-1" />
              {post.isPinned ? 'Unpin' : 'Pin'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => onLock(post.id)}>
              {post.isLocked ? <Unlock className="h-3 w-3 mr-1" /> : <Lock className="h-3 w-3 mr-1" />}
              {post.isLocked ? 'Unlock' : 'Lock'}
            </Button>
          </div>
          
          <div className="flex space-x-2">
            <Button 
              size="sm" 
              variant="outline" 
              className="text-green-600 hover:text-green-700"
              onClick={() => onApprove(post.id)}
              disabled={post.status === 'approved'}
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Approve
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="text-red-600 hover:text-red-700"
              onClick={() => onReject(post.id)}
              disabled={post.status === 'rejected'}
            >
              <XCircle className="h-3 w-3 mr-1" />
              Reject
            </Button>
            <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => onDelete(post.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface SubmissionModerationCardProps {
  submission: any;
  onApprove: (submissionId: string) => void;
  onFeature: (submissionId: string) => void;
  onReject: (submissionId: string, reason: string) => void;
  onRespond: (submissionId: string, response: string) => void;
  onMarkUsed: (submissionId: string, episodeId: string) => void;
}

function SubmissionModerationCard({ submission, onApprove, onFeature, onReject, onRespond, onMarkUsed }: SubmissionModerationCardProps) {
  const [response, setResponse] = useState('');
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

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
    if (response.trim()) {
      onRespond(submission.id, response);
      setResponse('');
      setShowResponseForm(false);
    }
  };

  const handleReject = () => {
    if (rejectReason.trim()) {
      onReject(submission.id, rejectReason);
      setRejectReason('');
      setShowRejectForm(false);
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
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 text-sm text-muted-foreground">
              <ThumbsUp className="h-3 w-3" />
              <span>{submission.votes}</span>
            </div>
            <Badge variant="outline" className={getStatusColor(submission.status)}>
              {submission.status}
            </Badge>
          </div>
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

        {/* Creator Response */}
        {submission.creatorResponse && (
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Crown className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium text-blue-500">Your Response</span>
            </div>
            <p className="text-sm">{submission.creatorResponse.message}</p>
          </div>
        )}

        {/* Used in Episode */}
        {submission.usedInEpisode && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Used in <strong>{submission.usedInEpisode.episodeTitle}</strong>
            </AlertDescription>
          </Alert>
        )}

        {/* Moderation Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <div className="flex space-x-2">
            <Button size="sm" onClick={() => onApprove(submission.id)} disabled={submission.status !== 'pending'}>
              <CheckCircle className="h-3 w-3 mr-1" />
              Approve
            </Button>
            <Button size="sm" variant="outline" onClick={() => onFeature(submission.id)} disabled={submission.status === 'rejected'}>
              <Star className="h-3 w-3 mr-1" />
              Feature
            </Button>
          </div>
          
          <div className="flex space-x-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setShowResponseForm(!showResponseForm)}
              disabled={!!submission.creatorResponse}
            >
              <Send className="h-3 w-3 mr-1" />
              Respond
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="text-red-600 hover:text-red-700"
              onClick={() => setShowRejectForm(!showRejectForm)}
              disabled={submission.status === 'rejected'}
            >
              <XCircle className="h-3 w-3 mr-1" />
              Reject
            </Button>
          </div>
        </div>

        {/* Response Form */}
        {showResponseForm && (
          <div className="space-y-3 pt-3 border-t border-border/50">
            <Label>Response to {submission.userName}</Label>
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

        {/* Reject Form */}
        {showRejectForm && (
          <div className="space-y-3 pt-3 border-t border-border/50">
            <Label>Rejection Reason</Label>
            <Textarea
              placeholder="Explain why this submission is being rejected..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={2}
            />
            <div className="flex space-x-2">
              <Button size="sm" variant="destructive" onClick={handleReject}>
                Reject Submission
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowRejectForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function CommunityManagement() {
  const {
    posts,
    submissions,
    challenges,
    analytics,
    pinPost,
    lockPost,
    deletePost,
    approvePost,
    rejectPost,
    approveSubmission,
    featureSubmission,
    rejectSubmission,
    respondToSubmission,
    markSubmissionUsed,
    createChallenge,
    updateChallenge,
    isLoading
  } = useCommunityEngagement();

  const [activeTab, setActiveTab] = useState('overview');
  const [selectedTimeframe, setSelectedTimeframe] = useState('7d');
  const [isCreateChallengeOpen, setIsCreateChallengeOpen] = useState(false);
  const [newChallengeTitle, setNewChallengeTitle] = useState('');
  const [newChallengeDescription, setNewChallengeDescription] = useState('');
  const [newChallengeType, setNewChallengeType] = useState<'weekly_topic' | 'photo_challenge' | 'story_share' | 'prediction' | 'goal_setting'>('weekly_topic');

  const pendingPosts = posts.filter(p => !p.isPinned && !p.isLocked);
  const pinnedPosts = posts.filter(p => p.isPinned);
  const pendingSubmissions = submissions.filter(s => s.status === 'pending');
  const approvedSubmissions = submissions.filter(s => s.status === 'approved' || s.status === 'featured');

  const handleCreateChallenge = async () => {
    if (!newChallengeTitle.trim() || !newChallengeDescription.trim()) return;

    try {
      await createChallenge({
        title: newChallengeTitle,
        description: newChallengeDescription,
        type: newChallengeType,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        isActive: true,
      });

      setNewChallengeTitle('');
      setNewChallengeDescription('');
      setIsCreateChallengeOpen(false);
    } catch (error) {
      console.error('Error creating challenge:', error);
    }
  };

  // Mock data for charts
  const engagementTrend = Array.from({ length: 7 }, (_, i) => ({
    day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
    posts: Math.floor(Math.random() * 15 + 5),
    comments: Math.floor(Math.random() * 40 + 10),
    likes: Math.floor(Math.random() * 100 + 30),
  }));

  const membershipGrowth = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    newMembers: Math.floor(Math.random() * 10 + 1),
    totalMembers: 1200 + i * 5,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold">Community Management</h1>
          <p className="text-muted-foreground">
            Moderate content, manage challenges, and track community health
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>

          <Dialog open={isCreateChallengeOpen} onOpenChange={setIsCreateChallengeOpen}>
            <DialogTrigger asChild>
              <Button>
                <Trophy className="h-4 w-4 mr-2" />
                Create Challenge
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Challenge</DialogTitle>
                <DialogDescription>
                  Create a new community challenge to boost engagement
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Challenge Type</Label>
                  <Select value={newChallengeType} onValueChange={(value: any) => setNewChallengeType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly_topic">Weekly Topic</SelectItem>
                      <SelectItem value="photo_challenge">Photo Challenge</SelectItem>
                      <SelectItem value="story_share">Story Share</SelectItem>
                      <SelectItem value="prediction">Prediction</SelectItem>
                      <SelectItem value="goal_setting">Goal Setting</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Title</Label>
                  <Input
                    placeholder="Challenge title"
                    value={newChallengeTitle}
                    onChange={(e) => setNewChallengeTitle(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Describe the challenge and instructions"
                    value={newChallengeDescription}
                    onChange={(e) => setNewChallengeDescription(e.target.value)}
                    rows={4}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCreateChallengeOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateChallenge}>
                    Create Challenge
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="moderation">Moderation</TabsTrigger>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
          <TabsTrigger value="challenges">Challenges</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          {analytics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <CommunityMetricCard
                title="Total Members"
                value={analytics.totalMembers.toLocaleString()}
                change={12.5}
                trend="up"
                icon={<Users className="h-4 w-4" />}
                description={`${analytics.activeMembers} active this week`}
                color="blue"
              />
              <CommunityMetricCard
                title="Pending Posts"
                value={pendingPosts.length}
                icon={<MessageSquare className="h-4 w-4" />}
                description="Awaiting moderation"
                color="yellow"
              />
              <CommunityMetricCard
                title="Pending Submissions"
                value={pendingSubmissions.length}
                icon={<Flag className="h-4 w-4" />}
                description="Needs review"
                color="orange"
              />
              <CommunityMetricCard
                title="Active Challenges"
                value={challenges.filter(c => c.isActive).length}
                icon={<Trophy className="h-4 w-4" />}
                description="Running challenges"
                color="purple"
              />
            </div>
          )}

          {/* Quick Actions */}
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common community management tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" className="h-20 flex-col space-y-2">
                  <Shield className="h-6 w-6" />
                  <span>Review Flagged Content</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col space-y-2">
                  <Award className="h-6 w-6" />
                  <span>Award Achievements</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col space-y-2">
                  <Zap className="h-6 w-6" />
                  <span>Boost Engagement</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle>Recent Posts</CardTitle>
                <CardDescription>Latest community posts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {posts.slice(0, 5).map((post) => (
                    <div key={post.id} className="flex items-start space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={post.authorAvatar} />
                        <AvatarFallback>{post.authorName[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{post.authorName}</p>
                        <p className="text-sm text-muted-foreground truncate">{post.content}</p>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
                          <Heart className="h-3 w-3" />
                          <span>{post.engagement.likes}</span>
                          <MessageSquare className="h-3 w-3" />
                          <span>{post.engagement.replies}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle>Top Contributors</CardTitle>
                <CardDescription>Most active community members</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics?.topContributors.map((contributor, index) => (
                    <div key={contributor.userId} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline" className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs">
                          {index + 1}
                        </Badge>
                        <div>
                          <p className="font-medium">{contributor.userName}</p>
                          <p className="text-sm text-muted-foreground capitalize">
                            {contributor.contributions} {contributor.type}
                          </p>
                        </div>
                      </div>
                      {index === 0 && <Trophy className="h-4 w-4 text-yellow-500" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="moderation" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Content Moderation</h2>
              <p className="text-muted-foreground">
                Review and moderate community posts
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search posts..." className="pl-10 w-64" />
              </div>
            </div>
          </div>

          {/* Pinned Posts Section */}
          {pinnedPosts.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center space-x-2">
                <Pin className="h-4 w-4 text-blue-500" />
                <span>Pinned Posts</span>
              </h3>
              {pinnedPosts.map((post) => (
                <PostModerationCard
                  key={post.id}
                  post={post}
                  onApprove={approvePost}
                  onReject={rejectPost}
                  onPin={pinPost}
                  onLock={lockPost}
                  onDelete={deletePost}
                />
              ))}
            </div>
          )}

          {/* Regular Posts */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Recent Posts</h3>
            {pendingPosts.slice(0, 10).map((post) => (
              <PostModerationCard
                key={post.id}
                post={post}
                onApprove={approvePost}
                onReject={rejectPost}
                onPin={pinPost}
                onLock={lockPost}
                onDelete={deletePost}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="submissions" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">User Submissions</h2>
              <p className="text-muted-foreground">
                Review questions, stories, and suggestions from the community
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                {pendingSubmissions.length} pending review
              </Badge>
            </div>
          </div>

          {/* Pending Submissions */}
          {pendingSubmissions.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center space-x-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                <span>Pending Review</span>
              </h3>
              {pendingSubmissions.map((submission) => (
                <SubmissionModerationCard
                  key={submission.id}
                  submission={submission}
                  onApprove={approveSubmission}
                  onFeature={featureSubmission}
                  onReject={rejectSubmission}
                  onRespond={respondToSubmission}
                  onMarkUsed={markSubmissionUsed}
                />
              ))}
            </div>
          )}

          {/* Approved Submissions */}
          {approvedSubmissions.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Approved Submissions</span>
              </h3>
              {approvedSubmissions.slice(0, 5).map((submission) => (
                <SubmissionModerationCard
                  key={submission.id}
                  submission={submission}
                  onApprove={approveSubmission}
                  onFeature={featureSubmission}
                  onReject={rejectSubmission}
                  onRespond={respondToSubmission}
                  onMarkUsed={markSubmissionUsed}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="challenges" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Community Challenges</h2>
              <p className="text-muted-foreground">
                Manage and create community challenges
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {challenges.map((challenge) => (
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
                    <div className="flex items-center space-x-2">
                      <Badge variant={challenge.isActive ? 'default' : 'secondary'}>
                        {challenge.isActive ? 'Active' : 'Ended'}
                      </Badge>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Participants</span>
                      <p className="font-medium">{challenge.participantCount}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Submissions</span>
                      <p className="font-medium">{challenge.submissions.length}</p>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => updateChallenge(challenge.id, { isActive: !challenge.isActive })}
                    >
                      {challenge.isActive ? 'End' : 'Restart'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {/* Community Growth Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle>Engagement Trends</CardTitle>
                <CardDescription>Daily community activity</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={engagementTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Line type="monotone" dataKey="posts" stroke="#8B5CF6" name="Posts" strokeWidth={2} />
                    <Line type="monotone" dataKey="comments" stroke="#3B82F6" name="Comments" strokeWidth={2} />
                    <Line type="monotone" dataKey="likes" stroke="#EF4444" name="Likes" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle>Member Growth</CardTitle>
                <CardDescription>New members over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={membershipGrowth.slice(-7)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="newMembers" fill="#10B981" name="New Members" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Engagement Metrics */}
          {analytics && (
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle>Community Health Metrics</CardTitle>
                <CardDescription>Key indicators of community engagement</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-500">{analytics.engagementRate}%</div>
                    <p className="text-sm text-muted-foreground">Engagement Rate</p>
                    <Progress value={analytics.engagementRate} className="mt-2" />
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-500">{analytics.activeMembers}</div>
                    <p className="text-sm text-muted-foreground">Active Members</p>
                    <Progress value={(analytics.activeMembers / analytics.totalMembers) * 100} className="mt-2" />
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-500">{analytics.postsThisWeek}</div>
                    <p className="text-sm text-muted-foreground">Posts This Week</p>
                    <Progress value={Math.min((analytics.postsThisWeek / 100) * 100, 100)} className="mt-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}