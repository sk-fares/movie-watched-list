"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Compass,
  Search,
  X,
  TrendingUp,
  Star,
  Film,
  Tv,
  Calendar,
  Sparkles,
  ArrowRight,
  Filter,
  Play,
  Shuffle,
  Clock,
  Layers,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  cn,
  getImageUrl,
  getBackdropUrl,
  formatYear,
  formatRuntime,
  getRatingColor,
} from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MovieCard } from "@/components/movie-card";
import { GenreBadge } from "@/components/genre-badge";
import { MovieDetailModal } from "@/components/movie-detail-modal";
import { EmptyState } from "@/components/empty-state";

// Popular TMDB Genre IDs
const GENRE_LIST = [
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

export default function DiscoverPage() {
  // Search & Filter State
  const [searchQuery, setSearchQuery] = React.useState("");
  const [mediaType, setMediaType] = React.useState<"all" | "movie" | "tv">("all");
  const [selectedGenreId, setSelectedGenreId] = React.useState<number>(0);
  const [sortBy, setSortBy] = React.useState<string>("popularity.desc");
  const [trendingTime, setTrendingTime] = React.useState<"week" | "day">("week");

  // Content feeds
  const [featuredItem, setFeaturedItem] = React.useState<any>(null);
  const [trendingItems, setTrendingItems] = React.useState<any[]>([]);
  const [popularMovies, setPopularMovies] = React.useState<any[]>([]);
  const [popularSeries, setPopularSeries] = React.useState<any[]>([]);
  const [searchResults, setSearchResults] = React.useState<any[]>([]);
  const [genreResults, setGenreResults] = React.useState<any[]>([]);

  // User watch & watchlist status
  const [watchedIds, setWatchedIds] = React.useState<Set<number>>(new Set());
  const [watchlistIds, setWatchlistIds] = React.useState<Set<number>>(new Set());

  // Load user watch status
  React.useEffect(() => {
    Promise.all([
      fetch("/api/watched?limit=1000").then((r) => (r.ok ? r.json() : { items: [] })),
      fetch("/api/watchlist?limit=1000").then((r) => (r.ok ? r.json() : { items: [] })),
    ])
      .then(([watchedData, watchlistData]) => {
        setWatchedIds(new Set((watchedData.items || []).map((i: any) => Number(i.tmdbId))));
        setWatchlistIds(new Set((watchlistData.items || []).map((i: any) => Number(i.tmdbId))));
      })
      .catch((e) => console.error("Error loading user status in discover:", e));
  }, []);

  const handleWatchedChange = (itemId: number, isWatched: boolean) => {
    setWatchedIds((prev) => {
      const next = new Set(prev);
      if (isWatched) next.add(itemId);
      else next.delete(itemId);
      return next;
    });
  };

  const handleWatchlistChange = (itemId: number, inList: boolean) => {
    setWatchlistIds((prev) => {
      const next = new Set(prev);
      if (inList) next.add(itemId);
      else next.delete(itemId);
      return next;
    });
  };

  // Loading States
  const [isLoadingTrending, setIsLoadingTrending] = React.useState(true);
  const [isLoadingPopular, setIsLoadingPopular] = React.useState(true);
  const [isLoadingSearch, setIsLoadingSearch] = React.useState(false);
  const [isLoadingGenre, setIsLoadingGenre] = React.useState(false);

  // Detail Modal State
  const [selectedDetail, setSelectedDetail] = React.useState<{
    id: number;
    type: "movie" | "tv";
  } | null>(null);

  // Load Trending & Popular on initial mount
  React.useEffect(() => {
    let isMounted = true;
    setIsLoadingTrending(true);

    fetch(`/api/tmdb/trending?type=all&timeWindow=${trendingTime}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        const results = data.results || [];
        setTrendingItems(results);
        if (results.length > 0 && !featuredItem) {
          // Set featured spotlight item with high backdrop quality
          const topCandidate = results.find((r: any) => Boolean(r.backdrop_path)) || results[0];
          setFeaturedItem(topCandidate);
        }
      })
      .catch((err) => console.error("Trending fetch error:", err))
      .finally(() => {
        if (isMounted) setIsLoadingTrending(false);
      });

    return () => {
      isMounted = false;
    };
  }, [trendingTime]);

  // Fetch Popular Movies & TV Series
  React.useEffect(() => {
    let isMounted = true;
    setIsLoadingPopular(true);

    Promise.all([
      fetch("/api/tmdb/discover?type=movie&sort_by=popularity.desc&page=1").then((r) => r.json()),
      fetch("/api/tmdb/discover?type=tv&sort_by=popularity.desc&page=1").then((r) => r.json()),
    ])
      .then(([movieData, tvData]) => {
        if (!isMounted) return;
        setPopularMovies((movieData.results || []).slice(0, 10));
        setPopularSeries((tvData.results || []).slice(0, 10));
      })
      .catch((err) => console.error("Popular fetch error:", err))
      .finally(() => {
        if (isMounted) setIsLoadingPopular(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Handle Search input with debouncing
  React.useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      return;
    }

    setIsLoadingSearch(true);
    const timeout = setTimeout(async () => {
      try {
        const typeParam = mediaType === "all" ? "multi" : mediaType;
        const res = await fetch(
          `/api/tmdb/search?q=${encodeURIComponent(trimmed)}&type=${typeParam}`
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results || []);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsLoadingSearch(false);
      }
    }, 350);

    return () => clearTimeout(timeout);
  }, [searchQuery, mediaType]);

  // Handle Genre Selection Filter
  React.useEffect(() => {
    if (selectedGenreId === 0) {
      setGenreResults([]);
      return;
    }

    setIsLoadingGenre(true);
    const typeParam = mediaType === "tv" ? "tv" : "movie";
    fetch(
      `/api/tmdb/discover?type=${typeParam}&with_genres=${selectedGenreId}&sort_by=${sortBy}&page=1`
    )
      .then((res) => res.json())
      .then((data) => {
        setGenreResults(data.results || []);
      })
      .catch((err) => console.error("Genre filter error:", err))
      .finally(() => setIsLoadingGenre(false));
  }, [selectedGenreId, mediaType, sortBy]);

  const isFilteringActive = Boolean(searchQuery.trim() || selectedGenreId !== 0);

  return (
    <div className="space-y-10 animate-fade-in pb-16">
      {/* ─── Hero Spotlight: Featured Title ─── */}
      {!isFilteringActive && featuredItem && (
        <div className="relative w-full rounded-3xl overflow-hidden border border-purple-800/30 bg-card shadow-2xl shadow-purple-950/30">
          <div className="relative h-[360px] sm:h-[440px] md:h-[500px] w-full">
            {featuredItem.backdrop_path ? (
              <Image
                src={getBackdropUrl(featuredItem.backdrop_path, "w1280")}
                alt={featuredItem.title || featuredItem.name}
                fill
                className="object-cover object-center"
                priority
              />
            ) : null}

            {/* Cinematic Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />

            {/* Spotlight Content Overlay */}
            <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10 md:p-12 max-w-3xl">
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-600/90 text-white shadow-lg shadow-purple-900/50">
                  <Sparkles className="h-3.5 w-3.5" />
                  Featured Spotlight
                </span>
                <span className="text-xs font-medium text-purple-300 bg-purple-950/60 px-2.5 py-0.5 rounded-full border border-purple-800/40">
                  {featuredItem.media_type === "tv" ? "TV Series" : "Movie"}
                </span>
                {featuredItem.vote_average > 0 && (
                  <span className="text-xs font-bold text-amber-400 bg-black/60 px-2.5 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                    <Star className="h-3 w-3 fill-amber-400" />
                    {featuredItem.vote_average.toFixed(1)}
                  </span>
                )}
              </div>

              <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-2 leading-tight drop-shadow-md">
                {featuredItem.title || featuredItem.name}
              </h1>

              <p className="text-sm sm:text-base text-zinc-300 line-clamp-2 sm:line-clamp-3 mb-6 max-w-2xl leading-relaxed">
                {featuredItem.overview}
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={() =>
                    setSelectedDetail({
                      id: featuredItem.id,
                      type: featuredItem.media_type === "tv" ? "tv" : "movie",
                    })
                  }
                  className="gap-2 bg-purple-600 hover:bg-purple-700 text-white shadow-xl shadow-purple-900/40 px-6 py-2.5"
                >
                  <Play className="h-4 w-4 fill-white translate-x-0.5" />
                  <span>View Details & Trailer</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    fetch("/api/watchlist", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        tmdbId: featuredItem.id,
                        contentType:
                          featuredItem.media_type === "tv" ? "tvshow" : "movie",
                        title: featuredItem.title || featuredItem.name,
                        posterPath: featuredItem.poster_path,
                        backdropPath: featuredItem.backdrop_path,
                        overview: featuredItem.overview,
                        releaseDate:
                          featuredItem.release_date ||
                          featuredItem.first_air_date,
                        voteAverage: featuredItem.vote_average,
                      }),
                    })
                      .then((r) => {
                        if (r.ok) toast.success("Added to Watchlist!");
                        else toast.error("Could not add to watchlist");
                      })
                      .catch(() => toast.error("Failed to add"));
                  }}
                  className="bg-black/40 backdrop-blur-md border-white/20 text-white hover:bg-black/60 hover:text-white"
                >
                  + Add to Watchlist
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Search & Filters Control Bar ─── */}
      <div className="space-y-4 rounded-2xl bg-card/60 backdrop-blur-md border border-border/60 p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, franchise, or actor across all TMDB titles..."
              className="w-full rounded-xl bg-background/80 border border-border/80 pl-10 pr-10 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-3.5 text-muted-foreground hover:text-white transition-colors"
                aria-label="Clear search input"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Media Type Buttons: All / Movies / Series */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-background/80 border border-border/70 shrink-0">
            <button
              onClick={() => setMediaType("all")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all",
                mediaType === "all"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-white"
              )}
            >
              All Types
            </button>
            <button
              onClick={() => setMediaType("movie")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1",
                mediaType === "movie"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-white"
              )}
            >
              <Film className="h-3 w-3" />
              <span>Movies</span>
            </button>
            <button
              onClick={() => setMediaType("tv")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1",
                mediaType === "tv"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-white"
              )}
            >
              <Tv className="h-3 w-3" />
              <span>Series</span>
            </button>
          </div>
        </div>

        {/* Horizontal Scrollable Genre Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-2 scrollbar-none">
          <span className="text-xs font-semibold text-muted-foreground shrink-0 mr-1 flex items-center gap-1">
            <Filter className="h-3 w-3 text-purple-400" />
            Genres:
          </span>
          {GENRE_LIST.map((genre) => (
            <button
              key={genre.id}
              onClick={() => setSelectedGenreId(genre.id)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all border shrink-0",
                selectedGenreId === genre.id
                  ? "bg-purple-600 border-purple-500 text-white shadow-md shadow-purple-900/40 scale-105"
                  : "bg-background/60 border-border/60 text-muted-foreground hover:text-white hover:border-purple-500/40"
              )}
            >
              {genre.name}
            </button>
          ))}
        </div>
      </div>

      {/* ─── DYNAMIC RESULTS SECTION (Search or Genre Filter) ─── */}
      {isFilteringActive && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                <span>
                  {searchQuery.trim()
                    ? `Search results for "${searchQuery.trim()}"`
                    : `Filtered by: ${
                        GENRE_LIST.find((g) => g.id === selectedGenreId)?.name
                      }`}
                </span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Showing matching titles from TMDB
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setSelectedGenreId(0);
              }}
              className="gap-1.5 text-xs text-purple-300 border-purple-700/50 hover:bg-purple-950/30"
            >
              <X className="h-3.5 w-3.5" />
              <span>Clear Filter</span>
            </Button>
          </div>

          {isLoadingSearch || isLoadingGenre ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                <div
                  key={i}
                  className="aspect-[2/3] rounded-xl bg-card border border-border/40 animate-pulse"
                />
              ))}
            </div>
          ) : (searchQuery.trim() ? searchResults : genreResults).length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {(searchQuery.trim() ? searchResults : genreResults).map((item) => (
                <div
                  key={item.id}
                  onClick={() =>
                    setSelectedDetail({
                      id: item.id,
                      type: item.media_type === "tv" ? "tv" : "movie",
                    })
                  }
                  className="cursor-pointer"
                >
                  <MovieCard
                    item={item}
                    variant="grid"
                    isWatched={watchedIds.has(item.id)}
                    isWatchlisted={watchlistIds.has(item.id)}
                    onWatchedChange={(watched) => handleWatchedChange(item.id, watched)}
                    onWatchlistChange={(inList) => handleWatchlistChange(item.id, inList)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              preset="search"
              title="No results found"
              description="We could not find any titles matching your query. Try searching with different keywords."
              action={{
                label: "Reset Search",
                onClick: () => {
                  setSearchQuery("");
                  setSelectedGenreId(0);
                },
              }}
            />
          )}
        </div>
      )}

      {/* ─── STANDARD DISCOVER SECTIONS (When not actively searching) ─── */}
      {!isFilteringActive && (
        <div className="space-y-12">
          {/* ── 1. Trending Now Section ── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-600/20 text-purple-400">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Trending Now</h2>
                  <p className="text-xs text-muted-foreground">
                    Top watched stories across cinema and television
                  </p>
                </div>
              </div>

              {/* Time window toggle: This Week vs Today */}
              <div className="flex items-center gap-1 p-1 rounded-lg bg-card border border-border/60">
                <button
                  onClick={() => setTrendingTime("week")}
                  className={cn(
                    "px-2.5 py-1 rounded text-xs font-semibold transition-all",
                    trendingTime === "week"
                      ? "bg-purple-600 text-white"
                      : "text-muted-foreground hover:text-white"
                  )}
                >
                  This Week
                </button>
                <button
                  onClick={() => setTrendingTime("day")}
                  className={cn(
                    "px-2.5 py-1 rounded text-xs font-semibold transition-all",
                    trendingTime === "day"
                      ? "bg-purple-600 text-white"
                      : "text-muted-foreground hover:text-white"
                  )}
                >
                  Today
                </button>
              </div>
            </div>

            {isLoadingTrending ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="aspect-[2/3] rounded-xl bg-card border border-border/40 animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {trendingItems.slice(0, 12).map((item) => (
                  <div
                    key={item.id}
                    onClick={() =>
                      setSelectedDetail({
                        id: item.id,
                        type: item.media_type === "tv" ? "tv" : "movie",
                      })
                    }
                    className="cursor-pointer"
                  >
                    <MovieCard
                    item={item}
                    variant="grid"
                    isWatched={watchedIds.has(item.id)}
                    isWatchlisted={watchlistIds.has(item.id)}
                    onWatchedChange={(watched) => handleWatchedChange(item.id, watched)}
                    onWatchlistChange={(inList) => handleWatchlistChange(item.id, inList)}
                  />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── 2. Popular Movies Section ── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400">
                  <Film className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Popular Movies</h2>
                  <p className="text-xs text-muted-foreground">
                    Blockbusters and crowd-pleasing films
                  </p>
                </div>
              </div>

              <Link
                href="/movies?tab=popular"
                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold group"
              >
                <span>Browse All Movies</span>
                <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {isLoadingPopular ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="aspect-[2/3] rounded-xl bg-card border border-border/40 animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {popularMovies.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    onClick={() =>
                      setSelectedDetail({
                        id: item.id,
                        type: "movie",
                      })
                    }
                    className="cursor-pointer"
                  >
                    <MovieCard
                    item={item}
                    variant="grid"
                    isWatched={watchedIds.has(item.id)}
                    isWatchlisted={watchlistIds.has(item.id)}
                    onWatchedChange={(watched) => handleWatchedChange(item.id, watched)}
                    onWatchlistChange={(inList) => handleWatchlistChange(item.id, inList)}
                  />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── 3. Popular TV Series Section ── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400">
                  <Tv className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    Popular TV Shows
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Critically acclaimed series and binge-worthy drama
                  </p>
                </div>
              </div>

              <Link
                href="/series?tab=popular"
                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold group"
              >
                <span>Browse All Series</span>
                <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {isLoadingPopular ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="aspect-[2/3] rounded-xl bg-card border border-border/40 animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {popularSeries.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    onClick={() =>
                      setSelectedDetail({
                        id: item.id,
                        type: "tv",
                      })
                    }
                    className="cursor-pointer"
                  >
                    <MovieCard
                    item={item}
                    variant="grid"
                    isWatched={watchedIds.has(item.id)}
                    isWatchlisted={watchlistIds.has(item.id)}
                    onWatchedChange={(watched) => handleWatchedChange(item.id, watched)}
                    onWatchlistChange={(inList) => handleWatchlistChange(item.id, inList)}
                  />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Detail Modal ─── */}
      {selectedDetail && (
        <MovieDetailModal
          isOpen={Boolean(selectedDetail)}
          onClose={() => setSelectedDetail(null)}
          tmdbId={selectedDetail.id}
          contentType={selectedDetail.type}
        />
      )}
    </div>
  );
}
