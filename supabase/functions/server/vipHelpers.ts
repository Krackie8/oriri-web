/**
 * VIP Subscription Management Helpers
 * 
 * This module provides helper functions for managing VIP subscriptions,
 * trials, tiers, and analytics in the Oriri platform.
 * 
 * Key Features:
 * - Subscription lifecycle management
 * - Trial tracking and validation
 * - Tier configuration
 * - Analytics aggregation
 * - Admin subscription management
 */

import * as kv from './kv_store.tsx';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface VipSubscription {
  id: string;                    // sub_xxxxx or trial_xxxxx
  userId: string;                // Supabase user ID
  userEmail: string;             // For admin display
  userName?: string;             // User's display name
  tierId: string;                // 'vip' (or future tiers)
  status: 'active' | 'trialing' | 'canceled' | 'past_due' | 'expired';
  startDate: string;             // ISO date
  endDate?: string;              // ISO date (null if active)
  trialStartDate?: string;       // ISO date (if trial)
  trialEndDate?: string;         // ISO date (if trial)
  cancelAtPeriodEnd: boolean;
  canceledAt?: string;           // ISO date
  createdAt: string;             // ISO date
  updatedAt: string;             // ISO date
  metadata: {
    source: 'trial' | 'payment' | 'admin_grant' | 'migration';
    migratedFromLocalStorage?: boolean;
    migrationDate?: string;
    grantedBy?: string;          // Admin user ID if granted
    grantReason?: string;        // Reason for admin grant
    cancelReason?: string;       // Reason for cancellation
  };
}

export interface VipTier {
  id: string;                    // 'vip', 'basic', 'pro', 'premium'
  name: string;                  // Internal name
  displayName: string;           // Display name
  description: string;           // Description
  price: {
    usd: number;
    aed: number;
  };
  billingPeriod: 'monthly' | 'yearly';
  features: string[];            // List of features
  badge: string;                 // Emoji or icon
  color: string;                 // Tailwind gradient class
  highlighted: boolean;          // Featured tier
  enabled: boolean;              // Active/inactive
  maxSubscribers?: number;       // Optional limit
  order: number;                 // Display order
  createdAt: string;
  updatedAt: string;
  createdBy: string;             // Admin user ID
}

export interface VipTrialUsage {
  userId: string;
  userEmail: string;
  usedAt: string;                // ISO date
  tierId: string;                // Which tier trial was used for
  subscriptionId: string;        // Reference to subscription
  convertedToPaid: boolean;      // Did they subscribe after?
  convertedAt?: string;          // ISO date
}

export interface VipAnalytics {
  date: string;                  // YYYY-MM-DD
  totalSubscribers: number;
  activeSubscribers: number;
  trialingSubscribers: number;
  canceledSubscribers: number;
  newSubscribers: number;
  canceledToday: number;
  trialStarts: number;
  trialConversions: number;
  revenue: {
    usd: number;
    aed: number;
  };
  byTier: {
    [tierId: string]: {
      active: number;
      trialing: number;
      new: number;
      canceled: number;
      revenue: { usd: number; aed: number };
    };
  };
}

export interface SubscriberFilters {
  status?: 'active' | 'trialing' | 'canceled' | 'expired' | 'all';
  tierId?: string;
  search?: string;              // Search by email or name
  page?: number;
  limit?: number;
}

// ============================================
// SUBSCRIPTION MANAGEMENT
// ============================================

/**
 * Get a user's subscription
 */
export async function getSubscription(userId: string): Promise<VipSubscription | null> {
  try {
    console.log('[VIP Helpers] Getting subscription for user:', userId);
    
    const subscription = await kv.get(`vip_subscription_${userId}`);
    
    if (!subscription) {
      console.log('[VIP Helpers] No subscription found for user:', userId);
      return null;
    }

    console.log('[VIP Helpers] Subscription found:', subscription.id, 'Status:', subscription.status);
    return subscription as VipSubscription;
  } catch (error) {
    console.error('[VIP Helpers] Error getting subscription:', error);
    throw error;
  }
}

/**
 * Create a new subscription
 */
