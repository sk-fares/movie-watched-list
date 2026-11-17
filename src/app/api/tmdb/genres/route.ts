import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/session";
import { getMovieGenres, getTVGenres } from "@/lib/tmdb";

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = (searchParams.get("type") || "all").toLowerCase();

    if (type === "movie") {
      const data = await getMovieGenres();
      return NextResponse.json({ genres: data.genres || [] });
    }

    if (type === "tv" || type === "tvshow" || type === "series") {
      const data = await getTVGenres();
      return NextResponse.json({ genres: data.genres || [] });
    }

    // Default: fetch both and merge
    const [movieData, tvData] = await Promise.all([
      getMovieGenres().catch(() => ({ genres: [] })),
      getTVGenres().catch(() => ({ genres: [] })),
    ]);

    const movieGenres = movieData.genres || [];
    const tvGenres = tvData.genres || [];

    // Combine unique by id
    const genreMap = new Map<number, string>();
    movieGenres.forEach((g: { id: number; name: string }) => {
      genreMap.set(g.id, g.name);
    });
    tvGenres.forEach((g: { id: number; name: string }) => {
      if (!genreMap.has(g.id)) {
        genreMap.set(g.id, g.name);
      }
    });

    const combinedGenres = Array.from(genreMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      genres: combinedGenres,
      movieGenres,
      tvGenres,
    });
  } catch (error: any) {
    console.error("TMDB Genres Route Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch genres" },
      { status: 500 }
    );
  }
}
