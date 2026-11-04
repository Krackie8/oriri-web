import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Slider } from './ui/slider';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  Maximize,
  Download,
  Heart,
  Share,
  MessageCircle,
  ThumbsUp,
  Reply,
  MoreHorizontal,
  Search,
  ExternalLink,
  Instagram,
  Twitter,
  Facebook,
  Link,
  DollarSign,
  Gift,
  ChevronDown,
  ChevronUp,
  User,
  Clock,
  Eye,
  Calendar
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { EpisodeInteractionBar } from './interactions/EpisodeInteractionBar';

interface Episode {
  id: number;
  title: string;
  description: string;
  fullDescription: string;
  guest?: {
    name: string;
    bio: string;
    image: string;
    links: { platform: string; url: string }[];
  };
  duration: string;
  views: string;
  publishedDate: string;
  image: string;
  audioUrl?: string;
  videoUrl?: string;
  transcript: string;
  summary: string;
  isAudio: boolean;
}

interface Comment {
  id: number;
  user: {
    name: string;
    avatar: string;
  };
  content: string;
  timestamp: string;
  likes: number;
  isLiked: boolean;
  replies: Comment[];
}

interface EpisodeDetailScreenProps {
  episode: Episode;
  onBack: () => void;
  onPlayEpisode?: (episode: any) => void;
}

