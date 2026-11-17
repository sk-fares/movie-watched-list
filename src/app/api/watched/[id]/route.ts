import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, getUserId } from "@/lib/session";
import prisma from "@/lib/prisma";

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = getUserId(session);
    const { id } = params;

    const item = await prisma.watchedItem.findFirst({
      where: {
        id,
        userId,
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
            numberOfSeasons: true,
            numberOfEpisodes: true,
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: "Watched item not found" },
        { status: 404 }
      );
    }

    const [userRating, userReview] = await Promise.all([
      prisma.userRating.findUnique({
        where: {
          userId_contentType_tmdbId: {
            userId,
            contentType: item.contentType,
            tmdbId: item.tmdbId,
          },
        },
      }),
      prisma.userReview.findUnique({
        where: {
          userId_contentType_tmdbId: {
            userId,
            contentType: item.contentType,
            tmdbId: item.tmdbId,
          },
        },
      }),
    ]);

    const formattedItem = {
      id: item.id,
      tmdbId: item.tmdbId,
      contentType: item.contentType,
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
      franchiseName: item.movie?.collectionName || null,
      userRating: userRating?.rating || null,
      userReview: userReview?.review || null,
      notes: item.notes,
      createdAt: item.createdAt.toISOString(),
    };

    return NextResponse.json(formattedItem);
  } catch (error: any) {
    console.error("GET /api/watched/[id] error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = getUserId(session);
    const { id } = params;

    const existing = await prisma.watchedItem.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Watched item not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const {
      watchedDate,
      notes,
      rating,
      review,
      chronoPosition,
      franchiseSeq,
    } = body;

    // Handle rating update
    let updatedRating: number | null = null;
    if (rating !== undefined) {
      if (rating === null || rating === "") {
        await prisma.userRating.deleteMany({
          where: {
            userId,
            contentType: existing.contentType,
            tmdbId: existing.tmdbId,
          },
        });
      } else {
        const numRating = Number(rating);
        if (!isNaN(numRating) && numRating >= 0.5 && numRating <= 10) {
          const r = await prisma.userRating.upsert({
            where: {
              userId_contentType_tmdbId: {
                userId,
                contentType: existing.contentType,
                tmdbId: existing.tmdbId,
              },
            },
            update: { rating: numRating },
            create: {
              userId,
              contentType: existing.contentType,
              movieId: existing.movieId,
              tvShowId: existing.tvShowId,
              tmdbId: existing.tmdbId,
              rating: numRating,
            },
          });
          updatedRating = r.rating;
        }
      }
    }

    // Handle review update
    let updatedReview: string | null = null;
    if (review !== undefined) {
      if (review === null || review.trim() === "") {
        await prisma.userReview.deleteMany({
          where: {
            userId,
            contentType: existing.contentType,
            tmdbId: existing.tmdbId,
          },
        });
      } else {
        const r = await prisma.userReview.upsert({
          where: {
            userId_contentType_tmdbId: {
              userId,
              contentType: existing.contentType,
              tmdbId: existing.tmdbId,
            },
          },
          update: { review: review.trim() },
          create: {
            userId,
            contentType: existing.contentType,
            movieId: existing.movieId,
            tvShowId: existing.tvShowId,
            tmdbId: existing.tmdbId,
            review: review.trim(),
          },
        });
        updatedReview = r.review;
      }
    }

    const updated = await prisma.watchedItem.update({
      where: { id },
      data: {
        ...(watchedDate ? { watchedDate: new Date(watchedDate) } : {}),
        ...(notes !== undefined ? { notes: notes === null ? null : String(notes) } : {}),
        ...(chronoPosition !== undefined ? { chronoPosition: Number(chronoPosition) } : {}),
        ...(franchiseSeq !== undefined
          ? { franchiseSeq: franchiseSeq === null ? null : Number(franchiseSeq) }
          : {}),
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

    return NextResponse.json({
      id: updated.id,
      tmdbId: updated.tmdbId,
      contentType: updated.contentType,
      title: updated.title,
      posterPath: updated.posterPath,
      backdropPath: updated.movie?.backdropPath || updated.tvShow?.backdropPath || null,
      releaseDate: updated.releaseDate,
      voteAverage: updated.voteAverage,
      genres: updated.genres,
      runtime: updated.movie?.runtime || null,
      watchedDate: updated.watchedDate.toISOString(),
      chronoPosition: updated.chronoPosition,
      franchiseId: updated.franchiseId,
      franchiseSeq: updated.franchiseSeq,
      userRating: updatedRating,
      userReview: updatedReview,
      notes: updated.notes,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (error: any) {
    console.error("PATCH /api/watched/[id] error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = getUserId(session);
    const { id } = params;

    const existing = await prisma.watchedItem.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Watched item not found" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(req.url);
    const restoreToWatchlist = searchParams.get("restoreToWatchlist") === "true";

    if (restoreToWatchlist) {
      await prisma.watchlistItem.upsert({
        where: {
          userId_contentType_tmdbId: {
            userId,
            contentType: existing.contentType,
            tmdbId: existing.tmdbId,
          },
        },
        update: {},
        create: {
          userId,
          contentType: existing.contentType,
          movieId: existing.movieId,
          tvShowId: existing.tvShowId,
          seasonId: existing.seasonId,
          tmdbId: existing.tmdbId,
          title: existing.title,
          posterPath: existing.posterPath,
          releaseDate: existing.releaseDate,
          voteAverage: existing.voteAverage,
          genres: existing.genres,
          priority: 0,
          notes: existing.notes,
        },
      });
    }

    // Reset franchise entry watched state if linked
    await prisma.franchiseEntry.updateMany({
      where: {
        userId,
        tmdbId: existing.tmdbId,
      },
      data: {
        watched: false,
        watchedDate: null,
      },
    });

    await prisma.watchedItem.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: restoreToWatchlist
        ? "Moved item back to watchlist"
        : "Item removed from watched history",
    });
  } catch (error: any) {
    console.error("DELETE /api/watched/[id] error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
