const TMDB_BASE_URL = "https://api.themoviedb.org/3";

async function tmdbFetch(endpoint: string, params: Record<string, string> = {}) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) throw new Error("TMDB_API_KEY is not configured");

  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("language", "en-US");
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) {
    throw new Error(`TMDB API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// ─── Movies ─────────────────────────────────────────────────

export async function searchMovies(query: string, page: number = 1) {
  return tmdbFetch("/search/movie", { query, page: String(page) });
}

export async function getMovieDetails(tmdbId: number) {
  return tmdbFetch(`/movie/${tmdbId}`, { append_to_response: "credits,videos,similar,recommendations" });
}

export async function getTrendingMovies(timeWindow: "day" | "week" = "week") {
  return tmdbFetch(`/trending/movie/${timeWindow}`);
}

export async function getPopularMovies(page: number = 1) {
  return tmdbFetch("/movie/popular", { page: String(page) });
}

export async function getTopRatedMovies(page: number = 1) {
  return tmdbFetch("/movie/top_rated", { page: String(page) });
}

export async function getUpcomingMovies(page: number = 1) {
  return tmdbFetch("/movie/upcoming", { page: String(page) });
}

export async function getNowPlayingMovies(page: number = 1) {
  return tmdbFetch("/movie/now_playing", { page: String(page) });
}

export async function getMoviesByGenre(genreId: number, page: number = 1) {
  return tmdbFetch("/discover/movie", { with_genres: String(genreId), page: String(page), sort_by: "popularity.desc" });
}

// ─── TV Shows ───────────────────────────────────────────────

export async function searchTVShows(query: string, page: number = 1) {
  return tmdbFetch("/search/tv", { query, page: String(page) });
}

export async function getTVShowDetails(tmdbId: number) {
  return tmdbFetch(`/tv/${tmdbId}`, { append_to_response: "credits,videos,similar,recommendations" });
}

export async function getTVSeasonDetails(tvId: number, seasonNumber: number) {
  return tmdbFetch(`/tv/${tvId}/season/${seasonNumber}`);
}

export async function getTrendingTVShows(timeWindow: "day" | "week" = "week") {
  return tmdbFetch(`/trending/tv/${timeWindow}`);
}

export async function getPopularTVShows(page: number = 1) {
  return tmdbFetch("/tv/popular", { page: String(page) });
}

export async function getTopRatedTVShows(page: number = 1) {
  return tmdbFetch("/tv/top_rated", { page: String(page) });
}

// ─── Multi Search ───────────────────────────────────────────

export async function multiSearch(query: string, page: number = 1) {
  return tmdbFetch("/search/multi", { query, page: String(page) });
}

// ─── Collections / Franchises ───────────────────────────────

export async function getCollection(collectionId: number) {
  return tmdbFetch(`/collection/${collectionId}`);
}

// ─── Genres ─────────────────────────────────────────────────

export async function getMovieGenres() {
  return tmdbFetch("/genre/movie/list");
}

export async function getTVGenres() {
  return tmdbFetch("/genre/tv/list");
}

// ─── Discovery / Random ─────────────────────────────────────

export async function discoverMovies(params: Record<string, string> = {}) {
  return tmdbFetch("/discover/movie", { sort_by: "popularity.desc", ...params });
}

export async function discoverTVShows(params: Record<string, string> = {}) {
  return tmdbFetch("/discover/tv", { sort_by: "popularity.desc", ...params });
}

// ─── Helper Types ───────────────────────────────────────────

export interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  runtime: number;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
  tagline?: string;
  status?: string;
  budget?: number;
  revenue?: number;
  imdb_id?: string;
  belongs_to_collection?: {
    id: number;
    name: string;
    poster_path: string;
    backdrop_path: string;
  } | null;
  credits?: {
    cast: TMDBCastMember[];
    crew: TMDBCrewMember[];
  };
  videos?: {
    results: TMDBVideo[];
  };
}

export interface TMDBTVShow {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  last_air_date: string;
  number_of_seasons: number;
  number_of_episodes: number;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
  tagline?: string;
  status?: string;
  episode_run_time?: number[];
  seasons?: TMDBSeason[];
  credits?: {
    cast: TMDBCastMember[];
    crew: TMDBCrewMember[];
  };
  videos?: {
    results: TMDBVideo[];
  };
}

export interface TMDBSeason {
  id: number;
  season_number: number;
  name: string;
  overview: string;
  poster_path: string | null;
  air_date: string;
  episode_count: number;
  episodes?: TMDBEpisode[];
}

export interface TMDBEpisode {
  id: number;
  episode_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  air_date: string;
  runtime: number;
  vote_average: number;
}

export interface TMDBCastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface TMDBCrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
}

export interface TMDBVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
}

export interface TMDBSearchResult {
  page: number;
  results: (TMDBMovie | TMDBTVShow)[];
  total_pages: number;
  total_results: number;
}
