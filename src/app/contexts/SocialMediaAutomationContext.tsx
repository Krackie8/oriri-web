import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Social media platform configurations
export interface SocialPlatform {
  id: string;
  name: string;
  displayName: string;
  isConnected: boolean;
  isEnabled: boolean;
  icon: string;
  color: string;
  characterLimit: number;
  supportsImages: boolean;
  supportsVideo: boolean;
  supportsThreads: boolean;
  supportsHashtags: boolean;
  optimalPostingTimes: Array<{ day: string; hours: number[] }>;
}

// Post template configurations
export interface PostTemplate {
  id: string;
  name: string;
  platform: string;
  template: string;
  variables: string[];
  isActive: boolean;
  engagement: {
    averageLikes: number;
    averageShares: number;
    averageComments: number;
    clickThroughRate: number;
  };
}

// Content generation settings
export interface ContentGeneration {
  useAI: boolean;
  tone: 'professional' | 'casual' | 'energetic' | 'inspirational' | 'conversational';
  includeQuotes: boolean;
  includeStats: boolean;
  includeCallToAction: boolean;
  customHashtags: string[];
  mentionStrategy: 'none' | 'guests' | 'collaborators' | 'all';
}

// Scheduled social media posts
export interface ScheduledPost {
  id: string;
  episodeId: string;
  episodeTitle: string;
  platform: string;
  content: string;
  mediaUrls: string[];
  hashtags: string[];
  scheduledTime: string;
  status: 'scheduled' | 'posted' | 'failed' | 'cancelled';
  actualPostTime?: string;
  engagement?: {
    likes: number;
    shares: number;
    comments: number;
    clicks: number;
    reach: number;
    impressions: number;
  };
  errorMessage?: string;
}

// Social media analytics
export interface SocialAnalytics {
  platform: string;
  timeframe: string;
  metrics: {
    totalPosts: number;
    totalEngagement: number;
    averageEngagement: number;
    followerGrowth: number;
    reachGrowth: number;
    clickThroughRate: number;
    bestPerformingPost: {
      id: string;
      content: string;
      engagement: number;
    };
  };
  audienceInsights: {
    demographics: Array<{ age: string; percentage: number }>;
    interests: Array<{ interest: string; affinity: number }>;
    activeHours: Array<{ hour: number; engagement: number }>;
  };
}

// Hashtag and trend analysis
export interface HashtagAnalysis {
  hashtag: string;
  popularity: number;
  trending: boolean;
  relatedTags: string[];
  suggestedUsage: string;
  performance: {
    reach: number;
    engagement: number;
    competition: 'low' | 'medium' | 'high';
  };
}

export interface SocialMediaAutomationContextType {
  // Platform management
  platforms: SocialPlatform[];
  connectedPlatforms: SocialPlatform[];
  connectPlatform: (platformId: string, credentials: any) => Promise<void>;
  disconnectPlatform: (platformId: string) => Promise<void>;
  updatePlatformSettings: (platformId: string, settings: Partial<SocialPlatform>) => Promise<void>;
  
