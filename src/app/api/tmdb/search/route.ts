import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/session";
import { searchMovies, searchTVShows, multiSearch } from "@/lib/tmdb";

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || searchParams.get("q") || "";
    const type = (searchParams.get("type") || "multi").toLowerCase();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return NextResponse.json({
        page: 1,
        results: [],
        total_pages: 0,
        total_results: 0,
      });
    }

    let data;
    if (type === "movie") {
      data = await searchMovies(trimmedQuery, page);
    } else if (type === "tv" || type === "tvshow" || type === "series") {
      data = await searchTVShows(trimmedQuery, page);
    } else {
      data = await multiSearch(trimmedQuery, page);
    }

    // Filter out person media types if multiSearch returned them
    if (data?.results && Array.isArray(data.results)) {
      const filtered = data.results
        .filter((item: any) => {
          if (item.media_type === "person") return false;
          return Boolean(item.title || item.name);
        })
        .map((item: any) => ({
          ...item,
          media_type:
            item.media_type ||
            (item.title ? "movie" : item.name ? "tv" : "movie"),
        }));

      return NextResponse.json({
        ...data,
        results: filtered,
      });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("TMDB Search Route Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to search TMDB" },
      { status: 500 }
    );
  }
}
