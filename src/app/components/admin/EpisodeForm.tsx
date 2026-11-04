import React, { useState, useEffect } from 'react';
import { useEpisodeManagement, EpisodeFormData, ManagedEpisode } from '../../contexts/EpisodeManagementContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { Separator } from '../ui/separator';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import {
  Save,
  Upload,
  Calendar,
  Clock,
  Crown,
  Tag,
  User,
  Globe,
  Search,
  X,
  Plus,
  AlertCircle,
  File,
  Trash2
} from 'lucide-react';

interface EpisodeFormProps {
  episode?: ManagedEpisode;
  onSubmit: (data: EpisodeFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function EpisodeForm({ episode, onSubmit, onCancel, isLoading }: EpisodeFormProps) {
  const { availableCategories, availableTags } = useEpisodeManagement();
  
  const [formData, setFormData] = useState<EpisodeFormData>({
    title: '',
    description: '',
    fullDescription: '',
    image: '',
    audioUrl: '',
    videoUrl: '',
    duration: '',
    publishNow: true,
    scheduledDate: '',
    scheduledTime: '',
    isVipOnly: false,
    vipTier: 'vip',
    category: '',
    tags: [],
    transcript: '',
    summary: '',
    hasGuest: false,
    guest: {
      name: '',
      bio: '',
      image: '',
      links: []
    },
    seoTitle: '',
    seoDescription: '',
    keywords: []
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newTag, setNewTag] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState({ audio: 0, video: 0 });
  const [isUploading, setIsUploading] = useState(false);

  // Initialize form data if editing
  useEffect(() => {
    if (episode) {
      setFormData({
        title: episode.title,
        description: episode.description,
        fullDescription: episode.fullDescription || '',
        image: episode.image,
        audioUrl: episode.audioUrl || '',
        videoUrl: episode.videoUrl || '',
        duration: episode.duration,
        publishNow: episode.status === 'published',
        scheduledDate: episode.scheduledDate ? episode.scheduledDate.split('T')[0] : '',
        scheduledTime: episode.scheduledDate ? episode.scheduledDate.split('T')[1]?.split('.')[0] : '',
        isVipOnly: episode.isVipOnly,
        vipTier: episode.vipTier || 'vip',
        category: episode.category,
        tags: episode.tags,
        transcript: episode.transcript || '',
        summary: episode.summary || '',
        hasGuest: !!episode.guest,
        guest: episode.guest || {
          name: '',
          bio: '',
          image: '',
          links: []
        },
        seoTitle: episode.seoTitle || '',
        seoDescription: episode.seoDescription || '',
        keywords: episode.keywords || []
      });
    }
  }, [episode]);

  const handleInputChange = (field: keyof EpisodeFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleGuestChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      guest: {
        ...prev.guest!,
        [field]: value
      }
    }));
  };

  const addGuestLink = () => {
    setFormData(prev => ({
      ...prev,
      guest: {
        ...prev.guest!,
        links: [...prev.guest!.links, { platform: '', url: '' }]
      }
    }));
  };

  const updateGuestLink = (index: number, field: 'platform' | 'url', value: string) => {
    setFormData(prev => ({
      ...prev,
      guest: {
        ...prev.guest!,
        links: prev.guest!.links.map((link, i) => 
          i === index ? { ...link, [field]: value } : link
        )
      }
    }));
  };

  const removeGuestLink = (index: number) => {
    setFormData(prev => ({
      ...prev,
      guest: {
        ...prev.guest!,
        links: prev.guest!.links.filter((_, i) => i !== index)
      }
    }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const addKeyword = () => {
    if (newKeyword.trim() && !formData.keywords?.includes(newKeyword.trim())) {
      setFormData(prev => ({
        ...prev,
        keywords: [...(prev.keywords || []), newKeyword.trim()]
      }));
      setNewKeyword('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setFormData(prev => ({
      ...prev,
      keywords: prev.keywords?.filter(k => k !== keyword) || []
    }));
  };

  const uploadFileToSupabase = async (file: File, path: string): Promise<string> => {
    console.log(`Uploading file: ${file.name} (${file.size} bytes) to path: ${path}`);
    
    // Check file size - Supabase free tier has a 50MB limit per file
    const maxFileSize = 50 * 1024 * 1024; // 50MB in bytes
    if (file.size > maxFileSize) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      throw new Error(`File too large: ${fileSizeMB}MB. Maximum allowed: 50MB. Please compress your file or use a smaller file.`);
    }
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);

    try {
      // Import Supabase info to get the project ID
      const { projectId, publicAnonKey } = await import('../../utils/supabase/info');
      
      console.log(`Making upload request to: https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/upload`);
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: formData,
      });

