import React, { useState, useRef, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { audioService } from '../utils/audioService';
import { useAuth } from './useAuth';
import * as listeningApi from '../utils/listeningApi';
import * as journeyApi from '../utils/journeyApi';

// Temporary mock for testing
const errorTracker = {
  trackUserAction: (action: string, data?: any) => console.debug('[MockErrorTracker]', action, data),
  trackAudioError: (error: any) => console.debug('[MockErrorTracker] Audio error:', error)
};

const serviceWorkerManager = {
  onStateChange: () => () => {},
  onOfflineChange: () => () => {},
  requestNotificationPermission: () => Promise.resolve(false),
  isAudioCached: (url: string) => Promise.resolve(false),
  cacheAudio: (url: string, episodeId: string) => {
    console.debug('[MockServiceWorker] Audio cache requested:', url, episodeId);
  }
};

export interface AudioPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  loading: boolean;
  error: string | null;
  buffered: number;
}

export interface AudioPlayerActions {
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  load: (src: string) => void;
  loadWithFallback: (primarySrc: string, fallbackSrcs: string[]) => void;
  reset: () => void;
}

export interface Episode {
  id: string;
  title: string;
  guest?: { name: string };
  image: string;
  audioUrl: string;
  duration?: number;
}

interface GlobalAudioContextType {
  state: AudioPlayerState;
  actions: AudioPlayerActions & {
    loadEpisode: (episode: Episode) => Promise<void>;
    playEpisode: (episode: Episode) => Promise<void>;
    playNext: () => void;
    playPrevious: () => void;
    setQueue: (episodes: Episode[], startIndex?: number) => void;
  };
  currentEpisode: Episode | null;
  setCurrentEpisode: (episode: Episode | null) => void;
  queue: Episode[];
  queueIndex: number;
}

const GlobalAudioContext = createContext<GlobalAudioContextType | undefined>(undefined);

