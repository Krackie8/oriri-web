import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import EpisodeDetailScreen from './EpisodeDetailScreen';

// Episode format from our episodes screen
interface SimpleEpisode {
  id: string;
  title: string;
  description: string;
  audioUrl: string;
  imageUrl: string;
  duration: number;
  publishedDate: string;
  episodeNumber?: string;
  platform: 'spotify' | 'youtube';
  views?: number;
  likes?: number;
  comments?: number;
}

// Episode format expected by EpisodeDetailScreen
interface DetailEpisode {
  id: number;
  title: string;
  description: string;
  fullDescription: string;
  guest?: {
    name: string;
    bio: string;
    image: string;
    links: { platform: string; url: string }[];
  };
  duration: string;
  views: string;
  publishedDate: string;
  image: string;
  audioUrl?: string;
  videoUrl?: string;
  transcript: string;
  summary: string;
  isAudio: boolean;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m ${secs}s`;
}

function formatViews(views?: number): string {
  if (!views) return '0 views';
  
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M views`;
  } else if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}K views`;
  }
  return `${views} views`;
}

function generateTranscript(title: string, description: string): string {
  return `Welcome to today's episode: "${title}"\n\n${description}\n\n[This is a placeholder transcript. In a production app, you would fetch the actual transcript from your content management system or transcription service.]\n\nThank you for listening! Don't forget to subscribe and leave a review.`;
}

function generateSummary(description: string): string {
  const sentences = description.split('.').filter(s => s.trim().length > 0);
  const firstSentences = sentences.slice(0, 2).join('. ');
  return firstSentences + (firstSentences.endsWith('.') ? '' : '.');
}

export function EpisodeDetailWrapper() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get the episode from router state
  const simpleEpisode = location.state?.episode as SimpleEpisode;
  
  if (!simpleEpisode) {
    // Handle case where episode data is missing
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <h2 className="text-lg font-semibold">Episode not found</h2>
          <p className="text-muted-foreground">The episode data could not be loaded.</p>
          <button 
            onClick={() => navigate('/episodes')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded"
          >
            Back to Episodes
          </button>
        </div>
      </div>
    );
  }

  // Transform SimpleEpisode to DetailEpisode format
  const detailEpisode: DetailEpisode = {
    id: parseInt(simpleEpisode.id.replace(/\D/g, '')) || 1, // Extract numbers from ID
    title: simpleEpisode.title,
    description: simpleEpisode.description,
    fullDescription: simpleEpisode.description + '\n\nThis episode contains valuable insights and discussions. Listen to the full episode to get all the details and perspectives shared by our hosts and guests.',
    duration: formatDuration(simpleEpisode.duration),
    views: formatViews(simpleEpisode.views),
    publishedDate: new Date(simpleEpisode.publishedDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    image: simpleEpisode.imageUrl,
    audioUrl: simpleEpisode.platform === 'spotify' ? simpleEpisode.audioUrl : undefined,
    videoUrl: simpleEpisode.platform === 'youtube' ? simpleEpisode.audioUrl : undefined,
    transcript: generateTranscript(simpleEpisode.title, simpleEpisode.description),
    summary: generateSummary(simpleEpisode.description),
    isAudio: simpleEpisode.platform === 'spotify', // Spotify = audio, YouTube = video
    // Optional guest info - could be expanded with real data
    guest: simpleEpisode.platform === 'youtube' ? {
      name: 'Content Creator',
      bio: 'This episode features engaging content and valuable insights.',
      image: simpleEpisode.imageUrl,
      links: [
        { platform: 'YouTube', url: simpleEpisode.audioUrl },
        { platform: 'Website', url: '#' }
      ]
    } : undefined
  };

  const handleBack = () => {
    navigate('/episodes');
  };

  const handlePlayEpisode = (episode: any) => {
    console.log('Playing episode:', episode);
    // In a real app, you would integrate with your audio/video player
    
    if (simpleEpisode.platform === 'youtube') {
      // For YouTube videos, open in new tab or use embedded player
      window.open(simpleEpisode.audioUrl, '_blank');
    } else {
      // For Spotify, you might use their web player or your custom audio player
      console.log('Playing Spotify episode:', simpleEpisode.audioUrl);
    }
  };

  return (
    <EpisodeDetailScreen
      episode={detailEpisode}
      onBack={handleBack}
      onPlayEpisode={handlePlayEpisode}
    />
  );
}

export default EpisodeDetailWrapper;