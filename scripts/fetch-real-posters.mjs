import fs from "fs";
import path from "path";
import https from "https";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_KEY = "3ad13b8e0a3244f77839facf3a8ff03f";

// Helper to fetch from TMDB
function tmdbGet(endpoint) {
  return new Promise((resolve) => {
    const url = `https://api.themoviedb.org/3${endpoint}${endpoint.includes("?") ? "&" : "?"}api_key=${API_KEY}`;
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(data));
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      });
    }).on("error", () => resolve(null));
  });
}

// Concurrency pool helper
async function mapConcurrent(items, concurrency, fn) {
  const results = [];
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const i = index++;
      try {
        results[i] = await fn(items[i], i);
      } catch (err) {
        results[i] = null;
      }
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function main() {
  console.log("Loading curated watchlist data...");
  const dataModule = await import("../src/lib/curated-watchlist-data.ts");
  const {
    MOVIE_FRANCHISES,
    STANDALONE_ESSENTIAL_MOVIES,
    SERIES_UNIVERSES,
    STANDALONE_ESSENTIAL_SERIES,
    ANIME_FRANCHISES,
    MASTER_ANIME_CHECKLIST,
    WESTERN_ANIMATED_SERIES,
    WESTERN_ANIMATED_MOVIES
  } = dataModule;

  const movies = new Map();
  const tvs = new Map();

  function addMovie(id, title, year) {
    if (id && !movies.has(id)) movies.set(id, { id, title, year });
  }

  function addTv(id, title, year) {
    if (id && !tvs.has(id)) tvs.set(id, { id, title, year });
  }

  for (const f of MOVIE_FRANCHISES) {
    for (const item of f.items) addMovie(item.tmdbId, item.title, item.year);
  }
  for (const m of STANDALONE_ESSENTIAL_MOVIES) {
    addMovie(m.tmdbId, m.title, m.year);
  }
  for (const w of WESTERN_ANIMATED_MOVIES) {
    addMovie(w.tmdbId, w.title, w.year);
  }

  for (const u of SERIES_UNIVERSES) {
    for (const item of u.items) {
      if (item.media_type === "movie" || item.contentType === "movie") {
        addMovie(item.tmdbId, item.title, item.year);
      } else {
        addTv(item.tmdbId, item.title, item.year);
      }
    }
  }
  for (const s of STANDALONE_ESSENTIAL_SERIES) {
    addTv(s.tmdbId, s.title, s.year);
  }
  for (const w of WESTERN_ANIMATED_SERIES) {
    addTv(w.tmdbId, w.title, w.year);
  }

  for (const f of ANIME_FRANCHISES) {
    for (const item of f.items) {
      if (item.media_type === "movie" || item.contentType === "movie") {
        addMovie(item.tmdbId, item.title, item.year);
      } else {
        addTv(item.tmdbId, item.title, item.year);
      }
    }
  }
  for (const a of MASTER_ANIME_CHECKLIST) {
    if (a.type === "movie") {
      addMovie(a.tmdbId, a.title, a.year);
    } else {
      addTv(a.tmdbId, a.title, a.year);
    }
  }

  const movieList = Array.from(movies.values());
  const tvList = Array.from(tvs.values());

  console.log(`Fetching real posters for ${movieList.length} movies and ${tvList.length} TV shows...`);

  const posterMap = {};
  let movieSuccess = 0;
  let tvSuccess = 0;

  // Fetch movies
  await mapConcurrent(movieList, 20, async (m, idx) => {
    let res = await tmdbGet(`/movie/${m.id}`);
    if (!res || !res.poster_path) {
      // Try search if id didn't return poster
      const search = await tmdbGet(`/search/movie?query=${encodeURIComponent(m.title)}`);
      if (search?.results?.[0]?.poster_path) {
        res = search.results[0];
      }
    }
    if (res?.poster_path) {
      posterMap[String(m.id)] = {
        posterPath: res.poster_path,
        backdropPath: res.backdrop_path || null,
        voteAverage: res.vote_average || 8.0,
        title: res.title || m.title,
      };
      movieSuccess++;
    } else {
      console.warn(`[WARN] Movie poster not found: ${m.id} - ${m.title}`);
    }
    if ((idx + 1) % 50 === 0 || idx === movieList.length - 1) {
      console.log(`Movies processed: ${idx + 1}/${movieList.length} (found: ${movieSuccess})`);
    }
  });

  // Fetch TV shows
  await mapConcurrent(tvList, 20, async (t, idx) => {
    let res = await tmdbGet(`/tv/${t.id}`);
    if (!res || !res.poster_path) {
      const search = await tmdbGet(`/search/tv?query=${encodeURIComponent(t.title)}`);
      if (search?.results?.[0]?.poster_path) {
        res = search.results[0];
      }
    }
    if (res?.poster_path) {
      posterMap[String(t.id)] = {
        posterPath: res.poster_path,
        backdropPath: res.backdrop_path || null,
        voteAverage: res.vote_average || 8.0,
        title: res.name || t.title,
      };
      tvSuccess++;
    } else {
      console.warn(`[WARN] TV poster not found: ${t.id} - ${t.title}`);
    }
    if ((idx + 1) % 50 === 0 || idx === tvList.length - 1) {
      console.log(`TV shows processed: ${idx + 1}/${tvList.length} (found: ${tvSuccess})`);
    }
  });

  const outPath = path.resolve(__dirname, "../src/lib/curated-posters.json");
  fs.writeFileSync(outPath, JSON.stringify(posterMap, null, 2), "utf-8");
  console.log(`Done! Saved ${Object.keys(posterMap).length} real posters to ${outPath}`);
}

main().catch(console.error);
