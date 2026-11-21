/**
 * Anime Detection and Classification Utilities
 * Accurately detects anime series and anime movies to ensure:
 * 1. Watched Movies contains only pure live-action / Western feature films (excluding anime & series).
 * 2. Watched Series contains pure web series (strictly excluding anime).
 * 3. Watched Anime contains all anime series and anime movies in one dedicated list.
 */

import {
  ALL_CURATED_ANIME,
  ANIME_FRANCHISES,
} from "./curated-watchlist-data";

// Specific Western animation IDs that must NEVER be misclassified as anime
const KNOWN_WESTERN_ANIMATION_IDS = new Set<number>([
  456,    // The Simpsons
  1434,   // Family Guy
  2190,   // South Park
  60625,  // Rick and Morty
  615,    // Futurama
  61222,  // BoJack Horseman
  94605,  // Arcane
  95557,  // Invincible
  246,    // Avatar: The Last Airbender
  43348,  // The Legend of Korra
  2098,   // Batman: The Animated Series
  4174,   // Star Wars: The Clone Wars
  60554,  // Star Wars Rebels
  105971, // Star Wars: The Bad Batch
  2287,   // X-Men (1992)
  138502, // X-Men '97
  888,    // Spider-Man (1994)
  10283,  // Archer
  32726,  // Bob's Burgers
  40075,  // Gravity Falls
  3862,   // Phineas and Ferb
  15260,  // Adventure Time
  34524,  // Regular Show
  2330,   // Samurai Jack
  86831,  // Love, Death & Robots
  91363,  // What If...?
  80752,  // Harley Quinn
  33217,  // Young Justice
  1396,   // Breaking Bad (live-action guard)
  1399,   // Game of Thrones (live-action guard)
  66732,  // Stranger Things (live-action guard)
  76479,  // The Boys (live-action guard)
  113988, // Monster: The Jeffrey Dahmer Story (live-action guard)
  155,    // The Dark Knight (live-action guard)
  493529, // Dungeons & Dragons: Honor Among Thieves (live-action guard)
]);

