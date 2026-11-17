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

    const item = await prisma.watchlistItem.findFirst({
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
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: "Watchlist item not found" },
        { status: 404 }
      );
    }

    const userRating = await prisma.userRating.findUnique({
      where: {
        userId_contentType_tmdbId: {
          userId,
          contentType: item.contentType,
          tmdbId: item.tmdbId,
        },
      },
    });

    const formattedItem = {
      id: item.id,
      tmdbId: item.tmdbId,
      contentType: item.contentType as "movie" | "tvshow",
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
      userRating: userRating?.rating || null,
      collectionId: item.movie?.collectionId || null,
      collectionName: item.movie?.collectionName || null,
    };

    return NextResponse.json(formattedItem);
  } catch (error: any) {
    console.error("GET /api/watchlist/[id] error:", error);
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

    const existing = await prisma.watchlistItem.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Watchlist item not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { priority, notes } = body;

    const updated = await prisma.watchlistItem.update({
      where: { id },
      data: {
        ...(priority !== undefined ? { priority: Number(priority) } : {}),
        ...(notes !== undefined ? { notes: notes === null ? null : String(notes) } : {}),
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
      overview: updated.overview,
      releaseDate: updated.releaseDate,
      voteAverage: updated.voteAverage,
      genres: updated.genres,
      runtime: updated.movie?.runtime || null,
      priority: updated.priority,
      notes: updated.notes,
      addedAt: updated.addedAt.toISOString(),
      collectionId: updated.movie?.collectionId || null,
      collectionName: updated.movie?.collectionName || null,
    });
  } catch (error: any) {
    console.error("PATCH /api/watchlist/[id] error:", error);
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

    const existing = await prisma.watchlistItem.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Watchlist item not found" },
        { status: 404 }
      );
    }

    await prisma.watchlistItem.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Item removed from watchlist",
    });
  } catch (error: any) {
    console.error("DELETE /api/watchlist/[id] error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
