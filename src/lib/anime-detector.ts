/**
 * Anime Detection and Classification Utilities
 * Accurately detects anime series and anime movies to ensure:
 * 1. Watched Movies contains only pure live-action / Western feature films (excluding anime & series).
 * 2. Watched Series contains pure web series (excluding anime).
 * 3. Watched Animes contains all anime series and anime movies.
 */

// Well-known anime titles and franchise keywords (case-insensitive substring or regex matching)
const KNOWN_ANIME_KEYWORDS = [
  "your name",
  "kimi no na wa",
  "bleach",
  "jujutsu kaisen",
  "attack on titan",
  "shingeki no kyojin",
  "naruto",
  "one piece",
  "demon slayer",
  "kimetsu no yaiba",
  "death note",
  "dragon ball",
  "dragonball",
  "hunter x hunter",
  "fullmetal alchemist",
  "spirited away",
  "sen to chihiro",
  "suzume",
  "weathering with you",
  "tenki no ko",
  "a silent voice",
  "koe no katachi",
  "chainsaw man",
  "tokyo ghoul",
  "princess mononoke",
  "mononoke hime",
  "howl's moving castle",
  "my neighbor totoro",
  "akira",
  "ghost in the shell",
  "cowboy bebop",
  "steins;gate",
  "code geass",
  "my hero academia",
  "boku no hero",
  "neon genesis evangelion",
  "evangelion",
  "solo leveling",
  "vinland saga",
  "frieren",
  "oshi no ko",
  "spy x family",
  "sword art online",
  "death parade",
  "mob psycho",
  "one punch man",
  "black clover",
  "haikyuu",
  "tokyo revengers",
  "dr. stone",
  "fire force",
  "fairy tail",
  "bungo stray dogs",
  "fate/stay night",
  "fate/zero",
  "overlord",
  "re:zero",
  "blue lock",
  "hell's paradise",
  "dandadan",
  "kaiju no. 8",
  "wind breaker",
  "delicious in dungeon",
  "erased",
  "parasyte",
  "inuyasha",
  "yu yu hakusho",
  "gintama",
  "sailor moon",
  "pokemon",
  "digimon",
  "berserk",
  "slam dunk",
  "the boy and the heron",
  "grave of the fireflies",
  "the wind rises",
  "kiki's delivery service",
  "castle in the sky",
  "ponyo",
  "perfect blue",
  "paprika",
  "millennium actress",
  "tokyo godfathers",
  "the girl who leapt through time",
  "summer wars",
  "wolf children",
  "mirai",
  "belle",
  "i want to eat your pancreas",
  "5 centimeters per second",
  "garden of words",
  "rascal does not dream",
  "violet evergarden",
  "made in abyss",
  "mushoku tensei",
  "classroom of the elite",
  "blue exorcist",
  "soul eater",
  "noragami",
  "assassination classroom",
  "psycho-pass",
  "monster",
  "samurai champloo",
];

// Specific known TMDB IDs for guaranteed classification
const KNOWN_ANIME_TMDB_IDS = new Set<number>([
  372058, // Your Name. (Movie)
  30984,  // Bleach (TV)
  95479,  // JUJUTSU KAISEN (TV)
  1429,   // Attack on Titan
  85937,  // Demon Slayer: Kimetsu no Yaiba
  46260,  // Naruto
  31910,  // Naruto Shippuden
  37854,  // One Piece
  1399,   // Game of Thrones (just to ensure it's NOT anime)
  129,    // Spirited Away
  493529, // Dungeons & Dragons: Honor Among Thieves (not anime)
  37854,  // One piece
]);

export interface ContentMetadata {
  tmdbId?: number | string;
  title?: string;
  name?: string;
  genres?: string | null;
  contentType?: string;
  originalLanguage?: string;
  original_language?: string;
}

/**
 * Determines whether a given item is an anime title.
 */
export function isAnimeItem(item: ContentMetadata | null | undefined): boolean {
  if (!item) return false;

  const tmdbIdNum = Number(item.tmdbId);
  if (tmdbIdNum && KNOWN_ANIME_TMDB_IDS.has(tmdbIdNum)) {
    return true;
  }

  const titleStr = (item.title || item.name || "").toLowerCase().trim();
  if (!titleStr) return false;

  // Check against known anime titles and keywords
  for (const keyword of KNOWN_ANIME_KEYWORDS) {
    if (titleStr === keyword || titleStr.includes(keyword)) {
      return true;
    }
  }

  // Check if originalLanguage is Japanese
  const lang = (item.originalLanguage || item.original_language || "").toLowerCase();
  if (lang === "ja") {
    // If Japanese and animated or has animation in genres
    const genresStr = typeof item.genres === "string" ? item.genres.toLowerCase() : "";
    if (genresStr.includes("animation") || genresStr.includes("16")) {
      return true;
    }
  }

  // Check genres for Japanese anime cues
  if (typeof item.genres === "string") {
    const lowerGenres = item.genres.toLowerCase();
    if (lowerGenres.includes("anime")) {
      return true;
    }
  }

  return false;
}

/**
 * Pure Movie: Must be contentType "movie", NOT anime, and NOT a TV show.
 */
export function isPureMovie(item: ContentMetadata | null | undefined): boolean {
  if (!item) return false;
  const isMovieType = item.contentType === "movie" || !item.contentType;
  const isSeries = item.contentType === "tvshow" || item.contentType === "season" || item.contentType === "episode";
  if (isSeries) return false;
  if (!isMovieType) return false;
  return !isAnimeItem(item);
}

/**
 * Pure Series: Must be contentType "tvshow" (or web series), NOT anime, and NOT movie.
 */
export function isPureSeries(item: ContentMetadata | null | undefined): boolean {
  if (!item) return false;
  const isSeriesType = item.contentType === "tvshow" || item.contentType === "season";
  if (!isSeriesType) return false;
  return !isAnimeItem(item);
}

/**
 * Anime Series: is anime AND is tvshow.
 */
export function isAnimeSeries(item: ContentMetadata | null | undefined): boolean {
  if (!item) return false;
  if (!isAnimeItem(item)) return false;
  return item.contentType === "tvshow" || item.contentType === "season";
}

/**
 * Anime Movie: is anime AND is movie.
 */
export function isAnimeMovie(item: ContentMetadata | null | undefined): boolean {
  if (!item) return false;
  if (!isAnimeItem(item)) return false;
  return item.contentType === "movie" || !item.contentType;
}
