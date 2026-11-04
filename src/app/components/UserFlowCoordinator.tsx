import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAdmin } from '../hooks/useAdmin';
import { useModals } from '../contexts/ModalContext';
import OnboardingFlow from './OnboardingFlow';
import { toast } from 'sonner@2.0.3';

interface UserFlowCoordinatorProps {
  children: React.ReactNode;
}

export function UserFlowCoordinator({ children }: UserFlowCoordinatorProps) {
  const { user, isLoggedIn, loading: authLoading } = useAuth();
  const { isAdmin } = useAdmin();
  const { setShowLogin } = useModals();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasCheckedOnboarding, setHasCheckedOnboarding] = useState(false);

  // Check if user should see onboarding once auth is loaded
  useEffect(() => {
    // Don't check until auth is loaded and we haven't checked yet
    if (authLoading || hasCheckedOnboarding) {
      return;
    }

    // Check if user has seen onboarding
    const hasSeenOnboardingStored = localStorage.getItem('oriri-onboarding-seen');
    const hasSeenOnboarding = hasSeenOnboardingStored === 'true';
    
    console.log('[UserFlowCoordinator] Checking onboarding:', { 
      hasSeenOnboarding, 
      isAdmin, 
      isLoggedIn,
      authLoading 
    });

    // Show onboarding for first-time visitors who:
    // 1. Haven't seen onboarding before
    // 2. Are not admin
    // 3. Are not currently logged in
    if (!hasSeenOnboarding && !isAdmin && !isLoggedIn) {
      // Delay to ensure splash screen has completed (splash is 1500ms + auth load time)
      const timer = setTimeout(() => {
        console.log('[UserFlowCoordinator] Showing onboarding for first-time visitor');
        setShowOnboarding(true);
      }, 500); // Short delay after splash completes
      
      setHasCheckedOnboarding(true);
      return () => clearTimeout(timer);
    }
    
    setHasCheckedOnboarding(true);
  }, [authLoading, isAdmin, isLoggedIn, hasCheckedOnboarding]);

  // Handle admin login welcome
  useEffect(() => {
    if (isAdmin && isLoggedIn && user?.email === 'admin@oriri.com') {
      const hasShownAdminWelcome = sessionStorage.getItem('oriri-admin-welcome-shown');
      if (!hasShownAdminWelcome) {
        toast.success('Welcome back, Admin! 🛡️ You have full dashboard access.', {
          duration: 5000,
          description: 'Access your admin dashboard from the profile menu.'
        });
        sessionStorage.setItem('oriri-admin-welcome-shown', 'true');
      }
    }
  }, [isAdmin, isLoggedIn, user]);

  const handleOnboardingComplete = () => {
    console.log('[UserFlowCoordinator] Onboarding completed');
    setShowOnboarding(false);
    localStorage.setItem('oriri-onboarding-seen', 'true');
    
    // Encourage sign up after onboarding
    setTimeout(() => {
      if (!isLoggedIn) {
        toast.info('Ready to get started? Create an account to unlock more features!', {
          duration: 8000,
          action: {
            label: 'Sign Up',
            onClick: () => {
              console.log('[UserFlowCoordinator] Opening sign up modal');
              setShowLogin(true);
            }
          }
        });
      }
    }, 1000); // Shorter delay for better UX
  };

  const handleOnboardingSkip = () => {
    console.log('[UserFlowCoordinator] Onboarding skipped');
    setShowOnboarding(false);
    localStorage.setItem('oriri-onboarding-seen', 'true');
    
    // Still offer sign up but with less urgency
    setTimeout(() => {
      if (!isLoggedIn) {
        toast('You can sign up anytime to unlock more features', {
          duration: 5000,
        });
      }
    }, 2000);
  };

  return (
    <>
      {children}
      
      {showOnboarding && (
        <OnboardingFlow
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      )}
    </>
  );
}

export default UserFlowCoordinator;