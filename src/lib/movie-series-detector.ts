import prisma from "@/lib/prisma";
import { getCollection, getMovieDetails } from "@/lib/tmdb";

export interface SeriesMovieEntry {
  sequenceNumber: number;
  tmdbId: number;
  title: string;
  releaseDate: string | null;
  posterPath: string | null;
  backdropPath?: string | null;
  overview?: string | null;
  watched: boolean;
  watchedDate?: string | null;
  subSeries?: string; // e.g. "Live-Action" | "CGI Animated" | "Reboot"
}

export interface MovieSeriesData {
  id: string;
  name: string;
  tmdbCollectionId?: number | null;
  overview?: string | null;
  posterPath?: string | null;
  backdropPath?: string | null;
  category?: string;
  totalFilms: number;
  watchedCount: number;
  progressPercentage: number;
  isCompleted: boolean;
  releaseSpan?: string;
  entries: SeriesMovieEntry[];
}

/**
 * Curated Franchises & Sequence Definitions
 * Covers franchises requested by user (Mission: Impossible, Resident Evil, Fast & Furious)
 * and popular sagas.
 */
export const CURATED_FRANCHISE_PRESETS = [
  // ── Mission: Impossible (8 Films) ──
  {
    name: "Mission: Impossible",
    tmdbCollectionId: 87359,
    category: "Action & Spy",
    overview: "All eight films follow Ethan Hunt in chronological release order.",
    posterPath: "/geu1T07Jm46sVfT4hO2lG6kM5p1.jpg",
    customParts: [
      { tmdbId: 954, title: "Mission: Impossible", releaseDate: "1996-05-22", posterPath: "/1k1fL7O7n0e7b7Z6a4wX4uB1w.jpg" },
      { tmdbId: 955, title: "Mission: Impossible II", releaseDate: "2000-05-24", posterPath: "/5VfW7u2cZ6y6j0m1q8K2L6u5y2X.jpg" },
      { tmdbId: 956, title: "Mission: Impossible III", releaseDate: "2006-05-03", posterPath: "/9Dk3B0hW713dK7g9J4K2L6u5y2X.jpg" },
      { tmdbId: 56292, title: "Mission: Impossible – Ghost Protocol", releaseDate: "2011-12-07", posterPath: "/7t0lC15F3iA6fG7jX8L4y3M1q9.jpg" },
      { tmdbId: 177677, title: "Mission: Impossible – Rogue Nation", releaseDate: "2015-07-23", posterPath: "/z2daRuy8V5j74cO6kM5p1.jpg" },
      { tmdbId: 353081, title: "Mission: Impossible – Fallout", releaseDate: "2018-07-13", posterPath: "/AkJQvtR09zjvvdYp9kCcaNclb21.jpg" },
      { tmdbId: 575264, title: "Mission: Impossible – Dead Reckoning Part One", releaseDate: "2023-07-08", posterPath: "/NNxYkU70HPurnNCSiCjYAmacwm.jpg" },
      { tmdbId: 575265, title: "Mission: Impossible – The Final Reckoning", releaseDate: "2025-05-21", posterPath: "/m9EtP1Y1e0a2b3F3X1W8J4K7L5.jpg" },
    ],
  },

  // ── Resident Evil (Live-Action & Animated) ──
  {
    name: "Resident Evil",
    tmdbCollectionId: 268,
    category: "Sci-Fi & Horror",
    overview: "The original six-film saga starring Milla Jovovich, standalone reboots, and CGI animated films following the game lore.",
    posterPath: "/2b3F3X1W8J4K7L5y9U6a2v0m1q.jpg",
    customParts: [
      { tmdbId: 107, title: "Resident Evil", releaseDate: "2002-03-15", subSeries: "Live-Action Saga" },
      { tmdbId: 108, title: "Resident Evil: Apocalypse", releaseDate: "2004-09-10", subSeries: "Live-Action Saga" },
      { tmdbId: 109, title: "Resident Evil: Extinction", releaseDate: "2007-09-20", subSeries: "Live-Action Saga" },
      { tmdbId: 13576, title: "Resident Evil: Degeneration", releaseDate: "2008-10-18", subSeries: "CGI Animated" },
      { tmdbId: 35791, title: "Resident Evil: Afterlife", releaseDate: "2010-09-09", subSeries: "Live-Action Saga" },
      { tmdbId: 72545, title: "Resident Evil: Damnation", releaseDate: "2012-09-15", subSeries: "CGI Animated" },
      { tmdbId: 6479, title: "Resident Evil: Retribution", releaseDate: "2012-09-12", subSeries: "Live-Action Saga" },
      { tmdbId: 173756, title: "Resident Evil: The Final Chapter", releaseDate: "2016-12-23", subSeries: "Live-Action Saga" },
      { tmdbId: 433356, title: "Resident Evil: Vendetta", releaseDate: "2017-05-27", subSeries: "CGI Animated" },
      { tmdbId: 460458, title: "Resident Evil: Welcome to Raccoon City", releaseDate: "2021-11-24", subSeries: "Reboot" },
      { tmdbId: 1083862, title: "Resident Evil: Death Island", releaseDate: "2023-07-07", subSeries: "CGI Animated" },
      { tmdbId: 124905, title: "Resident Evil (Zach Cregger Reboot)", releaseDate: "2026-10-01", subSeries: "Reboot" },
    ],
  },

  // ── Fast & Furious (11 Films) ──
  {
    name: "Fast & Furious",
    tmdbCollectionId: 9485,
    category: "Action & Racing",
    overview: "High-octane saga of Dominic Toretto and the family across global heists and street races.",
    posterPath: "/yK2kE12L8K2M9N6wU6b3h0i2v7M.jpg",
  },

  // ── Harry Potter & Wizarding World (8 Films) ──
  {
    name: "Harry Potter",
    tmdbCollectionId: 1241,
    category: "Fantasy & Magic",
    overview: "The complete 8-film journey of the Boy Who Lived at Hogwarts School of Witchcraft and Wizardry.",
    posterPath: "/eVPs2Y0LyvTLZn6AP5Z6O2rtiGB.jpg",
  },

  // ── The Terminator Collection (6 Films) ──
  {
    name: "The Terminator",
    tmdbCollectionId: 528,
    category: "Sci-Fi & Action",
    overview: "The battle between humanity and the machine empire Skynet across timelines.",
    posterPath: "/2bXGZLkuq61asKveaHkYxI8817.jpg",
  },

  // ── Spider-Man (Sam Raimi Trilogy) ──
  {
    name: "Spider-Man (Sam Raimi)",
    tmdbCollectionId: 556,
    category: "Superhero",
    overview: "Tobey Maguire's Peter Parker in the iconic original trilogy.",
    posterPath: "/rPVOJq703q6zX9vjJ9aZ35f60J5.jpg",
  },

  // ── Spider-Man (MCU Homecoming Saga) ──
  {
    name: "Spider-Man (MCU)",
    tmdbCollectionId: 531241,
    category: "Superhero",
    overview: "Tom Holland's Peter Parker navigating the Marvel Cinematic Universe.",
    posterPath: "/t3bhkrUX31QnZ51J8U6gT1z0kF5.jpg",
  },

  // ── The Avengers Collection ──
  {
    name: "The Avengers",
    tmdbCollectionId: 86311,
    category: "Superhero",
    overview: "Earth's Mightiest Heroes teaming up to defend the universe from Loki, Ultron, Thanos, and beyond.",
    posterPath: "/yFSIUVTCvgYr05wtP0qdwuU3N2d.jpg",
  },

  // ── Iron Man Collection ──
  {
    name: "Iron Man",
    tmdbCollectionId: 131292,
    category: "Superhero",
    overview: "Tony Stark's transformation into the armored Avenger.",
    posterPath: "/7vAEN9l0AevX5n4L22hX9F1k4c.jpg",
  },

  // ── Thor Collection ──
  {
    name: "Thor",
    tmdbCollectionId: 131296,
    category: "Superhero",
    overview: "The God of Thunder's epic saga across Asgard, Midgard, and the cosmic realms.",
    posterPath: "/prSfAi1xGrhLQNxVSUFh61x940w.jpg",
  },

  // ── Captain America Collection ──
  {
    name: "Captain America",
    tmdbCollectionId: 131295,
    category: "Superhero",
    overview: "From the First Avenger in World War II to modern shield-bearers.",
    posterPath: "/q4L8D8eT4o3k9W6b4u2X7y6j0m.jpg",
  },

  // ── Deadpool Collection ──
  {
    name: "Deadpool",
    tmdbCollectionId: 448150,
    category: "Superhero",
    overview: "The Merc with a Mouth breaking the fourth wall and saving the multiverse.",
    posterPath: "/yFSIUVTCvgYr05wtP0qdwuU3N2d.jpg",
  },

  // ── X-Men Collection ──
  {
    name: "X-Men",
    tmdbCollectionId: 748,
    category: "Superhero",
    overview: "Mutants fighting for coexistence in a world that fears and hates them.",
    posterPath: "/1c2a1f11e93895e6f6630f0f49.jpg",
  },

  // ── The Dark Knight Trilogy ──
  {
    name: "The Dark Knight Trilogy",
    tmdbCollectionId: 263,
    category: "Action & Superhero",
    overview: "Christopher Nolan's definitive Gotham saga starring Christian Bale as Batman.",
    posterPath: "/3bgtU2x3a4k9J31qX7P70eE31L0.jpg",
  },

  // ── The Matrix Collection ──
  {
    name: "The Matrix",
    tmdbCollectionId: 2344,
    category: "Sci-Fi & Action",
    overview: "Neo, Trinity, and Morpheus awakening humanity from the simulated reality.",
    posterPath: "/dXNAPwY7VrqMAo51EKhhCJfaGb5.jpg",
  },

  // ── John Wick Universe ──
  {
    name: "John Wick",
    tmdbCollectionId: 404609,
    category: "Action & Crime",
    overview: "The Baba Yaga's relentless crusade through the Continental and High Table.",
    posterPath: "/p4UebmvvgdnJz9pT4yY2vHkL3Z.jpg",
  },
];