export async function createSubscription(data: Partial<VipSubscription>): Promise<VipSubscription> {
  try {
    console.log('[VIP Helpers] Creating subscription for user:', data.userId);
    
    // Generate subscription ID
    const subscriptionId = data.status === 'trialing' 
      ? `trial_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      : `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const now = new Date().toISOString();
    
    const subscription: VipSubscription = {
      id: subscriptionId,
      userId: data.userId!,
      userEmail: data.userEmail!,
      userName: data.userName,
      tierId: data.tierId || 'vip',
      status: data.status || 'active',
      startDate: data.startDate || now,
      endDate: data.endDate,
      trialStartDate: data.trialStartDate,
      trialEndDate: data.trialEndDate,
      cancelAtPeriodEnd: false,
      canceledAt: undefined,
      createdAt: now,
      updatedAt: now,
      metadata: data.metadata || {
        source: 'trial'
      }
    };

    // Save subscription
    await kv.set(`vip_subscription_${subscription.userId}`, subscription);

    // Update indexes
    await updateSubscriptionIndexes(subscription, 'create');

    console.log('[VIP Helpers] Subscription created successfully:', subscription.id);
    return subscription;
  } catch (error) {
    console.error('[VIP Helpers] Error creating subscription:', error);
    throw error;
  }
}

/**
 * Update an existing subscription
 */
