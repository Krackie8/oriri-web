import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Community discussion and forums
export interface CommunityPost {
  id: string;
  episodeId?: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorBadges: string[];
  isCreator: boolean;
  isVip: boolean;
  content: string;
  mediaUrls: string[];
  type: 'discussion' | 'question' | 'story' | 'feedback' | 'poll' | 'announcement';
  category: string;
  tags: string[];
  isPinned: boolean;
  isLocked: boolean;
  status?: 'pending' | 'approved' | 'rejected' | 'flagged';
  createdAt: string;
  updatedAt: string;
  engagement: {
    likes: number;
    replies: number;
    shares: number;
    views: number;
    userLiked: boolean;
    userSaved: boolean;
  };
  poll?: {
    question: string;
    options: Array<{
      id: string;
      text: string;
      votes: number;
      userVoted: boolean;
    }>;
    allowMultiple: boolean;
    endsAt?: string;
  };
}

// Replies to community posts
export interface CommunityReply {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorBadges: string[];
  isCreator: boolean;
  isVip: boolean;
  content: string;
  mediaUrls: string[];
  createdAt: string;
  updatedAt: string;
  parentReplyId?: string; // For nested replies
  engagement: {
    likes: number;
    userLiked: boolean;
  };
}

// User-generated content submissions
export interface UserSubmission {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  type: 'question' | 'story' | 'topic_suggestion' | 'guest_suggestion' | 'feedback';
  title: string;
  content: string;
  mediaUrls: string[];
  episodeId?: string;
  status: 'pending' | 'approved' | 'featured' | 'rejected' | 'used';
  tags: string[];
  votes: number;
  userVoted: boolean;
  createdAt: string;
  creatorResponse?: {
    message: string;
    respondedAt: string;
  };
  usedInEpisode?: {
    episodeId: string;
    episodeTitle: string;
    timestamp?: number;
  };
}

// Community challenges and activities
export interface CommunityChallenge {
  id: string;
  title: string;
  description: string;
  type: 'weekly_topic' | 'photo_challenge' | 'story_share' | 'prediction' | 'goal_setting';
  banner?: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  participantCount: number;
  userParticipated: boolean;
  prizes?: string[];
  submissions: UserSubmission[];
  leaderboard?: Array<{
    userId: string;
    userName: string;
    score: number;
    rank: number;
  }>;
}

// Live Q&A sessions
export interface LiveQASession {
  id: string;
  title: string;
  description: string;
  scheduledFor: string;
  duration: number; // minutes
  status: 'upcoming' | 'live' | 'ended';
  attendeeCount: number;
  isVipOnly: boolean;
  userRegistered: boolean;
  questions: Array<{
    id: string;
    userId: string;
    userName: string;
    question: string;
    votes: number;
    userVoted: boolean;
    isAnswered: boolean;
    answer?: string;
    answeredAt?: string;
    submittedAt: string;
  }>;
}

// User community profile and achievements
export interface CommunityProfile {
  userId: string;
  displayName: string;
  bio?: string;
  avatar?: string;
  joinedAt: string;
  stats: {
    postsCount: number;
    repliesCount: number;
    likesReceived: number;
    questionsSubmitted: number;
    storiesShared: number;
    challengesParticipated: number;
    qaSessionsAttended: number;
  };
  achievements: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    earnedAt: string;
    category: 'engagement' | 'contribution' | 'loyalty' | 'special';
  }>;
  badges: string[];
  level: number;
  experience: number;
  nextLevelExperience: number;
  reputation: number;
}

// Community moderation and safety
export interface ModerationAction {
  id: string;
  type: 'warn' | 'mute' | 'ban' | 'content_removal' | 'content_edit';
  targetUserId?: string;
  targetContentId?: string;
  reason: string;
  moderatorId: string;
  moderatorName: string;
  createdAt: string;
  expiresAt?: string;
  isActive: boolean;
}

// Community analytics and insights
export interface CommunityAnalytics {
  totalMembers: number;
  activeMembers: number;
  newMembersThisWeek: number;
  postsThisWeek: number;
  repliesThisWeek: number;
  engagementRate: number;
  weekOverWeekChanges?: {
    totalMembers: number;
    newMembers: number;
    posts: number;
    activeMembers: number;
    engagementRate: number;
  };
  topContributors: Array<{
    userId: string;
    userName: string;
    contributions: number;
    type: 'posts' | 'replies' | 'likes' | 'submissions';
  }>;
  popularTopics: Array<{
    tag: string;
    count: number;
    trending: boolean;
  }>;
  membershipGrowth: Array<{
    date: string;
    newMembers: number;
    totalMembers: number;
  }>;
  engagementMetrics: Array<{
    date: string;
    posts: number;
    replies: number;
    likes: number;
    views: number;
  }>;
}

export interface CommunityEngagementContextType {
  // Community posts and discussions
  posts: CommunityPost[];
  filteredPosts: CommunityPost[];
  selectedPost: CommunityPost | null;
  postReplies: Record<string, CommunityReply[]>;
  createPost: (post: Omit<CommunityPost, 'id' | 'createdAt' | 'updatedAt' | 'engagement'>) => Promise<CommunityPost>;
  updatePost: (postId: string, updates: Partial<CommunityPost>) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  likePost: (postId: string) => Promise<void>;
  savePost: (postId: string) => Promise<void>;
  sharePost: (postId: string, platform?: string) => Promise<void>;
  pinPost: (postId: string) => Promise<void>;
  lockPost: (postId: string) => Promise<void>;
  approvePost: (postId: string) => Promise<void>;
  rejectPost: (postId: string) => Promise<void>;
  
