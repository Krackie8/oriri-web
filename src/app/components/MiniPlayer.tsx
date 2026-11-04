import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { TouchButton } from './ui/touch-button';
import { Progress } from './ui/progress';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward,
  X,
  ChevronUp,
  Loader2
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useGlobalAudioPlayer, formatTime, Episode } from '../hooks/useGlobalAudioPlayer';

interface MiniPlayerProps {
  episode: Episode;
  onNext: () => void;
  onPrevious: () => void;
  onClose: () => void;
  onExpand: () => void;
}

export default function MiniPlayer({
  episode,
  onNext,
  onPrevious,
  onClose,
  onExpand
}: MiniPlayerProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Wrap in try-catch to prevent crashes
  let audioPlayer, actions;
  try {
    const globalAudio = useGlobalAudioPlayer();
    audioPlayer = globalAudio.state;
    actions = globalAudio.actions;
  } catch (error) {
    console.error('Error accessing global audio player:', error);
    // Fallback state
    audioPlayer = {
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 1,
      loading: false,
      error: 'Audio player unavailable',
      buffered: 0
    };
    actions = {
      play: () => {},
      pause: () => {},
      togglePlay: () => {},
      seek: () => {},
      setVolume: () => {},
      load: () => {},
      reset: () => {}
    };
  }

  const progress = audioPlayer.duration > 0 ? (audioPlayer.currentTime / audioPlayer.duration) * 100 : 0;
  const bufferedProgress = audioPlayer.duration > 0 ? (audioPlayer.buffered / audioPlayer.duration) * 100 : 0;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    try {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const width = rect.width;
      const percentage = clickX / width;
      const newTime = percentage * audioPlayer.duration;
      actions.seek(newTime);
    } catch (error) {
      console.error('Error handling progress click:', error);
    }
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-[60px] left-4 right-4 z-40">
        <Card className="bg-card/95 backdrop-blur-sm border-border shadow-lg">
          <CardContent className="p-2">
            <div className="flex items-center gap-3">
              <ImageWithFallback
                src={episode.image}
                alt={episode.title}
                className="w-10 h-10 rounded object-cover"
              />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm truncate">{episode.title}</h4>
                {episode.guest?.name && (
                  <p className="text-xs text-muted-foreground truncate">
                    with {episode.guest.name}
                  </p>
                )}
              </div>
              <TouchButton
                variant="ghost"
                size="sm"
                onClick={actions.togglePlay}
                loading={audioPlayer.loading}
                hapticFeedback="medium"
                className="w-8 h-8 p-0"
              >
                {audioPlayer.isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </TouchButton>
              <TouchButton
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(false)}
                hapticFeedback="light"
                className="w-8 h-8 p-0"
              >
                <ChevronUp className="w-4 h-4" />
              </TouchButton>
              <TouchButton
                variant="ghost"
                size="sm"
                onClick={onClose}
                hapticFeedback="light"
                className="w-8 h-8 p-0"
              >
                <X className="w-4 h-4" />
              </TouchButton>
            </div>
            <div className="relative mt-2 cursor-pointer" onClick={handleProgressClick}>
              <Progress value={bufferedProgress} className="h-1 absolute" />
              <Progress value={progress} className="h-1 bg-transparent" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed bottom-[60px] left-4 right-4 z-40">
      <Card 
        className="bg-card/95 backdrop-blur-sm border-border shadow-lg cursor-pointer"
        onClick={onExpand}
      >
        <CardContent className="p-4">
          {/* Progress Bar */}
          <div className="relative mb-4 cursor-pointer" onClick={handleProgressClick}>
            <Progress value={bufferedProgress} className="h-1 absolute opacity-30" />
            <Progress value={progress} className="h-1 bg-transparent" />
            {audioPlayer.error && (
              <div className="absolute -top-6 left-0 text-xs text-destructive">
                {audioPlayer.error}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            {/* Episode Info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <ImageWithFallback
                src={episode.image}
                alt={episode.title}
                className="w-12 h-12 rounded object-cover"
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-medium truncate">{episode.title}</h4>
                {episode.guest?.name && (
                  <p className="text-sm text-muted-foreground truncate">
                    with {episode.guest.name}
                  </p>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <span>{formatTime(audioPlayer.currentTime)}</span>
                  <span>/</span>
                  <span>{formatTime(audioPlayer.duration || episode.duration || 0)}</span>
                </div>
              </div>
            </div>
            
            {/* Controls */}
            <div className="flex items-center gap-2">
              <TouchButton
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onPrevious();
                }}
                hapticFeedback="light"
                className="w-8 h-8 p-0"
              >
                <SkipBack className="w-4 h-4" />
              </TouchButton>
              
              <TouchButton
                onClick={(e) => {
                  e.stopPropagation();
                  actions.togglePlay();
                }}
                size="sm"
                loading={audioPlayer.loading}
                hapticFeedback="medium"
                className="w-10 h-10 rounded-full p-0"
              >
                {audioPlayer.isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </TouchButton>
              
              <TouchButton
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onNext();
                }}
                hapticFeedback="light"
                className="w-8 h-8 p-0"
              >
                <SkipForward className="w-4 h-4" />
              </TouchButton>
            </div>
            
            {/* Close Button */}
            <TouchButton
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              hapticFeedback="light"
              className="w-8 h-8 p-0"
            >
              <X className="w-4 h-4" />
            </TouchButton>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}