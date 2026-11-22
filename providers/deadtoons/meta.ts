import { Info, ProviderContext } from "../types";
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

    const title = $("h1").first().text().trim();

    // Poster: TMDB poster first, then the Deadtoons banner image.
    const poster =
      $('img[src*="image.tmdb.org"]').first().attr("src") ||
      $('img[src*="media.deadbase.host"]').first().attr("src") ||
      "";

    // Storyline: <h3>Storyline</h3> followed by a <p>.
    const synopsis = $("h3")
      .filter((_, el) => $(el).text().trim() === "Storyline")
      .next("p")
      .text()
      .trim();

    // Series Info list: "Full Name:", "Season:", "Episodes:", "Year:",
    // "Rating:", "Genre:", "Language:" — each as <li>Label: <strong>value</strong></li>
    const info: Record<string, string> = {};
    const genres: string[] = [];
    $("ul li").each((_, el) => {
      const text = $(el).text().replace(/\s+/g, " ").trim();
      const strong = $(el).find("strong").first().text().trim();
      if (text.startsWith("Full Name:")) info.fullName = strong;
      else if (text.startsWith("Season:")) info.season = strong;
      else if (text.startsWith("Episodes:")) info.episodes = strong;
      else if (text.startsWith("Year:")) info.year = strong;
      else if (text.startsWith("Rating:")) info.rating = strong;
      else if (text.startsWith("Language:")) info.language = strong;
      else if (text.startsWith("Genre:")) {
        $(el)
          .find("a")
          .each((_, a) => {
            const genre = $(a).text().trim();
            if (genre) genres.push(genre);
          });
      }
    });

    // Episodes: <ul class="divide-y divide-border"><li>
    //   <div>Episode 1: Title</div>
    //   <a href="https://archive.deadtoons.sbs/episode/...">Download</a>
    //   <a href="https://anidisk.org/watch/...">Watch Online</a>
    // </li></ul>
    const episodes: { title: string; link: string; downloadLink: string }[] =
      [];
    $("ul.divide-y li").each((_, el) => {
      const $li = $(el);
      const epTitle = $li.find("div").first().text().trim();
      if (!epTitle.startsWith("Episode")) return;
      const watchLink =
        $li.find('a[href*="anidisk.org/watch"]').first().attr("href") || "";
      const downloadLink =
        $li.find('a[href*="archive.deadtoons.sbs/episode"]').first().attr("href") ||
        "";
      if (!watchLink && !downloadLink) return;
      episodes.push({
        title: epTitle,
        link: watchLink || downloadLink,
        downloadLink,
      });
    });

    // Pack (batch) download links:
    // <a href="https://archive.deadtoons.sbs/pack/<slug>/<season>/<quality>">1080p x265 10bit</a>
    const packs: { title: string; link: string }[] = [];
    $('a[href*="archive.deadtoons.sbs/pack"]').each((_, el) => {
      const $a = $(el);
      const packLink = $a.attr("href") || "";
      const packTitle = $a.text().trim();
      if (packLink && packTitle) packs.push({ title: packTitle, link: packLink });
    });

    const isMovie =
      episodes.length === 0 ||
      /movie/i.test(title) ||
      url.includes("-movie");

    const linkList: Info["linkList"] = [];

    if (episodes.length > 0) {
      linkList.push({
        title: info.season ? `Season ${info.season}` : "Episodes",
        directLinks: episodes.map((ep) => ({
          title: ep.title,
          link: ep.link,
          type: "series" as const,
        })),
      });
    }

    if (packs.length > 0) {
      linkList.push({
        title: "Pack Downloads",
        directLinks: packs.map((pack) => ({
          title: pack.title,
          link: pack.link,
          type: isMovie ? ("movie" as const) : ("series" as const),
        })),
      });
    }

    if (linkList.length === 0) {
      // Movie / single-item pages: fall back to any AniDisk or archive link.
      const watchLink =
        $('a[href*="anidisk.org/watch"]').first().attr("href") || "";
      const downloadLink =
        $('a[href*="archive.deadtoons.sbs"]').first().attr("href") || "";
      const fallbackLink = watchLink || downloadLink;
      if (fallbackLink) {
        linkList.push({
          title: "Watch / Download",
          directLinks: [
            {
              title,
              link: fallbackLink,
              type: isMovie ? ("movie" as const) : ("series" as const),
            },
          ],
        });
      }
    }

    return {
      title: title || info.fullName || "",
      synopsis,
      image: poster,
      imdbId: "",
      type: isMovie ? "movie" : "series",
      tags: genres,
      rating: info.rating ? info.rating.split("/")[0].trim() : undefined,
      linkList,
    };
  } catch (err) {
    throwProviderError("deadtoons", "getMeta", err);
  }
};
