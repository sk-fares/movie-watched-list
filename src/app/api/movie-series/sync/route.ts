import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, getUserId } from "@/lib/session";
import { syncAndSequenceMovieSeries } from "@/lib/movie-series-detector";

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = getUserId(session);

    const seriesList = await syncAndSequenceMovieSeries(userId);

    return NextResponse.json({
      success: true,
      message: "Movie series sequence synced successfully",
      series: seriesList,
      totalSeries: seriesList.length,
    });
  } catch (error: any) {
    console.error("POST /api/movie-series/sync error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to sync movie series sequence" },
      { status: 500 }
    );
  }
}
