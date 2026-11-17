import { NextResponse } from "next/server";
import { getAuthSession, getUserId } from "@/lib/session";
import prisma from "@/lib/prisma";
import { parseGenres } from "@/lib/utils";

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = getUserId(session);

    // Run core counts and fetches in parallel
    const [
      totalMoviesWatched,
      totalSeriesWatched,
      totalWatchlistItems,
      watchedItems,
      recentWatchlist,
      userRatings,
      franchisesCount,
    ] = await Promise.all([
      prisma.watchedItem.count({
        where: { userId, contentType: "movie" },
      }),
      prisma.watchedItem.count({
        where: { userId, contentType: { in: ["tvshow", "season"] } },
      }),
      prisma.watchlistItem.count({
        where: { userId },
      }),
      prisma.watchedItem.findMany({
        where: { userId },
        orderBy: { watchedDate: "desc" },
        take: 50, // Get up to 50 for watch time & genre analysis
        include: {
          movie: true,
          tvShow: true,
        },
      }),
      prisma.watchlistItem.findMany({
        where: { userId },
        orderBy: { addedAt: "desc" },
        take: 10,
        include: {
          movie: true,
          tvShow: true,
        },
      }),
      prisma.userRating.findMany({
        where: { userId },
        select: { rating: true },
      }),
      prisma.franchise.count({
        where: { userId },
      }),
    ]);

    // Calculate total watch time in minutes
    // Use runtime from movie relation if present, or fallback estimates
    let totalWatchMinutes = 0;
    const genreCounts: Record<string, number> = {};

    watchedItems.forEach((item) => {
      // Watch time
      if (item.contentType === "movie") {
        totalWatchMinutes += item.movie?.runtime || 112; // default ~112 min
      } else if (item.contentType === "tvshow") {
        // Average seasons * episodes or default ~480 mins
        totalWatchMinutes += 480;
      } else if (item.contentType === "season") {
        totalWatchMinutes += 400;
      } else if (item.contentType === "episode") {
        totalWatchMinutes += 45;
      }

      // Tally genres
      const rawGenres = item.genres || item.movie?.genres || item.tvShow?.genres;
      const parsed = parseGenres(rawGenres);
      parsed.forEach((g) => {
        if (g.name) {
          genreCounts[g.name] = (genreCounts[g.name] || 0) + 1;
        }
      });
    });

    // Top 6 favorite genres
    const favoriteGenres = Object.entries(genreCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // Calculate rating statistics
    const totalRated = userRatings.length;
    const averageRating =
      totalRated > 0
        ? Number(
            (
              userRatings.reduce((acc, curr) => acc + curr.rating, 0) /
              totalRated
            ).toFixed(1)
          )
        : null;

    // Watched in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const watchedThisMonth = watchedItems.filter(
      (w) => new Date(w.watchedDate) >= thirtyDaysAgo
    ).length;

    // Format recently watched
    const recentlyWatched = watchedItems.slice(0, 10).map((item) => ({
      id: item.id,
      tmdbId: item.tmdbId,
      contentType: item.contentType as any,
      title: item.title,
      posterPath: item.posterPath,
      backdropPath: item.movie?.backdropPath || item.tvShow?.backdropPath || null,
      overview: item.movie?.overview || item.tvShow?.overview || null,
      releaseDate: item.releaseDate,
      voteAverage: item.voteAverage,
      genres: item.genres,
      runtime: item.movie?.runtime || null,
      watchedDate: item.watchedDate.toISOString(),
      chronoPosition: item.chronoPosition,
      franchiseId: item.franchiseId,
      franchiseSeq: item.franchiseSeq,
      notes: item.notes,
    }));

    // Format recently added to watchlist
    const recentlyAdded = recentWatchlist.map((item) => ({
      id: item.id,
      tmdbId: item.tmdbId,
      contentType: item.contentType as any,
      title: item.title,
      posterPath: item.posterPath,
      backdropPath: item.movie?.backdropPath || item.tvShow?.backdropPath || null,
      overview: item.overview,
      releaseDate: item.releaseDate,
      voteAverage: item.voteAverage,
      genres: item.genres,
      runtime: item.movie?.runtime || null,
      addedAt: item.addedAt.toISOString(),
      priority: item.priority,
      notes: item.notes,
    }));

    return NextResponse.json({
      totalMoviesWatched,
      totalSeriesWatched,
      totalWatchlistItems,
      totalWatchTime: totalWatchMinutes,
      recentlyWatched,
      recentlyAdded,
      favoriteGenres,
      extra: {
        averageRating,
        totalRated,
        franchisesCount,
        watchedThisMonth,
      },
    });
  } catch (error: any) {
    console.error("Dashboard Stats API Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to load dashboard stats" },
      { status: 500 }
    );
  }
}
