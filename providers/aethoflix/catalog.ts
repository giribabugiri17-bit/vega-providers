import { Catalog } from "../types";

// Aethoflix (https://aethoflix.live) is a TMDB-backed catalogue site:
// movies, TV, K-Drama and anime, with Hindi/English/Tamil/Telugu/Korean/
// Japanese audio options on its watch page. Its own shipped JavaScript
// builds every rail from the public TMDB API (api.themoviedb.org/3) —
// trending, popular, top rated, discover by language/genre — so the
// `filter` values below are TMDB paths (with an optional query string).
// getPosts appends the API key, language and page to them.
export const catalog: Catalog[] = [
  { title: "Trending Now", filter: "/trending/all/week" },
  { title: "Trending Movies", filter: "/trending/movie/week" },
  { title: "Trending TV", filter: "/trending/tv/week" },
  { title: "Popular Movies", filter: "/movie/popular" },
  { title: "Top Rated Movies", filter: "/movie/top_rated" },
  { title: "Now Playing", filter: "/movie/now_playing" },
  { title: "Popular TV", filter: "/tv/popular" },
  { title: "Top Rated TV", filter: "/tv/top_rated" },
  { title: "Bollywood", filter: "/discover/movie?with_original_language=hi&region=IN&sort_by=popularity.desc" },
  { title: "K-Drama", filter: "/discover/tv?with_original_language=ko&sort_by=popularity.desc" },
  { title: "Anime", filter: "/discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc" },
  { title: "Action", filter: "/discover/movie?with_genres=28&sort_by=popularity.desc" },
  { title: "Comedy", filter: "/discover/movie?with_genres=35&sort_by=popularity.desc" },
  { title: "Horror", filter: "/discover/movie?with_genres=27&sort_by=popularity.desc" },
  { title: "Sci-Fi", filter: "/discover/movie?with_genres=878&sort_by=popularity.desc" },
  { title: "Romance", filter: "/discover/movie?with_genres=10749&sort_by=popularity.desc" },
  { title: "Thriller", filter: "/discover/movie?with_genres=53&sort_by=popularity.desc" },
  { title: "Animation", filter: "/discover/movie?with_genres=16&sort_by=popularity.desc" },
  { title: "Drama", filter: "/discover/movie?with_genres=18&sort_by=popularity.desc" },
];

export const genres: Catalog[] = [
  { title: "Action", filter: "/discover/movie?with_genres=28&sort_by=popularity.desc" },
  { title: "Adventure", filter: "/discover/movie?with_genres=12&sort_by=popularity.desc" },
  { title: "Animation", filter: "/discover/movie?with_genres=16&sort_by=popularity.desc" },
  { title: "Anime", filter: "/discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc" },
  { title: "Bollywood", filter: "/discover/movie?with_original_language=hi&region=IN&sort_by=popularity.desc" },
  { title: "Comedy", filter: "/discover/movie?with_genres=35&sort_by=popularity.desc" },
  { title: "Crime", filter: "/discover/movie?with_genres=80&sort_by=popularity.desc" },
  { title: "Drama", filter: "/discover/movie?with_genres=18&sort_by=popularity.desc" },
  { title: "Fantasy", filter: "/discover/movie?with_genres=14&sort_by=popularity.desc" },
  { title: "Horror", filter: "/discover/movie?with_genres=27&sort_by=popularity.desc" },
  { title: "K-Drama", filter: "/discover/tv?with_original_language=ko&sort_by=popularity.desc" },
  { title: "Mystery", filter: "/discover/movie?with_genres=9648&sort_by=popularity.desc" },
  { title: "Romance", filter: "/discover/movie?with_genres=10749&sort_by=popularity.desc" },
  { title: "Sci-Fi", filter: "/discover/movie?with_genres=878&sort_by=popularity.desc" },
  { title: "Thriller", filter: "/discover/movie?with_genres=53&sort_by=popularity.desc" },
];
