import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, getUserId } from "@/lib/session";
import prisma from "@/lib/prisma";
import { discoverMovies, discoverTVShows, getPopularMovies, getPopularTVShows } from "@/lib/tmdb";

// Fisher-Yates shuffle helper
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = getUserId(session);

    const { searchParams } = new URL(req.url);
    const source = searchParams.get("source") || "watchlist"; // "watchlist" | "discover"
    const contentType = searchParams.get("contentType") || searchParams.get("type") || "all"; // "all" | "movie" | "tvshow"
    const genre = searchParams.get("genre"); // genre name or ID string
    const minRatingStr = searchParams.get("minRating");
    const minRating = minRatingStr ? parseFloat(minRatingStr) : null;
    const countParam = parseInt(searchParams.get("count") || "12", 10);
    const candidateCount = Math.min(Math.max(countParam, 4), 24);
    const fallbackToDiscover = searchParams.get("fallback") !== "false";

    // ─── WATCHLIST SOURCE ──────────────────────────────────────────
    if (source === "watchlist") {
      const where: any = { userId };

      if (contentType && contentType !== "all") {
        where.contentType = contentType;
      }

      if (minRating !== null && !isNaN(minRating)) {
        where.voteAverage = {
          gte: minRating,
        };
      }

      const watchlistItems = await prisma.watchlistItem.findMany({
        where,
        include: {
          movie: {
            select: {
              runtime: true,
              backdropPath: true,
              collectionId: true,
              collectionName: true,
            },
          },
          tvShow: {
            select: {
              backdropPath: true,
              numberOfSeasons: true,
            },
          },
        },
      });

      // Filter by genre in-memory if requested
      let filteredItems = watchlistItems;
      if (genre && genre !== "all") {
        const lowerGenre = genre.toLowerCase();
        filteredItems = watchlistItems.filter((item) => {
          if (!item.genres) return false;
          try {
            const parsed = JSON.parse(item.genres);
            if (Array.isArray(parsed)) {
              return parsed.some(
                (g: any) =>
                  String(g.id) === genre ||
                  (g.name && g.name.toLowerCase().includes(lowerGenre))
              );
            }
          } catch {
            return item.genres.toLowerCase().includes(lowerGenre);
          }
          return false;
        });
      }

      // If we found matching items in the watchlist
      if (filteredItems.length > 0) {
        const shuffled = shuffleArray(filteredItems);
        const winningItem = shuffled[0];

        // Format candidate list for roulette animation
        const candidates = shuffled.slice(0, candidateCount).map((item) => ({
          id: item.id,
          tmdbId: item.tmdbId,
          contentType: item.contentType as "movie" | "tvshow" | "season",
          title: item.title,
          posterPath: item.posterPath,
          backdropPath: item.movie?.backdropPath || item.tvShow?.backdropPath || null,
          overview: item.overview,
          releaseDate: item.releaseDate,
          voteAverage: item.voteAverage,
          genres: item.genres,
          runtime: item.movie?.runtime || null,
          priority: item.priority,
          notes: item.notes,
          addedAt: item.addedAt.toISOString(),
          collectionId: item.movie?.collectionId || null,
          collectionName: item.movie?.collectionName || null,
        }));

        const formattedWinner = {
          id: winningItem.id,
          tmdbId: winningItem.tmdbId,
          contentType: winningItem.contentType as "movie" | "tvshow" | "season",
          title: winningItem.title,
          posterPath: winningItem.posterPath,
          backdropPath: winningItem.movie?.backdropPath || winningItem.tvShow?.backdropPath || null,
          overview: winningItem.overview,
          releaseDate: winningItem.releaseDate,
          voteAverage: winningItem.voteAverage,
          genres: winningItem.genres,
          runtime: winningItem.movie?.runtime || null,
          priority: winningItem.priority,
          notes: winningItem.notes,
          addedAt: winningItem.addedAt.toISOString(),
          collectionId: winningItem.movie?.collectionId || null,
          collectionName: winningItem.movie?.collectionName || null,
        };

        return NextResponse.json({
          success: true,
          item: formattedWinner,
          candidates,
          totalPool: filteredItems.length,
          source: "watchlist",
        });
      }

      // If watchlist is empty or has no matches, and fallback is disabled
      if (!fallbackToDiscover) {
        return NextResponse.json({
          success: false,
          error: "No titles in your watchlist match the selected filters.",
          totalPool: 0,
          source: "watchlist",
        });
      }
      // If fallbackToDiscover is true, we fall through to TMDB discover below
    }

    // ─── DISCOVER / FALLBACK SOURCE (TMDB) ─────────────────────────
    const randomPage = Math.floor(Math.random() * 5) + 1;
    const discoverParams: Record<string, string> = {
      page: String(randomPage),
      "vote_count.gte": "100",
    };

    if (minRating !== null && !isNaN(minRating)) {
      discoverParams["vote_average.gte"] = String(minRating);
    }

    if (genre && genre !== "all") {
      discoverParams["with_genres"] = genre;
    }

    let rawResults: any[] = [];
    const targetType =
      contentType === "all"
        ? Math.random() > 0.5
          ? "movie"
          : "tvshow"
        : contentType;

    try {
      if (targetType === "movie") {
        const response = await discoverMovies(discoverParams);
        rawResults = (response?.results || []).map((m: any) => ({
          ...m,
          contentType: "movie",
          title: m.title || m.original_title,
          releaseDate: m.release_date,
        }));
      } else {
        const response = await discoverTVShows(discoverParams);
        rawResults = (response?.results || []).map((t: any) => ({
          ...t,
          contentType: "tvshow",
          title: t.name || t.original_name,
          releaseDate: t.first_air_date,
        }));
      }
    } catch (tmdbErr) {
      console.warn("Discover fetch error, falling back to popular:", tmdbErr);
      if (targetType === "movie") {
        const fallback = await getPopularMovies(1);
        rawResults = (fallback?.results || []).map((m: any) => ({
          ...m,
          contentType: "movie",
          title: m.title || m.original_title,
          releaseDate: m.release_date,
        }));
      } else {
        const fallback = await getPopularTVShows(1);
        rawResults = (fallback?.results || []).map((t: any) => ({
          ...t,
          contentType: "tvshow",
          title: t.name || t.original_name,
          releaseDate: t.first_air_date,
        }));
      }
    }

    if (!rawResults || rawResults.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No titles found matching the discovery criteria.",
        totalPool: 0,
        source: "discover",
      });
    }

    const shuffled = shuffleArray(rawResults);
    const winningRaw = shuffled[0];

    const formattedWinner = {
      id: `tmdb_${winningRaw.id}`,
      tmdbId: winningRaw.id,
      contentType: winningRaw.contentType,
      title: winningRaw.title,
      posterPath: winningRaw.poster_path,
      backdropPath: winningRaw.backdrop_path,
      overview: winningRaw.overview,
      releaseDate: winningRaw.releaseDate,
      voteAverage: winningRaw.vote_average,
      genres: winningRaw.genre_ids ? JSON.stringify(winningRaw.genre_ids) : null,
      runtime: null,
      priority: 0,
      notes: null,
      addedAt: new Date().toISOString(),
      collectionId: null,
      collectionName: null,
    };

    const candidates = shuffled.slice(0, candidateCount).map((item) => ({
      id: `tmdb_${item.id}`,
      tmdbId: item.id,
      contentType: item.contentType,
      title: item.title,
      posterPath: item.poster_path,
      backdropPath: item.backdrop_path,
      overview: item.overview,
      releaseDate: item.releaseDate,
      voteAverage: item.vote_average,
      genres: item.genre_ids ? JSON.stringify(item.genre_ids) : null,
      runtime: null,
      priority: 0,
      notes: null,
      addedAt: new Date().toISOString(),
      collectionId: null,
      collectionName: null,
    }));

    return NextResponse.json({
      success: true,
      item: formattedWinner,
      candidates,
      totalPool: rawResults.length,
      source: "discover",
      fallbackUsed: source === "watchlist",
    });
  } catch (error: any) {
    console.error("GET /api/random error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Quick mark-as-watched or quick-action for the rolled item
export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = getUserId(session);

    const body = await req.json();
    const { action, tmdbId, contentType = "movie", title, posterPath, releaseDate, voteAverage, genres, rating, notes } = body;

    if (!tmdbId || !title) {
      return NextResponse.json({ error: "tmdbId and title are required" }, { status: 400 });
    }

    const numericTmdbId = Number(tmdbId);
    const validContentType = contentType === "tvshow" ? "tvshow" : "movie";

    if (action === "mark_watched") {
      // 1. Calculate next chronoPosition (increment from max)
      const maxChrono = await prisma.watchedItem.aggregate({
        where: { userId },
        _max: { chronoPosition: true },
      });
      const nextChrono = (maxChrono._max.chronoPosition ?? 0) + 1;

      // 2. Ensure Movie or TVShow record exists
      let movieId: string | undefined;
      let tvShowId: string | undefined;

      if (validContentType === "movie") {
        const movieRecord = await prisma.movie.upsert({
          where: { tmdbId: numericTmdbId },
          update: {
            title,
            posterPath: posterPath || null,
            releaseDate: releaseDate || null,
            voteAverage: voteAverage !== undefined ? voteAverage : null,
          },
          create: {
            tmdbId: numericTmdbId,
            title,
            posterPath: posterPath || null,
            releaseDate: releaseDate || null,
            voteAverage: voteAverage !== undefined ? voteAverage : null,
            genres: typeof genres === "string" ? genres : genres ? JSON.stringify(genres) : null,
          },
        });
        movieId = movieRecord.id;
      } else {
        const tvRecord = await prisma.tVShow.upsert({
          where: { tmdbId: numericTmdbId },
          update: {
            name: title,
            posterPath: posterPath || null,
            firstAirDate: releaseDate || null,
            voteAverage: voteAverage !== undefined ? voteAverage : null,
          },
          create: {
            tmdbId: numericTmdbId,
            name: title,
            posterPath: posterPath || null,
            firstAirDate: releaseDate || null,
            voteAverage: voteAverage !== undefined ? voteAverage : null,
            genres: typeof genres === "string" ? genres : genres ? JSON.stringify(genres) : null,
          },
        });
        tvShowId = tvRecord.id;
      }

      // 3. Upsert WatchedItem
      const watchedItem = await prisma.watchedItem.upsert({
        where: {
          userId_contentType_tmdbId: {
            userId,
            contentType: validContentType,
            tmdbId: numericTmdbId,
          },
        },
        update: {
          title,
          posterPath: posterPath || null,
          releaseDate: releaseDate || null,
          voteAverage: voteAverage !== undefined ? voteAverage : null,
          watchedDate: new Date(),
          notes: notes || null,
        },
        create: {
          userId,
          contentType: validContentType,
          tmdbId: numericTmdbId,
          title,
          posterPath: posterPath || null,
          releaseDate: releaseDate || null,
          voteAverage: voteAverage !== undefined ? voteAverage : null,
          genres: typeof genres === "string" ? genres : genres ? JSON.stringify(genres) : null,
          chronoPosition: nextChrono,
          movieId,
          tvShowId,
          notes: notes || null,
          watchedDate: new Date(),
        },
      });

      // 4. Remove from watchlist if present
      await prisma.watchlistItem.deleteMany({
        where: {
          userId,
          contentType: validContentType,
          tmdbId: numericTmdbId,
        },
      });

      // 5. Update user rating if rating provided
      if (rating && rating > 0) {
        await prisma.userRating.upsert({
          where: {
            userId_contentType_tmdbId: {
              userId,
              contentType: validContentType,
              tmdbId: numericTmdbId,
            },
          },
          update: { rating: Number(rating) },
          create: {
            userId,
            contentType: validContentType,
            tmdbId: numericTmdbId,
            rating: Number(rating),
            movieId,
            tvShowId,
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: `Marked "${title}" as watched!`,
        watchedItem,
      });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/random error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
