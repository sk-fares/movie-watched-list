import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, getUserId } from "@/lib/session";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = getUserId(session);

    const { searchParams } = new URL(req.url);
    const contentType = searchParams.get("contentType");
    const priority = searchParams.get("priority");
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sortBy") || "addedAt";
    const order = searchParams.get("order") || "desc";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const skip = (page - 1) * limit;

    // Build filter conditions
    const where: any = {
      userId,
    };

    if (contentType && contentType !== "all") {
      where.contentType = contentType;
    }

    if (priority !== null && priority !== undefined && priority !== "all" && priority !== "") {
      where.priority = parseInt(priority, 10);
    }

    if (search && search.trim() !== "") {
      where.title = {
        contains: search.trim(),
        mode: "insensitive",
      };
    }

    // Build sort options
    let orderBy: any = {};
    if (sortBy === "priority") {
      orderBy = { priority: order === "asc" ? "asc" : "desc" };
    } else if (sortBy === "title") {
      orderBy = { title: order === "desc" ? "desc" : "asc" };
    } else if (sortBy === "releaseDate") {
      orderBy = { releaseDate: order === "asc" ? "asc" : "desc" };
    } else if (sortBy === "voteAverage") {
      orderBy = { voteAverage: order === "asc" ? "asc" : "desc" };
    } else {
      orderBy = { addedAt: order === "asc" ? "asc" : "desc" };
    }

    // Query items and total count
    const [items, total] = await Promise.all([
      prisma.watchlistItem.findMany({
        where,
        orderBy,
        skip,
        take: limit,
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
      }),
      prisma.watchlistItem.count({ where }),
    ]);

    // Fetch user ratings for these items if any exist
    const tmdbIds = items.map((i) => i.tmdbId);
    const userRatings =
      tmdbIds.length > 0
        ? await prisma.userRating.findMany({
            where: {
              userId,
              tmdbId: { in: tmdbIds },
            },
          })
        : [];

    const ratingMap = new Map(
      userRatings.map((r) => [`${r.contentType}_${r.tmdbId}`, r.rating])
    );

    // Format items with computed runtime, backdropPath, userRating
    const formattedItems = items.map((item) => ({
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
      userRating: ratingMap.get(`${item.contentType}_${item.tmdbId}`) || null,
      collectionId: item.movie?.collectionId || null,
      collectionName: item.movie?.collectionName || null,
    }));

    return NextResponse.json({
      items: formattedItems,
      total,
      page,
      limit,
    });
  } catch (error: any) {
    console.error("GET /api/watchlist error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = getUserId(session);

    const body = await req.json();
    const {
      tmdbId,
      contentType = "movie",
      title,
      posterPath,
      backdropPath,
      overview,
      releaseDate,
      voteAverage,
      genres,
      priority = 0,
      notes,
      runtime,
      collectionId,
      collectionName,
    } = body;

    if (!tmdbId || !title) {
      return NextResponse.json(
        { error: "tmdbId and title are required" },
        { status: 400 }
      );
    }

    const numericTmdbId = Number(tmdbId);
    const validContentType = contentType === "tvshow" ? "tvshow" : "movie";

    // Check for duplicate in watchlist
    const existing = await prisma.watchlistItem.findUnique({
      where: {
        userId_contentType_tmdbId: {
          userId,
          contentType: validContentType,
          tmdbId: numericTmdbId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Item is already in your watchlist", item: existing },
        { status: 409 }
      );
    }

    // Upsert Movie or TVShow record for referential integrity
    let movieId: string | undefined;
    let tvShowId: string | undefined;

    const genresString =
      typeof genres === "string"
        ? genres
        : genres
        ? JSON.stringify(genres)
        : null;

    if (validContentType === "movie") {
      const movie = await prisma.movie.upsert({
        where: { tmdbId: numericTmdbId },
        update: {
          title,
          ...(posterPath ? { posterPath } : {}),
          ...(backdropPath ? { backdropPath } : {}),
          ...(overview ? { overview } : {}),
          ...(releaseDate ? { releaseDate } : {}),
          ...(voteAverage !== undefined ? { voteAverage: Number(voteAverage) } : {}),
          ...(genresString ? { genres: genresString } : {}),
          ...(runtime ? { runtime: Number(runtime) } : {}),
          ...(collectionId ? { collectionId: Number(collectionId) } : {}),
          ...(collectionName ? { collectionName } : {}),
        },
        create: {
          tmdbId: numericTmdbId,
          title,
          posterPath: posterPath || null,
          backdropPath: backdropPath || null,
          overview: overview || null,
          releaseDate: releaseDate || null,
          voteAverage: voteAverage !== undefined ? Number(voteAverage) : null,
          genres: genresString,
          runtime: runtime ? Number(runtime) : null,
          collectionId: collectionId ? Number(collectionId) : null,
          collectionName: collectionName || null,
        },
      });
      movieId = movie.id;
    } else {
      const tvShow = await prisma.tVShow.upsert({
        where: { tmdbId: numericTmdbId },
        update: {
          name: title,
          ...(posterPath ? { posterPath } : {}),
          ...(backdropPath ? { backdropPath } : {}),
          ...(overview ? { overview } : {}),
          ...(releaseDate ? { firstAirDate: releaseDate } : {}),
          ...(voteAverage !== undefined ? { voteAverage: Number(voteAverage) } : {}),
          ...(genresString ? { genres: genresString } : {}),
        },
        create: {
          tmdbId: numericTmdbId,
          name: title,
          posterPath: posterPath || null,
          backdropPath: backdropPath || null,
          overview: overview || null,
          firstAirDate: releaseDate || null,
          voteAverage: voteAverage !== undefined ? Number(voteAverage) : null,
          genres: genresString,
        },
      });
      tvShowId = tvShow.id;
    }

    // Create the watchlist item
    const newItem = await prisma.watchlistItem.create({
      data: {
        userId,
        contentType: validContentType,
        movieId,
        tvShowId,
        tmdbId: numericTmdbId,
        title,
        posterPath: posterPath || null,
        overview: overview || null,
        releaseDate: releaseDate || null,
        voteAverage: voteAverage !== undefined ? Number(voteAverage) : null,
        genres: genresString,
        priority: Number(priority) || 0,
        notes: notes || null,
      },
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
          },
        },
      },
    });

    const responseItem = {
      id: newItem.id,
      tmdbId: newItem.tmdbId,
      contentType: newItem.contentType as "movie" | "tvshow",
      title: newItem.title,
      posterPath: newItem.posterPath,
      backdropPath: newItem.movie?.backdropPath || newItem.tvShow?.backdropPath || null,
      overview: newItem.overview,
      releaseDate: newItem.releaseDate,
      voteAverage: newItem.voteAverage,
      genres: newItem.genres,
      runtime: newItem.movie?.runtime || null,
      priority: newItem.priority,
      notes: newItem.notes,
      addedAt: newItem.addedAt.toISOString(),
      collectionId: newItem.movie?.collectionId || null,
      collectionName: newItem.movie?.collectionName || null,
    };

    return NextResponse.json(responseItem, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/watchlist error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
