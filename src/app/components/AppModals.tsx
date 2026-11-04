import React from 'react';
import SearchScreen from './SearchScreen';
import SideMenu from './SideMenu';
import LoginScreen from './LoginScreen';
import AudioPlayer from './AudioPlayer';
import { CartModal } from './CartModal';
import { useModals } from '../contexts/ModalContext';
import { useAuth } from '../hooks/useAuth';
import { useEpisodePlayer } from '../hooks/useEpisodePlayer';

interface AppModalsProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onGuestMode: () => void;
  onLogout: () => Promise<void>;
}

export const AppModals: React.FC<AppModalsProps> = ({ 
  onLogin, 
  onGuestMode, 
  onLogout 
}) => {
  const { 
    showSearch, 
    setShowSearch,
    showSideMenu, 
    setShowSideMenu,
    showLogin, 
    setShowLogin,
    showAudioPlayer, 
    setShowAudioPlayer 
  } = useModals();
  
  const { isLoggedIn } = useAuth();
  const { currentEpisode, miniPlayerControls } = useEpisodePlayer();

  const handleExpandAudioPlayer = () => {
    setShowAudioPlayer(true);
  };

  return (
    <>
      {/* Search Screen */}
      {showSearch && (
        <SearchScreen
          isOpen={showSearch}
          onClose={() => setShowSearch(false)}
        />
      )}

      {/* Side Menu */}
      {showSideMenu && (
        <SideMenu
          isOpen={showSideMenu}
          onClose={() => setShowSideMenu(false)}
          isLoggedIn={isLoggedIn}
          onLogout={onLogout}
          onLoginClick={() => setShowLogin(true)}
        />
      )}

      {/* Login Modal */}
      {showLogin && (
        <LoginScreen 
          onClose={() => setShowLogin(false)}
          onLogin={onLogin}
          onGuestMode={onGuestMode}
        />
      )}

      {/* Cart Modal */}
      <CartModal />

      {/* Full Audio Player */}
      {currentEpisode && (
        <AudioPlayer
          episode={currentEpisode}
          isOpen={showAudioPlayer}
          onClose={() => setShowAudioPlayer(false)}
          onNext={miniPlayerControls.onNext}
          onPrevious={miniPlayerControls.onPrevious}
        />
      )}
    </>
  );
};