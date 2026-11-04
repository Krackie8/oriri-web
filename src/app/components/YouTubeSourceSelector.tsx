import React, { useState } from 'react';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { AlertCircle, CheckCircle, Wifi, Database } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';

interface YouTubeSourceSelectorProps {
  currentSource: 'rss' | 'api';
  onSourceChange: (source: 'rss' | 'api') => void;
  apiConfigured: boolean;
  className?: string;
}

export function YouTubeSourceSelector({ 
  currentSource, 
  onSourceChange, 
  apiConfigured,
  className = '' 
}: YouTubeSourceSelectorProps) {
  const [isChanging, setIsChanging] = useState(false);

  const handleSourceChange = async (newSource: 'rss' | 'api') => {
    if (newSource === currentSource) return;
    
    setIsChanging(true);
    
    // Simulate a brief loading state to show the change is processing
    setTimeout(() => {
      onSourceChange(newSource);
      setIsChanging(false);
    }, 500);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          YouTube Data Source
        </CardTitle>
        <CardDescription>
          YouTube API provides richer data (views, likes, comments). RSS is available as a fallback. Spotify always uses RSS.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <RadioGroup 
          value={currentSource} 
          onValueChange={handleSourceChange}
          disabled={isChanging}
        >
          {/* API Option - Now Primary */}
          <div className="flex items-start space-x-3 rounded-lg border-2 border-primary/50 bg-primary/5 p-4 hover:bg-primary/10 transition-colors">
            <RadioGroupItem 
              value="api" 
              id="api" 
              disabled={!apiConfigured}
              className="mt-1" 
            />
            <div className="flex-1 space-y-2">
              <Label 
                htmlFor="api" 
                className={`flex items-center gap-2 ${apiConfigured ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
              >
                <Database className="w-4 h-4" />
                YouTube Data API v3
                <Badge variant="default" className="text-xs">Recommended</Badge>
              </Label>
              <p className="text-sm text-muted-foreground">
                Uses YouTube's official API for rich metadata including views, likes, comments, and better thumbnails.
              </p>
              <div className="flex items-center gap-2 text-xs">
                {apiConfigured ? (
                  <>
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    <span className="text-green-600">API configured & ready</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3 text-orange-500" />
                    <span className="text-orange-600">API key required</span>
                  </>
                )}
              </div>
              
              {!apiConfigured && (
                <Alert className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    YouTube API key not configured. Will automatically fallback to RSS until configured.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          {/* RSS Option - Now Fallback */}
          <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors">
            <RadioGroupItem value="rss" id="rss" className="mt-1" />
            <div className="flex-1 space-y-2">
              <Label htmlFor="rss" className="flex items-center gap-2 cursor-pointer">
                <Wifi className="w-4 h-4" />
                RSS Feed
                <Badge variant="outline" className="text-xs">Fallback</Badge>
              </Label>
              <p className="text-sm text-muted-foreground">
                Uses YouTube's RSS feed for basic episode information. Simple and reliable fallback option.
              </p>
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle className="w-3 h-3 text-green-500" />
                <span className="text-green-600">Always available</span>
              </div>
            </div>
          </div>
        </RadioGroup>

        {isChanging && (
          <div className="flex items-center justify-center p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              Switching data source...
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded">
          <strong>Note:</strong> API is now the default for richer YouTube data. 
          Spotify episodes always use RSS. RSS fallback available if needed.
        </div>
      </CardContent>
    </Card>
  );
}