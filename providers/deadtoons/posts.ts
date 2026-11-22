import { Post, ProviderContext } from "../types";
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

function parsePostList(
  providerContext: ProviderContext,
  baseUrl: string,
  html: string,
): Post[] {
  const { cheerio } = providerContext;
  const $ = cheerio.load(html);
  const posts: Post[] = [];

  // Homepage / genre / popular / completed / search all render the same list:
  // <main><ul><li class="py-6 ...">
  //   <a href="/posts/<slug>"><img src="..."></a>
  //   <div><h2><a href="/posts/<slug>">Title</a></h2>...
  // </li></ul></main>
  $("main ul li").each((_, el) => {
    const $li = $(el);
    const $titleLink = $li.find("h2 a").first();
    const title = $titleLink.text().trim();
    const href = $titleLink.attr("href") || "";
    if (!title || !href || !href.startsWith("/posts/")) return;

    const image =
      $li.find("a img").first().attr("src") ||
      $li.find("img").first().attr("src") ||
      "";

    posts.push({
      title,
      link: resolveLink(baseUrl, href),
      image: image.startsWith("http") ? image : resolveLink(baseUrl, image),
    });
  });

  return posts;
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
    const { axios, commonHeaders } = providerContext;
    const cleanFilter = filter && filter !== "/" ? filter : "/";
    const separator = cleanFilter.includes("?") ? "&" : "?";
    const url = `${baseUrl}${cleanFilter}${separator}page=${page}`;
    const response = await axios.get(url, {
      headers: commonHeaders,
      signal,
    });
    return parsePostList(providerContext, baseUrl, response.data);
  } catch (err) {
    throwProviderError("deadtoons", "getPosts", err);
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
    const { axios, commonHeaders } = providerContext;
    // Site search form: <form action="/search"><input name="q">
    const url = `${baseUrl}/search?q=${encodeURIComponent(
      searchQuery,
    )}&page=${page}`;
    const response = await axios.get(url, {
      headers: commonHeaders,
      signal,
    });
    return parsePostList(providerContext, baseUrl, response.data);
  } catch (err) {
    throwProviderError("deadtoons", "getSearchPosts", err);
  }
};
