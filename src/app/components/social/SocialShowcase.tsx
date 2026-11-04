import React from 'react';
import { ExternalLink } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { useSocialConfig } from '../../hooks/useSocialConfig';
import * as socialApi from '../../utils/socialApi';
import { PLATFORM_META, getTikTokVideoId, type ShowcasePost } from '../../data/socialConfig';
import { getYouTubeVideoId } from '../../utils/episodePlayback';

function PostCard({ post }: { post: ShowcasePost }) {
  const meta = PLATFORM_META[post.platform];
  const Icon = meta?.icon;

  const tiktokId = post.platform === 'tiktok' ? getTikTokVideoId(post.postUrl) : null;
  const youtubeId = post.platform === 'youtube' ? getYouTubeVideoId(post.postUrl) : null;

  const open = () => {
    void socialApi.trackClick(`showcase-${post.id}`, 'home-showcase');
    window.open(post.postUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="w-[260px] shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-card/60">
      <div className="relative aspect-[9/16] bg-background/60">
        {tiktokId ? (
          <iframe
            src={`https://www.tiktok.com/embed/v2/${tiktokId}`}
            title={post.caption || 'TikTok post'}
            className="h-full w-full"
            allow="encrypted-media"
            frameBorder="0"
          />
        ) : youtubeId ? (
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}`}
            title={post.caption || 'YouTube video'}
            className="h-full w-full"
            allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
            allowFullScreen
            frameBorder="0"
          />
        ) : (
          // Instagram has no public embed for us, so we show a tappable thumbnail.
          <button onClick={open} className="group h-full w-full text-left">
            {post.thumbnailUrl ? (
              <ImageWithFallback
                src={post.thumbnailUrl}
                alt={post.caption || `${meta?.label ?? 'Social'} post`}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-background">
                {Icon && <Icon className="h-10 w-10 text-muted-foreground" />}
              </div>
            )}
          </button>
        )}

        {Icon && (
          <span
            className="pointer-events-none absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm"
            aria-hidden
          >
            <Icon className="h-3.5 w-3.5" style={{ color: meta.color }} />
          </span>
        )}
      </div>

      <div className="p-3">
        {post.caption && (
          <p className="line-clamp-2 text-sm text-foreground">{post.caption}</p>
        )}
        <button
          onClick={open}
          className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          View on {meta?.label ?? 'social'}
          <ExternalLink className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

/** "Latest from social" — admin-curated posts, rendered as a horizontal scroller. */
export function SocialShowcase() {
  const { showcase } = useSocialConfig();

  if (showcase.length === 0) return null;

  return (
    <section className="mb-8 px-4">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2>Latest from social</h2>
        <span className="text-xs text-muted-foreground">Fresh off the feed</span>
      </div>

      <div className="flex gap-4 overflow-x-auto scrollbar-none pb-2">
        {showcase.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}

export default SocialShowcase;
