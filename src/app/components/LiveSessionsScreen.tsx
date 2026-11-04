import React, { useState, useRef, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { 
  Play, 
  MessageCircle, 
  Bell, 
  BellRing, 
  Users, 
  Heart, 
  ThumbsUp, 
  Smile, 
  Send, 
  DollarSign, 
  Pin, 
  EyeOff, 
  MoreVertical,
  Calendar,
  Clock,
  Video,
  Archive,
  Loader2,
  ExternalLink,
  Smartphone
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useLiveSessions } from '../hooks/useLiveSessions';
import { useLiveTip } from '../contexts/LiveTipContext';
import { LiveTipAnimations, TipParticles } from './live/LiveTipAnimations';
import { LiveTipDashboard } from './live/LiveTipDashboard';
import { EnhancedTipModal } from './live/EnhancedTipModal';
import { LiveTipTicker, LiveTipTickerCompact } from './live/LiveTipTicker';
import { toast } from 'sonner@2.0.3';

interface LiveSession {
  id: string;
  title: string;
  description: string;
  scheduledTime: string;
  duration: string;
  hostName: string;
  hostImage: string;
  thumbnail?: string;
  isLive?: boolean;
  viewerCount?: number;
  hasReminder?: boolean;
  streamPlatform?: string;
  streamUrl?: string;
}

interface ChatMessage {
  id: string;
  sessionId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  message: string;
  timestamp: string;
  reactions: { emoji: string; count: number }[];
  isPinned: boolean;
  isHidden: boolean;
  isSuperChat: boolean;
  superChatAmount: number;
}

interface LiveSessionsScreenProps {
  onEpisodeSelect?: (episode: any) => void;
  isAdmin?: boolean;
}

export default function LiveSessionsScreen({ onEpisodeSelect, isAdmin = false }: LiveSessionsScreenProps) {
  // Platform utilities
  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'tiktok': return '📱';
      case 'instagram': return '📷';
      case 'youtube': return '🎥';
      case 'twitch': return '🎮';
      default: return '🌐';
    }
  };

  const getPlatformName = (platform: string) => {
    switch (platform) {
      case 'tiktok': return 'TikTok';
      case 'instagram': return 'Instagram';
      case 'youtube': return 'YouTube';
      case 'twitch': return 'Twitch';
      default: return 'Other';
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'tiktok': return 'bg-pink-500/20 text-pink-400 border-pink-500/30';
      case 'instagram': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'youtube': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'twitch': return 'bg-violet-500/20 text-violet-400 border-violet-500/30';
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  const handleJoinLiveStream = (session: LiveSession) => {
    if (!session.streamUrl) {
      toast.error('Stream URL not available yet');
      return;
    }

    // Open the external platform URL
    // This will attempt to open the native app first, then fall back to web
    try {
      window.open(session.streamUrl, '_blank', 'noopener,noreferrer');
      toast.success(`Opening ${getPlatformName(session.streamPlatform || 'platform')}...`);
    } catch (error) {
      toast.error('Failed to open stream');
    }
  };
  const [activeTab, setActiveTab] = useState('upcoming');
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [showSuperChatModal, setShowSuperChatModal] = useState(false);
  const [selectedTipAmount, setSelectedTipAmount] = useState<number | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showTipDashboard, setShowTipDashboard] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const {
    sessions,
    chatMessages,
    loading,
    error,
    fetchSessions,
    fetchChatMessages,
    sendChatMessage,
    addReaction,
    moderateMessage,
    sendTip,
    setReminder,
    fetchReminders,
    startChatPolling,
    seedDemoData,
  } = useLiveSessions();

  const { subscribeToSession, unsubscribeFromSession } = useLiveTip();

  // Load initial data
  useEffect(() => {
    const initializeData = async () => {
      // Migrate existing sessions to new time-based categorization system
      try {
        const { projectId, publicAnonKey } = await import('../utils/supabase/info');
        
        console.log('🔄 Migrating live sessions to time-based categorization...');
        const migrateResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/migrate-live-sessions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        });
        
        if (migrateResponse.ok) {
          const migrateResult = await migrateResponse.json();
          console.log('✅ Migration completed:', migrateResult.message);
        }
        
        // Clear old mock data
        await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/clear-live-data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        });
        console.log('Cleared existing live session mock data');
      } catch (error) {
        console.log('Note: Migration/cleanup failed (this is expected if no data exists):', error);
      }
      
      await fetchSessions();
      await fetchReminders();
    };
    
    initializeData();
  }, [fetchSessions, fetchReminders]);

  // Handle ongoing session chat and live tips
  useEffect(() => {
    if (sessions.ongoing.length > 0 && !currentSessionId) {
      const sessionId = sessions.ongoing[0].id;
      setCurrentSessionId(sessionId);
      fetchChatMessages(sessionId);
      
      // Subscribe to live tips for this session
      subscribeToSession(sessionId);
      
      // Start polling for chat updates
      const stopPolling = startChatPolling(sessionId);
      
      return () => {
        stopPolling();
        unsubscribeFromSession(sessionId);
      };
    }
  }, [sessions.ongoing, currentSessionId, fetchChatMessages, startChatPolling, subscribeToSession, unsubscribeFromSession]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSetReminder = async (sessionId: string, hasReminder: boolean) => {
    try {
      await setReminder(sessionId, !hasReminder);
      toast.success(hasReminder ? 'Reminder removed' : 'Reminder set');
    } catch (error) {
      toast.error('Failed to manage reminder');
    }
  };

  const handleSendMessage = async () => {
    if (newMessage.trim() && currentSessionId) {
      try {
        await sendChatMessage(currentSessionId, newMessage);
        setNewMessage('');
      } catch (error) {
        toast.error('Failed to send message');
      }
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    if (currentSessionId) {
      try {
        await addReaction(currentSessionId, messageId, emoji);
      } catch (error) {
        toast.error('Failed to add reaction');
      }
    }
  };

  const handlePinMessage = async (messageId: string, isPinned: boolean) => {
    if (currentSessionId) {
      try {
        await moderateMessage(currentSessionId, messageId, isPinned ? 'unpin' : 'pin');
        toast.success(isPinned ? 'Message unpinned' : 'Message pinned');
      } catch (error) {
        toast.error('Failed to moderate message');
      }
    }
  };

  const handleHideMessage = async (messageId: string) => {
    if (currentSessionId) {
      try {
        await moderateMessage(currentSessionId, messageId, 'hide');
        toast.success('Message hidden');
      } catch (error) {
        toast.error('Failed to hide message');
      }
    }
  };

  const handleSuperChat = async (amount: number) => {
    if (newMessage.trim() && currentSessionId) {
      try {
        await sendChatMessage(currentSessionId, newMessage, true, amount);
        setNewMessage('');
        setShowSuperChatModal(false);
        toast.success(`Super Chat sent with ${amount} tip!`);
      } catch (error) {
        toast.error('Failed to send Super Chat');
      }
    }
  };

  const handleSendTip = async (amount: number) => {
    if (currentSessionId) {
      try {
        await sendTip(currentSessionId, amount);
        setShowTipModal(false);
        setSelectedTipAmount(null);
        toast.success(`Tip of ${amount} sent!`);
      } catch (error) {
        toast.error('Failed to send tip');
      }
    }
  };

  const tipAmounts = [5, 10, 25, 50, 100];
  const emojis = ['👍', '❤️', '😊', '🔥', '👏', '🤔', '🙏', '😍'];

  const SessionCard = ({ session, type }: { session: LiveSession; type: 'upcoming' | 'archived' }) => (
    <Card className="mb-4 bg-card/50 backdrop-blur-sm border-border/50">
      <div className="flex gap-4 p-4">
        <div className="relative">
          <img
            src={session.thumbnail || "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=300&h=200&fit=crop"}
            alt={session.title}
            className="w-20 h-20 rounded-lg object-cover"
          />
          {session.isLive && (
            <Badge className="absolute -top-2 -right-2 bg-red-500 text-white animate-pulse">
              LIVE
            </Badge>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="line-clamp-2 mb-1">{session.title}</h3>
          <p className="text-muted-foreground text-sm line-clamp-2 mb-2">
            {session.description}
          </p>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
            <div className="flex items-center gap-1">
              <img
                src={session.hostImage || "https://images.unsplash.com/photo-1494790108755-2616b612b5c5?w=40&h=40&fit=crop"}
                alt={session.hostName}
                className="w-4 h-4 rounded-full"
              />
              <span>{session.hostName}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{session.duration}</span>
            </div>
            {session.viewerCount && (
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{session.viewerCount.toLocaleString()}</span>
              </div>
            )}
            {session.streamPlatform && (
              <div className="flex items-center gap-1">
                <span>{getPlatformIcon(session.streamPlatform)}</span>
                <span>{getPlatformName(session.streamPlatform)}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-sm">
              <Calendar className="w-4 h-4" />
              <span>{session.scheduledTime}</span>
              {session.streamPlatform && (
                <>
                  <span className="mx-2">•</span>
                  <Smartphone className="w-3 h-3" />
                  <span>{getPlatformIcon(session.streamPlatform)} {getPlatformName(session.streamPlatform)}</span>
                </>
              )}
            </div>
            
            {type === 'upcoming' && (
              <Button
                variant={session.hasReminder ? "default" : "outline"}
                size="sm"
                onClick={() => handleSetReminder(session.id, session.hasReminder || false)}
                className="flex items-center gap-1"
              >
                {session.hasReminder ? (
                  <>
                    <BellRing className="w-4 h-4" />
                    Reminder Set
                  </>
                ) : (
                  <>
                    <Bell className="w-4 h-4" />
                    Set Reminder
                  </>
                )}
              </Button>
            )}
            
            {session.isLive && session.streamUrl && (
              <Button
                size="sm"
                onClick={() => handleJoinLiveStream(session)}
                className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white"
              >
                <ExternalLink className="w-4 h-4" />
                Join Now
              </Button>
            )}
            
            {type === 'archived' && (
              <Button
                size="sm"
                onClick={() => onEpisodeSelect?.(session)}
                className="flex items-center gap-1"
              >
                <Play className="w-4 h-4" />
                Watch
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );

  const ChatMessage = ({ message }: { message: ChatMessage }) => {
    const formatTimestamp = (timestamp: string) => {
      try {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        
        if (diff < 60000) return 'now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return date.toLocaleDateString();
      } catch {
        return timestamp;
      }
    };

    return (
      <div className={`p-3 rounded-lg mb-2 ${message.isSuperChat ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30' : message.isPinned ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-muted/30'}`}>
        <div className="flex items-start gap-2">
          <img
            src={message.userAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=32&h=32&fit=crop"}
            alt={message.userName}
            className="w-6 h-6 rounded-full"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm">{message.userName}</span>
              {message.isSuperChat && (
                <Badge className="bg-yellow-500 text-black text-xs">
                  ${message.superChatAmount}
                </Badge>
              )}
              {message.isPinned && (
                <Pin className="w-3 h-3 text-blue-500" />
              )}
              <span className="text-xs text-muted-foreground ml-auto">{formatTimestamp(message.timestamp)}</span>
              {isAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-5 h-5 p-0">
                      <MoreVertical className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handlePinMessage(message.id, message.isPinned)}>
                      <Pin className="w-4 h-4 mr-2" />
                      {message.isPinned ? 'Unpin' : 'Pin'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleHideMessage(message.id)}>
                      <EyeOff className="w-4 h-4 mr-2" />
                      Hide
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            <p className="text-sm">{message.message}</p>
            {message.reactions.length > 0 && (
              <div className="flex items-center gap-1 mt-2">
                {message.reactions.map((reaction, index) => (
                  <button
                    key={index}
                    onClick={() => handleReaction(message.id, reaction.emoji)}
                    className="flex items-center gap-1 px-2 py-1 bg-muted/50 rounded-full text-xs hover:bg-muted"
                  >
                    <span>{reaction.emoji}</span>
                    <span>{reaction.count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden pt-[60px]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <h1 className="text-xl">Lives</h1>
        {isAdmin && (
          <Button className="flex items-center gap-2">
            <Video className="w-4 h-4" />
            Start Live
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mx-4 mt-4">
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="ongoing">Ongoing</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="p-4">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : sessions.upcoming.length > 0 ? (
            sessions.upcoming.map(session => (
              <SessionCard key={session.id} session={session} type="upcoming" />
            ))
          ) : (
            <div className="p-8 text-center">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="mb-2">No Upcoming Sessions</h3>
              <p className="text-muted-foreground">
                There are no live sessions scheduled at the moment.
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="ongoing" className="p-0">
          {sessions.ongoing.length > 0 ? (
            <div className="relative">
              {/* Main Content Container */}
              <div className="md:pr-80">
                {/* Video Player */}
                <div className="relative aspect-video bg-black">
                  <img
                    src={sessions.ongoing[0].thumbnail || "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=300&h=200&fit=crop"}
                    alt={sessions.ongoing[0].title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20" />
                  
                  {/* Live Indicator */}
                  <div className="absolute top-4 left-4 flex items-center gap-2">
                    <Badge className="bg-red-500 text-white animate-pulse">
                      🔴 LIVE
                    </Badge>
                    <Badge variant="secondary" className="bg-black/50 text-white">
                      <Users className="w-3 h-3 mr-1" />
                      {sessions.ongoing[0].viewerCount?.toLocaleString() || '0'}
                    </Badge>
                  </div>

                  {/* Action Buttons */}
                  <div className="absolute bottom-4 right-4 flex gap-2">
                    <Button
                      onClick={() => setShowTipDashboard(true)}
                      variant="outline"
                      size="sm"
                      className="bg-black/60 hover:bg-black/80 border-white/20 text-white"
                    >
                      <DollarSign className="w-4 h-4 mr-1" />
                      Stats
                    </Button>
                    <Button
                      onClick={() => setShowTipModal(true)}
                      className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
                      size="sm"
                    >
                      <Heart className="w-4 h-4 mr-1" />
                      Tip
                    </Button>
                  </div>
                </div>

                {/* Stream Info */}
                <div className="p-4 border-b border-border/50">
                  <h2 className="mb-2">{sessions.ongoing[0].title}</h2>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <img
                        src={sessions.ongoing[0].hostImage || "https://images.unsplash.com/photo-1494790108755-2616b612b5c5?w=40&h=40&fit=crop"}
                        alt={sessions.ongoing[0].hostName}
                        className="w-5 h-5 rounded-full"
                      />
                      <span>{sessions.ongoing[0].hostName}</span>
                    </div>
                    <span>{sessions.ongoing[0].duration}</span>
                  </div>
                </div>
              </div>

              {/* Chat - Desktop Sidebar / Mobile Bottom Sheet */}
              <div className="hidden md:block">
                <div className="fixed right-0 top-[180px] bottom-[60px] w-80 bg-card/90 backdrop-blur-sm border-l border-border/50 z-10">
                  <div className="p-4 border-b border-border/50">
                    <h3 className="flex items-center gap-2">
                      <MessageCircle className="w-4 h-4" />
                      Live Chat
                    </h3>
                  </div>
                  
                  <ScrollArea className="h-[calc(100vh-300px)]" ref={chatContainerRef}>
                    <div className="p-4">
                      {chatMessages.map(message => (
                        <ChatMessage key={message.id} message={message} />
                      ))}
                    </div>
                  </ScrollArea>

                  <div className="p-4 border-t border-border/50">
                    <div className="flex gap-2 mb-2">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      >
                        <Smile className="w-4 h-4" />
                      </Button>
                      <Button size="sm" onClick={handleSendMessage}>
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    {showEmojiPicker && (
                      <div className="flex gap-1 mb-2">
                        {emojis.map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => {
                              setNewMessage(prev => prev + emoji);
                              setShowEmojiPicker(false);
                            }}
                            className="p-1 hover:bg-muted rounded"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}

                    <Dialog open={showSuperChatModal} onOpenChange={setShowSuperChatModal}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full">
                          <DollarSign className="w-4 h-4 mr-1" />
                          Super Chat
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Super Chat</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Input
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Your highlighted message..."
                          />
                          <div className="grid grid-cols-3 gap-2">
                            {tipAmounts.map(amount => (
                              <Button
                                key={amount}
                                variant="outline"
                                onClick={() => handleSuperChat(amount)}
                                disabled={!newMessage.trim() || loading}
                              >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : `${amount}`}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>

              {/* Mobile Chat Bottom Sheet */}
              <div className="md:hidden">
                <Sheet open={isChatOpen} onOpenChange={setIsChatOpen}>
                  <SheetTrigger asChild>
                    <Button
                      className="fixed bottom-20 right-4 rounded-full w-12 h-12 bg-primary"
                      size="sm"
                    >
                      <MessageCircle className="w-5 h-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[60vh]">
                    <SheetHeader>
                      <SheetTitle className="flex items-center gap-2">
                        <MessageCircle className="w-4 h-4" />
                        Live Chat
                      </SheetTitle>
                    </SheetHeader>
                    
                    <ScrollArea className="h-[calc(60vh-150px)] mt-4" ref={chatContainerRef}>
                      <div className="pr-4">
                        {chatMessages.map(message => (
                          <ChatMessage key={message.id} message={message} />
                        ))}
                      </div>
                    </ScrollArea>

                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="flex gap-2 mb-2">
                        <Input
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Type a message..."
                          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                          className="flex-1"
                        />
                        <Button size="sm" onClick={handleSendMessage}>
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          <Smile className="w-4 h-4 mr-1" />
                          Emoji
                        </Button>
                        <Dialog open={showSuperChatModal} onOpenChange={setShowSuperChatModal}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="flex-1">
                              <DollarSign className="w-4 h-4 mr-1" />
                              Super Chat
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Super Chat</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <Input
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Your highlighted message..."
                              />
                              <div className="grid grid-cols-3 gap-2">
                                {tipAmounts.map(amount => (
                                  <Button
                                    key={amount}
                                    variant="outline"
                                    onClick={() => handleSuperChat(amount)}
                                    disabled={!newMessage.trim() || loading}
                                  >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : `${amount}`}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center">
              <Video className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="mb-2">No Live Sessions</h3>
              <p className="text-muted-foreground">
                There are no live sessions currently running.
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="archived" className="p-4">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : sessions.archived.length > 0 ? (
            sessions.archived.map(session => (
              <SessionCard key={session.id} session={session} type="archived" />
            ))
          ) : (
            <div className="p-8 text-center">
              <Archive className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="mb-2">No Archived Sessions</h3>
              <p className="text-muted-foreground">
                Previous live sessions will appear here once they're finished.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Enhanced Live Tip Features */}
      {currentSessionId && (
        <>
          <LiveTipAnimations sessionId={currentSessionId} />
          <TipParticles sessionId={currentSessionId} />
          <LiveTipTicker sessionId={currentSessionId} position="bottom" />
          <LiveTipTickerCompact sessionId={currentSessionId} />
          
          <EnhancedTipModal
            sessionId={currentSessionId}
            isOpen={showTipModal}
            onClose={() => setShowTipModal(false)}
          />
          
          {/* Tip Dashboard Modal */}
          <Dialog open={showTipDashboard} onOpenChange={setShowTipDashboard}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  Live Tip Dashboard
                </DialogTitle>
              </DialogHeader>
              <LiveTipDashboard sessionId={currentSessionId} isHost={isAdmin} />
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}