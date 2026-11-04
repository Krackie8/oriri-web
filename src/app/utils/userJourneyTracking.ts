// User Journey Tracking for Oriri App
import DebugUtils from './debugUtils';

export interface UserJourneyEvent {
  event: string;
  timestamp: string;
  userId?: string;
  isAdmin?: boolean;
  isVip?: boolean;
  metadata?: Record<string, any>;
}

export class UserJourneyTracker {
  private static events: UserJourneyEvent[] = [];
  private static sessionId = Date.now().toString();

  // Track user actions throughout their journey
  static trackEvent(event: string, metadata?: Record<string, any>) {
    const journeyEvent: UserJourneyEvent = {
      event,
      timestamp: new Date().toISOString(),
      metadata: {
        sessionId: this.sessionId,
        url: window.location.pathname,
        ...metadata
      }
    };

    this.events.push(journeyEvent);
    DebugUtils.debug('User journey event:', journeyEvent);

    // Save to localStorage for admin analytics
    this.saveToStorage();
  }

  // Specific tracking methods for different user types
  static trackCreatorAction(action: string, metadata?: Record<string, any>) {
    this.trackEvent(`creator_${action}`, {
      userType: 'creator',
      ...metadata
    });
  }

  static trackNormalUserAction(action: string, metadata?: Record<string, any>) {
    this.trackEvent(`user_${action}`, {
      userType: 'normal',
      ...metadata
    });
  }

  static trackVipAction(action: string, metadata?: Record<string, any>) {
    this.trackEvent(`vip_${action}`, {
      userType: 'vip',
      ...metadata
    });
  }

  // Common journey milestones
  static trackAppStart() {
    this.trackEvent('app_started');
  }

  static trackOnboardingShown() {
    this.trackEvent('onboarding_shown');
  }

  static trackOnboardingCompleted() {
    this.trackEvent('onboarding_completed');
  }

  static trackOnboardingSkipped() {
    this.trackEvent('onboarding_skipped');
  }

  static trackUserRegistration() {
    this.trackEvent('user_registered');
  }

  static trackVipSubscription(tier?: string) {
    this.trackEvent('vip_subscribed', { tier });
  }

  static trackEpisodePlay(episodeId: string, source: 'free' | 'vip') {
    this.trackEvent('episode_played', { episodeId, source });
  }

  static trackEpisodeComplete(episodeId: string, duration: number) {
    this.trackEvent('episode_completed', { episodeId, duration });
  }

  static trackTipSent(amount: number, episodeId?: string) {
    this.trackEvent('tip_sent', { amount, episodeId });
  }

  static trackStoreVisit() {
    this.trackEvent('store_visited');
  }

  static trackPurchase(items: any[], total: number) {
    this.trackEvent('purchase_completed', { items, total });
  }

  static trackCommunityEngagement(type: 'comment' | 'like' | 'share', targetId: string) {
    this.trackEvent(`community_${type}`, { targetId });
  }

  // Admin tracking
  static trackAdminDashboardAccess() {
    this.trackCreatorAction('dashboard_accessed');
  }

  static trackContentUpload(type: 'episode' | 'merchandise') {
    this.trackCreatorAction('content_uploaded', { type });
  }

  static trackAnalyticsView(section: string) {
    this.trackCreatorAction('analytics_viewed', { section });
  }

  // Get journey analytics
  static getJourneyEvents(): UserJourneyEvent[] {
    return this.events;
  }

  static getSessionAnalytics() {
    const events = this.events;
    const sessionStart = events[0]?.timestamp;
    const sessionEnd = events[events.length - 1]?.timestamp;
    
    return {
      sessionId: this.sessionId,
      sessionStart,
      sessionEnd,
      totalEvents: events.length,
      uniqueActions: [...new Set(events.map(e => e.event))].length,
      userEngagementScore: this.calculateEngagementScore(events)
    };
  }

  private static calculateEngagementScore(events: UserJourneyEvent[]): number {
    // Simple engagement scoring based on event types
    let score = 0;
    
    events.forEach(event => {
      switch (true) {
        case event.event.includes('episode_played'):
          score += 10;
          break;
        case event.event.includes('episode_completed'):
          score += 20;
          break;
        case event.event.includes('tip_sent'):
          score += 25;
          break;
        case event.event.includes('vip_subscribed'):
          score += 50;
          break;
        case event.event.includes('community_'):
          score += 5;
          break;
        case event.event.includes('purchase_'):
          score += 30;
          break;
        default:
          score += 1;
      }
    });

    return score;
  }

  private static saveToStorage() {
    try {
      const journeyData = {
        sessionId: this.sessionId,
        events: this.events.slice(-100), // Keep last 100 events
        analytics: this.getSessionAnalytics()
      };
      
      localStorage.setItem('oriri-user-journey', JSON.stringify(journeyData));
    } catch (e) {
      DebugUtils.warn('Failed to save user journey data:', e);
    }
  }

  static exportJourneyData(): string {
    return JSON.stringify({
      sessionAnalytics: this.getSessionAnalytics(),
      events: this.events,
      timestamp: new Date().toISOString()
    }, null, 2);
  }

  static clearJourneyData() {
    this.events = [];
    localStorage.removeItem('oriri-user-journey');
  }
}

// Initialize tracking when module loads
UserJourneyTracker.trackAppStart();

// Make available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).OririJourney = UserJourneyTracker;
}

export default UserJourneyTracker;