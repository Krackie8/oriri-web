import { useState, useEffect, useMemo } from 'react';
import { useAuth } from './useAuth';
import { useUserProfile } from './useUserProfile';
import { CommunityStatsGenerator } from '../utils/communityStatsGenerator';
import type { CommunityProfile } from '../contexts/CommunityEngagementContext';

interface CommunityStats {
  postsCount: number;
  repliesCount: number;
  likesReceived: number;
  questionsSubmitted: number;
  storiesShared: number;
  challengesParticipated: number;
  qaSessionsAttended: number;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string;
  category: 'engagement' | 'contribution' | 'loyalty' | 'special';
}

export function useCommunityProfile(): CommunityProfile | null {
  const { user, isLoggedIn } = useAuth();
  const userProfile = useUserProfile();
  const [communityStats, setCommunityStats] = useState<CommunityStats>({
    postsCount: 0,
    repliesCount: 0,
    likesReceived: 0,
    questionsSubmitted: 0,
    storiesShared: 0,
    challengesParticipated: 0,
    qaSessionsAttended: 0,
  });
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  // Load community stats from backend (currently using mock data)
  useEffect(() => {
    if (!isLoggedIn || !user) return;

    // Generate realistic stats using the new generator
    const userMetrics = {
      isVip: userProfile?.isVip || false,
      isAdmin: userProfile?.isAdmin || false,
      joinedDate: user.created_at ? new Date(user.created_at) : new Date(),
      email: user.email || '',
    };

    const generatedStats = CommunityStatsGenerator.generateRealisticStats(userMetrics);
    setCommunityStats(generatedStats);

    // Generate achievements based on stats
    const generatedAchievements = CommunityStatsGenerator.generateAchievements(generatedStats, userMetrics);
    setAchievements(generatedAchievements);
  }, [isLoggedIn, user, userProfile]);

  const communityProfile: CommunityProfile | null = useMemo(() => {
    if (!isLoggedIn || !user || !userProfile) return null;

    // Calculate level and experience using the generator
    const { level, experience, nextLevelExperience } = CommunityStatsGenerator.calculateLevel(communityStats);

    // Generate badges using the generator
    const userMetrics = {
      isVip: userProfile.isVip,
      isAdmin: userProfile.isAdmin,
      joinedDate: user.created_at ? new Date(user.created_at) : new Date(),
      email: user.email || '',
    };
    const badges = CommunityStatsGenerator.generateBadges(communityStats, userMetrics);

    return {
      userId: user.id,
      displayName: userProfile.displayName,
      bio: `Passionate about personal development and helping others achieve their goals.${userProfile.isVip ? ' VIP member since joining.' : ''}`,
      avatar: userProfile.avatarUrl,
      joinedAt: user.created_at || new Date().toISOString(),
      stats: communityStats,
      achievements,
      badges,
      level,
      experience,
      nextLevelExperience,
      reputation: Math.floor(experience / 5), // Reputation based on experience
    };
  }, [isLoggedIn, user, userProfile, communityStats, achievements]);

  return communityProfile;
}