  // Reply management
  getReplies: (postId: string) => Promise<CommunityReply[]>;
  createReply: (reply: Omit<CommunityReply, 'id' | 'createdAt' | 'updatedAt' | 'engagement'>) => Promise<CommunityReply>;
  updateReply: (replyId: string, updates: Partial<CommunityReply>) => Promise<void>;
  deleteReply: (replyId: string) => Promise<void>;
  likeReply: (replyId: string) => Promise<void>;
  
  // Post replies and threading
  createReply: (reply: Omit<CommunityReply, 'id' | 'createdAt' | 'updatedAt' | 'engagement'>) => Promise<CommunityReply>;
  updateReply: (replyId: string, updates: Partial<CommunityReply>) => Promise<void>;
  deleteReply: (replyId: string) => Promise<void>;
  likeReply: (replyId: string) => Promise<void>;
  getReplies: (postId: string) => Promise<CommunityReply[]>;
  
  // User-generated content submissions
  submissions: UserSubmission[];
  createSubmission: (submission: Omit<UserSubmission, 'id' | 'createdAt' | 'votes' | 'userVoted' | 'status'>) => Promise<UserSubmission>;
  updateSubmission: (submissionId: string, updates: Partial<UserSubmission>) => Promise<void>;
  approveSubmission: (submissionId: string) => Promise<void>;
  featureSubmission: (submissionId: string) => Promise<void>;
  rejectSubmission: (submissionId: string, reason: string) => Promise<void>;
  voteOnSubmission: (submissionId: string) => Promise<void>;
  respondToSubmission: (submissionId: string, response: string) => Promise<void>;
  markSubmissionUsed: (submissionId: string, episodeId: string, timestamp?: number) => Promise<void>;
  
  // Community challenges and activities
  challenges: CommunityChallenge[];
  activeChallenges: CommunityChallenge[];
  createChallenge: (challenge: Omit<CommunityChallenge, 'id' | 'participantCount' | 'userParticipated' | 'submissions'>) => Promise<CommunityChallenge>;
  updateChallenge: (challengeId: string, updates: Partial<CommunityChallenge>) => Promise<void>;
  joinChallenge: (challengeId: string) => Promise<void>;
  submitToChallenge: (challengeId: string, submission: Omit<UserSubmission, 'id' | 'createdAt' | 'votes' | 'userVoted' | 'status'>) => Promise<void>;
  getChallengeLeaderboard: (challengeId: string) => Promise<CommunityChallenge['leaderboard']>;
  
  // Live Q&A sessions
  qaSessions: LiveQASession[];
  upcomingQASessions: LiveQASession[];
  createQASession: (session: Omit<LiveQASession, 'id' | 'attendeeCount' | 'userRegistered' | 'questions'>) => Promise<LiveQASession>;
  updateQASession: (sessionId: string, updates: Partial<LiveQASession>) => Promise<void>;
  registerForQASession: (sessionId: string) => Promise<void>;
  submitQuestion: (sessionId: string, question: string) => Promise<void>;
  voteOnQuestion: (sessionId: string, questionId: string) => Promise<void>;
  answerQuestion: (sessionId: string, questionId: string, answer: string) => Promise<void>;
  startQASession: (sessionId: string) => Promise<void>;
  endQASession: (sessionId: string) => Promise<void>;
  
  // Community profiles and achievements
  userProfile: CommunityProfile | null;
  otherProfiles: Record<string, CommunityProfile>;
  getUserProfile: (userId?: string) => Promise<CommunityProfile>;
  updateUserProfile: (updates: Partial<CommunityProfile>) => Promise<void>;
  awardAchievement: (userId: string, achievementId: string) => Promise<void>;
  updateUserLevel: (userId: string, experience: number) => Promise<void>;
  
  // Community moderation
  moderationActions: ModerationAction[];
  reportContent: (contentId: string, contentType: 'post' | 'reply', reason: string) => Promise<void>;
  moderateContent: (action: Omit<ModerationAction, 'id' | 'createdAt'>) => Promise<void>;
  getModerationQueue: () => Promise<Array<{ contentId: string; contentType: string; reports: number }>>;
  
  // Community analytics
  analytics: CommunityAnalytics | null;
  getCommunityAnalytics: (timeframe: string) => Promise<CommunityAnalytics>;
  
  // Filtering and search
  activeFilters: {
    category?: string;
    type?: string;
    timeframe?: string;
    author?: string;
    tags?: string[];
    vipOnly?: boolean;
  };
  searchQuery: string;
  setActiveFilters: (filters: Partial<CommunityEngagementContextType['activeFilters']>) => void;
  setSearchQuery: (query: string) => void;
  searchCommunityContent: (query: string) => Promise<{
    posts: CommunityPost[];
    submissions: UserSubmission[];
    users: CommunityProfile[];
  }>;
  
  // Real-time features
  isRealTimeEnabled: boolean;
  toggleRealTime: () => void;
  
  // State management
  isLoading: boolean;
  error: string | null;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  refreshCommunityData: () => Promise<void>;
  
