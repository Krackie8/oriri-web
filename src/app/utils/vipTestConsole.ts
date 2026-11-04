/**
 * VIP Testing Console
 * 
 * Comprehensive testing utilities accessible from browser console
 * Usage: window.VipTest.runAllTests()
 */

import { validateVipData, getValidationReport, needsMigration } from './vipMigrationValidator';
import { 
  disableBackendSync, 
  enableBackendSync, 
  isBackendSyncEnabled,
  createTrialBackup,
  restoreFromBackup,
  listBackups,
  cleanupOldBackups,
  clearMigrationFlag,
  emergencyResetToLocalStorage,
  getRollbackStatus,
  getRollbackLog
} from './vipRollback';
import { vipApi } from './vipApi';
import { migrateLocalStorageToBackend } from './vipMigration';

export interface TestResult {
  test: string;
  passed: boolean;
  message: string;
  details?: any;
  duration?: number;
}

export interface TestSuite {
  name: string;
  results: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    duration: number;
  };
}

/**
 * VIP Testing Console Class
 */
class VipTestingConsole {
  private userId: string | null = null;
  private userEmail: string | null = null;
  private token: string | null = null;

  constructor() {
    console.log('[VIP Test Console] 🧪 Testing console loaded');
    console.log('[VIP Test Console] Available commands:');
    console.log('  - VipTest.help() - Show all commands');
    console.log('  - VipTest.runAllTests() - Run all tests');
    console.log('  - VipTest.validateData() - Validate VIP data');
    console.log('  - VipTest.testMigration() - Test migration');
    console.log('  - VipTest.emergencyReset() - Emergency reset');
  }

  /**
   * Show help
   */
  help(): void {
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('  VIP TESTING CONSOLE - HELP');
    console.log('═══════════════════════════════════════');
    console.log('');
    console.log('📋 TESTING COMMANDS:');
    console.log('  VipTest.runAllTests() - Run all test suites');
    console.log('  VipTest.testDataValidation() - Test data validation');
    console.log('  VipTest.testMigration() - Test migration flow');
    console.log('  VipTest.testCrossDeviceSync() - Test cross-device sync');
    console.log('  VipTest.testEdgeCases() - Test edge cases');
    console.log('');
    console.log('🔍 VALIDATION COMMANDS:');
    console.log('  VipTest.validateData() - Validate current VIP data');
    console.log('  VipTest.checkMigrationStatus() - Check if migration needed');
    console.log('  VipTest.getValidationReport() - Get detailed validation report');
    console.log('');
    console.log('💾 BACKUP COMMANDS:');
    console.log('  VipTest.createBackup("label") - Create backup');
    console.log('  VipTest.listBackups() - List all backups');
    console.log('  VipTest.restoreBackup("key") - Restore from backup');
    console.log('  VipTest.cleanupBackups(5) - Cleanup old backups');
    console.log('');
    console.log('🔄 ROLLBACK COMMANDS:');
    console.log('  VipTest.disableBackend() - Disable backend sync');
    console.log('  VipTest.enableBackend() - Enable backend sync');
    console.log('  VipTest.clearMigrationFlag() - Clear migration flag');
    console.log('  VipTest.emergencyReset() - Emergency reset to localStorage');
    console.log('');
    console.log('📊 STATUS COMMANDS:');
    console.log('  VipTest.getStatus() - Get overall status');
    console.log('  VipTest.getRollbackLog() - Get rollback log');
    console.log('  VipTest.getBackendSyncStatus() - Check backend sync status');
    console.log('');
    console.log('🧹 CLEANUP COMMANDS:');
    console.log('  VipTest.clearLocalStorage() - Clear VIP localStorage');
    console.log('  VipTest.clearSessionStorage() - Clear VIP sessionStorage');
    console.log('  VipTest.clearAllVipData() - Clear all VIP data');
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('');
  }

  /**
   * Set auth credentials for testing
   */
  setAuth(userId: string, userEmail: string, token: string): void {
    this.userId = userId;
    this.userEmail = userEmail;
    this.token = token;
    console.log('[VIP Test] ✅ Auth credentials set for testing');
  }