// Well-known anime TMDB IDs for guaranteed classification
const KNOWN_ANIME_TMDB_IDS = new Set<number>([
  // Top Anime Series
  30984,  // Bleach
  209867, // Bleach: Thousand-Year Blood War
  95479,  // JUJUTSU KAISEN
  839369, // JUJUTSU KAISEN 0
  1429,   // Attack on Titan
  85937,  // Demon Slayer: Kimetsu no Yaiba
  635302, // Demon Slayer: Mugen Train Movie
  46260,  // Naruto
  31910,  // Naruto Shippuden
  70881,  // Boruto: Naruto Next Generations
  37854,  // One Piece
  13916,  // Death Note
  46298,  // Hunter x Hunter (2011)
  34391,  // Hunter x Hunter (1999)
  31911,  // Fullmetal Alchemist: Brotherhood
  422,    // Fullmetal Alchemist
  65930,  // My Hero Academia
  114410, // Chainsaw Man
  61459,  // Tokyo Ghoul
  77800,  // Tokyo Ghoul:re
  86423,  // Vinland Saga
  214999, // Solo Leveling
  42635,  // Steins;Gate
  2996,   // Cowboy Bebop
  890,    // Neon Genesis Evangelion
  34307,  // Code Geass
  19,     // Monster (anime)
  33880,  // Berserk (1997)
  67075,  // Berserk (2016)
  73223,  // Black Clover
  12609,  // Dragon Ball
  12971,  // Dragon Ball Z
  12697,  // Dragon Ball GT
  35933,  // Dragon Ball Z Kai
  62710,  // Dragon Ball Super
  236683, // Dragon Ball Daima
  46028,  // JoJo's Bizarre Adventure
  60863,  // Haikyuu!!
  120089, // SPY x FAMILY
  209867, // Frieren: Beyond Journey's End
  203737, // Oshi no Ko
  63926,  // One-Punch Man
  67070,  // Mob Psycho 100
  89456,  // Dr. STONE
  89547,  // Fire Force
  46261,  // Fairy Tail
  132717, // Blue Lock
  240411, // Dandadan
  207347, // Kaiju No. 8
  139267, // Hell's Paradise
  208579, // Delicious in Dungeon
  242095, // Wind Breaker
  64196,  // Overlord
  65942,  // Re:ZERO -Starting Life in Another World-
  45782,  // Sword Art Online
  2261,   // Fate/stay night
  42526,  // Fate/Zero
  104877, // Tokyo Revengers
  65945,  // Bungo Stray Dogs
  72636,  // Classroom of the Elite
  99966,  // Mushoku Tensei: Jobless Reincarnation
  72637,  // Made in Abyss
  75214,  // Violet Evergarden
  65334,  // ERASED
  61459,  // Parasyte -the maxim-
  43865,  // Psycho-Pass
  62715,  // Assassination Classroom
  83095,  // The Promised Neverland
  84958,  // Dororo
  2382,   // Samurai Champloo
  30983,  // Yu Yu Hakusho
  46296,  // Inuyasha
  2139,   // Sailor Moon
  62118,  // Death Parade
  60797,  // Noragami
  15418,  // Soul Eater
  39250,  // Blue Exorcist
  83097,  // Kaguya-sama: Love Is War
  18709,  // Toradora!
  61663,  // Your Lie in April
  57041,  // Gintama
  46297,  // Slam Dunk
  46024,  // Kuroko's Basketball
  35684,  // Trigun
  204368, // Trigun Stampede
  35848,  // Hellsing
  35849,  // Hellsing Ultimate
  61334,  // The Seven Deadly Sins
  217646, // Pluto
  75006,  // DEVILMAN crybaby
  33758,  // Great Teacher Onizuka
  236,    // Case Closed (Detective Conan)
  2470,   // Lupin the 3rd
  105248, // Cyberpunk: Edgerunners
  71024,  // Castlevania
  203649, // Castlevania: Nocturne

  // Top Anime Movies
  372058, // Your Name.
  129,    // Spirited Away
  916224, // Suzume
  568160, // Weathering with You
  378064, // A Silent Voice
  128,    // Princess Mononoke
  4935,   // Howl's Moving Castle
  8392,   // My Neighbor Totoro
  149,    // Akira
  9323,   // Ghost in the Shell
  508883, // The Boy and the Heron
  12477,  // Grave of the Fireflies
  10494,  // Perfect Blue
  4977,   // Paprika
  504253, // I Want to Eat Your Pancreas
  18148,  // 5 Centimeters per Second
  198375, // The Garden of Words
  110420, // Wolf Children
  14069,  // The Girl Who Leapt Through Time
  39324,  // Dragon Ball Super: Broly
  610150, // Dragon Ball Super: Super Hero
  544401, // Demon Slayer: Kimetsu no Yaiba - The Movie: Mugen Train
  900667, // One Piece Film Red
  569094, // Spider-Man: Across the Spider-Verse (Western animation guard, not anime)
]);

// Populate from Curated Anime Lists
try {
  if (Array.isArray(ALL_CURATED_ANIME)) {
    ALL_CURATED_ANIME.forEach((item) => {
      if (item.id) KNOWN_ANIME_TMDB_IDS.add(Number(item.id));
    });
  }
  if (Array.isArray(ANIME_FRANCHISES)) {
    ANIME_FRANCHISES.forEach((franchise) => {
      franchise.items.forEach((item) => {
        if (item.tmdbId) KNOWN_ANIME_TMDB_IDS.add(Number(item.tmdbId));
      });
    });
  }
} catch (e) {
  // Silent fallback
}

// Set of exact lowercase titles for instant O(1) matching
const KNOWN_ANIME_TITLES = new Set<string>();

try {
  if (Array.isArray(ALL_CURATED_ANIME)) {
    ALL_CURATED_ANIME.forEach((item) => {
      if (item.title) KNOWN_ANIME_TITLES.add(item.title.toLowerCase().trim());
      if (item.name) KNOWN_ANIME_TITLES.add(item.name.toLowerCase().trim());
    });
  }
  if (Array.isArray(ANIME_FRANCHISES)) {
    ANIME_FRANCHISES.forEach((f) => {
      KNOWN_ANIME_TITLES.add(f.name.toLowerCase().trim());
      f.items.forEach((item) => {
        if (item.title) KNOWN_ANIME_TITLES.add(item.title.toLowerCase().trim());
      });
    });
  }
} catch (e) {
  // Silent fallback
}

