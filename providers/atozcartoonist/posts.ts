import { Post, ProviderContext } from "../types";
import { throwProviderError } from "../providerErrors";

const DEFAULT_BASE_URL = "https://www.atozcartoonist.com";
const PER_PAGE = 10;

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

function decodeTitle(providerContext: ProviderContext, rendered: string): string {
  const { cheerio } = providerContext;
  // title.rendered is HTML-escaped ("&amp;", "&#8211;", ...); strip tags/entities.
  const $ = cheerio.load(`<span>${rendered || ""}</span>`);
  return $("span").text().trim();
}

function parseApiPosts(providerContext: ProviderContext, data: any): Post[] {
  const posts: Post[] = [];
  if (!Array.isArray(data)) return posts;
  for (const p of data) {
    const title = decodeTitle(providerContext, p?.title?.rendered || "");
    const link = p?.link || "";
    if (!title || !link) continue;
    const featured = p?._embedded?.["wp:featuredmedia"]?.[0];
    const image = featured?.source_url || "";
    posts.push({ title, link, image });
  }
  return posts;
}

async function fetchApiPosts(
  providerContext: ProviderContext,
  baseUrl: string,
  query: string,
  signal?: AbortSignal,
): Promise<Post[]> {
  const { axios, commonHeaders } = providerContext;
  const url = `${baseUrl}/wp-json/wp/v2/posts?${query}`;
  try {
    const response = await axios.get(url, {
      headers: commonHeaders,
      signal,
    });
    return parseApiPosts(providerContext, response.data);
  } catch (err: any) {
    // WordPress returns 400 when the requested page is past the last page.
    // That just means "no more posts", not a failure.
    if (err?.response?.status === 400) return [];
    throw err;
  }
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
    const baseUrl = await getBaseUrl(providerContext);
    // filter is either "/" (latest) or a WP category id (see catalog.ts).
    const isCategory = /^\d+$/.test((filter || "").trim());
    const categoryParam = isCategory ? `&categories=${filter.trim()}` : "";
    const query = `per_page=${PER_PAGE}&page=${page}&_embed=1${categoryParam}`;
    return await fetchApiPosts(providerContext, baseUrl, query, signal);
  } catch (err) {
    throwProviderError("atozcartoonist", "getPosts", err);
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
    const baseUrl = await getBaseUrl(providerContext);
    // WP REST API search (?search=) matches post titles and content.
    const query = `per_page=${PER_PAGE}&page=${page}&_embed=1&search=${encodeURIComponent(
      searchQuery,
    )}`;
    return await fetchApiPosts(providerContext, baseUrl, query, signal);
  } catch (err) {
    throwProviderError("atozcartoonist", "getSearchPosts", err);
  }
};