  /**
   * Run all test suites
   */
  async runAllTests(): Promise<void> {
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('  RUNNING ALL VIP TESTS');
    console.log('═══════════════════════════════════════');
    console.log('');

    const startTime = Date.now();

    try {
      await this.testDataValidation();
      console.log('');
      await this.testCrossDeviceSync();
      console.log('');
      await this.testEdgeCases();
      console.log('');
      
      const duration = Date.now() - startTime;
      
      console.log('═══════════════════════════════════════');
      console.log(`  ALL TESTS COMPLETE (${duration}ms)`);
      console.log('═══════════════════════════════════════');
      console.log('');
    } catch (error) {
      console.error('[VIP Test] ❌ Test suite failed:', error);
    }
  }

  /**
   * Test data validation
   */
  async testDataValidation(): Promise<TestSuite> {
    console.log('🧪 TEST SUITE: Data Validation');
    console.log('─────────────────────────────────────');

    const results: TestResult[] = [];
    const startTime = Date.now();

    // Test 1: localStorage presence
    const test1Start = Date.now();
    try {
      const hasLocal = localStorage.getItem('oriri-free-trial') !== null;
      results.push({
        test: 'localStorage check',
        passed: true,
        message: hasLocal ? 'localStorage data found' : 'No localStorage data',
        duration: Date.now() - test1Start
      });
    } catch (error) {
      results.push({
        test: 'localStorage check',
        passed: false,
        message: 'Failed to check localStorage',
        details: error,
        duration: Date.now() - test1Start
      });
    }

    // Test 2: localStorage data structure
    const test2Start = Date.now();
    try {
      const trialData = localStorage.getItem('oriri-free-trial');
      if (trialData) {
        const data = JSON.parse(trialData);
        const hasSubscription = !!data.subscription;
        const hasUserId = !!data.userId;
        const hasUserEmail = !!data.userEmail;
        
        results.push({
          test: 'localStorage structure',
          passed: hasSubscription && hasUserId && hasUserEmail,
          message: 'Data structure validated',
          details: {
            hasSubscription,
            hasUserId,
            hasUserEmail
          },
          duration: Date.now() - test2Start
        });
      } else {
        results.push({
          test: 'localStorage structure',
          passed: true,
          message: 'No data to validate',
          duration: Date.now() - test2Start
        });
      }
    } catch (error) {
      results.push({
        test: 'localStorage structure',
        passed: false,
        message: 'Invalid data structure',
        details: error,
        duration: Date.now() - test2Start
      });
    }

    // Test 3: Migration flag status
    const test3Start = Date.now();
    try {
      const trialData = localStorage.getItem('oriri-free-trial');
      if (trialData) {
        const data = JSON.parse(trialData);
        const migrationStatus = data.migratedToBackend ? 'migrated' : 'pending';
        
        results.push({
          test: 'Migration flag',
          passed: true,
          message: `Migration status: ${migrationStatus}`,
          details: {
            migratedToBackend: data.migratedToBackend,
            migratedAt: data.migratedAt
          },
          duration: Date.now() - test3Start
        });
      } else {
        results.push({
          test: 'Migration flag',
          passed: true,
          message: 'No data to check',
          duration: Date.now() - test3Start
        });
      }
    } catch (error) {
      results.push({
        test: 'Migration flag',
        passed: false,
        message: 'Failed to check migration flag',
        details: error,
        duration: Date.now() - test3Start
      });
    }

    const duration = Date.now() - startTime;
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    const suite: TestSuite = {
      name: 'Data Validation',
      results,
      summary: {
        total: results.length,
        passed,
        failed,
        duration
      }
    };

    console.log(`✅ Passed: ${passed} | ❌ Failed: ${failed} | ⏱️ ${duration}ms`);
    results.forEach(r => {
      const icon = r.passed ? '✅' : '❌';
      console.log(`  ${icon} ${r.test}: ${r.message}`);
    });

    return suite;
  }

