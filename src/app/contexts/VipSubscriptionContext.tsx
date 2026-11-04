import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner@2.0.3';
import { useAuth } from '../hooks/useAuth';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { vipApi } from '../utils/vipApi';
import { migrateLocalStorageToBackend, shouldAttemptMigration, markMigrationAttempted } from '../utils/vipMigration';

// Shared Supabase client (one GoTrueClient per browser)
import { supabase } from '../utils/supabase/client';

export interface VipTier {
  id: string;
  name: string;
  displayName: string;
  description: string;
  price: number;
  currency: string;
  billingPeriod: 'monthly' | 'yearly';
  features: string[];
  badge?: string;
  color: string;
  highlighted?: boolean;
}

export interface VipSubscription {
  id: string;
  userId: string;
  tierId: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  startDate: string;
  endDate?: string;
  cancelAtPeriodEnd: boolean;
  trialEndDate?: string;
}

export interface VipBenefit {
  id: string;
  name: string;
  description: string;
  icon: string;
  requiredTier: string[];
  category: 'content' | 'features' | 'community' | 'exclusive';
}

interface VipSubscriptionContextType {
  // Subscription state
  currentSubscription: VipSubscription | null;
  availableTiers: VipTier[];
  isVipMember: boolean;
  currentTier: VipTier | null;
  isOnTrial: boolean;
  
  // Access control
  hasAccess: (requiredTier: string | string[]) => boolean;
  canAccessEpisode: (episodeId: number) => boolean;
  canAccessLiveSession: (sessionId: string) => boolean;
  canAccessFeature: (feature: string) => boolean;
  
  // Subscription management
  subscribe: (tierId: string) => Promise<void>;
  cancelSubscription: () => Promise<void>;
  updateSubscription: (tierId: string) => Promise<void>;
  startFreeTrial: (tierId: string) => Promise<void>;
  
  // Content gating
  getGatingReason: (requiredTier: string | string[]) => string;
  getRemainingTrialDays: () => number | null;
  
  // Benefits
  getAvailableBenefits: () => VipBenefit[];
  getUnlockedBenefits: () => VipBenefit[];
  
  // Loading states
  isLoading: boolean;
  isSubscribing: boolean;
}

const VipSubscriptionContext = createContext<VipSubscriptionContextType | null>(null);

