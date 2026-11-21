import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, getUserId } from "@/lib/session";
import prisma from "@/lib/prisma";
import { getCollection } from "@/lib/tmdb";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

async function searchTMDBCollections(query: string) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) throw new Error("TMDB_API_KEY is not configured");

  const url = new URL(`${TMDB_BASE_URL}/search/collection`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("language", "en-US");
  url.searchParams.set("query", query);
  url.searchParams.set("page", "1");

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) {
    throw new Error(`TMDB Collection Search error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// ─── GET /api/franchise ──────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = getUserId(session);

    const { searchParams } = new URL(req.url);
    const searchTMDB = searchParams.get("searchTMDB");
    const previewCollectionId = searchParams.get("previewCollectionId");

    // 1. Search TMDB Collections
    if (searchTMDB && searchTMDB.trim() !== "") {
      try {
        const searchResults = await searchTMDBCollections(searchTMDB.trim());
        return NextResponse.json({
          success: true,
          results: searchResults.results || [],
          page: searchResults.page,
          totalPages: searchResults.total_pages,
        });
      } catch (tmdbError: any) {
        console.error("TMDB collection search error:", tmdbError);
        return NextResponse.json(
          { error: tmdbError?.message || "Failed to search TMDB collections" },
          { status: 502 }
        );
      }
    }

    // 2. Preview TMDB Collection with chronological parts
    if (previewCollectionId) {
      try {
        const numericId = parseInt(previewCollectionId, 10);
        const collection = await getCollection(numericId);

        // Sort parts by release date ascending
        const sortedParts = (collection.parts || []).sort((a: any, b: any) => {
          const dateA = a.release_date || "9999-99-99";
          const dateB = b.release_date || "9999-99-99";
          return dateA.localeCompare(dateB);
        });

        // Check user's watched status for these parts
        const partIds = sortedParts.map((p: any) => p.id);
        const userWatched = await prisma.watchedItem.findMany({
          where: {
            userId,
            tmdbId: { in: partIds },
          },
          select: { tmdbId: true, watchedDate: true },
        });
        const watchedMap = new Map(userWatched.map((w) => [w.tmdbId, w.watchedDate]));

        const previewEntries = sortedParts.map((part: any, index: number) => ({
          sequenceNumber: index + 1,
          tmdbId: part.id,
          title: part.title || part.original_title,
          releaseDate: part.release_date || null,
          posterPath: part.poster_path || null,
          backdropPath: part.backdrop_path || null,
          overview: part.overview || null,
          voteAverage: part.vote_average || null,
          watched: watchedMap.has(part.id),
          watchedDate: watchedMap.get(part.id) || null,
        }));

        return NextResponse.json({
          success: true,
          collection: {
            id: collection.id,
            name: collection.name,
            overview: collection.overview,
            posterPath: collection.poster_path,
            backdropPath: collection.backdrop_path,
            partsCount: previewEntries.length,
            entries: previewEntries,
          },
        });
      } catch (previewErr: any) {
        console.error("Collection preview error:", previewErr);
        return NextResponse.json(
          { error: previewErr?.message || "Failed to preview collection" },
          { status: 502 }
        );
      }
    }

    // 3. Get all user's franchises with ordered entries & computed stats
    const franchises = await prisma.franchise.findMany({
      where: { userId },
      include: {
        entries: {
          orderBy: { sequenceNumber: "asc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const enrichedFranchises = franchises.map((f) => {
      const totalEntries = f.entries.length;
      const watchedCount = f.entries.filter((e) => e.watched).length;
      const progressPercentage =
        totalEntries > 0 ? Math.round((watchedCount / totalEntries) * 100) : 0;
      const nextUnwatched = f.entries.find((e) => !e.watched) || null;
      const isCompleted = totalEntries > 0 && watchedCount === totalEntries;

      // Extract release year span
      const validDates = f.entries
        .map((e) => e.releaseDate)
        .filter(Boolean) as string[];
      let releaseSpan = "N/A";
      if (validDates.length > 0) {
        const years = validDates
          .map((d) => new Date(d).getFullYear())
          .filter((y) => !isNaN(y))
          .sort((a, b) => a - b);
        if (years.length === 1) {
          releaseSpan = String(years[0]);
        } else if (years.length > 1) {
          releaseSpan = `${years[0]} - ${years[years.length - 1]}`;
        }
      }

      return {
        id: f.id,
        tmdbCollectionId: f.tmdbCollectionId,
        name: f.name,
        overview: f.overview,
        posterPath: f.posterPath,
        backdropPath: f.backdropPath,
        userId: f.userId,
        createdAt: f.createdAt.toISOString(),
        updatedAt: f.updatedAt.toISOString(),
        totalEntries,
        watchedCount,
        progressPercentage,
        isCompleted,
        releaseSpan,
        nextUnwatched: nextUnwatched
          ? {
              id: nextUnwatched.id,
              sequenceNumber: nextUnwatched.sequenceNumber,
              tmdbId: nextUnwatched.tmdbId,
              title: nextUnwatched.title,
              releaseDate: nextUnwatched.releaseDate,
              posterPath: nextUnwatched.posterPath,
            }
          : null,
        entries: f.entries.map((entry) => ({
          id: entry.id,
          franchiseId: entry.franchiseId,
          sequenceNumber: entry.sequenceNumber,
          contentType: entry.contentType,
          tmdbId: entry.tmdbId,
          title: entry.title,
          releaseDate: entry.releaseDate,
          posterPath: entry.posterPath,
          watched: entry.watched,
          watchedDate: entry.watchedDate ? entry.watchedDate.toISOString() : null,
          createdAt: entry.createdAt.toISOString(),
        })),
      };
    });

    return NextResponse.json({
      success: true,
      franchises: enrichedFranchises,
      totalFranchises: enrichedFranchises.length,
    });
  } catch (error: any) {
    console.error("GET /api/franchise error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── POST /api/franchise ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = getUserId(session);

    const body = await req.json();
    const { tmdbCollectionId, name, overview, posterPath, backdropPath, entries } = body;

    // ─── OPTION A: Import TMDB Collection by ID ─────────────────────────────────
    if (tmdbCollectionId) {
      const collectionIdNum = Number(tmdbCollectionId);

      // Check if user already added this collection
      const existingForUser = await prisma.franchise.findFirst({
        where: {
          userId,
          tmdbCollectionId: collectionIdNum,
        },
      });

      if (existingForUser) {
        return NextResponse.json(
          {
            error: "You already have this franchise in your vault.",
            franchiseId: existingForUser.id,
          },
          { status: 409 }
        );
      }

      // Fetch official TMDB collection data
      const tmdbCollection = await getCollection(collectionIdNum);
      if (!tmdbCollection || !tmdbCollection.parts) {
        return NextResponse.json(
          { error: "TMDB Collection not found or has no parts." },
          { status: 404 }
        );
      }

      // Sort parts chronologically by release_date ascending (Crucial sequential system)
      const sortedParts = (tmdbCollection.parts || []).sort((a: any, b: any) => {
        const dateA = a.release_date || "9999-99-99";
        const dateB = b.release_date || "9999-99-99";
        return dateA.localeCompare(dateB);
      });

      if (sortedParts.length === 0) {
        return NextResponse.json(
          { error: "The TMDB Collection contains no entries." },
          { status: 400 }
        );
      }

      // Query user's existing watched history to automatically mark watched entries
      const partTmdbIds = sortedParts.map((p: any) => p.id);
      const watchedRecords = await prisma.watchedItem.findMany({
        where: {
          userId,
          tmdbId: { in: partTmdbIds },
        },
      });
      const watchedMap = new Map(
        watchedRecords.map((w) => [w.tmdbId, w.watchedDate])
      );

      // Upsert movies in DB for foreign key / detail linking
      for (const part of sortedParts) {
        await prisma.movie.upsert({
          where: { tmdbId: part.id },
          update: {
            title: part.title || part.original_title,
            posterPath: part.poster_path || null,
            backdropPath: part.backdrop_path || null,
            releaseDate: part.release_date || null,
            voteAverage: part.vote_average || null,
            collectionId: collectionIdNum,
            collectionName: tmdbCollection.name,
          },
          create: {
            tmdbId: part.id,
            title: part.title || part.original_title,
            posterPath: part.poster_path || null,
            backdropPath: part.backdrop_path || null,
            releaseDate: part.release_date || null,
            voteAverage: part.vote_average || null,
            overview: part.overview || null,
            collectionId: collectionIdNum,
            collectionName: tmdbCollection.name,
          },
        });
      }

      // Create Franchise and ordered FranchiseEntry items in a single transaction
      const newFranchise = await prisma.franchise.create({
        data: {
          name: tmdbCollection.name,
          overview: tmdbCollection.overview || null,
          posterPath: tmdbCollection.poster_path || null,
          backdropPath: tmdbCollection.backdrop_path || null,
          tmdbCollectionId: collectionIdNum,
          userId,
          entries: {
            create: sortedParts.map((part: any, index: number) => {
              const isWatched = watchedMap.has(part.id);
              return {
                sequenceNumber: index + 1,
                contentType: "movie",
                tmdbId: part.id,
                title: part.title || part.original_title,
                releaseDate: part.release_date || null,
                posterPath: part.poster_path || null,
                watched: isWatched,
                watchedDate: isWatched ? watchedMap.get(part.id) : null,
                userId,
              };
            }),
          },
        },
        include: {
          entries: {
            orderBy: { sequenceNumber: "asc" },
          },
        },
      });

      return NextResponse.json(
        {
          success: true,
          message: `Successfully imported "${newFranchise.name}" with ${newFranchise.entries.length} sequential entries.`,
          franchise: newFranchise,
        },
        { status: 201 }
      );
    }

    // ─── OPTION B: Custom Franchise Creation ────────────────────────────────────
    if (!name || name.trim() === "") {
      return NextResponse.json(
        { error: "Franchise name is required." },
        { status: 400 }
      );
    }

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json(
        { error: "At least one entry is required for a custom franchise." },
        { status: 400 }
      );
    }

    // Sort provided entries by sequenceNumber or by release date
    const sortedCustomEntries = [...entries].sort((a, b) => {
      if (a.sequenceNumber !== undefined && b.sequenceNumber !== undefined) {
        return a.sequenceNumber - b.sequenceNumber;
      }
      const dateA = a.releaseDate || "9999-99-99";
      const dateB = b.releaseDate || "9999-99-99";
      return dateA.localeCompare(dateB);
    });

    // Check user's watched items
    const customTmdbIds = sortedCustomEntries.map((e) => Number(e.tmdbId));
    const userWatchedCustom = await prisma.watchedItem.findMany({
      where: {
        userId,
        tmdbId: { in: customTmdbIds },
      },
    });
    const watchedCustomMap = new Map(
      userWatchedCustom.map((w) => [w.tmdbId, w.watchedDate])
    );

    const createdFranchise = await prisma.franchise.create({
      data: {
        name: name.trim(),
        overview: overview || null,
        posterPath: posterPath || null,
        backdropPath: backdropPath || null,
        userId,
        entries: {
          create: sortedCustomEntries.map((entry, index) => {
            const numId = Number(entry.tmdbId);
            const isWatched = entry.watched !== undefined ? Boolean(entry.watched) : watchedCustomMap.has(numId);
            return {
              sequenceNumber: index + 1,
              contentType: entry.contentType || "movie",
              tmdbId: numId,
              title: entry.title,
              releaseDate: entry.releaseDate || null,
              posterPath: entry.posterPath || null,
              watched: isWatched,
              watchedDate: isWatched
                ? entry.watchedDate
                  ? new Date(entry.watchedDate)
                  : watchedCustomMap.get(numId) || new Date()
                : null,
              userId,
            };
          }),
        },
      },
      include: {
        entries: {
          orderBy: { sequenceNumber: "asc" },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `Successfully created custom franchise "${createdFranchise.name}".`,
        franchise: createdFranchise,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/franchise error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
