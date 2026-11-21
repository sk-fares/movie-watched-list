import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, getUserId } from "@/lib/session";
import { getMovieDetails, getCollection } from "@/lib/tmdb";
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
      return NextResponse.json({ error: "Invalid movie ID" }, { status: 400 });
    }

    const movie = await getMovieDetails(tmdbId);
    if (!movie || !movie.id) {
      return NextResponse.json({ error: "Movie not found" }, { status: 404 });
    }

    // Query user's watchlist, watched, and rating state in parallel
    const [watchlistItem, watchedItem, userRating] = await Promise.all([
      prisma.watchlistItem.findFirst({
        where: {
          userId,
          contentType: "movie",
          tmdbId,
        },
      }),
      prisma.watchedItem.findFirst({
        where: {
          userId,
          contentType: "movie",
          tmdbId,
        },
      }),
      prisma.userRating.findFirst({
        where: {
          userId,
          contentType: "movie",
          tmdbId,
        },
      }),
    ]);

    // Check franchise / collection info if belongs_to_collection exists
    let franchiseProgress = null;
    if (movie.belongs_to_collection?.id) {
      try {
        const collection = await getCollection(movie.belongs_to_collection.id);
        if (collection?.parts && Array.isArray(collection.parts)) {
          const partTmdbIds = collection.parts.map((p: any) => p.id);
          const watchedCollectionParts = await prisma.watchedItem.findMany({
            where: {
              userId,
              contentType: "movie",
              tmdbId: { in: partTmdbIds },
            },
            select: { tmdbId: true },
          });

          const watchedPartSet = new Set(
            watchedCollectionParts.map((w) => w.tmdbId)
          );

          // Chronologically ordered parts by release date
          const sortedParts = [...collection.parts].sort((a: any, b: any) =>
            (a.release_date || "").localeCompare(b.release_date || "")
          );

          const totalParts = sortedParts.length;
          const watchedCount = sortedParts.filter((p: any) =>
            watchedPartSet.has(p.id)
          ).length;

          const currentPartIndex = sortedParts.findIndex(
            (p: any) => p.id === tmdbId
          );

          franchiseProgress = {
            collectionId: collection.id,
            name: collection.name,
            totalParts,
            watchedCount,
            progressPercentage: Math.round((watchedCount / totalParts) * 100),
            sequenceNumber: currentPartIndex !== -1 ? currentPartIndex + 1 : null,
            isCurrentMovieWatched: watchedPartSet.has(tmdbId),
            items: sortedParts.map((p: any, idx: number) => ({
              id: p.id,
              title: p.title || p.name,
              year: (p.release_date || "").slice(0, 4),
              role: idx === 0 ? "Core" : "Sequel",
              media_type: "movie",
              poster_path: p.poster_path,
              sequence: idx + 1,
              isWatched: watchedPartSet.has(p.id),
            })),
          };
        }
      } catch (colErr) {
        console.warn("Could not fetch collection details for movie:", colErr);
      }
    }

    // Check curated compendium universe (expands beyond TMDB collection with full spin-offs, prequels, etc.)
    const curatedUniverse = getUniverseForItem(tmdbId, movie.title);
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
        sequenceNumber: currentIdx !== -1 ? currentIdx + 1 : (franchiseProgress?.sequenceNumber || null),
        isCurrentMovieWatched: watchedSet.has(tmdbId),
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
    }

    return NextResponse.json({
      ...movie,
      media_type: "movie",
      inWatchlist: Boolean(watchlistItem),
      watchlistItemId: watchlistItem?.id || null,
      inWatched: Boolean(watchedItem),
      watchedItemId: watchedItem?.id || null,
      chronoPosition: watchedItem?.chronoPosition || null,
      userRating: userRating?.rating ?? null,
      franchiseProgress,
    });
  } catch (error: any) {
    console.error("TMDB Movie Detail Route Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch movie details" },
      { status: 500 }
    );
  }
}
