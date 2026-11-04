import React, { Suspense } from 'react';
import ErrorBoundary from './ErrorBoundary';

// Import all contexts
import { GlobalAudioProvider } from '../hooks/useGlobalAudioPlayer';
import { CartProvider } from '../contexts/CartContext';
import { StoreProvider } from '../contexts/StoreContext';
import { ModalProvider } from '../contexts/ModalContext';
import { EpisodeInteractionProvider } from '../contexts/EpisodeInteractionContext';
import { LiveTipProvider } from '../contexts/LiveTipContext';
import { VipSubscriptionProvider } from '../contexts/VipSubscriptionContext';
import { PodcastPlatformProvider } from '../contexts/PodcastPlatformContext';
import { RSSEpisodesProvider } from '../contexts/RSSEpisodesContext';
import { AdminProvider } from '../contexts/AdminContext';
import { EpisodeManagementProvider } from '../contexts/EpisodeManagementContext';
import { EpisodeAnalyticsProvider } from '../contexts/EpisodeAnalyticsContext';
import { SocialMediaAutomationProvider } from '../contexts/SocialMediaAutomationContext';
import { CommunityEngagementProvider } from '../contexts/CommunityEngagementContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { SimplePodcastProvider } from '../contexts/SimplePodcastContext';

// Minimal loading fallback - should rarely be seen
const ProviderLoadingFallback = () => (
  <div className="flex items-center justify-center p-4">
    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
  </div>
);

// Group core providers (always needed) - no suspense to avoid blocking
function CoreProviders({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <GlobalAudioProvider>
        <CartProvider>
          <ModalProvider>
            <NotificationProvider>
              <SimplePodcastProvider>
                <RSSEpisodesProvider>
                  {children}
                </RSSEpisodesProvider>
              </SimplePodcastProvider>
            </NotificationProvider>
          </ModalProvider>
        </CartProvider>
      </GlobalAudioProvider>
    </ErrorBoundary>
  );
}

// Group feature providers (can be lazy loaded) - minimal suspense
function FeatureProviders({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <EpisodeInteractionProvider>
        <LiveTipProvider>
          <VipSubscriptionProvider>
            <StoreProvider>
              {children}
            </StoreProvider>
          </VipSubscriptionProvider>
        </LiveTipProvider>
      </EpisodeInteractionProvider>
    </ErrorBoundary>
  );
}

// Group admin providers (only needed for admin users) - minimal suspense
function AdminProviders({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <PodcastPlatformProvider>
        <AdminProvider>
          <EpisodeManagementProvider>
            <EpisodeAnalyticsProvider>
              <SocialMediaAutomationProvider>
                <CommunityEngagementProvider>
                  {children}
                </CommunityEngagementProvider>
              </SocialMediaAutomationProvider>
            </EpisodeAnalyticsProvider>
          </EpisodeManagementProvider>
        </AdminProvider>
      </PodcastPlatformProvider>
    </ErrorBoundary>
  );
}

// Main optimized provider component
export function OptimizedProviders({ children }: { children: React.ReactNode }) {
  return (
    <CoreProviders>
      <FeatureProviders>
        <AdminProviders>
          {children}
        </AdminProviders>
      </FeatureProviders>
    </CoreProviders>
  );
}

export default OptimizedProviders;