export async function updateSubscription(
  userId: string, 
  updates: Partial<VipSubscription>
): Promise<VipSubscription> {
  try {
    console.log('[VIP Helpers] Updating subscription for user:', userId);
    
    const existing = await getSubscription(userId);
    if (!existing) {
      throw new Error('Subscription not found');
    }

    const updated: VipSubscription = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    // Save updated subscription
    await kv.set(`vip_subscription_${userId}`, updated);

    // Update indexes if status changed
    if (updates.status && updates.status !== existing.status) {
      await updateSubscriptionIndexes(updated, 'update');
    }

    console.log('[VIP Helpers] Subscription updated:', updated.id);
    return updated;
  } catch (error) {
    console.error('[VIP Helpers] Error updating subscription:', error);
    throw error;
  }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
  userId: string, 
  immediate: boolean = false,
  reason?: string
): Promise<VipSubscription> {
  try {
    console.log('[VIP Helpers] Canceling subscription for user:', userId, 'Immediate:', immediate);
    
    const subscription = await getSubscription(userId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const now = new Date().toISOString();

    if (immediate) {
      // Immediate cancellation - ends now
      subscription.status = 'canceled';
      subscription.endDate = now;
      subscription.canceledAt = now;
    } else {
      // Cancel at period end - maintain access until end date
      subscription.cancelAtPeriodEnd = true;
      subscription.canceledAt = now;
    }

    if (reason) {
      subscription.metadata.cancelReason = reason;
    }

    subscription.updatedAt = now;

    await kv.set(`vip_subscription_${userId}`, subscription);
    await updateSubscriptionIndexes(subscription, 'cancel');

    console.log('[VIP Helpers] Subscription canceled:', subscription.id);
    return subscription;
  } catch (error) {
    console.error('[VIP Helpers] Error canceling subscription:', error);
    throw error;
  }
}

/**
 * Check if a subscription is currently active
 */
export async function isSubscriptionActive(userId: string): Promise<boolean> {
  try {
    const subscription = await getSubscription(userId);
    if (!subscription) return false;

    // Check status
    if (subscription.status === 'canceled' || subscription.status === 'expired') {
      return false;
    }

    // Check if trial expired
    if (subscription.status === 'trialing' && subscription.trialEndDate) {
      const trialEnd = new Date(subscription.trialEndDate);
      const now = new Date();
      if (now > trialEnd) {
        // Trial expired - update status
        await updateSubscription(userId, { status: 'expired' });
        return false;
      }
    }

    // Check if subscription ended
    if (subscription.endDate) {
      const endDate = new Date(subscription.endDate);
      const now = new Date();
      if (now > endDate) {
        // Subscription expired - update status
        await updateSubscription(userId, { status: 'expired' });
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('[VIP Helpers] Error checking subscription status:', error);
    return false;
  }
}

/**
 * Check VIP access for a user (comprehensive check)
 */
export async function checkVipAccess(userId: string): Promise<{
  hasAccess: boolean;
  tier?: VipTier;
  subscription?: VipSubscription;
  reason?: string;
}> {
  try {
    console.log('[VIP Helpers] Checking VIP access for user:', userId);
    
    const subscription = await getSubscription(userId);
    
    if (!subscription) {
      return { hasAccess: false, reason: 'No subscription found' };
    }

    const isActive = await isSubscriptionActive(userId);
    
    if (!isActive) {
      return { 
        hasAccess: false, 
        subscription,
        reason: `Subscription ${subscription.status}` 
      };
    }

    const tier = await getTier(subscription.tierId);
    
    if (!tier || !tier.enabled) {
      return { 
        hasAccess: false, 
        subscription,
        reason: 'Tier not available' 
      };
    }

    console.log('[VIP Helpers] VIP access granted for user:', userId);
    return { hasAccess: true, tier, subscription };
  } catch (error) {
    console.error('[VIP Helpers] Error checking VIP access:', error);
    return { hasAccess: false, reason: 'Error checking access' };
  }
}

// ============================================
// TRIAL MANAGEMENT
// ============================================

/**
 * Check if user has already used their free trial
 */
export async function hasUsedTrial(userId: string): Promise<boolean> {
  try {
    const trialUsage = await kv.get(`vip_trial_used_${userId}`);
    return !!trialUsage;
  } catch (error) {
    console.error('[VIP Helpers] Error checking trial usage:', error);
    return false; // Assume not used if error
  }
}

/**
 * Start a free trial for a user
 */
export async function startTrial(
  userId: string, 
  userEmail: string,
  userName: string | undefined,
  tierId: string = 'vip'
): Promise<VipSubscription> {
  try {
    console.log('[VIP Helpers] Starting trial for user:', userId);
    
    // Check if already used trial
    const alreadyUsed = await hasUsedTrial(userId);
    if (alreadyUsed) {
      throw new Error('User has already used their free trial');
    }

    // Check if user already has active subscription
    const existingSubscription = await getSubscription(userId);
    if (existingSubscription && existingSubscription.status !== 'canceled' && existingSubscription.status !== 'expired') {
      throw new Error('User already has an active subscription');
    }

    // Calculate trial dates
    const now = new Date();
    const trialStart = now.toISOString();
    const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const trialEndISO = trialEnd.toISOString();

    // Create trial subscription
    const subscription = await createSubscription({
      userId,
      userEmail,
      userName,
      tierId,
      status: 'trialing',
      startDate: trialStart,
      trialStartDate: trialStart,
      trialEndDate: trialEndISO,
      metadata: {
        source: 'trial'
      }
    });

    // Mark trial as used
    const trialUsage: VipTrialUsage = {
      userId,
      userEmail,
      usedAt: trialStart,
      tierId,
      subscriptionId: subscription.id,
      convertedToPaid: false
    };
    await kv.set(`vip_trial_used_${userId}`, trialUsage);

    console.log('[VIP Helpers] Trial started successfully:', subscription.id);
    return subscription;
  } catch (error) {
    console.error('[VIP Helpers] Error starting trial:', error);
    throw error;
  }
}

/**
 * Get remaining trial days for a user
 */
export async function getRemainingTrialDays(userId: string): Promise<number | null> {
  try {
    const subscription = await getSubscription(userId);
    
    if (!subscription || subscription.status !== 'trialing' || !subscription.trialEndDate) {
      return null;
    }

    const trialEnd = new Date(subscription.trialEndDate);
    const now = new Date();
    const diffTime = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
  } catch (error) {
    console.error('[VIP Helpers] Error calculating trial days:', error);
    return null;
  }
}

/**
 * Convert trial to paid subscription
 */
export async function convertTrialToPaid(
  userId: string,
  paymentMethodId?: string
): Promise<VipSubscription> {
  try {
    console.log('[VIP Helpers] Converting trial to paid for user:', userId);
    
    const subscription = await getSubscription(userId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    if (subscription.status !== 'trialing') {
      throw new Error('Subscription is not in trial status');
    }

    // Update to active subscription
    const updated = await updateSubscription(userId, {
      status: 'active',
      trialStartDate: subscription.trialStartDate,
      trialEndDate: subscription.trialEndDate,
      metadata: {
        ...subscription.metadata,
        source: 'payment',
        trialConverted: true,
        trialConvertedAt: new Date().toISOString()
      }
    });

    // Update trial usage record
    const trialUsage = await kv.get(`vip_trial_used_${userId}`) as VipTrialUsage;
    if (trialUsage) {
      trialUsage.convertedToPaid = true;
      trialUsage.convertedAt = new Date().toISOString();
      await kv.set(`vip_trial_used_${userId}`, trialUsage);
    }

    console.log('[VIP Helpers] Trial converted to paid:', updated.id);
    return updated;
  } catch (error) {
    console.error('[VIP Helpers] Error converting trial:', error);
    throw error;
  }
}

// ============================================
// TIER MANAGEMENT
// ============================================

/**
 * Get a specific tier
 */
export async function getTier(tierId: string): Promise<VipTier | null> {
  try {
    const tier = await kv.get(`vip_tier_${tierId}`);
    return tier as VipTier | null;
  } catch (error) {
    console.error('[VIP Helpers] Error getting tier:', error);
    return null;
  }
}

/**
 * Get all tiers
 */
export async function getAllTiers(): Promise<VipTier[]> {
  try {
    const tierIds = await kv.get('vip_tiers_all') || [];
    const tiers: VipTier[] = [];

    for (const tierId of tierIds as string[]) {
      const tier = await getTier(tierId);
      if (tier) {
        tiers.push(tier);
      }
    }

    // Sort by order field
    tiers.sort((a, b) => a.order - b.order);

    return tiers;
  } catch (error) {
    console.error('[VIP Helpers] Error getting all tiers:', error);
    return [];
  }
}

/**
 * Get only enabled tiers
 */
export async function getEnabledTiers(): Promise<VipTier[]> {
  try {
    const allTiers = await getAllTiers();
    return allTiers.filter(tier => tier.enabled);
  } catch (error) {
    console.error('[VIP Helpers] Error getting enabled tiers:', error);
    return [];
  }
}

/**
 * Create a new tier
 */
export async function createTier(tierData: Omit<VipTier, 'createdAt' | 'updatedAt'>): Promise<VipTier> {
  try {
    console.log('[VIP Helpers] Creating tier:', tierData.id);
    
    const now = new Date().toISOString();
    
    const tier: VipTier = {
      ...tierData,
      createdAt: now,
      updatedAt: now
    };

    // Save tier
    await kv.set(`vip_tier_${tier.id}`, tier);

    // Update tier indexes
    const allTiers = await kv.get('vip_tiers_all') || [];
    if (!allTiers.includes(tier.id)) {
      allTiers.push(tier.id);
      await kv.set('vip_tiers_all', allTiers);
    }

    if (tier.enabled) {
      const enabledTiers = await kv.get('vip_tiers_enabled') || [];
      if (!enabledTiers.includes(tier.id)) {
        enabledTiers.push(tier.id);
        await kv.set('vip_tiers_enabled', enabledTiers);
      }
    }

    console.log('[VIP Helpers] Tier created:', tier.id);
    return tier;
  } catch (error) {
    console.error('[VIP Helpers] Error creating tier:', error);
    throw error;
  }
}

/**
 * Update a tier
 */
export async function updateTier(
  tierId: string,
  updates: Partial<VipTier>
): Promise<VipTier> {
  try {
    console.log('[VIP Helpers] Updating tier:', tierId);
    
    const existing = await getTier(tierId);
    if (!existing) {
      throw new Error('Tier not found');
    }

    const updated: VipTier = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await kv.set(`vip_tier_${tierId}`, updated);

    // Update enabled index if enabled status changed
    if (updates.enabled !== undefined && updates.enabled !== existing.enabled) {
      const enabledTiers = await kv.get('vip_tiers_enabled') || [];
      if (updates.enabled) {
        if (!enabledTiers.includes(tierId)) {
          enabledTiers.push(tierId);
          await kv.set('vip_tiers_enabled', enabledTiers);
        }
      } else {
        const filtered = enabledTiers.filter((id: string) => id !== tierId);
        await kv.set('vip_tiers_enabled', filtered);
      }
    }

    console.log('[VIP Helpers] Tier updated:', tierId);
    return updated;
  } catch (error) {
    console.error('[VIP Helpers] Error updating tier:', error);
    throw error;
  }
}

/**
 * Delete a tier
 */
export async function deleteTier(tierId: string): Promise<void> {
  try {
    console.log('[VIP Helpers] Deleting tier:', tierId);
    
    // Check if tier has active subscribers
    const subscribers = await getAllSubscribers({ tierId, status: 'active' });
    if (subscribers.length > 0) {
      throw new Error(`Cannot delete tier with ${subscribers.length} active subscribers`);
    }

    // Delete tier
    await kv.del(`vip_tier_${tierId}`);

    // Update indexes
    const allTiers = await kv.get('vip_tiers_all') || [];
    const filteredAll = allTiers.filter((id: string) => id !== tierId);
    await kv.set('vip_tiers_all', filteredAll);

    const enabledTiers = await kv.get('vip_tiers_enabled') || [];
    const filteredEnabled = enabledTiers.filter((id: string) => id !== tierId);
    await kv.set('vip_tiers_enabled', filteredEnabled);

    console.log('[VIP Helpers] Tier deleted:', tierId);
  } catch (error) {
    console.error('[VIP Helpers] Error deleting tier:', error);
    throw error;
  }
}

// ============================================
// ADMIN FUNCTIONS
// ============================================

/**
 * Get all subscribers with optional filters
 */
export async function getAllSubscribers(filters?: SubscriberFilters): Promise<VipSubscription[]> {
  try {
    console.log('[VIP Helpers] Getting all subscribers with filters:', filters);
    
    // Get subscriber index based on status filter
    let subscriberIds: string[];
    
    if (filters?.status === 'active' || filters?.status === 'trialing') {
      subscriberIds = await kv.get('vip_subscriptions_active') || [];
    } else {
      subscriberIds = await kv.get('vip_subscriptions_all') || [];
    }

    // Fetch all subscriptions
    const subscriptions: VipSubscription[] = [];
    
    for (const userId of subscriberIds as string[]) {
      const subscription = await getSubscription(userId);
      if (subscription) {
        // Apply filters
        if (filters?.status && filters.status !== 'all' && subscription.status !== filters.status) {
          continue;
        }
        
        if (filters?.tierId && subscription.tierId !== filters.tierId) {
          continue;
        }
        
        if (filters?.search) {
          const searchLower = filters.search.toLowerCase();
          const emailMatch = subscription.userEmail?.toLowerCase().includes(searchLower);
          const nameMatch = subscription.userName?.toLowerCase().includes(searchLower);
          if (!emailMatch && !nameMatch) {
            continue;
          }
        }
        
        subscriptions.push(subscription);
      }
    }

    // Sort by creation date (newest first)
    subscriptions.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Apply pagination
    if (filters?.page && filters?.limit) {
      const start = (filters.page - 1) * filters.limit;
      const end = start + filters.limit;
      return subscriptions.slice(start, end);
    }

    console.log('[VIP Helpers] Found', subscriptions.length, 'subscribers');
    return subscriptions;
  } catch (error) {
    console.error('[VIP Helpers] Error getting subscribers:', error);
    return [];
  }
}

/**
 * Admin grant VIP access to a user
 */
export async function grantVipAccess(
  userId: string,
  userEmail: string,
  userName: string | undefined,
  tierId: string,
  adminUserId: string,
  duration?: number, // Days
  reason?: string
): Promise<VipSubscription> {
  try {
    console.log('[VIP Helpers] Admin granting VIP access to user:', userId);
    
    // Check if user already has subscription
    const existing = await getSubscription(userId);
    
    const now = new Date();
    const startDate = now.toISOString();
    let endDate: string | undefined;
    
    if (duration) {
      const end = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000);
      endDate = end.toISOString();
    }

    if (existing) {
      // Update existing subscription
      return await updateSubscription(userId, {
        status: 'active',
        tierId,
        endDate,
        metadata: {
          ...existing.metadata,
          source: 'admin_grant',
          grantedBy: adminUserId,
          grantReason: reason
        }
      });
    } else {
      // Create new subscription
      return await createSubscription({
        userId,
        userEmail,
        userName,
        tierId,
        status: 'active',
        startDate,
        endDate,
        metadata: {
          source: 'admin_grant',
          grantedBy: adminUserId,
          grantReason: reason
        }
      });
    }
  } catch (error) {
    console.error('[VIP Helpers] Error granting VIP access:', error);
    throw error;
  }
}

/**
 * Admin revoke VIP access from a user
 */
export async function revokeVipAccess(
  userId: string,
  adminUserId: string,
  reason?: string
): Promise<void> {
  try {
    console.log('[VIP Helpers] Admin revoking VIP access from user:', userId);
    
    const subscription = await getSubscription(userId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    await updateSubscription(userId, {
      status: 'canceled',
      endDate: new Date().toISOString(),
      canceledAt: new Date().toISOString(),
      metadata: {
        ...subscription.metadata,
        revokedBy: adminUserId,
        revokeReason: reason
      }
    });

    console.log('[VIP Helpers] VIP access revoked for user:', userId);
  } catch (error) {
    console.error('[VIP Helpers] Error revoking VIP access:', error);
    throw error;
  }
}

// ============================================
// ANALYTICS FUNCTIONS
// ============================================

/**
 * Get VIP analytics for a date range
 */
export async function getVipAnalytics(
  startDate?: string,
  endDate?: string
): Promise<any> {
  try {
    console.log('[VIP Helpers] Getting VIP analytics');
    
    // Get all active subscribers
    const allSubscribers = await getAllSubscribers();
    const activeSubscribers = allSubscribers.filter(s => s.status === 'active' || s.status === 'trialing');
    const trialingSubscribers = allSubscribers.filter(s => s.status === 'trialing');
    const canceledSubscribers = allSubscribers.filter(s => s.status === 'canceled');

    // Calculate metrics by tier
    const byTier: any = {};
    const tiers = await getAllTiers();
    
    for (const tier of tiers) {
      const tierSubscribers = activeSubscribers.filter(s => s.tierId === tier.id);
      const tierTrialing = trialingSubscribers.filter(s => s.tierId === tier.id);
      
      byTier[tier.id] = {
        name: tier.displayName,
        subscribers: tierSubscribers.length,
        trialing: tierTrialing.length,
        revenue: {
          usd: tierSubscribers.length * tier.price.usd,
          aed: tierSubscribers.length * tier.price.aed
        },
        percentage: activeSubscribers.length > 0 
          ? ((tierSubscribers.length / activeSubscribers.length) * 100).toFixed(1)
          : 0
      };
    }

    // Calculate total MRR
    let totalMRR = { usd: 0, aed: 0 };
    for (const tier of tiers) {
      const tierSubs = activeSubscribers.filter(s => s.tierId === tier.id && s.status === 'active');
      totalMRR.usd += tierSubs.length * tier.price.usd;
      totalMRR.aed += tierSubs.length * tier.price.aed;
    }

    // Calculate churn rate (simplified)
    const totalEverSubscribed = allSubscribers.length;
    const churnRate = totalEverSubscribed > 0 
      ? ((canceledSubscribers.length / totalEverSubscribed) * 100).toFixed(1)
      : 0;

    // Calculate conversion rate (trials that became paid)
    const trialUsages = await getAllTrialUsages();
    const convertedTrials = trialUsages.filter(t => t.convertedToPaid).length;
    const conversionRate = trialUsages.length > 0
      ? ((convertedTrials / trialUsages.length) * 100).toFixed(1)
      : 0;

    return {
      overview: {
        totalSubscribers: allSubscribers.length,
        activeSubscribers: activeSubscribers.length,
        trialingSubscribers: trialingSubscribers.length,
        canceledSubscribers: canceledSubscribers.length,
        monthlyRecurringRevenue: totalMRR,
        averageLifetimeValue: {
          usd: activeSubscribers.length > 0 ? (totalMRR.usd / activeSubscribers.length) : 0,
          aed: activeSubscribers.length > 0 ? (totalMRR.aed / activeSubscribers.length) : 0
        },
        churnRate: parseFloat(churnRate),
        conversionRate: parseFloat(conversionRate)
      },
      byTier,
      trends: [] // Will be populated from daily analytics in future
    };
  } catch (error) {
    console.error('[VIP Helpers] Error getting analytics:', error);
    throw error;
  }
}

/**
 * Get all trial usages (for analytics)
 */
async function getAllTrialUsages(): Promise<VipTrialUsage[]> {
  try {
    // This is a simplified implementation
    // In production, you might want to maintain a separate index
    const allSubscribers = await getAllSubscribers();
    const trialUsages: VipTrialUsage[] = [];
    
    for (const sub of allSubscribers) {
      const usage = await kv.get(`vip_trial_used_${sub.userId}`) as VipTrialUsage;
      if (usage) {
        trialUsages.push(usage);
      }
    }
    
    return trialUsages;
  } catch (error) {
    console.error('[VIP Helpers] Error getting trial usages:', error);
    return [];
  }
}

// ============================================
// INTERNAL HELPER FUNCTIONS
// ============================================

/**
 * Update subscription indexes when subscription changes
 */
async function updateSubscriptionIndexes(
  subscription: VipSubscription,
  action: 'create' | 'update' | 'cancel'
): Promise<void> {
  try {
    // Update all subscriptions index
    const allSubs = await kv.get('vip_subscriptions_all') || [];
    if (!allSubs.includes(subscription.userId)) {
      allSubs.push(subscription.userId);
      await kv.set('vip_subscriptions_all', allSubs);
    }

    // Update active subscriptions index
    const activeSubs = await kv.get('vip_subscriptions_active') || [];
    const isActive = subscription.status === 'active' || subscription.status === 'trialing';
    const isInActiveList = activeSubs.includes(subscription.userId);

    if (isActive && !isInActiveList) {
      activeSubs.push(subscription.userId);
      await kv.set('vip_subscriptions_active', activeSubs);
    } else if (!isActive && isInActiveList) {
      const filtered = activeSubs.filter((id: string) => id !== subscription.userId);
      await kv.set('vip_subscriptions_active', filtered);
    }
  } catch (error) {
    console.error('[VIP Helpers] Error updating indexes:', error);
    // Don't throw - index update failure shouldn't break subscription operations
  }
}

/**
 * Initialize default VIP tier if none exists
 */
export async function initializeDefaultTier(adminUserId: string): Promise<VipTier> {
  try {
    console.log('[VIP Helpers] Checking for default VIP tier');
    
    const existingTier = await getTier('vip');
    if (existingTier) {
      console.log('[VIP Helpers] Default VIP tier already exists');
      return existingTier;
    }

    console.log('[VIP Helpers] Creating default VIP tier');
    
    const defaultTier: Omit<VipTier, 'createdAt' | 'updatedAt'> = {
      id: 'vip',
      name: 'vip',
      displayName: 'VIP Member',
      description: 'Unlock exclusive Oriri content and premium features',
      price: {
        usd: 5.45, // Approximately AED 20
        aed: 20
      },
      billingPeriod: 'monthly',
      features: [
        'Access to all exclusive Oriri episodes',
        'Ad-free listening experience',
        'VIP badge in community',
        'Behind-the-scenes content'
      ],
      badge: '👑',
      color: 'from-purple-500 to-pink-500',
      highlighted: true,
      enabled: true,
      order: 1,
      createdBy: adminUserId
    };

    return await createTier(defaultTier);
  } catch (error) {
    console.error('[VIP Helpers] Error initializing default tier:', error);
    throw error;
  }
}

console.log('[VIP Helpers] ✅ VIP helper functions loaded');
