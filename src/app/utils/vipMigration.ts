/**
 * VIP Migration Helper
 * 
 * Safely migrates localStorage-based VIP trials to backend database
 */

import { vipApi, type VipSubscriptionBackend } from './vipApi';

export interface LocalStorageTrialData {
  subscription: {
    id: string;
    userId: string;
    userEmail?: string;
    tierId: string;
    status: string;
    startDate: string;
    trialEndDate?: string;
    cancelAtPeriodEnd: boolean;
  };
  daysLeft: number;
  startDate: string;
  userId?: string;
  userEmail?: string;
  userIdentifiers?: {
    id: string;
    email: string;
    emailNormalized: string;
  };
  createdAt?: string;
  migratedToBackend?: boolean;
  migratedAt?: string;
}

export interface MigrationResult {
  migrated: boolean;
  reason: string;
  subscription?: VipSubscriptionBackend;
  error?: string;
}

/**
 * Migrate localStorage trial to backend
 */
export async function migrateLocalStorageToBackend(
  userId: string,
  userEmail: string,
  token: string
): Promise<MigrationResult> {
  try {
    console.log('[VIP Migration] 🔄 Starting migration for user:', userId);

    // Step 1: Check if localStorage has trial data
    const localTrial = localStorage.getItem('oriri-free-trial');
    if (!localTrial) {
      console.log('[VIP Migration] ℹ️ No local trial found');
      return {
        migrated: false,
        reason: 'No local trial found'
      };
    }

    let trialData: LocalStorageTrialData;
    try {
      trialData = JSON.parse(localTrial);
    } catch (error) {
      console.error('[VIP Migration] ❌ Failed to parse trial data:', error);
      localStorage.removeItem('oriri-free-trial');
      return {
        migrated: false,
        reason: 'Invalid trial data format'
      };
    }

    // Step 2: Check if already migrated
    if (trialData.migratedToBackend) {
      console.log('[VIP Migration] ℹ️ Trial already migrated');
      return {
        migrated: false,
        reason: 'Already migrated'
      };
    }

    // Step 3: Validate trial belongs to current user
    const belongsToUser = validateTrialOwnership(trialData, userId, userEmail);
    if (!belongsToUser) {
      console.log('[VIP Migration] ⚠️ Trial belongs to different user');
      return {
        migrated: false,
        reason: 'Trial belongs to different user'
      };
    }

    // Step 4: Check if trial still valid (not expired)
    const isValid = isTrialStillValid(trialData);
    if (!isValid) {
      console.log('[VIP Migration] ⏰ Trial expired, removing from storage');
      localStorage.removeItem('oriri-free-trial');
      return {
        migrated: false,
        reason: 'Trial expired'
      };
    }

    // Step 5: Check if backend already has a subscription
    console.log('[VIP Migration] 🔍 Checking backend for existing subscription');
    const backendCheck = await vipApi.getSubscription(userId, token);
    
    if (backendCheck.success && backendCheck.subscription) {
      console.log('[VIP Migration] ℹ️ Backend already has subscription');
      
      // Mark localStorage as migrated and keep as backup
      trialData.migratedToBackend = true;
      trialData.migratedAt = new Date().toISOString();
      localStorage.setItem('oriri-free-trial', JSON.stringify(trialData));
      
      return {
        migrated: false,
        reason: 'Backend subscription already exists',
        subscription: backendCheck.subscription
      };
    }

    // Step 6: Migrate to backend by starting a trial
    console.log('[VIP Migration] 📤 Migrating trial to backend');
    const migrationResult = await vipApi.startTrial(trialData.subscription.tierId || 'vip', token);

    if (!migrationResult.success) {
      // If trial already used, that's expected - just mark as migrated
      if (migrationResult.code === 'TRIAL_ALREADY_USED') {
        console.log('[VIP Migration] ℹ️ Trial already used in backend');
        trialData.migratedToBackend = true;
        trialData.migratedAt = new Date().toISOString();
        localStorage.setItem('oriri-free-trial', JSON.stringify(trialData));
        
        return {
          migrated: false,
          reason: 'Trial already used in backend'
        };
      }

      console.error('[VIP Migration] ❌ Migration failed:', migrationResult.message);
      return {
        migrated: false,
        reason: migrationResult.message || 'Migration failed',
        error: migrationResult.message
      };
    }

    // Step 7: Mark localStorage trial as migrated (keep as backup)
    trialData.migratedToBackend = true;
    trialData.migratedAt = new Date().toISOString();
    localStorage.setItem('oriri-free-trial', JSON.stringify(trialData));

    console.log('[VIP Migration] ✅ Migration successful');
    return {
      migrated: true,
      reason: 'Successfully migrated to backend',
      subscription: migrationResult.subscription
    };

  } catch (error) {
    console.error('[VIP Migration] ❌ Migration error:', error);
    return {
      migrated: false,
      reason: 'Migration error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Validate that trial belongs to current user
 */
function validateTrialOwnership(
  trialData: LocalStorageTrialData,
  userId: string,
  userEmail: string
): boolean {
  // Multiple validation checks
  const directIdMatch = trialData.subscription?.userId === userId;
  const rootIdMatch = trialData.userId === userId;
  const emailMatch = trialData.userEmail === userEmail;
  const subscriptionEmailMatch = trialData.subscription?.userEmail === userEmail;
  const backupIdMatch = trialData.userIdentifiers?.id === userId;
  const backupEmailMatch = trialData.userIdentifiers?.email === userEmail;
  const normalizedEmailMatch = trialData.userIdentifiers?.emailNormalized === userEmail?.toLowerCase();
  
  // Flexible email match (case-insensitive)
  const flexibleEmailMatch = userEmail && (
    trialData.userEmail?.toLowerCase() === userEmail.toLowerCase() ||
    trialData.subscription?.userEmail?.toLowerCase() === userEmail.toLowerCase()
  );

  const isMatch = directIdMatch || rootIdMatch || emailMatch || subscriptionEmailMatch || 
                  backupIdMatch || backupEmailMatch || normalizedEmailMatch || flexibleEmailMatch;

  console.log('[VIP Migration] Validation checks:', {
    directIdMatch,
    rootIdMatch,
    emailMatch,
    subscriptionEmailMatch,
    backupIdMatch,
    backupEmailMatch,
    normalizedEmailMatch,
    flexibleEmailMatch,
    finalResult: isMatch
  });

  return isMatch;
}

/**
 * Check if trial is still valid (not expired)
 */
function isTrialStillValid(trialData: LocalStorageTrialData): boolean {
  if (!trialData.subscription?.trialEndDate) {
    console.log('[VIP Migration] ⚠️ No trial end date found');
    return false;
  }

  const endDate = new Date(trialData.subscription.trialEndDate);
  const now = new Date();
  const isValid = endDate > now;

  console.log('[VIP Migration] Trial validity check:', {
    trialEndDate: endDate.toISOString(),
    now: now.toISOString(),
    isValid,
    daysRemaining: isValid ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0
  });

  return isValid;
}

/**
 * Check if migration should be attempted
 * (Returns false if backend sync should be skipped)
 */
export function shouldAttemptMigration(): boolean {
  // Check for migration flag to prevent infinite loops
  const migrationAttempted = sessionStorage.getItem('vip-migration-attempted');
  if (migrationAttempted) {
    console.log('[VIP Migration] ℹ️ Migration already attempted this session');
    return false;
  }

  return true;
}

/**
 * Mark migration as attempted for this session
 */
export function markMigrationAttempted(): void {
  sessionStorage.setItem('vip-migration-attempted', 'true');
  console.log('[VIP Migration] 📝 Marked migration as attempted');
}

/**
 * Clear migration attempt flag (for testing or re-attempts)
 */
export function clearMigrationAttempt(): void {
  sessionStorage.removeItem('vip-migration-attempted');
  console.log('[VIP Migration] 🗑️ Cleared migration attempt flag');
}

console.log('[VIP Migration] ✅ VIP Migration helpers loaded');
