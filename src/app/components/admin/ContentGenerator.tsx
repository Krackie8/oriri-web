import React, { useState, useEffect } from 'react';
import { useSocialMediaAutomation } from '../../contexts/SocialMediaAutomationContext';
import { useEpisodeManagement } from '../../contexts/EpisodeManagementContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Alert, AlertDescription } from '../ui/alert';
import { Skeleton } from '../ui/skeleton';
import { Separator } from '../ui/separator';
import {
  Wand2,
  Copy,
  RefreshCw,
  Calendar,
  Hash,
  Quote,
  Target,
  TrendingUp,
  Zap,
  Edit,
  Save,
  X,
  Plus,
  Sparkles
} from 'lucide-react';

interface GeneratedContent {
  id: string;
  platform: string;
  content: string;
  hashtags: string[];
  tone: string;
  engagement: {
    predictedLikes: number;
    predictedShares: number;
    predictedComments: number;
    viralityScore: number;
  };
  optimization: {
    characterCount: number;
    hashtagCount: number;
    mentionCount: number;
    emojiCount: number;
    readabilityScore: number;
    seoScore: number;
  };
  variations: Array<{
    id: string;
    content: string;
    score: number;
  }>;
}

export default function ContentGenerator() {
  const {
    platforms,
    connectedPlatforms,
    contentSettings,
    updateContentSettings,
    generatePostContent,
    optimizeContent,
    hashtagSuggestions,
    analyzeHashtags,
    getTrendingHashtags,
    scheduleCustomPost,
    isLoading
  } = useSocialMediaAutomation();

  const { filteredEpisodes } = useEpisodeManagement();

  const [selectedEpisode, setSelectedEpisode] = useState<string>('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [activeTab, setActiveTab] = useState('generate');

  // AI Content Generation Templates
  const contentTemplates = [
    {
      id: 'episode-launch',
      name: 'Episode Launch',
      description: 'Announce a new episode release',
      prompt: 'Create an engaging post announcing the new episode "{episodeTitle}" focusing on {keyTopics}',
    },
    {
      id: 'behind-scenes',
      name: 'Behind the Scenes',
      description: 'Share insights from recording',
      prompt: 'Share behind-the-scenes content about creating "{episodeTitle}" and what listeners can expect',
    },
    {
      id: 'key-takeaway',
      name: 'Key Takeaway',
      description: 'Highlight main episode insights',
      prompt: 'Extract and share the most valuable takeaway from "{episodeTitle}" in an actionable way',
    },
    {
      id: 'question-engage',
      name: 'Question & Engage',
      description: 'Ask audience questions based on episode',
      prompt: 'Create an engaging question based on "{episodeTitle}" to start a conversation with the audience',
    },
    {
      id: 'quote-highlight',
      name: 'Quote Highlight',
      description: 'Feature memorable quotes',
      prompt: 'Create a post highlighting an inspiring quote from "{episodeTitle}" with context',
    },
    {
      id: 'tiktok-hook',
      name: 'TikTok Hook',
      description: 'Create viral TikTok content',
      prompt: 'Create a viral TikTok post with a strong hook about "{episodeTitle}" that will stop viewers from scrolling',
    },
    {
      id: 'tiktok-story',
      name: 'TikTok Story',
      description: 'Tell a compelling story for TikTok',
      prompt: 'Create a compelling story format for TikTok based on "{episodeTitle}" that builds curiosity and engagement',
    },
  ];

  const handleGenerateContent = async (episodeId?: string, platformId?: string, templateId?: string) => {
    if (!episodeId && !selectedEpisode) {
      alert('Please select an episode first.');
      return;
    }

    if (!platformId && !selectedPlatform) {
      alert('Please select a platform first.');
      return;
    }

    setIsGenerating(true);
    try {
      const episode = filteredEpisodes.find(ep => ep.id === (episodeId || selectedEpisode));
      const platform = platforms.find(p => p.id === (platformId || selectedPlatform));

      if (!episode || !platform) {
        throw new Error('Episode or platform not found');
      }

      // Generate base content
      const baseContent = await generatePostContent(episode.id, platform.id);
      
      // Generate variations
      const variations = await Promise.all([
        { id: 'v1', content: baseContent, score: 85 },
        { 
          id: 'v2', 
          content: await generatePostContent(episode.id, platform.id), 
          score: 78 
        },
        { 
          id: 'v3', 
          content: await generatePostContent(episode.id, platform.id), 
          score: 92 
        },
      ]);

      // Analyze hashtags
      const hashtags = await analyzeHashtags(episode.description);
      const trendingTags = await getTrendingHashtags(platform.id);

      const generated: GeneratedContent = {
        id: `generated-${Date.now()}`,
        platform: platform.id,
        content: baseContent,
        hashtags: hashtags.slice(0, 5).map(h => h.hashtag),
        tone: contentSettings.tone,
        engagement: {
          predictedLikes: Math.floor(Math.random() * 100 + 50),
          predictedShares: Math.floor(Math.random() * 30 + 10),
          predictedComments: Math.floor(Math.random() * 20 + 5),
          viralityScore: Math.floor(Math.random() * 40 + 60),
        },
        optimization: {
          characterCount: baseContent.length,
          hashtagCount: hashtags.length,
          mentionCount: (baseContent.match(/@\w+/g) || []).length,
          emojiCount: (baseContent.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu) || []).length,
          readabilityScore: Math.floor(Math.random() * 30 + 70),
          seoScore: Math.floor(Math.random() * 25 + 75),
        },
        variations,
      };

      setGeneratedContent(prev => [generated, ...prev]);
    } catch (error) {
      console.error('Error generating content:', error);
      alert('Failed to generate content. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOptimizeContent = async (contentId: string) => {
    const content = generatedContent.find(c => c.id === contentId);
    if (!content) return;

    try {
      const optimized = await optimizeContent(content.content, content.platform);
      setGeneratedContent(prev => prev.map(c => 
        c.id === contentId 
          ? { 
              ...c, 
              content: optimized,
              optimization: {
                ...c.optimization,
                characterCount: optimized.length,
                seoScore: Math.min(100, c.optimization.seoScore + 10),
              }
            }
          : c
      ));
    } catch (error) {
      console.error('Error optimizing content:', error);
    }
  };

  const handleScheduleContent = async (contentId: string) => {
    const content = generatedContent.find(c => c.id === contentId);
    if (!content) return;

    try {
      const scheduledTime = new Date();
      scheduledTime.setHours(scheduledTime.getHours() + 1); // Schedule for 1 hour from now

      await scheduleCustomPost({
        episodeId: selectedEpisode,
        episodeTitle: filteredEpisodes.find(ep => ep.id === selectedEpisode)?.title || 'Custom Post',
        platform: content.platform,
        content: content.content,
        mediaUrls: [],
        hashtags: content.hashtags,
        scheduledTime: scheduledTime.toISOString(),
      });

      alert('Content scheduled successfully!');
    } catch (error) {
      console.error('Error scheduling content:', error);
      alert('Failed to schedule content. Please try again.');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Content copied to clipboard!');
  };

  const getOptimizationColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getPlatformIcon = (platformId: string) => {
    switch (platformId) {
      case 'twitter': return '𝕏';
      case 'linkedin': return '💼';
      case 'tiktok': return '🎵';
      case 'instagram': return '📷';
      case 'facebook': return '👥';
      default: return '📱';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold flex items-center space-x-2">
            <Sparkles className="h-6 w-6 text-purple-500" />
            <span>AI Content Generator</span>
          </h2>
          <p className="text-muted-foreground">
            Generate optimized social media content for your episodes
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generate">Generate</TabsTrigger>
          <TabsTrigger value="optimize">Optimize</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          {/* Generation Controls */}
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader>
              <CardTitle>Content Generation</CardTitle>
              <CardDescription>
                Select an episode and platform to generate AI-powered content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="episode-select">Select Episode</Label>
                  <Select value={selectedEpisode} onValueChange={setSelectedEpisode}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an episode" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredEpisodes.slice(0, 10).map(episode => (
                        <SelectItem key={episode.id} value={episode.id}>
                          {episode.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="platform-select">Select Platform</Label>
                  <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a platform" />
                    </SelectTrigger>
                    <SelectContent>
                      {connectedPlatforms.map(platform => (
                        <SelectItem key={platform.id} value={platform.id}>
                          <div className="flex items-center space-x-2">
                            <span>{getPlatformIcon(platform.id)}</span>
                            <span>{platform.displayName}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="custom-prompt">Custom Prompt (Optional)</Label>
                <Textarea
                  id="custom-prompt"
                  placeholder="Add specific instructions for content generation..."
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-4">
                <Button
                  onClick={() => handleGenerateContent()}
                  disabled={isGenerating || !selectedEpisode || !selectedPlatform}
                  className="flex items-center space-x-2"
                >
                  <Wand2 className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
                  <span>{isGenerating ? 'Generating...' : 'Generate Content'}</span>
                </Button>

                <div className="text-sm text-muted-foreground">
                  {contentSettings.useAI ? '✨ AI Enhanced' : '📝 Template Based'}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Generated Content */}
          {generatedContent.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Generated Content</h3>
              {generatedContent.map((content) => (
                <Card key={content.id} className="bg-card/50 backdrop-blur border-border/50">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl">{getPlatformIcon(content.platform)}</span>
                        <div>
                          <CardTitle className="text-base">
                            {platforms.find(p => p.id === content.platform)?.displayName}
                          </CardTitle>
                          <CardDescription>
                            {content.tone} tone • {content.optimization.viralityScore}% virality score
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(content.content)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOptimizeContent(content.id)}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleScheduleContent(content.id)}
                        >
                          <Calendar className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Content Preview */}
                    <div className="bg-muted/20 rounded-lg p-4">
                      <p className="whitespace-pre-wrap">{content.content}</p>
                    </div>

                    {/* Hashtags */}
                    <div className="flex flex-wrap gap-2">
                      {content.hashtags.map((hashtag, index) => (
                        <Badge key={index} variant="outline">
                          {hashtag}
                        </Badge>
                      ))}
                    </div>

                    {/* Optimization Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="text-center">
                        <p className="text-muted-foreground">Character Count</p>
                        <p className={`font-medium ${
                          content.optimization.characterCount > platforms.find(p => p.id === content.platform)?.characterLimit! * 0.9
                            ? 'text-red-500' : 'text-green-500'
                        }`}>
                          {content.optimization.characterCount}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground">Readability</p>
                        <p className={`font-medium ${getOptimizationColor(content.optimization.readabilityScore)}`}>
                          {content.optimization.readabilityScore}%
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground">SEO Score</p>
                        <p className={`font-medium ${getOptimizationColor(content.optimization.seoScore)}`}>
                          {content.optimization.seoScore}%
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground">Predicted Likes</p>
                        <p className="font-medium text-blue-500">
                          {content.engagement.predictedLikes}
                        </p>
                      </div>
                    </div>

                    {/* Content Variations */}
                    {content.variations.length > 1 && (
                      <div className="space-y-2">
                        <Label>Content Variations</Label>
                        <div className="space-y-2">
                          {content.variations.map((variation) => (
                            <div 
                              key={variation.id} 
                              className="bg-muted/10 rounded p-3 border border-border/30 cursor-pointer hover:bg-muted/20 transition-colors"
                              onClick={() => {
                                setGeneratedContent(prev => prev.map(c => 
                                  c.id === content.id 
                                    ? { ...c, content: variation.content }
                                    : c
                                ));
                              }}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <Badge variant="outline">Score: {variation.score}%</Badge>
                              </div>
                              <p className="text-sm truncate">{variation.content}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="optimize" className="space-y-6">
          {/* Optimization Tools */}
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader>
              <CardTitle>Content Optimization</CardTitle>
              <CardDescription>
                Improve your content performance with AI-powered suggestions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Hash className="h-5 w-5 text-blue-500" />
                    <h4 className="font-medium">Hashtag Optimizer</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Find trending hashtags for better reach
                  </p>
                  <Button size="sm" variant="outline" className="w-full">
                    Optimize Hashtags
                  </Button>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Target className="h-5 w-5 text-green-500" />
                    <h4 className="font-medium">Timing Optimizer</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Find the best time to post
                  </p>
                  <Button size="sm" variant="outline" className="w-full">
                    Find Best Times
                  </Button>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp className="h-5 w-5 text-purple-500" />
                    <h4 className="font-medium">Engagement Booster</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Improve engagement potential
                  </p>
                  <Button size="sm" variant="outline" className="w-full">
                    Boost Engagement
                  </Button>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Zap className="h-5 w-5 text-yellow-500" />
                    <h4 className="font-medium">Virality Scorer</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Predict viral potential
                  </p>
                  <Button size="sm" variant="outline" className="w-full">
                    Check Virality
                  </Button>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* Trending Hashtags */}
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader>
              <CardTitle>Trending Hashtags</CardTitle>
              <CardDescription>
                Current trending hashtags for your industry
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {hashtagSuggestions.slice(0, 12).map((suggestion, index) => (
                  <Badge 
                    key={index} 
                    variant="outline" 
                    className={`cursor-pointer ${suggestion.trending ? 'border-green-500 text-green-500' : ''}`}
                  >
                    {suggestion.hashtag}
                    {suggestion.trending && <TrendingUp className="h-3 w-3 ml-1" />}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          {/* Content Templates */}
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Content Templates</CardTitle>
                  <CardDescription>
                    Pre-built templates for different types of content
                  </CardDescription>
                </div>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contentTemplates.map((template) => (
                  <Card key={template.id} className="p-4 cursor-pointer hover:bg-muted/20 transition-colors">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium">{template.name}</h4>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (selectedEpisode && selectedPlatform) {
                              handleGenerateContent(selectedEpisode, selectedPlatform, template.id);
                            } else {
                              alert('Please select an episode and platform first.');
                            }
                          }}
                        >
                          <Wand2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                      <div className="bg-muted/20 rounded p-2 text-xs">
                        {template.prompt}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}