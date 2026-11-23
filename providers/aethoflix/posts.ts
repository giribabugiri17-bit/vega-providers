import { Post, ProviderContext } from "../types";
import { throwProviderError } from "../providerErrors";

const DEFAULT_SITE_URL = "https://aethoflix.live";
const TMDB_API = "https://api.themoviedb.org/3";
// Aethoflix's own public client key, shipped in its website JavaScript
// (assets/index-*.js, VITE_TMDB_API_KEY fallback). The site calls TMDB
// from the browser with this key, so the provider does the same.
const TMDB_API_KEY = "fca1c3fa675f74cf4aa8d24b72dd4807";
const TMDB_IMAGE = "https://image.tmdb.org/t/p/w500";

async function getSiteUrl(
  providerContext: ProviderContext,
): Promise<string> {
  let override: string | undefined;
  try {
    override = await providerContext.kvStore?.get<string>("baseUrlOverride");
  } catch {
    override = undefined;
  }
  const base = (override || DEFAULT_SITE_URL).trim().replace(/\/+$/, "");
  return base || DEFAULT_SITE_URL;
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

function mapTmdbItems(items: any[], siteUrl: string): Post[] {
  const posts: Post[] = [];
  for (const item of items) {
    const id = item?.id;
    if (!id) continue;
    // /search/multi also returns people — skip them.
    if (item.media_type && item.media_type !== "movie" && item.media_type !== "tv") continue;
    const mediaType = item.media_type === "tv" ? "tv" : "movie";
    const title = (item.title || item.name || "").trim();
    if (!title) continue;
    const poster = item.poster_path || item.backdrop_path || "";
    posts.push({
      title,
      link: `${siteUrl}/${mediaType}/${id}`,
      image: poster ? `${TMDB_IMAGE}${poster}` : "",
    });
  }
  return posts;
}

function buildTmdbUrl(path: string, extra: Record<string, string>): string {
  const [basePath, queryString] = path.split("?");
  const params = new URLSearchParams(queryString || "");
  params.set("api_key", TMDB_API_KEY);
  params.set("language", "en-US");
  for (const [key, value] of Object.entries(extra)) params.set(key, value);
  return `${TMDB_API}${basePath}?${params.toString()}`;
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
    const { axios, commonHeaders } = providerContext;
    const cleanFilter = filter && filter !== "/" ? filter : "/trending/all/week";
    const url = buildTmdbUrl(cleanFilter, { page: String(page || 1) });
    const response = await axios.get(url, {
      headers: commonHeaders,
      signal,
    });
    return mapTmdbItems(parseApiData(response.data), siteUrl);
  } catch (err) {
    throwProviderError("aethoflix", "getPosts", err);
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
    const { axios, commonHeaders } = providerContext;
    // Same multi-search the site itself uses for its search page.
    const url = buildTmdbUrl("/search/multi", {
      query: searchQuery,
      page: String(page || 1),
      include_adult: "false",
    });
    const response = await axios.get(url, {
      headers: commonHeaders,
      signal,
    });
    return mapTmdbItems(parseApiData(response.data), siteUrl);
  } catch (err) {
    throwProviderError("aethoflix", "getSearchPosts", err);
  }
};
