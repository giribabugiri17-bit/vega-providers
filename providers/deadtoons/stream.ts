import { Stream, ProviderContext } from "../types";
import { throwProviderError } from "../providerErrors";

const DEFAULT_BASE_URL = "https://deadtoons.sbs";

async function getBaseUrl(
  providerContext: ProviderContext,
): Promise<string> {
  const override = await providerContext.kvStore.get<string>(
    "baseUrlOverride",
  );
  const base = (override || DEFAULT_BASE_URL).trim().replace(/\/+$/, "");
  return base || DEFAULT_BASE_URL;
}

function resolveLink(baseUrl: string, href: string): string {
  if (!href) return href;
  if (href.startsWith("http://") || href.startsWith("https://")) return href;
  return `${baseUrl}${href.startsWith("/") ? href : `/${href}`}`;
}

function qualityFromPackLink(link: string): string | undefined {
  // https://archive.deadtoons.sbs/pack/<slug>/<season>/1080p-x265-10bit
  const match = link.match(/\/pack\/[^/]+\/[^/]+\/(\d{3,4})p/i);
  return match ? match[1] : undefined;
}

/**
 * Deadtoons does not expose direct .mp4/.m3u8 files in its static HTML.
 * A post page offers, per episode:
 *   - "Watch Online"  -> https://anidisk.org/watch/<slug>/<season>/<episode>
 *   - "Download"       -> https://archive.deadtoons.sbs/episode/<slug>/<SxE>
 * and per season, pack downloads at archive.deadtoons.sbs/pack/.../<quality>.
 * getStream therefore returns those watch/download pages as the best
 * available sources. The AniDisk page loads its video player with
 * JavaScript, so if its HTML ever contains a direct .m3u8/.mp4 URL we
 * return that first. Archive links are Cloudflare-protected for plain
 * HTTP clients; in the Vega app use providerContext.openWebView if a
 * verification page appears.
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
    const baseUrl = await getBaseUrl(providerContext);
    const { axios, cheerio, commonHeaders } = providerContext;
    const url = resolveLink(baseUrl, link);
    const streams: Stream[] = [];

    const pushWatch = (watchUrl: string, quality?: string) => {
      if (!watchUrl) return;
      streams.push({
        server: "AniDisk",
        link: watchUrl,
        type: "mp4",
        quality,
      });
    };
    const pushDownload = (downloadUrl: string, quality?: string) => {
      if (!downloadUrl) return;
      streams.push({
        server: "Deadtoons Archive",
        link: downloadUrl,
        type: "mp4",
        quality,
      });
    };

    if (url.includes("anidisk.org/watch")) {
      // Best effort: look for a direct video file in the AniDisk page.
      try {
        const res = await axios.get(url, { headers: commonHeaders, signal });
        const direct = String(res.data).match(
          /https?:\/\/[^\s"'<>]+\.(m3u8|mp4)(\?[^\s"'<>]*)?/i,
        );
        if (direct) {
          streams.push({
            server: "AniDisk",
            link: direct[0],
            type: direct[1].toLowerCase() === "m3u8" ? "m3u8" : "mp4",
          });
        }
      } catch {
        // AniDisk page could not be fetched directly; fall through to
        // returning the watch page itself below.
      }
      pushWatch(url);
      return streams;
    }

    if (url.includes("archive.deadtoons.sbs")) {
      pushDownload(url, qualityFromPackLink(url));
      return streams;
    }

    // Otherwise `link` is a Deadtoons post page: scrape its episode and
    // pack links, then return them as streams.
    const response = await axios.get(url, { headers: commonHeaders, signal });
    const $ = cheerio.load(response.data);

    const watchLinks: string[] = [];
    const downloadLinks: { link: string; quality?: string }[] = [];

    $('a[href*="anidisk.org/watch"]').each((_, el) => {
      const href = $(el).attr("href") || "";
      if (href && !watchLinks.includes(href)) watchLinks.push(href);
    });
    $('a[href*="archive.deadtoons.sbs/episode"]').each((_, el) => {
      const href = $(el).attr("href") || "";
      if (href) downloadLinks.push({ link: href });
    });
    $('a[href*="archive.deadtoons.sbs/pack"]').each((_, el) => {
      const href = $(el).attr("href") || "";
      if (href) {
        downloadLinks.push({ link: href, quality: qualityFromPackLink(href) });
      }
    });

    if (isDownload) {
      downloadLinks.forEach((d) => pushDownload(d.link, d.quality));
      watchLinks.forEach((w) => pushWatch(w));
    } else {
      watchLinks.forEach((w) => pushWatch(w));
      downloadLinks.forEach((d) => pushDownload(d.link, d.quality));
    }

    return streams;
  } catch (err) {
    throwProviderError("deadtoons", "getStream", err);
  }
};
