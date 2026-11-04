import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, ChevronRight, ArrowUpRight } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { SocialIconRow } from './SocialIconRow';
import { useSocialConfig } from '../../hooks/useSocialConfig';
import { useGlobalAudioPlayer, formatDuration } from '../../hooks/useGlobalAudioPlayer';
import * as socialApi from '../../utils/socialApi';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import type { BioLink } from '../../data/socialConfig';

interface LatestEpisode {
  id: string;
  title: string;
  imageUrl: string;
  audioUrl: string;
  duration: number;
}

const FALLBACK_ART =
  'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=400&fit=crop';

/** Newest published episode from the Spotify feed — the hero of the links page. */
function useLatestEpisode() {
  const [episode, setEpisode] = useState<LatestEpisode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/spotify/episodes`,
          { headers: { Authorization: `Bearer ${publicAnonKey}` } },
        );
        const data = await response.json();
        const first = data?.episodes?.[0];

        if (!cancelled && first) {
          setEpisode({
            id: String(first.id),
            title: first.title,
            imageUrl: first.imageUrl || FALLBACK_ART,
            audioUrl: first.audioUrl,
            duration: first.duration || 0,
          });
        }
      } catch (error: any) {
        console.error('[LinksScreen] Failed to load latest episode:', error?.message ?? error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return { episode, loading };
}

function LatestEpisodeBlock({ episode }: { episode: LatestEpisode }) {
  const navigate = useNavigate();
  const { state, currentEpisode, actions } = useGlobalAudioPlayer();
  const isCurrent = currentEpisode?.id === episode.id;
  const isPlaying = isCurrent && state.isPlaying;

  const handlePlay = () => {
    void socialApi.trackClick('latest-episode', 'links-page');
    if (isCurrent) {
      actions.togglePlay();
      return;
    }
    void actions.playEpisode({
      id: episode.id,
      title: episode.title,
      image: episode.imageUrl,
      audioUrl: episode.audioUrl,
      duration: episode.duration,
    } as any);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <ImageWithFallback
          src={episode.imageUrl}
          alt={episode.title}
          className="h-16 w-16 shrink-0 rounded-xl object-cover"
        />

        <div className="min-w-0 flex-1 text-left">
          <p className="text-[11px] uppercase tracking-wider text-white/50">Latest episode</p>
          <p className="line-clamp-2 text-sm text-white">{episode.title}</p>
          {episode.duration > 0 && (
            <p className="mt-0.5 text-xs text-white/50">{formatDuration(episode.duration)}</p>
          )}
        </div>

        <button
          onClick={handlePlay}
          aria-label={isPlaying ? 'Pause episode' : 'Play episode'}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-black transition-transform hover:scale-105"
        >
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
        </button>
      </div>

      <button
        onClick={() => navigate('/episodes')}
        className="mt-3 flex w-full items-center justify-center gap-1 text-xs text-white/60 hover:text-white"
      >
        All episodes <ChevronRight className="h-3 w-3" />
      </button>
    </div>
  );
}

function LinkButton({ link }: { link: BioLink }) {
  const navigate = useNavigate();
  const isExternal = !!link.url;

  const handleClick = () => {
    void socialApi.trackClick(link.id, 'links-page');
    if (isExternal) {
      window.open(link.url, '_blank', 'noopener,noreferrer');
    } else if (link.internalPath) {
      navigate(link.internalPath);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`flex w-full items-center gap-3 rounded-2xl border px-4 text-left transition-all duration-200 hover:scale-[1.02] ${
        link.isFeatured
          ? 'border-white/25 bg-white/15 py-5 backdrop-blur-sm'
          : 'border-white/10 bg-white/5 py-4 backdrop-blur-sm'
      }`}
    >
      {link.emoji && <span className="text-xl">{link.emoji}</span>}

      <span className="min-w-0 flex-1">
        <span className={`block text-white ${link.isFeatured ? 'text-base' : 'text-sm'}`}>
          {link.title}
        </span>
        {link.subtitle && (
          <span className="mt-0.5 block truncate text-xs text-white/50">{link.subtitle}</span>
        )}
      </span>

      {isExternal ? (
        <ArrowUpRight className="h-4 w-4 shrink-0 text-white/40" />
      ) : (
        <ChevronRight className="h-4 w-4 shrink-0 text-white/40" />
      )}
    </button>
  );
}

/**
 * /links — the link-in-bio landing page. Deliberately styled as a poster rather
 * than an app screen: full-bleed dark gradient, no app chrome dependencies.
 */
export function LinksScreen() {
  const { links, profiles, loading } = useSocialConfig();
  const { episode } = useLatestEpisode();

  return (
    <div className="min-h-screen bg-[#14140F] bg-gradient-to-b from-[#2A3323] via-[#14140F] to-[#14140F] px-5 py-10">
      <div className="mx-auto w-full max-w-md">
        {/* Identity */}
        <div className="text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#7A8C6E] to-[#4A5C3E]">
            <span className="font-serif text-3xl text-white">O</span>
          </div>
          <h1 className="mt-4 font-serif text-3xl text-white">Oriri</h1>
          <p className="mt-1 text-sm text-white/60">
            Tea for Two — Renee &amp; Amanda
          </p>
          <p className="mt-2 text-sm leading-relaxed text-white/50">
            Honest conversations on life in the UAE, personal growth and wellness.
          </p>

          <SocialIconRow
            profiles={profiles}
            source="links-page"
            size="md"
            tone="brand"
            className="mt-5 justify-center"
          />
        </div>

        {/* Latest episode — the thing a link-in-bio tool can't do */}
        {episode && (
          <div className="mt-7">
            <LatestEpisodeBlock episode={episode} />
          </div>
        )}

        {/* Links */}
        <div className="mt-4 space-y-3">
          {loading && links.length === 0
            ? [0, 1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-2xl bg-white/5" />
              ))
            : links.map((link) => <LinkButton key={link.id} link={link} />)}
        </div>

        <p className="mt-10 text-center text-xs text-white/30">oriri.me</p>
      </div>
    </div>
  );
}

export default LinksScreen;