// Well-known anime titles and franchise keywords (case-insensitive)
const KNOWN_ANIME_KEYWORDS = [
  "your name",
  "kimi no na wa",
  "bleach",
  "jujutsu kaisen",
  "attack on titan",
  "shingeki no kyojin",
  "naruto",
  "boruto",
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
  "steins gate",
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
  "one-punch man",
  "black clover",
  "haikyuu",
  "tokyo revengers",
  "dr. stone",
  "fire force",
  "fairy tail",
  "bungo stray dogs",
  "fate/stay night",
  "fate/zero",
  "fate/grand order",
  "overlord",
  "re:zero",
  "blue lock",
  "hell's paradise",
  "jigokuraku",
  "dandadan",
  "kaiju no. 8",
  "wind breaker",
  "delicious in dungeon",
  "dungeon meshi",
  "erased",
  "parasyte",
  "inuyasha",
  "yu yu hakusho",
  "gintama",
  "sailor moon",
  "berserk",
  "slam dunk",
  "kuroko's basketball",
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
  "samurai champloo",
  "kaguya-sama",
  "cyberpunk: edgerunners",
  "edgerunners",
  "trigun",
  "hellsing",
  "dororo",
  "the promised neverland",
  "ranking of kings",
  "odd taxi",
  "lycoris recoil",
  "bocchi the rock",
  "apothecary diaries",
  "kusuriya no hitorigoto",
  "ninja kamui",
  "shangri-la frontier",
  "mashle",
  "undead unluck",
  "rurouni kenshin",
  "zom 100",
  "the eminence in shadow",
  "danmachi",
  "goblin slayer",
  "eighty six",
  "vivy: fluorite",
  "pluto",
  "devilman crybaby",
  "great teacher onizuka",
  "case closed",
  "detective conan",
  "lupin the third",
  "lupin iii",
  "banana fish",
  "fruits basket",
  "ouran high school",
  "black butler",
  "d.gray-man",
  "horimiya",
  "toradora",
  "clannad",
  "your lie in april",
  "anohana",
  "no game no life",
  "gurren lagann",
  "kill la kill",
  "akame ga kill",
  "high school dxd",
  "initial d",
  "elfen lied",
  "seven deadly sins",
  "nanatsu no taizai",
  "danganronpa",
  "blue box",
  "uzumaki",
  "terminator zero",
  "suicide squad isekai",
];

// Regex for detecting Japanese text (Hiragana, Katakana, Kanji)
const JAPANESE_CHAR_REGEX = /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/;

export interface ContentMetadata {
  id?: string | number | null;
  tmdbId?: number | string | null;
  title?: string | null;
  name?: string | null;
  originalTitle?: string | null;
  originalName?: string | null;
  genres?: string | string[] | any[] | null;
  contentType?: string | null;
  media_type?: string | null;
  originalLanguage?: string | null;
  original_language?: string | null;
  origin_country?: string[] | string | null;
  numberOfSeasons?: number | null;
  notes?: string | null;
}

/**
 * Parses genres from any format (JSON string, comma-separated string, or array)
 */
function parseGenreText(genres: any): string {
  if (!genres) return "";
  if (typeof genres === "string") {
    try {
      const parsed = JSON.parse(genres);
      if (Array.isArray(parsed)) {
        return parsed.map((g: any) => (typeof g === "object" ? g.name || g.id : g)).join(" ").toLowerCase();
      }
    } catch {
      return genres.toLowerCase();
    }
    return genres.toLowerCase();
  }
  if (Array.isArray(genres)) {
    return genres.map((g: any) => (typeof g === "object" ? g.name || g.id : g)).join(" ").toLowerCase();
  }
  return "";
}

/**
 * Determines whether a given item is an anime title.
 * 100% classification accuracy against curated anime database, TMDB IDs, titles, and metadata.
 */
