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
    const tmdbId = searchParams.get("tmdbId");

    if (contentType && tmdbId) {
      const userRating = await prisma.userRating.findUnique({
        where: {
          userId_contentType_tmdbId: {
            userId,
            contentType,
            tmdbId: Number(tmdbId),
          },
        },
      });

      return NextResponse.json({
        rating: userRating ? userRating.rating : null,
      });
    }

    // Fetch all user ratings
    const ratings = await prisma.userRating.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ ratings });
  } catch (error: any) {
    console.error("GET /api/ratings error:", error);
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
    const { contentType = "movie", tmdbId, rating } = body;

    if (!tmdbId || rating === undefined || rating === null) {
      return NextResponse.json(
        { error: "tmdbId and rating are required" },
        { status: 400 }
      );
    }

    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 0.5 || numRating > 10) {
      return NextResponse.json(
        { error: "Rating must be a number between 0.5 and 10" },
        { status: 400 }
      );
    }

    const numericTmdbId = Number(tmdbId);
    const validContentType = contentType === "tvshow" ? "tvshow" : "movie";

    // Lookup movieId or tvShowId if existing
    let movieId: string | undefined;
    let tvShowId: string | undefined;

    if (validContentType === "movie") {
      const movie = await prisma.movie.findUnique({
        where: { tmdbId: numericTmdbId },
        select: { id: true },
      });
      movieId = movie?.id;
    } else {
      const tv = await prisma.tVShow.findUnique({
        where: { tmdbId: numericTmdbId },
        select: { id: true },
      });
      tvShowId = tv?.id;
    }

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
        ...(movieId ? { movieId } : {}),
        ...(tvShowId ? { tvShowId } : {}),
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

    return NextResponse.json({ success: true, rating: userRating });
  } catch (error: any) {
    console.error("POST /api/ratings error:", error);
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
    const contentType = searchParams.get("contentType");
    const tmdbId = searchParams.get("tmdbId");
    const id = searchParams.get("id");

    if (id) {
      await prisma.userRating.deleteMany({
        where: { id, userId },
      });
      return NextResponse.json({ success: true, message: "Rating deleted" });
    }

    if (contentType && tmdbId) {
      await prisma.userRating.deleteMany({
        where: {
          userId,
          contentType,
          tmdbId: Number(tmdbId),
        },
      });
      return NextResponse.json({ success: true, message: "Rating deleted" });
    }

    return NextResponse.json(
      { error: "id or (contentType and tmdbId) required" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("DELETE /api/ratings error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
