import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../contexts/CartContext';
import ErrorBoundary from './ErrorBoundary';

// Import components directly since they already exist
// Removed unused episode screen imports
import SimpleRSSEpisodesScreen from './SimpleRSSEpisodesScreen'; // Simplified RSS episodes screen
import UnifiedEpisodeDetailScreen from './UnifiedEpisodeDetailScreen'; // Unified episode detail screen with consistent layout
import TestRSSScreen from './TestRSSScreen';
import EpisodeDetailScreen from './EpisodeDetailScreen';
import LiveSessionsScreen from './LiveSessionsScreen';
import CommunityScreen from './CommunityScreen';
import StoreScreen from './StoreScreen';
import ProductDetailScreen from './ProductDetailScreen';
import CheckoutScreen from './CheckoutScreen';
import OrderConfirmationScreen from './OrderConfirmationScreen';
import SettingsScreen from './SettingsScreen';
import AdminDashboard from './AdminDashboard';
import AdminProtectedRoute from './AdminProtectedRoute'; // Admin route protection
import AuthCallback from './AuthCallback';
import LinksScreen from './social/LinksScreen';
import OririLoader from './OririLoader';

// Loading component for Suspense fallbacks
const LoadingFallback = () => <OririLoader variant="page" />;

// Old wrapper removed - using new EpisodeDetailWrapper from separate file

// Main Routes Component
function AppRoutes({ 
  onPlayEpisode, 
  onShowLogin,
  onLogout
}: {
  onPlayEpisode: (episode: any) => void;
  onShowLogin: () => void;
  onLogout: () => void;
}) {
  const { isLoggedIn } = useAuth();
  const { cart, addToCart, updateCart, removeFromCart, currency, setCurrency } = useCart();
  const navigate = useNavigate();

  const handleEpisodeSelectWithNavigation = (episode: any) => {
    navigate(`/episode/${episode.id}`);
  };

  const handleBackFromEpisode = () => {
    // This will be handled by the EpisodeDetailWrapper
  };

  return (
    <ErrorBoundary>
      <Routes>
          {/* The old pink podcast home is retired: the Wellness Bestie home at / is the home now */}
          <Route path="/podcast" element={<Navigate to="/" replace />} />
          
          <Route path="/episodes" element={
            <SimpleRSSEpisodesScreen />
          } />
          
          <Route path="/test-rss" element={
            <TestRSSScreen />
          } />
          
          <Route path="/episode/:id" element={
            <UnifiedEpisodeDetailScreen />
          } />
          
          <Route path="/live" element={
            <LiveSessionsScreen 
              onEpisodeSelect={handleEpisodeSelectWithNavigation}
              isAdmin={false}
            />
          } />
          
          <Route path="/community" element={
            <CommunityScreen isLoggedIn={isLoggedIn} />
          } />
          
          <Route path="/store" element={
            <StoreScreen />
          } />
          
          <Route path="/store/product/:id" element={
            <ProductDetailScreen />
          } />
          
          <Route path="/store/checkout" element={
            <CheckoutScreen />
          } />
          
          <Route path="/store/order-confirmation" element={
            <OrderConfirmationScreen />
          } />
          
          <Route path="/settings" element={
            <ErrorBoundary>
              <SettingsScreen onBack={() => {
                try {
                  navigate(-1);
                } catch (error) {
                  console.error('Navigation error:', error);
                  navigate('/');
                }
              }} />
            </ErrorBoundary>
          } />
          
          {/* Old /admin/dashboard bookmarks keep their query (?tab=...) */}
          <Route path="/admin/dashboard" element={<DashboardRedirect />} />

          {/* Old admin dashboard (the new Admin lives at /admin) - Protected - Only accessible by admin users */}
          <Route path="/admin/legacy" element={
            <AdminProtectedRoute onShowLogin={onShowLogin}>
              <AdminDashboard />
            </AdminProtectedRoute>
          } />

          {/* OAuth callback — handles Google/Apple sign-in redirect */}
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Nourish wellness tool — auth gate is handled inside the component */}
          {/* "nourish by ORIRI" is retired: all Nourish URLs go to the Wellness Bestie home */}
          <Route path="/nourish" element={<Navigate to="/" replace />} />
          <Route path="/nourish/*" element={<Navigate to="/" replace />} />

          {/* Link-in-bio landing page (public). /renee is an alias for bios. */}
          <Route path="/links" element={<LinksScreen />} />
          <Route path="/renee" element={<LinksScreen />} />

          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}

// Main Router Component (no BrowserRouter wrapper since it's handled in main.tsx)
function DashboardRedirect() {
  const { search } = useLocation();
  return <Navigate to={`/admin/legacy${search}`} replace />;
}

export default function AppRouter(props: {
  onPlayEpisode: (episode: any) => void;
  onShowLogin: () => void;
  onLogout: () => void;
}) {
  return <AppRoutes {...props} />;
}