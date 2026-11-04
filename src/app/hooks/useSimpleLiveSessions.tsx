import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';

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

// Simple, basic hook for live sessions management
export function useSimpleLiveSessions() {
  const [allSessions, setAllSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Basic API call helper
  const makeApiCall = async (endpoint: string, options: RequestInit = {}) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || publicAnonKey;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32${endpoint}`,
        {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error for ${endpoint}:`, error);
      throw error;
    }
  };

  // Get all sessions from backend
  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Fetching sessions from backend...');
      const result = await makeApiCall('/live-sessions');
      
      if (result.success) {
        // Combine all session types into one array
        const sessions = [
          ...(result.data.upcoming || []),
          ...(result.data.ongoing || []),
          ...(result.data.archived || [])
        ];
        
        console.log('✅ Fetched sessions:', sessions.length);
        setAllSessions(sessions);
      } else {
        throw new Error(result.error || 'Failed to fetch sessions');
      }
    } catch (error) {
      console.error('❌ Error fetching sessions:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch sessions');
      setAllSessions([]);
    } finally {
      setLoading(false);
    }
  };

  // Create new session
  const createSession = async (sessionData: Partial<LiveSession>) => {
    try {
      console.log('🔄 Creating session:', sessionData);
      const result = await makeApiCall('/live-sessions', {
        method: 'POST',
        body: JSON.stringify(sessionData),
      });

      if (result.success) {
        console.log('✅ Session created:', result.data);
        // Refresh the list to get latest data
        await fetchSessions();
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to create session');
      }
    } catch (error) {
      console.error('❌ Error creating session:', error);
      throw error;
    }
  };

  // Update existing session
  const updateSession = async (sessionId: string, updates: Partial<LiveSession>) => {
    try {
      console.log('🔄 Updating session:', sessionId);
      console.log('📝 Update data being sent:', updates);
      
      // Log specifically the thumbnail fields
      if (updates.thumbnail || updates.thumbnailUrl) {
        console.log('🖼️ Thumbnail data:', {
          thumbnail: updates.thumbnail,
          thumbnailUrl: updates.thumbnailUrl
        });
      }
      
      const result = await makeApiCall(`/live-sessions/${sessionId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      if (result.success) {
        console.log('✅ Session updated successfully');
        console.log('📊 Updated session data:', result.data);
        
        // Log the thumbnail field specifically
        if (result.data.thumbnail) {
          console.log('🖼️ Updated thumbnail URL:', result.data.thumbnail);
        }
        
        // Refresh the list to get latest data from backend
        await fetchSessions();
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to update session');
      }
    } catch (error) {
      console.error('❌ Error updating session:', error);
      throw error;
    }
  };

  // Delete session
  const deleteSession = async (sessionId: string) => {
    try {
      console.log('🔄 Deleting session:', sessionId);
      const result = await makeApiCall(`/live-sessions/${sessionId}`, {
        method: 'DELETE',
      });

      if (result.success) {
        console.log('✅ Session deleted');
        // Refresh the list to get latest data
        await fetchSessions();
        return true;
      } else {
        throw new Error(result.error || 'Failed to delete session');
      }
    } catch (error) {
      console.error('❌ Error deleting session:', error);
      throw error;
    }
  };

  // Initial load
  useEffect(() => {
    fetchSessions();
  }, []);

  return {
    sessions: allSessions,
    allSessions,
    loading,
    error,
    fetchSessions,
    createSession,
    updateSession,
    deleteSession,
  };
}