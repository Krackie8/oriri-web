/** Podcast · Tea for Two: show intro, where to listen, and every episode. */
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Play, Search } from 'lucide-react';
import { Eyebrow, Screen, cx } from '../bestie/kit';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import teaForTwo from '../../../assets/tea-for-two.jpg';

const SPOTIFY_SHOW = 'https://open.spotify.com/show/2dtKfW2MpiAAEbfM18m64r';
const YOUTUBE_CHANNEL = 'https://www.youtube.com/@Renreset';

interface Episode {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  duration?: string;
  publishedDate?: string;
  platformUrl?: string;
}

const fmtDate = (d?: string) =>
  d ? new Date(`${d}T00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const fmtMins = (secs?: string) => {
  const n = Number(secs);
  return n > 0 ? `${Math.max(1, Math.round(n / 60))} min` : '';
};

function useEpisodes() {
  const [eps, setEps] = useState<Episode[] | null>(null);
  useEffect(() => {
    let live = true;
    fetch(`https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/spotify/episodes`, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => live && setEps(d?.success && Array.isArray(d.episodes) ? d.episodes : []))
      .catch(() => live && setEps([]));
    return () => {
      live = false;
    };
  }, []);
  return eps;
}

function ListenButton({ href, label, primary }: { href: string; label: string; primary?: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cx(
        'inline-flex h-12 flex-1 items-center justify-center rounded-full px-5 text-[14px] font-medium uppercase tracking-[0.12em] transition-colors',
        primary ? 'bg-wb-plum text-white hover:bg-[#6B5C51]' : 'border border-wb-plum/40 text-wb-plum hover:border-wb-plum',
      )}
    >
      {label}
    </a>
  );
}

export default function PodcastPage() {
  const eps = useEpisodes();
  const [q, setQ] = useState('');
  const shown = useMemo(() => {
    if (!eps) return null;
    const t = q.trim().toLowerCase();
    return t ? eps.filter((e) => `${e.title} ${e.description || ''}`.toLowerCase().includes(t)) : eps;
  }, [eps, q]);
  const latest = eps?.[0];

  return (
    <Screen className="pb-16 pt-24">
      <div className="flex items-center gap-5">
        <img src={teaForTwo} alt="Tea for Two podcast cover" className="h-28 w-28 shrink-0 rounded-[14px] object-cover shadow-[0_12px_30px_-14px_rgba(43,37,34,0.45)]" />
        <div>
          <Eyebrow>The podcast</Eyebrow>
          <h1 className="mt-2 whitespace-nowrap text-[26px] leading-[1.02] text-wb-ink sm:text-[34px]">Tea for Two</h1>
          <p className="mt-1 text-[15px] text-wb-taupe">with Renee &amp; Amanda</p>
        </div>
      </div>
      <p className="mt-6 text-[16px] leading-relaxed text-wb-soft">
        Honest conversations between friends about building a life in the UAE: growth, wellness, and the highs and lows of change.
      </p>
      <div className="mt-6 flex gap-3">
        <ListenButton href={SPOTIFY_SHOW} label="Spotify" primary />
        <ListenButton href={YOUTUBE_CHANNEL} label="YouTube" />
      </div>

      {latest?.platformUrl && (
        <a
          href={latest.platformUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-10 block overflow-hidden rounded-[14px] bg-wb-stone p-5 transition-colors hover:bg-[#EAE5DF]"
        >
          <p className="text-[14px] font-medium uppercase tracking-[0.18em] text-wb-taupe">Latest episode</p>
          <p className="mt-2 font-wb-serif text-[22px] font-medium uppercase leading-tight tracking-[0.02em] text-wb-ink">{latest.title}</p>
          <p className="mt-2 text-[14px] text-wb-taupe">{[fmtDate(latest.publishedDate), fmtMins(latest.duration)].filter(Boolean).join(' · ')}</p>
          <span className="mt-4 inline-flex items-center gap-2 text-[14px] font-medium uppercase tracking-[0.12em] text-wb-plum">
            <Play className="h-4 w-4" strokeWidth={1.8} /> Listen now
          </span>
        </a>
      )}

      <div className="mt-10 flex items-end justify-between">
        <h2 className="text-[24px] text-wb-ink">All episodes</h2>
        {eps && <span className="text-[14px] text-wb-taupe">{eps.length} episodes</span>}
      </div>
      <label className="mt-4 flex h-12 items-center gap-2 rounded-full border border-wb-sand bg-wb-shell px-4">
        <Search className="h-4 w-4 text-wb-taupe" strokeWidth={1.6} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search episodes"
          aria-label="Search episodes"
          className="h-full flex-1 bg-transparent text-[15px] text-wb-ink placeholder:text-wb-taupe focus:outline-none"
        />
      </label>

      {shown === null ? (
        <div className="mt-4 space-y-3" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-[14px] bg-wb-stone" />
          ))}
        </div>
      ) : shown.length ? (
        <ul className="mt-2 divide-y divide-wb-sand/70">
          {shown.map((e) => (
            <li key={e.id}>
              <a href={e.platformUrl || SPOTIFY_SHOW} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 py-4">
                <img src={e.imageUrl || teaForTwo} alt="" loading="lazy" className="h-16 w-16 shrink-0 rounded-[12px] object-cover" />
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-[15px] font-medium leading-snug text-wb-ink">{e.title}</span>
                  <span className="mt-1 block text-[14px] text-wb-taupe">{[fmtDate(e.publishedDate), fmtMins(e.duration)].filter(Boolean).join(' · ')}</span>
                </span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-wb-taupe" strokeWidth={1.6} />
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-[15px] leading-relaxed text-wb-soft">
          {eps && eps.length ? 'No episodes match that search.' : 'Episodes are loading slowly. Listen on Spotify in the meantime.'}
        </p>
      )}
    </Screen>
  );
}