// Global audio player provider that manages a single audio instance
export function GlobalAudioProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fallbackUrlsRef = useRef<string[]>([]);
  const currentUrlIndexRef = useRef<number>(0);
  const mountedRef = useRef<boolean>(true);
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);

  // Continue Listening / Journey plumbing. Refs so the once-registered audio
  // event handlers can read the latest values without re-binding listeners.
  // Every network call here is fire-and-forget and must never block playback.
  const tokenRef = useRef<string | undefined>(undefined);
  const currentEpisodeRef = useRef<Episode | null>(null);
  const lastSaveRef = useRef<number>(0);
  const resumeTargetRef = useRef<number | null>(null);
  const journeyRecordedRef = useRef<Set<string>>(new Set());

  tokenRef.current = session?.access_token;
  useEffect(() => { currentEpisodeRef.current = currentEpisode; }, [currentEpisode]);
  const queueRef = useRef<Episode[]>([]);
  const queueIndexRef = useRef<number>(-1);
  const [queue, setQueueState] = useState<Episode[]>([]);
  const [queueIndex, setQueueIndexState] = useState<number>(-1);
  const playNextRef = useRef<() => void>(() => {});
  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    loading: false,
    error: null,
    buffered: 0
  });

  // Initialize audio element only once
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    // Persist playback position for "Continue Listening". Fire-and-forget: a
    // failure (paused function, logged-out, offline) is silently ignored so it
    // can never interfere with playback.
    const saveProgressNow = (position: number) => {
      const ep = currentEpisodeRef.current;
      const token = tokenRef.current;
      if (!ep || !token || !audio.duration || !isFinite(audio.duration)) return;
      void listeningApi.saveProgress(token, {
        episodeId: ep.id,
        position,
        duration: audio.duration,
        title: ep.title,
        image: ep.image,
      });
    };

    // Audio event listeners with error tracking
    const handleTimeUpdate = () => {
      if (!mountedRef.current) return;
      setState(prev => ({
        ...prev,
        currentTime: audio.currentTime
      }));

      // Throttled progress save (~every 10s of playback).
      const now = Date.now();
      if (now - lastSaveRef.current > 10000) {
        lastSaveRef.current = now;
        saveProgressNow(audio.currentTime);
      }
    };

    const handleDurationChange = () => {
      if (!mountedRef.current) return;
      setState(prev => ({
        ...prev,
        duration: audio.duration || 0
      }));
    };

    const handleLoadStart = () => {
      if (!mountedRef.current) return;
      console.log('Audio loading started');
      setState(prev => ({
        ...prev,
        loading: true,
        error: null
      }));
    };

    const handleCanPlay = () => {
      if (!mountedRef.current) return;
      const currentUrl = fallbackUrlsRef.current[currentUrlIndexRef.current] || 'unknown';
      console.log(`Audio can play - successfully loaded from source ${currentUrlIndexRef.current + 1}/${fallbackUrlsRef.current.length}: ${currentUrl}`);
      
      // Clear timeout when audio is ready
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: null // Clear any previous errors
      }));

      // Resume from a saved position exactly once per load. Guarded so a replay
      // of a finished episode (no saved point) starts from the beginning.
      if (resumeTargetRef.current != null && audio.duration && isFinite(audio.duration)) {
        const target = resumeTargetRef.current;
        resumeTargetRef.current = null;
        if (target > 5 && target < audio.duration - 1) {
          try { audio.currentTime = target; } catch { /* seek unsupported yet — ignore */ }
        }
      }

      // Track successful audio load
      errorTracker.trackUserAction('audio_loaded_successfully', {
        url: currentUrl,
        episode: currentEpisode?.title
      });
    };

    const handleError = (e: Event) => {
      if (!mountedRef.current) return;
      const audioElement = e.target as HTMLAudioElement;
      const errorCode = audioElement?.error?.code;
      const errorMessage = audioElement?.error?.message;
      
      let userFriendlyMessage = 'Failed to load audio';
      
      if (errorCode) {
        switch (errorCode) {
          case 1: // MEDIA_ERR_ABORTED
            userFriendlyMessage = 'Audio loading was aborted';
            break;
          case 2: // MEDIA_ERR_NETWORK
            userFriendlyMessage = 'Network error loading audio';
            break;
          case 3: // MEDIA_ERR_DECODE
            userFriendlyMessage = 'Audio format not supported';
            break;
          case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
            userFriendlyMessage = 'Audio source not available';
            break;
          default:
            userFriendlyMessage = 'Unknown audio error';
        }
      }
      
      // Track audio error
      errorTracker.trackAudioError({
        episodeId: currentEpisode?.id,
        audioUrl: audioElement?.src,
        errorCode,
        errorMessage: errorMessage || userFriendlyMessage,
        currentTime: audioElement?.currentTime,
        duration: audioElement?.duration
      });
      
      console.error('Audio error details:', {
        code: errorCode,
        message: errorMessage,
        src: audioElement?.src,
        userFriendlyMessage,
        currentUrlIndex: currentUrlIndexRef.current,
        fallbackUrls: fallbackUrlsRef.current
      });

      // Try fallback URL if available
      if (fallbackUrlsRef.current.length > 0 && currentUrlIndexRef.current < fallbackUrlsRef.current.length - 1) {
        currentUrlIndexRef.current += 1;
        const nextUrl = fallbackUrlsRef.current[currentUrlIndexRef.current];
        console.log(`Trying fallback URL ${currentUrlIndexRef.current + 1}/${fallbackUrlsRef.current.length}: ${nextUrl}`);
        
        // Clear previous error state while trying fallback
        setState(prev => ({ 
          ...prev, 
          error: null, 
          loading: true 
        }));
        
        // Try the next URL
        setTimeout(() => {
          if (audioRef.current && mountedRef.current) {
            audioRef.current.src = nextUrl;
            audioRef.current.load();
          }
        }, 500);
        return;
      }
      
      // No more fallback URLs, show error
      console.log('All audio sources failed, showing user-friendly error');
      setState(prev => ({
        ...prev,
        loading: false,
        error: `Audio playback is not available in this environment. This may be due to browser restrictions or network limitations.`
      }));
    };

    const handleEnded = () => {
      if (!mountedRef.current) return;

      // Save at the very end so the server drops this episode from Continue
      // Listening (position/duration > 0.97).
      saveProgressNow(audio.duration || 0);

      setState(prev => ({
        ...prev,
        isPlaying: false,
        currentTime: 0
      }));

      errorTracker.trackUserAction('audio_playback_ended', {
        episode: currentEpisode?.title
      });

      // Auto-advance to next episode in queue
      playNextRef.current();
    };

    const handleProgress = () => {
      if (!mountedRef.current) return;
      if (audio.buffered.length > 0) {
        const buffered = audio.buffered.end(audio.buffered.length - 1);
        setState(prev => ({
          ...prev,
          buffered
        }));
      }
    };

    const handlePlay = () => {
      if (!mountedRef.current) return;
      setState(prev => ({ ...prev, isPlaying: true }));
    };

    const handlePause = () => {
      if (!mountedRef.current) return;
      // Capture the exact spot the listener stopped at.
      saveProgressNow(audio.currentTime);
      setState(prev => ({ ...prev, isPlaying: false }));
    };

    // Add event listeners
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('progress', handleProgress);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      // Save final position before tearing down (best-effort).
      if (audio.currentTime > 0) saveProgressNow(audio.currentTime);

      mountedRef.current = false;

      // Clear timeout on cleanup
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
      
      // Cleanup
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('progress', handleProgress);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      
      try {
        audio.pause();
        audio.src = '';
        audio.load(); // Force cleanup
      } catch (error) {
        console.warn('Error during audio cleanup:', error);
      }
    };
  }, []);

  const play = useCallback(async () => {
    if (audioRef.current && mountedRef.current) {
      try {
        // Clear any previous errors
        setState(prev => ({ ...prev, error: null }));
        await audioRef.current.play();
        
        errorTracker.trackUserAction('audio_play_attempted', {
          episode: currentEpisode?.title,
          success: true
        });
        
        if (errorTracker) {
          errorTracker.trackUserAction('audio_play_attempted', {
            episode: currentEpisode?.title,
            success: true
          });
        }
      } catch (error: any) {
        console.error('Audio play failed:', error);
        let errorMessage = 'Playback failed';
        
        // Provide more specific error messages
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Playback blocked by browser. Please click to play.';
        } else if (error.name === 'NotSupportedError') {
          errorMessage = 'Audio format not supported.';
        } else if (error.name === 'AbortError') {
          errorMessage = 'Playback interrupted.';
        }
        
        if (errorTracker) {
          errorTracker.trackAudioError({
            episodeId: currentEpisode?.id,
            audioUrl: audioRef.current?.src,
            errorMessage: error.message,
            currentTime: audioRef.current?.currentTime
          });
        }
        
        setState(prev => ({
          ...prev,
          error: errorMessage,
          isPlaying: false
        }));
      }
    }
  }, [currentEpisode]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  const togglePlay = useCallback(() => {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [state.isPlaying, play, pause]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, Math.min(time, state.duration));
    }
  }, [state.duration]);

  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    if (audioRef.current) {
      audioRef.current.volume = clampedVolume;
    }
    setState(prev => ({
      ...prev,
      volume: clampedVolume
    }));
  }, []);

  const load = useCallback(async (src: string) => {
    if (!audioRef.current || !mountedRef.current) {
      console.error('Audio element not available');
      return;
    }
    
    // Validate the source URL
    if (!src || src === '#' || src === '') {
      console.error('Invalid audio source provided:', src);
      setState(prev => ({ 
        ...prev, 
        error: 'Invalid audio source',
        loading: false 
      }));
      return;
    }
    
    // Check if source looks like a webpage URL instead of audio file
    if (src.includes('/episodes/') && !src.includes('.mp3') && !src.includes('.m4a') && !src.includes('.wav')) {
      console.error('Source appears to be a webpage URL, not an audio file:', src);
      setState(prev => ({ 
        ...prev, 
        error: 'Invalid audio source - webpage URL detected',
        loading: false 
      }));
      return;
    }
    
    console.log('Loading audio from:', src);
    setState(prev => ({ ...prev, error: null, loading: true }));
    
    // Reset fallback mechanism for single URL load
    fallbackUrlsRef.current = [];
    currentUrlIndexRef.current = 0;
    
    try {
      // Reset audio element state
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      
      // Clear any existing timeout
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
      
      // Set new source and load
      audioRef.current.src = src;
      audioRef.current.preload = 'metadata';
      
      // Try different CORS settings based on URL
      if (src.startsWith('data:') || src.startsWith('blob:')) {
        // For data URLs and blob URLs, no CORS needed
        audioRef.current.crossOrigin = null;
      } else if (src.includes('cloudfront.net') || src.includes('anchor.fm')) {
        // For CDN URLs, try anonymous CORS first
        audioRef.current.crossOrigin = 'anonymous';
      } else {
        // For other external URLs, try without CORS first
        audioRef.current.crossOrigin = null;
      }
      
      audioRef.current.load();
      
      // Add a timeout to detect loading failures
      loadTimeoutRef.current = setTimeout(() => {
        if (audioRef.current && audioRef.current.readyState < 2 && mountedRef.current) {
          console.error('Audio loading timeout for URL:', src);
          
          // Try alternative CORS setting if initial load fails
          if (audioRef.current.crossOrigin === 'anonymous') {
            console.log('Retrying without CORS...');
            audioRef.current.crossOrigin = null;
            audioRef.current.load();
            
            // Give it another chance
            setTimeout(() => {
              if (audioRef.current && audioRef.current.readyState < 2 && mountedRef.current) {
                if (errorTracker) {
                  errorTracker.trackAudioError({
                    episodeId: currentEpisode?.id,
                    audioUrl: src,
                    errorMessage: 'Audio loading timeout after CORS retry'
                  });
                }
                
                setState(prev => ({ 
                  ...prev, 
                  error: 'Audio loading timeout - the audio file may not be available',
                  loading: false 
                }));
              }
            }, 10000);
          } else {
            if (errorTracker) {
              errorTracker.trackAudioError({
                episodeId: currentEpisode?.id,
                audioUrl: src,
                errorMessage: 'Audio loading timeout'
              });
            }
            
            setState(prev => ({ 
              ...prev, 
              error: 'Audio loading timeout - the audio file may not be available',
              loading: false 
            }));
          }
        }
      }, 15000); // 15 second timeout
      
    } catch (error) {
      console.error('Failed to load audio:', error);
      
      if (errorTracker) {
        errorTracker.trackAudioError({
          episodeId: currentEpisode?.id,
          audioUrl: src,
          errorMessage: 'Failed to load audio file'
        });
      }
      
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to load audio file',
        loading: false 
      }));
    }
  }, [currentEpisode]);

  const loadWithFallback = useCallback(async (primarySrc: string, fallbackSrcs: string[]) => {
    if (!audioRef.current || !mountedRef.current) {
      console.error('Audio element not available');
      return;
    }
    
    // Set up fallback mechanism
    fallbackUrlsRef.current = [primarySrc, ...fallbackSrcs];
    currentUrlIndexRef.current = 0;
    
    console.log('Loading audio with fallback mechanism. URLs:', fallbackUrlsRef.current);
    setState(prev => ({ ...prev, error: null, loading: true }));
    
    try {
      // Reset audio element state
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      
      // Clear any existing timeout
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
      
      // Set primary source and load
      audioRef.current.src = primarySrc;
      audioRef.current.preload = 'metadata';
      audioRef.current.crossOrigin = 'anonymous';
      audioRef.current.load();
      
      // Add a timeout to detect loading failures
      loadTimeoutRef.current = setTimeout(() => {
        if (audioRef.current && audioRef.current.readyState < 2 && mountedRef.current) {
          console.error('Audio loading timeout for URL:', primarySrc);
          // Trigger fallback by simulating an error
          const errorEvent = new Event('error');
          audioRef.current.dispatchEvent(errorEvent);
        }
      }, 10000); // 10 second timeout for fallback
      
    } catch (error) {
      console.error('Failed to load audio:', error);
      
      if (errorTracker) {
        errorTracker.trackAudioError({
          episodeId: currentEpisode?.id,
          audioUrl: primarySrc,
          errorMessage: 'Failed to load audio file with fallback'
        });
      }
      
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to load audio file',
        loading: false 
      }));
    }
  }, [currentEpisode]);

  // Enhanced load function that uses audioService
  const loadEpisode = useCallback(async (episode: Episode) => {
    if (!mountedRef.current) return;
    
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Look up a saved position so handleCanPlay can resume once loaded.
      // Best-effort; never blocks the load if it fails.
      resumeTargetRef.current = null;
      if (tokenRef.current) {
        const progress = await listeningApi.getProgressFor(tokenRef.current, episode.id);
        if (progress.ok && progress.data && progress.data.position > 5) {
          resumeTargetRef.current = progress.data.position;
        }
      }

      // Get audio sources from audioService with the episode data
      const audioData = await audioService.getEpisodeAudioData(episode.id, episode.title, episode);
      
      // Check if this is an external platform episode
      if (audioData.isExternalPlatform) {
        const platformName = audioData.platform === 'spotify' ? 'Spotify' : 
                           audioData.platform === 'apple' ? 'Apple Podcasts' : 
                           audioData.platform === 'youtube' ? 'YouTube' : 'the platform';
        
        setState(prev => ({ 
          ...prev, 
          error: `Audio playback is not available for ${platformName} episodes. Please use the external link to listen on ${platformName}.`,
          loading: false 
        }));
        return;
      }
      
      if (audioData.primaryUrl) {
        // Use the load function for VIP episodes with direct URLs
        if (audioData.fallbackUrls.length > 0) {
          await loadWithFallback(audioData.primaryUrl, audioData.fallbackUrls);
        } else {
          await load(audioData.primaryUrl);
        }
        
        // Try to cache audio for offline use if it's a real URL (not generated)
        if (audioData.primaryUrl && !audioData.primaryUrl.startsWith('data:') && !audioData.primaryUrl.startsWith('blob:')) {
          if (await serviceWorkerManager.isAudioCached(audioData.primaryUrl) === false) {
            serviceWorkerManager.cacheAudio(audioData.primaryUrl, episode.id);
          }
        }
      } else {
        throw new Error('No audio sources available');
      }
      
    } catch (error) {
      console.error('Failed to load episode audio:', error);
      
      if (errorTracker) {
        errorTracker.trackAudioError({
          episodeId: episode.id,
          errorMessage: `Failed to load episode: ${error.message}`
        });
      }
      
      setState(prev => ({ 
        ...prev, 
        error: 'Unable to load episode audio',
        loading: false 
      }));
    }
  }, [loadWithFallback, load]);

  // Play episode function - combines loading and playing
  const playEpisode = useCallback(async (episode: Episode) => {
    if (!mountedRef.current) return;
    
    try {
      // Set the current episode first
      setCurrentEpisode(episode);
      
      // Load the episode
      await loadEpisode(episode);
      
      // If loading was successful, play it
      if (!state.error && !state.loading) {
        await play();

        // Record one listen toward the Oriri Journey, deduped per episode/day.
        // Fire-and-forget so it can never affect playback.
        const token = tokenRef.current;
        if (token) {
          const key = `${episode.id}_${new Date().toISOString().slice(0, 10)}`;
          if (!journeyRecordedRef.current.has(key)) {
            journeyRecordedRef.current.add(key);
            void journeyApi.recordListen(token);
          }
        }

        // One-time soft prompt inviting the listener to enable push. Fully
        // guarded and fire-and-forget so it can never affect playback.
        try {
          if (
            typeof window !== 'undefined' &&
            !localStorage.getItem('oriri-push-prompted') &&
            'Notification' in window &&
            Notification.permission === 'default'
          ) {
            localStorage.setItem('oriri-push-prompted', '1');
            import('sonner')
              .then(({ toast }) => {
                toast('Never miss a new episode', {
                  description: 'Turn on notifications in Settings to get alerts.',
                  duration: 8000,
                });
              })
              .catch(() => {});
          }
        } catch {
          // Ignore — the prompt is best-effort.
        }
      }

    } catch (error) {
      console.error('Failed to play episode:', error);
      
      if (errorTracker) {
        errorTracker.trackAudioError({
          episodeId: episode.id,
          errorMessage: `Failed to play episode: ${error.message}`
        });
      }
      
      setState(prev => ({ 
        ...prev, 
        error: 'Unable to play episode',
        loading: false 
      }));
    }
  }, [loadEpisode, play, state.error, state.loading]);

  const setQueue = useCallback((episodes: Episode[], startIndex = 0) => {
    queueRef.current = episodes;
    queueIndexRef.current = startIndex;
    setQueueState(episodes);
    setQueueIndexState(startIndex);
  }, []);

  const playNext = useCallback(() => {
    const nextIndex = queueIndexRef.current + 1;
    if (nextIndex < queueRef.current.length) {
      queueIndexRef.current = nextIndex;
      setQueueIndexState(nextIndex);
      const nextEpisode = queueRef.current[nextIndex];
      setCurrentEpisode(nextEpisode);
      load(nextEpisode.audioUrl);
    }
  }, [load]);

  const playPrevious = useCallback(() => {
    const prevIndex = queueIndexRef.current - 1;
    if (prevIndex >= 0) {
      queueIndexRef.current = prevIndex;
      setQueueIndexState(prevIndex);
      const prevEpisode = queueRef.current[prevIndex];
      setCurrentEpisode(prevEpisode);
      load(prevEpisode.audioUrl);
    }
  }, [load]);

  // Keep the ref in sync so handleEnded can call the latest version
  useEffect(() => {
    playNextRef.current = playNext;
  }, [playNext]);

  const reset = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = '';
    }
    setState({
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 1,
      loading: false,
      error: null,
      buffered: 0
    });
    setCurrentEpisode(null);
    
    // Clear any existing timeout
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
    
    if (errorTracker) {
      errorTracker.trackUserAction('audio_player_reset');
    }
  }, []);

  // Memoize actions to prevent unnecessary re-renders
  const actions = React.useMemo<AudioPlayerActions & {
    loadEpisode: (episode: Episode) => Promise<void>;
    playEpisode: (episode: Episode) => Promise<void>;
    playNext: () => void;
    playPrevious: () => void;
    setQueue: (episodes: Episode[], startIndex?: number) => void;
  }>(() => ({
    play,
    pause,
    togglePlay,
    seek,
    setVolume,
    load,
    loadWithFallback,
    loadEpisode,
    playEpisode,
    playNext,
    playPrevious,
    setQueue,
    reset
  }), [play, pause, togglePlay, seek, setVolume, load, loadWithFallback, loadEpisode, playEpisode, playNext, playPrevious, setQueue, reset]);

  const contextValue = React.useMemo(() => ({
    state,
    actions,
    currentEpisode,
    setCurrentEpisode,
    queue,
    queueIndex
  }), [state, actions, currentEpisode, queue, queueIndex]);

  return (
    <GlobalAudioContext.Provider value={contextValue}>
      {children}
    </GlobalAudioContext.Provider>
  );
}

// Hook to use the global audio player
export function useGlobalAudioPlayer() {
  const context = useContext(GlobalAudioContext);
  if (context === undefined) {
    throw new Error('useGlobalAudioPlayer must be used within a GlobalAudioProvider');
  }

  return {
    ...context,
    playEpisode: context.actions.playEpisode,
    isPlaying: context.state.isPlaying,
    queue: context.queue,
    queueIndex: context.queueIndex,
    hasNext: context.queueIndex < context.queue.length - 1,
    hasPrevious: context.queueIndex > 0,
  };
}

// Utility functions for time formatting
export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatDuration(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}