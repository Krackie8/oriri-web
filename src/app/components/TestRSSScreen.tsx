import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { spotifyRSSService } from '../utils/spotifyRSSService';
import { RSSEpisode } from '../utils/rssParser';

export function TestRSSScreen() {
  const [episodes, setEpisodes] = useState<RSSEpisode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testRSSFetch = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await spotifyRSSService.fetchEpisodes();
      console.log('RSS Test Result:', result);
      
      if (result.success) {
        setEpisodes(result.episodes);
      } else {
        setError(result.error || 'Unknown error');
        setEpisodes(result.episodes); // Might be cached episodes
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">RSS Feed Test</h1>
        <Button 
          onClick={testRSSFetch} 
          disabled={loading}
          className="mb-4"
        >
          {loading ? 'Loading...' : 'Test RSS Fetch'}
        </Button>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            Error: {error}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {episodes.map((episode) => (
          <Card key={episode.id}>
            <CardHeader>
              <CardTitle className="text-lg">{episode.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>ID:</strong> {episode.id}
                </div>
                <div>
                  <strong>Platform:</strong> {episode.platform}
                </div>
                <div>
                  <strong>Duration:</strong> {Math.floor(episode.duration / 60)}:{(episode.duration % 60).toString().padStart(2, '0')}
                </div>
                <div>
                  <strong>Published:</strong> {new Date(episode.publishedDate).toLocaleDateString()}
                </div>
                <div className="col-span-2">
                  <strong>Description:</strong> {episode.description.substring(0, 200)}...
                </div>
                <div className="col-span-2">
                  <strong>Audio URL:</strong> 
                  <a href={episode.audioUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-2">
                    {episode.audioUrl.substring(0, 100)}...
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Add default export
export default TestRSSScreen;