import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, getUserId } from "@/lib/session";
import { getTVShowDetails } from "@/lib/tmdb";
import { getUniverseForItem } from "@/lib/curated-watchlist-data";
import prisma from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = getUserId(session);
    const tmdbId = parseInt(params.id, 10);

    if (isNaN(tmdbId) || tmdbId <= 0) {
      return NextResponse.json({ error: "Invalid TV show ID" }, { status: 400 });
    }

    const tvShow = await getTVShowDetails(tmdbId);
    if (!tvShow || !tvShow.id) {
      return NextResponse.json({ error: "TV show not found" }, { status: 404 });
    }

    // Query user's watchlist, watched, and rating state in parallel
    const [watchlistItem, watchedItem, userRating, watchedSeasons] =
      await Promise.all([
        prisma.watchlistItem.findFirst({
          where: {
            userId,
            contentType: "tvshow",
            tmdbId,
          },
        }),
        prisma.watchedItem.findFirst({
          where: {
            userId,
            contentType: "tvshow",
            tmdbId,
          },
        }),
        prisma.userRating.findFirst({
          where: {
            userId,
            contentType: "tvshow",
            tmdbId,
          },
        }),
        prisma.watchedItem.findMany({
          where: {
            userId,
            contentType: "season",
            tvShow: {
              tmdbId,
            },
          },
          select: {
            seasonId: true,
          },
        }),
      ]);

    // Check curated compendium universe for TV / Anime series (e.g., Breaking Bad, Game of Thrones, Dragon Ball, etc.)
    let franchiseProgress = null;
    const curatedUniverse = getUniverseForItem(tmdbId, tvShow.name || tvShow.original_name);
    if (curatedUniverse) {
      const itemIds = curatedUniverse.items.map((it) => it.tmdbId);
      const watchedUniverseItems = await prisma.watchedItem.findMany({
        where: {
          userId,
          tmdbId: { in: itemIds },
        },
        select: { tmdbId: true },
      });
      const watchedSet = new Set(watchedUniverseItems.map((w) => w.tmdbId));
      const watchedCount = curatedUniverse.items.filter((it) => watchedSet.has(it.tmdbId)).length;
      const currentIdx = curatedUniverse.items.findIndex((it) => it.tmdbId === tmdbId);

      franchiseProgress = {
        universeId: curatedUniverse.id,
        name: curatedUniverse.name,
        category: curatedUniverse.category,
        totalParts: curatedUniverse.items.length,
        watchedCount,
        progressPercentage: Math.round((watchedCount / curatedUniverse.items.length) * 100),
        sequenceNumber: currentIdx !== -1 ? currentIdx + 1 : null,
        isCurrentMovieWatched: watchedSet.has(tmdbId),
        items: curatedUniverse.items.map((it) => ({
          id: it.tmdbId,
          tmdbId: it.tmdbId,
          title: it.title,
          year: it.year,
          role: it.role,
          media_type: it.media_type || "tv",
          posterPath: it.posterPath,
          sequence: it.sequence,
          isWatched: watchedSet.has(it.tmdbId),
        })),
      };
    }

    return NextResponse.json({
      ...tvShow,
      media_type: "tv",
      inWatchlist: Boolean(watchlistItem),
      watchlistItemId: watchlistItem?.id || null,
      inWatched: Boolean(watchedItem),
      watchedItemId: watchedItem?.id || null,
      chronoPosition: watchedItem?.chronoPosition || null,
      userRating: userRating?.rating ?? null,
      watchedSeasonsCount: watchedSeasons.length,
      franchiseProgress,
    });
  } catch (error: any) {
    console.error("TMDB TV Detail Route Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch TV show details" },
      { status: 500 }
    );
  }
}
