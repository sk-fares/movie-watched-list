import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, getUserId } from "@/lib/session";
import { syncAndSequenceMovieSeries } from "@/lib/movie-series-detector";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = getUserId(session);

    // Run auto-sync to ensure any recently added watched movies are properly sequenced
    const seriesList = await syncAndSequenceMovieSeries(userId);

    return NextResponse.json({
      success: true,
      series: seriesList,
      totalSeries: seriesList.length,
    });
  } catch (error: any) {
    console.error("GET /api/movie-series error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
