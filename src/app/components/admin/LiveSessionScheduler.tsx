import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Calendar, Clock, Video, Users, Image, User, ExternalLink, Smartphone, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useLiveSessions } from '../../hooks/useLiveSessions';
import { supabase } from '../../utils/supabase/client';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { Switch } from '../ui/switch';

interface LiveSessionSchedulerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LiveSessionScheduler({ isOpen, onClose }: LiveSessionSchedulerProps) {
  const { createSession } = useLiveSessions();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scheduledDate: '',
    scheduledTime: '',
    duration: '',
    type: 'upcoming',
    thumbnailUrl: '',
    useProfilePicture: true,
    streamPlatform: '',
    streamUrl: '',
    isLive: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
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

  const formatScheduledTime = (date: string, time: string) => {
    if (!date || !time) return '';
    
    const today = new Date();
    const selectedDate = new Date(date);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (selectedDate.toDateString() === today.toDateString()) {
      return `Today, ${formatTime12Hour(time)}`;
    } else if (selectedDate.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow, ${formatTime12Hour(time)}`;
    } else {
      return `${selectedDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })}, ${formatTime12Hour(time)}`;
    }
  };

  const formatTime12Hour = (time24: string) => {
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('Please enter a session title');
      return;
    }
    
    if (!formData.description.trim()) {
      toast.error('Please enter a session description');
      return;
    }
    
    if (!formData.scheduledDate || !formData.scheduledTime) {
      toast.error('Please select both date and time');
      return;
    }
    
    if (!formData.duration) {
      toast.error('Please select session duration');
      return;
    }

    // Image is optional - we'll use a default if none provided

    setIsSubmitting(true);

    try {
      const scheduledTime = formatScheduledTime(formData.scheduledDate, formData.scheduledTime);
      
      // Get thumbnail URL
      let thumbnailUrl = '';
      if (formData.useProfilePicture) {
        // Get user's profile picture
        const { data: { session } } = await supabase.auth.getSession();
        thumbnailUrl = session?.user?.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1615411836704-2c1636331bc2?w=300&h=200&fit=crop';
      } else {
        thumbnailUrl = formData.thumbnailUrl.trim();
      }
      
      await createSession({
        title: formData.title.trim(),
        description: formData.description.trim(),
        scheduledTime,
        duration: formData.duration,
        type: 'upcoming',
        thumbnailUrl,
        streamPlatform: formData.streamPlatform,
        streamUrl: formData.streamUrl.trim(),
        isLive: formData.isLive
      });

      toast.success('Live session scheduled successfully!');
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        scheduledDate: '',
        scheduledTime: '',
        duration: '',
        type: 'upcoming',
        thumbnailUrl: '',
        useProfilePicture: true,
        streamPlatform: '',
        streamUrl: '',
        isLive: false
      });
      setImagePreview('');
      setUploadingImage(false);
      
      onClose();
    } catch (error) {
      console.error('Error scheduling live session:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to schedule live session');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting && !uploadingImage) {
      setFormData({
        title: '',
        description: '',
        scheduledDate: '',
        scheduledTime: '',
        duration: '',
        type: 'upcoming',
        thumbnailUrl: '',
        useProfilePicture: true,
        streamPlatform: '',
        streamUrl: '',
        isLive: false
      });
      setImagePreview('');
      setUploadingImage(false);
      onClose();
    }
  };

  // Get today's date in YYYY-MM-DD format for min date
  const today = new Date().toISOString().split('T')[0];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center space-x-2">
            <Video className="h-5 w-5 text-primary" />
            <span>Schedule Live Session</span>
          </DialogTitle>
          <DialogDescription>
            Create a new live streaming session that will appear in the Live page for your audience to see and set reminders.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2">
          <form onSubmit={handleSubmit} className="space-y-6 pb-4">
          {/* Session Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Session Title</Label>
            <Input
              id="title"
              placeholder="e.g., Live Q&A: Building Your Podcast"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              disabled={isSubmitting}
              className="w-full"
            />
          </div>

          {/* Session Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe what you'll be discussing in this live session..."
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              disabled={isSubmitting}
              rows={3}
              className="w-full resize-none"
            />
          </div>

          {/* Date and Time Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date" className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Date</span>
              </Label>
              <Input
                id="date"
                type="date"
                min={today}
                value={formData.scheduledDate}
                onChange={(e) => handleInputChange('scheduledDate', e.target.value)}
                disabled={isSubmitting}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time" className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>Time</span>
              </Label>
              <Input
                id="time"
                type="time"
                value={formData.scheduledTime}
                onChange={(e) => handleInputChange('scheduledTime', e.target.value)}
                disabled={isSubmitting}
                className="w-full"
              />
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Expected Duration</span>
            </Label>
            <Select
              value={formData.duration}
              onValueChange={(value) => handleInputChange('duration', value)}
              disabled={isSubmitting}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select session duration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30 min">30 minutes</SelectItem>
                <SelectItem value="45 min">45 minutes</SelectItem>
                <SelectItem value="60 min">1 hour</SelectItem>
                <SelectItem value="90 min">1.5 hours</SelectItem>
                <SelectItem value="120 min">2 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Live Streaming Platform */}
          <div className="space-y-4">
            <Label className="flex items-center space-x-2">
              <Smartphone className="h-4 w-4" />
              <span>Live Streaming Platform</span>
            </Label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="platform">Platform</Label>
                <Select
                  value={formData.streamPlatform}
                  onValueChange={(value) => handleInputChange('streamPlatform', value)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tiktok">📱 TikTok Live</SelectItem>
                    <SelectItem value="instagram">📷 Instagram Live</SelectItem>
                    <SelectItem value="youtube">🎥 YouTube Live</SelectItem>
                    <SelectItem value="twitch">🎮 Twitch</SelectItem>
                    <SelectItem value="other">🌐 Other Platform</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="streamUrl">Stream URL (Optional)</Label>
                <Input
                  id="streamUrl"
                  placeholder="https://tiktok.com/@username/live"
                  value={formData.streamUrl}
                  onChange={(e) => handleInputChange('streamUrl', e.target.value)}
                  disabled={isSubmitting}
                  className="w-full"
                />
              </div>
            </div>
            
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start space-x-2">
                <ExternalLink className="h-4 w-4 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    External Platform Integration
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    You'll go live on the selected platform, then share the URL here. Viewers will join through their platform apps for the best experience.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Session Image */}
          <div className="space-y-4">
            <Label className="flex items-center space-x-2">
              <Image className="h-4 w-4" />
              <span>Session Image</span>
            </Label>
            
            {/* Use Profile Picture Toggle */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center space-x-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">Use Your Profile Picture</p>
                  <p className="text-xs text-muted-foreground">Use your admin profile image as session thumbnail</p>
                </div>
              </div>
              <Switch
                checked={formData.useProfilePicture}
                onCheckedChange={(checked) => handleInputChange('useProfilePicture', checked)}
                disabled={isSubmitting}
              />
            </div>

            {/* Custom Image Upload */}
            {!formData.useProfilePicture && (
              <div className="space-y-3">
                <Label>Upload Custom Image</Label>
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
                  disabled={isSubmitting || uploadingImage}
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
            {(!formData.useProfilePicture && imagePreview) && (
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="relative w-24 h-16 bg-muted/30 rounded-lg overflow-hidden">
                  <img
                    src={imagePreview}
                    alt="Thumbnail preview"
                    className="w-full h-full object-cover"
                    onError={() => {
                      setImagePreview('');
                      setFormData(prev => ({ ...prev, thumbnailUrl: '' }));
                      toast.error('Image preview failed');
                    }}
                  />
                </div>
              </div>
            )}

            {(!formData.useProfilePicture && !imagePreview) && (
              <p className="text-xs text-muted-foreground">
                No image uploaded. A default image will be used if none is provided.
              </p>
            )}
          </div>

          {/* Preview */}
          {formData.title && formData.scheduledDate && formData.scheduledTime && (
            <div className="p-4 bg-muted/50 rounded-lg border">
              <h4 className="font-medium mb-2">Preview:</h4>
              <div className="text-sm space-y-1">
                <p><strong>Title:</strong> {formData.title}</p>
                <p><strong>Scheduled:</strong> {formatScheduledTime(formData.scheduledDate, formData.scheduledTime)}</p>
                {formData.duration && <p><strong>Duration:</strong> {formData.duration}</p>}
                {formData.streamPlatform && (
                  <p><strong>Platform:</strong> {
                    formData.streamPlatform === 'tiktok' ? '📱 TikTok Live' :
                    formData.streamPlatform === 'instagram' ? '📷 Instagram Live' :
                    formData.streamPlatform === 'youtube' ? '🎥 YouTube Live' :
                    formData.streamPlatform === 'twitch' ? '🎮 Twitch' :
                    '🌐 Other Platform'
                  }</p>
                )}
                {formData.streamUrl && <p><strong>Stream URL:</strong> {formData.streamUrl}</p>}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting || uploadingImage}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || uploadingImage}
              className="flex items-center space-x-2"
            >
              {(isSubmitting || uploadingImage) ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{uploadingImage ? 'Uploading...' : 'Scheduling...'}</span>
                </>
              ) : (
                <>
                  <Video className="h-4 w-4" />
                  <span>Schedule Session</span>
                </>
              )}
            </Button>
          </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}