export default function EpisodeDetailScreen({ episode, onBack, onPlayEpisode }: EpisodeDetailScreenProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(300); // 5 minutes default
  const [volume, setVolume] = useState(80);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('transcript');
  const [searchQuery, setSearchQuery] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Mock data
  const extrasPhotos = [
    "https://images.unsplash.com/photo-1581464628523-fa4f91e15dc7?w=300&h=200&fit=crop",
    "https://images.unsplash.com/photo-1632800237110-f9c87acc2222?w=300&h=200&fit=crop",
    "https://images.unsplash.com/photo-1581464628523-fa4f91e15dc7?w=300&h=200&fit=crop"
  ];

  const relatedEpisodes = [
    { id: 2, title: "Building Sustainable Cities", duration: "42min" },
    { id: 3, title: "Urban Planning Revolution", duration: "38min" },
    { id: 4, title: "Smart City Technologies", duration: "45min" }
  ];

  const comments: Comment[] = [
    {
      id: 1,
      user: {
        name: "Sarah Chen",
        avatar: "https://images.unsplash.com/photo-1724435811349-32d27f4d5806?w=40&h=40&fit=crop"
      },
      content: "Absolutely fascinating discussion about Dubai's transformation! The insights about sustainable urban development were eye-opening.",
      timestamp: "2 hours ago",
      likes: 12,
      isLiked: false,
      replies: [
        {
          id: 2,
          user: {
            name: "Mike Rodriguez",
            avatar: "https://images.unsplash.com/photo-1576558656222-ba66febe3dec?w=40&h=40&fit=crop"
          },
          content: "Couldn't agree more! The part about green building initiatives was particularly interesting.",
          timestamp: "1 hour ago",
          likes: 5,
          isLiked: true,
          replies: []
        }
      ]
    },
    {
      id: 3,
      user: {
        name: "Alex Thompson",
        avatar: "https://images.unsplash.com/photo-1724435811349-32d27f4d5806?w=40&h=40&fit=crop"
      },
      content: "John Doe always brings such valuable perspectives to these conversations. Looking forward to more episodes like this!",
      timestamp: "4 hours ago",
      likes: 8,
      isLiked: true,
      replies: []
    }
  ];

  const togglePlayPause = () => {
    if (onPlayEpisode) {
      onPlayEpisode(episode);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (value: number[]) => {
    setCurrentTime(value[0]);
    // Update actual media currentTime here
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
    // Update actual media volume here
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleShare = (platform: string) => {
    console.log(`Sharing to ${platform}`);
    setShowShareModal(false);
  };

  const handleTip = (amount: number) => {
    console.log(`Tipping $${amount}`);
    setShowTipModal(false);
  };

  const submitComment = () => {
    if (newComment.trim()) {
      console.log('Submitting comment:', newComment);
      setNewComment('');
    }
  };

  return (
    <div className="w-full bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between max-w-full">
          <Button variant="ghost" size="sm" onClick={onBack} className="flex-shrink-0">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="flex-1 mx-2 truncate text-center text-sm">Episode {episode.id}</h1>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button variant="ghost" size="sm" className="p-2">
              <Download className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="p-2">
              <Heart className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="p-2" onClick={() => setShowShareModal(true)}>
              <Share className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="w-full overflow-x-hidden">
        {/* Media Player */}
        <div className="relative w-full">
          {episode.isAudio ? (
            // Audio Player with Waveform Visualization
            <div className="bg-gradient-to-b from-primary/10 to-transparent p-4">
              <div className="w-full max-w-sm mx-auto">
                <ImageWithFallback
                  src={episode.image}
                  alt={episode.title}
                  className="w-full h-48 object-cover rounded-lg shadow-lg mb-4"
                />
                
                {/* Audio Controls */}
                <div className="bg-card/80 backdrop-blur-sm rounded-lg p-4 border border-white/10 w-full">
                  {/* Waveform Visualization */}
                  <div className="mb-4">
                    <div className="flex items-center justify-center h-16 bg-primary/5 rounded-lg mb-4 w-full">
                      <div className="flex items-end gap-0.5 h-12 overflow-hidden justify-center w-full max-w-[280px]">
                        {Array.from({ length: 35 }, (_, i) => (
                          <div
                            key={i}
                            className="bg-primary/40 rounded-sm flex-shrink-0"
                            style={{
                              width: '2px',
                              height: `${Math.random() * 60 + 10}%`,
                              opacity: i < (currentTime / duration) * 35 ? 1 : 0.3
                            }}
                          />
                        ))}
                      </div>
                    </div>
                    
                    {/* Seek Bar */}
                    <Slider
                      value={[currentTime]}
                      max={duration}
                      step={1}
                      onValueChange={handleSeek}
                      className="mb-2"
                    />
                    
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>
                  
                  {/* Playback Controls */}
                  <div className="flex items-center justify-center gap-6 mb-4">
                    <Button variant="ghost" size="sm">
                      <SkipBack className="w-5 h-5" />
                    </Button>
                    
                    <Button
                      onClick={togglePlayPause}
                      size="lg"
                      className="w-12 h-12 rounded-full"
                    >
                      {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                    </Button>
                    
                    <Button variant="ghost" size="sm">
                      <SkipForward className="w-5 h-5" />
                    </Button>
                  </div>
                  
                  {/* Additional Controls */}
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2 flex-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setVolume(volume > 0 ? 0 : 80)}
                        className="p-2 flex-shrink-0"
                      >
                        {volume > 0 ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                      </Button>
                      <Slider
                        value={[volume]}
                        max={100}
                        step={1}
                        onValueChange={handleVolumeChange}
                        className="flex-1 max-w-[120px]"
                      />
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPlaybackSpeed(playbackSpeed === 1 ? 1.5 : 1)}
                      className="px-3 py-1 text-sm flex-shrink-0"
                    >
                      {playbackSpeed}x
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Video Player
            <div className="relative bg-black w-full">
              <video
                ref={videoRef}
                className="w-full h-48"
                poster={episode.image}
                controls
              >
                <source src={episode.videoUrl} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 p-2"
              >
                <Maximize className="w-4 h-4 text-white" />
              </Button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="px-4 py-4 space-y-6 pb-8 w-full max-w-full overflow-hidden">
          {/* Episode Info */}
          <div className="w-full">
            <div className="flex items-start justify-between mb-4 gap-3 w-full">
              <div className="flex-1 min-w-0">
                <h1 className="mb-2 text-lg leading-tight pr-2">{episode.title}</h1>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span className="text-xs">{episode.duration}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    <span className="text-xs">{episode.views}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span className="text-xs">{episode.publishedDate}</span>
                  </div>
                </div>
              </div>
              
              <Button 
                onClick={() => setShowTipModal(true)} 
                className="bg-yellow-500 hover:bg-yellow-600 text-black flex-shrink-0 px-3 py-2 text-sm"
              >
                <Gift className="w-3 h-3 mr-1" />
                Tip
              </Button>
            </div>
            
            {/* Description */}
            <div className="w-full">
              <p className={`text-muted-foreground text-sm leading-relaxed w-full ${!isDescriptionExpanded ? 'line-clamp-3' : ''}`}>
                {isDescriptionExpanded ? episode.fullDescription : episode.description}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                className="mt-2 px-0 text-sm"
              >
                {isDescriptionExpanded ? (
                  <>Show less <ChevronUp className="w-3 h-3 ml-1" /></>
                ) : (
                  <>Show more <ChevronDown className="w-3 h-3 ml-1" /></>
                )}
              </Button>
            </div>
          </div>

          {/* Guest Section */}
          {episode.guest && (
            <Card className="bg-card/80 backdrop-blur-sm border-white/10 w-full">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3">
                  <Avatar className="w-12 h-12 flex-shrink-0">
                    <AvatarImage src={episode.guest.image} alt={episode.guest.name} />
                    <AvatarFallback>{episode.guest.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <h3 className="text-base">{episode.guest.name}</h3>
                    <p className="text-sm text-muted-foreground">Guest</p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">{episode.guest.bio}</p>
                
                {/* Guest Links */}
                <div className="flex flex-wrap gap-2">
                  {episode.guest.links.map((link, index) => (
                    <Button key={index} variant="outline" size="sm" asChild className="text-xs">
                      <a href={link.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3 h-3 mr-1" />
                        {link.platform}
                      </a>
                    </Button>
                  ))}
                </div>
                
                {/* Related Episodes */}
                <div>
                  <h4 className="mb-3 text-base">Related Episodes</h4>
                  <div className="space-y-2">
                    {relatedEpisodes.map((relatedEp) => (
                      <div key={relatedEp.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors w-full">
                        <span className="text-sm flex-1 min-w-0 pr-2">Episode {relatedEp.id}: {relatedEp.title}</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">{relatedEp.duration}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Transcripts/Summary Tabs */}
          <Card className="bg-card/80 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle>Content</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="transcript">Transcript</TabsTrigger>
                  <TabsTrigger value="summary">Summary</TabsTrigger>
                </TabsList>
                
                <TabsContent value="transcript" className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Search transcript..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <ScrollArea className="h-64">
                    <div className="text-sm leading-relaxed">
                      {episode.transcript.split('\n').map((paragraph, index) => (
                        <p key={index} className="mb-4">
                          {searchQuery && paragraph.toLowerCase().includes(searchQuery.toLowerCase()) ? (
                            paragraph.split(new RegExp(`(${searchQuery})`, 'gi')).map((part, i) =>
                              part.toLowerCase() === searchQuery.toLowerCase() ? (
                                <mark key={i} className="bg-yellow-500/30">{part}</mark>
                              ) : (
                                part
                              )
                            )
                          ) : (
                            paragraph
                          )}
                        </p>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="summary">
                  <div className="text-sm leading-relaxed">
                    <p>{episode.summary}</p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Extras Gallery */}
          <Card className="bg-card/80 backdrop-blur-sm border-white/10 w-full">
            <CardHeader>
              <CardTitle className="text-base">Behind the Scenes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 overflow-x-auto scrollbar-none pb-2 w-full">
                {extrasPhotos.map((photo, index) => (
                  <div key={index} className="min-w-[140px] flex-shrink-0">
                    <ImageWithFallback
                      src={photo}
                      alt={`Behind the scenes ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Comments Section */}
          <Card className="bg-card/80 backdrop-blur-sm border-white/10 w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageCircle className="w-4 h-4" />
                Comments ({comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 w-full">
              {/* Add Comment */}
              <div className="flex gap-3">
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarFallback>You</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2 min-w-0">
                  <Textarea
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[60px] sm:min-h-[80px] text-sm"
                  />
                  <div className="flex justify-end">
                    <Button onClick={submitComment} disabled={!newComment.trim()} size="sm">
                      Post Comment
                    </Button>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              {/* Comments List */}
              <div className="space-y-4 w-full">
                {comments.map((comment) => (
                  <div key={comment.id} className="space-y-3 w-full">
                    <div className="flex gap-3 w-full">
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarImage src={comment.user.avatar} alt={comment.user.name} />
                        <AvatarFallback>{comment.user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm truncate">{comment.user.name}</span>
                          <span className="text-xs text-muted-foreground flex-shrink-0">{comment.timestamp}</span>
                        </div>
                        <p className="text-sm mb-2 leading-relaxed break-words">{comment.content}</p>
                        <div className="flex items-center gap-4">
                          <Button variant="ghost" size="sm" className="h-auto p-0 text-xs">
                            <ThumbsUp className={`w-3 h-3 mr-1 ${comment.isLiked ? 'fill-current text-primary' : ''}`} />
                            <span>{comment.likes}</span>
                          </Button>
                          <Button variant="ghost" size="sm" className="h-auto p-0 text-xs">
                            <Reply className="w-3 h-3 mr-1" />
                            <span>Reply</span>
                          </Button>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="flex-shrink-0 p-1">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    {/* Replies */}
                    {comment.replies.length > 0 && (
                      <div className="ml-8 space-y-3 w-full">
                        {comment.replies.map((reply) => (
                          <div key={reply.id} className="flex gap-2 w-full">
                            <Avatar className="w-6 h-6 flex-shrink-0">
                              <AvatarImage src={reply.user.avatar} alt={reply.user.name} />
                              <AvatarFallback>{reply.user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm truncate">{reply.user.name}</span>
                                <span className="text-xs text-muted-foreground flex-shrink-0">{reply.timestamp}</span>
                              </div>
                              <p className="text-sm mb-2 leading-relaxed break-words">{reply.content}</p>
                              <div className="flex items-center gap-4">
                                <Button variant="ghost" size="sm" className="h-auto p-0 text-xs">
                                  <ThumbsUp className={`w-3 h-3 mr-1 ${reply.isLiked ? 'fill-current text-primary' : ''}`} />
                                  <span>{reply.likes}</span>
                                </Button>
                                <Button variant="ghost" size="sm" className="h-auto p-0 text-xs">
                                  <Reply className="w-3 h-3 mr-1" />
                                  <span>Reply</span>
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Share Modal */}
      <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
        <DialogContent className="max-w-sm sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Share Episode</DialogTitle>
            <DialogDescription className="text-sm">
              Share this episode with your friends on social media or create a custom clip to share.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-2 sm:gap-4">
              <Button variant="outline" onClick={() => handleShare('instagram')} className="flex-col h-auto py-3 sm:py-4 px-2">
                <Instagram className="w-4 h-4 sm:w-6 sm:h-6 mb-1 sm:mb-2" />
                <span className="text-xs">Instagram</span>
              </Button>
              <Button variant="outline" onClick={() => handleShare('twitter')} className="flex-col h-auto py-3 sm:py-4 px-2">
                <Twitter className="w-4 h-4 sm:w-6 sm:h-6 mb-1 sm:mb-2" />
                <span className="text-xs">Twitter</span>
              </Button>
              <Button variant="outline" onClick={() => handleShare('facebook')} className="flex-col h-auto py-3 sm:py-4 px-2">
                <Facebook className="w-4 h-4 sm:w-6 sm:h-6 mb-1 sm:mb-2" />
                <span className="text-xs">Facebook</span>
              </Button>
              <Button variant="outline" onClick={() => handleShare('link')} className="flex-col h-auto py-3 sm:py-4 px-2">
                <Link className="w-4 h-4 sm:w-6 sm:h-6 mb-1 sm:mb-2" />
                <span className="text-xs">Copy Link</span>
              </Button>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="mb-3 text-sm sm:text-base">Create Clip</h4>
              <p className="text-xs sm:text-sm text-muted-foreground mb-3">Select a 15-second segment to share</p>
              <div className="space-y-3">
                <Slider
                  value={[currentTime]}
                  max={duration}
                  step={1}
                  className="mb-2"
                />
                <div className="flex justify-between text-xs sm:text-sm">
                  <span>Start: {formatTime(currentTime)}</span>
                  <span>End: {formatTime(Math.min(currentTime + 15, duration))}</span>
                </div>
                <Button className="w-full text-sm">Generate Clip</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tip Modal */}
      <Dialog open={showTipModal} onOpenChange={setShowTipModal}>
        <DialogContent className="max-w-sm sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Support the Show</DialogTitle>
            <DialogDescription className="text-sm">
              Show your appreciation with a tip to support more great content!
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[5, 10, 25].map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  onClick={() => handleTip(amount)}
                  className="flex-col h-auto py-3 sm:py-4 px-2"
                >
                  <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 mb-1" />
                  <span className="text-sm">${amount}</span>
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input placeholder="Custom amount" type="number" className="text-sm" />
              <Button className="text-sm">Send Tip</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}