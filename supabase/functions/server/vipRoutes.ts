/**
 * VIP Subscription API Routes
 * Phase 1B: Backend API Endpoints
 * 
 * All VIP subscription management endpoints
 */

import type { Hono } from 'npm:hono';
import type { Context } from 'npm:hono';
import * as vipHelpers from './vipHelpers.ts';

// Helper: Check if user is admin
const isAdmin = (user: any): boolean => {
  return user.user_metadata?.role === 'admin' || 
         user.email === 'admin@oriri.com' ||
         user.user_metadata?.isAdmin === true;
};

/**
 * Register all VIP routes on the Hono app
 */
export function registerVipRoutes(app: any, supabase: any) {
  console.log('🔧 Registering VIP Subscription API endpoints...');

  // ============================================
  // 1️⃣ VIP SUBSCRIPTION ENDPOINTS (User-facing)
  // ============================================

  /**
   * POST /vip/subscriptions
   * Create a new subscription
   */
  app.post('/make-server-a278ea32/vip/subscriptions', async (c: Context) => {
    try {
      console.log('[VIP API] 📝 Create subscription request received');
      
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
      
      if (!user || userError) {
        console.log('[VIP API] ❌ Unauthorized');
        return c.json({ success: false, error: 'Unauthorized. Please log in.' }, 401);
      }

      const body = await c.req.json();
      const { tierId, source } = body;

      const tier = await vipHelpers.getTier(tierId || 'vip');
      if (!tier) {
        return c.json({ success: false, error: 'Invalid tier ID' }, 400);
      }

      const existingSubscription = await vipHelpers.getSubscription(user.id);
      if (existingSubscription && (existingSubscription.status === 'active' || existingSubscription.status === 'trialing')) {
        return c.json({ 
          success: false, 
          error: 'You already have an active subscription',
          subscription: existingSubscription
        }, 409);
      }

      const subscription = await vipHelpers.createSubscription({
        userId: user.id,
        userEmail: user.email || '',
        userName: user.user_metadata?.name,
        tierId: tierId || 'vip',
        status: source === 'trial' ? 'trialing' : 'active',
        metadata: { source: source || 'payment' }
      });

      console.log('[VIP API] ✅ Subscription created:', subscription.id);

      return c.json({
        success: true,
        subscription,
        message: 'Subscription created successfully'
      });
    } catch (error: any) {
      console.error('[VIP API] ❌ Error creating subscription:', error);
      return c.json({ 
        success: false, 
        error: 'Failed to create subscription',
        details: error.message 
      }, 500);
    }
  });

  /**
   * GET /vip/subscriptions/:userId
   * Get user's subscription
   */
  app.get('/make-server-a278ea32/vip/subscriptions/:userId', async (c: Context) => {
    try {
      const requestedUserId = c.req.param('userId');
      
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
      
      if (!user || userError) {
        return c.json({ success: false, error: 'Unauthorized. Please log in.' }, 401);
      }

      const canView = user.id === requestedUserId || isAdmin(user);
      if (!canView) {
        return c.json({ success: false, error: 'You can only view your own subscription' }, 403);
      }

      const subscription = await vipHelpers.getSubscription(requestedUserId);
      
      if (!subscription) {
        return c.json({
          success: true,
          subscription: null,
          hasAccess: false,
          message: 'No subscription found'
        });
      }

      const isActive = await vipHelpers.isSubscriptionActive(requestedUserId);
      
      let trialDaysLeft = null;
      if (subscription.status === 'trialing') {
        trialDaysLeft = await vipHelpers.getRemainingTrialDays(requestedUserId);
      }

      return c.json({
        success: true,
        subscription,
        hasAccess: isActive,
        trialDaysLeft
      });
    } catch (error: any) {
      console.error('[VIP API] ❌ Error getting subscription:', error);
      return c.json({ success: false, error: 'Failed to get subscription', details: error.message }, 500);
    }
  });

  /**
   * PATCH /vip/subscriptions/:userId
   * Update subscription
   */
  app.patch('/make-server-a278ea32/vip/subscriptions/:userId', async (c: Context) => {
    try {
      const userId = c.req.param('userId');
      
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
      
      if (!user || userError) {
        return c.json({ success: false, error: 'Unauthorized. Please log in.' }, 401);
      }

      const canUpdate = user.id === userId || isAdmin(user);
      if (!canUpdate) {
        return c.json({ success: false, error: 'You can only update your own subscription' }, 403);
      }

      const body = await c.req.json();
      const { action, newTierId, immediate } = body;

      const subscription = await vipHelpers.getSubscription(userId);
      if (!subscription) {
        return c.json({ success: false, error: 'Subscription not found' }, 404);
      }

      let updatedSubscription;
      const changes: string[] = [];

      switch (action) {
        case 'upgrade':
        case 'downgrade':
          if (!newTierId) {
            return c.json({ success: false, error: 'newTierId is required for upgrade/downgrade' }, 400);
          }
          updatedSubscription = await vipHelpers.updateSubscription(userId, { tierId: newTierId });
          changes.push(`Tier changed to ${newTierId}`);
          break;

        case 'cancel':
          updatedSubscription = await vipHelpers.cancelSubscription(userId, immediate || false);
          changes.push(immediate ? 'Subscription canceled immediately' : 'Subscription set to cancel at period end');
          break;

        case 'reactivate':
          if (subscription.cancelAtPeriodEnd) {
            updatedSubscription = await vipHelpers.updateSubscription(userId, {
              cancelAtPeriodEnd: false,
              canceledAt: undefined
            });
            changes.push('Subscription reactivated');
          } else {
            return c.json({ success: false, error: 'Subscription is not set to cancel' }, 400);
          }
          break;

        default:
          return c.json({ success: false, error: 'Invalid action. Must be: upgrade, downgrade, cancel, or reactivate' }, 400);
      }

      return c.json({
        success: true,
        subscription: updatedSubscription,
        changes,
        message: 'Subscription updated successfully'
      });
    } catch (error: any) {
      console.error('[VIP API] ❌ Error updating subscription:', error);
      return c.json({ success: false, error: 'Failed to update subscription', details: error.message }, 500);
    }
  });

  /**
   * DELETE /vip/subscriptions/:userId
   * Cancel subscription
   */
  app.delete('/make-server-a278ea32/vip/subscriptions/:userId', async (c: Context) => {
    try {
      const userId = c.req.param('userId');
      const immediate = c.req.query('immediate') === 'true';
      
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
      
      if (!user || userError) {
        return c.json({ success: false, error: 'Unauthorized. Please log in.' }, 401);
      }

      const canCancel = user.id === userId || isAdmin(user);
      if (!canCancel) {
        return c.json({ success: false, error: 'You can only cancel your own subscription' }, 403);
      }

      const subscription = await vipHelpers.getSubscription(userId);
      if (!subscription) {
        return c.json({ success: false, error: 'Subscription not found' }, 404);
      }

      const canceledSubscription = await vipHelpers.cancelSubscription(userId, immediate);

      const accessEndsAt = immediate 
        ? new Date().toISOString() 
        : (subscription.trialEndDate || subscription.endDate || new Date().toISOString());

      return c.json({
        success: true,
        subscription: canceledSubscription,
        accessEndsAt,
        message: immediate 
          ? 'Subscription canceled immediately' 
          : 'Subscription will end at the end of the current period'
      });
    } catch (error: any) {
      console.error('[VIP API] ❌ Error canceling subscription:', error);
      return c.json({ success: false, error: 'Failed to cancel subscription', details: error.message }, 500);
    }
  });

  // ============================================
  // 2️⃣ VIP TRIAL ENDPOINTS
  // ============================================

  /**
   * POST /vip/trial/start
   * Start free trial
   */
  app.post('/make-server-a278ea32/vip/trial/start', async (c: Context) => {
    try {
      console.log('[VIP API] 🎁 Start trial request received');
      
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
      
      if (!user || userError) {
        return c.json({ success: false, error: 'Unauthorized. Please log in to start trial.' }, 401);
      }

      const body = await c.req.json();
      const { tierId } = body;

      const alreadyUsed = await vipHelpers.hasUsedTrial(user.id);
      if (alreadyUsed) {
        return c.json({ 
          success: false, 
          error: 'You have already used your free trial',
          code: 'TRIAL_ALREADY_USED'
        }, 409);
      }

      const existingSubscription = await vipHelpers.getSubscription(user.id);
      if (existingSubscription && (existingSubscription.status === 'active' || existingSubscription.status === 'trialing')) {
        return c.json({ 
          success: false, 
          error: 'You already have an active subscription',
          subscription: existingSubscription
        }, 409);
      }

      const subscription = await vipHelpers.startTrial(
        user.id,
        user.email || '',
        user.user_metadata?.name,
        tierId || 'vip'
      );

      const trialDaysLeft = await vipHelpers.getRemainingTrialDays(user.id);

      console.log('[VIP API] ✅ Trial started:', subscription.id);

      return c.json({
        success: true,
        subscription,
        trialDaysLeft: trialDaysLeft || 7,
        message: `Your 7-day free trial has started! Enjoy VIP access.`
      });
    } catch (error: any) {
      console.error('[VIP API] ❌ Error starting trial:', error);
      return c.json({ success: false, error: 'Failed to start trial', details: error.message }, 500);
    }
  });

  /**
   * GET /vip/trial/status/:userId
   * Get trial status
   */
  app.get('/make-server-a278ea32/vip/trial/status/:userId', async (c: Context) => {
    try {
      const userId = c.req.param('userId');
      
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
      
      if (!user || userError) {
        return c.json({ success: false, error: 'Unauthorized. Please log in.' }, 401);
      }

      if (user.id !== userId) {
        return c.json({ success: false, error: 'You can only view your own trial status' }, 403);
      }

      const hasUsedTrial = await vipHelpers.hasUsedTrial(userId);
      const subscription = await vipHelpers.getSubscription(userId);
      const trialActive = subscription?.status === 'trialing';
      
      let trialDaysLeft = null;
      if (trialActive) {
        trialDaysLeft = await vipHelpers.getRemainingTrialDays(userId);
      }

      const canStartTrial = !hasUsedTrial && (!subscription || subscription.status === 'expired' || subscription.status === 'canceled');

      return c.json({
        success: true,
        hasUsedTrial,
        trialActive,
        trialDaysLeft,
        canStartTrial
      });
    } catch (error: any) {
      console.error('[VIP API] ❌ Error getting trial status:', error);
      return c.json({ success: false, error: 'Failed to get trial status', details: error.message }, 500);
    }
  });

  // ============================================
  // 3️⃣ ADMIN VIP MANAGEMENT ENDPOINTS
  // ============================================

  /**
   * GET /admin/vip/subscribers
   * List all subscribers
   */
  app.get('/make-server-a278ea32/admin/vip/subscribers', async (c: Context) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
      
      if (!user || userError) {
        return c.json({ success: false, error: 'Unauthorized. Please log in.' }, 401);
      }

      if (!isAdmin(user)) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      const status = c.req.query('status') || 'all';
      const tierId = c.req.query('tierId');
      const search = c.req.query('search');
      const page = parseInt(c.req.query('page') || '1');
      const limit = parseInt(c.req.query('limit') || '50');

      const allSubscribers = await vipHelpers.getAllSubscribers({ 
        status: status as any, 
        tierId, 
        search 
      });

      const total = allSubscribers.length;
      const pages = Math.ceil(total / limit);
      const start = (page - 1) * limit;
      const end = start + limit;
      const paginatedSubscribers = allSubscribers.slice(start, end);

      return c.json({
        success: true,
        subscribers: paginatedSubscribers,
        total,
        page,
        pages,
        limit,
        filters: { status, tierId, search }
      });
    } catch (error: any) {
      console.error('[VIP API Admin] ❌ Error getting subscribers:', error);
      return c.json({ success: false, error: 'Failed to get subscribers', details: error.message }, 500);
    }
  });

  /**
   * GET /admin/vip/analytics
   * Get VIP analytics
   */
  app.get('/make-server-a278ea32/admin/vip/analytics', async (c: Context) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
      
      if (!user || userError) {
        return c.json({ success: false, error: 'Unauthorized. Please log in.' }, 401);
      }

      if (!isAdmin(user)) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      const startDate = c.req.query('startDate');
      const endDate = c.req.query('endDate');

      const analytics = await vipHelpers.getVipAnalytics(startDate, endDate);

      return c.json({
        success: true,
        ...analytics
      });
    } catch (error: any) {
      console.error('[VIP API Admin] ❌ Error getting analytics:', error);
      return c.json({ success: false, error: 'Failed to get analytics', details: error.message }, 500);
    }
  });

  /**
   * POST /admin/vip/subscribers/:userId/grant
   * Grant VIP access
   */
  app.post('/make-server-a278ea32/admin/vip/subscribers/:userId/grant', async (c: Context) => {
    try {
      const targetUserId = c.req.param('userId');
      
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
      
      if (!user || userError) {
        return c.json({ success: false, error: 'Unauthorized. Please log in.' }, 401);
      }

      if (!isAdmin(user)) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      const body = await c.req.json();
      const { tierId, duration, reason, userEmail, userName } = body;

      const tier = await vipHelpers.getTier(tierId || 'vip');
      if (!tier) {
        return c.json({ success: false, error: 'Invalid tier ID' }, 400);
      }

      const subscription = await vipHelpers.grantVipAccess(
        targetUserId,
        userEmail || 'granted-user@oriri.com',
        userName,
        tierId || 'vip',
        user.id,
        duration,
        reason
      );

      return c.json({
        success: true,
        subscription,
        message: `VIP access granted successfully${duration ? ` for ${duration} days` : ''}`
      });
    } catch (error: any) {
      console.error('[VIP API Admin] ❌ Error granting VIP access:', error);
      return c.json({ success: false, error: 'Failed to grant VIP access', details: error.message }, 500);
    }
  });

  /**
   * POST /admin/vip/subscribers/:userId/revoke
   * Revoke VIP access
   */
  app.post('/make-server-a278ea32/admin/vip/subscribers/:userId/revoke', async (c: Context) => {
    try {
      const targetUserId = c.req.param('userId');
      
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
      
      if (!user || userError) {
        return c.json({ success: false, error: 'Unauthorized. Please log in.' }, 401);
      }

      if (!isAdmin(user)) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      const body = await c.req.json();
      const { reason } = body;

      await vipHelpers.revokeVipAccess(targetUserId, user.id, reason);

      return c.json({
        success: true,
        message: 'VIP access revoked successfully'
      });
    } catch (error: any) {
      console.error('[VIP API Admin] ❌ Error revoking VIP access:', error);
      return c.json({ success: false, error: 'Failed to revoke VIP access', details: error.message }, 500);
    }
  });

  // ============================================
  // 4️⃣ TIER MANAGEMENT ENDPOINTS
  // ============================================

  /**
   * GET /vip/tiers
   * Get all tiers (public)
   */
  app.get('/make-server-a278ea32/vip/tiers', async (c: Context) => {
    try {
      let userIsAdmin = false;
      try {
        const accessToken = c.req.header('Authorization')?.split(' ')[1];
        if (accessToken) {
          const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
          if (user && !userError) {
            userIsAdmin = isAdmin(user);
          }
        }
      } catch (error) {
        // Ignore auth errors for public endpoint
      }

      const tiers = userIsAdmin 
        ? await vipHelpers.getAllTiers()
        : await vipHelpers.getEnabledTiers();

      return c.json({
        success: true,
        tiers
      });
    } catch (error: any) {
      console.error('[VIP API] ❌ Error getting tiers:', error);
      return c.json({ success: false, error: 'Failed to get tiers', details: error.message }, 500);
    }
  });

  /**
   * POST /admin/vip/tiers
   * Create new tier
   */
  app.post('/make-server-a278ea32/admin/vip/tiers', async (c: Context) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
      
      if (!user || userError) {
        return c.json({ success: false, error: 'Unauthorized. Please log in.' }, 401);
      }

      if (!isAdmin(user)) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      const tierData = await c.req.json();

      if (!tierData.id || !tierData.displayName || !tierData.price) {
        return c.json({ success: false, error: 'Missing required fields: id, displayName, price' }, 400);
      }

      const existingTier = await vipHelpers.getTier(tierData.id);
      if (existingTier) {
        return c.json({ success: false, error: 'Tier ID already exists' }, 409);
      }

      const tier = await vipHelpers.createTier({
        ...tierData,
        createdBy: user.id
      });

      return c.json({
        success: true,
        tier,
        message: 'Tier created successfully'
      });
    } catch (error: any) {
      console.error('[VIP API Admin] ❌ Error creating tier:', error);
      return c.json({ success: false, error: 'Failed to create tier', details: error.message }, 500);
    }
  });

  /**
   * PATCH /admin/vip/tiers/:tierId
   * Update tier
   */
  app.patch('/make-server-a278ea32/admin/vip/tiers/:tierId', async (c: Context) => {
    try {
      const tierId = c.req.param('tierId');
      
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
      
      if (!user || userError) {
        return c.json({ success: false, error: 'Unauthorized. Please log in.' }, 401);
      }

      if (!isAdmin(user)) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      const existingTier = await vipHelpers.getTier(tierId);
      if (!existingTier) {
        return c.json({ success: false, error: 'Tier not found' }, 404);
      }

      const updates = await c.req.json();
      const tier = await vipHelpers.updateTier(tierId, updates);

      return c.json({
        success: true,
        tier,
        message: 'Tier updated successfully'
      });
    } catch (error: any) {
      console.error('[VIP API Admin] ❌ Error updating tier:', error);
      return c.json({ success: false, error: 'Failed to update tier', details: error.message }, 500);
    }
  });

  /**
   * DELETE /admin/vip/tiers/:tierId
   * Delete tier
   */
  app.delete('/make-server-a278ea32/admin/vip/tiers/:tierId', async (c: Context) => {
    try {
      const tierId = c.req.param('tierId');
      
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
      
      if (!user || userError) {
        return c.json({ success: false, error: 'Unauthorized. Please log in.' }, 401);
      }

      if (!isAdmin(user)) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      const existingTier = await vipHelpers.getTier(tierId);
      if (!existingTier) {
        return c.json({ success: false, error: 'Tier not found' }, 404);
      }

      await vipHelpers.deleteTier(tierId);

      return c.json({
        success: true,
        message: 'Tier deleted successfully'
      });
    } catch (error: any) {
      console.error('[VIP API Admin] ❌ Error deleting tier:', error);
      
      if (error.message.includes('active subscribers')) {
        return c.json({ success: false, error: error.message }, 409);
      }
      
      return c.json({ success: false, error: 'Failed to delete tier', details: error.message }, 500);
    }
  });

  // ============================================
  // LOG COMPLETION
  // ============================================

  console.log('✅ Phase 1B: VIP Subscription API endpoints registered successfully');
  console.log('🔐 Available VIP endpoints:');
  console.log('');
  console.log('📌 Subscription Management (User):');
  console.log('  - POST   /make-server-a278ea32/vip/subscriptions');
  console.log('  - GET    /make-server-a278ea32/vip/subscriptions/:userId');
  console.log('  - PATCH  /make-server-a278ea32/vip/subscriptions/:userId');
  console.log('  - DELETE /make-server-a278ea32/vip/subscriptions/:userId');
  console.log('');
  console.log('🎁 Trial Management (User):');
  console.log('  - POST   /make-server-a278ea32/vip/trial/start');
  console.log('  - GET    /make-server-a278ea32/vip/trial/status/:userId');
  console.log('');
  console.log('👑 Admin Management:');
  console.log('  - GET    /make-server-a278ea32/admin/vip/subscribers');
  console.log('  - GET    /make-server-a278ea32/admin/vip/analytics');
  console.log('  - POST   /make-server-a278ea32/admin/vip/subscribers/:userId/grant');
  console.log('  - POST   /make-server-a278ea32/admin/vip/subscribers/:userId/revoke');
  console.log('');
  console.log('🎯 Tier Management:');
  console.log('  - GET    /make-server-a278ea32/vip/tiers');
  console.log('  - POST   /make-server-a278ea32/admin/vip/tiers');
  console.log('  - PATCH  /make-server-a278ea32/admin/vip/tiers/:tierId');
  console.log('  - DELETE /make-server-a278ea32/admin/vip/tiers/:tierId');
  console.log('');
}