export interface AutoLinkSeriesResult {
  franchiseId: string | null;
  franchiseSeq: number | null;
  franchiseName?: string | null;
}

/**
 * Automatically detects whether a newly added/watched movie belongs to a movie series
 * (either from curated presets or TMDB collection). If it does, creates that franchise template,
 * fetches & sequences all parts in chronological order (#1, #2, ...), and scans the user's
 * watched list to automatically link and mark all related movies!
 */
export async function autoLinkMovieToSeries(
  userId: string,
  tmdbId: number,
  fallbackData?: {
    title?: string;
    releaseDate?: string | null;
    posterPath?: string | null;
    collectionId?: number | null;
    collectionName?: string | null;
  }
): Promise<AutoLinkSeriesResult> {
  try {
    // 1. Fetch user's watched items map for contentType: "movie"
    const userWatched = await prisma.watchedItem.findMany({
      where: { userId, contentType: "movie" },
      select: { tmdbId: true, watchedDate: true },
    });
    const watchedMap = new Map<number, Date>();
    userWatched.forEach((w) => watchedMap.set(w.tmdbId, w.watchedDate));
    if (!watchedMap.has(tmdbId)) {
      watchedMap.set(tmdbId, new Date());
    }

    // 2. Check curated presets first
    for (const preset of CURATED_FRANCHISE_PRESETS) {
      const matchCustom = preset.customParts?.some((p) => p.tmdbId === tmdbId);
      const matchColId = preset.tmdbCollectionId && fallbackData?.collectionId === preset.tmdbCollectionId;

      if (matchCustom || matchColId) {
        let franchise = await prisma.franchise.findFirst({
          where: {
            userId,
            OR: [
              preset.tmdbCollectionId ? { tmdbCollectionId: preset.tmdbCollectionId } : {},
              { name: { equals: preset.name, mode: "insensitive" } },
            ],
          },
        });

        if (!franchise) {
          franchise = await prisma.franchise.create({
            data: {
              userId,
              name: preset.name,
              tmdbCollectionId: preset.tmdbCollectionId || null,
              overview: preset.overview || null,
              posterPath: preset.posterPath || fallbackData?.posterPath || null,
            },
          });
        }

        let parts: any[] = preset.customParts ? [...preset.customParts] : [];
        if (parts.length === 0 && preset.tmdbCollectionId) {
          try {
            const col = await getCollection(preset.tmdbCollectionId);
            if (col?.parts) {
              parts = col.parts.map((p: any) => ({
                tmdbId: p.id,
                title: p.title || p.original_title,
                releaseDate: p.release_date || null,
                posterPath: p.poster_path || null,
              }));
            }
          } catch (e) {
            console.warn(`Could not fetch TMDB collection ${preset.tmdbCollectionId}:`, e);
          }
        }

        // Sort chronologically ascending
        parts.sort((a, b) => {
          const dateA = a.releaseDate || "9999-99-99";
          const dateB = b.releaseDate || "9999-99-99";
          return dateA.localeCompare(dateB);
        });

        let currentSeq: number | null = null;
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          const seq = i + 1;
          if (part.tmdbId === tmdbId) currentSeq = seq;
          const isWatched = watchedMap.has(part.tmdbId);
          const wDate = watchedMap.get(part.tmdbId);

          await prisma.franchiseEntry.upsert({
            where: {
              franchiseId_sequenceNumber: {
                franchiseId: franchise.id,
                sequenceNumber: seq,
              },
            },
            update: {
              title: part.title,
              releaseDate: part.releaseDate,
              posterPath: part.posterPath,
              watched: isWatched,
              watchedDate: isWatched ? wDate || new Date() : null,
            },
            create: {
              franchiseId: franchise.id,
              sequenceNumber: seq,
              tmdbId: part.tmdbId,
              title: part.title,
              releaseDate: part.releaseDate,
              posterPath: part.posterPath,
              watched: isWatched,
              watchedDate: isWatched ? wDate || new Date() : null,
              userId,
            },
          });

          if (isWatched) {
            await prisma.watchedItem.updateMany({
              where: { userId, tmdbId: part.tmdbId, contentType: "movie" },
              data: { franchiseId: franchise.id, franchiseSeq: seq },
            });
          }
        }

        return {
          franchiseId: franchise.id,
          franchiseSeq: currentSeq,
          franchiseName: franchise.name,
        };
      }
    }

    // 3. If not in curated preset, check TMDB collection
    let colId = fallbackData?.collectionId;
    let colName = fallbackData?.collectionName;
    let colPoster = fallbackData?.posterPath;
    let colBackdrop: string | null = null;
    let colOverview: string | null = null;

    if (!colId) {
      const existingMovie = await prisma.movie.findUnique({
        where: { tmdbId },
        select: { collectionId: true, collectionName: true },
      });
      if (existingMovie?.collectionId) {
        colId = existingMovie.collectionId;
        colName = existingMovie.collectionName || undefined;
      } else {
        try {
          const details = await getMovieDetails(tmdbId);
          if (details?.belongs_to_collection) {
            colId = details.belongs_to_collection.id;
            colName = details.belongs_to_collection.name;
            colPoster = details.belongs_to_collection.poster_path;
            colBackdrop = details.belongs_to_collection.backdrop_path;
            await prisma.movie.updateMany({
              where: { tmdbId },
              data: {
                collectionId: colId,
                collectionName: colName,
              },
            });
          }
        } catch (e) {
          console.warn(`TMDB getMovieDetails failed for tmdbId ${tmdbId}:`, e);
        }
      }
    }

    if (colId) {
      const col = await getCollection(colId);
      if (col && col.parts && col.parts.length > 0) {
        const sortedParts = [...col.parts].sort((a: any, b: any) =>
          (a.release_date || "9999").localeCompare(b.release_date || "9999")
        );

        let franchise = await prisma.franchise.findFirst({
          where: {
            userId,
            OR: [
              { tmdbCollectionId: col.id },
              { name: { equals: col.name, mode: "insensitive" } },
            ],
          },
        });

        if (!franchise) {
          franchise = await prisma.franchise.create({
            data: {
              userId,
              name: col.name,
              tmdbCollectionId: col.id,
              overview: col.overview || colOverview || null,
              posterPath: col.poster_path || colPoster || null,
              backdropPath: col.backdrop_path || colBackdrop || null,
            },
          });
        }

        let currentSeq: number | null = null;
        for (let i = 0; i < sortedParts.length; i++) {
          const part = sortedParts[i];
          const seq = i + 1;
          if (part.id === tmdbId) currentSeq = seq;
          const isWatched = watchedMap.has(part.id);
          const wDate = watchedMap.get(part.id);

          await prisma.franchiseEntry.upsert({
            where: {
              franchiseId_sequenceNumber: {
                franchiseId: franchise.id,
                sequenceNumber: seq,
              },
            },
            update: {
              title: part.title || part.original_title,
              releaseDate: part.release_date || null,
              posterPath: part.poster_path || null,
              watched: isWatched,
              watchedDate: isWatched ? wDate || new Date() : null,
            },
            create: {
              franchiseId: franchise.id,
              sequenceNumber: seq,
              tmdbId: part.id,
              title: part.title || part.original_title,
              releaseDate: part.release_date || null,
              posterPath: part.poster_path || null,
              watched: isWatched,
              watchedDate: isWatched ? wDate || new Date() : null,
              userId,
            },
          });

          if (isWatched) {
            await prisma.watchedItem.updateMany({
              where: { userId, tmdbId: part.id, contentType: "movie" },
              data: { franchiseId: franchise.id, franchiseSeq: seq },
            });
          }
        }

        return {
          franchiseId: franchise.id,
          franchiseSeq: currentSeq,
          franchiseName: franchise.name,
        };
      }
    }

    return { franchiseId: null, franchiseSeq: null };
  } catch (error) {
    console.error("autoLinkMovieToSeries failed:", error);
    return { franchiseId: null, franchiseSeq: null };
  }
}

