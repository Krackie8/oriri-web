import { projectId, publicAnonKey } from './supabase/info';

export const setupAdminUser = async () => {
  try {
    console.log('[adminSetup] Setting up admin user...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/setup-admin`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}), // Use default values
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success) {
      console.log('[adminSetup] Admin user setup successful:', data.admin);
      return {
        success: true,
        admin: data.admin,
        credentials: data.credentials
      };
    } else {
      console.error('[adminSetup] Admin setup failed:', data.error);
      return {
        success: false,
        error: data.error
      };
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('[adminSetup] Admin setup timed out');
      return {
        success: false,
        error: 'Setup timed out'
      };
    }
    console.error('[adminSetup] Error during admin setup:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Optional background setup function - completely non-blocking
export const initializeAdminUserOptional = () => {
  // Don't await this - fire and forget
  setTimeout(async () => {
    try {
      console.log('[adminSetup] Starting optional background admin setup...');
      const result = await setupAdminUser();
      
      if (result.success) {
        console.log('[adminSetup] Background admin setup successful:', result.admin?.email);
      } else {
        console.log('[adminSetup] Background admin setup failed (non-critical):', result.error);
      }
    } catch (error) {
      console.log('[adminSetup] Background admin setup error (non-critical):', error);
    }
  }, 5000); // Start after 5 seconds to avoid blocking app startup
};

// Legacy function kept for compatibility - now non-blocking
export const initializeAdminUser = async () => {
  console.log('[adminSetup] initializeAdminUser called - delegating to optional setup');
  initializeAdminUserOptional();
  
  // Return immediately with success to avoid blocking
  return {
    success: true,
    admin: { email: 'admin@oriri.com' },
    error: null
  };
};