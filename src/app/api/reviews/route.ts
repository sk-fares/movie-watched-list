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
      const userReview = await prisma.userReview.findUnique({
        where: {
          userId_contentType_tmdbId: {
            userId,
            contentType,
            tmdbId: Number(tmdbId),
          },
        },
      });

      return NextResponse.json({
        review: userReview ? userReview.review : null,
        createdAt: userReview?.createdAt || null,
        updatedAt: userReview?.updatedAt || null,
      });
    }

    // Fetch all user reviews
    const reviews = await prisma.userReview.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ reviews });
  } catch (error: any) {
    console.error("GET /api/reviews error:", error);
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
    const { contentType = "movie", tmdbId, review } = body;

    if (!tmdbId || review === undefined || review === null) {
      return NextResponse.json(
        { error: "tmdbId and review are required" },
        { status: 400 }
      );
    }

    const reviewText = String(review).trim();
    if (reviewText.length === 0) {
      return NextResponse.json(
        { error: "Review cannot be empty" },
        { status: 400 }
      );
    }

    const numericTmdbId = Number(tmdbId);
    const validContentType = contentType === "tvshow" ? "tvshow" : "movie";

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

    const userReview = await prisma.userReview.upsert({
      where: {
        userId_contentType_tmdbId: {
          userId,
          contentType: validContentType,
          tmdbId: numericTmdbId,
        },
      },
      update: {
        review: reviewText,
        ...(movieId ? { movieId } : {}),
        ...(tvShowId ? { tvShowId } : {}),
      },
      create: {
        userId,
        contentType: validContentType,
        movieId,
        tvShowId,
        tmdbId: numericTmdbId,
        review: reviewText,
      },
    });

    return NextResponse.json({ success: true, review: userReview });
  } catch (error: any) {
    console.error("POST /api/reviews error:", error);
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
      await prisma.userReview.deleteMany({
        where: { id, userId },
      });
      return NextResponse.json({ success: true, message: "Review deleted" });
    }

    if (contentType && tmdbId) {
      await prisma.userReview.deleteMany({
        where: {
          userId,
          contentType,
          tmdbId: Number(tmdbId),
        },
      });
      return NextResponse.json({ success: true, message: "Review deleted" });
    }

    return NextResponse.json(
      { error: "id or (contentType and tmdbId) required" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("DELETE /api/reviews error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