      console.log(`Upload response status: ${response.status}`);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || `Upload failed with status ${response.status}`;
          if (errorData.details) {
            errorMessage += ` - ${errorData.details}`;
          }
          
          // Handle specific error cases with helpful messages
          if (response.status === 413 || errorMessage.includes('exceeded the maximum allowed size')) {
            const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
            errorMessage = `File too large: ${fileSizeMB}MB. Supabase has a file size limit. Please compress your file or use a smaller file.`;
          } else if (response.status === 409 || errorMessage.includes('already exists')) {
            errorMessage = 'File upload conflict - please try again or rename your file.';
          }
        } catch (parseError) {
          // If JSON parsing fails, try to get text
          try {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
          } catch (textError) {
            // Keep default error message
            if (response.status === 413) {
              errorMessage = 'File too large - please use a smaller file (max 50MB recommended).';
            }
          }
        }
        throw new Error(`Upload failed: ${errorMessage}`);
      }

      const data = await response.json();
      console.log('Upload successful, received data:', data);
      
      if (!data.url) {
        throw new Error('Upload succeeded but no URL returned');
      }
      
      return data.url;
    } catch (error) {
      console.error('❌ Upload error:', error);
      throw error;
    }
  };

  const getMediaDuration = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const element = file.type.startsWith('video/') 
        ? document.createElement('video')
        : document.createElement('audio');
      
      element.preload = 'metadata';
      
      element.onloadedmetadata = () => {
        window.URL.revokeObjectURL(element.src);
        const duration = element.duration;
        
        if (isNaN(duration)) {
          resolve('00:00');
          return;
        }
        
        const minutes = Math.floor(duration / 60);
        const seconds = Math.floor(duration % 60);
        const formattedDuration = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        resolve(formattedDuration);
      };
      
      element.onerror = () => {
        window.URL.revokeObjectURL(element.src);
        resolve('00:00'); // Default if we can't detect
      };
      
      element.src = window.URL.createObjectURL(file);
    });
  };

  const handleAudioFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size before proceeding
      const maxFileSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxFileSize) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        alert(`Audio file too large: ${fileSizeMB}MB. Maximum allowed: 50MB. Please compress your file.`);
        e.target.value = ''; // Clear the input
        return;
      }
      
      setAudioFile(file);
      // Clear the audioUrl since we're uploading a file
      handleInputChange('audioUrl', '');
      
      // Auto-detect duration
      try {
        const duration = await getMediaDuration(file);
        handleInputChange('duration', duration);
        console.log('Auto-detected audio duration:', duration);
      } catch (error) {
        console.warn('Could not detect audio duration:', error);
      }
    }
  };

  const handleVideoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size before proceeding
      const maxFileSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxFileSize) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        alert(`Video file too large: ${fileSizeMB}MB. Maximum allowed: 50MB. Please compress your file.`);
        e.target.value = ''; // Clear the input
        return;
      }
      
      setVideoFile(file);
      // Clear the videoUrl since we're uploading a file
      handleInputChange('videoUrl', '');
      
      // Auto-detect duration
      try {
        const duration = await getMediaDuration(file);
        handleInputChange('duration', duration);
        console.log('Auto-detected video duration:', duration);
      } catch (error) {
        console.warn('Could not detect video duration:', error);
      }
    }
  };

  const handleFileUpload = async (): Promise<{ audioUrl?: string; videoUrl?: string }> => {
    const uploads: { audioUrl?: string; videoUrl?: string } = {};
    setIsUploading(true);

    try {
      if (audioFile) {
        setUploadProgress(prev => ({ ...prev, audio: 10 }));
        const audioPath = `audio`;
        setUploadProgress(prev => ({ ...prev, audio: 50 }));
        uploads.audioUrl = await uploadFileToSupabase(audioFile, audioPath);
        setUploadProgress(prev => ({ ...prev, audio: 100 }));
      }

      if (videoFile) {
        setUploadProgress(prev => ({ ...prev, video: 10 }));
        const videoPath = `video`;
        setUploadProgress(prev => ({ ...prev, video: 50 }));
        uploads.videoUrl = await uploadFileToSupabase(videoFile, videoPath);
        setUploadProgress(prev => ({ ...prev, video: 100 }));
      }
    } catch (error) {
      console.error('Upload error:', error);
      // Reset progress on error
      setUploadProgress({ audio: 0, video: 0 });
      throw error;
    } finally {
      setIsUploading(false);
    }

    return uploads;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.image.trim()) newErrors.image = 'Image URL is required';
    if (!formData.duration.trim()) newErrors.duration = 'Duration is required';
    if (!formData.category) newErrors.category = 'Category is required';

    if (!formData.publishNow && !formData.scheduledDate) {
      newErrors.scheduledDate = 'Scheduled date is required when not publishing now';
    }

    if (formData.hasGuest && !formData.guest?.name.trim()) {
      newErrors.guestName = 'Guest name is required when guest is selected';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const testServerHealth = async () => {
    try {
      const { projectId, publicAnonKey } = await import('../../utils/supabase/info');
      console.log('Testing server health...');
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      const data = await response.json();
      console.log('Server health check result:', data);
      alert(`Server Health: ${data.status}\nStorage Available: ${data.storage?.available}\nBucket Exists: ${data.storage?.bucketExists}\n${data.storage?.error ? `Error: ${data.storage.error}` : ''}`);
    } catch (error) {
      console.error('Health check failed:', error);
      alert(`Health check failed: ${error.message}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      console.log('Starting episode form submission...');
      
      // Upload files first if they exist
      console.log('Uploading files...');
      const uploads = await handleFileUpload();
      console.log('File uploads completed:', uploads);
      
      // Merge uploaded URLs with form data
      const finalData = {
        ...formData,
        ...(uploads.audioUrl && { audioUrl: uploads.audioUrl }),
        ...(uploads.videoUrl && { videoUrl: uploads.videoUrl })
      };

      console.log('Submitting final episode data...');
      await onSubmit(finalData);
      console.log('Episode form submission completed successfully');
    } catch (err) {
      console.error('❌ Error submitting episode form:', err);
      
      // Show user-friendly error message
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      alert(`Failed to create episode: ${errorMessage}`);
      
      // Reset upload progress on error
      setUploadProgress({ audio: 0, video: 0 });
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {episode ? 'Edit Episode' : 'Create New Episode'}
          </h2>
          <p className="text-muted-foreground">
            {episode ? 'Update episode details and settings' : 'Add a new episode to your podcast'}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || isUploading} className="flex items-center space-x-2">
            <Save className="h-4 w-4" />
            <span>
              {isUploading ? 'Uploading Files...' : 
               isLoading ? 'Saving...' : 
               (episode ? 'Update' : 'Create')}
            </span>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="basic" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="publishing">Publishing</TabsTrigger>
          <TabsTrigger value="guest">Guest</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="h-5 w-5" />
                <span>Basic Information</span>
              </CardTitle>
              <CardDescription>
                Essential details about your episode
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Episode Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      placeholder="Enter episode title"
                      className={errors.title ? 'border-red-500' : ''}
                    />
                    {errors.title && (
                      <p className="text-sm text-red-500 mt-1">{errors.title}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="description">Short Description *</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Brief description for the episode"
                      rows={3}
                      className={errors.description ? 'border-red-500' : ''}
                    />
                    {errors.description && (
                      <p className="text-sm text-red-500 mt-1">{errors.description}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="fullDescription">Full Description</Label>
                    <Textarea
                      id="fullDescription"
                      value={formData.fullDescription}
                      onChange={(e) => handleInputChange('fullDescription', e.target.value)}
                      placeholder="Detailed description of the episode content"
                      rows={4}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="image">Episode Image URL *</Label>
                    <Input
                      id="image"
                      value={formData.image}
                      onChange={(e) => handleInputChange('image', e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className={errors.image ? 'border-red-500' : ''}
                    />
                    {errors.image && (
                      <p className="text-sm text-red-500 mt-1">{errors.image}</p>
                    )}
                    {formData.image && (
                      <div className="mt-2">
                        <ImageWithFallback
                          src={formData.image}
                          alt="Episode preview"
                          className="w-32 h-24 object-cover rounded"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="duration">Duration {formData.duration ? '(Auto-detected)' : '*'}</Label>
                      <Input
                        id="duration"
                        value={formData.duration}
                        readOnly={!!formData.duration}
                        onChange={(e) => handleInputChange('duration', e.target.value)}
                        placeholder="Upload audio/video to auto-detect"
                        className={`${errors.duration ? 'border-red-500' : ''} ${formData.duration ? 'bg-muted cursor-not-allowed' : ''}`}
                      />
                      {formData.duration ? (
                        <p className="text-sm text-muted-foreground mt-1">
                          Duration detected from uploaded media file
                        </p>
                      ) : (
                        <>
                          {errors.duration && (
                            <p className="text-sm text-red-500 mt-1">{errors.duration}</p>
                          )}
                          <p className="text-sm text-muted-foreground mt-1">
                            Upload an audio or video file to auto-detect duration
                          </p>
                        </>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="category">Category *</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => handleInputChange('category', value)}
                      >
                        <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableCategories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.category && (
                        <p className="text-sm text-red-500 mt-1">{errors.category}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label>Audio File Upload</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Input
                          type="file"
                          accept="audio/*"
                          onChange={handleAudioFileChange}
                          className="flex-1"
                        />
                        {audioFile && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setAudioFile(null)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      {audioFile && (
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <File className="h-4 w-4" />
                          <span>{audioFile.name}</span>
                          <span>({(audioFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                        </div>
                      )}
                      {isUploading && uploadProgress.audio > 0 && (
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${uploadProgress.audio}%` }}
                          ></div>
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        Or provide a URL below:
                      </div>
                      <Input
                        value={formData.audioUrl}
                        onChange={(e) => handleInputChange('audioUrl', e.target.value)}
                        placeholder="https://example.com/audio.mp3"
                        disabled={!!audioFile}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Video File Upload</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Input
                          type="file"
                          accept="video/*"
                          onChange={handleVideoFileChange}
                          className="flex-1"
                        />
                        {videoFile && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setVideoFile(null)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      {videoFile && (
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <File className="h-4 w-4" />
                          <span>{videoFile.name}</span>
                          <span>({(videoFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                        </div>
                      )}
                      {isUploading && uploadProgress.video > 0 && (
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${uploadProgress.video}%` }}
                          ></div>
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        Or provide a URL below:
                      </div>
                      <Input
                        value={formData.videoUrl}
                        onChange={(e) => handleInputChange('videoUrl', e.target.value)}
                        placeholder="https://example.com/video.mp4"
                        disabled={!!videoFile}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Tag className="h-5 w-5" />
                <span>Content & Tags</span>
              </CardTitle>
              <CardDescription>
                Organize your content with tags and additional details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center space-x-1">
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <Select
                    value={newTag}
                    onValueChange={setNewTag}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select or type a tag" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTags.filter(tag => !formData.tags.includes(tag)).map((tag) => (
                        <SelectItem key={tag} value={tag}>
                          {tag}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Custom tag"
                    className="flex-1"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  />
                  <Button type="button" onClick={addTag} variant="outline" size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="summary">Episode Summary</Label>
                <Textarea
                  id="summary"
                  value={formData.summary}
                  onChange={(e) => handleInputChange('summary', e.target.value)}
                  placeholder="Key takeaways and summary of the episode"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="transcript">Transcript</Label>
                <Textarea
                  id="transcript"
                  value={formData.transcript}
                  onChange={(e) => handleInputChange('transcript', e.target.value)}
                  placeholder="Episode transcript (optional)"
                  rows={6}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="publishing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Publishing Settings</span>
              </CardTitle>
              <CardDescription>
                Control when and how your episode is published
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="publishNow"
                  checked={formData.publishNow}
                  onCheckedChange={(checked) => handleInputChange('publishNow', checked)}
                />
                <Label htmlFor="publishNow">Publish immediately</Label>
              </div>

              {!formData.publishNow && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="scheduledDate">Scheduled Date *</Label>
                    <Input
                      id="scheduledDate"
                      type="date"
                      value={formData.scheduledDate}
                      onChange={(e) => handleInputChange('scheduledDate', e.target.value)}
                      className={errors.scheduledDate ? 'border-red-500' : ''}
                    />
                    {errors.scheduledDate && (
                      <p className="text-sm text-red-500 mt-1">{errors.scheduledDate}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="scheduledTime">Scheduled Time</Label>
                    <Input
                      id="scheduledTime"
                      type="time"
                      value={formData.scheduledTime}
                      onChange={(e) => handleInputChange('scheduledTime', e.target.value)}
                    />
                  </div>
                </div>
              )}

              <Separator />

              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <Crown className="h-5 w-5 text-purple-500" />
                  <Label>VIP Settings</Label>
                </div>
                
                <div className="flex items-center space-x-2 mb-3">
                  <Switch
                    id="isVipOnly"
                    checked={formData.isVipOnly}
                    onCheckedChange={(checked) => handleInputChange('isVipOnly', checked)}
                  />
                  <Label htmlFor="isVipOnly">VIP Only Episode</Label>
                </div>

                {formData.isVipOnly && (
                  <div>
                    <Label htmlFor="vipTier">VIP Tier Required</Label>
                    <Select
                      value={formData.vipTier}
                      onValueChange={(value) => handleInputChange('vipTier', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vip">VIP (AED 20/month)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formData.isVipOnly && (
                  <Alert className="mt-3">
                    <Crown className="h-4 w-4" />
                    <AlertDescription>
                      This episode will only be accessible to VIP subscribers (AED 20/month).
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guest" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Guest Information</span>
              </CardTitle>
              <CardDescription>
                Add details about your episode guest
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="hasGuest"
                  checked={formData.hasGuest}
                  onCheckedChange={(checked) => handleInputChange('hasGuest', checked)}
                />
                <Label htmlFor="hasGuest">This episode has a guest</Label>
              </div>

              {formData.hasGuest && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="guestName">Guest Name *</Label>
                      <Input
                        id="guestName"
                        value={formData.guest?.name || ''}
                        onChange={(e) => handleGuestChange('name', e.target.value)}
                        placeholder="Guest's full name"
                        className={errors.guestName ? 'border-red-500' : ''}
                      />
                      {errors.guestName && (
                        <p className="text-sm text-red-500 mt-1">{errors.guestName}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="guestImage">Guest Image URL</Label>
                      <Input
                        id="guestImage"
                        value={formData.guest?.image || ''}
                        onChange={(e) => handleGuestChange('image', e.target.value)}
                        placeholder="https://example.com/guest-photo.jpg"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="guestBio">Guest Bio</Label>
                    <Textarea
                      id="guestBio"
                      value={formData.guest?.bio || ''}
                      onChange={(e) => handleGuestChange('bio', e.target.value)}
                      placeholder="Brief biography of the guest"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label>Guest Links</Label>
                    <div className="space-y-2">
                      {formData.guest?.links.map((link, index) => (
                        <div key={index} className="flex space-x-2">
                          <Input
                            value={link.platform}
                            onChange={(e) => updateGuestLink(index, 'platform', e.target.value)}
                            placeholder="Platform (e.g., LinkedIn)"
                            className="flex-1"
                          />
                          <Input
                            value={link.url}
                            onChange={(e) => updateGuestLink(index, 'url', e.target.value)}
                            placeholder="https://..."
                            className="flex-2"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeGuestLink(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addGuestLink}
                        className="flex items-center space-x-2"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Add Link</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seo" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Search className="h-5 w-5" />
                <span>SEO & Discovery</span>
              </CardTitle>
              <CardDescription>
                Optimize your episode for search engines and discovery
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="seoTitle">SEO Title</Label>
                <Input
                  id="seoTitle"
                  value={formData.seoTitle}
                  onChange={(e) => handleInputChange('seoTitle', e.target.value)}
                  placeholder="Optimized title for search engines"
                />
              </div>

              <div>
                <Label htmlFor="seoDescription">SEO Description</Label>
                <Textarea
                  id="seoDescription"
                  value={formData.seoDescription}
                  onChange={(e) => handleInputChange('seoDescription', e.target.value)}
                  placeholder="Meta description for search engines"
                  rows={3}
                />
              </div>

              <div>
                <Label>Keywords</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.keywords?.map((keyword) => (
                    <Badge key={keyword} variant="outline" className="flex items-center space-x-1">
                      <span>{keyword}</span>
                      <button
                        type="button"
                        onClick={() => removeKeyword(keyword)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <Input
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    placeholder="Add SEO keyword"
                    className="flex-1"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                  />
                  <Button type="button" onClick={addKeyword} variant="outline" size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </form>
  );
}