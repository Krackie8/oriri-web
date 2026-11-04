/**
 * VIP Subscription API Client
 * 
 * Frontend client for interacting with VIP subscription backend endpoints
 */

import { projectId, publicAnonKey } from './supabase/info';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32`;

export interface VipSubscriptionBackend {
  id: string;
  userId: string;
  userEmail: string;
  userName?: string;
  tierId: string;
  status: 'active' | 'trialing' | 'canceled' | 'past_due' | 'expired';
  startDate: string;
  endDate?: string;
  trialStartDate?: string;
  trialEndDate?: string;
  cancelAtPeriodEnd: boolean;
  canceledAt?: string;
  createdAt: string;
  updatedAt: string;
  metadata: {
    source: 'trial' | 'payment' | 'admin_grant' | 'migration';
    migratedFromLocalStorage?: boolean;
    migrationDate?: string;
  };
}

export interface VipTierBackend {
  id: string;
  name: string;
  displayName: string;
  description: string;
  price: {
    usd: number;
    aed: number;
  };
  billingPeriod: 'monthly' | 'yearly';
  features: string[];
  badge: string;
  color: string;
  highlighted: boolean;
  enabled: boolean;
  order: number;
}

/**
 * VIP API Client Class
 */
export class VipApiClient {
  private getAuthHeaders(token?: string) {
    return {
      'Authorization': `Bearer ${token || publicAnonKey}`,
      'Content-Type': 'application/json'
    };
  }

  // ============================================
  // SUBSCRIPTION ENDPOINTS
  // ============================================

  /**
   * Get user's subscription
   */
  async getSubscription(userId: string, token: string): Promise<{
    success: boolean;
    subscription: VipSubscriptionBackend | null;
    hasAccess: boolean;
    trialDaysLeft?: number | null;
    message?: string;
  }> {
    try {
      console.log('[VIP API Client] 🔍 Getting subscription for user:', userId);
      
      const response = await fetch(`${BASE_URL}/vip/subscriptions/${userId}`, {
        method: 'GET',
        headers: this.getAuthHeaders(token)
      });

      if (!response.ok) {
        console.error('[VIP API Client] ❌ Get subscription failed:', response.status, response.statusText);
        return {
          success: false,
          subscription: null,
          hasAccess: false,
          message: `Failed to get subscription: ${response.statusText}`
        };
      }

      const data = await response.json();
      console.log('[VIP API Client] ✅ Get subscription successful:', data);
      return data;
    } catch (error) {
      console.error('[VIP API Client] ❌ Get subscription error:', error);
      return {
        success: false,
        subscription: null,
        hasAccess: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Start free trial
   */
  async startTrial(tierId: string, token: string): Promise<{
    success: boolean;
    subscription?: VipSubscriptionBackend;
    trialDaysLeft?: number;
    message?: string;
    code?: string;
  }> {
    try {
      console.log('[VIP API Client] 🎁 Starting trial for tier:', tierId);
      
      const response = await fetch(`${BASE_URL}/vip/trial/start`, {
        method: 'POST',
        headers: this.getAuthHeaders(token),
        body: JSON.stringify({ tierId })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('[VIP API Client] ❌ Start trial failed:', response.status, data);
        return {
          success: false,
          message: data.error || 'Failed to start trial',
          code: data.code
        };
      }

      console.log('[VIP API Client] ✅ Trial started successfully:', data);
      return data;
    } catch (error) {
      console.error('[VIP API Client] ❌ Start trial error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get trial status
   */
  async getTrialStatus(userId: string, token: string): Promise<{
    success: boolean;
    hasUsedTrial: boolean;
    trialActive: boolean;
    trialDaysLeft: number | null;
    canStartTrial: boolean;
  }> {
    try {
      console.log('[VIP API Client] 🔍 Getting trial status for user:', userId);
      
      const response = await fetch(`${BASE_URL}/vip/trial/status/${userId}`, {
        method: 'GET',
        headers: this.getAuthHeaders(token)
      });

      if (!response.ok) {
        console.error('[VIP API Client] ❌ Get trial status failed:', response.status);
        return {
          success: false,
          hasUsedTrial: false,
          trialActive: false,
          trialDaysLeft: null,
          canStartTrial: false
        };
      }

      const data = await response.json();
      console.log('[VIP API Client] ✅ Trial status retrieved:', data);
      return data;
    } catch (error) {
      console.error('[VIP API Client] ❌ Get trial status error:', error);
      return {
        success: false,
        hasUsedTrial: false,
        trialActive: false,
        trialDaysLeft: null,
        canStartTrial: false
      };
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId: string, token: string, immediate: boolean = false): Promise<{
    success: boolean;
    subscription?: VipSubscriptionBackend;
    accessEndsAt?: string;
    message?: string;
  }> {
    try {
      console.log('[VIP API Client] 🗑️ Canceling subscription for user:', userId, 'Immediate:', immediate);
      
      const response = await fetch(`${BASE_URL}/vip/subscriptions/${userId}?immediate=${immediate}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(token)
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('[VIP API Client] ❌ Cancel subscription failed:', response.status, data);
        return {
          success: false,
          message: data.error || 'Failed to cancel subscription'
        };
      }

      console.log('[VIP API Client] ✅ Subscription canceled successfully:', data);
      return data;
    } catch (error) {
      console.error('[VIP API Client] ❌ Cancel subscription error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update subscription (upgrade/downgrade/reactivate)
   */
  async updateSubscription(
    userId: string, 
    token: string, 
    action: 'upgrade' | 'downgrade' | 'cancel' | 'reactivate',
    newTierId?: string
  ): Promise<{
    success: boolean;
    subscription?: VipSubscriptionBackend;
    changes?: string[];
    message?: string;
  }> {
    try {
      console.log('[VIP API Client] 🔄 Updating subscription:', { userId, action, newTierId });
      
      const response = await fetch(`${BASE_URL}/vip/subscriptions/${userId}`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(token),
        body: JSON.stringify({ action, newTierId })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('[VIP API Client] ❌ Update subscription failed:', response.status, data);
        return {
          success: false,
          message: data.error || 'Failed to update subscription'
        };
      }

      console.log('[VIP API Client] ✅ Subscription updated successfully:', data);
      return data;
    } catch (error) {
      console.error('[VIP API Client] ❌ Update subscription error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ============================================
  // TIER ENDPOINTS
  // ============================================

  /**
   * Get all tiers
   */
  async getTiers(token?: string): Promise<{
    success: boolean;
    tiers: VipTierBackend[];
  }> {
    try {
      console.log('[VIP API Client] 🎯 Getting tiers');
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${BASE_URL}/vip/tiers`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        console.error('[VIP API Client] ❌ Get tiers failed:', response.status);
        return {
          success: false,
          tiers: []
        };
      }

      const data = await response.json();
      console.log('[VIP API Client] ✅ Tiers retrieved:', data.tiers.length, 'tiers');
      return data;
    } catch (error) {
      console.error('[VIP API Client] ❌ Get tiers error:', error);
      return {
        success: false,
        tiers: []
      };
    }
  }

  // ============================================
  // MIGRATION ENDPOINT (NEW)
  // ============================================

  /**
   * Migrate localStorage trial to backend
   */
  async migrateLocalStorageTrial(
    userId: string,
    token: string,
    localSubscription: any
  ): Promise<{
    success: boolean;
    subscription?: VipSubscriptionBackend;
    message?: string;
  }> {
    try {
      console.log('[VIP API Client] 🔄 Migrating localStorage trial to backend');
      
      // Create a trial subscription via backend
      const response = await fetch(`${BASE_URL}/vip/subscriptions`, {
        method: 'POST',
        headers: this.getAuthHeaders(token),
        body: JSON.stringify({
          tierId: localSubscription.tierId || 'vip',
          source: 'migration'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('[VIP API Client] ❌ Migration failed:', response.status, data);
        return {
          success: false,
          message: data.error || 'Failed to migrate trial'
        };
      }

      console.log('[VIP API Client] ✅ Trial migrated successfully:', data);
      return data;
    } catch (error) {
      console.error('[VIP API Client] ❌ Migration error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const vipApi = new VipApiClient();

console.log('[VIP API Client] ✅ VIP API Client initialized');
