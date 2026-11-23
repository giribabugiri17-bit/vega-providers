import { Stream, ProviderContext } from "../types";
import { throwProviderError } from "../providerErrors";

/**
 * Aethoflix plays through embed players, not direct video files.
 * Its website JavaScript lists 8 movie/TV servers (Server 1–8), all
 * keyed by TMDB id (TV also needs season/episode):
 *
 *   1 Aetho Embed      embed.aethoflix.world/embed/...
 *   2 TheOGPirateBot   embed.theogpiratebot.online/embed/...
 *   3 TG Vid            tgvid.lovable.app/embed/...
 *   4 VidStuck          vidstuck.cc/embed/...
 *   5 ZXCStream         zxcstream.cc/player/...
 *   6 VidFast           vidfast.vc/...
 *   7 Nxsha             nxsha.space/embed/...
 *   8 Bingr             bingr.one/watch/...
 *
 * So streams here are type "embed" — they open in the Vega WebView,
 * exactly like the site's own player. There is no direct .m3u8/.mp4,
 * so download mode returns no streams (embeds cannot be downloaded).
 * The site also has 3 anime-only servers (MegaPlay, ReCloud, Zokoanime)
 * keyed by AniList/MAL id, which TMDB does not provide — they are not
 * included in this version.
 */

type ServerDef = {
  label: string;
  movie: (id: string) => string;
  tv: (id: string, season: string, episode: string) => string;
};

const SERVERS: ServerDef[] = [
  {
    label: "Aetho Embed (Server 1)",
    movie: (id) => `https://embed.aethoflix.world/embed/movie/${id}`,
    tv: (id, s, e) => `https://embed.aethoflix.world/embed/tv/${id}/${s}/${e}`,
  },
  {
    label: "TheOGPirateBot (Server 2)",
    movie: (id) =>
      `https://embed.theogpiratebot.online/embed/movie/${id}?color=f4f4f4&autoplay=1`,
    tv: (id, s, e) =>
      `https://embed.theogpiratebot.online/embed/tv/${id}/${s}/${e}?color=f4f4f4&autoplay=1&episodeSelector=1&autoplayNextEp=1`,
  },
  {
    label: "TG Vid (Server 3)",
    movie: (id) => `https://tgvid.lovable.app/embed/movie/${id}`,
    tv: (id, s, e) => `https://tgvid.lovable.app/embed/tv/${id}/${s}/${e}`,
  },
  {
    label: "VidStuck (Server 4)",
    movie: (id) => `https://vidstuck.cc/embed/movie/${id}?color=ffffff`,
    tv: (id, s, e) => `https://vidstuck.cc/embed/tv/${id}/${s}/${e}?color=ffffff`,
  },
  {
    label: "ZXCStream (Server 5)",
    movie: (id) => `https://zxcstream.cc/player/movie/${id}`,
    tv: (id, s, e) => `https://zxcstream.cc/player/tv/${id}/${s}/${e}`,
  },
  {
    label: "VidFast (Server 6)",
    movie: (id) => `https://vidfast.vc/movie/${id}?autoPlay=true`,
    tv: (id, s, e) => `https://vidfast.vc/tv/${id}/${s}/${e}?autoPlay=true`,
  },
  {
    label: "Nxsha (Server 7)",
    movie: (id) => `https://nxsha.space/embed/movie/${id}`,
    tv: (id, s, e) => `https://nxsha.space/embed/tv/${id}/${s}/${e}`,
  },
  {
    label: "Bingr (Server 8)",
    movie: (id) => `https://bingr.one/watch/movie/${id}`,
    tv: (id, s, e) => `https://bingr.one/watch/tv/${id}/${s}/${e}`,
  },
];

export const getStream = async function ({
  link,
  type,
  signal,
  providerContext,
  isDownload,
}: {
  link: string;
  type: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
  isDownload?: boolean;
}): Promise<Stream[]> {
  try {
    // Embed players are playback-only.
    if (isDownload) return [];

    const match = link.match(/\/(movie|tv)\/(\d+)/);
    if (!match) {
      throw new Error(`Aethoflix: could not parse a TMDB id from ${link}`);
    }
    const kind = match[1];
    const id = match[2];
    const query = new URLSearchParams(link.split("?")[1] || "");
    const season = query.get("season") || "1";
    const episode = query.get("episode") || "1";

    let preferredServer: string | undefined;
    try {
      preferredServer = await providerContext.kvStore?.get<string>(
        "preferredServer",
      );
    } catch {
      preferredServer = undefined;
    }

    const ordered = [...SERVERS].sort((a, b) => {
      if (!preferredServer || preferredServer === "auto") return 0;
      const aHit = a.label.startsWith(preferredServer) ? 0 : 1;
      const bHit = b.label.startsWith(preferredServer) ? 0 : 1;
      return aHit - bHit;
    });

    return ordered.map((server) => ({
      server: server.label,
      link:
        kind === "tv"
          ? server.tv(id, season, episode)
          : server.movie(id),
      type: "embed",
    }));
  } catch (err) {
    throwProviderError("aethoflix", "getStream", err);
  }
};