/**
 * Syncs and sequences all movie series from the user's watched items.
 * Guaranteed to list films in strict chronological sequence order.
 */
export async function syncAndSequenceMovieSeries(userId: string): Promise<MovieSeriesData[]> {
  // 1. Fetch user's watched items (specifically movies)
  const watchedMovies = await prisma.watchedItem.findMany({
    where: {
      userId,
      contentType: "movie",
    },
    select: {
      id: true,
      tmdbId: true,
      title: true,
      releaseDate: true,
      posterPath: true,
      watchedDate: true,
      chronoPosition: true,
      movie: {
        select: {
          collectionId: true,
          collectionName: true,
        },
      },
    },
  });

  const watchedTmdbMap = new Map<number, { watchedDate: Date; id: string; title: string }>();
  watchedMovies.forEach((m) => {
    watchedTmdbMap.set(m.tmdbId, {
      watchedDate: m.watchedDate,
      id: m.id,
      title: m.title,
    });
  });

  // 2. Load existing Franchises in database for this user
  const existingFranchises = await prisma.franchise.findMany({
    where: { userId },
    include: {
      entries: {
        orderBy: { sequenceNumber: "asc" },
      },
    },
  });

  const franchiseByCollectionId = new Map<number, typeof existingFranchises[0]>();
  const franchiseByName = new Map<string, typeof existingFranchises[0]>();

  existingFranchises.forEach((f) => {
    if (f.tmdbCollectionId) franchiseByCollectionId.set(f.tmdbCollectionId, f);
    franchiseByName.set(f.name.toLowerCase().trim(), f);
  });

  // 3. Process curated presets (Mission: Impossible, Resident Evil, Fast & Furious, etc.)
  for (const preset of CURATED_FRANCHISE_PRESETS) {
    let franchise = preset.tmdbCollectionId
      ? franchiseByCollectionId.get(preset.tmdbCollectionId)
      : franchiseByName.get(preset.name.toLowerCase().trim());

    // Check if user watched any movie belonging to this preset
    let partsToUse: any[] = [];

    if (preset.customParts && preset.customParts.length > 0) {
      partsToUse = preset.customParts;
    } else if (preset.tmdbCollectionId) {
      // If collection parts already in existing franchise entries
      if (franchise && franchise.entries.length > 0) {
        partsToUse = franchise.entries.map((e) => ({
          tmdbId: e.tmdbId,
          title: e.title,
          releaseDate: e.releaseDate,
          posterPath: e.posterPath,
        }));
      } else {
        // Fetch from TMDB
        try {
          const tmdbCol = await getCollection(preset.tmdbCollectionId);
          if (tmdbCol?.parts) {
            partsToUse = tmdbCol.parts.map((p: any) => ({
              tmdbId: p.id,
              title: p.title || p.original_title,
              releaseDate: p.release_date || null,
              posterPath: p.poster_path || null,
            }));
          }
        } catch {
          // TMDB offline or skipped
        }
      }
    }

    // Sort parts chronologically by releaseDate ascending (Wisely sequential order)
    partsToUse.sort((a, b) => {
      const dateA = a.releaseDate || "9999-99-99";
      const dateB = b.releaseDate || "9999-99-99";
      return dateA.localeCompare(dateB);
    });

    const hasAnyWatched = partsToUse.some((p) => watchedTmdbMap.has(p.tmdbId));

    // If user watched at least one or already has franchise, ensure it's saved in DB
    if ((hasAnyWatched || franchise) && partsToUse.length > 0) {
      if (!franchise) {
        franchise = await prisma.franchise.create({
          data: {
            userId,
            name: preset.name,
            tmdbCollectionId: preset.tmdbCollectionId || null,
            overview: preset.overview || null,
            posterPath: preset.posterPath || null,
          },
          include: { entries: true },
        });
        if (preset.tmdbCollectionId) franchiseByCollectionId.set(preset.tmdbCollectionId, franchise);
        franchiseByName.set(preset.name.toLowerCase().trim(), franchise);
      }

      // Upsert sequence entries
      for (let i = 0; i < partsToUse.length; i++) {
        const part = partsToUse[i];
        const seqNum = i + 1;
        const isWatched = watchedTmdbMap.has(part.tmdbId);
        const watchedInfo = watchedTmdbMap.get(part.tmdbId);

        await prisma.franchiseEntry.upsert({
          where: {
            franchiseId_sequenceNumber: {
              franchiseId: franchise.id,
              sequenceNumber: seqNum,
            },
          },
          update: {
            title: part.title,
            releaseDate: part.releaseDate,
            posterPath: part.posterPath,
            watched: isWatched,
            watchedDate: isWatched ? watchedInfo?.watchedDate : null,
          },
          create: {
            franchiseId: franchise.id,
            sequenceNumber: seqNum,
            tmdbId: part.tmdbId,
            title: part.title,
            releaseDate: part.releaseDate,
            posterPath: part.posterPath,
            watched: isWatched,
            watchedDate: isWatched ? watchedInfo?.watchedDate : null,
            userId,
          },
        });

        // Also update WatchedItem franchise link
        if (isWatched && watchedInfo) {
          await prisma.watchedItem.updateMany({
            where: {
              userId,
              tmdbId: part.tmdbId,
              contentType: "movie",
            },
            data: {
              franchiseId: franchise.id,
              franchiseSeq: seqNum,
            },
          });
        }
      }
    }
  }

  // 4. Also dynamically discover any movie with collectionId from user's watched list
  for (const m of watchedMovies) {
    const colId = m.movie?.collectionId;
    if (colId && !franchiseByCollectionId.has(colId)) {
      try {
        const col = await getCollection(colId);
        if (col && col.parts && col.parts.length > 0) {
          const sorted = [...col.parts].sort((a: any, b: any) =>
            (a.release_date || "9999").localeCompare(b.release_date || "9999")
          );

          const franchise = await prisma.franchise.create({
            data: {
              userId,
              name: col.name,
              tmdbCollectionId: col.id,
              overview: col.overview || null,
              posterPath: col.poster_path || null,
              backdropPath: col.backdrop_path || null,
            },
            include: { entries: true },
          });
          franchiseByCollectionId.set(col.id, franchise);

          for (let i = 0; i < sorted.length; i++) {
            const p = sorted[i];
            const seqNum = i + 1;
            const isWatched = watchedTmdbMap.has(p.id);
            const wInfo = watchedTmdbMap.get(p.id);

            await prisma.franchiseEntry.create({
              data: {
                franchiseId: franchise.id,
                sequenceNumber: seqNum,
                tmdbId: p.id,
                title: p.title || p.original_title,
                releaseDate: p.release_date || null,
                posterPath: p.poster_path || null,
                watched: isWatched,
                watchedDate: isWatched ? wInfo?.watchedDate : null,
                userId,
              },
            });

            if (isWatched) {
              await prisma.watchedItem.updateMany({
                where: { userId, tmdbId: p.id, contentType: "movie" },
                data: { franchiseId: franchise.id, franchiseSeq: seqNum },
              });
            }
          }
        }
      } catch (err) {
        console.error(`Failed to auto-import collection ${colId}:`, err);
      }
    }
  }

  // 5. Query all franchises and return enriched sequential data
  const finalFranchises = await prisma.franchise.findMany({
    where: { userId },
    include: {
      entries: {
        orderBy: { sequenceNumber: "asc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const result: MovieSeriesData[] = finalFranchises
    .map((f) => {
      const entries: SeriesMovieEntry[] = f.entries.map((e) => ({
        sequenceNumber: e.sequenceNumber,
        tmdbId: e.tmdbId,
        title: e.title,
        releaseDate: e.releaseDate,
        posterPath: e.posterPath,
        watched: e.watched,
        watchedDate: e.watchedDate ? e.watchedDate.toISOString() : null,
      }));

      const totalFilms = entries.length;
      const watchedCount = entries.filter((e) => e.watched).length;
      const progressPercentage = totalFilms > 0 ? Math.round((watchedCount / totalFilms) * 100) : 0;
      const isCompleted = totalFilms > 0 && watchedCount === totalFilms;

      // Calculate release span (e.g. "1996 - 2025")
      const dates = entries
        .map((e) => e.releaseDate)
        .filter((d): d is string => typeof d === "string" && d.length >= 4)
        .map((d) => parseInt(d.slice(0, 4), 10))
        .filter((y) => !isNaN(y) && y > 1900);

      const releaseSpan =
        dates.length > 0
          ? dates.length === 1
            ? String(dates[0])
            : `${Math.min(...dates)} – ${Math.max(...dates)}`
          : undefined;

      return {
        id: f.id,
        name: f.name,
        tmdbCollectionId: f.tmdbCollectionId,
        overview: f.overview,
        posterPath: f.posterPath,
        backdropPath: f.backdropPath,
        totalFilms,
        watchedCount,
        progressPercentage,
        isCompleted,
        releaseSpan,
        entries,
      };
    })
    // Sort franchises: franchises with watched movies first, sorted by watchedCount descending
    .sort((a, b) => {
      if (b.watchedCount !== a.watchedCount) {
        return b.watchedCount - a.watchedCount;
      }
      return b.totalFilms - a.totalFilms;
    });

  return result;
}
