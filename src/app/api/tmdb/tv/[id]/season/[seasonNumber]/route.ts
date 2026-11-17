import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, getUserId } from "@/lib/session";
import { getTVSeasonDetails } from "@/lib/tmdb";
import prisma from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string; seasonNumber: string } }
) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = getUserId(session);
    const tvId = parseInt(params.id, 10);
    const seasonNumber = parseInt(params.seasonNumber, 10);

    if (isNaN(tvId) || tvId <= 0 || isNaN(seasonNumber) || seasonNumber < 0) {
      return NextResponse.json(
        { error: "Invalid TV show ID or season number" },
        { status: 400 }
      );
    }

    const season = await getTVSeasonDetails(tvId, seasonNumber);
    if (!season || !season.id) {
      return NextResponse.json(
        { error: "Season not found" },
        { status: 404 }
      );
    }

    // Check if the entire season is marked watched
    const watchedSeason = await prisma.watchedItem.findFirst({
      where: {
        userId,
        contentType: "season",
        tmdbId: season.id,
      },
    });

    // Check if any specific episodes are watched
    const episodeIds = (season.episodes || []).map((ep: any) => ep.id);
    const watchedEpisodes = await prisma.watchedItem.findMany({
      where: {
        userId,
        contentType: "episode",
        tmdbId: { in: episodeIds },
      },
      select: {
        tmdbId: true,
      },
    });

    const watchedEpSet = new Set(watchedEpisodes.map((we) => we.tmdbId));

    const enrichedEpisodes = (season.episodes || []).map((ep: any) => ({
      ...ep,
      watched: watchedSeason ? true : watchedEpSet.has(ep.id),
    }));

    return NextResponse.json({
      ...season,
      isWatched: Boolean(watchedSeason),
      episodes: enrichedEpisodes,
      watchedEpisodesCount: watchedSeason
        ? season.episodes?.length || 0
        : watchedEpisodes.length,
    });
  } catch (error: any) {
    console.error("TMDB TV Season Detail Route Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch TV season details" },
      { status: 500 }
    );
  }
}