export function VipSubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [currentSubscription, setCurrentSubscription] = useState<VipSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const { isLoggedIn, user } = useAuth();

  // Available VIP tiers - simplified to single VIP tier
  const availableTiers: VipTier[] = [
    {
      id: 'vip',
      name: 'vip',
      displayName: 'VIP Member',
      description: 'Unlock exclusive Oriri content and premium features',
      price: 20,
      currency: 'AED',
      billingPeriod: 'monthly',
      features: [
        'Access to all exclusive Oriri episodes',
        'Ad-free listening experience',
        'VIP badge in community',
        'Behind-the-scenes content'
      ],
      badge: '👑',
      color: 'from-purple-500 to-pink-500',
      highlighted: true
    }
  ];

  // VIP benefits catalog - simplified and focused on core value
  const vipBenefits: VipBenefit[] = [
    {
      id: 'exclusive-episodes',
      name: 'Exclusive Oriri Episodes',
      description: 'Access all exclusive episodes uploaded directly to Oriri',
      icon: '🔒',
      requiredTier: ['vip'],
      category: 'content'
    },
    {
      id: 'ad-free',
      name: 'Ad-Free Experience',
      description: 'Enjoy uninterrupted listening without advertisements',
      icon: '🚫',
      requiredTier: ['vip'],
      category: 'content'
    },
    {
      id: 'behind-scenes',
      name: 'Behind-the-Scenes Content',
      description: 'Exclusive behind-the-scenes footage and insights',
      icon: '🎬',
      requiredTier: ['vip'],
      category: 'exclusive'
    },
    {
      id: 'vip-badge',
      name: 'VIP Community Badge',
      description: 'Show your VIP status in the Oriri community',
      icon: '👑',
      requiredTier: ['vip'],
      category: 'community'
    }
  ];

  // Initialize with subscription data (check for existing trial) - SESSION-BASED ACCESS CONTROL
  useEffect(() => {
    const initializeSubscription = async () => {
      setIsLoading(true);
      
      console.log('[VipSubscription] ===== INITIALIZATION START =====');
      console.log('[VipSubscription] isLoggedIn:', isLoggedIn);
      console.log('[VipSubscription] user object:', user);
      
      // CRITICAL: Only check for VIP trial data if user is logged in
      // This ensures VIP access is completely tied to authentication session
      if (!isLoggedIn || !user) {
        console.log('[VipSubscription] ❌ User not logged in, clearing VIP state');
        console.log('[VipSubscription]   - isLoggedIn:', isLoggedIn);
        console.log('[VipSubscription]   - user:', user);
        setCurrentSubscription(null);
        setIsLoading(false);
        return;
      }
      
      console.log('[VipSubscription] ✅ User authenticated');
      console.log('[VipSubscription]   - User ID:', user.id);
      console.log('[VipSubscription]   - User Email:', user.email);
      console.log('[VipSubscription]   - User metadata:', user.user_metadata);

      // ============================================
      // PHASE 1C: BACKEND SYNC INTEGRATION
      // ============================================
      
      try {
        // STEP 1: Try to get auth token for backend calls
        console.log('[VipSubscription] 🔐 Getting auth token for backend sync');
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;

        if (accessToken) {
          console.log('[VipSubscription] ✅ Auth token obtained, attempting backend sync');
          
          // STEP 2: Check backend for subscription first
          console.log('[VipSubscription] 🌐 Checking backend for subscription...');
          const backendResponse = await vipApi.getSubscription(user.id, accessToken);
          
          if (backendResponse.success && backendResponse.subscription) {
            // Backend has subscription - use it as source of truth
            console.log('[VipSubscription] ✅ Backend subscription found:', backendResponse.subscription);
            
            // Convert backend subscription to frontend format
            const frontendSubscription: VipSubscription = {
              id: backendResponse.subscription.id,
              userId: backendResponse.subscription.userId,
              tierId: backendResponse.subscription.tierId,
              status: backendResponse.subscription.status as any,
              startDate: backendResponse.subscription.startDate,
              endDate: backendResponse.subscription.endDate,
              cancelAtPeriodEnd: backendResponse.subscription.cancelAtPeriodEnd,
              trialEndDate: backendResponse.subscription.trialEndDate
            };
            
            setCurrentSubscription(frontendSubscription);
            
            // Also update localStorage as backup
            if (backendResponse.subscription.status === 'trialing') {
              const trialData = {
                subscription: frontendSubscription,
                daysLeft: backendResponse.trialDaysLeft || 0,
                startDate: backendResponse.subscription.startDate,
                userId: user.id,
                userEmail: user.email,
                userIdentifiers: {
                  id: user.id,
                  email: user.email,
                  emailNormalized: user.email?.toLowerCase()
                },
                createdAt: backendResponse.subscription.createdAt,
                migratedToBackend: true,
                lastSyncedAt: new Date().toISOString()
              };
              localStorage.setItem('oriri-free-trial', JSON.stringify(trialData));
              console.log('[VipSubscription] ✅ localStorage updated from backend');
            }
            
            setIsLoading(false);
            console.log('[VipSubscription] ===== INITIALIZATION COMPLETE (BACKEND) =====');
            return;
          } else {
            console.log('[VipSubscription] ℹ️ No backend subscription found, checking localStorage');
            
            // STEP 3: No backend subscription - check localStorage for migration
            const existingTrial = localStorage.getItem('oriri-free-trial');
            
            if (existingTrial && shouldAttemptMigration()) {
              console.log('[VipSubscription] 🔄 Found localStorage trial, attempting migration');
              
              // Attempt migration
              const migrationResult = await migrateLocalStorageToBackend(user.id, user.email || '', accessToken);
              markMigrationAttempted();
              
              if (migrationResult.migrated && migrationResult.subscription) {
                console.log('[VipSubscription] ✅ Migration successful!');
                
                // Convert backend subscription to frontend format
                const frontendSubscription: VipSubscription = {
                  id: migrationResult.subscription.id,
                  userId: migrationResult.subscription.userId,
                  tierId: migrationResult.subscription.tierId,
                  status: migrationResult.subscription.status as any,
                  startDate: migrationResult.subscription.startDate,
                  endDate: migrationResult.subscription.endDate,
                  cancelAtPeriodEnd: migrationResult.subscription.cancelAtPeriodEnd,
                  trialEndDate: migrationResult.subscription.trialEndDate
                };
                
                setCurrentSubscription(frontendSubscription);
                setIsLoading(false);
                
                toast.success('VIP access synced!', {
                  description: 'Your trial is now synced across devices'
                });
                
                console.log('[VipSubscription] ===== INITIALIZATION COMPLETE (MIGRATED) =====');
                return;
              } else {
                console.log('[VipSubscription] ℹ️ Migration not needed or failed:', migrationResult.reason);
                // Continue to localStorage fallback below
              }
            }
          }
        } else {
          console.log('[VipSubscription] ⚠️ No auth token available, using localStorage only');
        }
      } catch (error) {
        console.error('[VipSubscription] ❌ Backend sync error:', error);
        console.log('[VipSubscription] 📝 Falling back to localStorage');
        // Continue to localStorage fallback
      }

      // ============================================
      // FALLBACK: LOCALSTORAGE-BASED SUBSCRIPTION
      // ============================================
      
      console.log('[VipSubscription] 🔍 Checking localStorage for existing trial data...');
      const existingTrial = localStorage.getItem('oriri-free-trial');
      let mockSubscription: VipSubscription | null = null;
      
      console.log('[VipSubscription] localStorage check result:', existingTrial ? 'FOUND' : 'NOT FOUND');
      if (existingTrial) {
        console.log('[VipSubscription] Raw localStorage data length:', existingTrial.length);
      }
      
      if (existingTrial) {
        try {
          const trialData = JSON.parse(existingTrial);
          console.log('[VipSubscription] Found trial data:', trialData);
          
          // MIGRATION: Handle old trial data format that might be missing enhanced fields
          if (trialData && !trialData.userIdentifiers && trialData.subscription) {
            console.log('[VipSubscription] Migrating old trial data format...');
            
            // Try to extract user email from subscription or use current user email
            const storedEmail = trialData.userEmail || trialData.subscription.userEmail || user.email;
            
            // If the email matches, migrate the data
            if (storedEmail === user.email) {
              console.log('[VipSubscription] Email match found, migrating trial data');
              trialData.userIdentifiers = {
                id: user.id,
                email: user.email,
                emailNormalized: user.email?.toLowerCase()
              };
              trialData.userEmail = user.email;
              trialData.userId = user.id;
              trialData.migrated = true;
              trialData.migratedAt = new Date().toISOString();
              
              // Update the subscription user ID too
              if (trialData.subscription) {
                trialData.subscription.userId = user.id;
                trialData.subscription.userEmail = user.email;
              }
              
              localStorage.setItem('oriri-free-trial', JSON.stringify(trialData));
              console.log('[VipSubscription] Trial data migration completed');
            }
          }
          
          const endDate = new Date(trialData.subscription.trialEndDate);
          const now = new Date();
          
          console.log('[VipSubscription] ===== TRIAL VALIDATION DEBUG =====');
          console.log('  - Stored trial subscription user ID:', trialData.subscription.userId);
          console.log('  - Stored trial root user ID:', trialData.userId);
          console.log('  - Stored trial user email:', trialData.userEmail);
          console.log('  - Current session user ID:', user.id);
          console.log('  - Current session user email:', user.email);
          console.log('  - Trial end date:', endDate);
          console.log('  - Current date:', now);
          console.log('  - Trial still valid (time):', endDate > now);
          console.log('  - Complete trial data structure:', JSON.stringify(trialData, null, 2));
          
          // COMPREHENSIVE USER VALIDATION: Multiple ways to identify the user
          const directIdMatch = trialData.subscription?.userId === user.id;
          const rootIdMatch = trialData.userId && trialData.userId === user.id;
          const emailMatch = trialData.userEmail && trialData.userEmail === user.email;
          const subscriptionEmailMatch = trialData.subscription?.userEmail && trialData.subscription.userEmail === user.email;
          const adminMatch = user.email === 'admin@oriri.com' && trialData.subscription?.userId?.includes('admin');
          
          // Check backup identifiers if they exist
          const backupIdMatch = trialData.userIdentifiers?.id === user.id;
          const backupEmailMatch = trialData.userIdentifiers?.email === user.email;
          const normalizedEmailMatch = trialData.userIdentifiers?.emailNormalized === user.email?.toLowerCase();
          
          // For edge cases where user ID might have changed but email stayed the same
          const flexibleEmailMatch = user.email && (
            trialData.userEmail?.toLowerCase() === user.email.toLowerCase() ||
            trialData.subscription?.userEmail?.toLowerCase() === user.email.toLowerCase()
          );
          
          console.log('[VipSubscription] Comprehensive validation checks:');
          console.log('  - Direct ID match:', directIdMatch);
          console.log('  - Root ID match:', rootIdMatch);
          console.log('  - Email match:', emailMatch);
          console.log('  - Subscription email match:', subscriptionEmailMatch);
          console.log('  - Backup ID match:', backupIdMatch);
          console.log('  - Backup email match:', backupEmailMatch);
          console.log('  - Normalized email match:', normalizedEmailMatch);
          console.log('  - Flexible email match:', flexibleEmailMatch);
          console.log('  - Admin match:', adminMatch);
          
          const isUserMatch = directIdMatch || rootIdMatch || emailMatch || subscriptionEmailMatch || 
                            backupIdMatch || backupEmailMatch || normalizedEmailMatch || 
                            flexibleEmailMatch || adminMatch;
          
          console.log('[VipSubscription] Final user match result:', isUserMatch);
          
          if (!isUserMatch) {
            console.log('[VipSubscription] ❌ Trial data belongs to different user, clearing');
            console.log('  - This could be a user ID mismatch or different user');
            console.log('  - If this is unexpected, there may be a user identification issue');
            localStorage.removeItem('oriri-free-trial');
          } else if (endDate > now) {
            // Trial is valid and belongs to current user
            console.log('[VipSubscription] ✅ Valid trial found for current user - RESTORING VIP ACCESS');
            console.log('  - Trial days remaining:', Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
            
            // Update the subscription with current user ID to ensure consistency
            const restoredSubscription = {
              ...trialData.subscription,
              userId: user.id, // Ensure consistency with current session
              userEmail: user.email // Update email too in case it changed
            };
            
            mockSubscription = restoredSubscription;
            
            // Update localStorage with corrected/enhanced user data for future sessions
            const updatedTrialData = {
              ...trialData,
              subscription: restoredSubscription,
              userId: user.id,
              userEmail: user.email,
              userIdentifiers: {
                id: user.id,
                email: user.email,
                emailNormalized: user.email?.toLowerCase()
              },
              lastRestored: new Date().toISOString()
            };
            
            localStorage.setItem('oriri-free-trial', JSON.stringify(updatedTrialData));
            console.log('[VipSubscription] Trial data updated for consistency');
            
          } else {
            // Trial expired, remove from storage
            console.log('[VipSubscription] ⏰ Trial expired, removing from storage');
            console.log('  - Trial ended on:', endDate);
            console.log('  - Current time:', now);
            localStorage.removeItem('oriri-free-trial');
          }
        } catch (error) {
          console.error('[VipSubscription] Failed to parse trial data:', error);
          localStorage.removeItem('oriri-free-trial');
        }
      } else {
        console.log('[VipSubscription] ❌ No existing trial data found in localStorage');
        console.log('[VipSubscription] This means user needs to start a new trial or never had one');
      }
      
      // Set the subscription state from localStorage fallback
      // Only if we didn't already return from backend sync above
      setCurrentSubscription(mockSubscription);
      setIsLoading(false);
      
      console.log('[VipSubscription] ===== INITIALIZATION COMPLETE (LOCALSTORAGE) =====');
      console.log('[VipSubscription] Final subscription state:', mockSubscription ? 'VIP Active' : 'No VIP');
      if (mockSubscription) {
        console.log('[VipSubscription] Subscription details:', {
          id: mockSubscription.id,
          userId: mockSubscription.userId,
          tierId: mockSubscription.tierId,
          status: mockSubscription.status,
          trialEndDate: mockSubscription.trialEndDate
        });
      }
      console.log('[VipSubscription] ===== END INITIALIZATION =====');
    };

    initializeSubscription();
  }, [isLoggedIn, user]); // Re-run when authentication state changes

  const isVipMember = Boolean(currentSubscription?.status === 'active' || currentSubscription?.status === 'trialing');
  const isOnTrial = Boolean(currentSubscription?.status === 'trialing');
  
  const currentTier = currentSubscription 
    ? availableTiers.find(tier => tier.id === currentSubscription.tierId) || null
    : null;

  const hasAccess = useCallback((requiredTier: string | string[]): boolean => {
    console.log('[VipSubscription] hasAccess called with requiredTier:', requiredTier);
    
    // CRITICAL: Must be logged in to have VIP access
    if (!isLoggedIn || !user) {
      console.log('[VipSubscription] hasAccess: ❌ User not logged in, denying access');
      console.log('[VipSubscription]   - isLoggedIn:', isLoggedIn);
      console.log('[VipSubscription]   - user:', user);
      return false;
    }
    
    console.log('[VipSubscription] hasAccess: ✅ User is logged in');
    console.log('[VipSubscription]   - User ID:', user.id);
    console.log('[VipSubscription]   - currentSubscription:', currentSubscription);
    
    if (!currentSubscription || (currentSubscription.status !== 'active' && currentSubscription.status !== 'trialing')) {
      console.log('[VipSubscription] hasAccess: ❌ No valid subscription, denying access');
      console.log('[VipSubscription]   - currentSubscription exists:', !!currentSubscription);
      if (currentSubscription) {
        console.log('[VipSubscription]   - subscription status:', currentSubscription.status);
        console.log('[VipSubscription]   - valid statuses: active, trialing');
      }
      return false;
    }

    // ENHANCED USER VALIDATION: Multiple ways to validate user ownership
    const isUserOwner = 
      currentSubscription.userId === user.id || // Direct ID match
      (user.email === 'admin@oriri.com' && currentSubscription.userId.includes('admin')); // Admin email fallback
    
    if (!isUserOwner) {
      console.log('[VipSubscription] hasAccess: Subscription belongs to different user, denying access');
      console.log('  - Subscription user ID:', currentSubscription.userId);
      console.log('  - Current user ID:', user.id);
      console.log('  - Current user email:', user.email);
      return false;
    }

    const requiredTiers = Array.isArray(requiredTier) ? requiredTier : [requiredTier];
    const hasAccess = requiredTiers.includes(currentSubscription.tierId);
    console.log('[VipSubscription] hasAccess result:', hasAccess, 'for tiers:', requiredTiers);
    console.log('  - User:', user.email, '| Subscription status:', currentSubscription.status, '| Tier:', currentSubscription.tierId);
    return hasAccess;
  }, [currentSubscription, isLoggedIn, user]);

  const canAccessEpisode = useCallback((episodeId: number): boolean => {
    // Simplified logic: Only exclusive Oriri content requires VIP
    // Spotify and YouTube content remains free for all users
    // This will be handled in the episode components based on platform type
    return true; // Platform-specific access is handled in components
  }, [hasAccess]);

  const canAccessLiveSession = useCallback((sessionId: string): boolean => {
    // Simplified logic: VIP-only live sessions require single VIP tier
    const vipOnlySessions = ['vip_session_1', 'exclusive_live_1'];
    if (vipOnlySessions.includes(sessionId)) {
      return hasAccess(['vip']);
    }
    return true;
  }, [hasAccess]);

  const canAccessFeature = useCallback((feature: string): boolean => {
    const featureRequirements: Record<string, string[]> = {
      'exclusive-episodes': ['vip'],
      'behind-scenes': ['vip'],
      'ad-free': ['vip'],
      'vip-badge': ['vip']
    };

    const requiredTiers = featureRequirements[feature];
    if (!requiredTiers) return true; // Feature doesn't require VIP

    return hasAccess(requiredTiers);
  }, [hasAccess]);

  const getGatingReason = useCallback((requiredTier: string | string[]): string => {
    const requiredTiers = Array.isArray(requiredTier) ? requiredTier : [requiredTier];
    const lowestTier = availableTiers.find(tier => requiredTiers.includes(tier.id));
    
    if (!lowestTier) return 'Upgrade to VIP to access this content';
    
    return `Upgrade to ${lowestTier.displayName} to unlock this content`;
  }, [availableTiers]);

  const getRemainingTrialDays = useCallback((): number | null => {
    if (!currentSubscription?.trialEndDate) return null;
    
    const trialEnd = new Date(currentSubscription.trialEndDate);
    const now = new Date();
    const diffTime = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  }, [currentSubscription]);

  const startFreeTrial = async (tierId: string): Promise<void> => {
    // CRITICAL: Must be logged in to start trial
    if (!isLoggedIn || !user) {
      toast.error('Please log in to start your free trial');
      throw new Error('User must be logged in to start trial');
    }

    setIsSubscribing(true);
    try {
      console.log('[VipSubscription] Starting free trial for user:', user.id);
      
      // ============================================
      // PHASE 1C: BACKEND INTEGRATION
      // ============================================
      
      let backendSubscription = null;
      
      // STEP 1: Try to start trial on backend first
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;
        
        if (accessToken) {
          console.log('[VipSubscription] 🌐 Starting trial on backend...');
          const backendResult = await vipApi.startTrial(tierId, accessToken);
          
          if (backendResult.success && backendResult.subscription) {
            console.log('[VipSubscription] ✅ Backend trial created successfully');
            backendSubscription = backendResult.subscription;
            
            // Convert backend subscription to frontend format
            const frontendSubscription: VipSubscription = {
              id: backendSubscription.id,
              userId: backendSubscription.userId,
              tierId: backendSubscription.tierId,
              status: 'trialing',
              startDate: backendSubscription.startDate,
              trialEndDate: backendSubscription.trialEndDate,
              cancelAtPeriodEnd: false
            };
            
            // Also save to localStorage as backup
            const trialData = {
              subscription: {
                ...frontendSubscription,
                userEmail: user.email
              },
              daysLeft: backendResult.trialDaysLeft || 7,
              startDate: backendSubscription.startDate,
              userId: user.id,
              userEmail: user.email,
              userIdentifiers: {
                id: user.id,
                email: user.email,
                emailNormalized: user.email?.toLowerCase()
              },
              createdAt: backendSubscription.createdAt,
              migratedToBackend: true,
              sessionInfo: {
                userAgent: navigator.userAgent.substring(0, 100),
                timestamp: Date.now()
              }
            };
            
            localStorage.setItem('oriri-free-trial', JSON.stringify(trialData));
            console.log('[VipSubscription] ✅ Trial data backed up to localStorage');
            
            setCurrentSubscription(frontendSubscription);
            
            const tier = availableTiers.find(t => t.id === tierId);
            toast.success(`🎉 Free trial started!`, {
              description: `You have 7 days of ${tier?.displayName} access`
            });
            
            console.log('[VipSubscription] Free trial activated (backend + localStorage)');
            setIsSubscribing(false);
            return;
          } else {
            // Backend trial failed - check reason
            if (backendResult.code === 'TRIAL_ALREADY_USED') {
              console.log('[VipSubscription] ⚠️ Trial already used on backend');
              toast.error('You have already used your free trial');
              throw new Error('Trial already used');
            }
            console.log('[VipSubscription] ⚠️ Backend trial failed, falling back to localStorage:', backendResult.message);
          }
        } else {
          console.log('[VipSubscription] ⚠️ No auth token, using localStorage only');
        }
      } catch (error) {
        console.error('[VipSubscription] ❌ Backend trial error:', error);
        console.log('[VipSubscription] 📝 Falling back to localStorage-only trial');
        // Continue to localStorage-only creation below
      }
      
      // ============================================
      // FALLBACK: LOCALSTORAGE-ONLY TRIAL
      // ============================================
      
      console.log('[VipSubscription] 📝 Creating localStorage-only trial (backend unavailable)');
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
      
      const trialStartDate = new Date();
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 7); // 7-day trial

      const trialSubscription: VipSubscription = {
        id: 'trial-' + Math.random().toString(36).substr(2, 9),
        userId: user.id,
        tierId,
        status: 'trialing',
        startDate: trialStartDate.toISOString(),
        trialEndDate: trialEndDate.toISOString(),
        cancelAtPeriodEnd: false
      };

      // Enhanced trial data with multiple user identifiers for robust matching
      const trialData = {
        subscription: {
          ...trialSubscription,
          userEmail: user.email
        },
        daysLeft: 7,
        startDate: trialStartDate.toISOString(),
        userId: user.id,
        userEmail: user.email,
        userIdentifiers: {
          id: user.id,
          email: user.email,
          emailNormalized: user.email?.toLowerCase()
        },
        createdAt: trialStartDate.toISOString(),
        sessionInfo: {
          userAgent: navigator.userAgent.substring(0, 100),
          timestamp: Date.now()
        },
        migratedToBackend: false // Will be migrated later
      };

      console.log('[VipSubscription] Storing localStorage trial data');
      localStorage.setItem('oriri-free-trial', JSON.stringify(trialData));

      setCurrentSubscription(trialSubscription);
      
      const tier = availableTiers.find(t => t.id === tierId);
      toast.success(`🎉 Free trial started!`, {
        description: `You have 7 days of ${tier?.displayName} access`
      });
      
      console.log('[VipSubscription] Free trial activated (localStorage only)');
    } catch (error) {
      console.error('[VipSubscription] Failed to start free trial:', error);
      toast.error('Failed to start free trial');
      throw error;
    } finally {
      setIsSubscribing(false);
    }
  };

  const subscribe = async (tierId: string): Promise<void> => {
    // CRITICAL: Must be logged in to subscribe
    if (!isLoggedIn || !user) {
      toast.error('Please log in to subscribe');
      throw new Error('User must be logged in to subscribe');
    }

    setIsSubscribing(true);
    try {
      console.log('[VipSubscription] Processing subscription for user:', user.id);
      
      // Simulate subscription process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newSubscription: VipSubscription = {
        id: `sub-${Date.now()}`,
        userId: user.id, // Use actual authenticated user ID
        tierId,
        status: 'active',
        startDate: new Date().toISOString(),
        cancelAtPeriodEnd: false
      };

      // Remove trial data if converting from trial
      localStorage.removeItem('oriri-free-trial');

      setCurrentSubscription(newSubscription);
      
      const tier = availableTiers.find(t => t.id === tierId);
      toast.success(`🎉 Welcome to ${tier?.displayName}!`, {
        description: 'Your VIP benefits are now active'
      });
      
      console.log('[VipSubscription] Subscription activated for user:', user.id);
    } catch (error) {
      console.error('[VipSubscription] Failed to process subscription:', error);
      toast.error('Failed to process subscription');
      throw error;
    } finally {
      setIsSubscribing(false);
    }
  };

  const cancelSubscription = async (): Promise<void> => {
    if (!currentSubscription) return;
    
    setIsLoading(true);
    try {
      // Simulate cancellation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setCurrentSubscription({
        ...currentSubscription,
        cancelAtPeriodEnd: true
      });
      
      toast.success('Subscription canceled', {
        description: 'You\'ll retain VIP access until your current period ends'
      });
    } catch (error) {
      toast.error('Failed to cancel subscription');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateSubscription = async (tierId: string): Promise<void> => {
    if (!currentSubscription) return;
    
    setIsSubscribing(true);
    try {
      // Simulate update
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setCurrentSubscription({
        ...currentSubscription,
        tierId
      });
      
      const tier = availableTiers.find(t => t.id === tierId);
      toast.success(`Upgraded to ${tier?.displayName}!`, {
        description: 'Your new benefits are now active'
      });
    } catch (error) {
      toast.error('Failed to update subscription');
      throw error;
    } finally {
      setIsSubscribing(false);
    }
  };

  const getAvailableBenefits = useCallback((): VipBenefit[] => {
    return vipBenefits;
  }, []);

  const getUnlockedBenefits = useCallback((): VipBenefit[] => {
    if (!currentTier) return [];
    
    return vipBenefits.filter(benefit => 
      benefit.requiredTier.includes(currentTier.id)
    );
  }, [currentTier]);

  const value: VipSubscriptionContextType = {
    currentSubscription,
    availableTiers,
    isVipMember,
    currentTier,
    isOnTrial,
    hasAccess,
    canAccessEpisode,
    canAccessLiveSession,
    canAccessFeature,
    subscribe,
    cancelSubscription,
    updateSubscription,
    startFreeTrial,
    getGatingReason,
    getRemainingTrialDays,
    getAvailableBenefits,
    getUnlockedBenefits,
    isLoading,
    isSubscribing
  };

  return (
    <VipSubscriptionContext.Provider value={value}>
      {children}
    </VipSubscriptionContext.Provider>
  );
}

export function useVipSubscription() {
  const context = useContext(VipSubscriptionContext);
  if (!context) {
    throw new Error('useVipSubscription must be used within a VipSubscriptionProvider');
  }
  return context;
}