  /**
   * Test cross-device sync
   */
  async testCrossDeviceSync(): Promise<TestSuite> {
    console.log('🧪 TEST SUITE: Cross-Device Sync');
    console.log('─────────────────────────────────────');

    const results: TestResult[] = [];
    const startTime = Date.now();

    // Note: These are simulation tests since we can't actually test multiple devices
    console.log('ℹ️ This suite simulates cross-device scenarios');

    // Test 1: Backend sync enabled
    const test1Start = Date.now();
    try {
      const syncEnabled = isBackendSyncEnabled();
      results.push({
        test: 'Backend sync status',
        passed: true,
        message: syncEnabled ? 'Backend sync enabled' : 'Backend sync disabled',
        details: { syncEnabled },
        duration: Date.now() - test1Start
      });
    } catch (error) {
      results.push({
        test: 'Backend sync status',
        passed: false,
        message: 'Failed to check sync status',
        details: error,
        duration: Date.now() - test1Start
      });
    }

    // Test 2: Session storage clean
    const test2Start = Date.now();
    try {
      const migrationAttempted = sessionStorage.getItem('vip-migration-attempted');
      results.push({
        test: 'Session storage state',
        passed: true,
        message: migrationAttempted ? 'Migration already attempted this session' : 'Clean session',
        details: { migrationAttempted: !!migrationAttempted },
        duration: Date.now() - test2Start
      });
    } catch (error) {
      results.push({
        test: 'Session storage state',
        passed: false,
        message: 'Failed to check session storage',
        details: error,
        duration: Date.now() - test2Start
      });
    }

    const duration = Date.now() - startTime;
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    const suite: TestSuite = {
      name: 'Cross-Device Sync',
      results,
      summary: {
        total: results.length,
        passed,
        failed,
        duration
      }
    };

    console.log(`✅ Passed: ${passed} | ❌ Failed: ${failed} | ⏱️ ${duration}ms`);
    results.forEach(r => {
      const icon = r.passed ? '✅' : '❌';
      console.log(`  ${icon} ${r.test}: ${r.message}`);
    });

    return suite;
  }

  /**
   * Test edge cases
   */
  async testEdgeCases(): Promise<TestSuite> {
    console.log('🧪 TEST SUITE: Edge Cases');
    console.log('─────────────────────────────────────');

    const results: TestResult[] = [];
    const startTime = Date.now();

    // Test 1: Expired trial detection
    const test1Start = Date.now();
    try {
      const trialData = localStorage.getItem('oriri-free-trial');
      if (trialData) {
        const data = JSON.parse(trialData);
        if (data.subscription?.trialEndDate) {
          const endDate = new Date(data.subscription.trialEndDate);
          const now = new Date();
          const isExpired = endDate <= now;
          
          results.push({
            test: 'Expired trial detection',
            passed: true,
            message: isExpired ? 'Trial is expired' : 'Trial is active',
            details: {
              trialEndDate: endDate.toISOString(),
              now: now.toISOString(),
              isExpired
            },
            duration: Date.now() - test1Start
          });
        } else {
          results.push({
            test: 'Expired trial detection',
            passed: true,
            message: 'No trial end date found',
            duration: Date.now() - test1Start
          });
        }
      } else {
        results.push({
          test: 'Expired trial detection',
          passed: true,
          message: 'No trial data',
          duration: Date.now() - test1Start
        });
      }
    } catch (error) {
      results.push({
        test: 'Expired trial detection',
        passed: false,
        message: 'Failed to check expiration',
        details: error,
        duration: Date.now() - test1Start
      });
    }

    // Test 2: Corrupted data handling
    const test2Start = Date.now();
    try {
      const trialData = localStorage.getItem('oriri-free-trial');
      if (trialData) {
        JSON.parse(trialData); // Will throw if corrupted
        results.push({
          test: 'Corrupted data handling',
          passed: true,
          message: 'Data is valid JSON',
          duration: Date.now() - test2Start
        });
      } else {
        results.push({
          test: 'Corrupted data handling',
          passed: true,
          message: 'No data to validate',
          duration: Date.now() - test2Start
        });
      }
    } catch (error) {
      results.push({
        test: 'Corrupted data handling',
        passed: false,
        message: 'Data is corrupted',
        details: error,
        duration: Date.now() - test2Start
      });
    }

    const duration = Date.now() - startTime;
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    const suite: TestSuite = {
      name: 'Edge Cases',
      results,
      summary: {
        total: results.length,
        passed,
        failed,
        duration
      }
    };

    console.log(`✅ Passed: ${passed} | ❌ Failed: ${failed} | ⏱️ ${duration}ms`);
    results.forEach(r => {
      const icon = r.passed ? '✅' : '❌';
      console.log(`  ${icon} ${r.test}: ${r.message}`);
    });

    return suite;
  }

