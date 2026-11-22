// Deadtoons provider catalog.
// Source site: https://deadtoons.sbs
// Homepage list is paginated with /?page=N, genres live under /genre/<slug>,
// and there are /popular and /completed listings with the same list layout.
export const catalog = [
  { title: "Latest", filter: "/" },
  { title: "Popular", filter: "/popular" },
  { title: "Completed", filter: "/completed" },
];

export const genres = [
  { title: "Action", filter: "/genre/action" },
  { title: "Adventure", filter: "/genre/adventure" },
  { title: "Animation", filter: "/genre/animation" },
  { title: "Comedy", filter: "/genre/comedy" },
  { title: "Drama", filter: "/genre/drama" },
  { title: "Ecchi", filter: "/genre/ecchi" },
  { title: "Family", filter: "/genre/family" },
  { title: "Fantasy", filter: "/genre/fantasy" },
  { title: "Historical", filter: "/genre/historical" },
  { title: "Isekai", filter: "/genre/isekai" },
  { title: "Kids", filter: "/genre/kids" },
  { title: "Music", filter: "/genre/music" },
  { title: "Mystery", filter: "/genre/mystery" },
  { title: "Romance", filter: "/genre/romance" },
  { title: "Sci-Fi", filter: "/genre/sci-fi" },
  { title: "Science Fiction", filter: "/genre/science-fiction" },
  { title: "Slice of Life", filter: "/genre/slice-of-life" },
  { title: "Suspense", filter: "/genre/suspense" },
];
