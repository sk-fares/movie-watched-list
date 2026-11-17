import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/session";
import { getTrendingMovies, getTrendingTVShows } from "@/lib/tmdb";

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = (searchParams.get("type") || "movie").toLowerCase();
    const timeWindow = searchParams.get("timeWindow") === "day" ? "day" : "week";

    if (type === "tv" || type === "tvshow" || type === "series") {
      const data = await getTrendingTVShows(timeWindow);
      const tagged = (data.results || []).map((item: any) => ({
        ...item,
        media_type: "tv",
      }));
      return NextResponse.json({ ...data, results: tagged });
    }

    if (type === "all") {
      const [moviesData, tvData] = await Promise.all([
        getTrendingMovies(timeWindow).catch(() => ({ results: [] })),
        getTrendingTVShows(timeWindow).catch(() => ({ results: [] })),
      ]);

      const taggedMovies = (moviesData.results || []).map((m: any) => ({
        ...m,
        media_type: "movie",
      }));
      const taggedTV = (tvData.results || []).map((t: any) => ({
        ...t,
        media_type: "tv",
      }));

      // Interleave / sort by popularity
      const combined = [...taggedMovies, ...taggedTV].sort(
        (a, b) => (b.popularity || 0) - (a.popularity || 0)
      );

      return NextResponse.json({
        page: 1,
        results: combined,
        total_pages: Math.max(moviesData.total_pages || 1, tvData.total_pages || 1),
        total_results:
          (moviesData.total_results || 0) + (tvData.total_results || 0),
      });
    }

    // Default: movie
    const data = await getTrendingMovies(timeWindow);
    const tagged = (data.results || []).map((item: any) => ({
      ...item,
      media_type: "movie",
    }));
    return NextResponse.json({ ...data, results: tagged });
  } catch (error: any) {
    console.error("TMDB Trending Route Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch trending titles" },
      { status: 500 }
    );
  }
}
