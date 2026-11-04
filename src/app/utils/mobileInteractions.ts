// Mobile touch interaction utilities
export class MobileInteractions {
  // Haptic feedback for supported devices
  static vibrate(pattern: number | number[] = 10) {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }

  // Light haptic feedback for button taps
  static lightTap() {
    this.vibrate(10);
  }

  // Medium haptic feedback for selections
  static mediumTap() {
    this.vibrate(25);
  }

  // Strong haptic feedback for important actions
  static strongTap() {
    this.vibrate([30, 10, 30]);
  }

  // Error haptic feedback
  static errorTap() {
    this.vibrate([100, 50, 100, 50, 100]);
  }

  // Success haptic feedback
  static successTap() {
    this.vibrate([50, 25, 50]);
  }

  // Add touch feedback to element
  static addTouchFeedback(element: HTMLElement, type: 'light' | 'medium' | 'strong' = 'light') {
    const handleTouchStart = () => {
      element.style.transform = 'scale(0.95)';
      element.style.transition = 'transform 0.1s ease-out';
      
      switch (type) {
        case 'light':
          this.lightTap();
          break;
        case 'medium':
          this.mediumTap();
          break;
        case 'strong':
          this.strongTap();
          break;
      }
    };

    const handleTouchEnd = () => {
      element.style.transform = 'scale(1)';
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    // Cleanup function
    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);
    };
  }

  // Check if device supports touch
  static isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  // Get safe area insets for devices with notches
  static getSafeAreaInsets() {
    const style = getComputedStyle(document.documentElement);
    return {
      top: parseInt(style.getPropertyValue('env(safe-area-inset-top)')) || 0,
      right: parseInt(style.getPropertyValue('env(safe-area-inset-right)')) || 0,
      bottom: parseInt(style.getPropertyValue('env(safe-area-inset-bottom)')) || 0,
      left: parseInt(style.getPropertyValue('env(safe-area-inset-left)')) || 0,
    };
  }
}

// React hook for touch interactions
import { useEffect, useRef } from 'react';

export function useTouchFeedback(type: 'light' | 'medium' | 'strong' = 'light') {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || !MobileInteractions.isTouchDevice()) return;

    const cleanup = MobileInteractions.addTouchFeedback(element, type);
    return cleanup;
  }, [type]);

  return ref;
}

// Loading state manager
export class LoadingStateManager {
  private static loadingStates = new Map<string, boolean>();
  private static listeners = new Map<string, Set<(loading: boolean) => void>>();

  static setLoading(key: string, loading: boolean) {
    this.loadingStates.set(key, loading);
    const listeners = this.listeners.get(key);
    if (listeners) {
      listeners.forEach(listener => listener(loading));
    }
  }

  static isLoading(key: string): boolean {
    return this.loadingStates.get(key) || false;
  }

  static subscribe(key: string, listener: (loading: boolean) => void) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)?.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.get(key)?.delete(listener);
    };
  }
}

// React hook for loading states
import { useState } from 'react';

export function useLoadingState(key: string) {
  const [loading, setLoading] = useState(LoadingStateManager.isLoading(key));

  useEffect(() => {
    const unsubscribe = LoadingStateManager.subscribe(key, setLoading);
    return unsubscribe;
  }, [key]);

  const setLoadingState = (loading: boolean) => {
    LoadingStateManager.setLoading(key, loading);
  };

  return [loading, setLoadingState] as const;
}