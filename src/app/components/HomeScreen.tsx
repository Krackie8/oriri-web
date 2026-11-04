import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  Lock,
  Crown,
  ArrowRight,
  ArrowUpRight,
  Leaf,
  Headphones,
  HeartHandshake,
  ShoppingBag,
  Radio,
  CalendarHeart,
  BookHeart,
  Sparkles,
  MapPin,
  Check,
  Plus,
  Camera,
  ChevronLeft,
  ChevronRight,
  type LucideIcon
} from 'lucide-react';
import * as wellnessApi from '../utils/wellnessApi';
import type { WellnessEvent, WellnessGuide, StepsistersMoment } from '../utils/wellnessApi';
import { useAdmin } from '../hooks/useAdmin';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { fallbackImages } from '../utils/imageUtils';
import { useAuth } from '../hooks/useAuth';
import { useUserProfile } from '../hooks/useUserProfile';
import { useModals } from '../contexts/ModalContext';
import { useVipSubscription } from '../contexts/VipSubscriptionContext';
import { useStore } from '../contexts/StoreContext';
import { useSimpleLiveSessions } from '../hooks/useSimpleLiveSessions';
import * as nourishApi from '../utils/nourishApi';
import * as listeningApi from '../utils/listeningApi';
import { useSocialConfig } from '../hooks/useSocialConfig';
import * as socialApi from '../utils/socialApi';
import { PLATFORM_META } from '../data/socialConfig';
import { formSubmit, podcastPlayClick } from '../wellness/analytics/track';
import { getUtm } from '../wellness/analytics/utm';

// Import episode fetching services
import { safeYouTubeAPIService } from '../utils/youtubeAPIServiceSafe';
import { projectId, publicAnonKey } from '../utils/supabase/info';

// Episode interface matching the existing format
interface Episode {
  id: string;
  title: string;
  description: string;
  audioUrl: string;
  imageUrl: string;
  duration: number;
  publishedDate: string;
  episodeNumber?: string;
  platform: 'spotify' | 'youtube' | 'exclusive';
  isExclusive?: boolean;
  requiredTier?: string[];
}

interface HomeScreenProps {
  onEpisodeSelect: (episode: any) => void;
  onPlayEpisode: (episode: any) => void;
}

type BoxId = 'calendar' | 'guide' | 'bestie' | 'podcast' | 'stepsisters' | 'shop';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32`;
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=400&fit=crop';
const NOURISH_GOALS = ['Gut Health', 'Glowing Skin', 'Hormones', 'Energy', 'Balance'];
// Soft pastel dots for list rows (per platform)
const PLATFORM_DOT: Record<Episode['platform'], string> = {
  spotify: 'bg-[#C4A484]',
  youtube: 'bg-[#E8B4B8]',
  exclusive: 'bg-[#D9B9A0]'
};

// Each tile has its own warm tone; the outline echoes the icon circle
const BOXES: { id: BoxId; label: string; subline: string; icon: LucideIcon; tone: string; ring: string; ringActive: string; tint: string }[] = [
  { id: 'calendar', label: 'Wellness Calendar', subline: "What's on", icon: CalendarHeart, tone: 'bg-[#E6B7B2]', ring: 'ring-[#E6B7B2]/40', ringActive: 'ring-[#E6B7B2]', tint: 'bg-[#E6B7B2]/10' },
  { id: 'guide', label: 'Wellness Guide', subline: 'Daily picks', icon: BookHeart, tone: 'bg-[#D9A49D]', ring: 'ring-[#D9A49D]/40', ringActive: 'ring-[#D9A49D]', tint: 'bg-[#D9A49D]/10' },
  { id: 'bestie', label: 'Wellness Bestie', subline: 'Coming soon', icon: Sparkles, tone: 'bg-[#C99485]', ring: 'ring-[#C99485]/40', ringActive: 'ring-[#C99485]', tint: 'bg-[#C99485]/10' },
  { id: 'podcast', label: 'Tea for Two', subline: 'Our podcast', icon: Headphones, tone: 'bg-[#BC8C73]', ring: 'ring-[#BC8C73]/40', ringActive: 'ring-[#BC8C73]', tint: 'bg-[#BC8C73]/10' },
  { id: 'stepsisters', label: 'Stepsisters', subline: 'Our community', icon: HeartHandshake, tone: 'bg-[#A97E63]', ring: 'ring-[#A97E63]/40', ringActive: 'ring-[#A97E63]', tint: 'bg-[#A97E63]/10' },
  { id: 'shop', label: 'Shop', subline: 'Guides & plans', icon: ShoppingBag, tone: 'bg-[#8F6A52]', ring: 'ring-[#8F6A52]/40', ringActive: 'ring-[#8F6A52]', tint: 'bg-[#8F6A52]/10' }
];
const toneFor = (id: BoxId) => BOXES.find((b) => b.id === id)!.tone;

// Pastel dot per event / guide category, all in the warm family
const CATEGORY_DOTS = ['bg-[#E8B4B8]', 'bg-[#D9B9A0]', 'bg-[#C4A484]', 'bg-[#E3CFC0]', 'bg-[#CFA9A3]'];
const categoryDot = (category?: string) => {
  if (!category) return CATEGORY_DOTS[0];
  const sum = [...category].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return CATEGORY_DOTS[sum % CATEGORY_DOTS.length];
};

const formatEventTime = (time?: string) => {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  if (isNaN(h)) return time;
  const suffix = h >= 12 ? 'pm' : 'am';
  return `${((h + 11) % 12) + 1}${m ? `:${String(m).padStart(2, '0')}` : ''}${suffix}`;
};

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `${mins} min`;
};

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

const getGreeting = (): string => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

// Fetch Spotify episodes via backend API (avoids CORS issues with direct RSS)
async function fetchSpotifyEpisodes(): Promise<Episode[]> {
  try {
    const response = await fetch(`${API_BASE}/spotify/episodes`, {
      headers: { 'Authorization': `Bearer ${publicAnonKey}` }
    });
    if (!response.ok) return [];
    const data = await response.json();
    if (!data.success || !data.episodes?.length) return [];
    return data.episodes.map((ep: any, index: number) => ({
      id: ep.id,
      title: ep.title,
      description: ep.description,
      audioUrl: ep.audioUrl,
      imageUrl: ep.imageUrl || FALLBACK_IMAGE,
      duration: ep.duration,
      publishedDate: ep.publishedDate,
      episodeNumber: `#${data.episodes.length - index}`,
      platform: 'spotify' as const,
      isExclusive: false
    }));
  } catch (error) {
    console.error('[Home] Error fetching Spotify episodes:', error);
    return [];
  }
}

