import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ModalContextType {
  showLogin: boolean;
  showSearch: boolean;
  showSideMenu: boolean;
  showCart: boolean;
  showAudioPlayer: boolean;
  setShowLogin: (show: boolean) => void;
  setShowSearch: (show: boolean) => void;
  setShowSideMenu: (show: boolean) => void;
  setShowCart: (show: boolean) => void;
  setShowAudioPlayer: (show: boolean) => void;
  closeAllModals: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const useModals = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModals must be used within a ModalProvider');
  }
  return context;
};

interface ModalProviderProps {
  children: ReactNode;
}

export const ModalProvider: React.FC<ModalProviderProps> = ({ children }) => {
  const [showLogin, setShowLogin] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showAudioPlayer, setShowAudioPlayer] = useState(false);

  const closeAllModals = () => {
    setShowLogin(false);
    setShowSearch(false);
    setShowSideMenu(false);
    setShowCart(false);
    setShowAudioPlayer(false);
  };

  const value: ModalContextType = {
    showLogin,
    showSearch,
    showSideMenu,
    showCart,
    showAudioPlayer,
    setShowLogin,
    setShowSearch,
    setShowSideMenu,
    setShowCart,
    setShowAudioPlayer,
    closeAllModals,
  };

  return (
    <ModalContext.Provider value={value}>
      {children}
    </ModalContext.Provider>
  );
};