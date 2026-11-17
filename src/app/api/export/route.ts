import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, getUserId } from "@/lib/session";
import prisma from "@/lib/prisma";

function escapeCSV(value: any): string {
  if (value === null || value === undefined) return '""';
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = getUserId(session);

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "json"; // "json" | "csv"
    const type = searchParams.get("type") || "all"; // "all" | "watchlist" | "watched" | "franchises"

    // Fetch user profile and preferences
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        preferences: true,
      },
    });

    // Query relevant collections
    const [watchlistItems, watchedItems, franchises, ratings, reviews] =
      await Promise.all([
        type === "all" || type === "watchlist"
          ? prisma.watchlistItem.findMany({
              where: { userId },
              orderBy: { addedAt: "desc" },
            })
          : Promise.resolve([]),
        type === "all" || type === "watched"
          ? prisma.watchedItem.findMany({
              where: { userId },
              orderBy: { chronoPosition: "asc" },
            })
          : Promise.resolve([]),
        type === "all" || type === "franchises"
          ? prisma.franchise.findMany({
              where: { userId },
              include: {
                entries: {
                  orderBy: { sequenceNumber: "asc" },
                },
              },
            })
          : Promise.resolve([]),
        type === "all"
          ? prisma.userRating.findMany({ where: { userId } })
          : Promise.resolve([]),
        type === "all"
          ? prisma.userReview.findMany({ where: { userId } })
          : Promise.resolve([]),
      ]);

    const dateStamp = new Date().toISOString().split("T")[0];

    // ─── JSON EXPORT ─────────────────────────────────────────────────────────
    if (format === "json") {
      const exportData = {
        metadata: {
          application: "Movie Watched List",
          version: "1.0.0",
          exportDate: new Date().toISOString(),
          user: {
            name: user?.name,
            email: user?.email,
            memberSince: user?.createdAt?.toISOString(),
          },
          summary: {
            watchlistCount: watchlistItems.length,
            watchedCount: watchedItems.length,
            franchisesCount: franchises.length,
            ratingsCount: ratings.length,
            reviewsCount: reviews.length,
          },
        },
        preferences: user?.preferences || null,
        watchlist: watchlistItems.map((item) => ({
          tmdbId: item.tmdbId,
          contentType: item.contentType,
          title: item.title,
          posterPath: item.posterPath,
          releaseDate: item.releaseDate,
          voteAverage: item.voteAverage,
          genres: item.genres,
          priority: item.priority,
          notes: item.notes,
          addedAt: item.addedAt.toISOString(),
        })),
        watchedHistory: watchedItems.map((item) => ({
          chronoPosition: item.chronoPosition,
          tmdbId: item.tmdbId,
          contentType: item.contentType,
          title: item.title,
          releaseDate: item.releaseDate,
          posterPath: item.posterPath,
          voteAverage: item.voteAverage,
          watchedDate: item.watchedDate.toISOString(),
          franchiseId: item.franchiseId,
          franchiseSeq: item.franchiseSeq,
          notes: item.notes,
        })),
        franchises: franchises.map((f) => ({
          name: f.name,
          tmdbCollectionId: f.tmdbCollectionId,
          overview: f.overview,
          totalEntries: f.entries.length,
          watchedEntries: f.entries.filter((e) => e.watched).length,
          entries: f.entries.map((entry) => ({
            sequenceNumber: entry.sequenceNumber,
            tmdbId: entry.tmdbId,
            title: entry.title,
            contentType: entry.contentType,
            releaseDate: entry.releaseDate,
            watched: entry.watched,
            watchedDate: entry.watchedDate ? entry.watchedDate.toISOString() : null,
          })),
        })),
        ratings: ratings.map((r) => ({
          tmdbId: r.tmdbId,
          contentType: r.contentType,
          rating: r.rating,
          createdAt: r.createdAt.toISOString(),
        })),
        reviews: reviews.map((rev) => ({
          tmdbId: rev.tmdbId,
          contentType: rev.contentType,
          review: rev.review,
          createdAt: rev.createdAt.toISOString(),
        })),
      };

      const jsonString = JSON.stringify(exportData, null, 2);

      return new NextResponse(jsonString, {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="movie-watched-list-export-${dateStamp}.json"`,
        },
      });
    }

    // ─── CSV EXPORT ──────────────────────────────────────────────────────────
    const ratingMap = new Map(
      ratings.map((r) => [`${r.contentType}_${r.tmdbId}`, r.rating])
    );
    const franchiseMap = new Map(
      franchises.map((f) => [f.id, f.name])
    );

    const headers = [
      "Section",
      "TMDB_ID",
      "Content_Type",
      "Title",
      "Release_Date",
      "Watched_Date",
      "Chrono_Position",
      "User_Rating",
      "Franchise_Name",
      "Franchise_Sequence",
      "Priority",
      "Notes",
    ];

    const rows: string[] = [headers.join(",")];

    // 1. Watched Items rows
    for (const item of watchedItems) {
      const userRating = ratingMap.get(`${item.contentType}_${item.tmdbId}`) ?? "";
      const franchiseName = item.franchiseId ? franchiseMap.get(item.franchiseId) ?? "" : "";
      rows.push(
        [
          escapeCSV("Watched History"),
          escapeCSV(item.tmdbId),
          escapeCSV(item.contentType),
          escapeCSV(item.title),
          escapeCSV(item.releaseDate || ""),
          escapeCSV(item.watchedDate.toISOString()),
          escapeCSV(item.chronoPosition),
          escapeCSV(userRating),
          escapeCSV(franchiseName),
          escapeCSV(item.franchiseSeq || ""),
          escapeCSV(""),
          escapeCSV(item.notes || ""),
        ].join(",")
      );
    }

    // 2. Watchlist Items rows
    for (const item of watchlistItems) {
      const userRating = ratingMap.get(`${item.contentType}_${item.tmdbId}`) ?? "";
      rows.push(
        [
          escapeCSV("Watchlist"),
          escapeCSV(item.tmdbId),
          escapeCSV(item.contentType),
          escapeCSV(item.title),
          escapeCSV(item.releaseDate || ""),
          escapeCSV(""),
          escapeCSV(""),
          escapeCSV(userRating),
          escapeCSV(""),
          escapeCSV(""),
          escapeCSV(item.priority),
          escapeCSV(item.notes || ""),
        ].join(",")
      );
    }

    // 3. Franchise Entries rows
    for (const f of franchises) {
      for (const entry of f.entries) {
        rows.push(
          [
            escapeCSV(`Franchise: ${f.name}`),
            escapeCSV(entry.tmdbId),
            escapeCSV(entry.contentType),
            escapeCSV(entry.title),
            escapeCSV(entry.releaseDate || ""),
            escapeCSV(entry.watchedDate ? entry.watchedDate.toISOString() : ""),
            escapeCSV(""),
            escapeCSV(""),
            escapeCSV(f.name),
            escapeCSV(entry.sequenceNumber),
            escapeCSV(""),
            escapeCSV(entry.watched ? "Watched" : "Unwatched"),
          ].join(",")
        );
      }
    }

    const csvContent = rows.join("\r\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="movie-watched-list-export-${dateStamp}.csv"`,
      },
    });
  } catch (error: any) {
    console.error("GET /api/export error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
