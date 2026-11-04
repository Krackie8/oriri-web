import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from './ui/dialog';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { 
  EditIcon, 
  CrownIcon, 
  HeartIcon, 
  PlayIcon, 
  PlusIcon, 
  MinusIcon,
  SettingsIcon,
  StoreIcon,
  LogOutIcon,
  BellIcon,
  MoonIcon,
  GlobeIcon,
  CheckIcon,
  ShieldIcon,
  Package,
  ShoppingBag,
  Calendar,
  ChevronDown,
  ChevronUp,
  Truck,
  Clock,
  XCircle,
  Flame,
  Award,
  Headphones,
  Sparkles,
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { VipBenefitsDisplay } from './vip/VipBenefitsDisplay';
import { SubscriptionModal } from './vip/SubscriptionModal';
import { useVipSubscription } from '../contexts/VipSubscriptionContext';
import { useAdmin } from '../hooks/useAdmin';
import { useAuth } from '../hooks/useAuth';
import { useSavedEpisodes } from '../hooks/useSavedEpisodes';
import { useJourney } from '../hooks/useJourney';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../utils/supabase/client';
import { toast } from 'sonner';
import { useCart } from '../contexts/CartContext';
import ProfileOrdersSection from './ProfileOrdersSection';

/** Display metadata for the server-authoritative journey badge ids. */
const JOURNEY_BADGE_META: Record<string, { label: string; icon: typeof Award }> = {
  first_listen:     { label: 'First Listen',    icon: PlayIcon },
  total_listens_10: { label: '10 Episodes',     icon: Headphones },
  total_listens_50: { label: '50 Episodes',     icon: Headphones },
  listen_streak_7:  { label: '7-Day Streak',    icon: Flame },
  listen_streak_30: { label: '30-Day Streak',   icon: Flame },
  nourish_streak_4: { label: 'Nourish Devotee', icon: HeartIcon },
};

interface Episode {
  id: number;
  title: string;
  image: string;
  duration: string;
  publishedDate: string;
}

interface PlaylistItem extends Episode {
  addedDate: string;
}

interface HistoryItem extends Episode {
  progress: number;
  lastPlayed: string;
}

interface UserProfile {
  name: string;
  bio: string;
  avatar: string;
  email: string;
  joinDate: string;
  subscription: {
    tier: 'free' | 'pro' | 'premium';
    expiryDate?: string;
  };
}

interface Settings {
  notifications: boolean;
  darkMode: boolean;
  language: string;
}

const mockProfile: UserProfile = {
  name: "Sarah Chen",
  bio: "Urban planning enthusiast and podcast lover. Always excited to learn about sustainable city development and smart technologies.",
  avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=100&h=100&fit=crop",
  email: "sarah.chen@email.com",
  joinDate: "March 2023",
  subscription: {
    tier: 'pro',
    expiryDate: "March 15, 2024"
  }
};


const mockPlaylist: PlaylistItem[] = [
  {
    id: 1,
    title: "The Future of Urban Development in Dubai",
    image: "https://images.unsplash.com/photo-1581464628523-fa4f91e15dc7?w=50&h=50&fit=crop",
    duration: "45min",
    publishedDate: "Dec 15, 2023",
    addedDate: "Dec 16, 2023"
  },
  {
    id: 3,
    title: "Smart Transportation Systems",
    image: "https://images.unsplash.com/photo-1589838365325-5d2fb58ee8f8?w=50&h=50&fit=crop",
    duration: "38min",
    publishedDate: "Dec 1, 2023",
    addedDate: "Dec 5, 2023"
  }
];

const mockHistory: HistoryItem[] = [
  {
    id: 1,
    title: "The Future of Urban Development in Dubai",
    image: "https://images.unsplash.com/photo-1581464628523-fa4f91e15dc7?w=50&h=50&fit=crop",
    duration: "45min",
    publishedDate: "Dec 15, 2023",
    progress: 85,
    lastPlayed: "Yesterday"
  },
  {
    id: 2,
    title: "Building Sustainable Cities",
    image: "https://images.unsplash.com/photo-1632800237110-f9c87acc2222?w=50&h=50&fit=crop",
    duration: "42min",
    publishedDate: "Dec 8, 2023",
    progress: 60,
    lastPlayed: "2 days ago"
  },
  {
    id: 3,
    title: "Smart Transportation Systems",
    image: "https://images.unsplash.com/photo-1589838365325-5d2fb58ee8f8?w=50&h=50&fit=crop",
    duration: "38min",
    publishedDate: "Dec 1, 2023",
    progress: 100,
    lastPlayed: "1 week ago"
  }
];

const subscriptionTiers = [
  {
    id: 'free',
    name: 'Free',
    price: 'AED 0',
    period: '/month',
    features: [
      'Access to Spotify, Apple Podcasts & YouTube episodes',
      'Standard audio quality',
      'Basic podcast experience'
    ],
    current: false
  },
  {
    id: 'vip',
    name: 'VIP',
    price: 'AED 20',
    period: '/month',
    features: [
      'Exclusive Oriri Episodes',
      'Ad-Free Experience', 
      'VIP Community Badge',
      'Behind-the-Scenes Content',
      'Early Access to New Content'
    ],
    current: false,
    popular: true,
    gradient: true
  }
];

interface ProfileScreenProps {
  onLogout: () => void;
  onEpisodeSelect: (episode: Episode) => void;
  onNavigateToStore: () => void;
}

export default function ProfileScreen({ onLogout, onEpisodeSelect, onNavigateToStore }: ProfileScreenProps) {
  const { user, session } = useAuth();
  const [searchParams] = useSearchParams();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<Settings>({
    notifications: true,
    darkMode: true,
    language: 'English'
  });
  // Real saved-episode library (server-backed).
  const { saved, toggleSaved } = useSavedEpisodes();
  const favorites = saved.map((s) => s.episode).filter(Boolean);
  const { listenStreak, totalListens, badges, nourishStreak, isLoggedIn: journeyLoggedIn } = useJourney();
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    bio: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const settingsSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Orders state - Phase 2B-1
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [orderFilter, setOrderFilter] = useState<string>('all');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  
  const { formatPrice } = useCart();

  const { isAdmin, isCreator, loading: adminLoading, error: adminError, isInitialized } = useAdmin();
  const { 
    currentSubscription,
    currentTier,
    isVipMember,
    isOnTrial, 
    getRemainingTrialDays
  } = useVipSubscription();
  const navigate = useNavigate();

  // Initialize profile and settings from user data
  useEffect(() => {
    if (user) {
      const userProfile: UserProfile = {
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        bio: user.user_metadata?.bio || 'Oriri podcast listener',
        avatar: user.user_metadata?.avatar_url || '',
        email: user.email || '',
        joinDate: new Date(user.created_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long'
        }),
        subscription: {
          tier: currentSubscription?.tierId || 'free',
          expiryDate: currentSubscription?.endDate
        }
      };
      setProfile(userProfile);
      setEditForm({
        name: userProfile.name,
        bio: userProfile.bio
      });

      // Restore persisted settings from user metadata
      const savedSettings = user.user_metadata?.settings;
      if (savedSettings) {
        setSettings(prev => ({ ...prev, ...savedSettings }));
      }
    }
  }, [user, currentSubscription, isVipMember, isOnTrial]);

  // Only show admin link if user is confirmed admin and there's no error
  const shouldShowAdminLink = (isAdmin || isCreator) && !adminLoading && !adminError && isInitialized;

  const getSubscriptionBadge = (tier: string) => {
    // Show trial badge if user is on trial
    if (isOnTrial) {
      const daysLeft = getRemainingTrialDays();
      return (
        <Badge className="text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white">
          👑 Free Trial ({daysLeft} days left)
        </Badge>
      );
    }
    
    switch (tier) {
      case 'free':
        return <Badge variant="secondary" className="text-xs">Free</Badge>;
      case 'vip':
        return <Badge className="text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white">👑 VIP</Badge>;
      case 'pro':
        return <Badge className="text-xs bg-blue-500 text-white">Pro</Badge>;
      case 'premium':
        return <Badge className="text-xs bg-purple-500 text-white">Premium</Badge>;
      default:
        return null;
    }
  };

  const handleSaveProfile = async () => {
    if (!profile || isSaving) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          name: editForm.name,
          bio: editForm.bio,
        },
      });
      if (error) throw error;
      setProfile(prev => prev ? ({ ...prev, name: editForm.name, bio: editForm.bio }) : null);
      setShowEditProfile(false);
      toast.success('Profile updated successfully');
    } catch {
      toast.error('Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const persistSettings = (newSettings: Settings) => {
    if (settingsSaveTimer.current) clearTimeout(settingsSaveTimer.current);
    settingsSaveTimer.current = setTimeout(async () => {
      try {
        await supabase.auth.updateUser({ data: { settings: newSettings } });
      } catch {
        // Settings are non-critical; fail silently
      }
    }, 800);
  };

  const handleRemoveFromFavorites = (episode: any) => {
    // Optimistic remove + server sync via the saved-episodes hook.
    void toggleSaved(episode);
  };

  const handleRemoveFromPlaylist = (episodeId: number) => {
    setPlaylist(playlist.filter(ep => ep.id !== episodeId));
    // TODO: Update in backend
  };

  const handleSettingChange = (key: keyof Settings, value: boolean | string) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    persistSettings(newSettings);
  };

  if (!profile) {
    return (
      <div className="pt-[60px] min-h-screen w-full relative flex items-center justify-center" style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-[60px] min-h-screen w-full relative" style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>
      <div className="pb-4 min-h-full">
        {/* Profile Header */}
        <div className="p-4 bg-card/50 backdrop-blur-sm border-b border-border/50">
          <div className="flex items-start gap-4">
            <Avatar className="w-20 h-20">
              <AvatarImage src={profile.avatar} alt={profile.name} />
              <AvatarFallback>{profile.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-medium">{profile.name}</h1>
                {getSubscriptionBadge(profile.subscription.tier)}
              </div>
              <p className="text-muted-foreground text-sm mb-2">{profile.bio}</p>
              <p className="text-muted-foreground text-xs">Member since {profile.joinDate}</p>
            </div>
            
            <Dialog open={showEditProfile} onOpenChange={setShowEditProfile}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <EditIcon className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-background/95 backdrop-blur-sm border-border/50 max-w-sm mx-4">
                <DialogHeader>
                  <DialogTitle>Edit Profile</DialogTitle>
                  <DialogDescription>
                    Update your profile information and bio
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Name</label>
                    <Input
                      value={editForm.name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                      className="bg-input border-border"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Bio</label>
                    <Textarea
                      value={editForm.bio}
                      onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                      rows={3}
                      className="bg-input border-border resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="flex-1 bg-primary/90 hover:bg-primary text-primary-foreground"
                    >
                      {isSaving ? 'Saving…' : 'Save'}
                    </Button>
                    <Button variant="outline" onClick={() => setShowEditProfile(false)} disabled={isSaving} className="flex-1">
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Subscription */}
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium">Subscription</h2>
            <Button 
              size="sm" 
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
              onClick={() => setShowSubscriptionModal(true)}
            >
              <CrownIcon className="w-4 h-4 mr-1" />
              {isVipMember 
                ? 'Manage Subscription' 
                : isOnTrial 
                  ? 'Upgrade to Full VIP'
                  : 'Become a VIP Member'
              }
            </Button>
          </div>
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {isOnTrial ? 'VIP Trial' : `${profile.subscription.tier.charAt(0).toUpperCase() + profile.subscription.tier.slice(1)} Plan`}
                </p>
                {isOnTrial ? (
                  <p className="text-sm text-muted-foreground">
                    Trial ends in {getRemainingTrialDays()} days
                  </p>
                ) : profile.subscription.expiryDate ? (
                  <p className="text-sm text-muted-foreground">Expires {profile.subscription.expiryDate}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Access to free content from Spotify, YouTube & Apple Podcasts
                  </p>
                )}
              </div>
              {getSubscriptionBadge(profile.subscription.tier)}
            </div>
            
            {/* Trial Status Progress Bar */}
            {isOnTrial && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span>Trial Progress</span>
                  <span>{getRemainingTrialDays()} days left</span>
                </div>
                <Progress 
                  value={((7 - (getRemainingTrialDays() || 0)) / 7) * 100} 
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  🎉 Enjoying VIP? Upgrade anytime to continue after trial
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Oriri Journey */}
        {journeyLoggedIn && (
          <div className="p-4 border-b border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <h2 className="font-medium">Oriri Journey</h2>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-card/30 rounded-lg p-3 text-center">
                <Flame className="w-5 h-5 text-primary mx-auto mb-1" />
                <div className="text-lg font-semibold">{listenStreak}</div>
                <div className="text-xs text-muted-foreground">Listen streak</div>
              </div>
              <div className="bg-card/30 rounded-lg p-3 text-center">
                <Headphones className="w-5 h-5 text-primary mx-auto mb-1" />
                <div className="text-lg font-semibold">{totalListens}</div>
                <div className="text-xs text-muted-foreground">Episodes played</div>
              </div>
              <div className="bg-card/30 rounded-lg p-3 text-center">
                <HeartIcon className="w-5 h-5 text-primary mx-auto mb-1" />
                <div className="text-lg font-semibold">{nourishStreak}</div>
                <div className="text-xs text-muted-foreground">Nourish streak</div>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <Award className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Achievements</h3>
            </div>
            {badges.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Keep listening to earn your first badge.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {badges.map((b) => {
                  const meta = JOURNEY_BADGE_META[b.id] ?? {
                    label: b.id,
                    icon: Award,
                  };
                  const Icon = meta.icon;
                  return (
                    <div
                      key={b.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary"
                      title={meta.label}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{meta.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Favorites */}
        <div className="p-4 border-b border-border/50">
          <h2 className="font-medium mb-3">Favorites ({favorites.length})</h2>
          {favorites.length === 0 ? (
            <div className="text-center py-8">
              <HeartIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No favorite episodes yet</p>
              <p className="text-sm text-muted-foreground">Start adding episodes to your favorites!</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                {favorites.slice(0, 4).map(episode => (
                  <div 
                    key={episode.id}
                    className="bg-card/30 rounded-lg p-3 cursor-pointer hover:bg-card/50 transition-all duration-200 relative group"
                    onClick={() => onEpisodeSelect(episode)}
                  >
                    <button
                      className="absolute top-2 right-2 w-6 h-6 bg-background/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFromFavorites(episode);
                      }}
                    >
                      <MinusIcon className="w-3 h-3 text-destructive" />
                    </button>
                    <ImageWithFallback
                      src={episode.image}
                      alt={episode.title}
                      className="w-full aspect-square object-cover rounded-md mb-2"
                    />
                    <h3 className="font-medium text-sm line-clamp-2 mb-1">{episode.title}</h3>
                    <p className="text-xs text-muted-foreground">{episode.duration}</p>
                  </div>
                ))}
              </div>
              {favorites.length > 4 && (
                <Button variant="ghost" className="w-full mt-3 text-muted-foreground">
                  View All Favorites ({favorites.length})
                </Button>
              )}
            </>
          )}
        </div>

        {/* My Orders - Phase 2B-1 */}
        {user && <ProfileOrdersSection userId={user.id} />}

        {/* Playlists */}
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium">Playlists</h2>
            <Button variant="ghost" size="sm">
              <PlusIcon className="w-4 h-4" />
            </Button>
          </div>
          {playlist.length === 0 ? (
            <div className="text-center py-8">
              <PlayIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No playlists created yet</p>
              <p className="text-sm text-muted-foreground">Create your first playlist!</p>
            </div>
          ) : (
            <div className="bg-card/30 rounded-lg p-3">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                  <PlayIcon className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">My Mix</h3>
                  <p className="text-sm text-muted-foreground">{playlist.length} episodes</p>
                </div>
                <Button variant="ghost" size="sm">
                  <PlayIcon className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {playlist.map(episode => (
                  <div key={episode.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 group">
                    <ImageWithFallback
                      src={episode.image}
                      alt={episode.title}
                      className="w-8 h-8 object-cover rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-clamp-1">{episode.title}</p>
                      <p className="text-xs text-muted-foreground">{episode.duration}</p>
                    </div>
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemoveFromPlaylist(episode.id)}
                    >
                      <MinusIcon className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Recently Played */}
        <div className="p-4 border-b border-border/50">
          <h2 className="font-medium mb-3">Recently Played</h2>
          <div className="text-center py-8">
            <PlayIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No recent activity</p>
            <p className="text-sm text-muted-foreground">Start listening to episodes!</p>
          </div>
        </div>

        {/* Settings */}
        <div className="p-4 border-b border-border/50">
          <h2 className="font-medium mb-3">Settings</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BellIcon className="w-5 h-5 text-muted-foreground" />
                <span>Notifications</span>
              </div>
              <Switch
                checked={settings.notifications}
                onCheckedChange={(checked) => handleSettingChange('notifications', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MoonIcon className="w-5 h-5 text-muted-foreground" />
                <span>Dark Mode</span>
              </div>
              <Switch
                checked={settings.darkMode}
                onCheckedChange={(checked) => handleSettingChange('darkMode', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <GlobeIcon className="w-5 h-5 text-muted-foreground" />
                <span>Language</span>
              </div>
              <select 
                value={settings.language}
                onChange={(e) => handleSettingChange('language', e.target.value)}
                className="px-3 py-1 bg-input border border-border rounded-md text-sm"
              >
                <option value="English">English</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
                <option value="German">German</option>
              </select>
            </div>
          </div>
        </div>

        {/* Settings Link */}
        <div className="p-4 border-b border-border/50">
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={() => navigate('/settings')}
          >
            <SettingsIcon className="w-5 h-5 mr-3" />
            Settings
          </Button>
        </div>

        {/* Store Link */}
        <div className="p-4 border-b border-border/50">
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={onNavigateToStore}
          >
            <StoreIcon className="w-5 h-5 mr-3" />
            Browse Merchandise
          </Button>
        </div>

        {/* Admin Dashboard Link - Only visible to admin users */}
        {shouldShowAdminLink && (
          <div className="p-4 border-b border-border/50">
            <Button 
              variant="outline" 
              className="w-full justify-start border-primary/30 hover:border-primary hover:bg-primary/5"
              onClick={() => navigate('/admin')}
            >
              <ShieldIcon className="w-5 h-5 mr-3 text-primary" />
              <div className="flex items-center gap-2">
                <span>Admin Dashboard</span>
                <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
                  Creator
                </Badge>
              </div>
            </Button>
          </div>
       )}



        {/* Vip Benefits Display */}
        <div className="p-4">
          <VipBenefitsDisplay showSubscribeButton={false} />
        </div>

        {/* Logout */}
        <div className="p-4">
          <Button 
            variant="destructive" 
            className="w-full justify-start"
            onClick={onLogout}
          >
            <LogOutIcon className="w-5 h-5 mr-3" />
            Logout
          </Button>
        </div>
      </div>

      {/* Unified Subscription Modal */}
      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
      />
    </div>
  );
}