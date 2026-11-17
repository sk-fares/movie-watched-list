"use client";

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Film,
  Flame,
  Star,
  PlaySquare,
  Calendar,
  Search,
  X,
  Filter,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MovieCard } from "@/components/movie-card";
import { MovieDetailModal } from "@/components/movie-detail-modal";
import { EmptyState } from "@/components/empty-state";

type MovieTab = "popular" | "trending" | "top_rated" | "now_playing" | "upcoming";

const TABS: { id: MovieTab; label: string; icon: React.ElementType }[] = [
  { id: "popular", label: "Popular", icon: Flame },
  { id: "trending", label: "Trending", icon: Sparkles },
  { id: "top_rated", label: "Top Rated", icon: Star },
  { id: "now_playing", label: "Now Playing", icon: PlaySquare },
  { id: "upcoming", label: "Upcoming", icon: Calendar },
];

const MOVIE_GENRES = [
  { id: 0, name: "All Genres" },
  { id: 28, name: "Action" },
  { id: 12, name: "Adventure" },
  { id: 16, name: "Animation" },
  { id: 35, name: "Comedy" },
  { id: 80, name: "Crime" },
  { id: 99, name: "Documentary" },
  { id: 18, name: "Drama" },
  { id: 14, name: "Fantasy" },
  { id: 27, name: "Horror" },
  { id: 878, name: "Sci-Fi" },
  { id: 53, name: "Thriller" },
  { id: 10749, name: "Romance" },
  { id: 9648, name: "Mystery" },
];

const YEARS = [
  { value: "", label: "All Years" },
  { value: "2025", label: "2025" },
  { value: "2024", label: "2024" },
  { value: "2023", label: "2023" },
  { value: "2022", label: "2022" },
  { value: "2020", label: "2020" },
  { value: "2019", label: "2019" },
  { value: "2015", label: "2015" },
  { value: "2010", label: "2010" },
  { value: "2000", label: "2000" },
  { value: "1999", label: "1999" },
  { value: "1994", label: "1994" },
];

function MoviesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabParam = (searchParams.get("tab") as MovieTab) || "popular";

  // State
  const [activeTab, setActiveTab] = React.useState<MovieTab>(tabParam);
  const [page, setPage] = React.useState<number>(1);
  const [totalPages, setTotalPages] = React.useState<number>(1);
  const [selectedGenreId, setSelectedGenreId] = React.useState<number>(0);
  const [selectedYear, setSelectedYear] = React.useState<string>("");
  const [sortBy, setSortBy] = React.useState<string>("popularity.desc");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  const [movies, setMovies] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [selectedMovieId, setSelectedMovieId] = React.useState<number | null>(null);

  // Sync tab with URL
  React.useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
      setPage(1);
    }
  }, [tabParam]);

  // Fetch movies based on current tab, filters, page
  const fetchMovies = React.useCallback(async () => {
    setIsLoading(true);
    try {
      let url = "";
      const trimmedQuery = searchQuery.trim();

      if (trimmedQuery) {
        url = `/api/tmdb/search?q=${encodeURIComponent(trimmedQuery)}&type=movie&page=${page}`;
      } else if (activeTab === "trending") {
        url = `/api/tmdb/trending?type=movie&timeWindow=week`;
      } else if (activeTab === "top_rated") {
        url = `/api/tmdb/discover?type=movie&sort_by=vote_average.desc&vote_count_gte=350&page=${page}`;
        if (selectedGenreId > 0) url += `&with_genres=${selectedGenreId}`;
        if (selectedYear) url += `&year=${selectedYear}`;
      } else if (activeTab === "now_playing") {
        url = `/api/tmdb/discover?type=movie&sort_by=primary_release_date.desc&page=${page}`;
        if (selectedGenreId > 0) url += `&with_genres=${selectedGenreId}`;
      } else if (activeTab === "upcoming") {
        url = `/api/tmdb/discover?type=movie&sort_by=popularity.desc&page=${page}`;
        if (selectedGenreId > 0) url += `&with_genres=${selectedGenreId}`;
      } else {
        // Popular
        url = `/api/tmdb/discover?type=movie&sort_by=${sortBy}&page=${page}`;
        if (selectedGenreId > 0) url += `&with_genres=${selectedGenreId}`;
        if (selectedYear) url += `&year=${selectedYear}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch movies");

      const data = await res.json();
      const results = (data.results || []).map((m: any) => ({
        ...m,
        media_type: "movie",
      }));

      setMovies(results);
      setTotalPages(Math.min(data.total_pages || 1, 500));
    } catch (err) {
      console.error("Fetch movies error:", err);
      setMovies([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, page, selectedGenreId, selectedYear, sortBy, searchQuery]);

  React.useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);

  // Page change handler
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== page) {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Tab change handler
  const handleTabChange = (newTab: MovieTab) => {
    setActiveTab(newTab);
    setPage(1);
    setSearchQuery("");
    router.push(`/movies?tab=${newTab}`);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* ─── Header ─── */}
      <div className="border-b border-border/40 pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-400 mb-1">
          <Film className="h-4 w-4" />
          <span>Feature Films Catalog</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          Browse Movies
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Explore thousands of movies, box office hits, and hidden gems.
        </p>
      </div>

      {/* ─── Category Tabs ─── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-border/40 scrollbar-none">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all border",
                isActive
                  ? "bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/40"
                  : "bg-card/60 border-border/60 text-muted-foreground hover:text-white hover:bg-card"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─── Search & Filters Bar ─── */}
      <div className="rounded-2xl bg-card/60 backdrop-blur-md border border-border/60 p-4 sm:p-5 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search movies by title..."
              className="w-full rounded-xl bg-background/80 border border-border/80 pl-10 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setPage(1);
                }}
                className="absolute right-3.5 top-3 text-muted-foreground hover:text-white"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filters: Sort & Year */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Year Dropdown */}
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
                setPage(1);
              }}
              className="rounded-xl bg-background/80 border border-border/80 px-3 py-2.5 text-xs font-medium text-foreground focus:outline-none focus:border-purple-500"
            >
              {YEARS.map((y) => (
                <option key={y.value} value={y.value}>
                  {y.label}
                </option>
              ))}
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="rounded-xl bg-background/80 border border-border/80 px-3 py-2.5 text-xs font-medium text-foreground focus:outline-none focus:border-purple-500"
            >
              <option value="popularity.desc">Most Popular</option>
              <option value="vote_average.desc">Highest Rated</option>
              <option value="primary_release_date.desc">Newest Release</option>
              <option value="revenue.desc">Top Box Office</option>
            </select>
          </div>
        </div>

        {/* Genre Selector Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none">
          <span className="text-xs font-semibold text-muted-foreground shrink-0 mr-1 flex items-center gap-1">
            <Filter className="h-3 w-3 text-purple-400" />
            Genre:
          </span>
          {MOVIE_GENRES.map((g) => (
            <button
              key={g.id}
              onClick={() => {
                setSelectedGenreId(g.id);
                setPage(1);
              }}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all border shrink-0",
                selectedGenreId === g.id
                  ? "bg-purple-600 border-purple-500 text-white shadow-md shadow-purple-900/40"
                  : "bg-background/60 border-border/60 text-muted-foreground hover:text-white hover:border-purple-500/40"
              )}
            >
              {g.name}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Movie Grid ─── */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
            <div
              key={i}
              className="aspect-[2/3] rounded-2xl bg-card border border-border/40 animate-pulse"
            />
          ))}
        </div>
      ) : movies.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
          {movies.map((movie) => (
            <div
              key={movie.id}
              onClick={() => setSelectedMovieId(movie.id)}
              className="cursor-pointer"
            >
              <MovieCard item={movie} variant="grid" />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          preset="search"
          title="No movies found"
          description="We couldn't find any movies matching the selected filters. Try clearing your search or changing the genre."
          action={{
            label: "Reset Filters",
            onClick: () => {
              setSelectedGenreId(0);
              setSelectedYear("");
              setSearchQuery("");
              setPage(1);
            },
          }}
        />
      )}

      {/* ─── Pagination Controls ─── */}
      {!isLoading && movies.length > 0 && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/40 pt-6">
          <p className="text-xs text-muted-foreground">
            Page <span className="font-semibold text-white">{page}</span> of{" "}
            <span className="font-semibold text-white">{totalPages}</span>
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => handlePageChange(page - 1)}
              className="gap-1 bg-card/60 border-border/60"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous</span>
            </Button>

            {/* Quick Page Jump Buttons */}
            <div className="hidden sm:flex items-center gap-1">
              {[page - 1, page, page + 1]
                .filter((p) => p >= 1 && p <= totalPages)
                .map((p) => (
                  <button
                    key={p}
                    onClick={() => handlePageChange(p)}
                    className={cn(
                      "h-8 w-8 rounded-lg text-xs font-semibold transition-all",
                      p === page
                        ? "bg-purple-600 text-white shadow-md shadow-purple-900/40"
                        : "bg-card/60 text-muted-foreground hover:text-white"
                    )}
                  >
                    {p}
                  </button>
                ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => handlePageChange(page + 1)}
              className="gap-1 bg-card/60 border-border/60"
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ─── Detail Modal ─── */}
      {selectedMovieId && (
        <MovieDetailModal
          isOpen={Boolean(selectedMovieId)}
          onClose={() => setSelectedMovieId(null)}
          tmdbId={selectedMovieId}
          contentType="movie"
        />
      )}
    </div>
  );
}


export default function MoviesPage() {
  return (
    <Suspense fallback={<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">{[1,2,3,4,5,6,7,8,9,10,11,12].map(i => <div key={i} className="aspect-[2/3] rounded-2xl bg-card border border-border/40 animate-pulse" />)}</div>}>
      <MoviesPageContent />
    </Suspense>
  );
}
