import { Info, ProviderContext } from "../types";
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

// Post pages render their info as <p>Label: <span>value</span></p> lines
// inside .entry-content, e.g. "Genre: Animation | Kids | Adventure",
// "Language: Hindi + Tamil + Telugu ...", "Quality: 1080pFHD x265 HEVC WEB-DL",
// "Rating: 8.7/10", "Size: 350-700MB (Each Episodes)".
const INFO_LABELS = [
  "Anime Name",
  "Show Name",
  "Season No",
  "Episode No",
  "Total Episodes",
  "Episodes/Parts",
  "Genre",
  "Language",
  "Subtitle",
  "Duration",
  "Release Date",
  "Rating",
  "Size",
  "Quality",
  "Encoded By",
];

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  try {
    const baseUrl = await getBaseUrl(providerContext);
    const { axios, cheerio, commonHeaders } = providerContext;
    const url = resolveLink(baseUrl, link);
    const response = await axios.get(url, { headers: commonHeaders });
    const $ = cheerio.load(response.data);

    const title =
      $("h1").first().text().trim() ||
      $("title").first().text().split("|")[0].trim();

    // Poster: first image inside the post body (a blogger-hosted poster).
    const poster =
      $(".entry-content img").first().attr("src") ||
      $('img[fifu-featured="1"]').first().attr("src") ||
      "";

    // Synopsis: <h3><span><strong>Synopsis</strong></span></h3> + next <p>.
    let synopsis = "";
    $("h3").each((_, el) => {
      if (synopsis) return;
      if ($(el).text().trim().toLowerCase().includes("synopsis")) {
        synopsis = $(el).next("p").text().replace(/\s+/g, " ").trim();
      }
    });

    // Info box fields.
    const info: Record<string, string> = {};
    $(".entry-content p").each((_, el) => {
      const text = $(el).text().replace(/\s+/g, " ").trim();
      for (const label of INFO_LABELS) {
        if (text.startsWith(`${label}:`)) {
          info[label] = text.slice(label.length + 1).trim();
          break;
        }
      }
    });

    const genres = (info["Genre"] || "")
      .split(/[|,]/)
      .map((g) => g.trim())
      .filter(Boolean);

    // Episodes: expandable accordions
    // <div class="mks_accordion_item">
    //   <div class="mks_accordion_heading">E01 - Title</div>
    //   <div class="mks_accordion_content">
    //     <a href="/redirect/?url=...">GoogleDrive</a> |
    //     <a href="/redirect/?url=...">GDFlix</a>
    //   </div>
    // </div>
    // The redirect links are the site's own link gate (free sponsor task
    // or paid Premium). They are returned as-is; the app opens them in a
    // WebView and the user completes the site's own free task there.
    const episodes: { title: string; link: string }[] = [];
    $(".mks_accordion_item").each((_, el) => {
      const $item = $(el);
      const epTitle = $item
        .find(".mks_accordion_heading")
        .first()
        .text()
        .replace(/\s+/g, " ")
        .trim();
      if (!epTitle) return;
      const seen = new Set<string>();
      $item.find('.mks_accordion_content a[href*="/redirect/"]').each((_, a) => {
        const href = $(a).attr("href") || "";
        const label = $(a).text().trim();
        if (!href || seen.has(href)) return;
        seen.add(href);
        // Keep the button label only when an episode has several distinct links.
        const distinctCount = $item
          .find('.mks_accordion_content a[href*="/redirect/"]')
          .toArray()
          .map((x) => $(x).attr("href"))
          .filter((v, i, arr) => v && arr.indexOf(v) === i).length;
        episodes.push({
          title: distinctCount > 1 && label ? `${epTitle} (${label})` : epTitle,
          link: resolveLink(baseUrl, href),
        });
      });
    });

    // Movie / single-download posts have no accordion: any redirect link in
    // the post body is a download link for the whole item.
    const movieLinks: { title: string; link: string }[] = [];
    if (episodes.length === 0) {
      const seen = new Set<string>();
      $('.entry-content a[href*="/redirect/"]').each((_, a) => {
        const href = $(a).attr("href") || "";
        const label = $(a).text().trim();
        if (!href || seen.has(href)) return;
        seen.add(href);
        movieLinks.push({
          title: label || title || "Download",
          link: resolveLink(baseUrl, href),
        });
      });
    }

    const isMovie = episodes.length === 0 || /movie/i.test(title);
    const linkList: Info["linkList"] = [];

    if (episodes.length > 0) {
      linkList.push({
        title: "Episodes",
        directLinks: episodes.map((ep) => ({
          title: ep.title,
          link: ep.link,
          type: "series" as const,
        })),
      });
    }

    if (movieLinks.length > 0) {
      linkList.push({
        title: "Download",
        directLinks: movieLinks.map((m) => ({
          title: m.title,
          link: m.link,
          type: isMovie ? ("movie" as const) : ("series" as const),
        })),
      });
    }

    const ratingRaw = info["Rating"] || "";
    const rating = ratingRaw ? ratingRaw.split("/")[0].trim() : undefined;

    return {
      title,
      synopsis,
      image: poster,
      imdbId: "",
      type: isMovie ? "movie" : "series",
      tags: genres,
      rating,
      linkList,
    };
  } catch (err) {
    throwProviderError("atozcartoonist", "getMeta", err);
  }
};
