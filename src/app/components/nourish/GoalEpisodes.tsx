import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Headphones, Play, Pause, ChevronDown, ExternalLink } from 'lucide-react';
import * as nourishApi from '../../utils/nourishApi';
import { resolvePlayback, type Playback } from '../../utils/episodePlayback';
import { useGlobalAudioPlayer, formatTime } from '../../hooks/useGlobalAudioPlayer';
import { GOAL_META, type GoalKey } from '../../data/nourishPlans';

interface GoalEpisodesProps {
  goal: GoalKey;
  accessToken?: string;
}

const SERIF = "'Cormorant Garamond', Georgia, serif";

/**
 * Inline audio controls driven by the app-wide player, so playback continues
 * (via the global MiniPlayer) even if the user leaves Nourish.
 */
function InlineAudioPlayer({ episode, src }: { episode: any; src: string }) {
  const { state, actions, currentEpisode } = useGlobalAudioPlayer();
  const isCurrent = currentEpisode?.id === String(episode.id);

  useEffect(() => {
    // Start this episode as soon as the row is expanded.
    void actions.playEpisode({
      id: String(episode.id),
      title: episode.title,
      image: episode.imageUrl,
      audioUrl: src,
      duration: episode.duration,
    });
    // Depending on `actions` would restart playback on every provider re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episode.id, src]);

  const currentTime = isCurrent ? state.currentTime : 0;
  const duration = isCurrent && state.duration ? state.duration : episode.duration || 0;

  if (isCurrent && state.error) {
    return (
      <div className="text-[12px] text-[#B4574A] font-light px-4 py-3">
        {state.error} — try opening the full episode below.
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <button
        onClick={() => actions.togglePlay()}
        aria-label={isCurrent && state.isPlaying ? 'Pause episode' : 'Play episode'}
        disabled={isCurrent && state.loading}
        className="w-10 h-10 flex-shrink-0 rounded-full bg-[#4A2E1F] text-white flex items-center justify-center border-none cursor-pointer transition-colors duration-200 hover:bg-[#2B1D16] disabled:opacity-50"
      >
        {isCurrent && state.loading ? (
          <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
        ) : isCurrent && state.isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4 ml-0.5" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={1}
          value={Math.min(currentTime, duration || 0)}
          onChange={(e) => actions.seek(Number(e.target.value))}
          aria-label="Seek"
          className="w-full accent-[#8B5E3C] cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-[#8C7565] font-light mt-0.5">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}

function PlaybackPanel({ episode, playback }: { episode: any; playback: Playback }) {
  if (playback.kind === 'audio') {
    return <InlineAudioPlayer episode={episode} src={playback.src} />;
  }

  if (playback.kind === 'youtube') {
    return (
      <div className="relative w-full aspect-video bg-black">
        <iframe
          src={`https://www.youtube.com/embed/${playback.videoId}?rel=0&modestbranding=1`}
          title={episode.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 w-full h-full border-none"
        />
      </div>
    );
  }

  if (playback.kind === 'spotify') {
    return (
      <iframe
        src={`https://open.spotify.com/embed/episode/${playback.episodeId}?theme=0`}
        title={episode.title}
        height={152}
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        className="w-full border-none"
      />
    );
  }

  return (
    <div className="px-4 py-4 text-[12px] text-[#8C7565] font-light">
      This episode can't be played here yet — open the full episode below.
    </div>
  );
}

/**
 * "Listen while you cook" — episodes matched to the user's wellness goal, played
 * inline so the weekly plan stays on screen.
 * Renders nothing when there are no matches.
 */
export function GoalEpisodes({ goal, accessToken }: GoalEpisodesProps) {
  const navigate = useNavigate();
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setOpenId(null);

    nourishApi.getGoalEpisodes(accessToken, goal).then((res) => {
      if (cancelled) return;
      setEpisodes(res.ok && res.data ? res.data : []);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [goal, accessToken]);

  if (loading || episodes.length === 0) return null;

  const meta = GOAL_META[goal];

  return (
    <div className="mb-10">
      <div className="text-[22px] font-normal text-[#2B1D16] mb-1" style={{ fontFamily: SERIF }}>
        Listen while you cook
      </div>
      <div className="text-[12px] text-[#8C7565] mb-4 font-light">
        Episodes about {meta.label.toLowerCase()} from the Oriri podcast — they play right here.
      </div>

      <div className="flex flex-col gap-2.5">
        {episodes.map((ep) => {
          const id = String(ep.id);
          const open = openId === id;
          const playback = resolvePlayback(ep);

          return (
            <div
              key={id}
              className={`bg-[#FFFCF8] border rounded-2xl overflow-hidden transition-all duration-200 ${
                open ? 'border-[rgba(139,94,60,0.45)] shadow-sm' : 'border-[rgba(74,46,31,0.08)]'
              }`}
            >
              {/* Row */}
              <button
                onClick={() => setOpenId(open ? null : id)}
                aria-expanded={open}
                className="w-full flex items-center gap-3.5 text-left bg-transparent border-none p-3.5 cursor-pointer"
              >
                {ep.imageUrl ? (
                  <img
                    src={ep.imageUrl}
                    alt={ep.title}
                    className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-[#F3E8DD] flex items-center justify-center flex-shrink-0">
                    <Headphones className="w-4 h-4 text-[#8B5E3C]" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium text-[#2B1D16] truncate">{ep.title}</div>
                  <div className="text-[11px] text-[#8C7565] font-light capitalize mt-0.5">
                    {ep.platform}
                    {ep.publishedDate ? ` · ${ep.publishedDate}` : ''}
                  </div>
                </div>

                <span
                  className={`w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-200 ${
                    open ? 'bg-[#F3E8DD] text-[#4A2E1F] rotate-180' : 'bg-[#F7F1EA] text-[#8B5E3C]'
                  }`}
                >
                  {open ? <ChevronDown className="w-4 h-4" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                </span>
              </button>

              {/* Expanded player */}
              {open && (
                <div className="border-t border-[rgba(74,46,31,0.07)]">
                  <PlaybackPanel episode={ep} playback={playback} />

                  <div className="px-4 pb-3 pt-1">
                    <button
                      onClick={() => navigate(`/episode/${ep.id}`, { state: { episode: ep } })}
                      className="inline-flex items-center gap-1.5 text-[11px] text-[#8C7565] hover:text-[#2B1D16] bg-transparent border-none p-0 cursor-pointer transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open full episode →
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default GoalEpisodes;
