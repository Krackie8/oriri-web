import React, { useState, useEffect } from 'react';
import SplashScreen from './SplashScreen';
import { useAuth } from '../hooks/useAuth';

interface SplashWrapperProps {
  children: React.ReactNode;
}

export const SplashWrapper: React.FC<SplashWrapperProps> = ({ children }) => {
  const { loading: authLoading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [authLoading]);

  if (showSplash || authLoading) {
    return <SplashScreen />;
  }

  return <>{children}</>;
};