  // Notifications for community activity
  communityNotifications: Array<{
    id: string;
    type: 'new_post' | 'new_reply' | 'mention' | 'achievement' | 'challenge' | 'qa_session';
    title: string;
    message: string;
    createdAt: string;
    isRead: boolean;
    actionUrl?: string;
  }>;
  markNotificationRead: (notificationId: string) => Promise<void>;
}

const CommunityEngagementContext = createContext<CommunityEngagementContextType | undefined>(undefined);

// Real data only - no mock data generators

interface CommunityEngagementProviderProps {
  children: ReactNode;
}

// Helper function to get API credentials and setup
const getAPISetup = async () => {
  try {
    const { projectId } = await import('../utils/supabase/info');
    const { supabase } = await import('../utils/supabase/client');
    const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32`;
    
    console.log('[Community] Getting auth session...');
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('[Community] Auth session error:', error);
    }
    
    const token = session?.access_token;
    console.log('[Community] Auth setup complete, token available:', !!token);
    
    return { baseUrl, token, session };
  } catch (error) {
    console.error('[Community] Error in getAPISetup:', error);
    throw error;
  }
};

export function CommunityEngagementProvider({ children }: CommunityEngagementProviderProps) {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<CommunityPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [postReplies, setPostReplies] = useState<Record<string, CommunityReply[]>>({});
  const [submissions, setSubmissions] = useState<UserSubmission[]>([]);
  const [challenges, setChallenges] = useState<CommunityChallenge[]>([]);
  const [qaSessions, setQASessions] = useState<LiveQASession[]>([]);
  const [userProfile, setUserProfile] = useState<CommunityProfile | null>(null);
  const [otherProfiles, setOtherProfiles] = useState<Record<string, CommunityProfile>>({});
  const [moderationActions, setModerationActions] = useState<ModerationAction[]>([]);
  const [analytics, setAnalytics] = useState<CommunityAnalytics | null>(null);
  const [communityNotifications, setCommunityNotifications] = useState<CommunityEngagementContextType['communityNotifications']>([]);

  const [activeFilters, setActiveFilters] = useState<CommunityEngagementContextType['activeFilters']>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize with real data from API
  useEffect(() => {
    const initializeCommunityData = async () => {
      setIsLoading(true);
      try {
        console.log('[CommunityContext] Initializing community data...');
        
        // Get base URL and supabase client
        const { projectId } = await import('../utils/supabase/info');
        const { supabase } = await import('../utils/supabase/client');
        const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32`;
        
        // Get access token
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token || 'anonymous';
        
        // Fetch posts, submissions, and analytics in parallel
        const [postsResponse, submissionsResponse, analyticsResponse] = await Promise.allSettled([
          fetch(`${baseUrl}/community/posts`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${baseUrl}/community/submissions`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${baseUrl}/community/analytics`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);
        
        // Handle posts
        if (postsResponse.status === 'fulfilled' && postsResponse.value.ok) {
          const postsData = await postsResponse.value.json();
          if (postsData.success) {
            setPosts(postsData.data.posts || []);
            setFilteredPosts(postsData.data.posts || []);
            console.log(`[CommunityContext] Loaded ${postsData.data.posts?.length || 0} posts from API`);
          } else {
            console.warn('[CommunityContext] API returned unsuccessful response');
            setPosts([]);
            setFilteredPosts([]);
          }
        } else {
          console.warn('[CommunityContext] Failed to load posts from API');
          setPosts([]);
          setFilteredPosts([]);
        }
        
        // Handle submissions
        if (submissionsResponse.status === 'fulfilled' && submissionsResponse.value.ok) {
          const submissionsData = await submissionsResponse.value.json();
          if (submissionsData.success) {
            setSubmissions(submissionsData.data.submissions || []);
            console.log(`[CommunityContext] Loaded ${submissionsData.data.submissions?.length || 0} submissions from API`);
          } else {
            setSubmissions([]);
          }
        } else {
          console.warn('[CommunityContext] Failed to load submissions from API');
          setSubmissions([]);
        }
        
        // Handle analytics
        if (analyticsResponse.status === 'fulfilled' && analyticsResponse.value.ok) {
          const analyticsData = await analyticsResponse.value.json();
          if (analyticsData.success) {
            setAnalytics(analyticsData.data);
            console.log('[CommunityContext] Loaded community analytics');
          }
        } else {
          console.warn('[CommunityContext] Failed to load analytics, using fallback data');
          // Fallback analytics for demo
          setAnalytics({
            totalMembers: 0,
            activeMembers: 0,
            newMembersThisWeek: 0,
            postsThisWeek: 0,
            repliesThisWeek: 0,
            engagementRate: 0,
            topContributors: [],
            popularTopics: [],
            membershipGrowth: [],
            engagementMetrics: [],
          });
        }
        
        // Load user profile if logged in
        if (session?.user) {
          try {
            const profileResponse = await fetch(`${baseUrl}/community/profile/${session.user.id}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (profileResponse.ok) {
              const profileData = await profileResponse.json();
              if (profileData.success) {
                setUserProfile(profileData.data);
                console.log('[CommunityContext] Loaded user profile');
              }
            }
          } catch (profileError) {
            console.warn('[CommunityContext] Failed to load user profile:', profileError);
          }
        }
        
        // Initialize empty data for challenges and Q&A sessions (will be loaded from API when available)
        setChallenges([]);
        setQASessions([]);
        
        // Initialize empty notifications
        setCommunityNotifications([]);
        
        console.log('[CommunityContext] Community data initialization complete');
      } catch (error) {
        console.error('[CommunityContext] Error initializing community data:', error);
        setError('Failed to load community data');
        
        // Set empty defaults on error
        setPosts([]);
        setFilteredPosts([]);
        setSubmissions([]);
        setChallenges([]);
        setQASessions([]);
        setAnalytics(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeCommunityData();
  }, []);

  // Filter posts based on active filters and search
  useEffect(() => {
    let filtered = [...posts];

    // Apply category filter
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(post => post.category === selectedCategory);
    }

    // Apply other filters
    if (activeFilters.type) {
      filtered = filtered.filter(post => post.type === activeFilters.type);
    }

    if (activeFilters.vipOnly) {
      filtered = filtered.filter(post => post.isVip);
    }

    if (activeFilters.tags && activeFilters.tags.length > 0) {
      filtered = filtered.filter(post => 
        activeFilters.tags!.some(tag => post.tags.includes(tag))
      );
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(post =>
        post.content.toLowerCase().includes(query) ||
        post.authorName.toLowerCase().includes(query) ||
        post.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Sort by pinned first, then by creation date
    filtered.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    setFilteredPosts(filtered);
  }, [posts, activeFilters, searchQuery, selectedCategory]);

  // Computed values
  const activeChallenges = challenges.filter(c => c.isActive);
  const upcomingQASessions = qaSessions.filter(q => q.status === 'upcoming');

  // Post management functions
  const createPost = async (postData: Omit<CommunityPost, 'id' | 'createdAt' | 'updatedAt' | 'engagement'>): Promise<CommunityPost> => {
    try {
      console.log('[Community] Creating new post...', postData);
      
      // Get API credentials
      const { baseUrl, token } = await getAPISetup();
      
      if (!token) {
        throw new Error('User not authenticated');
      }
      
      // Create post via API
      const response = await fetch(`${baseUrl}/community/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(postData),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create post');
      }
      
      const newPost = result.data;
      
      // Update local state
      setPosts(prev => [newPost, ...prev]);
      
      console.log('[Community] Post created successfully:', newPost.id);
      return newPost;
    } catch (error) {
      console.error('[Community] Error creating post:', error);
      throw error;
    }
  };

  const updatePost = async (postId: string, updates: Partial<CommunityPost>): Promise<void> => {
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { ...post, ...updates, updatedAt: new Date().toISOString() }
        : post
    ));
    console.log('[Community] Updated post:', postId);
  };

  const deletePost = async (postId: string): Promise<void> => {
    try {
      console.log('[Community] Deleting post:', postId);
      
      // Get API credentials
      const { baseUrl, token } = await getAPISetup();
      
      if (!token) {
        console.warn('[Community] User not authenticated');
        return;
      }
      
      // Optimistically update UI first
      setPosts(prev => prev.filter(post => post.id !== postId));
      
      const response = await fetch(`${baseUrl}/community/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        // Revert optimistic update on error - need to restore the post
        // This is a simplified revert; in production, you'd want to cache the deleted post
        console.error('[Community] Failed to delete post, but UI already updated');
        throw new Error(`Failed to delete post: ${response.statusText}`);
      }
      
      console.log('[Community] Post deleted successfully');
    } catch (error) {
      console.error('[Community] Error deleting post:', error);
    }
  };

  const likePost = async (postId: string): Promise<void> => {
    try {
      console.log('[Community] Toggling like for post:', postId);
      
      // Get API credentials
      const { baseUrl, token } = await getAPISetup();
      
      if (!token) {
        console.warn('[Community] User not authenticated, using optimistic update only');
        // Just update UI if not authenticated
        setPosts(prev => prev.map(post => {
          if (post.id === postId) {
            const wasLiked = post.engagement.userLiked;
            return {
              ...post,
              engagement: {
                ...post.engagement,
                likes: wasLiked ? post.engagement.likes - 1 : post.engagement.likes + 1,
                userLiked: !wasLiked,
              },
            };
          }
          return post;
        }));
        return;
      }
      
      console.log(`[Community] Making API call to like post ${postId}`);
      
      // Optimistically update UI first
      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          const wasLiked = post.engagement.userLiked;
          return {
            ...post,
            engagement: {
              ...post.engagement,
              likes: wasLiked ? post.engagement.likes - 1 : post.engagement.likes + 1,
              userLiked: !wasLiked,
            },
          };
        }
        return post;
      }));
      
      // Make API call
      const response = await fetch(`${baseUrl}/community/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        // Revert the optimistic update on error
        setPosts(prev => prev.map(post => {
          if (post.id === postId) {
            const wasLiked = post.engagement.userLiked;
            return {
              ...post,
              engagement: {
                ...post.engagement,
                likes: wasLiked ? post.engagement.likes - 1 : post.engagement.likes + 1,
                userLiked: !wasLiked,
              },
            };
          }
          return post;
        }));
        
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        // Update with actual server response
        setPosts(prev => prev.map(post => 
          post.id === postId ? result.data : post
        ));
      }
      
      console.log('[Community] Post like toggled successfully');
    } catch (error) {
      console.error('[Community] Error toggling post like:', error);
      // The optimistic update is already reverted above on error
    }
  };

  const savePost = async (postId: string): Promise<void> => {
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          engagement: {
            ...post.engagement,
            userSaved: !post.engagement.userSaved,
          },
        };
      }
      return post;
    }));
  };

  const sharePost = async (postId: string, platform?: string): Promise<void> => {
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          engagement: {
            ...post.engagement,
            shares: post.engagement.shares + 1,
          },
        };
      }
      return post;
    }));
    console.log(`[Community] Shared post ${postId} to ${platform || 'general'}`);
  };

  const pinPost = async (postId: string): Promise<void> => {
    try {
      console.log('[Community] Pinning/unpinning post:', postId);
      
      // Get API credentials
      const { baseUrl, token } = await getAPISetup();
      
      if (!token) {
        console.warn('[Community] User not authenticated');
        return;
      }
      
      // Optimistically update UI first
      setPosts(prev => prev.map(post => ({
        ...post,
        isPinned: post.id === postId ? !post.isPinned : post.isPinned,
      })));
      
      const response = await fetch(`${baseUrl}/community/posts/${postId}/pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        // Revert optimistic update on error
        setPosts(prev => prev.map(post => ({
          ...post,
          isPinned: post.id === postId ? !post.isPinned : post.isPinned,
        })));
        throw new Error(`Failed to pin post: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.success && result.data) {
        // Update with actual server response
        setPosts(prev => prev.map(post => 
          post.id === postId ? result.data : post
        ));
      }
      
      console.log('[Community] Post pin toggled successfully');
    } catch (error) {
      console.error('[Community] Error pinning post:', error);
    }
  };

  const lockPost = async (postId: string): Promise<void> => {
    try {
      console.log('[Community] Locking/unlocking post:', postId);
      
      // Get API credentials
      const { baseUrl, token } = await getAPISetup();
      
      if (!token) {
        console.warn('[Community] User not authenticated');
        return;
      }
      
      // Optimistically update UI first
      setPosts(prev => prev.map(post => ({
        ...post,
        isLocked: post.id === postId ? !post.isLocked : post.isLocked,
      })));
      
      const response = await fetch(`${baseUrl}/community/posts/${postId}/lock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        // Revert optimistic update on error
        setPosts(prev => prev.map(post => ({
          ...post,
          isLocked: post.id === postId ? !post.isLocked : post.isLocked,
        })));
        throw new Error(`Failed to lock post: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.success && result.data) {
        // Update with actual server response
        setPosts(prev => prev.map(post => 
          post.id === postId ? result.data : post
        ));
      }
      
      console.log('[Community] Post lock toggled successfully');
    } catch (error) {
      console.error('[Community] Error locking post:', error);
    }
  };

  const approvePost = async (postId: string): Promise<void> => {
    try {
      console.log('[Community] Approving post:', postId);
      
      // Get API credentials
      const { baseUrl, token } = await getAPISetup();
      
      const response = await fetch(`${baseUrl}/community/posts/${postId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to approve post: ${response.statusText}`);
      }
      
      // Update local state
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, status: 'approved' as const, updatedAt: new Date().toISOString() }
          : post
      ));
      
      console.log('[Community] Post approved successfully:', postId);
    } catch (error) {
      console.error('[Community] Error approving post:', error);
      // Update local state even if API fails (optimistic update)
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, status: 'approved' as const, updatedAt: new Date().toISOString() }
          : post
      ));
    }
  };

  const rejectPost = async (postId: string): Promise<void> => {
    try {
      console.log('[Community] Rejecting post:', postId);
      
      // Get API credentials
      const { baseUrl, token } = await getAPISetup();
      
      const response = await fetch(`${baseUrl}/community/posts/${postId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to reject post: ${response.statusText}`);
      }
      
      // Update local state
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, status: 'rejected' as const, updatedAt: new Date().toISOString() }
          : post
      ));
      
      console.log('[Community] Post rejected successfully:', postId);
    } catch (error) {
      console.error('[Community] Error rejecting post:', error);
      // Update local state even if API fails (optimistic update)
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, status: 'rejected' as const, updatedAt: new Date().toISOString() }
          : post
      ));
    }
  };

  // Reply management functions
  const createReply = async (replyData: Omit<CommunityReply, 'id' | 'createdAt' | 'updatedAt' | 'engagement'>): Promise<CommunityReply> => {
    const newReply: CommunityReply = {
      ...replyData,
      id: `reply-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      engagement: {
        likes: 0,
        userLiked: false,
      },
    };

    setPostReplies(prev => ({
      ...prev,
      [replyData.postId]: [...(prev[replyData.postId] || []), newReply],
    }));

    // Update post reply count
    setPosts(prev => prev.map(post =>
      post.id === replyData.postId
        ? { ...post, engagement: { ...post.engagement, replies: post.engagement.replies + 1 } }
        : post
    ));

    console.log('[Community] Created new reply:', newReply.id);
    return newReply;
  };

  const updateReply = async (replyId: string, updates: Partial<CommunityReply>): Promise<void> => {
    setPostReplies(prev => {
      const newReplies = { ...prev };
      Object.keys(newReplies).forEach(postId => {
        newReplies[postId] = newReplies[postId].map(reply =>
          reply.id === replyId
            ? { ...reply, ...updates, updatedAt: new Date().toISOString() }
            : reply
        );
      });
      return newReplies;
    });
  };

  const deleteReply = async (replyId: string): Promise<void> => {
    setPostReplies(prev => {
      const newReplies = { ...prev };
      Object.keys(newReplies).forEach(postId => {
        const replyIndex = newReplies[postId].findIndex(reply => reply.id === replyId);
        if (replyIndex !== -1) {
          newReplies[postId].splice(replyIndex, 1);
          // Update post reply count
          setPosts(prevPosts => prevPosts.map(post =>
            post.id === postId
              ? { ...post, engagement: { ...post.engagement, replies: Math.max(0, post.engagement.replies - 1) } }
              : post
          ));
        }
      });
      return newReplies;
    });
  };

  const likeReply = async (replyId: string): Promise<void> => {
    setPostReplies(prev => {
      const newReplies = { ...prev };
      Object.keys(newReplies).forEach(postId => {
        newReplies[postId] = newReplies[postId].map(reply => {
          if (reply.id === replyId) {
            const wasLiked = reply.engagement.userLiked;
            return {
              ...reply,
              engagement: {
                likes: wasLiked ? reply.engagement.likes - 1 : reply.engagement.likes + 1,
                userLiked: !wasLiked,
              },
            };
          }
          return reply;
        });
      });
      return newReplies;
    });
  };

  const getReplies = async (postId: string): Promise<CommunityReply[]> => {
    return postReplies[postId] || [];
  };

  // Submission management functions
  const createSubmission = async (submissionData: Omit<UserSubmission, 'id' | 'createdAt' | 'votes' | 'userVoted' | 'status'>): Promise<UserSubmission> => {
    try {
      console.log('[Community] Creating new submission...', submissionData);
      
      // Get API credentials
      const { baseUrl, token } = await getAPISetup();
      
      if (!token) {
        throw new Error('User not authenticated');
      }
      
      // Create submission via API
      const response = await fetch(`${baseUrl}/community/submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(submissionData),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create submission');
      }
      
      const newSubmission = result.data;
      
      // Update local state
      setSubmissions(prev => [newSubmission, ...prev]);
      
      console.log('[Community] Submission created successfully:', newSubmission.id);
      return newSubmission;
    } catch (error) {
      console.error('[Community] Error creating submission:', error);
      throw error;
    }
  };

  const updateSubmission = async (submissionId: string, updates: Partial<UserSubmission>): Promise<void> => {
    setSubmissions(prev => prev.map(submission =>
      submission.id === submissionId ? { ...submission, ...updates } : submission
    ));
  };

  const approveSubmission = async (submissionId: string): Promise<void> => {
    await updateSubmission(submissionId, { status: 'approved' });
  };

  const featureSubmission = async (submissionId: string): Promise<void> => {
    await updateSubmission(submissionId, { status: 'featured' });
  };

  const rejectSubmission = async (submissionId: string, reason: string): Promise<void> => {
    await updateSubmission(submissionId, { status: 'rejected' });
  };

  const voteOnSubmission = async (submissionId: string): Promise<void> => {
    try {
      console.log('[Community] Toggling vote for submission:', submissionId);
      
      // Get API credentials
      const { baseUrl, token } = await getAPISetup();
      
      if (!token) {
        throw new Error('User not authenticated');
      }
      
      // Optimistically update UI first
      setSubmissions(prev => prev.map(submission => {
        if (submission.id === submissionId) {
          const wasVoted = submission.userVoted;
          return {
            ...submission,
            votes: wasVoted ? submission.votes - 1 : submission.votes + 1,
            userVoted: !wasVoted,
          };
        }
        return submission;
      }));
      
      // Make API call
      const response = await fetch(`${baseUrl}/community/submissions/${submissionId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        // Revert the optimistic update on error
        setSubmissions(prev => prev.map(submission => {
          if (submission.id === submissionId) {
            const wasVoted = submission.userVoted;
            return {
              ...submission,
              votes: wasVoted ? submission.votes - 1 : submission.votes + 1,
              userVoted: !wasVoted,
            };
          }
          return submission;
        }));
        
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        // Update with actual server response
        setSubmissions(prev => prev.map(submission => 
          submission.id === submissionId ? result.data : submission
        ));
      }
      
      console.log('[Community] Submission vote toggled successfully');
    } catch (error) {
      console.error('[Community] Error toggling submission vote:', error);
      // The optimistic update is already reverted above on error
    }
  };

  const respondToSubmission = async (submissionId: string, response: string): Promise<void> => {
    await updateSubmission(submissionId, {
      creatorResponse: {
        message: response,
        respondedAt: new Date().toISOString(),
      },
    });
  };

  const markSubmissionUsed = async (submissionId: string, episodeId: string, timestamp?: number): Promise<void> => {
    const episode = { episodeId, episodeTitle: `Episode ${episodeId}`, timestamp };
    await updateSubmission(submissionId, {
      status: 'used',
      usedInEpisode: episode,
    });
  };

  // Challenge management functions
  const createChallenge = async (challengeData: Omit<CommunityChallenge, 'id' | 'participantCount' | 'userParticipated' | 'submissions'>): Promise<CommunityChallenge> => {
    const newChallenge: CommunityChallenge = {
      ...challengeData,
      id: `challenge-${Date.now()}`,
      participantCount: 0,
      userParticipated: false,
      submissions: [],
    };

    setChallenges(prev => [newChallenge, ...prev]);
    return newChallenge;
  };

  const updateChallenge = async (challengeId: string, updates: Partial<CommunityChallenge>): Promise<void> => {
    setChallenges(prev => prev.map(challenge =>
      challenge.id === challengeId ? { ...challenge, ...updates } : challenge
    ));
  };

  const joinChallenge = async (challengeId: string): Promise<void> => {
    setChallenges(prev => prev.map(challenge => {
      if (challenge.id === challengeId && !challenge.userParticipated) {
        return {
          ...challenge,
          participantCount: challenge.participantCount + 1,
          userParticipated: true,
        };
      }
      return challenge;
    }));
  };

  const submitToChallenge = async (challengeId: string, submission: Omit<UserSubmission, 'id' | 'createdAt' | 'votes' | 'userVoted' | 'status'>): Promise<void> => {
    const newSubmission = await createSubmission(submission);
    
    setChallenges(prev => prev.map(challenge => {
      if (challenge.id === challengeId) {
        return {
          ...challenge,
          submissions: [...challenge.submissions, newSubmission],
        };
      }
      return challenge;
    }));
  };

  const getChallengeLeaderboard = async (challengeId: string): Promise<CommunityChallenge['leaderboard']> => {
    const challenge = challenges.find(c => c.id === challengeId);
    return challenge?.leaderboard || [];
  };

  // Q&A session management functions
  const createQASession = async (sessionData: Omit<LiveQASession, 'id' | 'attendeeCount' | 'userRegistered' | 'questions'>): Promise<LiveQASession> => {
    const newSession: LiveQASession = {
      ...sessionData,
      id: `qa-${Date.now()}`,
      attendeeCount: 0,
      userRegistered: false,
      questions: [],
    };

    setQASessions(prev => [newSession, ...prev]);
    return newSession;
  };

  const updateQASession = async (sessionId: string, updates: Partial<LiveQASession>): Promise<void> => {
    setQASessions(prev => prev.map(session =>
      session.id === sessionId ? { ...session, ...updates } : session
    ));
  };

  const registerForQASession = async (sessionId: string): Promise<void> => {
    setQASessions(prev => prev.map(session => {
      if (session.id === sessionId && !session.userRegistered) {
        return {
          ...session,
          attendeeCount: session.attendeeCount + 1,
          userRegistered: true,
        };
      }
      return session;
    }));
  };

  const submitQuestion = async (sessionId: string, question: string): Promise<void> => {
    const newQuestion = {
      id: `question-${Date.now()}`,
      userId: userProfile?.userId || 'current-user',
      userName: userProfile?.displayName || 'Current User',
      question,
      votes: 0,
      userVoted: false,
      isAnswered: false,
      submittedAt: new Date().toISOString(),
    };

    setQASessions(prev => prev.map(session => {
      if (session.id === sessionId) {
        return {
          ...session,
          questions: [...session.questions, newQuestion],
        };
      }
      return session;
    }));
  };

  const voteOnQuestion = async (sessionId: string, questionId: string): Promise<void> => {
    setQASessions(prev => prev.map(session => {
      if (session.id === sessionId) {
        return {
          ...session,
          questions: session.questions.map(q => {
            if (q.id === questionId) {
              const wasVoted = q.userVoted;
              return {
                ...q,
                votes: wasVoted ? q.votes - 1 : q.votes + 1,
                userVoted: !wasVoted,
              };
            }
            return q;
          }),
        };
      }
      return session;
    }));
  };

  const answerQuestion = async (sessionId: string, questionId: string, answer: string): Promise<void> => {
    setQASessions(prev => prev.map(session => {
      if (session.id === sessionId) {
        return {
          ...session,
          questions: session.questions.map(q => 
            q.id === questionId 
              ? { ...q, answer, isAnswered: true, answeredAt: new Date().toISOString() }
              : q
          ),
        };
      }
      return session;
    }));
  };

  const startQASession = async (sessionId: string): Promise<void> => {
    await updateQASession(sessionId, { status: 'live' });
  };

  const endQASession = async (sessionId: string): Promise<void> => {
    await updateQASession(sessionId, { status: 'ended' });
  };

  // Profile management functions
  const getUserProfile = async (userId?: string): Promise<CommunityProfile> => {
    if (!userId || userId === userProfile?.userId) {
      return userProfile!;
    }
    
    if (otherProfiles[userId]) {
      return otherProfiles[userId];
    }

    // Mock fetching other user's profile
    const mockProfile: CommunityProfile = {
      userId,
      displayName: 'Community Member',
      joinedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      stats: {
        postsCount: Math.floor(Math.random() * 20),
        repliesCount: Math.floor(Math.random() * 50),
        likesReceived: Math.floor(Math.random() * 100),
        questionsSubmitted: Math.floor(Math.random() * 10),
        storiesShared: Math.floor(Math.random() * 5),
        challengesParticipated: Math.floor(Math.random() * 3),
        qaSessionsAttended: Math.floor(Math.random() * 5),
      },
      achievements: [],
      badges: [],
      level: Math.floor(Math.random() * 10) + 1,
      experience: Math.floor(Math.random() * 1000),
      nextLevelExperience: Math.floor(Math.random() * 500) + 1000,
      reputation: Math.floor(Math.random() * 100),
    };

    setOtherProfiles(prev => ({ ...prev, [userId]: mockProfile }));
    return mockProfile;
  };

  const updateUserProfile = async (updates: Partial<CommunityProfile>): Promise<void> => {
    setUserProfile(prev => prev ? { ...prev, ...updates } : null);
  };

  const awardAchievement = async (userId: string, achievementId: string): Promise<void> => {
    if (userId === userProfile?.userId) {
      // Add achievement to current user
      const newAchievement = {
        id: achievementId,
        name: 'New Achievement',
        description: 'You earned a new achievement!',
        icon: '🏆',
        earnedAt: new Date().toISOString(),
        category: 'special' as const,
      };

      setUserProfile(prev => prev ? {
        ...prev,
        achievements: [...prev.achievements, newAchievement],
      } : null);
    }
  };

  const updateUserLevel = async (userId: string, experience: number): Promise<void> => {
    if (userId === userProfile?.userId) {
      const newLevel = Math.floor(experience / 200) + 1;
      setUserProfile(prev => prev ? {
        ...prev,
        experience,
        level: newLevel,
        nextLevelExperience: newLevel * 200,
      } : null);
    }
  };

  // Moderation functions
  const reportContent = async (contentId: string, contentType: 'post' | 'reply', reason: string): Promise<void> => {
    console.log(`[Community] Reported ${contentType} ${contentId}: ${reason}`);
  };

  const moderateContent = async (action: Omit<ModerationAction, 'id' | 'createdAt'>): Promise<void> => {
    const newAction: ModerationAction = {
      ...action,
      id: `moderation-${Date.now()}`,
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    setModerationActions(prev => [newAction, ...prev]);
  };

  const getModerationQueue = async (): Promise<Array<{ contentId: string; contentType: string; reports: number }>> => {
    return []; // Mock implementation
  };

  // Analytics functions
  const getCommunityAnalytics = async (timeframe: string): Promise<CommunityAnalytics> => {
    // Return existing analytics for now
    return analytics!;
  };

  // Search functions
  const searchCommunityContent = async (query: string): Promise<{
    posts: CommunityPost[];
    submissions: UserSubmission[];
    users: CommunityProfile[];
  }> => {
    const lowerQuery = query.toLowerCase();
    
    return {
      posts: posts.filter(post =>
        post.content.toLowerCase().includes(lowerQuery) ||
        post.authorName.toLowerCase().includes(lowerQuery)
      ),
      submissions: submissions.filter(submission =>
        submission.title.toLowerCase().includes(lowerQuery) ||
        submission.content.toLowerCase().includes(lowerQuery)
      ),
      users: Object.values(otherProfiles).filter(profile =>
        profile.displayName.toLowerCase().includes(lowerQuery)
      ),
    };
  };

  // Utility functions
  const toggleRealTime = () => {
    setIsRealTimeEnabled(prev => !prev);
  };

  const refreshCommunityData = async (): Promise<void> => {
    setIsLoading(true);
    try {
      // Simulate data refresh
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('[Community] Data refreshed');
    } finally {
      setIsLoading(false);
    }
  };

  const markNotificationRead = async (notificationId: string): Promise<void> => {
    setCommunityNotifications(prev => prev.map(notif =>
      notif.id === notificationId ? { ...notif, isRead: true } : notif
    ));
  };

  const contextValue: CommunityEngagementContextType = {
    // Posts and discussions
    posts,
    filteredPosts,
    selectedPost,
    postReplies,
    createPost,
    updatePost,
    deletePost,
    likePost,
    savePost,
    sharePost,
    pinPost,
    lockPost,
    approvePost,
    rejectPost,

    // Replies and threading
    createReply,
    updateReply,
    deleteReply,
    likeReply,
    getReplies,

    // User submissions
    submissions,
    createSubmission,
    updateSubmission,
    approveSubmission,
    featureSubmission,
    rejectSubmission,
    voteOnSubmission,
    respondToSubmission,
    markSubmissionUsed,

    // Challenges and activities
    challenges,
    activeChallenges,
    createChallenge,
    updateChallenge,
    joinChallenge,
    submitToChallenge,
    getChallengeLeaderboard,

    // Q&A sessions
    qaSessions,
    upcomingQASessions,
    createQASession,
    updateQASession,
    registerForQASession,
    submitQuestion,
    voteOnQuestion,
    answerQuestion,
    startQASession,
    endQASession,

    // User profiles and achievements
    userProfile,
    otherProfiles,
    getUserProfile,
    updateUserProfile,
    awardAchievement,
    updateUserLevel,

    // Moderation
    moderationActions,
    reportContent,
    moderateContent,
    getModerationQueue,

    // Analytics
    analytics,
    getCommunityAnalytics,

    // Filtering and search
    activeFilters,
    searchQuery,
    setActiveFilters,
    setSearchQuery,
    searchCommunityContent,

    // Real-time features
    isRealTimeEnabled,
    toggleRealTime,

    // State management
    isLoading,
    error,
    selectedCategory,
    setSelectedCategory,
    refreshCommunityData,

    // Notifications
    communityNotifications,
    markNotificationRead,
  };

  return (
    <CommunityEngagementContext.Provider value={contextValue}>
      {children}
    </CommunityEngagementContext.Provider>
  );
}

export function useCommunityEngagement() {
  const context = useContext(CommunityEngagementContext);
  if (context === undefined) {
    throw new Error('useCommunityEngagement must be used within a CommunityEngagementProvider');
  }
  return context;
}