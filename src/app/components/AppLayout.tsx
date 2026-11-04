import React from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import BottomTabBar from './BottomTabBar';
import MiniPlayer from './MiniPlayer';
import AppRouter from './AppRouter';
import ErrorBoundary from './ErrorBoundary';
import { SocialFooter } from './social/SocialFooter';
import { useAuth } from '../hooks/useAuth';
import { useModals } from '../contexts/ModalContext';
import { useCart } from '../contexts/CartContext';
import { useEpisodePlayer } from '../hooks/useEpisodePlayer';
import { useReferralCapture } from '../hooks/useReferralCapture';

interface AppLayoutProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onLogout: () => Promise<void>;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ onLogin, onLogout }) => {
  const { isLoggedIn } = useAuth();
  const location = useLocation();
  // The link-in-bio page is a standalone poster and carries its own footer links.
  const hideFooter = ['/links', '/renee'].includes(location.pathname);
  const { setShowLogin, setShowSearch, setShowCart, setShowSideMenu, setShowAudioPlayer } = useModals();
  const { cartItemCount } = useCart();
  const { currentEpisode, playEpisode, miniPlayerControls } = useEpisodePlayer();

  // Record arrivals from shared ?ref= links
  useReferralCapture();

  const handleExpandAudioPlayer = () => {
    setShowAudioPlayer(true);
  };

  const miniPlayerControlsWithExpand = {
    ...miniPlayerControls,
    onExpand: handleExpandAudioPlayer
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <ErrorBoundary>
        <Header 
          isLoggedIn={isLoggedIn} 
          onLoginClick={() => setShowLogin(true)}
          onLogout={onLogout}
          onSearchClick={() => setShowSearch(true)}
          cartItemCount={cartItemCount}
          onCartClick={() => setShowCart(true)}
          onMenuClick={() => setShowSideMenu(true)}
        />
      </ErrorBoundary>

      {/* Main Content with Router */}
      <main className="flex-1 pb-[80px] pt-[60px]">
        <AppRouter
          onPlayEpisode={playEpisode}
          onShowLogin={() => setShowLogin(true)}
          onLogout={onLogout}
        />

        {/* Footer lives inside the scroll area so it clears the fixed tab bar */}
        {!hideFooter && (
          <ErrorBoundary>
            <SocialFooter />
          </ErrorBoundary>
        )}
      </main>

      {/* Bottom Tab Bar */}
      <ErrorBoundary>
        <BottomTabBar onShowLogin={() => setShowLogin(true)} />
      </ErrorBoundary>

      {/* Mini Player */}
      {currentEpisode && (
        <ErrorBoundary>
          <MiniPlayer
            episode={currentEpisode}
            {...miniPlayerControlsWithExpand}
          />
        </ErrorBoundary>
      )}
    </div>
  );
};