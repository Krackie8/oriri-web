import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Play, Clock, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { simplePodcastApi, SimpleEpisode } from '../utils/simplePodcastApi';

interface TestSpotifyScreenProps {
  onEpisodeSelect: (episode: any) => void;
  onPlayEpisode: (episode: any) => void;
}

export default function TestSpotifyScreen({ onEpisodeSelect, onPlayEpisode }: TestSpotifyScreenProps) {
  const [episodes, setEpisodes] = useState<SimpleEpisode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiTest, setApiTest] = useState<string>('');

  // Test function using the simple browser-compatible API
  const testSpotifyAPI = async () => {
    setIsLoading(true);
    setError(null);
    setApiTest('Starting browser-compatible API test...');
    
    try {
      setApiTest('Step 1: Using simple podcast API (no server dependencies)...');
      console.log('🔍 Step 1: Testing simple podcast API');
      
      setApiTest('Step 2: Calling getSpotifyEpisodes...');
      console.log('🔄 Step 2: Calling simplePodcastApi.getSpotifyEpisodes(5)');
      
      const result = await simplePodcastApi.getSpotifyEpisodes(5);
      
      setApiTest(`Step 3: Success! Got ${result.length} episodes`);
      console.log('✅ Step 3: API call successful, result:', result);
      
      setEpisodes(result);
      setApiTest(`✅ Complete! Loaded ${result.length} episodes from Spotify (mock data)`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Test failed:', error);
      setError(errorMessage);
      setApiTest(`❌ Failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Test on mount
  useEffect(() => {
    testSpotifyAPI();
  }, []);

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}min`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="pt-[60px] min-h-screen">
      <div className="px-4 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1>Spotify API Test</h1>
            <p className="text-sm text-muted-foreground">
              Testing direct Spotify API calls
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={testSpotifyAPI} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* API Test Status */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <h3 className="mb-3 flex items-center gap-2">
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : error ? (
                <AlertCircle className="w-4 h-4 text-destructive" />
              ) : episodes.length > 0 ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-muted-foreground" />
              )}
              API Test Status
            </h3>
            <p className="text-sm font-mono bg-muted/50 p-2 rounded">
              {apiTest || 'Ready to test...'}
            </p>
            {error && (
              <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
                Error: {error}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Episodes Display */}
        {isLoading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary mb-4" />
            <p className="text-muted-foreground">Testing Spotify API...</p>
          </div>
        ) : episodes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {error ? 'Failed to load episodes' : 'No episodes found'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Episodes ({episodes.length})
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {episodes.map((episode) => (
                <Card key={episode.id} className="overflow-hidden hover:bg-accent/50 transition-colors">
                  <CardContent className="p-0">
                    {/* Episode Image */}
                    <div className="aspect-square w-full overflow-hidden">
                      <ImageWithFallback
                        src={episode.imageUrl}
                        alt={episode.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    {/* Episode Info */}
                    <div className="p-4">
                      <h3 className="line-clamp-2 mb-2">{episode.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                        {episode.description}
                      </p>
                      
                      {/* Episode Meta */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(episode.duration)}
                        </span>
                        <span>{formatDate(episode.publishedDate)}</span>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          className="flex-1"
                          onClick={() => onPlayEpisode(episode)}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Play
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => onEpisodeSelect(episode)}
                        >
                          Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}