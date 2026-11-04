import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../utils/supabase/client';

// Episode data structure for management
export interface ManagedEpisode {
  id: string;
  title: string;
  description: string;
  fullDescription?: string;
  image: string;
  audioUrl?: string;
  videoUrl?: string;
  duration: string;
  durationSeconds: number;
  
  // Metadata
  publishedDate: string;
  scheduledDate?: string;
  createdDate: string;
  updatedDate: string;
  
  // Status and visibility
  status: 'draft' | 'scheduled' | 'published' | 'archived';
  isVipOnly: boolean;
  vipTier?: 'basic' | 'premium' | 'elite';
  
  // Analytics and engagement
  views: number;
  likes: number;
  comments: number;
  shares: number;
  completionRate: number;
  
  // Content details
  category: string;
  tags: string[];
  transcript?: string;
  summary?: string;
  
  // Guest information
  guest?: {
    name: string;
    bio: string;
    image: string;
    links: Array<{
      platform: string;
      url: string;
    }>;
  };
  
  // SEO and discovery
  seoTitle?: string;
  seoDescription?: string;
  keywords?: string[];
  
  // Platform-specific
  spotifyUrl?: string;
  applePodcastsUrl?: string;
  youtubeUrl?: string;
}

export interface EpisodeFormData {
  title: string;
  description: string;
  fullDescription?: string;
  image: string;
  audioUrl?: string;
  videoUrl?: string;
  duration: string;
  
  // Scheduling
  publishNow: boolean;
  scheduledDate?: string;
  scheduledTime?: string;
  
  // VIP settings
  isVipOnly: boolean;
  vipTier?: 'basic' | 'premium' | 'elite';
  
  // Content metadata
  category: string;
  tags: string[];
  transcript?: string;
  summary?: string;
  
  // Guest information
  hasGuest: boolean;
  guest?: {
    name: string;
    bio: string;
    image: string;
    links: Array<{
      platform: string;
      url: string;
    }>;
  };
  
  // SEO
  seoTitle?: string;
  seoDescription?: string;
  keywords?: string[];
}

export interface EpisodeManagementContextType {
  // Episode data
  episodes: ManagedEpisode[];
  isLoading: boolean;
  error: string | null;
  
  // Single episode operations
  createEpisode: (data: EpisodeFormData) => Promise<ManagedEpisode>;
  updateEpisode: (id: string, data: Partial<EpisodeFormData>) => Promise<ManagedEpisode>;
  deleteEpisode: (id: string) => Promise<void>;
  duplicateEpisode: (id: string) => Promise<ManagedEpisode>;
  
  // Status management
  publishEpisode: (id: string) => Promise<void>;
  unpublishEpisode: (id: string) => Promise<void>;
  archiveEpisode: (id: string) => Promise<void>;
  scheduleEpisode: (id: string, date: string) => Promise<void>;
  
  // Bulk operations
  bulkUpdateStatus: (ids: string[], status: ManagedEpisode['status']) => Promise<void>;
  bulkDelete: (ids: string[]) => Promise<void>;
  bulkUpdateVipStatus: (ids: string[], isVipOnly: boolean, tier?: 'basic' | 'premium' | 'elite') => Promise<void>;
  
