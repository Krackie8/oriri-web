import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../utils/supabase/client';

interface AdminStatus {
  isAdmin: boolean;
  isCreator: boolean;
  userRole: string;
  userData?: {
    id: string;
    email: string;
    name: string;
  };
}

export function useAdmin() {
  const { user, isLoggedIn } = useAuth();
  const [adminStatus, setAdminStatus] = useState<AdminStatus>({
    isAdmin: false,
    isCreator: false,
    userRole: 'user'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Use refs to prevent unnecessary re-checks
  const lastCheckedUserIdRef = useRef<string | null>(null);
  const checkInProgressRef = useRef(false);

  // Check admin status with timeout and error handling
  const checkAdminStatus = useCallback(async () => {
    // Prevent multiple simultaneous checks
    if (checkInProgressRef.current) {
      console.log('[useAdmin] Check already in progress, skipping...');
      return;
    }

    // Don't check if not logged in
    if (!user || !isLoggedIn) {
      setAdminStatus({
        isAdmin: false,
        isCreator: false,
        userRole: 'user'
      });
      setIsInitialized(true);
      setError(null);
      return;
    }

    // Don't re-check same user
    if (lastCheckedUserIdRef.current === user.id && isInitialized) {
      console.log('[useAdmin] Already checked for this user, skipping...');
      return;
    }

    checkInProgressRef.current = true;
    setLoading(true);
    setError(null);

    try {
      console.log('[useAdmin] Checking admin status for user:', user.id);
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // Reduced to 8 seconds

      // Get access token from current session
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      if (!accessToken) {
        console.log('[useAdmin] No access token available, treating as non-admin');
        setAdminStatus({
          isAdmin: false,
          isCreator: false,
          userRole: 'user'
        });
        setIsInitialized(true);
        lastCheckedUserIdRef.current = user.id;
        return;
      }

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/check-admin`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401) {
          console.log('[useAdmin] Unauthorized - user not admin');
          setAdminStatus({
            isAdmin: false,
            isCreator: false,
            userRole: 'user'
          });
          setIsInitialized(true);
          lastCheckedUserIdRef.current = user.id;
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setAdminStatus({
          isAdmin: data.isAdmin,
          isCreator: data.isCreator,
          userRole: data.userRole,
          userData: data.userData
        });
        console.log('[useAdmin] Admin status checked:', data.isAdmin, data.isCreator);
        lastCheckedUserIdRef.current = user.id;
      } else {
        throw new Error(data.error || 'Failed to check admin status');
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.error('[useAdmin] Admin check request was aborted due to timeout');
        setError('Request timeout - please try again');
      } else {
        console.error('[useAdmin] Error checking admin status:', err);
        setError(err instanceof Error ? err.message : 'Failed to check admin status');
      }
      
      // Set default non-admin status on error
      setAdminStatus({
        isAdmin: false,
        isCreator: false,
        userRole: 'user'
      });
    } finally {
      setLoading(false);
      setIsInitialized(true);
      checkInProgressRef.current = false;
    }
  }, [user?.id, isLoggedIn]); // Simplified dependencies

  // Setup admin user
  const setupAdmin = useCallback(async (email?: string, password?: string, name?: string) => {
    if (checkInProgressRef.current) {
      console.log('[useAdmin] Another operation in progress, skipping setup...');
      return {
        success: false,
        error: 'Another operation is in progress'
      };
    }

    checkInProgressRef.current = true;
    setLoading(true);
    setError(null);

    try {
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 second timeout

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/setup-admin`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          name
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (data.success) {
        console.log('[useAdmin] Admin setup successful:', data);
        // Reset check status to allow re-checking
        lastCheckedUserIdRef.current = null;
        setIsInitialized(false);
        return {
          success: true,
          admin: data.admin,
          credentials: data.credentials,
          message: data.message
        };
      } else {
        throw new Error(data.error || 'Failed to setup admin');
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.error('[useAdmin] Admin setup request was aborted due to timeout');
        const errorMessage = 'Request timeout - please try again';
        setError(errorMessage);
        return {
          success: false,
          error: errorMessage
        };
      } else {
        console.error('[useAdmin] Error setting up admin:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to setup admin';
        setError(errorMessage);
        return {
          success: false,
          error: errorMessage
        };
      }
    } finally {
      setLoading(false);
      checkInProgressRef.current = false;
    }
  }, []);

  // Check admin status when user changes, but only once per user session
  useEffect(() => {
    // Only check if we haven't checked for this user yet
    if (user?.id && lastCheckedUserIdRef.current !== user.id && !checkInProgressRef.current) {
      console.log('[useAdmin] User changed, checking admin status for user:', user.id);
      checkAdminStatus();
    } else if (!user?.id && isInitialized) {
      // User logged out, reset everything
      console.log('[useAdmin] User logged out, resetting admin status');
      setAdminStatus({
        isAdmin: false,
        isCreator: false,
        userRole: 'user'
      });
      setError(null);
      setIsInitialized(false);
      lastCheckedUserIdRef.current = null;
    }
  }, [user?.id, checkAdminStatus, isInitialized]);

  return {
    ...adminStatus,
    loading,
    error,
    checkAdminStatus,
    setupAdmin,
    isInitialized,
  };
}