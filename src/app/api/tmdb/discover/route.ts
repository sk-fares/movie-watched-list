import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/session";
import { discoverMovies, discoverTVShows } from "@/lib/tmdb";

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = (searchParams.get("type") || "movie").toLowerCase();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const sortBy = searchParams.get("sort_by") || "popularity.desc";
    const withGenres = searchParams.get("with_genres") || "";
    const year = searchParams.get("year") || "";
    const voteAverageGte = searchParams.get("vote_average_gte") || "";
    const voteCountGte = searchParams.get("vote_count_gte") || "";

    const tmdbParams: Record<string, string> = {
      page: String(page),
      sort_by: sortBy,
    };

    if (withGenres) tmdbParams.with_genres = withGenres;
    if (voteAverageGte) tmdbParams["vote_average.gte"] = voteAverageGte;
    if (voteCountGte) tmdbParams["vote_count.gte"] = voteCountGte;

    let data;
    if (type === "tv" || type === "tvshow" || type === "series") {
      if (year) tmdbParams.first_air_date_year = year;
      data = await discoverTVShows(tmdbParams);
      const tagged = (data.results || []).map((item: any) => ({
        ...item,
        media_type: "tv",
      }));
      return NextResponse.json({ ...data, results: tagged });
    }

    // Default: movie
    if (year) tmdbParams.primary_release_year = year;
    data = await discoverMovies(tmdbParams);
    const tagged = (data.results || []).map((item: any) => ({
      ...item,
      media_type: "movie",
    }));
    return NextResponse.json({ ...data, results: tagged });
  } catch (error: any) {
    console.error("TMDB Discover Route Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to discover content" },
      { status: 500 }
    );
  }
}
