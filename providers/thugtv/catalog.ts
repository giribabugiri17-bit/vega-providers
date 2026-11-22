import { Catalog } from "../types";

// ThugTV (https://thugtv.st) lists movies, TV shows and anime.
// Its web pages are Next.js rails, but its own API
// (https://api.thugtv.online/api) serves the same lists as TMDB-style
// JSON, with pagination: /tmdb/<list>?page=<page>. The `filter` values
// below are those API paths, so getPosts can page through them.
export const catalog: Catalog[] = [
  { title: "Trending Movies", filter: "/tmdb/trending" },
  { title: "Trending TV", filter: "/tmdb/trending-tv" },
  { title: "Top Rated", filter: "/tmdb/top-rated" },
  { title: "Anime", filter: "/tmdb/anime" },
  { title: "Action", filter: "/tmdb/action" },
  { title: "Bollywood", filter: "/tmdb/bollywood" },
  { title: "K-Drama", filter: "/tmdb/kdrama" },
  { title: "Horror", filter: "/tmdb/horror" },
  { title: "Comedy", filter: "/tmdb/comedy" },
  { title: "Sci-Fi", filter: "/tmdb/scifi" },
  { title: "Superhero", filter: "/tmdb/superhero" },
  { title: "Crime", filter: "/tmdb/crime" },
  { title: "Romance", filter: "/tmdb/romance" },
  { title: "Animation", filter: "/tmdb/animation" },
];

export const genres: Catalog[] = [
  { title: "Action", filter: "/tmdb/action" },
  { title: "Adventure", filter: "/tmdb/adventure" },
  { title: "Anime", filter: "/tmdb/anime" },
  { title: "Animation", filter: "/tmdb/animation" },
  { title: "Bollywood", filter: "/tmdb/bollywood" },
  { title: "Comedy", filter: "/tmdb/comedy" },
  { title: "Crime", filter: "/tmdb/crime" },
  { title: "Drama", filter: "/tmdb/drama-tv" },
  { title: "Family", filter: "/tmdb/family" },
  { title: "Fantasy", filter: "/tmdb/fantasy" },
  { title: "Horror", filter: "/tmdb/horror" },
  { title: "K-Drama", filter: "/tmdb/kdrama" },
  { title: "Mystery", filter: "/tmdb/mystery" },
  { title: "Romance", filter: "/tmdb/romance" },
  { title: "Sci-Fi", filter: "/tmdb/scifi" },
  { title: "Superhero", filter: "/tmdb/superhero" },
  { title: "Thriller", filter: "/tmdb/thriller" },
  { title: "Top Rated", filter: "/tmdb/top-rated" },
];
