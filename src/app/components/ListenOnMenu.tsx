import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Radio, Music, Video, ExternalLink, Crown } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface ListenOnMenuProps {
  isOpen: boolean;
  onClose: () => void;
  episode: {
    id: string | number;
    title: string;
    image: string;
    platformUrl?: string;
    platform?: string;
    externalEpisode?: {
      platform: string;
      platformUrl?: string;
    };
    isVipOnly?: boolean;
    guest?: string;
    duration?: string;
  };
}

export default function ListenOnMenu({ isOpen, onClose, episode }: ListenOnMenuProps) {
  const getPlatformInfo = () => {
    const platform = episode.externalEpisode?.platform || episode.platform;
    
    switch (platform) {
      case 'spotify':
        return {
          name: 'Spotify',
          icon: <Radio className="w-5 h-5 text-green-500" />,
          color: 'bg-green-500 hover:bg-green-600',
          url: episode.platformUrl || episode.externalEpisode?.platformUrl || ''
        };
      case 'apple':
        return {
          name: 'Apple Podcasts',
          icon: <Music className="w-5 h-5 text-gray-400" />,
          color: 'bg-gray-500 hover:bg-gray-600',
          url: episode.platformUrl || episode.externalEpisode?.platformUrl || ''
        };
      case 'youtube':
        return {
          name: 'YouTube',
          icon: <Video className="w-5 h-5 text-red-500" />,
          color: 'bg-red-500 hover:bg-red-600',
          url: episode.platformUrl || episode.externalEpisode?.platformUrl || ''
        };
      default:
        return {
          name: 'External Platform',
          icon: <ExternalLink className="w-5 h-5 text-primary" />,
          color: 'bg-primary hover:bg-primary/90',
          url: episode.platformUrl || ''
        };
    }
  };

  const platformInfo = getPlatformInfo();

  const handleListenClick = () => {
    if (platformInfo.url) {
      window.open(platformInfo.url, '_blank');
      onClose();
    } else {
      console.error('No platform URL available for episode:', episode);
    }
  };

  // Handle VIP episodes differently
  if (episode.isVipOnly) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-background/95 backdrop-blur-sm border-border/50 max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-purple-500" />
              VIP Episode
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Episode info */}
            <div className="flex gap-3">
              <ImageWithFallback
                src={episode.image}
                alt={episode.title}
                className="w-16 h-16 rounded-lg object-cover"
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium line-clamp-2 mb-1">{episode.title}</h3>
                {episode.guest && (
                  <p className="text-sm text-muted-foreground">{episode.guest}</p>
                )}
                {episode.duration && (
                  <p className="text-xs text-muted-foreground">{episode.duration}</p>
                )}
              </div>
            </div>

            <div className="text-center p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
              <Crown className="w-8 h-8 text-purple-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                This is a VIP exclusive episode. Audio playback will be available soon for VIP members.
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-background/95 backdrop-blur-sm border-border/50 max-w-md mx-4">
        <DialogHeader>
          <DialogTitle>Listen to Episode</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Episode info */}
          <div className="flex gap-3">
            <ImageWithFallback
              src={episode.image}
              alt={episode.title}
              className="w-16 h-16 rounded-lg object-cover"
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-medium line-clamp-2 mb-1">{episode.title}</h3>
              {episode.guest && (
                <p className="text-sm text-muted-foreground">{episode.guest}</p>
              )}
              {episode.duration && (
                <p className="text-xs text-muted-foreground">{episode.duration}</p>
              )}
            </div>
          </div>

          {/* Platform info */}
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground mb-3">
              This episode is available on {platformInfo.name}. Click below to listen:
            </p>
            
            {platformInfo.url ? (
              <Button 
                onClick={handleListenClick}
                className={`w-full ${platformInfo.color} text-white`}
              >
                <div className="flex items-center gap-2">
                  {platformInfo.icon}
                  <span>Listen on {platformInfo.name}</span>
                  <ExternalLink className="w-4 h-4" />
                </div>
              </Button>
            ) : (
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Platform URL not available for this episode
                </p>
              </div>
            )}
          </div>

          {/* Additional info */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              You'll be redirected to {platformInfo.name} to listen to this episode
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { ListenOnMenu };