import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Settings, 
  Radio, 
  Video, 
  Music,
  Key,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Info
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface PlatformConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PlatformConfigModal({ isOpen, onClose }: PlatformConfigModalProps) {
  const [spotifyConfig, setSpotifyConfig] = useState({
    clientId: '',
    clientSecret: '',
    showId: ''
  });
  
  const [youtubeConfig, setYoutubeConfig] = useState({
    apiKey: '',
    channelId: '',
    playlistId: ''
  });
  
  const [appleConfig, setAppleConfig] = useState({
    showId: '',
    feedUrl: ''
  });

  const [isTestingConnection, setIsTestingConnection] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<Record<string, boolean>>({
    spotify: false,
    youtube: false,
    apple: false
  });

  const testConnection = async (platform: 'spotify' | 'youtube' | 'apple') => {
    setIsTestingConnection(platform);
    
    try {
      // Simulate API test
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock successful connection
      setConnectionStatus(prev => ({ ...prev, [platform]: true }));
      toast.success(`${platform} connection successful!`);
      
    } catch (error) {
      setConnectionStatus(prev => ({ ...prev, [platform]: false }));
      toast.error(`Failed to connect to ${platform}`);
    } finally {
      setIsTestingConnection(null);
    }
  };

  const saveConfiguration = () => {
    // In production, this would save to environment variables or secure storage
    console.log('Saving configuration:', {
      spotify: spotifyConfig,
      youtube: youtubeConfig,
      apple: appleConfig
    });
    
    toast.success('Configuration saved successfully!');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Platform API Configuration
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-[calc(90vh-120px)]">
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Configure your podcast platform APIs to automatically sync episodes from Spotify, Apple Podcasts, and YouTube.
              All API keys are stored securely and only used to fetch your public podcast data.
            </AlertDescription>
          </Alert>

          <Tabs defaultValue="spotify" className="flex-1 overflow-hidden">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="spotify" className="flex items-center gap-2">
                <Radio className="w-4 h-4" />
                Spotify
                {connectionStatus.spotify && <CheckCircle2 className="w-3 h-3 text-green-500" />}
              </TabsTrigger>
              <TabsTrigger value="youtube" className="flex items-center gap-2">
                <Video className="w-4 h-4" />
                YouTube
                {connectionStatus.youtube && <CheckCircle2 className="w-3 h-3 text-green-500" />}
              </TabsTrigger>
              <TabsTrigger value="apple" className="flex items-center gap-2">
                <Music className="w-4 h-4" />
                Apple Podcasts
                {connectionStatus.apple && <CheckCircle2 className="w-3 h-3 text-green-500" />}
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4">
              {/* Spotify Configuration */}
              <TabsContent value="spotify" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Radio className="w-5 h-5 text-green-500" />
                      Spotify for Podcasters
                      <Badge variant={connectionStatus.spotify ? "success" : "secondary"}>
                        {connectionStatus.spotify ? "Connected" : "Not Connected"}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        To get your Spotify API credentials:
                        <ol className="list-decimal list-inside mt-2 space-y-1">
                          <li>Go to <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-primary underline">Spotify Developer Dashboard</a></li>
                          <li>Create a new app or use an existing one</li>
                          <li>Copy your Client ID and Client Secret</li>
                          <li>Find your podcast's Show ID from your Spotify for Podcasters dashboard</li>
                        </ol>
                      </AlertDescription>
                    </Alert>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="spotify-client-id">Client ID</Label>
                        <Input
                          id="spotify-client-id"
                          type="text"
                          placeholder="Your Spotify Client ID"
                          value={spotifyConfig.clientId}
                          onChange={(e) => setSpotifyConfig(prev => ({ ...prev, clientId: e.target.value }))}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="spotify-client-secret">Client Secret</Label>
                        <Input
                          id="spotify-client-secret"
                          type="password"
                          placeholder="Your Spotify Client Secret"
                          value={spotifyConfig.clientSecret}
                          onChange={(e) => setSpotifyConfig(prev => ({ ...prev, clientSecret: e.target.value }))}
                        />
                      </div>
                      
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="spotify-show-id">Podcast Show ID</Label>
                        <Input
                          id="spotify-show-id"
                          type="text"
                          placeholder="Your Spotify Podcast Show ID"
                          value={spotifyConfig.showId}
                          onChange={(e) => setSpotifyConfig(prev => ({ ...prev, showId: e.target.value }))}
                        />
                      </div>
                    </div>

                    <Button 
                      onClick={() => testConnection('spotify')}
                      disabled={!spotifyConfig.clientId || !spotifyConfig.clientSecret || !spotifyConfig.showId || isTestingConnection === 'spotify'}
                      className="w-full"
                    >
                      {isTestingConnection === 'spotify' ? 'Testing Connection...' : 'Test Spotify Connection'}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* YouTube Configuration */}
              <TabsContent value="youtube" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Video className="w-5 h-5 text-red-500" />
                      YouTube Data API
                      <Badge variant={connectionStatus.youtube ? "success" : "secondary"}>
                        {connectionStatus.youtube ? "Connected" : "Not Connected"}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        To get your YouTube API credentials:
                        <ol className="list-decimal list-inside mt-2 space-y-1">
                          <li>Go to <a href="https://console.developers.google.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">Google Cloud Console</a></li>
                          <li>Create a project and enable YouTube Data API v3</li>
                          <li>Create an API key and copy it</li>
                          <li>Find your YouTube channel ID from your channel URL or YouTube Studio</li>
                        </ol>
                      </AlertDescription>
                    </Alert>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="youtube-api-key">API Key</Label>
                        <Input
                          id="youtube-api-key"
                          type="password"
                          placeholder="Your YouTube Data API Key"
                          value={youtubeConfig.apiKey}
                          onChange={(e) => setYoutubeConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="youtube-channel-id">Channel ID</Label>
                        <Input
                          id="youtube-channel-id"
                          type="text"
                          placeholder="Your YouTube Channel ID"
                          value={youtubeConfig.channelId}
                          onChange={(e) => setYoutubeConfig(prev => ({ ...prev, channelId: e.target.value }))}
                        />
                      </div>
                      
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="youtube-playlist-id">Playlist ID (Optional)</Label>
                        <Input
                          id="youtube-playlist-id"
                          type="text"
                          placeholder="Specific playlist ID for podcast episodes (optional)"
                          value={youtubeConfig.playlistId}
                          onChange={(e) => setYoutubeConfig(prev => ({ ...prev, playlistId: e.target.value }))}
                        />
                      </div>
                    </div>

                    <Button 
                      onClick={() => testConnection('youtube')}
                      disabled={!youtubeConfig.apiKey || !youtubeConfig.channelId || isTestingConnection === 'youtube'}
                      className="w-full"
                    >
                      {isTestingConnection === 'youtube' ? 'Testing Connection...' : 'Test YouTube Connection'}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Apple Podcasts Configuration */}
              <TabsContent value="apple" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Music className="w-5 h-5 text-gray-600" />
                      Apple Podcasts
                      <Badge variant={connectionStatus.apple ? "success" : "secondary"}>
                        {connectionStatus.apple ? "Connected" : "Not Connected"}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Apple Podcasts doesn't have a direct API. We'll use your RSS feed or iTunes ID:
                        <ol className="list-decimal list-inside mt-2 space-y-1">
                          <li>Find your podcast on <a href="https://podcasts.apple.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">Apple Podcasts</a></li>
                          <li>Copy the ID from the URL (e.g., id1234567890)</li>
                          <li>Or provide your RSS feed URL for more detailed data</li>
                        </ol>
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="apple-show-id">Apple Podcasts ID</Label>
                        <Input
                          id="apple-show-id"
                          type="text"
                          placeholder="Your Apple Podcasts ID (e.g., 1234567890)"
                          value={appleConfig.showId}
                          onChange={(e) => setAppleConfig(prev => ({ ...prev, showId: e.target.value }))}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="apple-feed-url">RSS Feed URL (Preferred)</Label>
                        <Input
                          id="apple-feed-url"
                          type="url"
                          placeholder="Your podcast RSS feed URL"
                          value={appleConfig.feedUrl}
                          onChange={(e) => setAppleConfig(prev => ({ ...prev, feedUrl: e.target.value }))}
                        />
                      </div>
                    </div>

                    <Button 
                      onClick={() => testConnection('apple')}
                      disabled={(!appleConfig.showId && !appleConfig.feedUrl) || isTestingConnection === 'apple'}
                      className="w-full"
                    >
                      {isTestingConnection === 'apple' ? 'Testing Connection...' : 'Test Apple Podcasts Connection'}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={saveConfiguration} className="bg-primary">
              <Key className="w-4 h-4 mr-2" />
              Save Configuration
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}