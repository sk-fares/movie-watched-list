import fs from "fs";
import path from "path";
import { MOVIE_FRANCHISES, STANDALONE_ESSENTIAL_MOVIES } from "./data-movies.mjs";
import { SERIES_UNIVERSES, STANDALONE_ESSENTIAL_SERIES } from "./data-series.mjs";
import { ANIME_FRANCHISES, MASTER_ANIME_CHECKLIST, WESTERN_ANIMATED_SERIES, WESTERN_ANIMATED_MOVIES } from "./data-anime.mjs";

console.log("Compiling curated master entertainment compendium...");

// Compile into unified TypeScript file src/lib/curated-watchlist-data.ts
const code = `// =====================================================================
// MASTER WATCHLIST & FRANCHISE COMPENDIUM (Generated from User's PDF)
// Complete Trakt Watchlist • Sequels, Prequels & Spin-Offs • Hollywood Movies, Web Series & Anime
// =====================================================================

export interface CuratedItem {
  id: number;
  title: string;
  name?: string;
  media_type: "movie" | "tv";
  contentType: "movie" | "tvshow";
  category: "movie" | "series" | "anime_series" | "anime_movies" | "animated_series" | "animated_movies";
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  poster_path: string | null;
  backdrop_path?: string | null;
  overview: string;
  genre_ids: number[];
  rank?: number;
  universeId?: string;
  universeName?: string;
  universeSeq?: number;
  universeRole?: "Core" | "Sequel" | "Prequel" | "Spin-Off" | "Movie" | "Anthology" | "Adaptation" | "Reboot";
  universeTotalItems?: number;
  relatedItems?: {
    tmdbId: number;
    title: string;
    year: string;
    sequence: number;
    role: string;
    media_type: "movie" | "tv";
    posterPath?: string;
  }[];
}

export interface CuratedUniverseItem {
  tmdbId: number;
  title: string;
  year: string;
  sequence: number;
  role: "Core" | "Sequel" | "Prequel" | "Spin-Off" | "Movie" | "Anthology" | "Adaptation" | "Reboot";
  media_type?: "movie" | "tv";
  contentType?: "movie" | "tvshow";
  posterPath?: string;
  note?: string;
}

export interface CuratedUniverse {
  id: string;
  name: string;
  category: "movie" | "series" | "anime" | "cross_media";
  section: string;
  overview: string;
  posterPath?: string;
  items: CuratedUniverseItem[];
}

export const MOVIE_FRANCHISES: CuratedUniverse[] = ${JSON.stringify(MOVIE_FRANCHISES, null, 2)};

export const STANDALONE_ESSENTIAL_MOVIES = ${JSON.stringify(STANDALONE_ESSENTIAL_MOVIES, null, 2)};

export const SERIES_UNIVERSES: CuratedUniverse[] = ${JSON.stringify(SERIES_UNIVERSES, null, 2)};

export const STANDALONE_ESSENTIAL_SERIES = ${JSON.stringify(STANDALONE_ESSENTIAL_SERIES, null, 2)};

export const ANIME_FRANCHISES: CuratedUniverse[] = ${JSON.stringify(ANIME_FRANCHISES, null, 2)};

export const MASTER_ANIME_CHECKLIST = ${JSON.stringify(MASTER_ANIME_CHECKLIST, null, 2)};

export const WESTERN_ANIMATED_SERIES = ${JSON.stringify(WESTERN_ANIMATED_SERIES, null, 2)};

export const WESTERN_ANIMATED_MOVIES = ${JSON.stringify(WESTERN_ANIMATED_MOVIES, null, 2)};

export const ALL_CURATED_UNIVERSES: CuratedUniverse[] = [
  ...MOVIE_FRANCHISES,
  ...SERIES_UNIVERSES,
  ...ANIME_FRANCHISES,
];

// Fast Lookup Maps
const UNIVERSE_BY_ID = new Map<string, CuratedUniverse>();
const UNIVERSE_BY_TMDB_ID = new Map<number, { universe: CuratedUniverse; item: CuratedUniverseItem }>();
const UNIVERSE_BY_TITLE = new Map<string, { universe: CuratedUniverse; item: CuratedUniverseItem }>();

ALL_CURATED_UNIVERSES.forEach((u) => {
  UNIVERSE_BY_ID.set(u.id, u);
  u.items.forEach((item) => {
    if (item.tmdbId) {
      UNIVERSE_BY_TMDB_ID.set(item.tmdbId, { universe: u, item });
    }
    const normTitle = (item.title || "").toLowerCase().trim();
    if (normTitle) {
      UNIVERSE_BY_TITLE.set(normTitle, { universe: u, item });
    }
  });
});

/**
 * Returns full franchise universe data for an item by TMDB ID or title.
 */
export function getUniverseForItem(tmdbId: number, title?: string): CuratedUniverse | null {
  if (tmdbId && UNIVERSE_BY_TMDB_ID.has(tmdbId)) {
    return UNIVERSE_BY_TMDB_ID.get(tmdbId)!.universe;
  }
  if (title) {
    const normTitle = title.toLowerCase().trim();
    if (UNIVERSE_BY_TITLE.has(normTitle)) {
      return UNIVERSE_BY_TITLE.get(normTitle)!.universe;
    }
    // Substring match
    let found: CuratedUniverse | null = null;
    Array.from(UNIVERSE_BY_TITLE.entries()).some(([key, val]) => {
      if (normTitle.includes(key) || key.includes(normTitle)) {
        found = val.universe;
        return true;
      }
      return false;
    });
    if (found) return found;
  }
  return null;
}

/**
 * Enriches any item (from TMDB search, discover, or watched items) with its connected universe info.
 */
export function enrichWithUniverseInfo(item: any): any {
  if (!item) return item;
  const tmdbId = Number(item.tmdbId || item.id);
  const title = (item.title || item.name || "").toLowerCase().trim();

  let match = UNIVERSE_BY_TMDB_ID.get(tmdbId);
  if (!match && title) {
    match = UNIVERSE_BY_TITLE.get(title);
    if (!match) {
      Array.from(UNIVERSE_BY_TITLE.entries()).some(([key, val]) => {
        if (title.length > 4 && (title.includes(key) || key.includes(title))) {
          match = val;
          return true;
        }
        return false;
      });
    }
  }

  if (match) {
    return {
      ...item,
      universeId: match.universe.id,
      universeName: match.universe.name,
      universeSeq: match.item.sequence,
      universeRole: match.item.role,
      universeTotalItems: match.universe.items.length,
      relatedItems: match.universe.items.map((i) => ({
        tmdbId: i.tmdbId,
        title: i.title,
        year: i.year,
        sequence: i.sequence,
        role: i.role,
        media_type: i.media_type || (match!.universe.category === "series" ? "tv" : "movie"),
        posterPath: i.posterPath,
      })),
    };
  }

  return item;
}

// ── Master Curated Movie List Builder ──
function buildMasterMovies(): CuratedItem[] {
  const list: CuratedItem[] = [];
  const seen = new Set<number>();

  // 1. Franchise parts in chronological order
  for (const franchise of MOVIE_FRANCHISES) {
    for (const part of franchise.items) {
      if (part.tmdbId && !seen.has(part.tmdbId)) {
        seen.add(part.tmdbId);
        list.push({
          id: part.tmdbId,
          title: part.title,
          media_type: part.media_type || "movie",
          contentType: part.contentType || "movie",
          category: "movie",
          release_date: part.year ? \`\${part.year}-01-01\` : undefined,
          vote_average: 8.0,
          vote_count: 5000,
          popularity: 100 - list.length * 0.1,
          poster_path: part.posterPath || null,
          overview: \`Part of the \${franchise.name}. \${franchise.overview}\`,
          genre_ids: [28, 12],
          universeId: franchise.id,
          universeName: franchise.name,
          universeSeq: part.sequence,
          universeRole: part.role,
          universeTotalItems: franchise.items.length,
          relatedItems: franchise.items.map((i) => ({
            tmdbId: i.tmdbId,
            title: i.title,
            year: i.year,
            sequence: i.sequence,
            role: i.role,
            media_type: i.media_type || "movie",
            posterPath: i.posterPath,
          })),
        });
      }
    }
  }

  // 2. Standalone Top 220 movies from PDF Part 1B
  for (const movie of STANDALONE_ESSENTIAL_MOVIES) {
    if (movie.tmdbId && !seen.has(movie.tmdbId)) {
      seen.add(movie.tmdbId);
      const universeMatch = getUniverseForItem(movie.tmdbId, movie.title);
      list.push({
        id: movie.tmdbId,
        title: movie.title,
        media_type: "movie",
        contentType: "movie",
        category: "movie",
        release_date: movie.year ? \`\${movie.year}-01-01\` : undefined,
        vote_average: movie.voteAverage || 8.0,
        vote_count: 8000,
        popularity: 120 - movie.rank * 0.2,
        poster_path: movie.posterPath || null,
        overview: \`Rank #\${movie.rank} in Master Watchlist essential Hollywood cinema compendium.\`,
        genre_ids: [18, 53],
        rank: movie.rank,
        universeId: universeMatch?.id,
        universeName: universeMatch?.name,
        universeTotalItems: universeMatch?.items.length,
        relatedItems: universeMatch?.items.map((i) => ({
          tmdbId: i.tmdbId,
          title: i.title,
          year: i.year,
          sequence: i.sequence,
          role: i.role,
          media_type: i.media_type || "movie",
          posterPath: i.posterPath,
        })),
      });
    }
  }

  return list;
}

// ── Master Curated Series List Builder ──
function buildMasterSeries(): CuratedItem[] {
  const list: CuratedItem[] = [];
  const seen = new Set<number>();

  // 1. Series Universes & spin-offs
  for (const universe of SERIES_UNIVERSES) {
    for (const part of universe.items) {
      if (part.tmdbId && !seen.has(part.tmdbId)) {
        seen.add(part.tmdbId);
        list.push({
          id: part.tmdbId,
          title: part.title,
          name: part.title,
          media_type: part.media_type || "tv",
          contentType: part.contentType || "tvshow",
          category: "series",
          first_air_date: part.year ? \`\${part.year}-01-01\` : undefined,
          vote_average: 8.5,
          vote_count: 5000,
          popularity: 100 - list.length * 0.1,
          poster_path: part.posterPath || null,
          overview: \`Part of the \${universe.name}. \${universe.overview}\`,
          genre_ids: [18, 80],
          universeId: universe.id,
          universeName: universe.name,
          universeSeq: part.sequence,
          universeRole: part.role,
          universeTotalItems: universe.items.length,
          relatedItems: universe.items.map((i) => ({
            tmdbId: i.tmdbId,
            title: i.title,
            year: i.year,
            sequence: i.sequence,
            role: i.role,
            media_type: i.media_type || "tv",
            posterPath: i.posterPath,
          })),
        });
      }
    }
  }

  // 2. Standalone Top 220 Series from PDF Part 2B
  for (const show of STANDALONE_ESSENTIAL_SERIES) {
    if (show.tmdbId && !seen.has(show.tmdbId)) {
      seen.add(show.tmdbId);
      const universeMatch = getUniverseForItem(show.tmdbId, show.title);
      list.push({
        id: show.tmdbId,
        title: show.title,
        name: show.title,
        media_type: "tv",
        contentType: "tvshow",
        category: "series",
        first_air_date: show.year ? \`\${show.year}-01-01\` : undefined,
        vote_average: show.voteAverage || 8.4,
        vote_count: 6000,
        popularity: 120 - show.rank * 0.2,
        poster_path: show.posterPath || null,
        overview: \`Rank #\${show.rank} in Master Watchlist essential global streaming hits compendium.\`,
        genre_ids: [18, 10759],
        rank: show.rank,
        universeId: universeMatch?.id,
        universeName: universeMatch?.name,
        universeTotalItems: universeMatch?.items.length,
        relatedItems: universeMatch?.items.map((i) => ({
          tmdbId: i.tmdbId,
          title: i.title,
          year: i.year,
          sequence: i.sequence,
          role: i.role,
          media_type: i.media_type || "tv",
          posterPath: i.posterPath,
        })),
      });
    }
  }

  return list;
}

// ── Master Curated Anime List Builder ──
function buildMasterAnime(): CuratedItem[] {
  const list: CuratedItem[] = [];
  const seen = new Set<number>();

  // 1. Anime Franchises & Sagas
  for (const franchise of ANIME_FRANCHISES) {
    for (const part of franchise.items) {
      if (part.tmdbId && !seen.has(part.tmdbId)) {
        seen.add(part.tmdbId);
        list.push({
          id: part.tmdbId,
          title: part.title,
          name: part.title,
          media_type: part.media_type || "tv",
          contentType: part.contentType || (part.media_type === "movie" ? "movie" : "tvshow"),
          category: part.media_type === "movie" ? "anime_movies" : "anime_series",
          release_date: part.media_type === "movie" && part.year ? \`\${part.year}-01-01\` : undefined,
          first_air_date: part.media_type !== "movie" && part.year ? \`\${part.year}-01-01\` : undefined,
          vote_average: 8.6,
          vote_count: 4000,
          popularity: 100 - list.length * 0.1,
          poster_path: part.posterPath || null,
          overview: \`Part of \${franchise.name}. \${franchise.overview}\`,
          genre_ids: [16, 10759],
          universeId: franchise.id,
          universeName: franchise.name,
          universeSeq: part.sequence,
          universeRole: part.role,
          universeTotalItems: franchise.items.length,
          relatedItems: franchise.items.map((i) => ({
            tmdbId: i.tmdbId,
            title: i.title,
            year: i.year,
            sequence: i.sequence,
            role: i.role,
            media_type: i.media_type || "tv",
            posterPath: i.posterPath,
          })),
        });
      }
    }
  }

  // 2. Master Anime Checklist 210 Titles from PDF Part 3B
  for (const anime of MASTER_ANIME_CHECKLIST) {
    if (anime.tmdbId && !seen.has(anime.tmdbId)) {
      seen.add(anime.tmdbId);
      const universeMatch = getUniverseForItem(anime.tmdbId, anime.title);
      const isMovie = anime.type === "movie";
      list.push({
        id: anime.tmdbId,
        title: anime.title,
        name: anime.title,
        media_type: isMovie ? "movie" : "tv",
        contentType: isMovie ? "movie" : "tvshow",
        category: isMovie ? "anime_movies" : "anime_series",
        release_date: isMovie && anime.year ? \`\${anime.year}-01-01\` : undefined,
        first_air_date: !isMovie && anime.year ? \`\${anime.year}-01-01\` : undefined,
        vote_average: anime.voteAverage || 8.5,
        vote_count: 5000,
        popularity: 110 - anime.rank * 0.2,
        poster_path: anime.posterPath || null,
        overview: \`Rank #\${anime.rank} in Master Watchlist anime compendium.\`,
        genre_ids: [16, 14],
        rank: anime.rank,
        universeId: universeMatch?.id,
        universeName: universeMatch?.name,
        universeTotalItems: universeMatch?.items.length,
        relatedItems: universeMatch?.items.map((i) => ({
          tmdbId: i.tmdbId,
          title: i.title,
          year: i.year,
          sequence: i.sequence,
          role: i.role,
          media_type: i.media_type || (isMovie ? "movie" : "tv"),
          posterPath: i.posterPath,
        })),
      });
    }
  }

  // 3. Western Animated Series & Movies
  for (const show of WESTERN_ANIMATED_SERIES) {
    if (show.tmdbId && !seen.has(show.tmdbId)) {
      seen.add(show.tmdbId);
      list.push({
        id: show.tmdbId,
        title: show.title,
        name: show.title,
        media_type: "tv",
        contentType: "tvshow",
        category: "animated_series",
        first_air_date: show.year ? \`\${show.year}-01-01\` : undefined,
        vote_average: show.voteAverage || 8.5,
        vote_count: 4000,
        popularity: 90,
        poster_path: show.posterPath || null,
        overview: "Acclaimed Western & Global Animated Masterpiece from Master Watchlist.",
        genre_ids: [16, 10759],
      });
    }
  }

  for (const movie of WESTERN_ANIMATED_MOVIES) {
    if (movie.tmdbId && !seen.has(movie.tmdbId)) {
      seen.add(movie.tmdbId);
      list.push({
        id: movie.tmdbId,
        title: movie.title,
        media_type: "movie",
        contentType: "movie",
        category: "animated_movies",
        release_date: movie.year ? \`\${movie.year}-01-01\` : undefined,
        vote_average: movie.voteAverage || 8.0,
        vote_count: 6000,
        popularity: 95,
        poster_path: movie.posterPath || null,
        overview: "Universal Box-Office & Oscar Acclaimed Animated Feature Film from Master Watchlist.",
        genre_ids: [16, 10751],
      });
    }
  }

  return list;
}

export const ALL_CURATED_MOVIES = buildMasterMovies();
export const ALL_CURATED_SERIES = buildMasterSeries();
export const ALL_CURATED_ANIME = buildMasterAnime();

/**
 * Paginates and filters curated items for beginning pages.
 */
export function getCuratedPage(params: {
  category: "movie" | "tv" | "series" | "anime" | "anime_series" | "anime_movies" | "animated_series" | "animated_movies" | "trending_animation";
  tab?: string;
  page: number;
  pageSize?: number;
  filterGenre?: number;
  filterYear?: string;
  sortBy?: string;
  searchQuery?: string;
}) {
  const { category, tab, page, pageSize = 20, filterGenre, filterYear, sortBy, searchQuery } = params;

  let dataset: CuratedItem[] = [];

  if (category === "movie") {
    dataset = [...ALL_CURATED_MOVIES];
  } else if (category === "tv" || category === "series") {
    dataset = [...ALL_CURATED_SERIES];
  } else if (category === "anime_movies") {
    dataset = ALL_CURATED_ANIME.filter((a) => a.category === "anime_movies");
  } else if (category === "anime_series") {
    dataset = ALL_CURATED_ANIME.filter((a) => a.category === "anime_series");
  } else if (category === "animated_series") {
    dataset = ALL_CURATED_ANIME.filter((a) => a.category === "animated_series");
  } else if (category === "animated_movies") {
    dataset = ALL_CURATED_ANIME.filter((a) => a.category === "animated_movies");
  } else {
    // General anime / animation
    dataset = [...ALL_CURATED_ANIME];
  }

  // 1. Search Query Filter
  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    dataset = dataset.filter((i) =>
      i.title.toLowerCase().includes(q) ||
      (i.name && i.name.toLowerCase().includes(q)) ||
      (i.universeName && i.universeName.toLowerCase().includes(q))
    );
  }

  // 2. Year Filter
  if (filterYear) {
    dataset = dataset.filter((i) => {
      const year = (i.release_date || i.first_air_date || "").slice(0, 4);
      return year === filterYear;
    });
  }

  // 3. Genre Filter
  if (filterGenre && filterGenre > 0) {
    dataset = dataset.filter((i) => i.genre_ids.includes(filterGenre));
  }

  // 4. Sort By
  if (sortBy === "vote_average.desc") {
    dataset.sort((a, b) => b.vote_average - a.vote_average);
  } else if (sortBy === "primary_release_date.desc" || sortBy === "first_air_date.desc") {
    dataset.sort((a, b) =>
      (b.release_date || b.first_air_date || "").localeCompare(a.release_date || a.first_air_date || "")
    );
  } else if (sortBy === "primary_release_date.asc" || sortBy === "first_air_date.asc") {
    dataset.sort((a, b) =>
      (a.release_date || a.first_air_date || "").localeCompare(b.release_date || b.first_air_date || "")
    );
  } else if (tab === "top_rated") {
    dataset.sort((a, b) => b.vote_average - a.vote_average);
  } else {
    // Default popularity / curated sequence
    dataset.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
  }

  const totalResults = dataset.length;
  const totalPages = Math.ceil(totalResults / pageSize);
  const startIndex = (page - 1) * pageSize;
  const pageResults = dataset.slice(startIndex, startIndex + pageSize);

  return {
    page,
    total_pages: totalPages,
    total_results: totalResults,
    results: pageResults,
    hasMoreCurated: startIndex + pageSize < totalResults,
  };
}
`;

fs.writeFileSync(path.resolve("src/lib/curated-watchlist-data.ts"), code, "utf-8");
console.log("Successfully generated src/lib/curated-watchlist-data.ts!");
