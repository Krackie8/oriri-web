import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { notificationService } from '../utils/notificationService';

interface Notification {
  id: string;
  type: 'episode' | 'comment' | 'tip' | 'live' | 'system' | 'vip';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  metadata?: {
    episodeId?: string;
    commentId?: string;
    userId?: string;
    amount?: number;
  };
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAllNotifications: () => void;
  isLoading: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Mock notification data for development
const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'episode',
    title: 'New Episode Available',
    message: 'The Future of AI in 2025 is now available',
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    read: false,
    actionUrl: '/episodes/1',
    metadata: { episodeId: '1' }
  },
  {
    id: '2', 
    type: 'comment',
    title: 'New Comment Reply',
    message: 'Sarah replied to your comment on "Mindful Morning Routines"',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    read: false,
    actionUrl: '/episodes/2',
    metadata: { episodeId: '2', commentId: 'comment-123' }
  },
  {
    id: '3',
    type: 'live',
    title: 'Live Session Starting',
    message: 'Tech Q&A session starts in 15 minutes',
    timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
    read: false,
    actionUrl: '/live',
  },
  {
    id: '4',
    type: 'tip',
    title: 'Tip Received',
    message: 'Alex sent you a $5 tip for "Startup Success Stories"',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
    read: true,
    actionUrl: '/profile',
    metadata: { amount: 5, userId: 'user-123' }
  },
  {
    id: '5',
    type: 'vip',
    title: 'VIP Content Available',
    message: 'New exclusive content has been unlocked for VIP members',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12), // 12 hours ago
    read: true,
    actionUrl: '/episodes?filter=vip',
  }
];

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load notifications when user logs in
  useEffect(() => {
    if (user) {
      // In a real app, this would fetch from the backend
      // For now, we'll use mock data
      setNotifications(mockNotifications);
      
      // Request browser notification permission
      notificationService.requestPermission();
    } else {
      // Clear notifications when user logs out
      setNotifications([]);
    }
  }, [user]);

  // Subscribe to notification service
  useEffect(() => {
    if (!user) return;

    const unsubscribe = notificationService.subscribe((notificationData) => {
      addNotification(notificationData);
    });

    return unsubscribe;
  }, [user]);

  // Simulate real-time notifications
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      // Randomly add new notifications (for demo purposes)
      if (Math.random() < 0.1) { // 10% chance every 30 seconds
        const newNotification: Notification = {
          id: `notification-${Date.now()}`,
          type: ['episode', 'comment', 'live', 'system'][Math.floor(Math.random() * 4)] as any,
          title: 'New Update',
          message: 'You have a new update in the app',
          timestamp: new Date(),
          read: false,
        };
        
        setNotifications(prev => [newNotification, ...prev.slice(0, 19)]); // Keep only 20 most recent
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [user]);

  const addNotification = (notificationData: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notificationData,
      id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      read: false,
    };
    
    setNotifications(prev => [newNotification, ...prev]);
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const clearNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter(notification => !notification.read).length;

  const contextValue: NotificationContextType = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications,
    isLoading,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}