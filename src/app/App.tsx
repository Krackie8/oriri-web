import React, { useEffect, useState } from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import WellnessSite, { isWellnessPath } from './wellness/WellnessSite';
import AppAnalytics from './wellness/analytics/AppAnalytics';

// Standard ES6 imports
import ErrorBoundary from './components/ErrorBoundary';
import { Toaster } from './components/ui/sonner';
import { SplashWrapper } from './components/SplashWrapper';
import { AppLayout } from './components/AppLayout';
import { AppModals } from './components/AppModals';
import PWAStatus from './components/PWAStatus';
import OptimizedProviders from './components/OptimizedProviders';
import UserFlowCoordinator from './components/UserFlowCoordinator';
import VipUserExperience from './components/vip/VipUserExperience';
import DebugUtils from './utils/debugUtils';

// Import VIP testing console for development
import './utils/vipTestConsole';

import { useAuthHandlers } from './hooks/useAuthHandlers';
import { useAuth } from './hooks/useAuth';
import OririLoader from './components/OririLoader';

console.log('[App] Starting App component...');

// Inner component that uses all contexts
function AppContent() {
  console.log('[App] AppContent rendering...');
  
  const [isReady, setIsReady] = useState(true); // Start as ready immediately
  const { handleLogin, handleGuestMode, handleLogout } = useAuthHandlers();
  const location = useLocation();
  const { isLoggedIn, loading: authLoading } = useAuth();
  const isProfilePath = (location.pathname.replace(/\/+$/, '') || '/') === '/profile';

  useEffect(() => {
    const initializeApp = () => {
      try {
        DebugUtils.info('Initializing Oriri app...');
        
        // Load debug settings synchronously
        try {
          const savedSettings = localStorage.getItem('oriri-settings');
          if (savedSettings) {
            const parsed = JSON.parse(savedSettings);
            if (parsed.debugMode) {
              DebugUtils.setLogLevel('debug');
              DebugUtils.debug('Debug mode enabled from saved settings');
            }
          }
        } catch (e) {
          DebugUtils.warn('Failed to load debug settings:', e);
        }
        
        DebugUtils.info('App initialization complete - ready to render');
        
      } catch (error) {
        DebugUtils.error('Failed to initialize app:', error);
      }
    };

    // Initialize immediately without any delays
    initializeApp();
    
  }, []);

  // Global error handler
  const handleGlobalError = (error: Error, errorInfo: any) => {
    DebugUtils.error('Global error caught by boundary:', error, errorInfo);
  };

  if (!isReady) {
    // This should never show since isReady starts as true
    return (
      <OririLoader variant="screen" />
    );
  }

  // Wellness Bestie marketing site (/, /pilot, /about, /privacy): standalone,
  // no splash, onboarding or podcast chrome — visitors arrive from Instagram.
  // Guests on /profile get the Bestie sign-in / membership screen instead of a redirect home.
  if (isProfilePath && authLoading) {
    return (
      <OririLoader variant="screen" />
    );
  }
  if (isWellnessPath(location.pathname) || (isProfilePath && !isLoggedIn)) {
    return (
      <ErrorBoundary onError={handleGlobalError}>
        <WellnessSite />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary onError={handleGlobalError}>
      <SplashWrapper>
        <UserFlowCoordinator>
          <VipUserExperience>
            <AppLayout 
              onLogin={handleLogin}
              onLogout={handleLogout} 
            />
            
            <AppModals
              onLogin={handleLogin}
              onGuestMode={handleGuestMode}
              onLogout={handleLogout}
            />
          </VipUserExperience>
        </UserFlowCoordinator>
        
        <PWAStatus />
        <Toaster />
        {/* GA4 + Clarity (after cookie consent) for podcast pages */}
        <AppAnalytics />
      </SplashWrapper>
    </ErrorBoundary>
  );
}

// Main App component with all providers
export default function App() {
  console.log('[App] Main App component rendering...');
  
  // Minimal initialization with immediate execution
  useEffect(() => {
    console.log('[App] useEffect running - initializing...');
    
    const initializeGlobalSettings = () => {
      try {
        // Apply dark mode to the document element immediately
        // Oriri uses the light nude theme by default
        document.documentElement.classList.remove('dark');
        
        // Set up global error handling
        const handleGlobalError = (event) => {
          DebugUtils.error('Global JavaScript error:', event.error, {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
          });
        };
        
        const handleUnhandledRejection = (event) => {
          DebugUtils.error('Unhandled promise rejection:', event.reason);
        };
        
        window.addEventListener('error', handleGlobalError, { passive: true });
        window.addEventListener('unhandledrejection', handleUnhandledRejection, { passive: true });
        
        DebugUtils.info('Global app initialization complete');
        
        // Return cleanup function
        return () => {
          window.removeEventListener('error', handleGlobalError);
          window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        };
        
      } catch (error) {
        console.error('[App] Error in global initialization:', error);
        DebugUtils.error('Error in main app useEffect:', error);
        return () => {}; // Return empty cleanup function
      }
    };

    // Execute immediately and store cleanup function
    const cleanup = initializeGlobalSettings();
    
    return cleanup;
  }, []);

  console.log('[App] Rendering provider tree...');

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <OptimizedProviders>
          <AppContent />
        </OptimizedProviders>
      </BrowserRouter>
    </ErrorBoundary>
  );
}