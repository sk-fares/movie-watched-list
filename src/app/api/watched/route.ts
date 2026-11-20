import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, getUserId } from "@/lib/session";
import prisma from "@/lib/prisma";
import { autoLinkMovieToSeries } from "@/lib/movie-series-detector";

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = getUserId(session);

    const { searchParams } = new URL(req.url);
    const contentType = searchParams.get("contentType");
    const franchiseId = searchParams.get("franchiseId");
    const search = searchParams.get("search");
    const minRating = searchParams.get("minRating");
    const sortBy = searchParams.get("sortBy") || "chronoPosition"; // chronoPosition | watchedDate | rating | title | releaseDate
    const order = searchParams.get("order") || "desc"; // desc | asc
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const skip = (page - 1) * limit;

    // Build filter
    const where: any = {
      userId,
    };

    if (contentType && contentType !== "all") {
      where.contentType = contentType;
    }

    if (franchiseId) {
      where.franchiseId = franchiseId;
    }

    if (search && search.trim() !== "") {
      where.title = {
        contains: search.trim(),
        mode: "insensitive",
      };
    }

    // Determine sort for Prisma
    let orderBy: any = {};
    if (sortBy === "watchedDate") {
      orderBy = { watchedDate: order === "asc" ? "asc" : "desc" };
    } else if (sortBy === "title") {
      orderBy = { title: order === "desc" ? "desc" : "asc" };
    } else if (sortBy === "releaseDate") {
      orderBy = { releaseDate: order === "asc" ? "asc" : "desc" };
    } else if (sortBy === "chronoPosition") {
      orderBy = { chronoPosition: order === "asc" ? "asc" : "desc" };
    } else {
      // For rating or fallback
      orderBy = { chronoPosition: "desc" };
    }

    const [items, total] = await Promise.all([
      prisma.watchedItem.findMany({
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
              numberOfEpisodes: true,
            },
          },
        },
      }),
      prisma.watchedItem.count({ where }),
    ]);

    // Fetch user ratings and reviews for these items
    const tmdbIds = items.map((i) => i.tmdbId);
    const [userRatings, userReviews, franchises] = await Promise.all([
      tmdbIds.length > 0
        ? prisma.userRating.findMany({
            where: {
              userId,
              tmdbId: { in: tmdbIds },
            },
          })
        : [],
      tmdbIds.length > 0
        ? prisma.userReview.findMany({
            where: {
              userId,
              tmdbId: { in: tmdbIds },
            },
          })
        : [],
      prisma.franchise.findMany({
        where: { userId },
        select: {
          id: true,
          name: true,
          tmdbCollectionId: true,
        },
      }),
    ]);

    const ratingMap = new Map(
      userRatings.map((r) => [`${r.contentType}_${r.tmdbId}`, r.rating])
    );
    const reviewMap = new Map(
      userReviews.map((r) => [`${r.contentType}_${r.tmdbId}`, r.review])
    );
    const franchiseMap = new Map(franchises.map((f) => [f.id, f.name]));

    let enrichedItems = items.map((item) => {
      const userRating =
        ratingMap.get(`${item.contentType}_${item.tmdbId}`) || null;
      const userReview =
        reviewMap.get(`${item.contentType}_${item.tmdbId}`) || null;
      const franchiseName = item.franchiseId
        ? franchiseMap.get(item.franchiseId) || null
        : item.movie?.collectionName || null;

      return {
        id: item.id,
        tmdbId: item.tmdbId,
        contentType: item.contentType as "movie" | "tvshow" | "season" | "episode",
        title: item.title,
        posterPath: item.posterPath,
        backdropPath: item.movie?.backdropPath || item.tvShow?.backdropPath || null,
        releaseDate: item.releaseDate,
        voteAverage: item.voteAverage,
        genres: item.genres,
        runtime: item.movie?.runtime || null,
        watchedDate: item.watchedDate.toISOString(),
        chronoPosition: item.chronoPosition,
        franchiseId: item.franchiseId,
        franchiseSeq: item.franchiseSeq,
        franchiseName,
        userRating,
        userReview,
        notes: item.notes,
        createdAt: item.createdAt.toISOString(),
      };
    });

    // Handle minRating filter if specified
    if (minRating) {
      const min = parseFloat(minRating);
      if (!isNaN(min)) {
        enrichedItems = enrichedItems.filter(
          (item) => item.userRating !== null && item.userRating >= min
        );
      }
    }

    // Handle rating sort in memory if requested
    if (sortBy === "rating") {
      enrichedItems.sort((a, b) => {
        const ratingA = a.userRating ?? -1;
        const ratingB = b.userRating ?? -1;
        return order === "asc" ? ratingA - ratingB : ratingB - ratingA;
      });
    }

    // Calculate user history statistics
    const allUserWatched = await prisma.watchedItem.findMany({
      where: { userId },
      select: {
        contentType: true,
        movie: { select: { runtime: true } },
      },
    });

    const allRatings = await prisma.userRating.findMany({
      where: { userId },
      select: { rating: true },
    });

    const totalMovies = allUserWatched.filter((i) => i.contentType === "movie").length;
    const totalSeries = allUserWatched.filter((i) => i.contentType === "tvshow").length;
    const totalWatchTimeMinutes = allUserWatched.reduce(
      (sum, item) => sum + (item.movie?.runtime || 0),
      0
    );
    const avgRating =
      allRatings.length > 0
        ? allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length
        : 0;

    const stats = {
      totalWatched: allUserWatched.length,
      totalMovies,
      totalSeries,
      totalWatchTimeMinutes,
      averageRating: parseFloat(avgRating.toFixed(1)),
    };

    return NextResponse.json({
      items: enrichedItems,
      total,
      page,
      limit,
      stats,
    });
  } catch (error: any) {
    console.error("GET /api/watched error:", error);
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
      watchedDate,
      rating,
      notes,
      review,
      franchiseId,
      franchiseSeq,
      removeFromWatchlist = true,
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
    const validContentType =
      contentType === "tvshow"
        ? "tvshow"
        : contentType === "season"
        ? "season"
        : contentType === "episode"
        ? "episode"
        : "movie";

    const parsedWatchedDate = watchedDate ? new Date(watchedDate) : new Date();

    // 1. Assign chronoPosition (increment from max for this user)
    const lastWatched = await prisma.watchedItem.findFirst({
      where: { userId },
      orderBy: { chronoPosition: "desc" },
      select: { chronoPosition: true },
    });
    const nextChronoPosition = (lastWatched?.chronoPosition ?? 0) + 1;

    // 2. Upsert Movie or TVShow records
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
    } else if (validContentType === "tvshow") {
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

    // 3. Auto-detect Movie Series template and link related movies from watched history
    let resolvedFranchiseId = franchiseId || null;
    let resolvedFranchiseSeq = franchiseSeq ? Number(franchiseSeq) : null;

    if (validContentType === "movie") {
      try {
        const autoLink = await autoLinkMovieToSeries(userId, numericTmdbId, {
          title,
          releaseDate,
          posterPath,
          collectionId: collectionId ? Number(collectionId) : null,
          collectionName,
        });
        if (autoLink.franchiseId) {
          resolvedFranchiseId = autoLink.franchiseId;
          resolvedFranchiseSeq = autoLink.franchiseSeq;
        }
      } catch (linkErr) {
        console.error("autoLinkMovieToSeries non-fatal error:", linkErr);
      }
    }

    if (!resolvedFranchiseId) {
      const franchiseEntry = await prisma.franchiseEntry.findFirst({
        where: {
          tmdbId: numericTmdbId,
          userId,
        },
        include: {
          franchise: true,
        },
      });

      if (franchiseEntry) {
        resolvedFranchiseId = franchiseEntry.franchiseId;
        resolvedFranchiseSeq = franchiseEntry.sequenceNumber;
        await prisma.franchiseEntry.update({
          where: { id: franchiseEntry.id },
          data: {
            watched: true,
            watchedDate: parsedWatchedDate,
          },
        });
      } else if (collectionId) {
        const existingFranchise = await prisma.franchise.findFirst({
          where: {
            tmdbCollectionId: Number(collectionId),
            userId,
          },
        });
        if (existingFranchise) {
          resolvedFranchiseId = existingFranchise.id;
        }
      }
    }

    // 4. Check if item already exists in watched history
    const existingWatched = await prisma.watchedItem.findUnique({
      where: {
        userId_contentType_tmdbId: {
          userId,
          contentType: validContentType,
          tmdbId: numericTmdbId,
        },
      },
    });

    let watchedItem;
    if (existingWatched) {
      // Re-watch / update watched item
      watchedItem = await prisma.watchedItem.update({
        where: { id: existingWatched.id },
        data: {
          watchedDate: parsedWatchedDate,
          notes: notes !== undefined ? notes : existingWatched.notes,
          franchiseId: resolvedFranchiseId ?? existingWatched.franchiseId,
          franchiseSeq: resolvedFranchiseSeq ?? existingWatched.franchiseSeq,
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
    } else {
      // Create new watched item with sequential chronoPosition
      watchedItem = await prisma.watchedItem.create({
        data: {
          userId,
          contentType: validContentType,
          movieId,
          tvShowId,
          tmdbId: numericTmdbId,
          title,
          posterPath: posterPath || null,
          releaseDate: releaseDate || null,
          voteAverage: voteAverage !== undefined ? Number(voteAverage) : null,
          genres: genresString,
          watchedDate: parsedWatchedDate,
          chronoPosition: nextChronoPosition,
          franchiseId: resolvedFranchiseId,
          franchiseSeq: resolvedFranchiseSeq,
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
    }

    // 5. Upsert UserRating if provided
    let savedRating: number | null = null;
    if (rating !== undefined && rating !== null && rating !== "") {
      const numRating = Number(rating);
      if (!isNaN(numRating) && numRating >= 0.5 && numRating <= 10) {
        const userRating = await prisma.userRating.upsert({
          where: {
            userId_contentType_tmdbId: {
              userId,
              contentType: validContentType,
              tmdbId: numericTmdbId,
            },
          },
          update: {
            rating: numRating,
            movieId,
            tvShowId,
          },
          create: {
            userId,
            contentType: validContentType,
            movieId,
            tvShowId,
            tmdbId: numericTmdbId,
            rating: numRating,
          },
        });
        savedRating = userRating.rating;
      }
    }

    // 6. Upsert UserReview if provided
    let savedReview: string | null = null;
    const reviewContent = review || (notes && notes.length > 50 ? notes : null);
    if (reviewContent && reviewContent.trim() !== "") {
      const userReview = await prisma.userReview.upsert({
        where: {
          userId_contentType_tmdbId: {
            userId,
            contentType: validContentType,
            tmdbId: numericTmdbId,
          },
        },
        update: {
          review: reviewContent.trim(),
          movieId,
          tvShowId,
        },
        create: {
          userId,
          contentType: validContentType,
          movieId,
          tvShowId,
          tmdbId: numericTmdbId,
          review: reviewContent.trim(),
        },
      });
      savedReview = userReview.review;
    }

    // 7. Remove from watchlist if requested
    if (removeFromWatchlist) {
      await prisma.watchlistItem.deleteMany({
        where: {
          userId,
          contentType: validContentType,
          tmdbId: numericTmdbId,
        },
      });
    }

    const responseItem = {
      id: watchedItem.id,
      tmdbId: watchedItem.tmdbId,
      contentType: watchedItem.contentType,
      title: watchedItem.title,
      posterPath: watchedItem.posterPath,
      backdropPath: watchedItem.movie?.backdropPath || watchedItem.tvShow?.backdropPath || null,
      releaseDate: watchedItem.releaseDate,
      voteAverage: watchedItem.voteAverage,
      genres: watchedItem.genres,
      runtime: watchedItem.movie?.runtime || null,
      watchedDate: watchedItem.watchedDate.toISOString(),
      chronoPosition: watchedItem.chronoPosition,
      franchiseId: watchedItem.franchiseId,
      franchiseSeq: watchedItem.franchiseSeq,
      userRating: savedRating,
      userReview: savedReview,
      notes: watchedItem.notes,
      createdAt: watchedItem.createdAt.toISOString(),
    };

    return NextResponse.json(responseItem, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/watched error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}


export async function DELETE(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = getUserId(session);
    const { searchParams } = new URL(req.url);
    const tmdbId = searchParams.get("tmdbId");
    const contentType = searchParams.get("contentType");

    if (!tmdbId) {
      return NextResponse.json({ error: "tmdbId is required" }, { status: 400 });
    }

    const where: any = {
      userId,
      tmdbId: Number(tmdbId),
    };
    if (contentType) {
      where.contentType = contentType;
    }

    // Also update any matching franchise entry to watched: false
    const watchedItems = await prisma.watchedItem.findMany({ where });
    for (const w of watchedItems) {
      if (w.franchiseId) {
        await prisma.franchiseEntry.updateMany({
          where: {
            franchiseId: w.franchiseId,
            tmdbId: w.tmdbId,
            userId,
          },
          data: {
            watched: false,
            watchedDate: null,
          },
        });
      }
    }

    await prisma.watchedItem.deleteMany({ where });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/watched error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
