import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  RefreshCwIcon, 
  PlayIcon,
  ExternalLinkIcon,
  InfoIcon,
  AlertTriangleIcon
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface PlatformConfigStatus {
  spotify: {
    configured: boolean;
    hasClientId: boolean;
    hasClientSecret: boolean;
    hasShowId: boolean;
  };
  apple: {
    configured: boolean;
    hasShowId: boolean;
    hasFeedUrl: boolean;
  };
  youtube: {
    configured: boolean;
    hasApiKey: boolean;
    hasChannelId: boolean;
    hasPlaylistId: boolean;
  };
}

interface SyncResult {
  platform: 'spotify' | 'apple' | 'youtube';
  success: boolean;
  episodes?: any[];
  error?: string;
  stats?: any;
}

export default function PlatformConfig() {
  const [configStatus, setConfigStatus] = useState<PlatformConfigStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [syncResults, setSyncResults] = useState<SyncResult[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [isTesting, setIsTesting] = useState<Record<string, boolean>>({});

  // Load configuration status
  useEffect(() => {
    loadConfigStatus();
  }, []);

  const loadConfigStatus = async () => {
    try {
      console.log('Loading platform configuration status...');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/podcast/config-status`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Config status response:', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Config status data:', data);
        setConfigStatus(data.data);
      } else {
        const errorText = await response.text();
        console.error('Config status error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to load config status:', error);
      toast.error(`Failed to load platform configuration status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testPlatformAPI = async (platform: 'spotify' | 'apple' | 'youtube') => {
    setIsTesting(prev => ({ ...prev, [platform]: true }));
    
    try {
      const endpoints = {
        spotify: '/podcast/spotify/episodes?limit=5',
        apple: '/podcast/apple/episodes',
        youtube: '/podcast/youtube/videos?maxResults=5'
      };

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32${endpoints[platform]}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      
      setTestResults(prev => ({
        ...prev,
        [platform]: {
          success: data.success,
          data: data.data,
          error: data.error,
          timestamp: new Date().toISOString()
        }
      }));

      if (data.success) {
        toast.success(`${platform.charAt(0).toUpperCase() + platform.slice(1)} API test successful!`);
      } else {
        toast.error(`${platform.charAt(0).toUpperCase() + platform.slice(1)} API test failed: ${data.error}`);
      }
    } catch (error) {
      console.error(`${platform} API test failed:`, error);
      setTestResults(prev => ({
        ...prev,
        [platform]: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      }));
      toast.error(`${platform.charAt(0).toUpperCase() + platform.slice(1)} API test failed`);
    } finally {
      setIsTesting(prev => ({ ...prev, [platform]: false }));
    }
  };

  const testSpotifyShow = async () => {
    setIsTesting(prev => ({ ...prev, 'spotify-show': true }));
    
    try {
      console.log('Testing Spotify show verification...');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/podcast/spotify/verify-show`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      console.log('Spotify show verification response:', data);
      
      setTestResults(prev => ({
        ...prev,
        'spotify-show': {
          success: data.success,
          data: data.showInfo,
          error: data.error,
          timestamp: new Date().toISOString()
        }
      }));

      if (data.success) {
        toast.success(`Spotify show verified! Found: "${data.showInfo.name}"`);
      } else {
        toast.error(`Spotify show verification failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Spotify show verification failed:', error);
      setTestResults(prev => ({
        ...prev,
        'spotify-show': {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      }));
      toast.error('Spotify show verification failed');
    } finally {
      setIsTesting(prev => ({ ...prev, 'spotify-show': false }));
    }
  };

  const debugEnvironmentVariables = async () => {
    setIsTesting(prev => ({ ...prev, 'debug-env': true }));
    
    try {
      console.log('Checking environment variables...');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/debug/env-check`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      console.log('Environment variables check:', data);
      
      if (data.success) {
        const { credentials } = data;
        const missing = [];
        if (!credentials.hasClientId) missing.push('Client ID');
        if (!credentials.hasClientSecret) missing.push('Client Secret'); 
        if (!credentials.hasShowId) missing.push('Show ID');
        
        if (missing.length === 0) {
          toast.success(`All Spotify credentials are set! Client ID: ${credentials.clientIdPreview}, Show ID: ${credentials.showIdValue}`);
        } else {
          toast.error(`Missing credentials: ${missing.join(', ')}`);
        }
      } else {
        toast.error(`Debug check failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Environment debug failed:', error);
      toast.error('Debug check failed');
    } finally {
      setIsTesting(prev => ({ ...prev, 'debug-env': false }));
    }
  };

  const syncAllPlatforms = async () => {
    setIsSyncing(true);
    setSyncResults([]);
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/podcast/sync-all`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSyncResults(data.data.results || []);
        
        const successCount = data.data.results?.filter((r: SyncResult) => r.success).length || 0;
        const totalCount = data.data.results?.length || 0;
        
        if (successCount === totalCount) {
          toast.success(`All ${totalCount} platforms synced successfully!`);
        } else if (successCount > 0) {
          toast.warning(`${successCount}/${totalCount} platforms synced successfully`);
        } else {
          toast.error('All platform syncs failed');
        }
      } else {
        throw new Error('Sync request failed');
      }
    } catch (error) {
      console.error('Sync failed:', error);
      toast.error('Failed to sync platforms');
    } finally {
      setIsSyncing(false);
    }
  };

  const renderConfigStatus = (platform: string, config: any) => {
    const isConfigured = config?.configured;
    const missingKeys = [];
    
    if (platform === 'spotify') {
      if (!config?.hasClientId) missingKeys.push('Client ID');
      if (!config?.hasClientSecret) missingKeys.push('Client Secret');
      if (!config?.hasShowId) missingKeys.push('Show ID');
    } else if (platform === 'apple') {
      if (!config?.hasShowId && !config?.hasFeedUrl) missingKeys.push('Show ID or RSS Feed URL');
    } else if (platform === 'youtube') {
      if (!config?.hasApiKey) missingKeys.push('API Key');
      if (!config?.hasChannelId) missingKeys.push('Channel ID');
    }
    
    return (
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="capitalize">{platform}</CardTitle>
            <Badge variant={isConfigured ? "default" : "destructive"}>
              {isConfigured ? (
                <>
                  <CheckCircleIcon className="w-3 h-3 mr-1" />
                  Configured
                </>
              ) : (
                <>
                  <XCircleIcon className="w-3 h-3 mr-1" />
                  Not Configured
                </>
              )}
            </Badge>
          </div>
          {!isConfigured && missingKeys.length > 0 && (
            <CardDescription className="text-destructive">
              Missing: {missingKeys.join(', ')}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => testPlatformAPI(platform as any)}
              disabled={!isConfigured || isTesting[platform]}
            >
              {isTesting[platform] ? (
                <RefreshCwIcon className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <PlayIcon className="w-4 h-4 mr-2" />
              )}
              Test API
            </Button>
            
            {platform === 'spotify' && isConfigured && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => testSpotifyShow()}
                disabled={isTesting['spotify-show']}
              >
                {isTesting['spotify-show'] ? (
                  <RefreshCwIcon className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircleIcon className="w-4 h-4 mr-2" />
                )}
                Verify Show
              </Button>
            )}

            {platform === 'spotify' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => debugEnvironmentVariables()}
                disabled={isTesting['debug-env']}
              >
                {isTesting['debug-env'] ? (
                  <RefreshCwIcon className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <InfoIcon className="w-4 h-4 mr-2" />
                )}
                Debug Env
              </Button>
            )}
            
            {testResults[platform] && (
              <Badge variant={testResults[platform].success ? "default" : "destructive"}>
                {testResults[platform].success ? 'Test Passed' : 'Test Failed'}
              </Badge>
            )}
          </div>

          {testResults[platform] && (
            <div className="mt-3 p-3 bg-muted rounded-md">
              <div className="text-sm">
                <strong>Test Result:</strong>
                {testResults[platform].success ? (
                  <span className="text-green-600 ml-2">✅ Success</span>
                ) : (
                  <span className="text-red-600 ml-2">❌ Failed</span>
                )}
              </div>
              {testResults[platform].error && (
                <div className="text-sm text-destructive mt-1">
                  <strong>Error:</strong> {testResults[platform].error}
                </div>
              )}
              {testResults[platform].data && (
                <div className="text-sm mt-1">
                  <strong>Data:</strong> Found episodes/videos
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <RefreshCwIcon className="w-5 h-5 animate-spin" />
          <h2 className="text-xl font-medium">Loading Platform Configuration...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-medium">Platform Configuration</h2>
          <p className="text-muted-foreground">
            Configure and test your podcast platform API connections
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadConfigStatus}>
            <RefreshCwIcon className="w-4 h-4 mr-2" />
            Refresh Status
          </Button>
          
          <Button 
            onClick={syncAllPlatforms}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <RefreshCwIcon className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCwIcon className="w-4 h-4 mr-2" />
            )}
            Sync All Platforms
          </Button>
        </div>
      </div>

      <Tabs defaultValue="config" className="space-y-4">
        <TabsList>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="sync">Sync Results</TabsTrigger>
          <TabsTrigger value="help">Help & Setup</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-4">
          <div className="grid gap-4">
            {configStatus && (
              <>
                {renderConfigStatus('spotify', configStatus.spotify)}
                {renderConfigStatus('youtube', configStatus.youtube)}
                {renderConfigStatus('apple', configStatus.apple)}
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="sync" className="space-y-4">
          {syncResults.length > 0 ? (
            <div className="space-y-4">
              {syncResults.map((result) => (
                <Card key={result.platform}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="capitalize">{result.platform}</CardTitle>
                      <Badge variant={result.success ? "default" : "destructive"}>
                        {result.success ? (
                          <>
                            <CheckCircleIcon className="w-3 h-3 mr-1" />
                            Success
                          </>
                        ) : (
                          <>
                            <XCircleIcon className="w-3 h-3 mr-1" />
                            Failed
                          </>
                        )}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {result.success ? (
                      <div className="space-y-2">
                        <div className="text-sm">
                          <strong>Episodes Found:</strong> {result.episodes?.length || 0}
                        </div>
                        {result.stats && (
                          <div className="text-sm text-muted-foreground">
                            Stats: {JSON.stringify(result.stats, null, 2)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-destructive">
                        <strong>Error:</strong> {result.error}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-6">
                <div className="text-center">
                  <InfoIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No sync results yet. Click "Sync All Platforms" to test your APIs.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="help" className="space-y-4">
          <div className="space-y-6">
            {/* Spotify Setup */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>🎵</span>
                  Spotify Setup
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <h4 className="font-medium">Required Environment Variables:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                    <li><code>SPOTIFY_CLIENT_ID</code> - Your Spotify app client ID</li>
                    <li><code>SPOTIFY_CLIENT_SECRET</code> - Your Spotify app client secret</li>
                    <li><code>SPOTIFY_SHOW_ID</code> - Your podcast's Spotify show ID</li>
                  </ul>
                </div>
                <Button variant="outline" size="sm" className="gap-2">
                  <ExternalLinkIcon className="w-4 h-4" />
                  <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener noreferrer">
                    Spotify Developer Dashboard
                  </a>
                </Button>
              </CardContent>
            </Card>

            {/* YouTube Setup */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>📹</span>
                  YouTube Setup
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <h4 className="font-medium">Required Environment Variables:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                    <li><code>YOUTUBE_API_KEY</code> - Your YouTube Data API v3 key</li>
                    <li><code>YOUTUBE_CHANNEL_ID</code> - Your YouTube channel ID</li>
                    <li><code>YOUTUBE_PLAYLIST_ID</code> - (Optional) Specific playlist for podcast episodes</li>
                  </ul>
                </div>
                <Button variant="outline" size="sm" className="gap-2">
                  <ExternalLinkIcon className="w-4 h-4" />
                  <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer">
                    Google Cloud Console
                  </a>
                </Button>
              </CardContent>
            </Card>

            {/* Apple Podcasts Setup */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>🎧</span>
                  Apple Podcasts Setup
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <h4 className="font-medium">Required Environment Variables (at least one):</h4>
                  <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                    <li><code>APPLE_PODCASTS_SHOW_ID</code> - Your podcast's Apple Podcasts ID</li>
                    <li><code>APPLE_PODCASTS_FEED_URL</code> - Your podcast's RSS feed URL (recommended)</li>
                  </ul>
                </div>
                <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                  <AlertTriangleIcon className="w-4 h-4 inline mr-2" />
                  <strong>Note:</strong> Apple Podcasts doesn't have a full public API. 
                  RSS feed provides better episode data than iTunes Search API.
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}