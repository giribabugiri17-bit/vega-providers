import { Stream, ProviderContext } from "../types";
import { throwProviderError } from "../providerErrors";

const DEFAULT_API_URL = "https://api.thugtv.online/api";

async function getApiUrl(
  providerContext: ProviderContext,
): Promise<string> {
  const override = await providerContext.kvStore.get<string>("apiBaseUrl");
  const base = (override || DEFAULT_API_URL).trim().replace(/\/+$/, "");
  return base || DEFAULT_API_URL;
}

function parseJson(data: unknown): any {
  if (data && typeof data === "object") return data;
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  return null;
}

function qualityNumber(quality: string | undefined): number {
  if (!quality) return 0;
  const match = quality.match(/(\d{3,4})/);
  return match ? parseInt(match[1], 10) : 0;
}

function toTextTracks(subtitles: any[]): any[] | undefined {
  if (!Array.isArray(subtitles) || subtitles.length === 0) return undefined;
  const tracks = subtitles
    .filter((s: any) => s && s.url)
    .map((s: any) => ({
      title: s.label || s.lang || "Subtitles",
      language: s.lang || "en",
      type: "text/vtt" as const,
      uri: s.url,
    }));
  return tracks.length > 0 ? tracks : undefined;
}

/**
 * ThugTV's API returns real direct streams:
 *   GET /api/stream/movie/<tmdbId>
 *   GET /api/stream/tv/<tmdbId>/<season>/<episode>
 * Each source is either a direct HLS (.m3u8) server — "Citadel" (720p,
 * with separate Hindi/Tamil/Telugu audio .m3u8s) and "Velvet" (1080p) —
 * or an embed page (Vidrift, Vixsrc, Vidrock, VidSrc, ...).
 * Sources with an empty url and only a `resolvePath` are skipped: they
 * need a second resolve call the sandbox does not need to make when
 * direct servers are already available.
 */
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
    const apiUrl = await getApiUrl(providerContext);
    const { axios, commonHeaders } = providerContext;

    const match = link.match(/\/(movie|tv)\/(\d+)/);
    if (!match) {
      throw new Error(`ThugTV: could not parse a TMDB id from ${link}`);
    }
    const kind = match[1];
    const id = match[2];
    const query = new URLSearchParams(link.split("?")[1] || "");
    const season = query.get("season") || "1";
    const episode = query.get("episode") || "1";

    const streamUrl =
      kind === "tv"
        ? `${apiUrl}/stream/tv/${id}/${season}/${episode}`
        : `${apiUrl}/stream/movie/${id}`;
    const response = await axios.get(streamUrl, {
      headers: commonHeaders,
      signal,
    });
    const data = parseJson(response.data);
    const sources = Array.isArray(data?.sources) ? data.sources : [];
    if (sources.length === 0) {
      throw new Error("ThugTV: no stream sources returned");
    }

    const preferredQuality = await providerContext.kvStore.get<string>(
      "preferredQuality",
    );
    const preferDownload = await providerContext.kvStore.get<boolean>(
      "preferDownload",
    );
    const wantDownload = isDownload || preferDownload === true;

    const streams: Stream[] = [];
    const hls: Stream[] = [];
    const embeds: Stream[] = [];

    for (const source of sources) {
      if (!source || !source.url) continue;
      const server = (source.label || source.name || "ThugTV").trim();
      const subtitles = toTextTracks(source.subtitles);
      if (source.type === "hls") {
        // Main URL, then each quality variant as its own stream.
        hls.push({
          server,
          link: source.url,
          type: "m3u8",
          quality: qualityNumber(source.quality)
            ? String(qualityNumber(source.quality))
            : undefined,
          subtitles,
        });
        if (Array.isArray(source.qualityVariants)) {
          for (const variant of source.qualityVariants) {
            if (!variant?.url || variant.url === source.url) continue;
            hls.push({
              server,
              link: variant.url,
              type: "m3u8",
              quality: qualityNumber(variant.label)
                ? String(qualityNumber(variant.label))
                : undefined,
              subtitles,
            });
          }
        }
        // Separate audio tracks (e.g. Hindi dub) are their own .m3u8.
        if (Array.isArray(source.audioStreams)) {
          for (const audio of source.audioStreams) {
            if (!audio?.url || audio.lang === "en") continue;
            hls.push({
              server: `${server} (${audio.label || audio.lang})`,
              link: audio.url,
              type: "m3u8",
              quality: qualityNumber(source.quality)
                ? String(qualityNumber(source.quality))
                : undefined,
              subtitles,
            });
          }
        }
      } else if (source.type === "embed") {
        // Embed pages are playback-only, never downloads.
        if (wantDownload) continue;
        embeds.push({
          server,
          link: source.url,
          type: "embed",
          quality: qualityNumber(source.quality)
            ? String(qualityNumber(source.quality))
            : undefined,
        });
      }
    }

    // Preferred quality first, then highest quality, HLS before embeds.
    const byQuality = (a: Stream, b: Stream) => {
      if (preferredQuality && preferredQuality !== "auto") {
        const want = qualityNumber(preferredQuality);
        const aHit = qualityNumber(a.quality) === want ? 0 : 1;
        const bHit = qualityNumber(b.quality) === want ? 0 : 1;
        if (aHit !== bHit) return aHit - bHit;
      }
      return qualityNumber(b.quality) - qualityNumber(a.quality);
    };
    hls.sort(byQuality);
    embeds.sort(byQuality);

    if (wantDownload) return hls;
    return [...hls, ...embeds];
  } catch (err) {
    throwProviderError("thugtv", "getStream", err);
  }
};
