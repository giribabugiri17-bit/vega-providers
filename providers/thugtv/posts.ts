import { Post, ProviderContext } from "../types";
import { throwProviderError } from "../providerErrors";

const DEFAULT_SITE_URL = "https://thugtv.st";
const DEFAULT_API_URL = "https://api.thugtv.online/api";
const TMDB_IMAGE = "https://image.tmdb.org/t/p/w500";

async function getSiteUrl(
  providerContext: ProviderContext,
): Promise<string> {
  const override = await providerContext.kvStore.get<string>(
    "baseUrlOverride",
  );
  const base = (override || DEFAULT_SITE_URL).trim().replace(/\/+$/, "");
  return base || DEFAULT_SITE_URL;
}

async function getApiUrl(
  providerContext: ProviderContext,
): Promise<string> {
  const override = await providerContext.kvStore.get<string>("apiBaseUrl");
  const base = (override || DEFAULT_API_URL).trim().replace(/\/+$/, "");
  return base || DEFAULT_API_URL;
}

function parseApiData(data: unknown): any[] {
  if (Array.isArray(data)) return data;
  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  if (data && typeof data === "object") {
    const results = (data as any).results;
    if (Array.isArray(results)) return results;
  }
  return [];
}

function mapApiItems(items: any[], siteUrl: string): Post[] {
  const posts: Post[] = [];
  for (const item of items) {
    const id = item?.id;
    if (!id) continue;
    const mediaType = item.media_type === "tv" ? "tv" : "movie";
    const title = (item.title || item.name || "").trim();
    if (!title) continue;
    const poster = item.poster_path || item.backdrop_path || "";
    posts.push({
      title,
      // The site resolves a TMDB id to its own detail page:
      // /movie/<tmdbId> redirects to /movie/v_<slug>.
      link: `${siteUrl}/${mediaType}/${id}`,
      image: poster ? `${TMDB_IMAGE}${poster}` : "",
    });
  }
  return posts;
}

function parseHtmlCards(
  providerContext: ProviderContext,
  siteUrl: string,
  html: string,
): Post[] {
  const { cheerio } = providerContext;
  const $ = cheerio.load(html);
  const posts: Post[] = [];
  const seen = new Set<string>();
  // Cards: <a class="card-link" aria-label="Title" href="/movie/v_...">
  //   or href="/tv/v_..."> with a TMDB poster <img> inside.
  $("a.card-link").each((_, el) => {
    const $a = $(el);
    const href = $a.attr("href") || "";
    const title = ($a.attr("aria-label") || "").trim();
    if (!title || !href) return;
    if (!href.startsWith("/movie/") && !href.startsWith("/tv/")) return;
    const link = href.startsWith("http")
      ? href
      : `${siteUrl}${href}`;
    if (seen.has(link)) return;
    seen.add(link);
    const img = $a.find("img").first().attr("src") || "";
    posts.push({ title, link, image: img });
  });
  return posts;
}

function sitePathForFilter(filter: string): string {
  if (filter.includes("trending-tv") || filter.includes("/tv")) return "/tv";
  if (filter.includes("anime")) return "/anime";
  if (filter.includes("trending")) return "/";
  return "/movies";
}

export const getPosts = async function ({
  filter,
  page,
  providerValue,
  signal,
  providerContext,
}: {
  filter: string;
  page: number;
  providerValue: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  try {
    const siteUrl = await getSiteUrl(providerContext);
    const apiUrl = await getApiUrl(providerContext);
    const { axios, commonHeaders } = providerContext;
    const cleanFilter = filter && filter !== "/" ? filter : "/tmdb/trending";
    const separator = cleanFilter.includes("?") ? "&" : "?";
    const url = `${apiUrl}${cleanFilter}${separator}page=${page}`;
    try {
      const response = await axios.get(url, {
        headers: commonHeaders,
        signal,
      });
      const posts = mapApiItems(parseApiData(response.data), siteUrl);
      if (posts.length > 0) return posts;
    } catch {
      // Fall through to the HTML rail fallback below.
    }
    // Fallback: scrape the site's own rails (home / movies / tv / anime).
    const htmlUrl = `${siteUrl}${sitePathForFilter(cleanFilter)}`;
    const response = await axios.get(htmlUrl, {
      headers: commonHeaders,
      signal,
    });
    return parseHtmlCards(providerContext, siteUrl, String(response.data));
  } catch (err) {
    throwProviderError("thugtv", "getPosts", err);
  }
};

export const getSearchPosts = async function ({
  searchQuery,
  page,
  providerValue,
  signal,
  providerContext,
}: {
  searchQuery: string;
  page: number;
  providerValue: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  try {
    const siteUrl = await getSiteUrl(providerContext);
    const apiUrl = await getApiUrl(providerContext);
    const { axios, commonHeaders } = providerContext;
    // The site's search API: /tmdb/search?q=<query>&page=<page>
    // (its /search page itself is client-side rendered, so scraping it
    // returns no results.)
    const url = `${apiUrl}/tmdb/search?q=${encodeURIComponent(
      searchQuery,
    )}&page=${page}`;
    const response = await axios.get(url, {
      headers: commonHeaders,
      signal,
    });
    return mapApiItems(parseApiData(response.data), siteUrl);
  } catch (err) {
    throwProviderError("thugtv", "getSearchPosts", err);
  }
};