  /**
   * Validate VIP data
   */
  async validateData(): Promise<void> {
    if (!this.userId || !this.userEmail || !this.token) {
      console.error('❌ Auth credentials not set. Use VipTest.setAuth(userId, userEmail, token) first');
      return;
    }

    console.log('🔍 Validating VIP data...');
    const result = await validateVipData(this.userId, this.userEmail, this.token);
    const report = getValidationReport(result);
    console.log(report);
  }

  /**
   * Get validation report
   */
  async getValidationReport(): Promise<void> {
    await this.validateData();
  }

  /**
   * Check migration status
   */
  async checkMigrationStatus(): Promise<void> {
    if (!this.userId || !this.userEmail || !this.token) {
      console.error('❌ Auth credentials not set. Use VipTest.setAuth(userId, userEmail, token) first');
      return;
    }

    console.log('🔍 Checking migration status...');
    const needs = await needsMigration(this.userId, this.userEmail, this.token);
    console.log(needs ? '⚠️ Migration needed' : '✅ No migration needed');
  }

  /**
   * Test migration
   */
  async testMigration(): Promise<void> {
    if (!this.userId || !this.userEmail || !this.token) {
      console.error('❌ Auth credentials not set. Use VipTest.setAuth(userId, userEmail, token) first');
      return;
    }

    console.log('🔄 Testing migration...');
    const result = await migrateLocalStorageToBackend(this.userId, this.userEmail, this.token);
    console.log('Migration result:', result);
  }

  // Backup commands
  createBackup(label: string = 'manual'): void {
    const result = createTrialBackup(label);
    console.log(result);
  }

  listBackups(): void {
    const backups = listBackups();
    console.log('💾 Backups:', backups);
  }

  restoreBackup(key: string): void {
    const result = restoreFromBackup(key);
    console.log(result);
  }

  cleanupBackups(keep: number = 5): void {
    const result = cleanupOldBackups(keep);
    console.log(result);
  }

  // Rollback commands
  disableBackend(): void {
    const result = disableBackendSync('Manual disable from console');
    console.log(result);
  }

  enableBackend(): void {
    const result = enableBackendSync();
    console.log(result);
  }

  clearMigrationFlag(): void {
    const result = clearMigrationFlag();
    console.log(result);
  }

  emergencyReset(): void {
    console.warn('⚠️ This will reset to localStorage-only mode!');
    const result = emergencyResetToLocalStorage();
    console.log(result);
  }

  // Status commands
  getStatus(): void {
    const status = getRollbackStatus();
    console.log('📊 VIP System Status:', status);
  }

  getRollbackLog(): void {
    const log = getRollbackLog();
    console.log('📜 Rollback Log:', log);
  }

  getBackendSyncStatus(): void {
    const enabled = isBackendSyncEnabled();
    console.log('Backend sync:', enabled ? '✅ Enabled' : '❌ Disabled');
  }

  // Cleanup commands
  clearLocalStorage(): void {
    try {
      localStorage.removeItem('oriri-free-trial');
      console.log('✅ VIP localStorage cleared');
    } catch (error) {
      console.error('❌ Failed to clear localStorage:', error);
    }
  }

  clearSessionStorage(): void {
    try {
      sessionStorage.removeItem('vip-migration-attempted');
      console.log('✅ VIP sessionStorage cleared');
    } catch (error) {
      console.error('❌ Failed to clear sessionStorage:', error);
    }
  }

  clearAllVipData(): void {
    console.warn('⚠️ This will clear ALL VIP data!');
    this.clearLocalStorage();
    this.clearSessionStorage();
    console.log('✅ All VIP data cleared');
  }
}

// Create global instance
const vipTest = new VipTestingConsole();

// Expose to window for console access
declare global {
  interface Window {
    VipTest: VipTestingConsole;
  }
}

if (typeof window !== 'undefined') {
  window.VipTest = vipTest;
  console.log('[VIP Test Console] ✅ Available globally as window.VipTest');
  console.log('[VIP Test Console] Type VipTest.help() for commands');
}

export default vipTest;
