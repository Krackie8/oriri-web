import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { spotifyRSSService } from '../utils/spotifyRSSService';
import { safeYouTubeAPIService } from '../utils/youtubeAPIServiceSafe';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { useVipSubscription } from '../contexts/VipSubscriptionContext';
import { useAuth } from '../hooks/useAuth';

export function APIDebugPanel() {
  const [spotifyResult, setSpotifyResult] = useState<any>(null);
  const [youtubeResult, setYoutubeResult] = useState<any>(null);
  const [youtubeStatus, setYoutubeStatus] = useState<any>(null);
  const [exclusiveResult, setExclusiveResult] = useState<any>(null);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  
  // VIP Status Debugging
  const { isLoggedIn, user } = useAuth();
  const { 
    isVipMember, 
    currentSubscription, 
    isOnTrial, 
    hasAccess, 
    getRemainingTrialDays,
    currentTier 
  } = useVipSubscription();

  const testSpotifyRSS = async () => {
    setLoading(prev => ({ ...prev, spotify: true }));
    try {
      const result = await spotifyRSSService.fetchEpisodes();
      setSpotifyResult(result);
      console.log('[Debug] Spotify RSS result:', result);
    } catch (error) {
      setSpotifyResult({ success: false, error: error.message });
      console.error('[Debug] Spotify RSS error:', error);
    }
    setLoading(prev => ({ ...prev, spotify: false }));
  };

  const testYouTubeAPI = async () => {
    setLoading(prev => ({ ...prev, youtube: true }));
    try {
      const result = await safeYouTubeAPIService.fetchEpisodes();
      setYoutubeResult(result);
      console.log('[Debug] YouTube API result:', result);
    } catch (error) {
      setYoutubeResult({ success: false, error: error.message });
      console.error('[Debug] YouTube API error:', error);
    }
    setLoading(prev => ({ ...prev, youtube: false }));
  };

  const testYouTubeStatus = async () => {
    setLoading(prev => ({ ...prev, ytStatus: true }));
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/youtube/status`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      const data = await response.json();
      setYoutubeStatus(data);
      console.log('[Debug] YouTube status:', data);
    } catch (error) {
      setYoutubeStatus({ success: false, error: error.message });
      console.error('[Debug] YouTube status error:', error);
    }
    setLoading(prev => ({ ...prev, ytStatus: false }));
  };

  const testExclusiveAPI = async () => {
    setLoading(prev => ({ ...prev, exclusive: true }));
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/episodes`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      const data = await response.json();
      setExclusiveResult(data);
      console.log('[Debug] Exclusive API result:', data);
    } catch (error) {
      setExclusiveResult({ success: false, error: error.message });
      console.error('[Debug] Exclusive API error:', error);
    }
    setLoading(prev => ({ ...prev, exclusive: false }));
  };

  return (
    <div className="fixed bottom-20 right-4 z-50 w-80 max-h-96 overflow-y-auto">
      <Card className="bg-card/95 backdrop-blur-sm border-white/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">API & VIP Debug Panel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          
          {/* VIP Status Debug */}
          <div className="space-y-2 border-b border-border pb-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-purple-400">VIP Status</span>
            </div>
            <div className="p-2 bg-muted rounded text-xs space-y-1">
              <div>Logged In: <Badge variant={isLoggedIn ? "default" : "destructive"}>{isLoggedIn ? 'Yes' : 'No'}</Badge></div>
              <div>User: {user?.email || 'None'}</div>
              <div>VIP Member: <Badge variant={isVipMember ? "default" : "destructive"}>{isVipMember ? 'Yes' : 'No'}</Badge></div>
              <div>On Trial: <Badge variant={isOnTrial ? "default" : "secondary"}>{isOnTrial ? 'Yes' : 'No'}</Badge></div>
              <div>Subscription Status: {currentSubscription?.status || 'None'}</div>
              <div>Current Tier: {currentTier?.displayName || 'None'}</div>
              <div>Trial Days Left: {getRemainingTrialDays() ?? 'N/A'}</div>
              <div>Has VIP Access: <Badge variant={hasAccess(['vip']) ? "default" : "destructive"}>{hasAccess(['vip']) ? 'Yes' : 'No'}</Badge></div>
              <div className="text-xs mt-2">
                <details>
                  <summary className="cursor-pointer text-purple-400">Raw Data</summary>
                  <pre className="mt-1 text-xs bg-background p-1 rounded">{JSON.stringify({
                    subscription: currentSubscription,
                    user: user ? { id: user.id, email: user.email } : null,
                    localStorage: localStorage.getItem('oriri-free-trial') ? 'Present' : 'Missing'
                  }, null, 2)}</pre>
                </details>
              </div>
            </div>
          </div>
          {/* Spotify RSS Test */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">Spotify RSS</span>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={testSpotifyRSS}
                disabled={loading.spotify}
                className="h-6 px-2 text-xs"
              >
                {loading.spotify ? 'Testing...' : 'Test'}
              </Button>
            </div>
            {spotifyResult && (
              <div className="p-2 bg-muted rounded text-xs">
                <Badge variant={spotifyResult.success ? "default" : "destructive"} className="mb-1">
                  {spotifyResult.success ? 'Success' : 'Failed'}
                </Badge>
                <div>Episodes: {spotifyResult.episodes?.length || 0}</div>
                {spotifyResult.error && <div className="text-red-500">Error: {spotifyResult.error}</div>}
              </div>
            )}
          </div>

          {/* YouTube API Test */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">YouTube API</span>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={testYouTubeAPI}
                disabled={loading.youtube}
                className="h-6 px-2 text-xs"
              >
                {loading.youtube ? 'Testing...' : 'Test'}
              </Button>
            </div>
            {youtubeResult && (
              <div className="p-2 bg-muted rounded text-xs">
                <Badge variant={youtubeResult.success ? "default" : "destructive"} className="mb-1">
                  {youtubeResult.success ? 'Success' : 'Failed'}
                </Badge>
                <div>Episodes: {youtubeResult.episodes?.length || 0}</div>
                {youtubeResult.error && <div className="text-red-500">Error: {youtubeResult.error}</div>}
              </div>
            )}
          </div>

          {/* YouTube Status Test */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">YouTube Status</span>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={testYouTubeStatus}
                disabled={loading.ytStatus}
                className="h-6 px-2 text-xs"
              >
                {loading.ytStatus ? 'Testing...' : 'Test'}
              </Button>
            </div>
            {youtubeStatus && (
              <div className="p-2 bg-muted rounded text-xs">
                <Badge variant={youtubeStatus.success ? "default" : "destructive"} className="mb-1">
                  {youtubeStatus.success ? 'Success' : 'Failed'}
                </Badge>
                <div>Configured: {youtubeStatus.configured ? 'Yes' : 'No'}</div>
                <div>API Key: {youtubeStatus.hasKey || 'None'}</div>
                {youtubeStatus.error && <div className="text-red-500">Error: {youtubeStatus.error}</div>}
              </div>
            )}
          </div>

          {/* Exclusive API Test */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">Exclusive API</span>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={testExclusiveAPI}
                disabled={loading.exclusive}
                className="h-6 px-2 text-xs"
              >
                {loading.exclusive ? 'Testing...' : 'Test'}
              </Button>
            </div>
            {exclusiveResult && (
              <div className="p-2 bg-muted rounded text-xs">
                <Badge variant={Array.isArray(exclusiveResult) ? "default" : "destructive"} className="mb-1">
                  {Array.isArray(exclusiveResult) ? 'Success' : 'Failed'}
                </Badge>
                <div>Episodes: {Array.isArray(exclusiveResult) ? exclusiveResult.length : 0}</div>
                {exclusiveResult.error && <div className="text-red-500">Error: {exclusiveResult.error}</div>}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}