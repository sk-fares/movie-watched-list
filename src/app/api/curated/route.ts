import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/session";
import {
  getCuratedPage,
  getUniverseForItem,
  ALL_CURATED_UNIVERSES,
  MOVIE_FRANCHISES,
  SERIES_UNIVERSES,
  ANIME_FRANCHISES,
} from "@/lib/curated-watchlist-data";

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const universeId = searchParams.get("universeId");
    const tmdbId = searchParams.get("tmdbId");
    const category = (searchParams.get("category") || "movie") as any;
    const tab = searchParams.get("tab") || "popular";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const filterYear = searchParams.get("year") || "";
    const filterGenre = parseInt(searchParams.get("genre") || "0", 10) || 0;
    const sortBy = searchParams.get("sort_by") || "popularity.desc";
    const searchQuery = searchParams.get("q") || "";

    // 1. If looking up universe by tmdbId or universeId
    if (universeId) {
      const match = ALL_CURATED_UNIVERSES.find((u) => u.id === universeId);
      if (match) {
        return NextResponse.json({ success: true, universe: match });
      }
      return NextResponse.json({ error: "Universe not found" }, { status: 404 });
    }

    if (tmdbId) {
      const idNum = parseInt(tmdbId, 10);
      const universe = getUniverseForItem(idNum);
      if (universe) {
        return NextResponse.json({ success: true, universe });
      }
      return NextResponse.json({ error: "No universe found for this title" }, { status: 404 });
    }

    // 2. If requesting list of all universes (for Franchises section)
    if (searchParams.get("universes") === "true") {
      let universes = ALL_CURATED_UNIVERSES;
      if (category === "movie") universes = MOVIE_FRANCHISES;
      else if (category === "series" || category === "tv") universes = SERIES_UNIVERSES;
      else if (category === "anime") universes = ANIME_FRANCHISES;

      return NextResponse.json({
        success: true,
        universes: universes.map((u) => ({
          id: u.id,
          name: u.name,
          category: u.category,
          section: u.section,
          overview: u.overview,
          posterPath: u.posterPath,
          totalItems: u.items.length,
          items: u.items,
        })),
      });
    }

    // 3. Paginated curated feed
    const data = getCuratedPage({
      category,
      tab,
      page,
      filterGenre,
      filterYear,
      sortBy,
      searchQuery,
    });

    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (error: any) {
    console.error("Curated API error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to load curated compendium" },
      { status: 500 }
    );
  }
}
