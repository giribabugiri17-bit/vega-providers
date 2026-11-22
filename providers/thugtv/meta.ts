import { Info, ProviderContext } from "../types";
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

function parseLink(link: string): { kind: "movie" | "tv"; id: string } {
  const match = link.match(/\/(movie|tv)\/(\d+)/);
  if (match) {
    return { kind: match[1] as "movie" | "tv", id: match[2] };
  }
  // Fallback: a v_ slug link from the site itself has no TMDB id, so
  // meta cannot use the API for it; treat it as a movie link and let
  // the caller fail cleanly.
  return { kind: "movie", id: "" };
}

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  try {
    const siteUrl = await getSiteUrl(providerContext);
    const apiUrl = await getApiUrl(providerContext);
    const { axios, commonHeaders } = providerContext;
    const { kind, id } = parseLink(link);
    if (!id) {
      throw new Error(`ThugTV: could not parse a TMDB id from ${link}`);
    }

    const detailUrl = `${apiUrl}/tmdb/${kind}/${id}`;
    const detailRes = await axios.get(detailUrl, {
      headers: commonHeaders,
    });
    const detail = parseJson(detailRes.data);
    if (!detail) throw new Error("ThugTV: empty detail response");

    const title = (detail.title || detail.name || "").trim();
    const poster = detail.poster_path || detail.backdrop_path || "";
    const image = poster ? `${TMDB_IMAGE}${poster}` : "";
    const genres = Array.isArray(detail.genres)
      ? detail.genres.map((g: any) => g.name).filter(Boolean)
      : [];
    const rating =
      typeof detail.vote_average === "number"
        ? detail.vote_average.toFixed(1)
        : undefined;
    const baseLink = `${siteUrl}/${kind}/${id}`;

    if (kind === "movie") {
      return {
        title,
        image,
        synopsis: detail.overview || "",
        imdbId: detail.imdb_id || "",
        tmdbId: String(detail.id || id),
        type: "movie",
        tags: genres,
        rating,
        linkList: [
          {
            title: "Movie",
            quality: "1080p",
            directLinks: [{ title, link: baseLink, type: "movie" }],
          },
        ],
      };
    }

    // Series: one linkList entry per season, episodes fetched from
    // /tmdb/tv/<id>/season/<season>. Season 0 (specials) is skipped.
    const seasons = (Array.isArray(detail.seasons) ? detail.seasons : [])
      .filter((s: any) => s && s.season_number > 0)
      .sort((a: any, b: any) => a.season_number - b.season_number);
    const seasonData = await Promise.all(
      seasons.map(async (season: any) => {
        try {
          const res = await axios.get(
            `${apiUrl}/tmdb/tv/${id}/season/${season.season_number}`,
            { headers: commonHeaders },
          );
          return parseJson(res.data);
        } catch {
          return null;
        }
      }),
    );

    const linkList = seasonData
      .map((seasonDetail: any, index: number) => {
        const seasonNumber = seasons[index].season_number;
        const episodes = Array.isArray(seasonDetail?.episodes)
          ? seasonDetail.episodes
          : [];
        const directLinks = episodes.map((ep: any) => ({
          title: `Episode ${ep.episode_number}: ${ep.name || ""}`.trim(),
          link: `${baseLink}?season=${seasonNumber}&episode=${ep.episode_number}`,
          type: "series" as const,
          description: ep.overview || undefined,
        }));
        return {
          title: `Season ${seasonNumber}`,
          directLinks,
        };
      })
      .filter((entry: any) => entry.directLinks.length > 0);

    // Fallback if no season episode data came back: a single entry so
    // the show is still playable via its first episode.
    if (linkList.length === 0) {
      linkList.push({
        title: "Season 1",
        directLinks: [
          {
            title: "Episode 1",
            link: `${baseLink}?season=1&episode=1`,
            type: "series" as const,
          },
        ],
      });
    }

    return {
      title,
      image,
      synopsis: detail.overview || "",
      imdbId: "",
      tmdbId: String(detail.id || id),
      type: "series",
      tags: genres,
      rating,
      linkList,
    };
  } catch (err) {
    throwProviderError("thugtv", "getMeta", err);
  }
};
