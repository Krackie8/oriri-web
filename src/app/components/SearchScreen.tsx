import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { 
  Search, 
  Mic, 
  X, 
  ArrowLeft, 
  Clock, 
  User, 
  FileText, 
  Play,
  TrendingUp,
  Zap
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const SEARCH_URL = `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/episodes/search`;

interface SearchResult {
  id: string;
  type: 'episode' | 'guest' | 'transcript';
  title: string;
  subtitle?: string;
  description: string;
  image?: string;
  matchText?: string;
  episode?: {
    id: number;
    duration: string;
    publishedDate: string;
  };
  guest?: {
    name: string;
    image: string;
  };
}

interface SearchScreenProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchScreen({ isOpen, onClose }: SearchScreenProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([
    'Dubai urban planning',
    'sustainable cities',
    'John Doe',
    'smart city technologies',
    'green building'
  ]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  // Monotonic id so a slow, stale response can't overwrite newer results.
  const requestIdRef = useRef(0);

  const trendingSearches = [
    'urban planning',
    'sustainability',
    'smart cities',
    'green building',
    'Dubai transformation'
  ];

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      // Small delay to ensure the modal is fully rendered
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchQuery.trim()) {
      setIsSearching(true);
      setShowSuggestions(false);

      // Debounced fetch against the cached-episode search route. This reads the
      // KV episode store only — it never triggers a Spotify/YouTube sync.
      const searchTimeout = setTimeout(async () => {
        const reqId = ++requestIdRef.current;
        try {
          const res = await fetch(`${SEARCH_URL}?q=${encodeURIComponent(searchQuery)}&limit=20`, {
            headers: { Authorization: `Bearer ${publicAnonKey}` },
          });
          const json = await res.json().catch(() => ({}));
          // Ignore if a newer search has since fired.
          if (reqId !== requestIdRef.current) return;

          const mapped: SearchResult[] = (json.data ?? []).map((ep: any) => ({
            id: String(ep.id),
            type: 'episode' as const,
            title: ep.title ?? 'Untitled episode',
            subtitle: ep.episodeNumber ? `Episode ${ep.episodeNumber}` : undefined,
            description: ep.description ?? '',
            image: ep.imageUrl ?? ep.image ?? undefined,
          }));
          setResults(mapped);
        } catch {
          if (reqId === requestIdRef.current) setResults([]);
        } finally {
          if (reqId === requestIdRef.current) setIsSearching(false);
        }
      }, 300);

      return () => clearTimeout(searchTimeout);
    } else {
      setResults([]);
      setIsSearching(false);
      setShowSuggestions(true);
    }
  }, [searchQuery]);

  const handleSearchSubmit = (query: string) => {
    if (query.trim() && !recentSearches.includes(query)) {
      setRecentSearches(prev => [query, ...prev.slice(0, 4)]);
    }
    setSearchQuery(query);
  };

  const handleClearRecentSearches = () => {
    setRecentSearches([]);
  };

  const handleResultClick = (result: SearchResult) => {
    // Add to recent searches
    if (!recentSearches.includes(searchQuery) && searchQuery.trim()) {
      setRecentSearches(prev => [searchQuery, ...prev.slice(0, 4)]);
    }
    
    if (result.type === 'episode') {
      navigate(`/episode/${result.id}`);
      onClose();
    } else if (result.type === 'guest' && result.guest) {
      // For now, navigate to episodes screen when clicking on guests
      // In a full implementation, this could go to a guest profile page
      navigate('/episodes');
      onClose();
    } else if (result.type === 'transcript' && result.episode) {
      navigate(`/episode/${result.id}`);
      onClose();
    }
  };

  const handleVoiceSearch = () => {
    setIsVoiceRecording(!isVoiceRecording);
    // In a real implementation, this would start/stop voice recognition
    if (!isVoiceRecording) {
      setTimeout(() => {
        setIsVoiceRecording(false);
        setSearchQuery('urban planning voice search');
      }, 2000);
    }
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return (
      <span>
        {parts.map((part, index) => 
          regex.test(part) ? (
            <mark key={index} className="bg-yellow-500/30 text-foreground rounded px-1">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'episode':
        return <Play className="w-4 h-4 text-primary" />;
      case 'guest':
        return <User className="w-4 h-4 text-blue-500" />;
      case 'transcript':
        return <FileText className="w-4 h-4 text-green-500" />;
      default:
        return <Search className="w-4 h-4 text-muted-foreground" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 animate-in fade-in duration-200">
      <div className="flex flex-col h-full max-h-screen">
        {/* Header */}
        <div className="flex-shrink-0 bg-background/80 backdrop-blur-sm border-b border-border/50">
          <div className="flex items-center gap-3 p-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="flex-shrink-0 p-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            
            <div className="flex-1 relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search episodes, guests, transcripts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSearchSubmit(searchQuery);
                    }
                  }}
                  className="pl-10 pr-12 h-12 bg-card/50 text-base"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleVoiceSearch}
                  className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-2 transition-colors ${
                    isVoiceRecording ? 'bg-red-500/20 text-red-500' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Mic className={`w-4 h-4 ${isVoiceRecording ? 'animate-pulse' : ''}`} />
                </Button>
              </div>
            </div>
            
            {searchQuery && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSearchQuery('')}
                className="flex-shrink-0 p-2"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Voice Recording Indicator */}
        {isVoiceRecording && (
          <div className="flex-shrink-0 bg-red-500/10 border-b border-red-500/20 px-4 py-3">
            <div className="flex items-center justify-center gap-3">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-500 text-sm">Listening...</span>
              <div className="flex gap-1">
                {Array.from({ length: 3 }, (_, i) => (
                  <div 
                    key={i}
                    className="w-1 h-4 bg-red-500/50 rounded-full animate-pulse"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-6 pb-safe-bottom">
            {showSuggestions && (
              <>
                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-base">Recent Searches</h3>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleClearRecentSearches}
                        className="text-xs text-muted-foreground"
                      >
                        Clear All
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {recentSearches.map((search, index) => (
                        <button
                          key={index}
                          onClick={() => handleSearchSubmit(search)}
                          className="flex items-center gap-2 px-3 py-2 bg-card/80 hover:bg-accent/50 rounded-full border border-border/50 transition-colors"
                        >
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm">{search}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Trending Searches */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <h3 className="text-base">Trending</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {trendingSearches.map((trend, index) => (
                      <button
                        key={index}
                        onClick={() => handleSearchSubmit(trend)}
                        className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 rounded-full border border-primary/20 transition-colors"
                      >
                        <Zap className="w-3 h-3 text-primary" />
                        <span className="text-sm">{trend}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Search Results */}
            {searchQuery && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base">
                    {isSearching ? 'Searching...' : `Results for "${searchQuery}"`}
                  </h3>
                  {!isSearching && results.length > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {results.length} result{results.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {isSearching ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }, (_, i) => (
                      <Card key={i} className="bg-card/80 backdrop-blur-sm border-white/10">
                        <CardContent className="p-4">
                          <div className="flex gap-3">
                            <div className="w-16 h-16 bg-muted/50 rounded-lg animate-pulse flex-shrink-0" />
                            <div className="flex-1 space-y-2">
                              <div className="h-4 bg-muted/50 rounded animate-pulse" />
                              <div className="h-3 bg-muted/30 rounded animate-pulse w-3/4" />
                              <div className="h-3 bg-muted/30 rounded animate-pulse w-1/2" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : results.length > 0 ? (
                  <div className="space-y-3">
                    {results.map((result) => (
                      <Card 
                        key={result.id}
                        className="bg-card/80 backdrop-blur-sm border-white/10 hover:bg-accent/50 transition-colors cursor-pointer"
                        onClick={() => handleResultClick(result)}
                      >
                        <CardContent className="p-4">
                          <div className="flex gap-3">
                            {/* Result Icon/Image */}
                            <div className="flex-shrink-0">
                              {result.image ? (
                                <ImageWithFallback
                                  src={result.image}
                                  alt={result.title}
                                  className="w-16 h-16 rounded-lg object-cover"
                                />
                              ) : (
                                <div className="w-16 h-16 bg-muted/20 rounded-lg flex items-center justify-center">
                                  {getResultIcon(result.type)}
                                </div>
                              )}
                            </div>

                            {/* Result Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {getResultIcon(result.type)}
                                <Badge 
                                  variant="secondary" 
                                  className="text-xs capitalize"
                                >
                                  {result.type}
                                </Badge>
                              </div>
                              
                              <h4 className="mb-1 truncate">
                                {highlightMatch(result.title, searchQuery)}
                              </h4>
                              
                              {result.subtitle && (
                                <p className="text-sm text-muted-foreground mb-2">
                                  {result.subtitle}
                                </p>
                              )}
                              
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {result.matchText ? 
                                  highlightMatch(result.matchText, searchQuery) : 
                                  highlightMatch(result.description, searchQuery)
                                }
                              </p>

                              {/* Episode metadata */}
                              {result.episode && (
                                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                  <span>{result.episode.duration}</span>
                                  <span>•</span>
                                  <span>{result.episode.publishedDate}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  // No Results
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Search className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <h3 className="mb-2">No results found</h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      Try adjusting your search or using different keywords
                    </p>
                    
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Try searching for:</p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {['episodes', 'guests', 'urban planning', 'sustainability'].map((suggestion) => (
                          <button
                            key={suggestion}
                            onClick={() => handleSearchSubmit(suggestion)}
                            className="px-3 py-2 bg-primary/10 hover:bg-primary/20 rounded-full text-sm transition-colors border border-primary/20"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}