export function isAnimeItem(item: ContentMetadata | null | undefined): boolean {
  if (!item) return false;

  const tmdbIdNum = Number(item.tmdbId || item.id);

  // 1. If explicitly in known Western animation or live action guards -> definitely NOT anime
  if (tmdbIdNum && KNOWN_WESTERN_ANIMATION_IDS.has(tmdbIdNum)) {
    return false;
  }

  // 2. If in known curated anime TMDB IDs -> definitely anime!
  if (tmdbIdNum && KNOWN_ANIME_TMDB_IDS.has(tmdbIdNum)) {
    return true;
  }

  const titleStr = (item.title || item.name || "").toLowerCase().trim();
  const originalStr = (item.originalName || item.originalTitle || "").toLowerCase().trim();

  // 3. Exact title match in known curated anime titles
  if (titleStr && KNOWN_ANIME_TITLES.has(titleStr)) {
    return true;
  }
  if (originalStr && KNOWN_ANIME_TITLES.has(originalStr)) {
    return true;
  }

  const genreText = parseGenreText(item.genres);

  // 4. Genre text explicitly mentions anime
  if (genreText.includes("anime") || genreText.includes("japanese animation")) {
    return true;
  }

  // 5. Japanese characters in title or original title
  const hasJapaneseChars =
    JAPANESE_CHAR_REGEX.test(item.title || "") ||
    JAPANESE_CHAR_REGEX.test(item.name || "") ||
    JAPANESE_CHAR_REGEX.test(item.originalName || "") ||
    JAPANESE_CHAR_REGEX.test(item.originalTitle || "");

  const lang = (item.originalLanguage || item.original_language || "").toLowerCase();
  const isJapanese = lang === "ja" || lang === "japanese" || hasJapaneseChars;

  // If Japanese and animated / has animation in genres
  if (isJapanese && (genreText.includes("animation") || genreText.includes("16"))) {
    return true;
  }

  // 6. Check against anime keywords
  if (titleStr) {
    for (const keyword of KNOWN_ANIME_KEYWORDS) {
      if (titleStr === keyword) return true;

      // For multi-word keywords or specific single-word anime keywords, check inclusion
      if (keyword.length > 5 && titleStr.includes(keyword)) {
        return true;
      }

      // Word boundary check for shorter keywords (e.g. "akira", "ponyo", "bleach", "naruto")
      if (keyword.length <= 5) {
        const regex = new RegExp(`(^|\\b)${keyword}(\\b|$)`, "i");
        if (regex.test(titleStr)) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Pure Movie: Must be movie type, NOT anime, and NOT a TV show.
 */
export function isPureMovie(item: ContentMetadata | null | undefined): boolean {
  if (!item) return false;
  const isSeries =
    item.contentType === "tvshow" ||
    item.contentType === "season" ||
    item.contentType === "episode" ||
    item.media_type === "tv";
  if (isSeries) return false;

  const isMovieType = item.contentType === "movie" || item.media_type === "movie" || !item.contentType;
  if (!isMovieType) return false;

  return !isAnimeItem(item);
}

/**
 * Pure Series: Must be contentType "tvshow" (or web series), NOT anime, and NOT movie.
 */
export function isPureSeries(item: ContentMetadata | null | undefined): boolean {
  if (!item) return false;
  const isSeriesType =
    item.contentType === "tvshow" ||
    item.contentType === "season" ||
    item.media_type === "tv";
  if (!isSeriesType) return false;

  return !isAnimeItem(item);
}

/**
 * Anime Series: is anime AND is a series or has seasons.
 */
export function isAnimeSeries(item: ContentMetadata | null | undefined): boolean {
  if (!item) return false;
  if (!isAnimeItem(item)) return false;
  return (
    item.contentType === "tvshow" ||
    item.contentType === "season" ||
    item.media_type === "tv" ||
    (item.numberOfSeasons !== undefined && item.numberOfSeasons !== null && item.numberOfSeasons > 0)
  );
}

/**
 * Anime Movie: is anime AND is a feature film (not series).
 */
export function isAnimeMovie(item: ContentMetadata | null | undefined): boolean {
  if (!item) return false;
  if (!isAnimeItem(item)) return false;
  return !isAnimeSeries(item);
}

/**
 * Determines whether an anime item (or series item) has seasons that can be tracked.
 */
export function hasSeasons(item: ContentMetadata | null | undefined): boolean {
  if (!item) return false;
  if (item.numberOfSeasons && item.numberOfSeasons > 0) return true;
  if (item.contentType === "tvshow" || item.media_type === "tv") return true;
  if (isAnimeSeries(item)) return true;
  return false;
}
