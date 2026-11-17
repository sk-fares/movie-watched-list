import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, getUserId } from "@/lib/session";
import { getTVShowDetails } from "@/lib/tmdb";
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
    });
  } catch (error: any) {
    console.error("TMDB TV Detail Route Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch TV show details" },
      { status: 500 }
    );
  }
}
