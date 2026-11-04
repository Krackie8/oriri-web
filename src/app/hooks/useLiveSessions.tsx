import { useState, useEffect, useCallback } from 'react';
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

interface Tip {
  id: string;
  sessionId: string;
  fromUserId: string;
  fromUserName: string;
  amount: number;
  message: string;
  timestamp: string;
}

export function useLiveSessions() {
  const [sessions, setSessions] = useState<{
    upcoming: LiveSession[];
    ongoing: LiveSession[];
    archived: LiveSession[];
  }>({
    upcoming: [],
    ongoing: [],
    archived: []
  });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Using shared supabase client imported above

  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Check if this endpoint requires authentication
      const requiresAuth = ['/reminders', '/tips'].some(authEndpoint => 
        endpoint.includes(authEndpoint)
      ) || (
        // Chat POST operations require auth, but GET (fetching messages) does not
        endpoint.includes('/chat/') && 
        options.method && 
        ['POST', 'PUT', 'DELETE'].includes(options.method.toUpperCase())
      );

      if (requiresAuth && !token) {
        throw new Error('Authentication required. Please log in to continue.');
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32${endpoint}`,
        {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token || publicAnonKey}`,
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

  // Fetch live sessions
  const fetchSessions = useCallback(async (type?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const queryParam = type ? `?type=${type}` : '';
      const result = await apiCall(`/live-sessions${queryParam}`);
      
      if (result.success) {
        // Filter out mock sessions by their IDs or titles
        const filterMockSessions = (sessions: any[]) => {
          return sessions.filter(session => 
            session.id !== 'upcoming_1' && 
            session.id !== 'upcoming_2' &&
            session.title !== "The Future of AI in Podcasting" &&
            session.title !== "Urban Planning Roundtable"
          );
        };

        if (type) {
          const filteredData = Array.isArray(result.data) 
            ? filterMockSessions(result.data)
            : result.data;
          setSessions(prev => ({ ...prev, [type]: filteredData }));
        } else {
          const filteredData = {
            upcoming: filterMockSessions(result.data.upcoming || []),
            ongoing: filterMockSessions(result.data.ongoing || []),
            archived: filterMockSessions(result.data.archived || [])
          };
          setSessions(filteredData);
        }
      } else {
        throw new Error(result.error || 'Failed to fetch sessions');
      }
    } catch (error) {
      // If API fails, provide empty fallback data since we removed mock sessions
      const fallbackData = {
        upcoming: [],
        ongoing: [],
        archived: []
      };
      setSessions(fallbackData);
      setError(error instanceof Error ? error.message : 'Failed to fetch sessions');
      console.error('Error fetching live sessions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Clear mock live sessions data and add test session
  const clearMockData = useCallback(async () => {
    try {
      await apiCall('/clear-live-data', { method: 'POST' });
      console.log('Mock live sessions cleared successfully');
      
      // Add test session with platform data
      await apiCall('/add-test-session', { method: 'POST' });
      console.log('Test session with platform added');
      
      // Refresh sessions after clearing
      await fetchSessions();
    } catch (error) {
      console.log('Note: Failed to clear mock data:', error);
    }
  }, [fetchSessions]);

  // Create live session
  const createSession = useCallback(async (sessionData: {
    title: string;
    description: string;
    scheduledTime: string;
    duration: string;
    type?: string;
    thumbnailUrl?: string;
    streamPlatform?: string;
    streamUrl?: string;
    isLive?: boolean;
  }) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Check if user is logged in
      if (!session?.access_token) {
        throw new Error('Please log in to create live sessions');
      }

      const result = await apiCall('/live-sessions', {
        method: 'POST',
        body: JSON.stringify(sessionData),
      });

      if (result.success) {
        // Refresh sessions
        await fetchSessions();
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to create session');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create session');
      console.error('Error creating live session:', error);
      throw error;
    }
  }, [fetchSessions]);

  // Update live session
  const updateSession = useCallback(async (sessionId: string, updateData: Partial<LiveSession>) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Check if user is logged in
      if (!session?.access_token) {
        throw new Error('Please log in to update live sessions');
      }

      const result = await apiCall(`/live-sessions/${sessionId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      if (result.success) {
        // Update local state immediately
        setSessions(prev => {
          const updated = { ...prev };
          
          // Find and update the session in the correct category
          for (const type of ['upcoming', 'ongoing', 'archived'] as const) {
            const sessionIndex = updated[type].findIndex(s => s.id === sessionId);
            if (sessionIndex !== -1) {
              updated[type][sessionIndex] = result.data;
              break;
            }
          }
          
          return updated;
        });
        
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to update session');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update session');
      console.error('Error updating live session:', error);
      throw error;
    }
  }, []);

  // Delete live session
  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Check if user is logged in
      if (!session?.access_token) {
        throw new Error('Please log in to delete live sessions');
      }

      const result = await apiCall(`/live-sessions/${sessionId}`, {
        method: 'DELETE',
      });

      if (result.success) {
        // Remove from local state immediately
        setSessions(prev => {
          const updated = { ...prev };
          
          // Find and remove the session from the correct category
          for (const type of ['upcoming', 'ongoing', 'archived'] as const) {
            updated[type] = updated[type].filter(s => s.id !== sessionId);
          }
          
          return updated;
        });
        
        return true;
      } else {
        throw new Error(result.error || 'Failed to delete session');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete session');
      console.error('Error deleting live session:', error);
      throw error;
    }
  }, []);

  // Fetch chat messages
  const fetchChatMessages = useCallback(async (sessionId: string) => {
    try {
      const result = await apiCall(`/chat/${sessionId}`, { method: 'GET' });
      
      if (result.success) {
        setChatMessages(result.data.filter((msg: ChatMessage) => !msg.isHidden));
      } else {
        throw new Error(result.error || 'Failed to fetch chat messages');
      }
    } catch (error) {
      // No fallback chat messages since there are no live sessions
      setChatMessages([]);
      console.error('Error fetching chat messages:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch chat messages');
    }
  }, []);

  // Send chat message
  const sendChatMessage = useCallback(async (
    sessionId: string,
    message: string,
    isSuperChat = false,
    superChatAmount = 0
  ) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Check if user is logged in
      if (!session?.access_token) {
        throw new Error('Please log in to send messages');
      }

      const result = await apiCall(`/chat/${sessionId}`, {
        method: 'POST',
        body: JSON.stringify({
          message,
          isSuperChat,
          superChatAmount,
        }),
      });

      if (result.success) {
        setChatMessages(prev => [...prev, result.data]);
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending chat message:', error);
      throw error;
    }
  }, []);

  // Add reaction to message
  const addReaction = useCallback(async (
    sessionId: string,
    messageId: string,
    emoji: string
  ) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Check if user is logged in
      if (!session?.access_token) {
        throw new Error('Please log in to add reactions');
      }

      const result = await apiCall(`/chat/${sessionId}/${messageId}/react`, {
        method: 'POST',
        body: JSON.stringify({ emoji }),
      });

      if (result.success) {
        setChatMessages(prev =>
          prev.map(msg =>
            msg.id === messageId ? result.data : msg
          )
        );
      } else {
        throw new Error(result.error || 'Failed to add reaction');
      }
    } catch (error) {
      console.error('Error adding reaction:', error);
      throw error;
    }
  }, []);

  // Moderate message (pin/hide)
  const moderateMessage = useCallback(async (
    sessionId: string,
    messageId: string,
    action: 'pin' | 'hide' | 'unpin' | 'unhide'
  ) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Check if user is logged in
      if (!session?.access_token) {
        throw new Error('Please log in to moderate messages');
      }

      const result = await apiCall(`/chat/${sessionId}/${messageId}/moderate`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });

      if (result.success) {
        if (action === 'hide') {
          setChatMessages(prev => prev.filter(msg => msg.id !== messageId));
        } else {
          setChatMessages(prev =>
            prev.map(msg =>
              msg.id === messageId ? result.data : msg
            )
          );
        }
      } else {
        throw new Error(result.error || 'Failed to moderate message');
      }
    } catch (error) {
      console.error('Error moderating message:', error);
      throw error;
    }
  }, []);

  // Send tip
  const sendTip = useCallback(async (
    sessionId: string,
    amount: number,
    message = ''
  ) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Check if user is logged in
      if (!session?.access_token) {
        throw new Error('Please log in to send tips');
      }

      const result = await apiCall('/tips', {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          amount,
          message,
        }),
      });

      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to send tip');
      }
    } catch (error) {
      console.error('Error sending tip:', error);
      throw error;
    }
  }, []);

  // Manage reminders
  const setReminder = useCallback(async (sessionId: string, set: boolean) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Check if user is logged in
      if (!session?.access_token) {
        throw new Error('Please log in to set reminders');
      }

      const result = await apiCall('/reminders', {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          action: set ? 'set' : 'remove',
        }),
      });

      if (result.success) {
        // Update local state
        setSessions(prev => ({
          ...prev,
          upcoming: prev.upcoming.map(session =>
            session.id === sessionId ? { ...session, hasReminder: set } : session
          )
        }));
      } else {
        throw new Error(result.error || 'Failed to manage reminder');
      }
    } catch (error) {
      console.error('Error managing reminder:', error);
      throw error;
    }
  }, []);

  // Fetch user reminders
  const fetchReminders = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Only try to fetch reminders if user is logged in
      if (!session?.access_token) {
        console.log('User not logged in, skipping reminders fetch');
        return;
      }

      const result = await apiCall('/reminders');
      
      if (result.success) {
        const reminderSessionIds = result.data.map((reminder: any) => 
          reminder.sessionId
        );
        
        // Update sessions with reminder status
        setSessions(prev => ({
          ...prev,
          upcoming: prev.upcoming.map(session => ({
            ...session,
            hasReminder: reminderSessionIds.includes(session.id)
          }))
        }));
      }
    } catch (error) {
      console.error('Error fetching reminders:', error);
    }
  }, []);

  // Migrate sessions to new system on initial load
  useEffect(() => {
    const migrateSessions = async () => {
      try {
        console.log('🔄 Checking if live session migration is needed...');
        
        // First try to migrate existing sessions to the new unified prefix system
        const { projectId, publicAnonKey } = await import('../utils/supabase/info');
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/migrate-live-sessions`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`,
            },
          }
        );
        
        if (response.ok) {
          const result = await response.json();
          console.log('✅ Session migration completed:', result.message);
        } else {
          console.log('⚠️ Migration failed, but continuing...');
        }
        
        // Clear old mock data
        await clearMockData();
      } catch (error) {
        console.log('Note: Migration failed, but continuing:', error);
      }
    };
    
    migrateSessions();
  }, [clearMockData]); // Run when clearMockData is available

  // Real-time updates using polling (in production, use WebSocket or Supabase realtime)
  useEffect(() => {
    const interval = setInterval(() => {
      // Only refresh if we have ongoing sessions
      if (sessions.ongoing.length > 0) {
        fetchSessions('ongoing');
      }
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, [sessions.ongoing.length, fetchSessions]);

  // Chat real-time updates
  const startChatPolling = useCallback((sessionId: string) => {
    const interval = setInterval(() => {
      fetchChatMessages(sessionId);
    }, 2000); // Poll every 2 seconds for chat

    return () => clearInterval(interval);
  }, [fetchChatMessages]);

  return {
    sessions,
    chatMessages,
    loading,
    error,
    fetchSessions,
    createSession,
    updateSession,
    deleteSession,
    fetchChatMessages,
    sendChatMessage,
    addReaction,
    moderateMessage,
    sendTip,
    setReminder,
    fetchReminders,
    startChatPolling,
    clearMockData,
  };
}