// Community stats generator for realistic user engagement simulation

interface UserMetrics {
  isVip: boolean;
  isAdmin: boolean;
  joinedDate: Date;
  email: string;
}

interface CommunityStats {
  postsCount: number;
  repliesCount: number;
  likesReceived: number;
  questionsSubmitted: number;
  storiesShared: number;
  challengesParticipated: number;
  qaSessionsAttended: number;
}

export class CommunityStatsGenerator {
  static generateRealisticStats(userMetrics: UserMetrics): CommunityStats {
    const daysSinceJoined = Math.floor((Date.now() - userMetrics.joinedDate.getTime()) / (1000 * 60 * 60 * 24));
    const weeksSinceJoined = Math.floor(daysSinceJoined / 7);
    
    // Base activity multipliers
    let activityMultiplier = 1;
    if (userMetrics.isAdmin) activityMultiplier += 2; // Admins are more active
    if (userMetrics.isVip) activityMultiplier += 1; // VIP users are more engaged
    
    // Special cases for admin email
    if (userMetrics.email === 'admin@oriri.com') {
      return {
        postsCount: Math.max(15, Math.floor(weeksSinceJoined * 2 + 10)),
        repliesCount: Math.max(43, Math.floor(weeksSinceJoined * 5 + 25)),
        likesReceived: Math.max(127, Math.floor(weeksSinceJoined * 8 + 50)),
        questionsSubmitted: Math.max(5, Math.floor(weeksSinceJoined * 0.5 + 3)),
        storiesShared: Math.max(3, Math.floor(weeksSinceJoined * 0.3 + 2)),
        challengesParticipated: Math.max(3, Math.floor(weeksSinceJoined * 0.4 + 1)),
        qaSessionsAttended: Math.max(2, Math.floor(weeksSinceJoined * 0.3 + 1)),
      };
    }
    
    // Generate realistic progression based on time and user type
    const basePosts = Math.max(0, Math.floor(weeksSinceJoined * 0.8 * activityMultiplier));
    const baseReplies = Math.max(0, Math.floor(basePosts * 2.8 * activityMultiplier));
    const baseLikes = Math.max(0, Math.floor(basePosts * 4.2 * activityMultiplier));
    
    // Add some randomness for realism
    const randomFactor = 0.3; // 30% randomness
    
    return {
      postsCount: Math.floor(basePosts * (1 + (Math.random() - 0.5) * randomFactor)),
      repliesCount: Math.floor(baseReplies * (1 + (Math.random() - 0.5) * randomFactor)),
      likesReceived: Math.floor(baseLikes * (1 + (Math.random() - 0.5) * randomFactor)),
      questionsSubmitted: Math.max(0, Math.floor(basePosts * 0.3 * (1 + (Math.random() - 0.5) * randomFactor))),
      storiesShared: Math.max(0, Math.floor(basePosts * 0.2 * (1 + (Math.random() - 0.5) * randomFactor))),
      challengesParticipated: Math.max(0, Math.floor(weeksSinceJoined * 0.4 * activityMultiplier * (1 + (Math.random() - 0.5) * randomFactor))),
      qaSessionsAttended: Math.max(0, Math.floor(weeksSinceJoined * 0.25 * activityMultiplier * (1 + (Math.random() - 0.5) * randomFactor))),
    };
  }

  static generateAchievements(stats: CommunityStats, userMetrics: UserMetrics) {
    const achievements = [];
    const joinedTime = userMetrics.joinedDate.getTime();
    const daysSinceJoined = Math.floor((Date.now() - joinedTime) / (1000 * 60 * 60 * 24));

    // Early Supporter (join early)
    if (daysSinceJoined >= 7) {
      achievements.push({
        id: 'early_supporter',
        name: 'Early Supporter',
        description: 'One of the first community members to join',
        icon: '🌟',
        earnedAt: new Date(joinedTime + 7 * 86400000).toISOString(),
        category: 'loyalty' as const
      });
    }

    // First Post
    if (stats.postsCount > 0) {
      achievements.push({
        id: 'first_post',
        name: 'First Post',
        description: 'Made your first community post',
        icon: '🎯',
        earnedAt: new Date(joinedTime + Math.min(daysSinceJoined, 14) * 86400000).toISOString(),
        category: 'engagement' as const
      });
    }

    // Top Contributor
    if (stats.postsCount >= 10) {
      achievements.push({
        id: 'top_contributor',
        name: 'Top Contributor',
        description: 'Created 10+ high-quality posts',
        icon: '👑',
        earnedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
        category: 'contribution' as const
      });
    }

    // Community Champion (VIP users)
    if (userMetrics.isVip && stats.likesReceived >= 50) {
      achievements.push({
        id: 'community_champion',
        name: 'Community Champion',
        description: 'Helped many community members',
        icon: '🏆',
        earnedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
        category: 'special' as const
      });
    }

    // Conversation Starter
    if (stats.repliesCount >= 25) {
      achievements.push({
        id: 'conversation_starter',
        name: 'Conversation Starter',
        description: 'Generated 25+ replies to your posts',
        icon: '💬',
        earnedAt: new Date(Date.now() - 21 * 86400000).toISOString(),
        category: 'engagement' as const
      });
    }

    // Challenge Participant
    if (stats.challengesParticipated >= 3) {
      achievements.push({
        id: 'challenge_participant',
        name: 'Challenge Enthusiast',
        description: 'Participated in 3+ community challenges',
        icon: '🎮',
        earnedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
        category: 'contribution' as const
      });
    }

    // Q&A Attendee
    if (stats.qaSessionsAttended >= 1) {
      achievements.push({
        id: 'qa_attendee',
        name: 'Q&A Attendee',
        description: 'Attended your first live Q&A session',
        icon: '🎤',
        earnedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        category: 'engagement' as const
      });
    }

    return achievements;
  }

  static calculateLevel(stats: CommunityStats): { level: number; experience: number; nextLevelExperience: number } {
    // Calculate total experience points
    let experience = 0;
    experience += stats.postsCount * 10; // 10 XP per post
    experience += stats.repliesCount * 5; // 5 XP per reply
    experience += stats.likesReceived * 2; // 2 XP per like received
    experience += stats.questionsSubmitted * 8; // 8 XP per question
    experience += stats.storiesShared * 12; // 12 XP per story
    experience += stats.challengesParticipated * 25; // 25 XP per challenge
    experience += stats.qaSessionsAttended * 20; // 20 XP per Q&A session

    // Calculate level (exponential growth)
    const level = Math.max(1, Math.floor(Math.sqrt(experience / 50)) + 1);
    const nextLevelExperience = Math.pow(level, 2) * 50;

    return { level, experience, nextLevelExperience };
  }

  static generateBadges(stats: CommunityStats, userMetrics: UserMetrics): string[] {
    const badges: string[] = [];

    // Role-based badges
    if (userMetrics.isAdmin) badges.push('Creator');
    if (userMetrics.isVip) badges.push('VIP Member');

    // Activity-based badges
    if (stats.postsCount >= 10) badges.push('Top Contributor');
    if (stats.likesReceived >= 100) badges.push('Community Favorite');
    if (stats.challengesParticipated >= 3) badges.push('Challenge Champion');
    if (stats.qaSessionsAttended >= 2) badges.push('Q&A Regular');
    if (stats.repliesCount >= 50) badges.push('Conversation Master');

    // Special badges
    const daysSinceJoined = Math.floor((Date.now() - userMetrics.joinedDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceJoined >= 30) badges.push('Early Supporter');
    if (daysSinceJoined >= 90) badges.push('Veteran Member');

    return badges;
  }
}