import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, getUserId } from "@/lib/session";
import prisma from "@/lib/prisma";
import { getMovieDetails, getTVShowDetails } from "@/lib/tmdb";
import { getUniverseForItem } from "@/lib/curated-watchlist-data";

export async function GET(
  req: NextRequest,
  { params }: { params: { type: string; id: string } }
) {
  try {
    const { type, id } = params;
    const tmdbId = parseInt(id, 10);

    if (isNaN(tmdbId)) {
      return NextResponse.json({ error: "Invalid TMDB ID" }, { status: 400 });
    }

    const isMovie = type === "movie";
    const validContentType = isMovie ? "movie" : "tvshow";

    // 1. Fetch TMDB details securely on the server
    let tmdbData: any = null;
    try {
      if (isMovie) {
        tmdbData = await getMovieDetails(tmdbId);
      } else {
        tmdbData = await getTVShowDetails(tmdbId);
      }
    } catch (tmdbErr: any) {
      console.error("TMDB details fetch error:", tmdbErr);
      return NextResponse.json(
        { error: "Failed to fetch title details from TMDB." },
        { status: 404 }
      );
    }

    // 2. Check user's watchlist/watched/rating status if authenticated
    const session = await getAuthSession();
    let userState = {
      isAuthenticated: false,
      isInWatchlist: false,
      isWatched: false,
      watchedDate: null as string | null,
      userRating: null as number | null,
      userReview: null as string | null,
      notes: null as string | null,
      franchiseInfo: null as any,
    };

    const title = tmdbData.title || tmdbData.name || "";
    const curatedUniverse = getUniverseForItem(tmdbId, title);

    if (session?.user) {
      const userId = getUserId(session);
      userState.isAuthenticated = true;

      const [watchlistItem, watchedItem, userRating, userReview, franchiseEntry] =
        await Promise.all([
          prisma.watchlistItem.findFirst({
            where: {
              userId,
              contentType: validContentType,
              tmdbId,
            },
          }),
          prisma.watchedItem.findFirst({
            where: {
              userId,
              contentType: validContentType,
              tmdbId,
            },
          }),
          prisma.userRating.findFirst({
            where: {
              userId,
              contentType: validContentType,
              tmdbId,
            },
          }),
          prisma.userReview.findFirst({
            where: {
              userId,
              contentType: validContentType,
              tmdbId,
            },
          }),
          prisma.franchiseEntry.findFirst({
            where: {
              userId,
              tmdbId,
            },
            include: {
              franchise: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          }),
        ]);

      userState.isInWatchlist = Boolean(watchlistItem);
      userState.isWatched = Boolean(watchedItem);
      userState.watchedDate = watchedItem?.watchedDate
        ? watchedItem.watchedDate.toISOString()
        : null;
      userState.userRating = userRating?.rating ?? null;
      userState.userReview = userReview?.review ?? null;
      userState.notes = watchlistItem?.notes || watchedItem?.notes || null;

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

        userState.franchiseInfo = {
          franchiseId: curatedUniverse.id,
          franchiseName: curatedUniverse.name,
          category: curatedUniverse.category,
          sequenceNumber: currentIdx !== -1 ? currentIdx + 1 : (franchiseEntry?.sequenceNumber || 1),
          totalParts: curatedUniverse.items.length,
          watchedCount,
          progressPercentage: Math.round((watchedCount / curatedUniverse.items.length) * 100),
          watched: watchedSet.has(tmdbId),
          items: curatedUniverse.items.map((it) => ({
            id: it.tmdbId,
            tmdbId: it.tmdbId,
            title: it.title,
            year: it.year,
            role: it.role,
            media_type: it.media_type || "movie",
            posterPath: it.posterPath,
            sequence: it.sequence,
            isWatched: watchedSet.has(it.tmdbId),
          })),
        };
      } else if (franchiseEntry) {
        userState.franchiseInfo = {
          franchiseId: franchiseEntry.franchiseId,
          franchiseName: franchiseEntry.franchise.name,
          sequenceNumber: franchiseEntry.sequenceNumber,
          watched: franchiseEntry.watched,
        };
      }
    } else {
      if (curatedUniverse) {
        const currentIdx = curatedUniverse.items.findIndex((it) => it.tmdbId === tmdbId);
        userState.franchiseInfo = {
          franchiseId: curatedUniverse.id,
          franchiseName: curatedUniverse.name,
          category: curatedUniverse.category,
          sequenceNumber: currentIdx !== -1 ? currentIdx + 1 : 1,
          totalParts: curatedUniverse.items.length,
          watchedCount: 0,
          progressPercentage: 0,
          watched: false,
          items: curatedUniverse.items.map((it) => ({
            id: it.tmdbId,
            tmdbId: it.tmdbId,
            title: it.title,
            year: it.year,
            role: it.role,
            media_type: it.media_type || "movie",
            posterPath: it.posterPath,
            sequence: it.sequence,
            isWatched: false,
          })),
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: tmdbData,
      contentType: validContentType,
      userState,
    });
  } catch (error: any) {
    console.error(`GET /api/content/${params.type}/${params.id} error:`, error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
