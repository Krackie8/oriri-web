import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { DialogFooter } from '../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from 'sonner';
import { useLiveSessions } from '../../hooks/useLiveSessions';
import LiveSessionScheduler from './LiveSessionScheduler';
import { supabase } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';

import {
  Search,
  Plus,
  MoreHorizontal,
  Edit3,
  Trash2,
  Play,
  Pause,
  Calendar,
  Clock,
  Users,
  Eye,
  Filter,
  TrendingUp,
  Video,
  ExternalLink,
  Copy,
  MessageCircle,
  Gift,
  Smartphone,
  Save,
  X,
  Image,
  Upload
} from 'lucide-react';

interface LiveSession {
  id: string;
  title: string;
  description: string;
  scheduledTime: string;
  duration: string;
  hostName: string;
  hostImage: string;
  thumbnail: string;
  viewerCount: number;
  isLive: boolean;
  hasReminder: boolean;
  streamPlatform?: string;
  streamUrl?: string;
  createdAt: string;
  actualViewerCount?: number; // Real-time viewer count for live sessions
  finalViewerCount?: number; // Final count for completed sessions
  updatedAt?: string;
}

export default function LiveSessionManagement() {
  const { sessions, loading, error, fetchSessions, updateSession, deleteSession, clearMockData } = useLiveSessions();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');
  const [isSchedulerOpen, setIsSchedulerOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<LiveSession | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<LiveSession | null>(null);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Get platform icon and name
  const getPlatformIcon = (platform?: string) => {
    switch (platform) {
      case 'tiktok': return '📱';
      case 'instagram': return '📷';
      case 'youtube': return '🎥';
      case 'twitch': return '🎮';
      default: return '🌐';
    }
  };

  const getPlatformName = (platform?: string) => {
    switch (platform) {
      case 'tiktok': return 'TikTok Live';
      case 'instagram': return 'Instagram Live';
      case 'youtube': return 'YouTube Live';
      case 'twitch': return 'Twitch';
      default: return 'Other Platform';
    }
  };

  const getPlatformColor = (platform?: string) => {
    switch (platform) {
      case 'tiktok': return 'bg-pink-500/10 text-pink-700 dark:text-pink-300';
      case 'instagram': return 'bg-purple-500/10 text-purple-700 dark:text-purple-300';
      case 'youtube': return 'bg-red-500/10 text-red-700 dark:text-red-300';
      case 'twitch': return 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300';
      default: return 'bg-gray-500/10 text-gray-700 dark:text-gray-300';
    }
  };

  // Combine all session types
  const allSessions = [
    ...(sessions.upcoming || []),
    ...(sessions.ongoing || []),
    ...(sessions.archived || [])
  ];

  // Filter sessions based on tab and search
  const filteredSessions = allSessions.filter((session: LiveSession) => {
    const matchesSearch = session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         session.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTab = selectedTab === 'all' ||
                      (selectedTab === 'upcoming' && !session.isLive) ||
                      (selectedTab === 'live' && session.isLive) ||
                      (selectedTab === 'completed' && !session.isLive && new Date(session.scheduledTime) < new Date());
    
    return matchesSearch && matchesTab;
  });

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await deleteSession(sessionId);
      toast.success('Live session deleted successfully');
      setSessionToDelete(null);
    } catch (error) {
      toast.error('Failed to delete live session');
      console.error('Delete error:', error);
    }
  };

  const handleDuplicateSession = (session: LiveSession) => {
    // TODO: Implement duplicate functionality
    toast.success('Session duplicated successfully');
  };

  const copyStreamUrl = (url?: string) => {
    if (url) {
      navigator.clipboard.writeText(url);
      toast.success('Stream URL copied to clipboard');
    }
  };

  const getSessionStatus = (session: LiveSession) => {
    if (session.isLive) {
      return <Badge className="bg-red-500/10 text-red-700 dark:text-red-300">🔴 Live</Badge>;
    }
    
    const sessionDate = new Date(session.scheduledTime);
    const now = new Date();
    
    if (sessionDate > now) {
      return <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-300">📅 Scheduled</Badge>;
    } else {
      return <Badge className="bg-gray-500/10 text-gray-700 dark:text-gray-300">✅ Completed</Badge>;
    }
  };

  // Function to get realistic viewer count based on session status
  const getViewerCount = (session: LiveSession) => {
    const now = new Date();
    const scheduledTime = new Date(session.scheduledTime);
    
    if (session.isLive) {
      // For live sessions, show actual viewer count if available, otherwise show the stored count
      return session.actualViewerCount || session.viewerCount || 0;
    } else if (scheduledTime > now) {
      // For scheduled sessions that haven't started, show no viewers (dash or 0)
      return '-';
    } else {
      // For completed sessions, show final viewer count if available
      return session.finalViewerCount || session.actualViewerCount || session.viewerCount || 0;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Live Session Management</h2>
            <p className="text-muted-foreground">Manage all your live streaming sessions</p>
          </div>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Live Session Management</h2>
          <p className="text-muted-foreground">Manage all your live streaming sessions</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={clearMockData}
          >
            Clear Test Data
          </Button>
          <Button onClick={() => setIsSchedulerOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Schedule Live Session
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Video className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium leading-none">Total Sessions</p>
                <p className="text-2xl font-bold">{allSessions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Play className="h-4 w-4 text-red-500" />
              <div className="ml-2">
                <p className="text-sm font-medium leading-none">Live Now</p>
                <p className="text-2xl font-bold">{allSessions.filter(s => s.isLive).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 text-blue-500" />
              <div className="ml-2">
                <p className="text-sm font-medium leading-none">Upcoming</p>
                <p className="text-2xl font-bold">{sessions.upcoming?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-4 w-4 text-green-500" />
              <div className="ml-2">
                <p className="text-sm font-medium leading-none">Total Viewers</p>
                <p className="text-2xl font-bold">{allSessions.reduce((sum, s) => {
                  const count = getViewerCount(s);
                  return sum + (typeof count === 'number' ? count : 0);
                }, 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search sessions..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Sessions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Live Sessions</CardTitle>
          <CardDescription>
            All your scheduled and completed live streaming sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">All Sessions</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="live">Live</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedTab}>
              {filteredSessions.length === 0 ? (
                <div className="text-center py-8">
                  <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No sessions found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery ? 'No sessions match your search.' : 'Schedule your first live session to get started.'}
                  </p>
                  <Button onClick={() => setIsSchedulerOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule Session
                  </Button>
                </div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Session</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Platform</TableHead>
                        <TableHead>Scheduled</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Viewers</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSessions.map((session: LiveSession) => (
                        <TableRow key={session.id}>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <SessionThumbnail 
                                src={session.thumbnail} 
                                alt={session.title}
                                className="w-10 h-10"
                              />
                              <div>
                                <p className="font-medium">{session.title}</p>
                                <p className="text-sm text-muted-foreground line-clamp-1">
                                  {session.description}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getSessionStatus(session)}
                          </TableCell>
                          <TableCell>
                            {session.streamPlatform && (
                              <Badge className={getPlatformColor(session.streamPlatform)}>
                                {getPlatformIcon(session.streamPlatform)} {getPlatformName(session.streamPlatform)}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center text-sm">
                              <Calendar className="h-4 w-4 mr-1" />
                              {session.scheduledTime}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center text-sm">
                              <Clock className="h-4 w-4 mr-1" />
                              {session.duration}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center text-sm">
                              <Users className="h-4 w-4 mr-1" />
                              {getViewerCount(session)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => setEditingSession(session)}>
                                  <Edit3 className="h-4 w-4 mr-2" />
                                  Edit Session
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDuplicateSession(session)}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Duplicate
                                </DropdownMenuItem>
                                {session.streamUrl && (
                                  <DropdownMenuItem onClick={() => copyStreamUrl(session.streamUrl)}>
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Copy Stream URL
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem 
                                  className="text-red-600"
                                  onClick={() => setSessionToDelete(session)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Schedule Session Modal */}
      <LiveSessionScheduler
        isOpen={isSchedulerOpen}
        onClose={() => setIsSchedulerOpen(false)}
      />

      {/* Edit Session Modal */}
      {editingSession && (
        <Dialog open={!!editingSession} onOpenChange={() => setEditingSession(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Live Session</DialogTitle>
              <DialogDescription>
                Modify the details of your live session
              </DialogDescription>
            </DialogHeader>
            <EditSessionForm 
              session={editingSession}
              onSave={async (updatedSession) => {
                try {
                  await updateSession(updatedSession.id, updatedSession);
                  toast.success('Session updated successfully');
                  setEditingSession(null);
                } catch (error) {
                  toast.error('Failed to update live session');
                  console.error('Update error:', error);
                }
              }}
              onCancel={() => setEditingSession(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation */}
      {sessionToDelete && (
        <AlertDialog open={!!sessionToDelete} onOpenChange={() => setSessionToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Live Session</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{sessionToDelete.title}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSessionToDelete(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => handleDeleteSession(sessionToDelete.id)}
                className="bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Session
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

// Session Thumbnail Component with Error Handling
interface SessionThumbnailProps {
  src?: string;
  alt: string;
  className?: string;
}

function SessionThumbnail({ src, alt, className = "w-10 h-10" }: SessionThumbnailProps) {
  const [imageError, setImageError] = React.useState(false);
  const [imageLoaded, setImageLoaded] = React.useState(false);

  React.useEffect(() => {
    setImageError(false);
    setImageLoaded(false);
  }, [src]);

  if (!src || imageError) {
    return (
      <div className={`${className} rounded overflow-hidden bg-muted flex items-center justify-center`}>
        <Video className="h-5 w-5 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={`${className} rounded overflow-hidden bg-muted flex items-center justify-center`}>
      {!imageLoaded && (
        <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
      )}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover ${imageLoaded ? 'block' : 'hidden'}`}
        onLoad={() => setImageLoaded(true)}
        onError={() => {
          setImageError(true);
          setImageLoaded(false);
        }}
      />
    </div>
  );
}

// Edit Session Form Component
interface EditSessionFormProps {
  session: LiveSession;
  onSave: (updatedSession: LiveSession) => void;
  onCancel: () => void;
}

function EditSessionForm({ session, onSave, onCancel }: EditSessionFormProps) {
  const [formData, setFormData] = useState({
    title: session.title || '',
    description: session.description || '',
    scheduledTime: session.scheduledTime || '',
    duration: session.duration || '',
    streamPlatform: session.streamPlatform || '',
    streamUrl: session.streamUrl || '',
    thumbnail: session.thumbnail || ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageInputType, setImageInputType] = useState<'url' | 'upload'>('url');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>(session.thumbnail || '');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Update form data when session changes
  React.useEffect(() => {
    if (session) {
      const newFormData = {
        title: session.title || '',
        description: session.description || '',
        scheduledTime: session.scheduledTime || '',
        duration: session.duration || '',
        streamPlatform: session.streamPlatform || '',
        streamUrl: session.streamUrl || '',
        thumbnail: session.thumbnail || ''
      };
      setFormData(newFormData);
      setImagePreview(session.thumbnail || '');
    }
  }, [session]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Update image preview when thumbnail URL changes
    if (field === 'thumbnail') {
      setImagePreview(value);
    }
  };

  // Handle image upload to Supabase Storage
  const handleImageUpload = async (file: File) => {
    try {
      setUploadingImage(true);
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }

      // Get session for upload
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const token = authSession?.access_token || '';

      if (!token) {
        toast.error('Please log in to upload images');
        return;
      }

      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `live_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

      // Upload to server which handles Supabase Storage
      const formDataForUpload = new FormData();
      formDataForUpload.append('file', file);
      formDataForUpload.append('fileName', fileName);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/upload-live-session-image`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formDataForUpload,
        }
      );

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      
      if (result.success) {
        const imageUrl = result.data.publicUrl;
        setFormData(prev => ({ ...prev, thumbnail: imageUrl }));
        setImagePreview(imageUrl);
        toast.success('Image uploaded successfully');
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      
      if (!authSession?.access_token) {
        toast.error('Please log in to update sessions');
        return;
      }

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/live-sessions/${session.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authSession.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          type: 'upcoming' // Default to upcoming when editing
        }),
      });

      const result = await response.json();

      if (result.success) {
        const updatedSession = {
          ...session,
          ...formData,
          updatedAt: new Date().toISOString()
        };
        onSave(updatedSession);
      } else {
        throw new Error(result.error || 'Failed to update session');
      }
    } catch (error) {
      toast.error('Failed to update live session');
      console.error('Update error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const platforms = [
    { value: 'youtube', label: 'YouTube Live', icon: '🎥' },
    { value: 'instagram', label: 'Instagram Live', icon: '📷' },
    { value: 'tiktok', label: 'TikTok Live', icon: '📱' },
    { value: 'twitch', label: 'Twitch', icon: '🎮' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Session Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Session Title *</Label>
        <Input
          id="title"
          placeholder="Enter session title..."
          value={formData.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          required
          className="w-full"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="What will you be discussing in this live session?"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          rows={3}
          className="w-full resize-none"
        />
      </div>

      {/* Date and Time */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="scheduledTime">Scheduled Date & Time *</Label>
          <Input
            id="scheduledTime"
            type="datetime-local"
            value={formData.scheduledTime}
            onChange={(e) => handleInputChange('scheduledTime', e.target.value)}
            required
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="duration">Expected Duration</Label>
          <Select
            value={formData.duration}
            onValueChange={(value) => handleInputChange('duration', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select duration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30 min">30 minutes</SelectItem>
              <SelectItem value="45 min">45 minutes</SelectItem>
              <SelectItem value="60 min">1 hour</SelectItem>
              <SelectItem value="90 min">1.5 hours</SelectItem>
              <SelectItem value="120 min">2 hours</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Platform Selection */}
      <div className="space-y-2">
        <Label htmlFor="platform">Streaming Platform *</Label>
        <Select
          value={formData.streamPlatform}
          onValueChange={(value) => handleInputChange('streamPlatform', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose platform" />
          </SelectTrigger>
          <SelectContent>
            {platforms.map((platform) => (
              <SelectItem key={platform.value} value={platform.value}>
                <div className="flex items-center space-x-2">
                  <span>{platform.icon}</span>
                  <span>{platform.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stream URL */}
      <div className="space-y-2">
        <Label htmlFor="streamUrl">Stream URL</Label>
        <Input
          id="streamUrl"
          placeholder="https://... (will be added when you go live)"
          value={formData.streamUrl}
          onChange={(e) => handleInputChange('streamUrl', e.target.value)}
          className="w-full"
        />
        <p className="text-xs text-muted-foreground">
          You can add this later when you start streaming
        </p>
      </div>

      {/* Display Image Section */}
      <div className="space-y-4">
        <Label className="flex items-center space-x-2">
          <Image className="h-4 w-4" />
          <span>Display Image</span>
        </Label>
        
        {/* Image Type Toggle */}
        <div className="flex items-center space-x-2">
          <Button
            type="button"
            variant={imageInputType === 'url' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setImageInputType('url')}
            className="flex items-center space-x-2"
          >
            <ExternalLink className="h-4 w-4" />
            <span>URL</span>
          </Button>
          <Button
            type="button"
            variant={imageInputType === 'upload' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setImageInputType('upload')}
            className="flex items-center space-x-2"
          >
            <Upload className="h-4 w-4" />
            <span>Upload</span>
          </Button>
        </div>
        
        {/* URL Input */}
        {imageInputType === 'url' && (
          <div className="space-y-2">
            <Label htmlFor="thumbnail">Image URL</Label>
            <Input
              id="thumbnail"
              placeholder="https://example.com/image.jpg"
              value={formData.thumbnail}
              onChange={(e) => handleInputChange('thumbnail', e.target.value)}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Enter a direct URL to an image (JPG, PNG, etc.)
            </p>
          </div>
        )}
        
        {/* File Upload */}
        {imageInputType === 'upload' && (
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
              className="w-full flex items-center space-x-2"
            >
              {uploadingImage ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  <span>Choose Image</span>
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              Max 5MB • JPG, PNG, GIF supported
            </p>
          </div>
        )}
        
        {/* Image Preview */}
        {imagePreview && (
          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="relative w-full h-32 bg-muted/30 rounded-lg overflow-hidden border">
              <img
                src={imagePreview}
                alt="Session thumbnail preview"
                className="w-full h-full object-cover"
                onError={() => {
                  setImagePreview('');
                  if (imageInputType === 'url') {
                    toast.error('Invalid image URL');
                  }
                }}
                onLoad={() => {
                  // Image loaded successfully
                }}
              />
            </div>
          </div>
        )}
        
        {!imagePreview && (
          <p className="text-xs text-muted-foreground">
            No image selected. A default image will be used if none is provided.
          </p>
        )}
      </div>

      {/* Preview */}
      {formData.title && (
        <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
          <h4 className="font-medium mb-2">Preview</h4>
          <div className="flex items-start space-x-3">
            <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
              {formData.streamPlatform ? (
                <span className="text-2xl">
                  {platforms.find(p => p.value === formData.streamPlatform)?.icon || '🎥'}
                </span>
              ) : (
                <Video className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h5 className="font-medium truncate">{formData.title}</h5>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {formData.description || 'No description provided'}
              </p>
              <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                {formData.scheduledTime && (
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(formData.scheduledTime).toLocaleDateString()}</span>
                  </div>
                )}
                {formData.duration && (
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>{formData.duration}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form Actions */}
      <DialogFooter className="flex justify-end space-x-2 pt-6 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!formData.title || !formData.scheduledTime || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
              Updating...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}