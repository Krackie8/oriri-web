/**
 * VIP Migration Validator
 * 
 * Validates data integrity between localStorage and backend
 * Ensures safe migration and provides detailed reports
 */

import { vipApi } from './vipApi';

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  summary: ValidationSummary;
  timestamp: string;
}

export interface ValidationIssue {
  severity: 'critical' | 'warning' | 'info';
  category: 'data_mismatch' | 'missing_data' | 'expired' | 'ownership' | 'sync';
  message: string;
  details?: any;
}

export interface ValidationSummary {
  localStorageStatus: 'present' | 'absent' | 'invalid';
  backendStatus: 'present' | 'absent' | 'error';
  dataConsistency: 'consistent' | 'inconsistent' | 'unknown';
  migrationStatus: 'complete' | 'pending' | 'not_needed' | 'failed';
  recommendedAction: string;
}

/**
 * Comprehensive validation of VIP subscription data
 */
export async function validateVipData(
  userId: string,
  userEmail: string,
  token: string
): Promise<ValidationResult> {
  const issues: ValidationIssue[] = [];
  let localStorageStatus: 'present' | 'absent' | 'invalid' = 'absent';
  let backendStatus: 'present' | 'absent' | 'error' = 'absent';
  let dataConsistency: 'consistent' | 'inconsistent' | 'unknown' = 'unknown';
  let migrationStatus: 'complete' | 'pending' | 'not_needed' | 'failed' = 'not_needed';

  console.log('[Migration Validator] 🔍 Starting validation for user:', userId);

  // ============================================
  // STEP 1: CHECK LOCALSTORAGE
  // ============================================
  
  let localData: any = null;
  try {
    const localTrial = localStorage.getItem('oriri-free-trial');
    
    if (!localTrial) {
      localStorageStatus = 'absent';
      console.log('[Migration Validator] ℹ️ No localStorage data found');
    } else {
      try {
        localData = JSON.parse(localTrial);
        localStorageStatus = 'present';
        console.log('[Migration Validator] ✅ localStorage data found');
        
        // Validate localStorage data structure
        if (!localData.subscription) {
          issues.push({
            severity: 'critical',
            category: 'missing_data',
            message: 'localStorage data missing subscription object',
            details: localData
          });
          localStorageStatus = 'invalid';
        }
        
        // Check ownership
        const ownsData = validateLocalStorageOwnership(localData, userId, userEmail);
        if (!ownsData) {
          issues.push({
            severity: 'critical',
            category: 'ownership',
            message: 'localStorage data belongs to different user',
            details: {
              storedUserId: localData.userId,
              storedEmail: localData.userEmail,
              currentUserId: userId,
              currentEmail: userEmail
            }
          });
        }
        
        // Check expiration
        if (localData.subscription?.trialEndDate) {
          const endDate = new Date(localData.subscription.trialEndDate);
          const now = new Date();
          if (endDate <= now) {
            issues.push({
              severity: 'warning',
              category: 'expired',
              message: 'localStorage trial has expired',
              details: {
                trialEndDate: endDate.toISOString(),
                daysExpired: Math.floor((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24))
              }
            });
          }
        }
        
        // Check migration status
        if (localData.migratedToBackend) {
          migrationStatus = 'complete';
          issues.push({
            severity: 'info',
            category: 'sync',
            message: 'Trial already migrated to backend',
            details: {
              migratedAt: localData.migratedAt,
              lastSyncedAt: localData.lastSyncedAt
            }
          });
        } else {
          migrationStatus = 'pending';
          issues.push({
            severity: 'info',
            category: 'sync',
            message: 'Trial pending migration to backend',
            details: localData
          });
        }
      } catch (error) {
        localStorageStatus = 'invalid';
        issues.push({
          severity: 'critical',
          category: 'data_mismatch',
          message: 'Failed to parse localStorage data',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  } catch (error) {
    issues.push({
      severity: 'warning',
      category: 'missing_data',
      message: 'Error accessing localStorage',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // ============================================
  // STEP 2: CHECK BACKEND
  // ============================================
  
  let backendData: any = null;
  try {
    console.log('[Migration Validator] 🌐 Checking backend subscription');
    const backendResponse = await vipApi.getSubscription(userId, token);
    
    if (backendResponse.success && backendResponse.subscription) {
      backendStatus = 'present';
      backendData = backendResponse.subscription;
      console.log('[Migration Validator] ✅ Backend subscription found');
      
      issues.push({
        severity: 'info',
        category: 'sync',
        message: 'Backend subscription exists',
        details: {
          status: backendData.status,
          tierId: backendData.tierId,
          trialEndDate: backendData.trialEndDate
        }
      });
    } else {
      backendStatus = 'absent';
      console.log('[Migration Validator] ℹ️ No backend subscription found');
    }
  } catch (error) {
    backendStatus = 'error';
    issues.push({
      severity: 'warning',
      category: 'sync',
      message: 'Error checking backend subscription',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // ============================================
  // STEP 3: COMPARE DATA CONSISTENCY
  // ============================================
  
  if (localStorageStatus === 'present' && backendStatus === 'present') {
    console.log('[Migration Validator] 🔄 Comparing localStorage and backend data');
    
    const consistencyIssues = compareDataConsistency(localData, backendData);
    issues.push(...consistencyIssues);
    
    dataConsistency = consistencyIssues.some(i => i.severity === 'critical') 
      ? 'inconsistent' 
      : 'consistent';
  } else if (localStorageStatus === 'present' && backendStatus === 'absent') {
    dataConsistency = 'inconsistent';
    issues.push({
      severity: 'warning',
      category: 'sync',
      message: 'localStorage has data but backend does not',
      details: 'Migration needed'
    });
  } else if (localStorageStatus === 'absent' && backendStatus === 'present') {
    dataConsistency = 'consistent';
    issues.push({
      severity: 'info',
      category: 'sync',
      message: 'Backend is source of truth, localStorage empty',
      details: 'This is normal after migration'
    });
  }

  // ============================================
  // STEP 4: DETERMINE RECOMMENDED ACTION
  // ============================================
  
  let recommendedAction = 'No action needed';
  
  if (localStorageStatus === 'invalid') {
    recommendedAction = 'Clear invalid localStorage data';
  } else if (migrationStatus === 'pending' && backendStatus === 'absent') {
    recommendedAction = 'Migrate localStorage trial to backend';
  } else if (dataConsistency === 'inconsistent' && localStorageStatus === 'present' && backendStatus === 'present') {
    recommendedAction = 'Resolve data inconsistency - backend should be source of truth';
  } else if (localStorageStatus === 'present' && backendStatus === 'error') {
    recommendedAction = 'Retry backend sync when available';
  } else if (localStorageStatus === 'absent' && backendStatus === 'absent') {
    recommendedAction = 'User can start free trial';
  }

  // ============================================
  // STEP 5: BUILD VALIDATION RESULT
  // ============================================
  
  const summary: ValidationSummary = {
    localStorageStatus,
    backendStatus,
    dataConsistency,
    migrationStatus,
    recommendedAction
  };

  const isValid = !issues.some(i => i.severity === 'critical');

  const result: ValidationResult = {
    isValid,
    issues,
    summary,
    timestamp: new Date().toISOString()
  };

  console.log('[Migration Validator] 📊 Validation complete:', summary);
  console.log('[Migration Validator] Issues found:', issues.length);
  console.log('[Migration Validator] Critical issues:', issues.filter(i => i.severity === 'critical').length);

  return result;
}

/**
 * Validate localStorage ownership
 */
function validateLocalStorageOwnership(
  localData: any,
  userId: string,
  userEmail: string
): boolean {
  const directIdMatch = localData.subscription?.userId === userId;
  const rootIdMatch = localData.userId === userId;
  const emailMatch = localData.userEmail === userEmail;
  const subscriptionEmailMatch = localData.subscription?.userEmail === userEmail;
  const backupIdMatch = localData.userIdentifiers?.id === userId;
  const backupEmailMatch = localData.userIdentifiers?.email === userEmail;
  
  return directIdMatch || rootIdMatch || emailMatch || subscriptionEmailMatch || 
         backupIdMatch || backupEmailMatch;
}

/**
 * Compare localStorage and backend data for consistency
 */
function compareDataConsistency(localData: any, backendData: any): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Compare subscription ID
  if (localData.subscription?.id !== backendData.id) {
    issues.push({
      severity: 'warning',
      category: 'data_mismatch',
      message: 'Subscription ID mismatch',
      details: {
        localStorage: localData.subscription?.id,
        backend: backendData.id
      }
    });
  }

  // Compare tier ID
  if (localData.subscription?.tierId !== backendData.tierId) {
    issues.push({
      severity: 'critical',
      category: 'data_mismatch',
      message: 'Tier ID mismatch',
      details: {
        localStorage: localData.subscription?.tierId,
        backend: backendData.tierId
      }
    });
  }

  // Compare status
  if (localData.subscription?.status !== backendData.status) {
    issues.push({
      severity: 'warning',
      category: 'data_mismatch',
      message: 'Subscription status mismatch',
      details: {
        localStorage: localData.subscription?.status,
        backend: backendData.status
      }
    });
  }

  // Compare trial end dates (allow 1 second tolerance)
  if (localData.subscription?.trialEndDate && backendData.trialEndDate) {
    const localDate = new Date(localData.subscription.trialEndDate).getTime();
    const backendDate = new Date(backendData.trialEndDate).getTime();
    const diffSeconds = Math.abs(localDate - backendDate) / 1000;
    
    if (diffSeconds > 1) {
      issues.push({
        severity: 'warning',
        category: 'data_mismatch',
        message: 'Trial end date mismatch',
        details: {
          localStorage: localData.subscription.trialEndDate,
          backend: backendData.trialEndDate,
          differenceSeconds: diffSeconds
        }
      });
    }
  }

  return issues;
}

/**
 * Get human-readable validation report
 */
export function getValidationReport(result: ValidationResult): string {
  const lines: string[] = [];
  
  lines.push('=== VIP SUBSCRIPTION VALIDATION REPORT ===');
  lines.push('');
  lines.push(`Timestamp: ${new Date(result.timestamp).toLocaleString()}`);
  lines.push(`Overall Status: ${result.isValid ? '✅ VALID' : '❌ INVALID'}`);
  lines.push('');
  
  lines.push('=== SUMMARY ===');
  lines.push(`localStorage: ${result.summary.localStorageStatus}`);
  lines.push(`Backend: ${result.summary.backendStatus}`);
  lines.push(`Data Consistency: ${result.summary.dataConsistency}`);
  lines.push(`Migration Status: ${result.summary.migrationStatus}`);
  lines.push(`Recommended Action: ${result.summary.recommendedAction}`);
  lines.push('');
  
  if (result.issues.length > 0) {
    lines.push('=== ISSUES ===');
    
    const critical = result.issues.filter(i => i.severity === 'critical');
    const warnings = result.issues.filter(i => i.severity === 'warning');
    const info = result.issues.filter(i => i.severity === 'info');
    
    if (critical.length > 0) {
      lines.push('');
      lines.push('🔴 CRITICAL:');
      critical.forEach(issue => {
        lines.push(`  - ${issue.message}`);
        if (issue.details) {
          lines.push(`    Details: ${JSON.stringify(issue.details, null, 2)}`);
        }
      });
    }
    
    if (warnings.length > 0) {
      lines.push('');
      lines.push('⚠️ WARNINGS:');
      warnings.forEach(issue => {
        lines.push(`  - ${issue.message}`);
        if (issue.details) {
          lines.push(`    Details: ${JSON.stringify(issue.details, null, 2)}`);
        }
      });
    }
    
    if (info.length > 0) {
      lines.push('');
      lines.push('ℹ️ INFO:');
      info.forEach(issue => {
        lines.push(`  - ${issue.message}`);
      });
    }
  } else {
    lines.push('=== NO ISSUES FOUND ===');
  }
  
  lines.push('');
  lines.push('=== END REPORT ===');
  
  return lines.join('\n');
}

/**
 * Quick validation check (returns true if migration needed)
 */
export async function needsMigration(
  userId: string,
  userEmail: string,
  token: string
): Promise<boolean> {
  try {
    const result = await validateVipData(userId, userEmail, token);
    return result.summary.migrationStatus === 'pending';
  } catch (error) {
    console.error('[Migration Validator] Error checking migration need:', error);
    return false;
  }
}

console.log('[Migration Validator] ✅ Migration validator loaded');