  // Filtering and search
  filteredEpisodes: ManagedEpisode[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  categoryFilter: string;
  setCategoryFilter: (category: string) => void;
  
  // Data management
  refreshEpisodes: () => Promise<void>;
  getEpisode: (id: string) => ManagedEpisode | undefined;
  clearAllEpisodes: () => Promise<void>;
  
  // Analytics
  getEpisodeAnalytics: (id: string) => Promise<any>;
  
  // Categories and tags
  availableCategories: string[];
  availableTags: string[];
}

const EpisodeManagementContext = createContext<EpisodeManagementContextType | undefined>(undefined);

// Mock data generator
function generateMockEpisodes(): ManagedEpisode[] {
  const categories = ['Business', 'Technology', 'Personal Development', 'Marketing', 'Entrepreneurship'];
  const statuses: ManagedEpisode['status'][] = ['published', 'draft', 'scheduled', 'archived'];
  
  return Array.from({ length: 25 }, (_, i) => ({
    id: `episode-${i + 1}`,
    title: `Episode ${i + 1}: ${['Building Your Success Mindset', 'The Power of Consistency', 'Overcoming Imposter Syndrome', 'Creating Multiple Income Streams', 'Digital Marketing Mastery', 'Leadership in Remote Teams', 'Scaling Your Business', 'Innovation and Creativity', 'Work-Life Balance', 'Financial Planning'][i % 10]}`,
    description: `In this episode, we explore important concepts that will help you grow both personally and professionally.`,
    fullDescription: `This is a comprehensive discussion about the topic, including detailed insights, practical advice, and actionable strategies that listeners can implement immediately in their own lives and businesses.`,
    image: `https://images.unsplash.com/photo-${1500000000000 + i}?w=400&h=300&fit=crop`,
    audioUrl: i % 3 === 0 ? `https://example.com/audio/episode-${i + 1}.mp3` : undefined,
    videoUrl: i % 4 === 0 ? `https://example.com/video/episode-${i + 1}.mp4` : undefined,
    duration: `${25 + Math.floor(Math.random() * 35)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
    durationSeconds: (25 + Math.floor(Math.random() * 35)) * 60 + Math.floor(Math.random() * 60),
    
    publishedDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
    scheduledDate: i % 6 === 0 ? new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() : undefined,
    createdDate: new Date(Date.now() - Math.random() * 100 * 24 * 60 * 60 * 1000).toISOString(),
    updatedDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    
    status: statuses[i % statuses.length],
    isVipOnly: i % 5 === 0,
    vipTier: i % 5 === 0 ? (['basic', 'premium', 'elite'][i % 3] as any) : undefined,
    
    views: Math.floor(Math.random() * 5000 + 100),
    likes: Math.floor(Math.random() * 500 + 10),
    comments: Math.floor(Math.random() * 100 + 5),
    shares: Math.floor(Math.random() * 50 + 2),
    completionRate: Math.floor(Math.random() * 40 + 60),
    
    category: categories[i % categories.length],
    tags: ['motivation', 'success', 'business', 'growth', 'mindset'].slice(0, Math.floor(Math.random() * 3) + 2),
    transcript: i % 4 === 0 ? `[00:00] Welcome to another episode...` : undefined,
    summary: `Key takeaways from this episode include understanding the fundamentals, practical implementation strategies, and actionable steps for immediate improvement.`,
    
    guest: i % 3 === 0 ? {
      name: ['John Smith', 'Sarah Johnson', 'Michael Brown', 'Emily Davis'][i % 4],
      bio: 'An expert in their field with over 10 years of experience and numerous successful projects.',
      image: `https://images.unsplash.com/photo-${1600000000000 + i}?w=100&h=100&fit=crop`,
      links: [
        { platform: 'LinkedIn', url: '#' },
        { platform: 'Twitter', url: '#' },
        { platform: 'Website', url: '#' }
      ]
    } : undefined,
    
    seoTitle: `Episode ${i + 1} - Professional Growth and Success`,
    seoDescription: `Learn valuable insights about personal and professional development in this comprehensive episode.`,
    keywords: ['podcast', 'business', 'success', 'growth', 'motivation'],
    
    spotifyUrl: i % 2 === 0 ? `https://open.spotify.com/episode/example${i}` : undefined,
    applePodcastsUrl: i % 3 === 0 ? `https://podcasts.apple.com/episode/example${i}` : undefined,
    youtubeUrl: i % 4 === 0 ? `https://youtube.com/watch?v=example${i}` : undefined,
  }));
}

interface EpisodeManagementProviderProps {
  children: ReactNode;
}

