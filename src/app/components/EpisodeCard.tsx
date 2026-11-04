import React from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Play, Clock, Radio, Music, Video, Bookmark } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useSavedEpisodes } from '../hooks/useSavedEpisodes';

interface EpisodeCardProps {
  episode: {
    id: string;
    title: string;
    description: string;
    imageUrl: string;
    duration: number;
    publishedDate: string;
    platform: string;
  };
  onEpisodeSelect: (episode: any) => void;
  onPlayEpisode: (episode: any) => void;
}

export function EpisodeCard({ episode, onEpisodeSelect, onPlayEpisode }: EpisodeCardProps) {
  const { savedIds, toggleSaved } = useSavedEpisodes();
  const isSaved = savedIds.has(String(episode.id));

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'spotify': return <Radio className="w-4 h-4 text-green-500" />;
      case 'apple': return <Music className="w-4 h-4 text-gray-400" />;
      case 'youtube': return <Video className="w-4 h-4 text-red-500" />;
      default: return <Radio className="w-4 h-4" />;
    }
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => onEpisodeSelect(episode)}
    >
      <CardContent className="p-0">
        {/* Episode Image */}
        <div className="relative aspect-video">
          <ImageWithFallback
            src={episode.imageUrl}
            alt={episode.title}
            className="w-full h-full object-cover rounded-t-lg"
          />
          
          {/* Platform Badge */}
          <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-md px-2 py-1 flex items-center gap-1">
            {getPlatformIcon(episode.platform)}
            <span className="text-xs capitalize">{episode.platform}</span>
          </div>

          {/* Bookmark Toggle */}
          <button
            type="button"
            aria-label={isSaved ? 'Remove from saved' : 'Save episode'}
            className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm rounded-md p-1.5 flex items-center justify-center hover:bg-background transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              void toggleSaved(episode);
            }}
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current text-primary' : ''}`} />
          </button>

          {/* Play Button */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/20">
            <Button 
              size="lg" 
              className="rounded-full w-16 h-16"
              onClick={(e) => {
                e.stopPropagation();
                onPlayEpisode(episode);
              }}
            >
              <Play className="w-6 h-6" />
            </Button>
          </div>
        </div>

        {/* Episode Info */}
        <div className="p-4">
          <h3 className="line-clamp-2 mb-2">{episode.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {episode.description}
          </p>

          {/* Duration and Date */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{Math.floor(episode.duration / 60)}min</span>
            </div>
            <span>{new Date(episode.publishedDate).toLocaleDateString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}