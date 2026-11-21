import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/session";
import { discoverMovies, discoverTVShows } from "@/lib/tmdb";
import { getCuratedPage, enrichWithUniverseInfo } from "@/lib/curated-watchlist-data";

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
    const withoutGenres = searchParams.get("without_genres") || "";
    const withOriginalLanguage = searchParams.get("with_original_language") || "";
    const withoutOriginalLanguage = searchParams.get("without_original_language") || "";
    const year = searchParams.get("year") || "";
    const voteAverageGte = searchParams.get("vote_average_gte") || "";
    const voteCountGte = searchParams.get("vote_count_gte") || "";
    const forceTmdb = searchParams.get("force_tmdb") === "true";

    const isTv = type === "tv" || type === "tvshow" || type === "series";

    // 1. Detect category for Curated Compendium (PDF Master Watchlist)
    let curatedCategory: any = isTv ? "series" : "movie";
    const hasAnimationGenre = withGenres.split(",").includes("16");

    if (isTv) {
      if (hasAnimationGenre && withOriginalLanguage === "ja") {
        curatedCategory = "anime_series";
      } else if (hasAnimationGenre && withoutOriginalLanguage === "ja") {
        curatedCategory = "animated_series";
      } else if (hasAnimationGenre) {
        curatedCategory = "anime_series";
      } else {
        curatedCategory = "series";
      }
    } else {
      if (hasAnimationGenre && withOriginalLanguage === "ja") {
        curatedCategory = "anime_movies";
      } else if (hasAnimationGenre) {
        curatedCategory = "animated_movies";
      } else {
        curatedCategory = "movie";
      }
    }

    // 2. Check if we should serve Curated Compendium on beginning pages
    // The user explicitly requested to show the Master Watchlist and complete film/series franchises on the beginning pages!
    if (!forceTmdb) {
      const parsedGenre = withGenres && !withGenres.includes(",") ? parseInt(withGenres, 10) : 0;
      const curated = getCuratedPage({
        category: curatedCategory,
        page,
        pageSize: 20,
        filterGenre: parsedGenre > 0 && parsedGenre !== 16 ? parsedGenre : 0,
        filterYear: year,
        sortBy,
      });

      if (curated && curated.results && curated.results.length > 0) {
        // Tag and enrich results
        const enrichedResults = curated.results.map((item) =>
          enrichWithUniverseInfo({
            ...item,
            media_type: isTv ? "tv" : "movie",
            contentType: isTv ? "tvshow" : "movie",
            vote_count: item.vote_count || 5000,
            vote_average: item.vote_average || 8.0,
          })
        );

        return NextResponse.json({
          page,
          results: enrichedResults,
          total_pages: Math.max(curated.total_pages + 50, 100),
          total_results: curated.total_results + 1000,
          source: "master_watchlist_curated",
        });
      }
    }

    // 3. Fallback / Subsequent Pages (> curated range or forceTmdb)
    // Strictly enforce minimum vote count so low-vote, unwatchable junk NEVER appears across 100 pages!
    const tmdbParams: Record<string, string> = {
      page: String(page),
      sort_by: sortBy,
      // Default minimum vote thresholds to eliminate obscure student films and random low-budget clutter
      "vote_count.gte": voteCountGte || (isTv ? "150" : "250"),
    };

    if (withGenres) tmdbParams.with_genres = withGenres;
    if (withoutGenres) tmdbParams.without_genres = withoutGenres;
    if (withOriginalLanguage) tmdbParams.with_original_language = withOriginalLanguage;
    if (withoutOriginalLanguage) tmdbParams.without_original_language = withoutOriginalLanguage;
    if (voteAverageGte) tmdbParams["vote_average.gte"] = voteAverageGte;
    if (voteCountGte) tmdbParams["vote_count.gte"] = voteCountGte;

    let data: any = { results: [], total_pages: 1, total_results: 0 };
    try {
      if (isTv) {
        if (year) tmdbParams.first_air_date_year = year;
        data = await discoverTVShows(tmdbParams);
      } else {
        if (year) tmdbParams.primary_release_year = year;
        data = await discoverMovies(tmdbParams);
      }
    } catch (tmdbErr) {
      console.warn("TMDB Discover API fetch warning, falling back to curated page:", tmdbErr);
      const fallbackCurated = getCuratedPage({
        category: curatedCategory,
        page: ((page - 1) % 10) + 1, // Loop through curated pages gracefully if TMDB is unavailable
        pageSize: 20,
      });
      return NextResponse.json({
        page,
        results: fallbackCurated.results.map((i) =>
          enrichWithUniverseInfo({
            ...i,
            media_type: isTv ? "tv" : "movie",
            contentType: isTv ? "tvshow" : "movie",
          })
        ),
        total_pages: 100,
        total_results: 2000,
        source: "master_watchlist_offline_fallback",
      });
    }

    // Tag and enrich each TMDB result with universe information
    const tagged = (data.results || []).map((item: any) =>
      enrichWithUniverseInfo({
        ...item,
        media_type: isTv ? "tv" : "movie",
        contentType: isTv ? "tvshow" : "movie",
      })
    );

    return NextResponse.json({
      ...data,
      results: tagged,
      source: "tmdb_quality_filtered",
    });
  } catch (error: any) {
    console.error("TMDB Discover Route Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to discover content" },
      { status: 500 }
    );
  }
}
