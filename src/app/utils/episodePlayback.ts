/**
 * Episode playback resolution.
 *
 * Episodes reach the app from several sources (Spotify API, Apple, YouTube, RSS and
 * admin-managed VIP records) and each exposes playback differently — YouTube has no
 * audio URL at all, Spotify's API only returns a short preview URL, while Apple/VIP
 * records carry a real audio file. These helpers decide, per episode, how it can be
 * played inline.
 */

/** Extract a YouTube video id from a watch / short / embed URL. */
export function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

/** Extract a Spotify episode id from an episode record or an open.spotify.com URL. */
export function getSpotifyEpisodeId(episode: any): string | null {
  if (!episode) return null;

  if (episode.platform === 'spotify' && episode.platformEpisodeId) {
    return episode.platformEpisodeId;
  }

  const candidates = [episode.platformUrl, episode.audioUrl, episode.externalUrl];
  for (const url of candidates) {
    const match = typeof url === 'string' && url.match(/open\.spotify\.com\/episode\/([A-Za-z0-9]+)/);
    if (match) return match[1];
  }

  return null;
}

export type Playback =
  | { kind: 'youtube'; videoId: string }
  | { kind: 'audio'; src: string }
  | { kind: 'spotify'; episodeId: string }
  | { kind: 'external'; url: string };

/** True for URLs that are web pages rather than a streamable audio file. */
function isPageUrl(url: string): boolean {
  return /youtube\.com|youtu\.be|open\.spotify\.com|podcasts\.apple\.com/.test(url);
}

/**
 * Decide how a given episode can be played inline.
 * Order matters: YouTube first (its audioUrl is always empty), then a real audio
 * file, then a Spotify embed, then an external link as the last resort.
 */
export function resolvePlayback(episode: any): Playback {
  const audioUrl: string = episode?.audioUrl ?? '';
  const platformUrl: string = episode?.platformUrl ?? episode?.externalUrl ?? '';

  const videoId =
    episode?.platform === 'youtube' && episode?.platformEpisodeId
      ? episode.platformEpisodeId
      : getYouTubeVideoId(platformUrl) || getYouTubeVideoId(audioUrl);
  if (videoId) return { kind: 'youtube', videoId };

  if (audioUrl && !isPageUrl(audioUrl)) return { kind: 'audio', src: audioUrl };

  const spotifyId = getSpotifyEpisodeId(episode);
  if (spotifyId) return { kind: 'spotify', episodeId: spotifyId };

  return { kind: 'external', url: platformUrl || audioUrl };
}