export function EpisodeManagementProvider({ children }: EpisodeManagementProviderProps) {
  const [episodes, setEpisodes] = useState<ManagedEpisode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Helper function to get access token
  const getAccessToken = async (): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('No active session - please login to perform admin actions');
    }
    return session.access_token;
  };
  
  // Save episodes to localStorage whenever episodes change
  const saveEpisodesToStorage = (episodesToSave: ManagedEpisode[]) => {
    try {
      localStorage.setItem('oriri-managed-episodes', JSON.stringify(episodesToSave));
      console.log('[EpisodeManagement] Saved', episodesToSave.length, 'episodes to localStorage');
    } catch (error) {
      console.error('[EpisodeManagement] Error saving episodes to localStorage:', error);
    }
  };
  
  // Filtering states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Initialize with persistent data
  useEffect(() => {
    const loadEpisodes = async () => {
      try {
        // Try to load episodes from backend first
        console.log('[EpisodeManagement] Loading episodes from backend...');
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/episodes`, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        });
        
        if (response.ok) {
          const backendEpisodes = await response.json();
          if (Array.isArray(backendEpisodes) && backendEpisodes.length > 0) {
            console.log('[EpisodeManagement] Loaded', backendEpisodes.length, 'episodes from backend');
            setEpisodes(backendEpisodes);
            saveEpisodesToStorage(backendEpisodes); // Update localStorage backup
            return;
          }
        }
        
        // Fallback to localStorage if backend fails
        const savedEpisodes = localStorage.getItem('oriri-managed-episodes');
        if (savedEpisodes) {
          const parsedEpisodes = JSON.parse(savedEpisodes);
          if (Array.isArray(parsedEpisodes) && parsedEpisodes.length > 0) {
            console.log('[EpisodeManagement] Backend failed, loaded', parsedEpisodes.length, 'episodes from localStorage');
            setEpisodes(parsedEpisodes);
            return;
          }
        }
        
        // If no saved episodes, start with empty list
        console.log('[EpisodeManagement] No episodes found anywhere, starting with empty list');
        setEpisodes([]);
      } catch (error) {
        console.error('[EpisodeManagement] Error loading episodes:', error);
        // Fallback to localStorage
        try {
          const savedEpisodes = localStorage.getItem('oriri-managed-episodes');
          if (savedEpisodes) {
            const parsedEpisodes = JSON.parse(savedEpisodes);
            if (Array.isArray(parsedEpisodes)) {
              console.log('[EpisodeManagement] Error with backend, using localStorage backup:', parsedEpisodes.length);
              setEpisodes(parsedEpisodes);
              return;
            }
          }
        } catch (e) {
          console.error('[EpisodeManagement] Even localStorage failed:', e);
        }
        setEpisodes([]);
      }
    };
    
    loadEpisodes();
  }, []);

  // Filtered episodes based on search and filters
  const filteredEpisodes = episodes.filter(episode => {
    const matchesSearch = searchQuery === '' || 
      episode.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      episode.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      episode.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || episode.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || episode.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Create episode
  const createEpisode = async (data: EpisodeFormData): Promise<ManagedEpisode> => {
    setIsLoading(true);
    try {
      const newEpisode: ManagedEpisode = {
        id: `episode-${Date.now()}`,
        title: data.title,
        description: data.description,
        fullDescription: data.fullDescription,
        image: data.image,
        audioUrl: data.audioUrl,
        videoUrl: data.videoUrl,
        duration: data.duration,
        durationSeconds: parseDurationToSeconds(data.duration),
        
        publishedDate: data.publishNow ? new Date().toISOString() : '',
        scheduledDate: !data.publishNow && data.scheduledDate && data.scheduledTime 
          ? new Date(`${data.scheduledDate}T${data.scheduledTime}`).toISOString() 
          : undefined,
        createdDate: new Date().toISOString(),
        updatedDate: new Date().toISOString(),
        
        status: data.publishNow ? 'published' : (data.scheduledDate ? 'scheduled' : 'draft'),
        isVipOnly: data.isVipOnly,
        vipTier: data.vipTier,
        
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        completionRate: 0,
        
        category: data.category,
        tags: data.tags,
        transcript: data.transcript,
        summary: data.summary,
        guest: data.hasGuest ? data.guest : undefined,
        
        seoTitle: data.seoTitle,
        seoDescription: data.seoDescription,
        keywords: data.keywords,
      };

      // Save to backend (KV store) with admin authentication
      console.log('[EpisodeManagement] Saving episode to backend...');
      const accessToken = await getAccessToken();
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/episodes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(newEpisode)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error || `Backend save failed: ${response.status} ${response.statusText}`;
        throw new Error(errorMsg);
      }
      
      const updatedEpisodes = [newEpisode, ...episodes];
      setEpisodes(updatedEpisodes);
      saveEpisodesToStorage(updatedEpisodes); // Keep localStorage as backup
      console.log('[EpisodeManagement] Episode created and saved to backend:', newEpisode.title);
      return newEpisode;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create episode';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Update episode
  const updateEpisode = async (id: string, data: Partial<EpisodeFormData>): Promise<ManagedEpisode> => {
    setIsLoading(true);
    try {
      // ✅ STEP 1: Update in backend FIRST (source of truth)
      console.log('[EpisodeManagement] Updating episode in backend:', id);
      const accessToken = await getAccessToken();
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/episodes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error || `Backend update failed: ${response.status} ${response.statusText}`;
        throw new Error(errorMsg);
      }
      
      // ✅ STEP 2: Update local state only after backend succeeds
      let updatedEpisode: ManagedEpisode | undefined;
      
      const updatedEpisodes = episodes.map(episode => {
        if (episode.id === id) {
          updatedEpisode = {
            ...episode,
            ...data,
            updatedDate: new Date().toISOString(),
            durationSeconds: data.duration ? parseDurationToSeconds(data.duration) : episode.durationSeconds,
          };
          return updatedEpisode;
        }
        return episode;
      });

      if (!updatedEpisode) throw new Error('Episode not found');
      
      setEpisodes(updatedEpisodes);
      saveEpisodesToStorage(updatedEpisodes); // Keep localStorage as backup
      console.log('[EpisodeManagement] Episode updated successfully in backend and local state:', id);
      return updatedEpisode;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update episode';
      console.error('[EpisodeManagement] Error updating episode:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Delete episode
  const deleteEpisode = async (id: string): Promise<void> => {
    setIsLoading(true);
    try {
      // ✅ STEP 1: Delete from backend FIRST (source of truth)
      console.log('[EpisodeManagement] Deleting episode from backend:', id);
      const accessToken = await getAccessToken();
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/episodes/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error || `Backend delete failed: ${response.status} ${response.statusText}`;
        throw new Error(errorMsg);
      }
      
      // ✅ STEP 2: Remove from local state only after backend succeeds
      const updatedEpisodes = episodes.filter(episode => episode.id !== id);
      setEpisodes(updatedEpisodes);
      saveEpisodesToStorage(updatedEpisodes); // Keep localStorage in sync
      console.log('[EpisodeManagement] Episode deleted successfully from backend and local state:', id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete episode';
      console.error('[EpisodeManagement] Error deleting episode:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Duplicate episode
  const duplicateEpisode = async (id: string): Promise<ManagedEpisode> => {
    const original = episodes.find(ep => ep.id === id);
    if (!original) throw new Error('Episode not found');

    const duplicate: ManagedEpisode = {
      ...original,
      id: `episode-${Date.now()}-copy`,
      title: `${original.title} (Copy)`,
      status: 'draft',
      publishedDate: '',
      scheduledDate: undefined,
      createdDate: new Date().toISOString(),
      updatedDate: new Date().toISOString(),
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
    };

    const updatedEpisodes = [duplicate, ...episodes];
    setEpisodes(updatedEpisodes);
    saveEpisodesToStorage(updatedEpisodes);
    return duplicate;
  };

  // Status management functions
  const publishEpisode = async (id: string): Promise<void> => {
    setIsLoading(true);
    try {
      // ✅ Update backend first
      console.log('[EpisodeManagement] Publishing episode in backend:', id);
      const accessToken = await getAccessToken();
      
      const statusData = { 
        status: 'published' as const, 
        publishedDate: new Date().toISOString() 
      };
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/episodes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(statusData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to publish episode in backend');
      }
      
      // Then update local state
      const updatedEpisodes = episodes.map(episode => 
        episode.id === id 
          ? { ...episode, ...statusData }
          : episode
      );
      setEpisodes(updatedEpisodes);
      saveEpisodesToStorage(updatedEpisodes);
      console.log('[EpisodeManagement] Episode published successfully:', id);
    } catch (err) {
      console.error('[EpisodeManagement] Error publishing episode:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const unpublishEpisode = async (id: string): Promise<void> => {
    setIsLoading(true);
    try {
      // ✅ Update backend first
      console.log('[EpisodeManagement] Unpublishing episode in backend:', id);
      const accessToken = await getAccessToken();
      
      const statusData = { 
        status: 'draft' as const, 
        publishedDate: '' 
      };
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/episodes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(statusData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to unpublish episode in backend');
      }
      
      // Then update local state
      const updatedEpisodes = episodes.map(episode => 
        episode.id === id 
          ? { ...episode, ...statusData }
          : episode
      );
      setEpisodes(updatedEpisodes);
      saveEpisodesToStorage(updatedEpisodes);
      console.log('[EpisodeManagement] Episode unpublished successfully:', id);
    } catch (err) {
      console.error('[EpisodeManagement] Error unpublishing episode:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const archiveEpisode = async (id: string): Promise<void> => {
    setIsLoading(true);
    try {
      // ✅ Update backend first
      console.log('[EpisodeManagement] Archiving episode in backend:', id);
      const accessToken = await getAccessToken();
      
      const statusData = { status: 'archived' as const };
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/episodes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(statusData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to archive episode in backend');
      }
      
      // Then update local state
      const updatedEpisodes = episodes.map(episode => 
        episode.id === id 
          ? { ...episode, ...statusData }
          : episode
      );
      setEpisodes(updatedEpisodes);
      saveEpisodesToStorage(updatedEpisodes);
      console.log('[EpisodeManagement] Episode archived successfully:', id);
    } catch (err) {
      console.error('[EpisodeManagement] Error archiving episode:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const scheduleEpisode = async (id: string, date: string): Promise<void> => {
    setIsLoading(true);
    try {
      // ✅ Update backend first
      console.log('[EpisodeManagement] Scheduling episode in backend:', id);
      const accessToken = await getAccessToken();
      
      const statusData = { 
        status: 'scheduled' as const, 
        scheduledDate: date 
      };
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/episodes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(statusData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to schedule episode in backend');
      }
      
      // Then update local state
      const updatedEpisodes = episodes.map(episode => 
        episode.id === id 
          ? { ...episode, ...statusData }
          : episode
      );
      setEpisodes(updatedEpisodes);
      saveEpisodesToStorage(updatedEpisodes);
      console.log('[EpisodeManagement] Episode scheduled successfully:', id);
    } catch (err) {
      console.error('[EpisodeManagement] Error scheduling episode:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Bulk operations
  const bulkUpdateStatus = async (ids: string[], status: ManagedEpisode['status']): Promise<void> => {
    setIsLoading(true);
    try {
      // ✅ Update all episodes in backend first (parallel requests)
      console.log('[EpisodeManagement] Bulk updating status in backend for', ids.length, 'episodes');
      const accessToken = await getAccessToken();
      
      const updatePromises = ids.map(id =>
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/episodes/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({ status, updatedDate: new Date().toISOString() })
        }).then(response => {
          if (!response.ok) {
            throw new Error(`Failed to update episode ${id}`);
          }
          return response;
        })
      );
      
      await Promise.all(updatePromises);
      
      // Then update local state
      const updatedEpisodes = episodes.map(episode => 
        ids.includes(episode.id) 
          ? { ...episode, status, updatedDate: new Date().toISOString() }
          : episode
      );
      setEpisodes(updatedEpisodes);
      saveEpisodesToStorage(updatedEpisodes);
      console.log('[EpisodeManagement] Bulk status update completed successfully');
    } catch (err) {
      console.error('[EpisodeManagement] Error in bulk status update:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const bulkDelete = async (ids: string[]): Promise<void> => {
    setIsLoading(true);
    try {
      // ✅ Delete all episodes from backend first (parallel requests)
      console.log('[EpisodeManagement] Bulk deleting from backend:', ids.length, 'episodes');
      const accessToken = await getAccessToken();
      
      const deletePromises = ids.map(id =>
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/episodes/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }).then(response => {
          if (!response.ok) {
            throw new Error(`Failed to delete episode ${id}`);
          }
          return response;
        })
      );
      
      await Promise.all(deletePromises);
      
      // Then update local state
      const updatedEpisodes = episodes.filter(episode => !ids.includes(episode.id));
      setEpisodes(updatedEpisodes);
      saveEpisodesToStorage(updatedEpisodes);
      console.log('[EpisodeManagement] Bulk delete completed successfully');
    } catch (err) {
      console.error('[EpisodeManagement] Error in bulk delete:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const bulkUpdateVipStatus = async (ids: string[], isVipOnly: boolean, tier?: 'basic' | 'premium' | 'elite'): Promise<void> => {
    setIsLoading(true);
    try {
      // ✅ Update all episodes in backend first (parallel requests)
      console.log('[EpisodeManagement] Bulk updating VIP status in backend for', ids.length, 'episodes');
      const accessToken = await getAccessToken();
      
      const vipData = { 
        isVipOnly, 
        vipTier: isVipOnly ? tier : undefined, 
        updatedDate: new Date().toISOString() 
      };
      
      const updatePromises = ids.map(id =>
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/episodes/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify(vipData)
        }).then(response => {
          if (!response.ok) {
            throw new Error(`Failed to update VIP status for episode ${id}`);
          }
          return response;
        })
      );
      
      await Promise.all(updatePromises);
      
      // Then update local state
      const updatedEpisodes = episodes.map(episode => 
        ids.includes(episode.id) 
          ? { ...episode, ...vipData }
          : episode
      );
      setEpisodes(updatedEpisodes);
      saveEpisodesToStorage(updatedEpisodes);
      console.log('[EpisodeManagement] Bulk VIP status update completed successfully');
    } catch (err) {
      console.error('[EpisodeManagement] Error in bulk VIP status update:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Data management
  const refreshEpisodes = async (): Promise<void> => {
    setIsLoading(true);
    try {
      // Reload episodes from localStorage
      const savedEpisodes = localStorage.getItem('oriri-managed-episodes');
      if (savedEpisodes) {
        const parsedEpisodes = JSON.parse(savedEpisodes);
        if (Array.isArray(parsedEpisodes)) {
          setEpisodes(parsedEpisodes);
          console.log('[EpisodeManagement] Episodes refreshed from localStorage:', parsedEpisodes.length);
        }
      }
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay for UX
    } catch (err) {
      setError('Failed to refresh episodes');
      console.error('[EpisodeManagement] Error refreshing episodes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getEpisode = (id: string): ManagedEpisode | undefined => {
    return episodes.find(episode => episode.id === id);
  };

  const clearAllEpisodes = async (): Promise<void> => {
    setIsLoading(true);
    try {
      setEpisodes([]);
      localStorage.removeItem('oriri-managed-episodes');
      console.log('[EpisodeManagement] All episodes cleared from localStorage');
    } catch (err) {
      setError('Failed to clear episodes');
      console.error('[EpisodeManagement] Error clearing episodes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getEpisodeAnalytics = async (id: string): Promise<any> => {
    // Mock analytics data
    return {
      views: Math.floor(Math.random() * 1000),
      uniqueListeners: Math.floor(Math.random() * 800),
      completionRate: Math.floor(Math.random() * 40 + 60),
      averageListenDuration: Math.floor(Math.random() * 20 + 10),
      engagementRate: Math.floor(Math.random() * 30 + 10),
    };
  };

  // Available categories and tags
  const availableCategories = ['Business', 'Technology', 'Personal Development', 'Marketing', 'Entrepreneurship', 'Leadership', 'Finance'];
  const availableTags = ['motivation', 'success', 'business', 'growth', 'mindset', 'productivity', 'leadership', 'innovation', 'strategy'];

  // Helper function
  function parseDurationToSeconds(duration: string): number {
    const parts = duration.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return 0;
  }

  const contextValue: EpisodeManagementContextType = {
    episodes,
    isLoading,
    error,
    createEpisode,
    updateEpisode,
    deleteEpisode,
    duplicateEpisode,
    publishEpisode,
    unpublishEpisode,
    archiveEpisode,
    scheduleEpisode,
    bulkUpdateStatus,
    bulkDelete,
    bulkUpdateVipStatus,
    filteredEpisodes,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    refreshEpisodes,
    getEpisode,
    clearAllEpisodes,
    getEpisodeAnalytics,
    availableCategories,
    availableTags,
  };

  return (
    <EpisodeManagementContext.Provider value={contextValue}>
      {children}
    </EpisodeManagementContext.Provider>
  );
}

export function useEpisodeManagement() {
  const context = useContext(EpisodeManagementContext);
  if (context === undefined) {
    throw new Error('useEpisodeManagement must be used within an EpisodeManagementProvider');
  }
  return context;
}