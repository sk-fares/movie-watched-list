import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, getUserId } from "@/lib/session";
import prisma from "@/lib/prisma";
import { getMovieDetails, getTVShowDetails } from "@/lib/tmdb";

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
      userState.franchiseInfo = franchiseEntry
        ? {
            franchiseId: franchiseEntry.franchiseId,
            franchiseName: franchiseEntry.franchise.name,
            sequenceNumber: franchiseEntry.sequenceNumber,
            watched: franchiseEntry.watched,
          }
        : null;
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