// Fetch YouTube episodes
async function fetchYouTubeEpisodes(): Promise<Episode[]> {
  try {
    const result = await safeYouTubeAPIService.fetchEpisodes();
    if (!result.success || result.episodes.length === 0) return [];
    return result.episodes.map((ep, index) => ({
      id: ep.id,
      title: ep.title,
      description: ep.description,
      audioUrl: ep.audioUrl,
      imageUrl: ep.imageUrl || FALLBACK_IMAGE,
      duration: ep.duration,
      publishedDate: ep.publishedDate,
      episodeNumber: `#${result.episodes.length - index}`,
      platform: 'youtube' as const,
      isExclusive: false
    }));
  } catch (error) {
    console.error('[Home] Error fetching YouTube episodes:', error);
    return [];
  }
}

// Fetch exclusive episodes from admin dashboard
async function fetchExclusiveEpisodes(): Promise<Episode[]> {
  try {
    const response = await fetch(`${API_BASE}/episodes`, {
      headers: { 'Authorization': `Bearer ${publicAnonKey}` }
    });
    if (!response.ok) return [];
    const data = await response.json();
    if (!Array.isArray(data)) return [];
    return data
      .filter((episode: any) => episode.status === 'published')
      .map((adminEpisode: any, index: number) => {
        let durationInSeconds = adminEpisode.durationSeconds || 0;
        if (adminEpisode.duration) {
          const parts = adminEpisode.duration.split(':').map(Number);
          if (parts.length === 2) durationInSeconds = parts[0] * 60 + parts[1];
          else if (parts.length === 3) durationInSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
        return {
          id: adminEpisode.id,
          title: adminEpisode.title,
          description: adminEpisode.description || adminEpisode.fullDescription || 'Exclusive content available to VIP members.',
          audioUrl: adminEpisode.audioUrl || adminEpisode.videoUrl || '#',
          imageUrl: adminEpisode.image || FALLBACK_IMAGE,
          duration: durationInSeconds,
          publishedDate: adminEpisode.publishedDate || adminEpisode.createdAt,
          episodeNumber: `VIP #${index + 1}`,
          platform: 'exclusive' as const,
          isExclusive: true,
          requiredTier: adminEpisode.vipTier ? [adminEpisode.vipTier] : ['vip']
        };
      });
  } catch (error) {
    console.error('[Home] Error fetching exclusive episodes:', error);
    return [];
  }
}

/** Filled sand circle with a fine white line glyph — the app's signature icon badge. */
function IconBadge({ icon: Icon, size = 'md', tone = 'bg-blush' }: { icon: LucideIcon; size?: 'sm' | 'md'; tone?: string }) {
  const dims = size === 'sm' ? 'h-9 w-9' : 'h-12 w-12';
  const glyph = size === 'sm' ? 'h-4 w-4' : 'h-[18px] w-[18px]';
  return (
    <span className={`flex ${dims} shrink-0 items-center justify-center rounded-full ${tone} text-white ring-4 ring-white/70 shadow-[0_6px_16px_-4px_rgba(143,106,82,0.35)]`}>
      <Icon className={glyph} strokeWidth={1.5} />
    </span>
  );
}

/** Thin sand-outline pill, like a "Today" chip. */
function PillButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full bg-[#F4E6E3] px-5 py-3 text-[13px] font-medium text-primary transition-all hover:bg-[#EDD7D3] active:scale-[0.98]"
    >
      {children}
    </button>
  );
}

function PanelHeader({ title, subtitle, tone = 'bg-blush' }: { icon?: LucideIcon; title: string; subtitle: string; tone?: string }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2.5">
        <span className={`h-2 w-2 rounded-full ${tone}`} />
        <h2 className="font-display text-[28px] font-light leading-none text-foreground">{title}</h2>
      </div>
      <p className="mt-1.5 pl-[18px] text-[13px] font-light text-muted-foreground">{subtitle}</p>
    </div>
  );
}

