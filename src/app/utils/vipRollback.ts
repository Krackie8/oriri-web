/**
 * VIP Rollback Utilities
 * 
 * Emergency rollback procedures for VIP subscription system
 * Allows reverting to localStorage-only mode if backend issues occur
 */

import { toast } from 'sonner@2.0.3';

export interface RollbackResult {
  success: boolean;
  action: string;
  message: string;
  timestamp: string;
  backupCreated?: boolean;
  backupKey?: string;
}

export interface BackendSyncControl {
  enabled: boolean;
  lastDisabled?: string;
  disabledBy?: string;
  reason?: string;
}

// Keys for localStorage
const BACKEND_SYNC_KEY = 'oriri-backend-sync-control';
const BACKUP_PREFIX = 'oriri-backup-';
const ROLLBACK_LOG_KEY = 'oriri-rollback-log';

/**
 * Disable backend sync (emergency killswitch)
 */
export function disableBackendSync(reason: string = 'Manual disable'): RollbackResult {
  console.log('[Rollback] 🔴 Disabling backend sync:', reason);
  
  try {
    const control: BackendSyncControl = {
      enabled: false,
      lastDisabled: new Date().toISOString(),
      disabledBy: 'admin',
      reason
    };
    
    localStorage.setItem(BACKEND_SYNC_KEY, JSON.stringify(control));
    
    logRollbackAction('disable_backend_sync', { reason });
    
    toast.warning('Backend sync disabled', {
      description: 'App will use localStorage-only mode'
    });
    
    return {
      success: true,
      action: 'disable_backend_sync',
      message: 'Backend sync disabled successfully',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('[Rollback] ❌ Failed to disable backend sync:', error);
    return {
      success: false,
      action: 'disable_backend_sync',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Enable backend sync
 */
export function enableBackendSync(): RollbackResult {
  console.log('[Rollback] ✅ Enabling backend sync');
  
  try {
    const control: BackendSyncControl = {
      enabled: true
    };
    
    localStorage.setItem(BACKEND_SYNC_KEY, JSON.stringify(control));
    
    logRollbackAction('enable_backend_sync', {});
    
    toast.success('Backend sync enabled', {
      description: 'App will sync with backend'
    });
    
    return {
      success: true,
      action: 'enable_backend_sync',
      message: 'Backend sync enabled successfully',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('[Rollback] ❌ Failed to enable backend sync:', error);
    return {
      success: false,
      action: 'enable_backend_sync',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Check if backend sync is enabled
 */
export function isBackendSyncEnabled(): boolean {
  try {
    const controlData = localStorage.getItem(BACKEND_SYNC_KEY);
    
    if (!controlData) {
      // Default to enabled if not set
      return true;
    }
    
    const control: BackendSyncControl = JSON.parse(controlData);
    return control.enabled;
  } catch (error) {
    console.error('[Rollback] Error checking backend sync status:', error);
    // Default to enabled on error
    return true;
  }
}

/**
 * Get backend sync status
 */
export function getBackendSyncStatus(): BackendSyncControl {
  try {
    const controlData = localStorage.getItem(BACKEND_SYNC_KEY);
    
    if (!controlData) {
      return { enabled: true };
    }
    
    return JSON.parse(controlData);
  } catch (error) {
    console.error('[Rollback] Error getting backend sync status:', error);
    return { enabled: true };
  }
}

/**
 * Create backup of localStorage trial data
 */
export function createTrialBackup(label: string = 'manual'): RollbackResult {
  console.log('[Rollback] 💾 Creating trial data backup:', label);
  
  try {
    const trialData = localStorage.getItem('oriri-free-trial');
    
    if (!trialData) {
      return {
        success: false,
        action: 'create_backup',
        message: 'No trial data to backup',
        timestamp: new Date().toISOString()
      };
    }
    
    const backupKey = `${BACKUP_PREFIX}${label}-${Date.now()}`;
    localStorage.setItem(backupKey, trialData);
    
    logRollbackAction('create_backup', { backupKey, label });
    
    console.log('[Rollback] ✅ Backup created:', backupKey);
    
    return {
      success: true,
      action: 'create_backup',
      message: 'Backup created successfully',
      timestamp: new Date().toISOString(),
      backupCreated: true,
      backupKey
    };
  } catch (error) {
    console.error('[Rollback] ❌ Failed to create backup:', error);
    return {
      success: false,
      action: 'create_backup',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Restore from backup
 */
export function restoreFromBackup(backupKey: string): RollbackResult {
  console.log('[Rollback] 📥 Restoring from backup:', backupKey);
  
  try {
    const backupData = localStorage.getItem(backupKey);
    
    if (!backupData) {
      return {
        success: false,
        action: 'restore_backup',
        message: 'Backup not found',
        timestamp: new Date().toISOString()
      };
    }
    
    // Validate backup data
    try {
      JSON.parse(backupData);
    } catch (error) {
      return {
        success: false,
        action: 'restore_backup',
        message: 'Backup data is corrupted',
        timestamp: new Date().toISOString()
      };
    }
    
    // Create backup of current data before restoring
    const currentData = localStorage.getItem('oriri-free-trial');
    if (currentData) {
      const preRestoreBackup = `${BACKUP_PREFIX}pre-restore-${Date.now()}`;
      localStorage.setItem(preRestoreBackup, currentData);
      console.log('[Rollback] 💾 Created pre-restore backup:', preRestoreBackup);
    }
    
    // Restore backup
    localStorage.setItem('oriri-free-trial', backupData);
    
    logRollbackAction('restore_backup', { backupKey });
    
    toast.success('Data restored from backup', {
      description: 'Please refresh the page'
    });
    
    console.log('[Rollback] ✅ Backup restored successfully');
    
    return {
      success: true,
      action: 'restore_backup',
      message: 'Backup restored successfully. Please refresh the page.',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('[Rollback] ❌ Failed to restore backup:', error);
    return {
      success: false,
      action: 'restore_backup',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * List all backups
 */
export function listBackups(): Array<{ key: string; timestamp: number; label: string }> {
  const backups: Array<{ key: string; timestamp: number; label: string }> = [];
  
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(BACKUP_PREFIX)) {
        // Extract timestamp and label from key
        const parts = key.replace(BACKUP_PREFIX, '').split('-');
        const timestamp = parseInt(parts[parts.length - 1]);
        const label = parts.slice(0, -1).join('-');
        
        backups.push({ key, timestamp, label });
      }
    }
    
    // Sort by timestamp (newest first)
    backups.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('[Rollback] Error listing backups:', error);
  }
  
  return backups;
}

/**
 * Delete old backups (keep last N)
 */
export function cleanupOldBackups(keepCount: number = 5): RollbackResult {
  console.log('[Rollback] 🧹 Cleaning up old backups, keeping:', keepCount);
  
  try {
    const backups = listBackups();
    const toDelete = backups.slice(keepCount);
    
    let deletedCount = 0;
    toDelete.forEach(backup => {
      try {
        localStorage.removeItem(backup.key);
        deletedCount++;
      } catch (error) {
        console.error('[Rollback] Error deleting backup:', backup.key, error);
      }
    });
    
    logRollbackAction('cleanup_backups', { deletedCount, keepCount });
    
    console.log('[Rollback] ✅ Cleaned up', deletedCount, 'old backups');
    
    return {
      success: true,
      action: 'cleanup_backups',
      message: `Deleted ${deletedCount} old backups`,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('[Rollback] ❌ Failed to cleanup backups:', error);
    return {
      success: false,
      action: 'cleanup_backups',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Clear migration flag (allows re-migration)
 */
export function clearMigrationFlag(): RollbackResult {
  console.log('[Rollback] 🔄 Clearing migration flag');
  
  try {
    const trialData = localStorage.getItem('oriri-free-trial');
    
    if (!trialData) {
      return {
        success: false,
        action: 'clear_migration_flag',
        message: 'No trial data found',
        timestamp: new Date().toISOString()
      };
    }
    
    const data = JSON.parse(trialData);
    
    // Create backup before modifying
    createTrialBackup('pre-clear-flag');
    
    // Clear migration flags
    delete data.migratedToBackend;
    delete data.migratedAt;
    delete data.lastSyncedAt;
    
    localStorage.setItem('oriri-free-trial', JSON.stringify(data));
    sessionStorage.removeItem('vip-migration-attempted');
    
    logRollbackAction('clear_migration_flag', {});
    
    toast.info('Migration flag cleared', {
      description: 'Data will attempt migration on next login'
    });
    
    console.log('[Rollback] ✅ Migration flag cleared');
    
    return {
      success: true,
      action: 'clear_migration_flag',
      message: 'Migration flag cleared. Will attempt migration on next login.',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('[Rollback] ❌ Failed to clear migration flag:', error);
    return {
      success: false,
      action: 'clear_migration_flag',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Reset to localStorage-only mode (emergency)
 */
export function emergencyResetToLocalStorage(): RollbackResult {
  console.log('[Rollback] 🚨 EMERGENCY: Resetting to localStorage-only mode');
  
  try {
    // Create backup before reset
    createTrialBackup('emergency-reset');
    
    // Disable backend sync
    disableBackendSync('Emergency reset');
    
    // Clear migration attempts
    sessionStorage.removeItem('vip-migration-attempted');
    
    // Mark trial as not migrated if it exists
    const trialData = localStorage.getItem('oriri-free-trial');
    if (trialData) {
      try {
        const data = JSON.parse(trialData);
        data.migratedToBackend = false;
        delete data.migratedAt;
        delete data.lastSyncedAt;
        localStorage.setItem('oriri-free-trial', JSON.stringify(data));
      } catch (error) {
        console.error('[Rollback] Error updating trial data:', error);
      }
    }
    
    logRollbackAction('emergency_reset', {});
    
    toast.warning('Emergency reset complete', {
      description: 'App now in localStorage-only mode. Please refresh.'
    });
    
    console.log('[Rollback] ✅ Emergency reset complete');
    
    return {
      success: true,
      action: 'emergency_reset',
      message: 'Reset to localStorage-only mode. Please refresh the page.',
      timestamp: new Date().toISOString(),
      backupCreated: true
    };
  } catch (error) {
    console.error('[Rollback] ❌ Emergency reset failed:', error);
    return {
      success: false,
      action: 'emergency_reset',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Log rollback action
 */
function logRollbackAction(action: string, details: any): void {
  try {
    const logData = localStorage.getItem(ROLLBACK_LOG_KEY);
    const log = logData ? JSON.parse(logData) : [];
    
    log.push({
      action,
      details,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 50 log entries
    const trimmedLog = log.slice(-50);
    
    localStorage.setItem(ROLLBACK_LOG_KEY, JSON.stringify(trimmedLog));
  } catch (error) {
    console.error('[Rollback] Error logging action:', error);
  }
}

/**
 * Get rollback log
 */
export function getRollbackLog(): Array<{ action: string; details: any; timestamp: string }> {
  try {
    const logData = localStorage.getItem(ROLLBACK_LOG_KEY);
    return logData ? JSON.parse(logData) : [];
  } catch (error) {
    console.error('[Rollback] Error reading log:', error);
    return [];
  }
}

/**
 * Clear rollback log
 */
export function clearRollbackLog(): void {
  try {
    localStorage.removeItem(ROLLBACK_LOG_KEY);
    console.log('[Rollback] Log cleared');
  } catch (error) {
    console.error('[Rollback] Error clearing log:', error);
  }
}

/**
 * Get rollback status summary
 */
export function getRollbackStatus(): {
  backendSyncEnabled: boolean;
  backupCount: number;
  lastBackup: string | null;
  logEntries: number;
  status: BackendSyncControl;
} {
  const status = getBackendSyncStatus();
  const backups = listBackups();
  const log = getRollbackLog();
  
  return {
    backendSyncEnabled: status.enabled,
    backupCount: backups.length,
    lastBackup: backups.length > 0 ? new Date(backups[0].timestamp).toISOString() : null,
    logEntries: log.length,
    status
  };
}

console.log('[Rollback] ✅ Rollback utilities loaded');
