import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Slider } from './ui/slider';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward,
  ChevronDown,
  Volume2,
  VolumeX,
  RotateCcw,
  RotateCw,
  Loader2,
  Heart,
  Share,
  Download
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useGlobalAudioPlayer, formatTime, formatDuration, Episode } from '../hooks/useGlobalAudioPlayer';
import { Dialog, DialogContent } from './ui/dialog';

interface AudioPlayerProps {
  episode: Episode;
  isOpen: boolean;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

export default function AudioPlayer({
  episode,
  isOpen,
  onClose,
  onNext,
  onPrevious
}: AudioPlayerProps) {
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  
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

  // Sync volume
  useEffect(() => {
    try {
      const actualVolume = isMuted ? 0 : volume / 100;
      actions.setVolume(actualVolume);
    } catch (error) {
      console.error('Error setting volume:', error);
    }
  }, [volume, isMuted, actions]);

  const progress = audioPlayer.duration > 0 ? (audioPlayer.currentTime / audioPlayer.duration) * 100 : 0;
  const bufferedProgress = audioPlayer.duration > 0 ? (audioPlayer.buffered / audioPlayer.duration) * 100 : 0;

  const handleProgressChange = (value: number[]) => {
    try {
      const newTime = (value[0] / 100) * audioPlayer.duration;
      actions.seek(newTime);
    } catch (error) {
      console.error('Error changing progress:', error);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    try {
      setVolume(value[0]);
      if (value[0] > 0) {
        setIsMuted(false);
      }
    } catch (error) {
      console.error('Error changing volume:', error);
    }
  };

  const toggleMute = () => {
    try {
      setIsMuted(!isMuted);
    } catch (error) {
      console.error('Error toggling mute:', error);
    }
  };

  const skipForward = () => {
    try {
      actions.seek(audioPlayer.currentTime + 15);
    } catch (error) {
      console.error('Error skipping forward:', error);
    }
  };

  const skipBackward = () => {
    try {
      actions.seek(audioPlayer.currentTime - 15);
    } catch (error) {
      console.error('Error skipping backward:', error);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: episode.title,
        text: `Listen to this episode: ${episode.title}`,
        url: window.location.href
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-background/95 backdrop-blur-sm border-border/50 max-w-md mx-4 p-0 overflow-hidden h-[90vh] max-h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="w-8 h-8 p-0"
          >
            <ChevronDown className="w-5 h-5" />
          </Button>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Now Playing</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShare}
            className="w-8 h-8 p-0"
          >
            <Share className="w-4 h-4" />
          </Button>
        </div>

        {/* Album Art */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="relative">
            <ImageWithFallback
              src={episode.image}
              alt={episode.title}
              className="w-64 h-64 rounded-lg object-cover shadow-2xl"
            />
            {audioPlayer.loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
              </div>
            )}
          </div>
        </div>

        {/* Episode Info */}
        <div className="px-6 pb-4">
          <h1 className="text-xl font-medium text-center mb-2 line-clamp-2">
            {episode.title}
          </h1>
          {episode.guest?.name && (
            <p className="text-muted-foreground text-center mb-4">
              with {episode.guest.name}
            </p>
          )}

          {/* Progress */}
          <div className="space-y-2">
            <div className="relative">
              <Progress value={bufferedProgress} className="h-1 absolute opacity-30" />
              <Slider
                value={[progress]}
                onValueChange={handleProgressChange}
                max={100}
                step={0.1}
                className="w-full"
              />
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{formatTime(audioPlayer.currentTime)}</span>
              <span>-{formatTime(audioPlayer.duration - audioPlayer.currentTime)}</span>
            </div>
          </div>

          {/* Error Message */}
          {audioPlayer.error && (
            <div className="text-center text-sm text-destructive mt-2">
              {audioPlayer.error}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="px-6 pb-4">
          <div className="flex items-center justify-center gap-6 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={skipBackward}
              className="w-10 h-10 p-0"
            >
              <RotateCcw className="w-5 h-5" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onPrevious}
              className="w-12 h-12 p-0"
            >
              <SkipBack className="w-6 h-6" />
            </Button>

            <Button
              onClick={actions.togglePlay}
              disabled={audioPlayer.loading}
              size="lg"
              className="w-16 h-16 rounded-full p-0"
            >
              {audioPlayer.loading ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : audioPlayer.isPlaying ? (
                <Pause className="w-8 h-8" />
              ) : (
                <Play className="w-8 h-8" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onNext}
              className="w-12 h-12 p-0"
            >
              <SkipForward className="w-6 h-6" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={skipForward}
              className="w-10 h-10 p-0"
            >
              <RotateCw className="w-5 h-5" />
            </Button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMute}
              className="w-8 h-8 p-0"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume]}
              onValueChange={handleVolumeChange}
              max={100}
              step={1}
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground w-8">
              {isMuted ? 0 : volume}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsLiked(!isLiked)}
              className="flex flex-col items-center gap-1"
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
              <span className="text-xs">Like</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="flex flex-col items-center gap-1"
            >
              <Share className="w-5 h-5" />
              <span className="text-xs">Share</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="flex flex-col items-center gap-1"
            >
              <Download className="w-5 h-5" />
              <span className="text-xs">Download</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}