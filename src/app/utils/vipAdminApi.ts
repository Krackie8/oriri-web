/**
 * VIP Admin API Client
 * Phase 1E: Admin Dashboard Integration
 * 
 * API client for admin VIP management and analytics
 */

import { projectId, publicAnonKey } from './supabase/info';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32`;

/**
 * VIP Admin API Client
 */
export const vipAdminApi = {
  /**
   * Get VIP analytics
   */
  async getAnalytics(token: string, startDate?: string, endDate?: string) {
    try {
      console.log('[VIP Admin API] 📊 Getting analytics...');
      
      let url = `${BASE_URL}/admin/vip/analytics`;
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        console.log('[VIP Admin API] ✅ Analytics retrieved');
        return {
          success: true,
          analytics: {
            overview: data.overview,
            byTier: data.byTier,
            trends: data.trends
          }
        };
      } else {
        console.error('[VIP Admin API] ❌ Failed to get analytics:', data.error);
        return {
          success: false,
          error: data.error
        };
      }
    } catch (error) {
      console.error('[VIP Admin API] ❌ Error getting analytics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  /**
   * Get all VIP subscribers
   */
  async getSubscribers(token: string, options?: {
    status?: 'all' | 'active' | 'trialing' | 'canceled';
    tierId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    try {
      console.log('[VIP Admin API] 👥 Getting subscribers...');
      
      let url = `${BASE_URL}/admin/vip/subscribers`;
      const params = new URLSearchParams();
      
      if (options?.status) params.append('status', options.status);
      if (options?.tierId) params.append('tierId', options.tierId);
      if (options?.search) params.append('search', options.search);
      if (options?.page) params.append('page', options.page.toString());
      if (options?.limit) params.append('limit', options.limit.toString());
      
      if (params.toString()) url += `?${params.toString()}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        console.log('[VIP Admin API] ✅ Subscribers retrieved:', data.total);
        return {
          success: true,
          subscribers: data.subscribers,
          total: data.total,
          page: data.page,
          pages: data.pages,
          limit: data.limit,
          filters: data.filters
        };
      } else {
        console.error('[VIP Admin API] ❌ Failed to get subscribers:', data.error);
        return {
          success: false,
          error: data.error
        };
      }
    } catch (error) {
      console.error('[VIP Admin API] ❌ Error getting subscribers:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  /**
   * Grant VIP access to a user
   */
  async grantAccess(token: string, userId: string, options: {
    tierId?: string;
    duration?: number; // days
    reason?: string;
    userEmail?: string;
    userName?: string;
  }) {
    try {
      console.log('[VIP Admin API] 🎁 Granting VIP access to:', userId);

      const response = await fetch(`${BASE_URL}/admin/vip/subscribers/${userId}/grant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(options)
      });

      const data = await response.json();

      if (data.success) {
        console.log('[VIP Admin API] ✅ VIP access granted');
        return {
          success: true,
          subscription: data.subscription,
          message: data.message
        };
      } else {
        console.error('[VIP Admin API] ❌ Failed to grant access:', data.error);
        return {
          success: false,
          error: data.error
        };
      }
    } catch (error) {
      console.error('[VIP Admin API] ❌ Error granting access:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  /**
   * Revoke VIP access from a user
   */
  async revokeAccess(token: string, userId: string, reason?: string) {
    try {
      console.log('[VIP Admin API] ⛔ Revoking VIP access from:', userId);

      const response = await fetch(`${BASE_URL}/admin/vip/subscribers/${userId}/revoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
      });

      const data = await response.json();

      if (data.success) {
        console.log('[VIP Admin API] ✅ VIP access revoked');
        return {
          success: true,
          message: data.message
        };
      } else {
        console.error('[VIP Admin API] ❌ Failed to revoke access:', data.error);
        return {
          success: false,
          error: data.error
        };
      }
    } catch (error) {
      console.error('[VIP Admin API] ❌ Error revoking access:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  /**
   * Get all VIP tiers
   */
  async getTiers(token: string) {
    try {
      console.log('[VIP Admin API] 🎯 Getting tiers...');

      const response = await fetch(`${BASE_URL}/vip/tiers`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        console.log('[VIP Admin API] ✅ Tiers retrieved:', data.tiers.length);
        return {
          success: true,
          tiers: data.tiers
        };
      } else {
        console.error('[VIP Admin API] ❌ Failed to get tiers:', data.error);
        return {
          success: false,
          error: data.error
        };
      }
    } catch (error) {
      console.error('[VIP Admin API] ❌ Error getting tiers:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  /**
   * Create a new tier (admin only)
   */
  async createTier(token: string, tierData: {
    id: string;
    displayName: string;
    description: string;
    price: { usd: number; aed: number };
    features: string[];
    badge?: string;
    color?: string;
    highlighted?: boolean;
  }) {
    try {
      console.log('[VIP Admin API] ➕ Creating tier...');

      const response = await fetch(`${BASE_URL}/admin/vip/tiers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(tierData)
      });

      const data = await response.json();

      if (data.success) {
        console.log('[VIP Admin API] ✅ Tier created');
        return {
          success: true,
          tier: data.tier,
          message: data.message
        };
      } else {
        console.error('[VIP Admin API] ❌ Failed to create tier:', data.error);
        return {
          success: false,
          error: data.error
        };
      }
    } catch (error) {
      console.error('[VIP Admin API] ❌ Error creating tier:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  /**
   * Update a tier (admin only)
   */
  async updateTier(token: string, tierId: string, updates: any) {
    try {
      console.log('[VIP Admin API] ✏️ Updating tier:', tierId);

      const response = await fetch(`${BASE_URL}/admin/vip/tiers/${tierId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });

      const data = await response.json();

      if (data.success) {
        console.log('[VIP Admin API] ✅ Tier updated');
        return {
          success: true,
          tier: data.tier,
          message: data.message
        };
      } else {
        console.error('[VIP Admin API] ❌ Failed to update tier:', data.error);
        return {
          success: false,
          error: data.error
        };
      }
    } catch (error) {
      console.error('[VIP Admin API] ❌ Error updating tier:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  /**
   * Delete a tier (admin only)
   */
  async deleteTier(token: string, tierId: string) {
    try {
      console.log('[VIP Admin API] 🗑️ Deleting tier:', tierId);

      const response = await fetch(`${BASE_URL}/admin/vip/tiers/${tierId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        console.log('[VIP Admin API] ✅ Tier deleted');
        return {
          success: true,
          message: data.message
        };
      } else {
        console.error('[VIP Admin API] ❌ Failed to delete tier:', data.error);
        return {
          success: false,
          error: data.error
        };
      }
    } catch (error) {
      console.error('[VIP Admin API] ❌ Error deleting tier:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
};

console.log('[VIP Admin API] ✅ Admin API client loaded');
