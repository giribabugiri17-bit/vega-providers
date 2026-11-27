import { Stream, ProviderContext } from "../types";
import { throwProviderError } from "../providerErrors";

const DEFAULT_BASE_URL = "https://www.atozcartoonist.com";

async function getBaseUrl(
  providerContext: ProviderContext,
): Promise<string> {
  // kvStore is injected by the Vega app; the local test harness does not
  // provide it, so guard against it being absent.
  const kvStore = (providerContext as any).kvStore;
  const override = kvStore
    ? await kvStore.get<string>("baseUrlOverride")
    : undefined;
  const base = (override || DEFAULT_BASE_URL).trim().replace(/\/+$/, "");
  return base || DEFAULT_BASE_URL;
}

function resolveLink(baseUrl: string, href: string): string {
  if (!href) return href;
  if (href.startsWith("http://") || href.startsWith("https://")) return href;
  return `${baseUrl}${href.startsWith("/") ? href : `/${href}`}`;
}

/**
 * AtoZCartoonist does NOT expose direct .mp4/.m3u8 files or an embedded
 * player in its post pages. Every episode/movie button points to the
 * site's own redirector (/redirect/?url=<opaque token>), which lands on
 * the site's "Choose Your Experience" gate: a free sponsor task
 * (MoonLinks shortener) or paid Premium access (INR 25-599).
 *
 * getStream therefore returns the site's own redirect links unchanged.
 * The Vega app opens them in a WebView, where the user completes the
 * site's own free task (or uses Premium if they have it) to reach the
 * file host. No shortener/task is completed or bypassed by this
 * provider, so direct in-app playback is NOT guaranteed.
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
    const seen = new Set<string>();

    const push = (href: string) => {
      if (!href || seen.has(href)) return;
      seen.add(href);
      streams.push({
        server: "AtoZCartoonist",
        link: href,
        type: "mp4",
      });
    };

    // A redirect link is already the best available source.
    if (url.includes("/redirect/?url=")) {
      push(url);
      return streams;
    }

    // Otherwise `link` is a post page: collect its episode/movie
    // redirect links from the accordions (and any other redirect link
    // in the post body).
    const response = await axios.get(url, { headers: commonHeaders, signal });
    const $ = cheerio.load(response.data);

    $('.mks_accordion_content a[href*="/redirect/"]').each((_, el) => {
      const href = $(el).attr("href") || "";
      if (href) push(resolveLink(baseUrl, href));
    });

    if (streams.length === 0) {
      $('.entry-content a[href*="/redirect/"]').each((_, el) => {
        const href = $(el).attr("href") || "";
        if (href) push(resolveLink(baseUrl, href));
      });
    }

    return streams;
  } catch (err) {
    throwProviderError("atozcartoonist", "getStream", err);
  }
};
