import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner@2.0.3';

export interface LiveTip {
  id: string;
  sessionId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  amount: number;
  currency: string;
  message?: string;
  timestamp: string;
  isAnonymous: boolean;
  type: 'standard' | 'super_chat' | 'goal_contribution';
}

export interface TipGoal {
  id: string;
  sessionId: string;
  title: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
  completedAt?: string;
  contributors: number;
}

export interface TipStats {
  sessionId: string;
  totalAmount: number;
  totalTips: number;
  topTipper: {
    userName: string;
    amount: number;
  } | null;
  averageTip: number;
  currency: string;
  recentTips: LiveTip[];
  hourlyBreakdown: { hour: string; amount: number }[];
}

export interface LiveTipAnimation {
  id: string;
  tip: LiveTip;
  animationType: 'standard' | 'super_chat' | 'milestone' | 'goal_complete';
  duration: number;
}

interface LiveTipContextType {
  // Tips
  tips: LiveTip[];
  sendTip: (sessionId: string, amount: number, message?: string, isAnonymous?: boolean) => Promise<void>;
  
  // Goals
  goals: TipGoal[];
  createGoal: (sessionId: string, title: string, targetAmount: number, description?: string) => Promise<void>;
  contributeToGoal: (goalId: string, amount: number, message?: string) => Promise<void>;
  
  // Stats
  getSessionStats: (sessionId: string) => TipStats | null;
  
  // Animations
  activeAnimations: LiveTipAnimation[];
  clearAnimation: (animationId: string) => void;
  
  // Leaderboard
  getTopTippers: (sessionId: string, limit?: number) => Array<{
    userName: string;
    amount: number;
    tipCount: number;
    lastTip: string;
  }>;
  
  // Real-time updates
  subscribeToSession: (sessionId: string) => void;
  unsubscribeFromSession: (sessionId: string) => void;
  
  // Loading states
  isSendingTip: boolean;
  isCreatingGoal: boolean;
}

const LiveTipContext = createContext<LiveTipContextType | null>(null);

// Mock current user - in real app this would come from auth context
const currentUser = {
  id: 'user-123',
  name: 'John Doe',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face'
};