  // Post templates
  templates: PostTemplate[];
  createTemplate: (template: Omit<PostTemplate, 'id' | 'engagement'>) => Promise<PostTemplate>;
  updateTemplate: (id: string, updates: Partial<PostTemplate>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  
  // Content generation
  contentSettings: ContentGeneration;
  updateContentSettings: (settings: Partial<ContentGeneration>) => void;
  generatePostContent: (episodeId: string, platform: string, template?: string) => Promise<string>;
  optimizeContent: (content: string, platform: string) => Promise<string>;
  
  // Scheduling and automation
  scheduledPosts: ScheduledPost[];
  scheduleEpisodePromotion: (episodeId: string, platforms: string[], scheduleOptions?: any) => Promise<ScheduledPost[]>;
  scheduleCustomPost: (post: Omit<ScheduledPost, 'id' | 'status'>) => Promise<ScheduledPost>;
  cancelScheduledPost: (postId: string) => Promise<void>;
  reschedulePost: (postId: string, newTime: string) => Promise<void>;
  
  // Analytics and insights
  socialAnalytics: Record<string, SocialAnalytics>;
  getSocialAnalytics: (platform: string, timeframe: string) => Promise<SocialAnalytics>;
  getPostPerformance: (postId: string) => Promise<ScheduledPost['engagement']>;
  getCrossplatformInsights: () => Promise<any>;
  
  // Hashtag optimization
  hashtagSuggestions: HashtagAnalysis[];
  analyzeHashtags: (episodeContent: string) => Promise<HashtagAnalysis[]>;
  getTrendingHashtags: (platform: string) => Promise<string[]>;
  optimizeHashtags: (hashtags: string[], platform: string) => Promise<string[]>;
  
  // Automation rules
  automationRules: Array<{
    id: string;
    name: string;
    trigger: 'episode_published' | 'episode_scheduled' | 'analytics_milestone' | 'trending_topic';
    conditions: any;
    actions: Array<{
      type: 'post' | 'schedule' | 'notify' | 'analyze';
      platform?: string;
      template?: string;
      delay?: number;
    }>;
    isActive: boolean;
  }>;
  createAutomationRule: (rule: any) => Promise<void>;
  updateAutomationRule: (id: string, updates: any) => Promise<void>;
  toggleAutomationRule: (id: string, isActive: boolean) => Promise<void>;
  
  // Engagement automation
  autoEngagement: {
    enabled: boolean;
    settings: {
      autoLikeComments: boolean;
      autoReplyToMentions: boolean;
      autoFollowBack: boolean;
      responseTemplates: Array<{ trigger: string; response: string }>;
    };
  };
  updateAutoEngagement: (settings: any) => Promise<void>;
  
  // Performance optimization
  getBestPostingTimes: (platform: string) => Promise<Array<{ day: string; hour: number; score: number }>>;
  getOptimalContentLength: (platform: string) => Promise<{ min: number; max: number; optimal: number }>;
  getAudienceInsights: (platform: string) => Promise<any>;
  
  // State management
  isLoading: boolean;
  error: string | null;
  lastSync: Date | null;
  refreshData: () => Promise<void>;
  
  // Export and reporting
  exportSocialData: (format: 'csv' | 'pdf' | 'json', timeframe: string) => Promise<void>;
  generateSocialReport: (timeframe: string) => Promise<string>;
}

const SocialMediaAutomationContext = createContext<SocialMediaAutomationContextType | undefined>(undefined);

// Mock data generators
function generateMockPlatforms(): SocialPlatform[] {
  return [
    {
      id: 'twitter',
      name: 'twitter',
      displayName: 'Twitter/X',
      isConnected: true,
      isEnabled: true,
      icon: '𝕏',
      color: '#000000',
      characterLimit: 280,
      supportsImages: true,
      supportsVideo: true,
      supportsThreads: true,
      supportsHashtags: true,
      optimalPostingTimes: [
        { day: 'Monday', hours: [9, 12, 15, 18] },
        { day: 'Tuesday', hours: [9, 12, 15, 18] },
        { day: 'Wednesday', hours: [9, 12, 15, 18] },
        { day: 'Thursday', hours: [9, 12, 15, 18] },
        { day: 'Friday', hours: [9, 12, 15] },
        { day: 'Saturday', hours: [10, 14] },
        { day: 'Sunday', hours: [12, 16] },
      ],
    },
    {
      id: 'linkedin',
      name: 'linkedin',
      displayName: 'LinkedIn',
      isConnected: true,
      isEnabled: true,
      icon: '💼',
      color: '#0077B5',
      characterLimit: 3000,
      supportsImages: true,
      supportsVideo: true,
      supportsThreads: false,
      supportsHashtags: true,
      optimalPostingTimes: [
        { day: 'Monday', hours: [8, 12, 17] },
        { day: 'Tuesday', hours: [8, 12, 17] },
        { day: 'Wednesday', hours: [8, 12, 17] },
        { day: 'Thursday', hours: [8, 12, 17] },
        { day: 'Friday', hours: [8, 12] },
      ],
    },
    {
      id: 'tiktok',
      name: 'tiktok',
      displayName: 'TikTok',
      isConnected: true,
      isEnabled: true,
      icon: '🎵',
      color: '#FE2C55',
      characterLimit: 2200,
      supportsImages: true,
      supportsVideo: true,
      supportsThreads: false,
      supportsHashtags: true,
      optimalPostingTimes: [
        { day: 'Monday', hours: [6, 10, 19, 20] },
        { day: 'Tuesday', hours: [9, 12, 16, 19] },
        { day: 'Wednesday', hours: [7, 9, 11, 20] },
        { day: 'Thursday', hours: [9, 12, 16, 18] },
        { day: 'Friday', hours: [5, 13, 16] },
        { day: 'Saturday', hours: [11, 13, 16] },
        { day: 'Sunday', hours: [7, 13, 16] },
      ],
    },
    {
      id: 'instagram',
      name: 'instagram',
      displayName: 'Instagram',
      isConnected: false,
      isEnabled: false,
      icon: '📷',
      color: '#E4405F',
      characterLimit: 2200,
      supportsImages: true,
      supportsVideo: true,
      supportsThreads: false,
      supportsHashtags: true,
      optimalPostingTimes: [
        { day: 'Monday', hours: [11, 13, 17] },
        { day: 'Tuesday', hours: [11, 13, 17] },
        { day: 'Wednesday', hours: [11, 13, 17] },
        { day: 'Thursday', hours: [11, 13, 17] },
        { day: 'Friday', hours: [11, 13, 17] },
        { day: 'Saturday', hours: [11, 14] },
        { day: 'Sunday', hours: [12, 16] },
      ],
    },
    {
      id: 'facebook',
      name: 'facebook',
      displayName: 'Facebook',
      isConnected: false,
      isEnabled: false,
      icon: '👥',
      color: '#1877F2',
      characterLimit: 63206,
      supportsImages: true,
      supportsVideo: true,
      supportsThreads: false,
      supportsHashtags: true,
      optimalPostingTimes: [
        { day: 'Monday', hours: [9, 13, 15] },
        { day: 'Tuesday', hours: [9, 13, 15] },
        { day: 'Wednesday', hours: [9, 13, 15] },
        { day: 'Thursday', hours: [9, 13, 15] },
        { day: 'Friday', hours: [9, 13] },
        { day: 'Saturday', hours: [12, 15] },
        { day: 'Sunday', hours: [12, 15] },
      ],
    },
  ];
}

function generateMockTemplates(): PostTemplate[] {
  return [
    {
      id: 'episode-launch-twitter',
      name: 'Episode Launch - Twitter',
      platform: 'twitter',
      template: '🎙️ New episode is live! "{episodeTitle}"\n\n{episodeDescription}\n\nListen now: {episodeUrl}\n\n{hashtags}',
      variables: ['episodeTitle', 'episodeDescription', 'episodeUrl', 'hashtags'],
      isActive: true,
      engagement: {
        averageLikes: 45,
        averageShares: 12,
        averageComments: 8,
        clickThroughRate: 3.2,
      },
    },
    {
      id: 'episode-launch-linkedin',
      name: 'Episode Launch - LinkedIn',
      platform: 'linkedin',
      template: 'I\'m excited to share the latest episode of my podcast: "{episodeTitle}"\n\n{episodeDescription}\n\nIn this episode, we dive deep into topics that matter to professionals like yourself. Whether you\'re looking to advance your career or gain new insights, this episode has something valuable for you.\n\n🎧 Listen here: {episodeUrl}\n\nWhat are your thoughts on {episodeKeyTopic}? I\'d love to hear your perspective in the comments.\n\n{hashtags}',
      variables: ['episodeTitle', 'episodeDescription', 'episodeUrl', 'episodeKeyTopic', 'hashtags'],
      isActive: true,
      engagement: {
        averageLikes: 78,
        averageShares: 23,
        averageComments: 15,
        clickThroughRate: 5.8,
      },
    },
    {
      id: 'episode-launch-tiktok',
      name: 'Episode Launch - TikTok',
      platform: 'tiktok',
      template: '🎙️ NEW PODCAST EPISODE ALERT! 🚨\n\n"{episodeTitle}" is NOW LIVE! 🔥\n\n{episodeDescription}\n\n✨ Key takeaway: {episodeQuote}\n\n🎧 Full episode in bio! \n\nComment "PODCAST" if you want more content like this 👇\n\n{hashtags}',
      variables: ['episodeTitle', 'episodeDescription', 'episodeQuote', 'hashtags'],
      isActive: true,
      engagement: {
        averageLikes: 125,
        averageShares: 35,
        averageComments: 42,
        clickThroughRate: 8.5,
      },
    },
    {
      id: 'episode-teaser-twitter',
      name: 'Episode Teaser - Twitter',
      platform: 'twitter',
      template: '🔥 Coming tomorrow: A game-changing conversation about {episodeKeyTopic}\n\nGet ready for insights that will {episodeBenefit}\n\n"{episodeQuote}"\n\n{hashtags}',
      variables: ['episodeKeyTopic', 'episodeBenefit', 'episodeQuote', 'hashtags'],
      isActive: true,
      engagement: {
        averageLikes: 32,
        averageShares: 8,
        averageComments: 5,
        clickThroughRate: 2.1,
      },
    },
    {
      id: 'episode-teaser-tiktok',
      name: 'Episode Teaser - TikTok',
      platform: 'tiktok',
      template: '👀 SNEAK PEEK at tomorrow\'s episode!\n\nWe\'re talking about {episodeKeyTopic} and it\'s about to BLOW YOUR MIND 🤯\n\n💡 Here\'s what you\'ll learn:\n- {episodeBenefit}\n- Actionable strategies you can use TODAY\n- Real stories from successful people\n\n🔥 "{episodeQuote}"\n\nSet those notifications ON! 🔔\n\n{hashtags}',
      variables: ['episodeKeyTopic', 'episodeBenefit', 'episodeQuote', 'hashtags'],
      isActive: true,
      engagement: {
        averageLikes: 89,
        averageShares: 28,
        averageComments: 34,
        clickThroughRate: 6.7,
      },
    },
    {
      id: 'guest-spotlight',
      name: 'Guest Spotlight',
      platform: 'twitter',
      template: '✨ Spotlight on {guestName}!\n\nIn our latest episode, {guestName} shares incredible insights about {guestExpertise}.\n\n🎯 Key takeaway: "{guestQuote}"\n\nDon\'t miss this conversation: {episodeUrl}\n\n{hashtags}',
      variables: ['guestName', 'guestExpertise', 'guestQuote', 'episodeUrl', 'hashtags'],
      isActive: true,
      engagement: {
        averageLikes: 52,
        averageShares: 18,
        averageComments: 12,
        clickThroughRate: 4.5,
      },
    },
    {
      id: 'guest-spotlight-tiktok',
      name: 'Guest Spotlight - TikTok',
      platform: 'tiktok',
      template: '🌟 INCREDIBLE GUEST ALERT! 🌟\n\nJust recorded with {guestName} and WOW... 🤯\n\n{guestName} is a MASTER at {guestExpertise} and dropped some SERIOUS knowledge bombs! 💣\n\n🔥 BEST QUOTE: "{guestQuote}"\n\nThis episode is going to change how you think about success! 💭➡️💰\n\n🎧 Full convo dropping soon - follow for updates!\n\nDrop a 🚀 if you\'re ready for this!\n\n{hashtags}',
      variables: ['guestName', 'guestExpertise', 'guestQuote', 'hashtags'],
      isActive: true,
      engagement: {
        averageLikes: 156,
        averageShares: 45,
        averageComments: 67,
        clickThroughRate: 9.2,
      },
    },
  ];
}

function generateMockScheduledPosts(): ScheduledPost[] {
  const platforms = ['twitter', 'linkedin', 'tiktok', 'instagram'];
  const statuses: ScheduledPost['status'][] = ['scheduled', 'posted', 'failed'];
  
  return Array.from({ length: 15 }, (_, i) => ({
    id: `post-${i + 1}`,
    episodeId: `episode-${Math.floor(i / 4) + 1}`,
    episodeTitle: `Episode ${Math.floor(i / 4) + 1}: Building Your Success Mindset`,
    platform: platforms[i % platforms.length],
    content: i % 4 === 0 
      ? '🎙️ New episode is live! "Building Your Success Mindset"\n\nDiscover the mental frameworks that separate high achievers from the rest.\n\nListen now: https://podcast.example.com/ep1\n\n#Success #Mindset #Podcast'
      : i % 4 === 1
      ? 'I\'m excited to share insights from my latest podcast episode on building a success mindset...'
      : i % 4 === 2
      ? '🎙️ NEW PODCAST EPISODE ALERT! 🚨\n\n"Building Your Success Mindset" is NOW LIVE! 🔥\n\nDiscover the mental frameworks that separate high achievers from the rest.\n\n🎧 Full episode in bio!'
      : '🔥 Coming soon: A deep dive into the psychology of success and how to rewire your thinking for breakthrough results...',
    mediaUrls: i % 5 === 0 ? ['https://example.com/episode-image.jpg'] : [],
    hashtags: ['Success', 'Mindset', 'Podcast', 'PersonalDevelopment', 'Motivation'],
    scheduledTime: new Date(Date.now() + (i * 2 * 60 * 60 * 1000)).toISOString(),
    status: statuses[i % statuses.length],
    actualPostTime: i % 3 !== 0 ? new Date(Date.now() - (i * 60 * 60 * 1000)).toISOString() : undefined,
    engagement: i % 3 !== 0 ? {
      likes: Math.floor(Math.random() * 100 + 20) * (platforms[i % platforms.length] === 'tiktok' ? 2.5 : 1), // TikTok gets higher engagement
      shares: Math.floor(Math.random() * 30 + 5) * (platforms[i % platforms.length] === 'tiktok' ? 1.8 : 1),
      comments: Math.floor(Math.random() * 20 + 2) * (platforms[i % platforms.length] === 'tiktok' ? 2.2 : 1),
      clicks: Math.floor(Math.random() * 50 + 10),
      reach: Math.floor(Math.random() * 1000 + 200) * (platforms[i % platforms.length] === 'tiktok' ? 3 : 1), // TikTok has higher reach potential
      impressions: Math.floor(Math.random() * 2000 + 500) * (platforms[i % platforms.length] === 'tiktok' ? 2.8 : 1),
    } : undefined,
    errorMessage: i % 3 === 2 && statuses[i % statuses.length] === 'failed' ? 'API rate limit exceeded' : undefined,
  }));
}

interface SocialMediaAutomationProviderProps {
  children: ReactNode;
}

export function SocialMediaAutomationProvider({ children }: SocialMediaAutomationProviderProps) {
  const [platforms, setPlatforms] = useState<SocialPlatform[]>([]);
  const [templates, setTemplates] = useState<PostTemplate[]>([]);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [socialAnalytics, setSocialAnalytics] = useState<Record<string, SocialAnalytics>>({});
  const [hashtagSuggestions, setHashtagSuggestions] = useState<HashtagAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const [contentSettings, setContentSettings] = useState<ContentGeneration>({
    useAI: true,
    tone: 'professional',
    includeQuotes: true,
    includeStats: true,
    includeCallToAction: true,
    customHashtags: ['Podcast', 'PersonalDevelopment', 'Success'],
    mentionStrategy: 'guests',
  });

  const [automationRules, setAutomationRules] = useState([
    {
      id: 'auto-post-on-publish',
      name: 'Auto-post when episode published',
      trigger: 'episode_published' as const,
      conditions: { status: 'published' },
      actions: [
        { type: 'post' as const, platform: 'twitter', template: 'episode-launch-twitter', delay: 0 },
        { type: 'post' as const, platform: 'linkedin', template: 'episode-launch-linkedin', delay: 30 },
        { type: 'schedule' as const, platform: 'twitter', template: 'episode-teaser-twitter', delay: 1440 }, // 24 hours later
      ],
      isActive: true,
    },
  ]);

  const [autoEngagement] = useState({
    enabled: true,
    settings: {
      autoLikeComments: true,
      autoReplyToMentions: true,
      autoFollowBack: false,
      responseTemplates: [
        { trigger: 'thanks', response: 'Thank you for listening! What was your favorite part?' },
        { trigger: 'question', response: 'Great question! I might cover this in a future episode.' },
        { trigger: 'feedback', response: 'I really appreciate the feedback! It helps me create better content.' },
      ],
    },
  });

  // Initialize with mock data
  useEffect(() => {
    const mockPlatforms = generateMockPlatforms();
    const mockTemplates = generateMockTemplates();
    const mockPosts = generateMockScheduledPosts();
    
    setPlatforms(mockPlatforms);
    setTemplates(mockTemplates);
    setScheduledPosts(mockPosts);
    setLastSync(new Date());
  }, []);

  const connectedPlatforms = platforms.filter(p => p.isConnected);

  // Platform management
  const connectPlatform = async (platformId: string, credentials: any): Promise<void> => {
    setIsLoading(true);
    try {
      // Simulate API call to connect platform
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setPlatforms(prev => prev.map(p => 
        p.id === platformId ? { ...p, isConnected: true, isEnabled: true } : p
      ));
      
      console.log(`[SocialAutomation] Connected to ${platformId}`);
    } catch (err) {
      setError(`Failed to connect to ${platformId}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectPlatform = async (platformId: string): Promise<void> => {
    setPlatforms(prev => prev.map(p => 
      p.id === platformId ? { ...p, isConnected: false, isEnabled: false } : p
    ));
    console.log(`[SocialAutomation] Disconnected from ${platformId}`);
  };

  const updatePlatformSettings = async (platformId: string, settings: Partial<SocialPlatform>): Promise<void> => {
    setPlatforms(prev => prev.map(p => 
      p.id === platformId ? { ...p, ...settings } : p
    ));
  };

  // Template management
  const createTemplate = async (template: Omit<PostTemplate, 'id' | 'engagement'>): Promise<PostTemplate> => {
    const newTemplate: PostTemplate = {
      ...template,
      id: `template-${Date.now()}`,
      engagement: {
        averageLikes: 0,
        averageShares: 0,
        averageComments: 0,
        clickThroughRate: 0,
      },
    };
    
    setTemplates(prev => [...prev, newTemplate]);
    return newTemplate;
  };

  const updateTemplate = async (id: string, updates: Partial<PostTemplate>): Promise<void> => {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const deleteTemplate = async (id: string): Promise<void> => {
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  // Content generation
  const updateContentSettings = (settings: Partial<ContentGeneration>) => {
    setContentSettings(prev => ({ ...prev, ...settings }));
  };

  const generatePostContent = async (episodeId: string, platform: string, template?: string): Promise<string> => {
    setIsLoading(true);
    try {
      // Simulate AI content generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const platformObj = platforms.find(p => p.id === platform);
      const templateObj = templates.find(t => t.id === template);
      
      if (templateObj) {
        // Use template with variable substitution
        let content = templateObj.template;
        content = content.replace('{episodeTitle}', 'Building Your Success Mindset');
        content = content.replace('{episodeDescription}', 'Discover the mental frameworks that separate high achievers from the rest.');
        content = content.replace('{episodeUrl}', 'https://podcast.example.com/ep1');
        content = content.replace('{hashtags}', '#Success #Mindset #Podcast');
        return content;
      }
      
      // AI-generated content based on settings
      const tone = contentSettings.tone;
      const baseContent = `🎙️ New episode is live! Check out this ${tone} discussion about success and mindset.`;
      
      if (platformObj && baseContent.length > platformObj.characterLimit) {
        return baseContent.substring(0, platformObj.characterLimit - 3) + '...';
      }
      
      return baseContent;
    } finally {
      setIsLoading(false);
    }
  };

  const optimizeContent = async (content: string, platform: string): Promise<string> => {
    const platformObj = platforms.find(p => p.id === platform);
    if (!platformObj) return content;
    
    // Optimize for character limit
    if (content.length > platformObj.characterLimit) {
      return content.substring(0, platformObj.characterLimit - 3) + '...';
    }
    
    return content;
  };

  // Scheduling
  const scheduleEpisodePromotion = async (
    episodeId: string, 
    platformIds: string[], 
    scheduleOptions?: any
  ): Promise<ScheduledPost[]> => {
    const newPosts: ScheduledPost[] = [];
    
    for (const platformId of platformIds) {
      const platform = platforms.find(p => p.id === platformId);
      if (!platform || !platform.isConnected) continue;
      
      const template = templates.find(t => t.platform === platformId && t.isActive);
      const content = template ? await generatePostContent(episodeId, platformId, template.id) : 
        await generatePostContent(episodeId, platformId);
      
      const scheduledPost: ScheduledPost = {
        id: `post-${Date.now()}-${platformId}`,
        episodeId,
        episodeTitle: `Episode ${episodeId}`,
        platform: platformId,
        content,
        mediaUrls: [],
        hashtags: contentSettings.customHashtags,
        scheduledTime: new Date(Date.now() + 60000).toISOString(), // 1 minute from now
        status: 'scheduled',
      };
      
      newPosts.push(scheduledPost);
    }
    
    setScheduledPosts(prev => [...prev, ...newPosts]);
    return newPosts;
  };

  const scheduleCustomPost = async (post: Omit<ScheduledPost, 'id' | 'status'>): Promise<ScheduledPost> => {
    const newPost: ScheduledPost = {
      ...post,
      id: `custom-post-${Date.now()}`,
      status: 'scheduled',
    };
    
    setScheduledPosts(prev => [...prev, newPost]);
    return newPost;
  };

  const cancelScheduledPost = async (postId: string): Promise<void> => {
    setScheduledPosts(prev => prev.map(p => 
      p.id === postId ? { ...p, status: 'cancelled' as const } : p
    ));
  };

  const reschedulePost = async (postId: string, newTime: string): Promise<void> => {
    setScheduledPosts(prev => prev.map(p => 
      p.id === postId ? { ...p, scheduledTime: newTime } : p
    ));
  };

  // Analytics
  const getSocialAnalytics = async (platform: string, timeframe: string): Promise<SocialAnalytics> => {
    // Mock analytics data
    const analytics: SocialAnalytics = {
      platform,
      timeframe,
      metrics: {
        totalPosts: Math.floor(Math.random() * 50 + 20),
        totalEngagement: Math.floor(Math.random() * 1000 + 500),
        averageEngagement: Math.floor(Math.random() * 50 + 25),
        followerGrowth: Math.floor(Math.random() * 20 + 5),
        reachGrowth: Math.floor(Math.random() * 30 + 10),
        clickThroughRate: parseFloat((Math.random() * 5 + 2).toFixed(1)),
        bestPerformingPost: {
          id: 'post-123',
          content: '🎙️ New episode is live! "Building Your Success Mindset"',
          engagement: Math.floor(Math.random() * 200 + 100),
        },
      },
      audienceInsights: {
        demographics: [
          { age: '18-24', percentage: Math.floor(Math.random() * 20 + 10) },
          { age: '25-34', percentage: Math.floor(Math.random() * 30 + 25) },
          { age: '35-44', percentage: Math.floor(Math.random() * 25 + 20) },
          { age: '45-54', percentage: Math.floor(Math.random() * 15 + 10) },
          { age: '55+', percentage: Math.floor(Math.random() * 10 + 5) },
        ],
        interests: [
          { interest: 'Business', affinity: Math.floor(Math.random() * 40 + 60) },
          { interest: 'Personal Development', affinity: Math.floor(Math.random() * 30 + 50) },
          { interest: 'Technology', affinity: Math.floor(Math.random() * 20 + 30) },
        ],
        activeHours: Array.from({ length: 24 }, (_, i) => ({
          hour: i,
          engagement: Math.floor(Math.random() * 100 + 20),
        })),
      },
    };
    
    setSocialAnalytics(prev => ({ ...prev, [platform]: analytics }));
    return analytics;
  };

  const getPostPerformance = async (postId: string): Promise<ScheduledPost['engagement']> => {
    return {
      likes: Math.floor(Math.random() * 100 + 20),
      shares: Math.floor(Math.random() * 30 + 5),
      comments: Math.floor(Math.random() * 20 + 2),
      clicks: Math.floor(Math.random() * 50 + 10),
      reach: Math.floor(Math.random() * 1000 + 200),
      impressions: Math.floor(Math.random() * 2000 + 500),
    };
  };

  const getCrossplatformInsights = async (): Promise<any> => {
    return {
      totalReach: Math.floor(Math.random() * 10000 + 5000),
      totalEngagement: Math.floor(Math.random() * 2000 + 1000),
      bestPerformingPlatform: 'linkedin',
      optimalPostingTime: { day: 'Tuesday', hour: 12 },
      audienceOverlap: 35,
    };
  };

  // Hashtag optimization
  const analyzeHashtags = async (episodeContent: string): Promise<HashtagAnalysis[]> => {
    const suggestions: HashtagAnalysis[] = [
      {
        hashtag: '#Success',
        popularity: 85,
        trending: true,
        relatedTags: ['#Achievement', '#Goals', '#Motivation'],
        suggestedUsage: 'Use in main posts about success strategies',
        performance: { reach: 15000, engagement: 850, competition: 'high' },
      },
      {
        hashtag: '#Mindset',
        popularity: 92,
        trending: true,
        relatedTags: ['#Psychology', '#Growth', '#Thinking'],
        suggestedUsage: 'Perfect for mental framework content',
        performance: { reach: 12000, engagement: 920, competition: 'medium' },
      },
      {
        hashtag: '#PodcastLife',
        popularity: 65,
        trending: false,
        relatedTags: ['#Podcasting', '#Audio', '#Content'],
        suggestedUsage: 'Use for behind-the-scenes content',
        performance: { reach: 8000, engagement: 450, competition: 'low' },
      },
    ];
    
    setHashtagSuggestions(suggestions);
    return suggestions;
  };

  const getTrendingHashtags = async (platform: string): Promise<string[]> => {
    const trending = ['#Motivation', '#Success', '#Mindset', '#PersonalDevelopment', '#Productivity'];
    return trending;
  };

  const optimizeHashtags = async (hashtags: string[], platform: string): Promise<string[]> => {
    // Remove low-performing hashtags and suggest better alternatives
    return hashtags.slice(0, platform === 'twitter' ? 2 : 5);
  };

  // Automation rules
  const createAutomationRule = async (rule: any): Promise<void> => {
    setAutomationRules(prev => [...prev, { ...rule, id: `rule-${Date.now()}` }]);
  };

  const updateAutomationRule = async (id: string, updates: any): Promise<void> => {
    setAutomationRules(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const toggleAutomationRule = async (id: string, isActive: boolean): Promise<void> => {
    setAutomationRules(prev => prev.map(r => r.id === id ? { ...r, isActive } : r));
  };

  // Performance optimization
  const getBestPostingTimes = async (platform: string): Promise<Array<{ day: string; hour: number; score: number }>> => {
    return [
      { day: 'Tuesday', hour: 12, score: 95 },
      { day: 'Wednesday', hour: 15, score: 92 },
      { day: 'Thursday', hour: 9, score: 88 },
      { day: 'Monday', hour: 17, score: 85 },
    ];
  };

  const getOptimalContentLength = async (platform: string): Promise<{ min: number; max: number; optimal: number }> => {
    const platformData = {
      twitter: { min: 71, max: 100, optimal: 85 },
      linkedin: { min: 150, max: 300, optimal: 200 },
      instagram: { min: 125, max: 250, optimal: 175 },
      facebook: { min: 100, max: 200, optimal: 150 },
    };
    
    return platformData[platform as keyof typeof platformData] || { min: 50, max: 150, optimal: 100 };
  };

  const getAudienceInsights = async (platform: string): Promise<any> => {
    return {
      demographics: { primary: '25-34', secondary: '35-44' },
      interests: ['Business', 'Personal Development', 'Technology'],
      activeHours: [9, 12, 15, 18],
      engagement: { likes: 45, shares: 12, comments: 8 },
    };
  };

  // Data management
  const refreshData = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setLastSync(new Date());
      console.log('[SocialAutomation] Data refreshed');
    } finally {
      setIsLoading(false);
    }
  };

  // Export and reporting
  const exportSocialData = async (format: 'csv' | 'pdf' | 'json', timeframe: string): Promise<void> => {
    console.log(`[SocialAutomation] Exporting ${format} for ${timeframe}`);
    await new Promise(resolve => setTimeout(resolve, 1500));
    alert(`Social media data exported as ${format.toUpperCase()}`);
  };

  const generateSocialReport = async (timeframe: string): Promise<string> => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return `Social media performance report for ${timeframe} generated successfully.`;
  };

  const updateAutoEngagement = async (settings: any): Promise<void> => {
    console.log('[SocialAutomation] Auto-engagement settings updated', settings);
  };

  const contextValue: SocialMediaAutomationContextType = {
    platforms,
    connectedPlatforms,
    connectPlatform,
    disconnectPlatform,
    updatePlatformSettings,
    templates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    contentSettings,
    updateContentSettings,
    generatePostContent,
    optimizeContent,
    scheduledPosts,
    scheduleEpisodePromotion,
    scheduleCustomPost,
    cancelScheduledPost,
    reschedulePost,
    socialAnalytics,
    getSocialAnalytics,
    getPostPerformance,
    getCrossplatformInsights,
    hashtagSuggestions,
    analyzeHashtags,
    getTrendingHashtags,
    optimizeHashtags,
    automationRules,
    createAutomationRule,
    updateAutomationRule,
    toggleAutomationRule,
    autoEngagement,
    updateAutoEngagement,
    getBestPostingTimes,
    getOptimalContentLength,
    getAudienceInsights,
    isLoading,
    error,
    lastSync,
    refreshData,
    exportSocialData,
    generateSocialReport,
  };

  return (
    <SocialMediaAutomationContext.Provider value={contextValue}>
      {children}
    </SocialMediaAutomationContext.Provider>
  );
}

export function useSocialMediaAutomation() {
  const context = useContext(SocialMediaAutomationContext);
  if (context === undefined) {
    throw new Error('useSocialMediaAutomation must be used within a SocialMediaAutomationProvider');
  }
  return context;
}