const cardSurface = 'rounded-[24px] border border-[#EFE3DF] bg-card shadow-[0_1px_2px_rgba(78,59,64,0.04),0_10px_30px_-12px_rgba(120,95,70,0.14)]';

export default function HomeScreen(_props: HomeScreenProps) {
  const navigate = useNavigate();
  const { isLoggedIn, session } = useAuth();
  const userProfile = useUserProfile();
  const { setShowVipSubscription, setShowLogin } = useModals();
  const { isVipMember: isVIP, hasAccess } = useVipSubscription();
  const { products, formatPrice } = useStore();
  const { allSessions: liveSessions, loading: liveSessionsLoading } = useSimpleLiveSessions();
  const { profiles: socialProfiles } = useSocialConfig();

  const firstName = (userProfile?.displayName || '').split(' ')[0];

  // Selected explore box — remembered between visits

  // Nourish: in-app nudge when a new week's plan is ready
  const [nourishNewWeek, setNourishNewWeek] = useState(false);
  useEffect(() => {
    if (!isLoggedIn) { setNourishNewWeek(false); return; }
    let cancelled = false;
    nourishApi.getState(session?.access_token).then((res) => {
      if (cancelled) return;
      setNourishNewWeek(!!(res.ok && res.data?.state && res.data.newWeekAvailable));
    });
    return () => { cancelled = true; };
  }, [isLoggedIn, session?.access_token]);

  // Continue Listening — resume in-progress episodes
  const [continueListening, setContinueListening] = useState<listeningApi.ProgressItem[]>([]);
  useEffect(() => {
    if (!isLoggedIn) { setContinueListening([]); return; }
    let cancelled = false;
    listeningApi.getProgress(session?.access_token).then((res) => {
      if (cancelled) return;
      setContinueListening(res.ok && res.data ? res.data : []);
    });
    return () => { cancelled = true; };
  }, [isLoggedIn, session?.access_token]);

  // Episodes — newest first across all platforms
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [episodesLoading, setEpisodesLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchSpotifyEpisodes(), fetchYouTubeEpisodes(), fetchExclusiveEpisodes()])
      .then(([spotify, youtube, exclusive]) => {
        if (cancelled) return;
        const all = [...spotify, ...youtube, ...exclusive].sort(
          (a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()
        );
        setEpisodes(all);
      })
      .finally(() => { if (!cancelled) setEpisodesLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const latestFive = episodes.slice(0, 5);

  // Wellness Calendar + Guide — curated by the admin
  const [events, setEvents] = useState<WellnessEvent[]>([]);
  const [guides, setGuides] = useState<WellnessGuide[]>([]);
  const [moments, setMoments] = useState<StepsistersMoment[]>([]);
  const [wellnessLoading, setWellnessLoading] = useState(true);
  const { isAdmin } = useAdmin();
  useEffect(() => {
    let cancelled = false;
    Promise.all([wellnessApi.getEvents(), wellnessApi.getGuides(), wellnessApi.getMoments()])
      .then(([ev, gd, mo]) => {
        if (cancelled) return;
        setMoments(mo.ok && mo.data ? mo.data : []);
        setEvents(ev.ok && ev.data ? wellnessApi.sortEvents(ev.data) : []);
        setGuides(gd.ok && gd.data ? wellnessApi.sortGuides(gd.data) : []);
      })
      .finally(() => { if (!cancelled) setWellnessLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const todayKey = wellnessApi.toDateKey(new Date());
  // Monthly calendar view (Monday-first grid)
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const monthCells = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const lead = (viewMonth.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = Array.from({ length: lead }, () => null);
    for (let i = 1; i <= daysInMonth; i++) cells.push(new Date(year, month, i));
    while (cells.length % 7) cells.push(null);
    return cells;
  }, [viewMonth]);
  const [selectedDay, setSelectedDay] = useState(todayKey);
  const [calendarOpen, setCalendarOpen] = useState(false);
  // Collapsed: just the week holding the selected day (or the first week of another month)
  const shownCells = useMemo(() => {
    if (calendarOpen) return monthCells;
    let idx = monthCells.findIndex((d) => d && wellnessApi.toDateKey(d) === selectedDay);
    if (idx < 0) idx = monthCells.findIndex((d) => d);
    const start = Math.floor(idx / 7) * 7;
    return monthCells.slice(start, start + 7);
  }, [calendarOpen, monthCells, selectedDay]);
  const monthPrefix = wellnessApi.toDateKey(viewMonth).slice(0, 7);
  const shiftMonth = (delta: number) => {
    setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
    setShowAllEvents(true);
  };
  const [showAllEvents, setShowAllEvents] = useState(false);
  const eventDays = useMemo(() => new Set(events.map((e) => e.date)), [events]);
  const visibleEvents = showAllEvents
    ? events.filter((e) => e.date.startsWith(monthPrefix) && (monthPrefix !== todayKey.slice(0, 7) || e.date >= todayKey))
    : events.filter((e) => e.date === selectedDay);

  // Wellness Guide areas
  const [guideArea, setGuideArea] = useState<string>(wellnessApi.GUIDE_CATEGORIES[0]);
  const areaGuides = guides.filter((g) => g.category === guideArea);
  const [showAllGuides, setShowAllGuides] = useState(false);
  const visibleGuides = showAllGuides ? areaGuides : areaGuides.slice(0, 3);

  // Wellness Bestie waitlist
  const [bestieJoined, setBestieJoined] = useState(() => localStorage.getItem('oriri-bestie-waitlist') === '1');
  const [bestieJoining, setBestieJoining] = useState(false);
  const handleJoinBestie = async () => {
    if (!isLoggedIn) { setShowLogin(true); return; }
    setBestieJoining(true);
    const res = await wellnessApi.joinBestieWaitlist(session?.access_token);
    setBestieJoining(false);
    if (res.ok) {
      setBestieJoined(true);
      formSubmit('bestie_waitlist', getUtm());
      localStorage.setItem('oriri-bestie-waitlist', '1');
    }
  };

  // Store — digital products (with an external link) first, then featured items
  const shopProducts = useMemo(() => {
    const active = products.filter((p) => p.status !== 'inactive');
    const digital = active.filter((p) => p.externalUrl);
    const rest = active.filter((p) => !p.externalUrl && p.featured);
    return [...digital, ...rest].slice(0, 4);
  }, [products]);

  const nextLiveSession = useMemo(() => {
    if (liveSessionsLoading || !Array.isArray(liveSessions)) return null;
    const now = Date.now();
    return liveSessions
      .filter((s) => s?.scheduledTime && new Date(s.scheduledTime).getTime() > now)
      .sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime())[0] || null;
  }, [liveSessions, liveSessionsLoading]);

  // Handle episode click navigation with VIP gatekeeping
  const handleEpisodeClick = (episode: Episode) => {
    if (episode.isExclusive && !hasAccess(['vip'])) {
      if (!isLoggedIn) setShowLogin(true);
      else setShowVipSubscription(true);
      return;
    }
    podcastPlayClick(episode.title);
    navigate(`/episode/${episode.id}`, { state: { episode } });
  };

  const handleProductClick = (product: { id: string; externalUrl?: string }) => {
    if (product.externalUrl) {
      window.open(product.externalUrl, '_blank', 'noopener,noreferrer');
    } else {
      navigate(`/store/product/${product.id}`);
    }
  };

  const upcomingMeetups = moments
    .filter((m) => m.type !== 'recap' && (!m.date || m.date >= todayKey))
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    .slice(0, 2);
  const recaps = moments
    .filter((m) => m.type === 'recap' && m.photos?.length)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 6);

  const isLocked = (episode: Episode) => !!episode.isExclusive && !hasAccess(['vip']);

  return (
    <div className="min-h-screen bg-background pt-[60px]">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <header className="px-5 pb-7 pt-8">
        <div className="mb-5 flex items-center justify-between">
          <span className="text-[12px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            {getGreeting()}{isLoggedIn && firstName ? `, ${firstName}` : ''}
          </span>
          {isVIP && (
            <span className="flex items-center gap-1 rounded-full bg-blush px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-blush-foreground">
              <Crown className="h-3 w-3" strokeWidth={1.5} /> VIP
            </span>
          )}
        </div>
        <h1 className="font-display text-[64px] font-light leading-none tracking-[0.22em] text-foreground">ORIRI</h1>
        <p className="mt-3 font-display text-[28px] font-light italic leading-tight text-primary">Rising Better Together</p>
        <p className="mt-3 max-w-[300px] text-sm font-light leading-relaxed text-muted-foreground">
          Honest conversations on life, personal growth and wellness.
        </p>
      </header>

      {/* ── Tea for Two: play latest ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 px-5 min-[340px]:grid-cols-2">
        {/* Tea for Two */}
        <div className="relative flex min-h-[230px] flex-col overflow-hidden rounded-[26px] bg-gradient-to-br from-[#A9646F] to-[#874652] p-4 shadow-[0_14px_32px_rgba(135,70,82,0.3)]">
          {latestFive[0]?.imageUrl && (
            <>
              <img src={latestFive[0].imageUrl} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-45" />
              <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#5E2C36] via-[#874652]/70 to-[#874652]/30" />
            </>
          )}
          <span className="relative text-[10px] font-medium uppercase tracking-[0.2em] text-white/85">New · Tea for Two</span>
          <span className="relative mt-2 line-clamp-4 font-display text-[21px] font-normal leading-[1.1] text-white">
            {latestFive[0]?.title ?? 'Tea for Two'}
          </span>
          <div className="relative mt-auto flex items-center justify-between gap-2 pt-4">
            <button
              type="button"
              onClick={() => latestFive[0] && handleEpisodeClick(latestFive[0])}
              disabled={!latestFive[0]}
              aria-label="Play the latest episode"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[#874652] shadow-lg transition-transform active:scale-95 disabled:opacity-70"
            >
              <Play className="ml-0.5 h-5 w-5 fill-current" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/episodes')}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-white/90 hover:text-white"
            >
              All episodes <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* New in: Wellness Bestie (replaces the retired Nourish card) */}
        <button
          type="button"
          onClick={() => navigate('/bestie')}
          className="relative flex min-h-[230px] flex-col overflow-hidden rounded-[26px] bg-gradient-to-br from-[#8C8274] to-[#3E3A33] p-4 text-left shadow-[0_14px_32px_rgba(62,58,51,0.32)] transition-transform active:scale-[0.99]"
        >
          <span aria-hidden className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full border border-[#E9D3B4]/20" />
          <span aria-hidden className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full border border-[#E9D3B4]/20" />
          <span className="relative inline-flex w-fit items-center gap-1.5 rounded-full border border-[#E9D3B4]/50 px-2.5 py-0.5 text-[9.5px] font-medium uppercase tracking-[0.2em] text-[#E9D3B4]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#E9D3B4]" /> New · Pilot
          </span>
          <span className="relative mt-2 font-display text-[26px] font-light leading-[1.05] text-[#FBF3E8]">Wellness Bestie</span>
          <span className="relative mt-1.5 text-[12px] font-light leading-snug text-[#EADBC8]/85">
            Move, Meal, Meet up. Your day, curated.
          </span>
          <span className="relative mt-auto flex items-center justify-between gap-2 pt-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#E9D3B4] text-[#2B1D16] shadow-lg">
              <ArrowRight className="h-5 w-5" />
            </span>
            <span className="text-[11px] font-medium text-[#E9D3B4]">Join the pilot</span>
          </span>
        </button>
      </div>

      {/* ── Explore ──────────────────────────────────────────────────────── */}
      <section className="px-5 pt-9" aria-label="Explore Oriri">
        <h2 className="mb-4 font-display text-[30px] font-light text-foreground">Explore</h2>
        <div className="grid grid-cols-2 gap-3">
          {BOXES.filter((b) => b.id !== 'bestie' && b.id !== 'podcast').map(({ id, label, subline, icon, tone }) => (
            <button
              key={id}
              type="button"
              onClick={() => document.getElementById(`home-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className={`${cardSurface} flex aspect-[1.05] flex-col justify-between p-[18px] text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_-14px_rgba(120,95,70,0.25)] active:scale-[0.98]`}
            >
              <IconBadge icon={icon} tone={tone} />
              <span>
                <span className="block font-display text-[24px] font-light leading-[1.05] text-foreground">{label}</span>
                <span className="mt-1 block text-xs font-light text-muted-foreground">{subline}</span>
              </span>
            </button>
          ))}
        </div>

        {/* Wellness Bestie: coming soon */}
        <div className="mt-3 flex items-center gap-4 rounded-[24px] border border-[#EBD3CE] bg-gradient-to-br from-[#F6E4E0] to-[#EDCDC8] p-[18px]">
          <IconBadge icon={Sparkles} tone={toneFor('bestie')} />
          <div className="min-w-0 flex-1">
            <p className="font-display text-[22px] font-light leading-[1.05] text-foreground">Wellness Bestie</p>
            <p className="mt-1 text-xs font-light text-muted-foreground">{bestieJoined ? "You're on the list" : 'Coming soon'}</p>
          </div>
          {bestieJoined ? (
            <span className="flex items-center gap-1.5 rounded-full bg-white/60 px-4 py-2.5 text-xs font-medium text-foreground">
              <Check className="h-3.5 w-3.5" /> Joined
            </span>
          ) : (
            <button
              type="button"
              onClick={handleJoinBestie}
              className="shrink-0 rounded-full bg-foreground px-5 py-2.5 text-xs font-medium text-background transition-opacity hover:opacity-90"
            >
              {bestieJoining ? 'Joining…' : 'Notify me'}
            </button>
          )}
        </div>
      </section>

      {/* ── Detail panel ─────────────────────────────────────────────────── */}
      <section className="px-5 pb-10 pt-12">
        <div id="home-calendar" className="scroll-mt-20 pt-14 first:pt-0">
            <PanelHeader icon={CalendarHeart} title="Wellness Calendar" tone={toneFor('calendar')} subtitle="Events worth your time, in one place" />

            {/* Month grid */}
            <div className={`${cardSurface} mb-5 p-4`}>
              <div className="mb-3 flex items-center justify-between">
                <button type="button" onClick={() => shiftMonth(-1)} aria-label="Previous month" className="flex h-8 w-8 items-center justify-center rounded-full text-primary hover:bg-muted">
                  <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
                </button>
                <p className="font-display text-xl font-light text-foreground">
                  {viewMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                </p>
                <button type="button" onClick={() => shiftMonth(1)} aria-label="Next month" className="flex h-8 w-8 items-center justify-center rounded-full text-primary hover:bg-muted">
                  <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-y-1 text-center">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => (
                  <span key={i} className="pb-1 text-[11px] text-muted-foreground">{d}</span>
                ))}
                {shownCells.map((d, i) => {
                  if (!d) return <span key={i} />;
                  const key = wellnessApi.toDateKey(d);
                  const active = !showAllEvents && key === selectedDay;
                  const isToday = key === todayKey;
                  const hasEvents = eventDays.has(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => { setSelectedDay(key); setShowAllEvents(false); }}
                      className={`mx-auto flex h-9 w-9 flex-col items-center justify-center rounded-full text-sm font-light transition-colors ${
                        active
                          ? 'bg-blush text-blush-foreground shadow-[0_4px_12px_rgba(176,111,118,0.3)]'
                          : isToday
                            ? 'border border-blush text-primary'
                            : key < todayKey
                              ? 'text-muted-foreground/60'
                              : 'text-foreground hover:bg-muted'
                      }`}
                    >
                      {d.getDate()}
                      <span className={`h-1 w-1 rounded-full ${hasEvents ? (active ? 'bg-white' : 'bg-primary') : 'bg-transparent'}`} />
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setCalendarOpen((v) => !v)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-muted py-3 text-sm font-medium text-primary transition-colors hover:bg-blush/20"
              >
                {calendarOpen ? 'Show this week' : 'Open the full calendar'} <ArrowRight className={`h-3.5 w-3.5 transition-transform ${calendarOpen ? '-rotate-90' : ''}`} />
              </button>
            </div>

            <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-primary">
              {showAllEvents
                ? `All of ${viewMonth.toLocaleDateString('en-GB', { month: 'long' })}`
                : new Date(selectedDay + 'T00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>

            {wellnessLoading ? (
              <div className="space-y-2.5">
                {[0, 1, 2].map((i) => <div key={i} className="h-[60px] animate-pulse rounded-2xl bg-muted" />)}
              </div>
            ) : visibleEvents.length === 0 ? (
              <p className={`${cardSurface} p-6 text-center text-sm font-light text-muted-foreground`}>
                {events.length === 0 ? 'Our first events are being curated. Check back soon.' : showAllEvents ? 'Nothing planned this month yet.' : 'Nothing on this day. Check another date.'}
              </p>
            ) : (
              <div className="space-y-2.5">
                {visibleEvents.map((event) => {
                  const Row = event.link ? 'a' : 'div';
                  return (
                    <Row
                      key={event.id}
                      {...(event.link ? { href: event.link, target: '_blank', rel: 'noopener noreferrer' } : {})}
                      className={`${cardSurface} flex items-center gap-3.5 px-4 py-3.5`}
                    >
                      <span className={`h-2 w-2 shrink-0 rounded-full ${categoryDot(event.category)}`} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-light text-foreground">{event.title}</p>
                        <p className="mt-0.5 flex items-center gap-1 truncate text-xs font-light text-muted-foreground">
                          {showAllEvents && <span>{formatDate(event.date)} · </span>}
                          {formatEventTime(event.startTime)}
                          {event.location && (
                            <>
                              {event.startTime && <span> · </span>}
                              <MapPin className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                              <span className="truncate">{event.location}</span>
                            </>
                          )}
                        </p>
                      </div>
                      {event.link && <ArrowUpRight className="h-4 w-4 shrink-0 text-blush" />}
                    </Row>
                  );
                })}
              </div>
            )}

            {events.length > 0 && (
              <div className="mt-6 flex justify-center">
                <PillButton onClick={() => setShowAllEvents((v) => !v)}>
                  {showAllEvents ? 'Pick a day' : 'See the whole month'} <ArrowRight className="h-3.5 w-3.5" />
                </PillButton>
              </div>
            )}
        </div>

        <div id="home-guide" className="scroll-mt-20 pt-14 first:pt-0">
            <PanelHeader icon={BookHeart} title="Wellness Guide" tone={toneFor('guide')} subtitle="Where we move, eat & grow" />
            <div className="mb-5 grid grid-cols-3 gap-1 rounded-full bg-muted p-1">
              {wellnessApi.GUIDE_CATEGORIES.map((area) => (
                <button
                  key={area}
                  type="button"
                  onClick={() => { setGuideArea(area); setShowAllGuides(false); }}
                  className={`rounded-full py-2 text-xs font-medium uppercase tracking-[0.14em] transition-colors ${
                    guideArea === area ? 'bg-card text-primary shadow-[0_2px_8px_rgba(120,95,70,0.1)]' : 'text-muted-foreground'
                  }`}
                >
                  {area}
                </button>
              ))}
            </div>
            <p className="mb-3 font-display text-lg font-light italic text-muted-foreground">{wellnessApi.GUIDE_AREAS[guideArea]?.blurb}</p>
            {wellnessLoading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />)}
              </div>
            ) : areaGuides.length === 0 ? (
              <p className={`${cardSurface} p-6 text-center text-sm font-light text-muted-foreground`}>
                Fresh picks are on the way. Follow along on Instagram in the meantime.
              </p>
            ) : (
              <div className="space-y-3">
                {visibleGuides.map((guide) => {
                  const Wrapper = guide.link ? 'a' : 'div';
                  return (
                    <Wrapper
                      key={guide.id}
                      {...(guide.link ? { href: guide.link, target: '_blank', rel: 'noopener noreferrer' } : {})}
                      className={`${cardSurface} flex gap-3.5 p-3.5`}
                    >
                      {guide.image && (
                        <ImageWithFallback src={guide.image} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" />
                      )}
                      <div className="min-w-0 flex-1">
                        {guide.category && (
                          <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-primary">
                            <span className={`h-1.5 w-1.5 rounded-full ${categoryDot(guide.category)}`} />
                            {guide.category}
                          </span>
                        )}
                        <p className="mt-1 font-display text-[19px] font-light leading-snug text-foreground">{guide.title}</p>
                        {guide.note && <p className="mt-1 line-clamp-2 text-xs font-light leading-relaxed text-muted-foreground">{guide.note}</p>}
                      </div>
                      {guide.link && <ArrowUpRight className="h-4 w-4 shrink-0 self-start text-blush" />}
                    </Wrapper>
                  );
                })}
              </div>
            )}
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {areaGuides.length > 3 && (
                <PillButton onClick={() => setShowAllGuides((v) => !v)}>
                  {showAllGuides ? 'Show less' : 'View all'} <ArrowRight className="h-3.5 w-3.5" />
                </PillButton>
              )}
              <PillButton onClick={() => document.getElementById('home-shop')?.scrollIntoView({ behavior: 'smooth' })}>
                Full guides in Shop <ArrowRight className="h-3.5 w-3.5" />
              </PillButton>
            </div>
        </div>

        <div id="home-podcast" className="scroll-mt-20 pt-14 first:pt-0">
            <PanelHeader icon={Headphones} title="Tea for Two" tone={toneFor('podcast')} subtitle="The latest from Renee & Amanda" />

            {continueListening.length > 0 && (
              <div className="mb-5 space-y-2">
                {continueListening.slice(0, 2).map((item) => {
                  const pct = item.duration > 0 ? Math.min(100, (item.position / item.duration) * 100) : 0;
                  return (
                    <button
                      key={item.episodeId}
                      type="button"
                      onClick={() => navigate(`/episode/${item.episodeId}`)}
                      className={`${cardSurface} flex w-full items-center gap-3 p-2.5 text-left`}
                    >
                      <ImageWithFallback
                        src={item.image || fallbackImages.wellness}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-xl object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-primary">Continue</p>
                        <p className="truncate text-sm font-light text-foreground">{item.title || 'Episode'}</p>
                        <div className="mt-1.5 h-0.5 w-full overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-blush" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <Play className="mr-1 h-4 w-4 shrink-0 fill-current text-blush" />
                    </button>
                  );
                })}
              </div>
            )}

            {episodesLoading ? (
              <div className="space-y-2.5">
                {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-[52px] animate-pulse rounded-2xl bg-muted" />)}
              </div>
            ) : latestFive.length === 0 ? (
              <p className={`${cardSurface} p-6 text-center text-sm font-light text-muted-foreground`}>
                New episodes are brewing. Check back soon.
              </p>
            ) : (
              <div className="space-y-2.5">
                {latestFive.map((episode) => {
                  const locked = isLocked(episode);
                  return (
                    <button
                      key={episode.id}
                      type="button"
                      onClick={() => handleEpisodeClick(episode)}
                      className={`${cardSurface} group flex w-full items-center gap-3.5 px-4 py-3.5 text-left`}
                    >
                      <span className={`h-2 w-2 shrink-0 rounded-full ${PLATFORM_DOT[episode.platform]}`} />
                      <span className="min-w-0 flex-1 truncate text-sm font-light text-foreground">{episode.title}</span>
                      <span className="shrink-0 text-xs font-light text-muted-foreground">
                        {locked ? <Lock className="h-3.5 w-3.5" /> : formatDuration(episode.duration)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-6 flex justify-center">
              <PillButton onClick={() => navigate('/episodes')}>
                More episodes <ArrowRight className="h-3.5 w-3.5" />
              </PillButton>
            </div>
        </div>

        <div id="home-stepsisters" className="scroll-mt-20 pt-14 first:pt-0">
            <PanelHeader icon={HeartHandshake} title="Stepsisters" tone={toneFor('stepsisters')} subtitle="The Oriri community" />
            {upcomingMeetups.length > 0 && (
              <div className="mb-4 space-y-2.5">
                {upcomingMeetups.map((m) => (
                  <div key={m.id} className={`${cardSurface} flex items-center gap-3.5 p-3.5`}>
                    {m.photos?.[0] ? (
                      <ImageWithFallback src={m.photos[0]} alt="" className="h-14 w-14 shrink-0 rounded-2xl object-cover" />
                    ) : (
                      <span className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-[#F4E6E3] text-primary">
                        <span className="text-[10px] uppercase tracking-wider">
                          {m.date ? new Date(m.date + 'T00:00').toLocaleDateString('en-GB', { month: 'short' }) : 'Soon'}
                        </span>
                        <span className="font-display text-xl leading-none">{m.date ? Number(m.date.slice(8)) : '·'}</span>
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-primary">Next meetup</p>
                      <p className="truncate font-display text-[18px] font-light text-foreground">{m.title}</p>
                      <p className="truncate text-xs font-light text-muted-foreground">
                        {[m.date && new Date(m.date + 'T00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }), formatEventTime(m.startTime), m.location].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    {m.link && (
                      <a href={m.link} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background">
                        Join
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            {recaps.length > 0 && (
              <div className="-mx-5 mb-4 flex snap-x gap-3 overflow-x-auto px-5 pb-1 scrollbar-none">
                {recaps.map((m) => (
                  <figure key={m.id} className="w-[220px] shrink-0 snap-start">
                    <div className="grid h-[160px] grid-cols-3 grid-rows-2 gap-1 overflow-hidden rounded-[22px]">
                      {m.photos!.slice(0, 3).map((url, i) => (
                        <ImageWithFallback
                          key={url}
                          src={url}
                          alt=""
                          className={`h-full w-full object-cover ${i === 0 ? 'col-span-2 row-span-2' : ''} ${m.photos!.length === 1 ? 'col-span-3' : ''} ${m.photos!.length === 2 && i === 1 ? 'row-span-2' : ''}`}
                        />
                      ))}
                    </div>
                    <figcaption className="mt-2 px-1">
                      <p className="truncate font-display text-[16px] font-light text-foreground">{m.title}</p>
                      <p className="flex items-center gap-1 text-[11px] font-light text-muted-foreground">
                        <Camera className="h-3 w-3" strokeWidth={1.5} /> {m.photos!.length} photos{m.date ? ` · ${formatDate(m.date)}` : ''}
                      </p>
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}

            <div className={`${cardSurface} p-6`}>
              <p className="font-display text-[22px] font-light leading-snug text-foreground">
                A space for women navigating life, growth and wellness — <em className="text-primary">together.</em>
              </p>
              <p className="mt-3 text-sm font-light leading-relaxed text-muted-foreground">
                Meetups, moments and honest chats. Come say hi.
              </p>
              <div className="mt-6">
                <PillButton onClick={() => navigate('/community')}>
                  Enter Stepsisters <ArrowRight className="h-3.5 w-3.5" />
                </PillButton>
              </div>
            </div>
        </div>

        {/* Shop panel, part 1: header (Nourish product retired) */}
        <div id="home-shop" className="scroll-mt-20 pt-14 first:pt-0">
            <PanelHeader icon={ShoppingBag} title="Shop" tone={toneFor('shop')} subtitle="Guides, planners & digital goods" />
            
        </div>

        <div>
            <div className="h-3" />
            {shopProducts.length === 0 ? (
              <div className={`${cardSurface} p-6`}>
                <p className="font-display text-[22px] font-light leading-snug text-foreground">
                  Thoughtful digital products, <em className="text-primary">coming soon.</em>
                </p>
                <p className="mt-3 text-sm font-light text-muted-foreground">Guides & planners to support your everyday rituals.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {shopProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleProductClick(product)}
                    className={`${cardSurface} group flex w-full items-center gap-3 p-3 text-left`}
                  >
                    {product.image || product.images?.[0] ? (
                      <ImageWithFallback
                        src={product.image || product.images?.[0] || ''}
                        alt=""
                        className="h-11 w-11 shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      <IconBadge icon={ShoppingBag} tone={toneFor('shop')} />
                    )}
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-sm font-normal text-foreground">{product.name}</h4>
                      <p className="truncate text-xs font-light text-muted-foreground">{product.description}</p>
                    </div>
                    <span className="shrink-0 text-sm font-light text-foreground">{formatPrice(product.price)}</span>
                    {product.externalUrl ? (
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-blush" />
                    ) : (
                      <ArrowRight className="h-4 w-4 shrink-0 text-blush" />
                    )}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-6 flex justify-center">
              <PillButton onClick={() => navigate('/store')}>
                Visit store <ArrowRight className="h-3.5 w-3.5" />
              </PillButton>
            </div>
        </div>
      </section>

      {/* ── Small extras ─────────────────────────────────────────────────── */}
      <section className="space-y-4 px-5 pb-10">
        {nextLiveSession && (
          <button
            type="button"
            onClick={() => navigate('/live')}
            className={`${cardSurface} flex w-full items-center gap-3 p-3.5 text-left`}
          >
            <IconBadge icon={Radio} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-[0.2em] text-primary">
                {nextLiveSession.isLive ? 'Live now' : `Live · ${formatDate(nextLiveSession.scheduledTime)}`}
              </p>
              <p className="truncate text-sm font-light text-foreground">{nextLiveSession.title}</p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-blush" />
          </button>
        )}

        {socialProfiles.length > 0 && (
          <div className="flex items-center justify-between pt-2">
            <p className="font-display text-lg font-light italic text-muted-foreground">Follow along</p>
            <div className="flex gap-2">
              {socialProfiles.map((profile) => {
                const meta = PLATFORM_META[profile.platform];
                if (!meta) return null;
                const Icon = meta.icon;
                return (
                  <a
                    key={`${profile.platform}-${profile.handle}`}
                    href={profile.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={meta.label}
                    onClick={() => void socialApi.trackClick(`profile-${profile.platform}`, 'home-follow')}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-blush text-blush-foreground shadow-[0_4px_12px_rgba(176,111,118,0.3)] transition-transform hover:scale-105"
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.5} />
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Admin only: one tap to post */}
      {isAdmin && (
        <button
          type="button"
          onClick={() => navigate('/admin/dashboard?tab=calendar')}
          className="fixed bottom-24 right-5 z-40 flex items-center gap-2 rounded-full bg-foreground py-3 pl-4 pr-5 text-sm font-medium text-background shadow-[0_12px_28px_-8px_rgba(78,59,64,0.5)] transition-transform active:scale-95"
        >
          <Plus className="h-4 w-4" /> Post
        </button>
      )}

      {/* Bottom padding for tab bar */}
      <div className="pb-4" />
    </div>
  );
}