export function LiveTipProvider({ children }: { children: React.ReactNode }) {
  const [tips, setTips] = useState<LiveTip[]>([]);
  const [goals, setGoals] = useState<TipGoal[]>([]);
  const [activeAnimations, setActiveAnimations] = useState<LiveTipAnimation[]>([]);
  const [subscribedSessions, setSubscribedSessions] = useState<Set<string>>(new Set());
  const [isSendingTip, setIsSendingTip] = useState(false);
  const [isCreatingGoal, setIsCreatingGoal] = useState(false);

  // Initialize with mock data
  useEffect(() => {
    const mockTips: LiveTip[] = [
      {
        id: 'tip-1',
        sessionId: 'ongoing_1',
        userId: 'user-456',
        userName: 'TechFan2024',
        userAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b789?w=100&h=100&fit=crop&crop=face',
        amount: 25,
        currency: 'USD',
        message: 'Great insights on AI! Keep it up! 🚀',
        timestamp: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
        isAnonymous: false,
        type: 'super_chat'
      },
      {
        id: 'tip-2',
        sessionId: 'ongoing_1',
        userId: 'user-789',
        userName: 'PodcastLover',
        amount: 10,
        currency: 'USD',
        message: 'Thanks for the amazing content!',
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        isAnonymous: false,
        type: 'standard'
      },
      {
        id: 'tip-3',
        sessionId: 'ongoing_1',
        userId: 'user-321',
        userName: 'Anonymous Supporter',
        amount: 50,
        currency: 'USD',
        timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
        isAnonymous: true,
        type: 'goal_contribution'
      },
      {
        id: 'tip-4',
        sessionId: 'ongoing_1',
        userId: 'user-654',
        userName: 'GenerousListener',
        userAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
        amount: 5,
        currency: 'USD',
        message: 'Small contribution but big appreciation! ❤️',
        timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
        isAnonymous: false,
        type: 'standard'
      }
    ];

    const mockGoals: TipGoal[] = [
      {
        id: 'goal-1',
        sessionId: 'ongoing_1',
        title: 'New Podcast Equipment',
        description: 'Help us upgrade our recording setup for better audio quality!',
        targetAmount: 500,
        currentAmount: 125,
        currency: 'USD',
        isActive: true,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        contributors: 8
      },
      {
        id: 'goal-2',
        sessionId: 'ongoing_1',
        title: 'Guest Speaker Fund',
        description: 'Support bringing amazing guests to the show',
        targetAmount: 200,
        currentAmount: 75,
        currency: 'USD',
        isActive: true,
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        contributors: 3
      }
    ];

    setTips(mockTips);
    setGoals(mockGoals);
  }, []);

  const sendTip = async (
    sessionId: string, 
    amount: number, 
    message?: string, 
    isAnonymous = false
  ): Promise<void> => {
    setIsSendingTip(true);
    try {
      const newTip: LiveTip = {
        id: `tip-${Date.now()}`,
        sessionId,
        userId: currentUser.id,
        userName: isAnonymous ? 'Anonymous' : currentUser.name,
        userAvatar: isAnonymous ? undefined : currentUser.avatar,
        amount,
        currency: 'USD',
        message,
        timestamp: new Date().toISOString(),
        isAnonymous,
        type: amount >= 20 ? 'super_chat' : 'standard'
      };

      setTips(prev => [newTip, ...prev]);

      // Create animation
      const animation: LiveTipAnimation = {
        id: `anim-${Date.now()}`,
        tip: newTip,
        animationType: amount >= 50 ? 'milestone' : amount >= 20 ? 'super_chat' : 'standard',
        duration: amount >= 50 ? 5000 : amount >= 20 ? 3000 : 2000
      };

      setActiveAnimations(prev => [...prev, animation]);

      // Auto-remove animation after duration
      setTimeout(() => {
        clearAnimation(animation.id);
      }, animation.duration);

      // Show success toast
      const tipEmoji = amount >= 50 ? '🎉' : amount >= 20 ? '⭐' : '💝';
      toast.success(`${tipEmoji} $${amount} tip sent!`, {
        description: message ? `"${message}"` : 'Thank you for your support!'
      });

      // Check if this completes any goals
      goals.forEach(goal => {
        if (goal.sessionId === sessionId && goal.isActive) {
          const updatedAmount = goal.currentAmount + amount;
          if (updatedAmount >= goal.targetAmount && goal.currentAmount < goal.targetAmount) {
            // Goal completed!
            const goalCompleteAnimation: LiveTipAnimation = {
              id: `goal-complete-${Date.now()}`,
              tip: newTip,
              animationType: 'goal_complete',
              duration: 8000
            };
            setActiveAnimations(prev => [...prev, goalCompleteAnimation]);
            setTimeout(() => clearAnimation(goalCompleteAnimation.id), 8000);
            
            toast.success('🎯 Goal Completed!', {
              description: `"${goal.title}" has been fully funded!`
            });
          }
        }
      });

    } catch (error) {
      toast.error('Failed to send tip');
      throw error;
    } finally {
      setIsSendingTip(false);
    }
  };

  const createGoal = async (
    sessionId: string,
    title: string,
    targetAmount: number,
    description?: string
  ): Promise<void> => {
    setIsCreatingGoal(true);
    try {
      const newGoal: TipGoal = {
        id: `goal-${Date.now()}`,
        sessionId,
        title,
        description,
        targetAmount,
        currentAmount: 0,
        currency: 'USD',
        isActive: true,
        createdAt: new Date().toISOString(),
        contributors: 0
      };

      setGoals(prev => [newGoal, ...prev]);
      toast.success('🎯 Tip goal created!', {
        description: `Target: $${targetAmount}`
      });
    } catch (error) {
      toast.error('Failed to create tip goal');
      throw error;
    } finally {
      setIsCreatingGoal(false);
    }
  };

  const contributeToGoal = async (
    goalId: string,
    amount: number,
    message?: string
  ): Promise<void> => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) throw new Error('Goal not found');

    // Send tip first
    await sendTip(goal.sessionId, amount, message);

    // Update goal
    setGoals(prev => prev.map(g => 
      g.id === goalId 
        ? {
            ...g,
            currentAmount: Math.min(g.currentAmount + amount, g.targetAmount),
            contributors: g.contributors + 1,
            completedAt: g.currentAmount + amount >= g.targetAmount ? new Date().toISOString() : g.completedAt,
            isActive: g.currentAmount + amount < g.targetAmount
          }
        : g
    ));
  };

  const getSessionStats = useCallback((sessionId: string): TipStats | null => {
    const sessionTips = tips.filter(tip => tip.sessionId === sessionId);
    
    if (sessionTips.length === 0) return null;

    const totalAmount = sessionTips.reduce((sum, tip) => sum + tip.amount, 0);
    const totalTips = sessionTips.length;
    
    // Find top tipper
    const tipperTotals = sessionTips.reduce((acc, tip) => {
      if (!tip.isAnonymous) {
        acc[tip.userName] = (acc[tip.userName] || 0) + tip.amount;
      }
      return acc;
    }, {} as Record<string, number>);

    const topTipper = Object.entries(tipperTotals).length > 0 
      ? Object.entries(tipperTotals).reduce((max, [name, amount]) => 
          amount > (max?.amount || 0) ? { userName: name, amount } : max, null as any)
      : null;

    const averageTip = totalAmount / totalTips;
    const recentTips = sessionTips.slice(0, 10);

    // Generate hourly breakdown (mock data for demo)
    const hourlyBreakdown = Array.from({ length: 6 }, (_, i) => ({
      hour: `${new Date().getHours() - 5 + i}:00`,
      amount: Math.floor(Math.random() * 100) + 20
    }));

    return {
      sessionId,
      totalAmount,
      totalTips,
      topTipper,
      averageTip,
      currency: 'USD',
      recentTips,
      hourlyBreakdown
    };
  }, [tips]);

  const getTopTippers = useCallback((sessionId: string, limit = 5) => {
    const sessionTips = tips.filter(tip => tip.sessionId === sessionId && !tip.isAnonymous);
    
    const tipperStats = sessionTips.reduce((acc, tip) => {
      const key = tip.userName;
      if (!acc[key]) {
        acc[key] = {
          userName: tip.userName,
          amount: 0,
          tipCount: 0,
          lastTip: tip.timestamp
        };
      }
      acc[key].amount += tip.amount;
      acc[key].tipCount += 1;
      if (new Date(tip.timestamp) > new Date(acc[key].lastTip)) {
        acc[key].lastTip = tip.timestamp;
      }
      return acc;
    }, {} as Record<string, any>);

    return Object.values(tipperStats)
      .sort((a: any, b: any) => b.amount - a.amount)
      .slice(0, limit);
  }, [tips]);

  const clearAnimation = useCallback((animationId: string) => {
    setActiveAnimations(prev => prev.filter(anim => anim.id !== animationId));
  }, []);

  const subscribeToSession = useCallback((sessionId: string) => {
    setSubscribedSessions(prev => new Set([...prev, sessionId]));
    // In a real app, this would establish WebSocket connection or Supabase realtime subscription
  }, []);

  const unsubscribeFromSession = useCallback((sessionId: string) => {
    setSubscribedSessions(prev => {
      const newSet = new Set(prev);
      newSet.delete(sessionId);
      return newSet;
    });
  }, []);

  // Real-time tip simulation for demo
  useEffect(() => {
    if (subscribedSessions.size === 0) return;

    const interval = setInterval(() => {
      // Simulate random tips every 15-30 seconds
      if (Math.random() < 0.3) {
        const sessionId = Array.from(subscribedSessions)[0];
        const amounts = [5, 10, 15, 25];
        const messages = [
          'Great content!', 
          'Thanks for the info!', 
          'Keep it up! 🔥', 
          'Loving this discussion',
          'Mind blown! 🤯'
        ];
        const userNames = ['LiveViewer1', 'PodcastFan', 'TechEnthusiast', 'LearningLover'];
        
        const randomTip: LiveTip = {
          id: `auto-tip-${Date.now()}`,
          sessionId,
          userId: `auto-user-${Date.now()}`,
          userName: userNames[Math.floor(Math.random() * userNames.length)],
          amount: amounts[Math.floor(Math.random() * amounts.length)],
          currency: 'USD',
          message: Math.random() < 0.7 ? messages[Math.floor(Math.random() * messages.length)] : undefined,
          timestamp: new Date().toISOString(),
          isAnonymous: Math.random() < 0.2,
          type: 'standard'
        };

        setTips(prev => [randomTip, ...prev.slice(0, 49)]); // Keep last 50 tips
      }
    }, 20000); // Check every 20 seconds

    return () => clearInterval(interval);
  }, [subscribedSessions]);

  const value: LiveTipContextType = {
    tips,
    sendTip,
    goals,
    createGoal,
    contributeToGoal,
    getSessionStats,
    activeAnimations,
    clearAnimation,
    getTopTippers,
    subscribeToSession,
    unsubscribeFromSession,
    isSendingTip,
    isCreatingGoal
  };

  return (
    <LiveTipContext.Provider value={value}>
      {children}
    </LiveTipContext.Provider>
  );
}

export function useLiveTip() {
  const context = useContext(LiveTipContext);
  if (!context) {
    throw new Error('useLiveTip must be used within a LiveTipProvider');
  }
  return context;
}