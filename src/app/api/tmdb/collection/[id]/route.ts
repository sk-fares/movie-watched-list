import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, getUserId } from "@/lib/session";
import { getCollection } from "@/lib/tmdb";
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
    const collectionId = parseInt(params.id, 10);

    if (isNaN(collectionId) || collectionId <= 0) {
      return NextResponse.json(
        { error: "Invalid collection ID" },
        { status: 400 }
      );
    }

    const collection = await getCollection(collectionId);
    if (!collection || !collection.id) {
      return NextResponse.json(
        { error: "Franchise collection not found" },
        { status: 404 }
      );
    }

    const rawParts: any[] = collection.parts || [];

    // Sort parts chronologically by release date for sequential viewing
    const sortedParts = [...rawParts].sort((a, b) => {
      const dateA = a.release_date || "9999-99-99";
      const dateB = b.release_date || "9999-99-99";
      return dateA.localeCompare(dateB);
    });

    const partTmdbIds = sortedParts.map((p) => p.id);

    // Look up user's watched items, watchlist items, and existing tracked franchise
    const [watchedItems, watchlistItems, trackedFranchise] = await Promise.all([
      prisma.watchedItem.findMany({
        where: {
          userId,
          contentType: "movie",
          tmdbId: { in: partTmdbIds },
        },
        select: {
          tmdbId: true,
          watchedDate: true,
          chronoPosition: true,
          id: true,
        },
      }),
      prisma.watchlistItem.findMany({
        where: {
          userId,
          contentType: "movie",
          tmdbId: { in: partTmdbIds },
        },
        select: {
          tmdbId: true,
          id: true,
        },
      }),
      prisma.franchise.findFirst({
        where: {
          tmdbCollectionId: collectionId,
          userId,
        },
        include: {
          entries: {
            orderBy: { sequenceNumber: "asc" },
          },
        },
      }),
    ]);

    const watchedMap = new Map(watchedItems.map((w) => [w.tmdbId, w]));
    const watchlistMap = new Map(watchlistItems.map((w) => [w.tmdbId, w]));

    // Construct sequential entries
    const entries = sortedParts.map((part, index) => {
      const sequenceNumber = index + 1;
      const watched = watchedMap.get(part.id);
      const watchlisted = watchlistMap.get(part.id);

      return {
        ...part,
        media_type: "movie",
        sequenceNumber,
        isWatched: Boolean(watched),
        watchedDate: watched?.watchedDate || null,
        watchedItemId: watched?.id || null,
        chronoPosition: watched?.chronoPosition || null,
        isWatchlisted: Boolean(watchlisted),
        watchlistItemId: watchlisted?.id || null,
      };
    });

    const totalParts = entries.length;
    const watchedCount = entries.filter((e) => e.isWatched).length;
    const progressPercentage =
      totalParts > 0 ? Math.round((watchedCount / totalParts) * 100) : 0;
    const nextToWatch = entries.find((e) => !e.isWatched) || null;

    return NextResponse.json({
      id: collection.id,
      name: collection.name,
      overview: collection.overview,
      poster_path: collection.poster_path,
      backdrop_path: collection.backdrop_path,
      totalParts,
      watchedCount,
      progressPercentage,
      isCompleted: totalParts > 0 && watchedCount === totalParts,
      nextToWatch,
      isTracked: Boolean(trackedFranchise),
      trackedFranchiseId: trackedFranchise?.id || null,
      entries,
    });
  } catch (error: any) {
    console.error("TMDB Collection Detail Route Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch collection details" },
      { status: 500 }
    );
  }
}

// POST endpoint: Track this TMDB collection into user's Franchises
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = getUserId(session);
    const collectionId = parseInt(params.id, 10);

    if (isNaN(collectionId) || collectionId <= 0) {
      return NextResponse.json(
        { error: "Invalid collection ID" },
        { status: 400 }
      );
    }

    const collection = await getCollection(collectionId);
    if (!collection || !collection.id) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }

    const rawParts: any[] = collection.parts || [];
    const sortedParts = [...rawParts].sort((a, b) => {
      const dateA = a.release_date || "9999-99-99";
      const dateB = b.release_date || "9999-99-99";
      return dateA.localeCompare(dateB);
    });

    // Check which parts are already watched
    const partTmdbIds = sortedParts.map((p) => p.id);
    const watchedRecords = await prisma.watchedItem.findMany({
      where: {
        userId,
        contentType: "movie",
        tmdbId: { in: partTmdbIds },
      },
      select: {
        tmdbId: true,
        watchedDate: true,
      },
    });
    const watchedMap = new Map(watchedRecords.map((w) => [w.tmdbId, w]));

    // Upsert the Franchise record
    let franchise = await prisma.franchise.findFirst({
      where: {
        tmdbCollectionId: collectionId,
        userId,
      },
    });

    if (!franchise) {
      franchise = await prisma.franchise.create({
        data: {
          tmdbCollectionId: collectionId,
          name: collection.name,
          overview: collection.overview || null,
          posterPath: collection.poster_path || null,
          backdropPath: collection.backdrop_path || null,
          userId,
        },
      });
    } else {
      franchise = await prisma.franchise.update({
        where: { id: franchise.id },
        data: {
          name: collection.name,
          overview: collection.overview || null,
          posterPath: collection.poster_path || null,
          backdropPath: collection.backdrop_path || null,
        },
      });
    }

    // Upsert individual franchise entries with sequential numbers
    for (let i = 0; i < sortedParts.length; i++) {
      const part = sortedParts[i];
      const sequenceNumber = i + 1;
      const watched = watchedMap.get(part.id);

      await prisma.franchiseEntry.upsert({
        where: {
          franchiseId_tmdbId: {
            franchiseId: franchise.id,
            tmdbId: part.id,
          },
        },
        update: {
          title: part.title,
          sequenceNumber,
          releaseDate: part.release_date || null,
          posterPath: part.poster_path || null,
          watched: Boolean(watched),
          watchedDate: watched?.watchedDate || null,
        },
        create: {
          franchiseId: franchise.id,
          contentType: "movie",
          tmdbId: part.id,
          title: part.title,
          sequenceNumber,
          releaseDate: part.release_date || null,
          posterPath: part.poster_path || null,
          watched: Boolean(watched),
          watchedDate: watched?.watchedDate || null,
          userId,
        },
      });
    }

    const fullFranchise = await prisma.franchise.findUnique({
      where: { id: franchise.id },
      include: {
        entries: {
          orderBy: { sequenceNumber: "asc" },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Franchise tracked successfully",
      franchise: fullFranchise,
    });
  } catch (error: any) {
    console.error("Track Franchise Route Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to track franchise" },
      { status: 500 }
    );
  }
}
