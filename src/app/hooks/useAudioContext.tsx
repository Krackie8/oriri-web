import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Episode } from './useAudioPlayer';

interface AudioContextType {
  currentEpisode: Episode | null;
  isPlaying: boolean;
  setCurrentEpisode: (episode: Episode | null) => void;
  setIsPlaying: (playing: boolean) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: ReactNode }) {
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <AudioContext.Provider value={{
      currentEpisode,
      isPlaying,
      setCurrentEpisode,
      setIsPlaying
    }}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudioContext() {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudioContext must be used within an AudioProvider');
  }
  return context;
}