import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { Plus, Edit3, Trash2, Calendar, Clock, Users, RefreshCw, Upload, Image } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { useSimpleLiveSessions } from '../../hooks/useSimpleLiveSessions';
import { supabase } from '../../utils/supabase/client';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface LiveSession {
  id: string;
  title: string;
  description: string;
  scheduledTime: string;
  duration: string;
  hostId: string;
  hostName: string;
  hostImage: string;
  thumbnail?: string;
  createdAt: string;
  viewerCount: number;
  isLive: boolean;
  hasReminder?: boolean;
  streamPlatform?: string;
  streamUrl?: string;
  updatedAt?: string;
}

export default function SimpleLiveSessionManagement() {
  const { sessions, loading, error, fetchSessions, createSession, updateSession, deleteSession } = useSimpleLiveSessions();
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<LiveSession | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<LiveSession | null>(null);
  
  // Image upload states
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state for create/edit
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scheduledTime: '',
    duration: '60 min',
    streamPlatform: 'youtube',
    streamUrl: '',
    thumbnailUrl: ''
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      scheduledTime: '',
      duration: '60 min',
      streamPlatform: 'youtube',
      streamUrl: '',
      thumbnailUrl: ''
    });
    setImagePreview('');
    setUploadingImage(false);
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
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || publicAnonKey;

      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `live_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

      // Upload to server which handles Supabase Storage
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', fileName);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/upload-live-session-image`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      
      if (result.success) {
        const imageUrl = result.data.publicUrl;
        setFormData(prev => ({ ...prev, thumbnailUrl: imageUrl }));
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

  const handleCreate = async () => {
    try {
      if (!formData.title.trim() || !formData.scheduledTime) {
        toast.error('Please fill in required fields');
        return;
      }

      // Use provided thumbnail URL or generate a default one
      const thumbnailUrl = formData.thumbnailUrl || `https://picsum.photos/400/300?random=${Date.now()}`;
      
      // Ensure both field names are included for backend compatibility
      const createData = {
        ...formData,
        type: 'upcoming',
        thumbnail: thumbnailUrl, // Map to thumbnail for backend
        thumbnailUrl // Keep both for backwards compatibility
      };

      console.log('Creating session with data:', createData);
      await createSession(createData);

      toast.success('Live session created successfully');
      setIsCreateModalOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to create live session');
      console.error('Create error:', error);
    }
  };

  const handleEdit = async () => {
    try {
      if (!editingSession || !formData.title.trim() || !formData.scheduledTime) {
        toast.error('Please fill in required fields');
        return;
      }

      // Ensure the thumbnail field is properly mapped for the backend
      const updateData = {
        ...formData,
        thumbnail: formData.thumbnailUrl, // Map thumbnailUrl to thumbnail for backend compatibility
        thumbnailUrl: formData.thumbnailUrl // Keep both for backwards compatibility
      };

      console.log('Sending update data:', updateData);
      await updateSession(editingSession.id, updateData);
      toast.success('Live session updated successfully');
      setIsEditModalOpen(false);
      setEditingSession(null);
      resetForm();
    } catch (error) {
      toast.error('Failed to update live session');
      console.error('Update error:', error);
    }
  };

  const handleDelete = async (sessionId: string) => {
    try {
      await deleteSession(sessionId);
      toast.success('Live session deleted successfully');
      setSessionToDelete(null);
    } catch (error) {
      toast.error('Failed to delete live session');
      console.error('Delete error:', error);
    }
  };

  const openEditModal = (session: LiveSession) => {
    setEditingSession(session);
    setFormData({
      title: session.title,
      description: session.description,
      scheduledTime: session.scheduledTime,
      duration: session.duration,
      streamPlatform: session.streamPlatform || 'youtube',
      streamUrl: session.streamUrl || '',
      thumbnailUrl: session.thumbnail || ''
    });
    setImagePreview(session.thumbnail || '');
    setIsEditModalOpen(true);
  };

  const openCreateModal = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  const getStatusBadge = (session: LiveSession) => {
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

  const getPlatformBadge = (platform?: string) => {
    const platformNames = {
      youtube: 'YouTube Live',
      tiktok: 'TikTok Live',
      instagram: 'Instagram Live',
      twitch: 'Twitch'
    };

    const platformColors = {
      youtube: 'bg-red-500/10 text-red-700 dark:text-red-300',
      tiktok: 'bg-pink-500/10 text-pink-700 dark:text-pink-300',
      instagram: 'bg-purple-500/10 text-purple-700 dark:text-purple-300',
      twitch: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
    };

    if (!platform) return null;

    return (
      <Badge className={platformColors[platform as keyof typeof platformColors] || 'bg-gray-500/10 text-gray-700 dark:text-gray-300'}>
        {platformNames[platform as keyof typeof platformNames] || platform}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Live Session Management</h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
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
            onClick={fetchSessions}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4 mr-2" />
            Schedule Live Session
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-300">Error: {error}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Total Sessions</p>
                <p className="text-2xl font-bold">{sessions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Live Now</p>
                <p className="text-2xl font-bold">{sessions.filter(s => s.isLive).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Upcoming</p>
                <p className="text-2xl font-bold">
                  {sessions.filter(s => !s.isLive && new Date(s.scheduledTime) > new Date()).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Total Viewers</p>
                <p className="text-2xl font-bold">{sessions.reduce((acc, s) => acc + s.viewerCount, 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sessions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Live Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No live sessions found.</p>
              <Button 
                className="mt-4" 
                onClick={openCreateModal}
              >
                <Plus className="h-4 w-4 mr-2" />
                Schedule Your First Session
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
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
                  {sessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <img
                            src={session.thumbnail || `https://picsum.photos/400/300?random=${session.id}`}
                            alt={session.title}
                            className="w-10 h-10 rounded object-cover"
                          />
                          <div>
                            <p className="font-medium">{session.title}</p>
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {session.description}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(session)}</TableCell>
                      <TableCell>{getPlatformBadge(session.streamPlatform)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(session.scheduledTime).toLocaleDateString()} at{' '}
                          {new Date(session.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </TableCell>
                      <TableCell>{session.duration}</TableCell>
                      <TableCell>{session.viewerCount}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(session)}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSessionToDelete(session)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Session Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Schedule Live Session</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter session title"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter session description"
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Scheduled Time</label>
              <Input
                type="datetime-local"
                value={formData.scheduledTime}
                onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Duration</label>
              <Input
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                placeholder="e.g., 60 min"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Platform</label>
              <select
                className="w-full p-2 border rounded-md bg-background"
                value={formData.streamPlatform}
                onChange={(e) => setFormData({ ...formData, streamPlatform: e.target.value })}
              >
                <option value="youtube">YouTube Live</option>
                <option value="tiktok">TikTok Live</option>
                <option value="instagram">Instagram Live</option>
                <option value="twitch">Twitch</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Stream URL (Optional)</label>
              <Input
                value={formData.streamUrl}
                onChange={(e) => setFormData({ ...formData, streamUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
            
            {/* Display Image Section */}
            <div>
              <label className="text-sm font-medium">Display Image</label>
              <div className="space-y-3">
                {/* File Upload */}
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
                        <Image className="h-4 w-4" />
                        <span>Choose Image</span>
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Max 5MB • JPG, PNG, GIF supported
                  </p>
                </div>
                
                {/* Image Preview */}
                {imagePreview && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Preview:</p>
                    <div className="relative w-full h-24 bg-muted rounded-md overflow-hidden">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={() => {
                          setImagePreview('');
                          setFormData(prev => ({ ...prev, thumbnailUrl: '' }));
                          toast.error('Failed to load image');
                        }}
                      />
                    </div>
                  </div>
                )}
                
                {!imagePreview && (
                  <p className="text-xs text-muted-foreground">
                    No image uploaded. A default image will be used if none is provided.
                  </p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>
              Create Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Session Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Live Session</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter session title"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter session description"
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Scheduled Time</label>
              <Input
                type="datetime-local"
                value={formData.scheduledTime}
                onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Duration</label>
              <Input
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                placeholder="e.g., 60 min"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Platform</label>
              <select
                className="w-full p-2 border rounded-md bg-background"
                value={formData.streamPlatform}
                onChange={(e) => setFormData({ ...formData, streamPlatform: e.target.value })}
              >
                <option value="youtube">YouTube Live</option>
                <option value="tiktok">TikTok Live</option>
                <option value="instagram">Instagram Live</option>
                <option value="twitch">Twitch</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Stream URL (Optional)</label>
              <Input
                value={formData.streamUrl}
                onChange={(e) => setFormData({ ...formData, streamUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
            
            {/* Display Image Section */}
            <div>
              <label className="text-sm font-medium">Display Image</label>
              <div className="space-y-3">
                {/* File Upload */}
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
                        <Image className="h-4 w-4" />
                        <span>Choose Image</span>
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Max 5MB • JPG, PNG, GIF supported
                  </p>
                </div>
                
                {/* Image Preview */}
                {imagePreview && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Preview:</p>
                    <div className="relative w-full h-24 bg-muted rounded-md overflow-hidden">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={() => {
                          setImagePreview('');
                          setFormData(prev => ({ ...prev, thumbnailUrl: '' }));
                          toast.error('Failed to load image');
                        }}
                      />
                    </div>
                  </div>
                )}
                
                {!imagePreview && (
                  <p className="text-xs text-muted-foreground">
                    No image uploaded. A default image will be used if none is provided.
                  </p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <AlertDialog open={!!sessionToDelete} onOpenChange={() => setSessionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Live Session</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{sessionToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => sessionToDelete && handleDelete(sessionToDelete.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}