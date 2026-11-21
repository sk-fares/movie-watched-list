"use client";

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Sparkles,
  Flame,
  Star,
  Film,
  Tv,
  Clapperboard,
  Search,
  X,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MovieCard } from "@/components/movie-card";
import { MovieDetailModal } from "@/components/movie-detail-modal";
import { EmptyState } from "@/components/empty-state";
import { PaginationBar } from "@/components/pagination-bar";

type AnimationTab =
  | "anime_series"
  | "anime_movies"
  | "animated_series"
  | "animated_movies"
  | "trending";

const TABS: { id: AnimationTab; label: string; icon: React.ElementType; badge?: string }[] = [
  { id: "anime_series", label: "Anime Series", icon: Sparkles, badge: "Japan" },
  { id: "anime_movies", label: "Anime Movies", icon: Film, badge: "Japan" },
  { id: "animated_series", label: "Animated Series", icon: Tv, badge: "Global" },
  { id: "animated_movies", label: "Animated Movies", icon: Clapperboard, badge: "Global" },
  { id: "trending", label: "Trending Animation", icon: Flame },
];

const ANIMATION_SUB_GENRES = [
  { id: 0, name: "All Genres" },
  { id: 28, tvId: 10759, name: "Action & Adventure" },
  { id: 35, tvId: 35, name: "Comedy" },
  { id: 14, tvId: 10765, name: "Fantasy & Sci-Fi" },
  { id: 18, tvId: 18, name: "Drama" },
  { id: 9648, tvId: 9648, name: "Mystery" },
  { id: 10749, tvId: 10749, name: "Romance" },
  { id: 10751, tvId: 10751, name: "Family & Kids" },
];

function AnimationPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabParam = (searchParams.get("tab") as AnimationTab) || "anime_series";

  // State
  const [activeTab, setActiveTab] = React.useState<AnimationTab>(tabParam);
  const [page, setPage] = React.useState<number>(1);
  const [totalPages, setTotalPages] = React.useState<number>(1);
  const [selectedGenreId, setSelectedGenreId] = React.useState<number>(0);
  const [sortBy, setSortBy] = React.useState<string>("popularity.desc");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  // User watch status & preference
  const [watchedIds, setWatchedIds] = React.useState<Set<number>>(new Set());
  const [watchlistIds, setWatchlistIds] = React.useState<Set<number>>(new Set());
  const [hideWatched, setHideWatched] = React.useState<boolean>(true);

  const [itemsList, setItemsList] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [selectedItem, setSelectedItem] = React.useState<{ id: number; type: "movie" | "tv" } | null>(null);

  // Sync tab with URL
  React.useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
      setPage(1);
    }
  }, [tabParam]);

  // Load user's watched items and watchlist items across both movies and series
  const fetchUserStatus = React.useCallback(async () => {
    try {
      const [watchedRes, watchlistRes] = await Promise.all([
        fetch("/api/watched?limit=2000"),
        fetch("/api/watchlist?limit=2000"),
      ]);
      if (watchedRes.ok) {
        const data = await watchedRes.json();
        const ids = new Set<number>((data.items || []).map((i: any) => Number(i.tmdbId)));
        setWatchedIds(ids);
      }
      if (watchlistRes.ok) {
        const data = await watchlistRes.json();
        const ids = new Set<number>((data.items || []).map((i: any) => Number(i.tmdbId)));
        setWatchlistIds(ids);
      }
    } catch (err) {
      console.error("Failed to load user watched/watchlist status:", err);
    }
  }, []);

  React.useEffect(() => {
    fetchUserStatus();
  }, [fetchUserStatus]);

  // Keep a ref of watchedIds so fetchAnimationContent doesn't re-run and cause page reload on every watch action
  const watchedIdsRef = React.useRef(watchedIds);
  React.useEffect(() => {
    watchedIdsRef.current = watchedIds;
  }, [watchedIds]);

  // Helper to map selected sub-genre for movie vs TV
  const getGenreQueryParam = (type: "movie" | "tv") => {
    if (selectedGenreId === 0) return "";
    const g = ANIMATION_SUB_GENRES.find((item) => item.id === selectedGenreId);
    if (!g) return "";
    const id = type === "tv" ? g.tvId : g.id;
    // TMDB requires genre 16 (Animation) AND the subgenre
    return `&with_genres=16,${id}`;
  };

  // Fetch Animation content based on tab & filters
  const fetchAnimationContent = React.useCallback(async () => {
    setIsLoading(true);
    try {
      let results: any[] = [];
      let totalP = 1;
      const trimmedQuery = searchQuery.trim();

      if (trimmedQuery) {
        // Multi search across TMDB, filtered to animation or Japanese anime
        const searchRes = await fetch(
          `/api/tmdb/search?q=${encodeURIComponent(trimmedQuery)}&type=multi&page=${page}`
        );
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          totalP = Math.min(searchData.total_pages || 1, 500);
          results = (searchData.results || []).filter((item: any) => {
            const hasAnimationGenre = item.genre_ids?.includes(16);
            const isJapanese = item.original_language === "ja";
            return hasAnimationGenre || isJapanese;
          });

          // Further filter by tab if specific
          if (activeTab === "anime_series") {
            results = results.filter((r) => r.media_type === "tv" && (r.original_language === "ja" || r.genre_ids?.includes(16)));
          } else if (activeTab === "anime_movies") {
            results = results.filter((r) => r.media_type === "movie" && (r.original_language === "ja" || r.genre_ids?.includes(16)));
          } else if (activeTab === "animated_series") {
            results = results.filter((r) => r.media_type === "tv" && r.genre_ids?.includes(16));
          } else if (activeTab === "animated_movies") {
            results = results.filter((r) => r.media_type === "movie" && r.genre_ids?.includes(16));
          }
        }
      } else if (activeTab === "anime_series") {
        // Japanese Anime TV Series
        let url = `/api/tmdb/discover?type=tv&with_genres=16&with_original_language=ja&sort_by=${sortBy}&page=${page}`;
        if (selectedGenreId > 0) {
          url += getGenreQueryParam("tv");
        }
        if (sortBy === "vote_average.desc") {
          url += "&vote_count_gte=150";
        }
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          totalP = Math.min(data.total_pages || 1, 500);
          results = (data.results || []).map((t: any) => ({
            ...t,
            media_type: "tv",
            contentType: "tvshow",
          }));
        }
      } else if (activeTab === "anime_movies") {
        // Japanese Anime Feature Films
        let url = `/api/tmdb/discover?type=movie&with_genres=16&with_original_language=ja&sort_by=${sortBy}&page=${page}`;
        if (selectedGenreId > 0) {
          url += getGenreQueryParam("movie");
        }
        if (sortBy === "vote_average.desc") {
          url += "&vote_count_gte=150";
        }
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          totalP = Math.min(data.total_pages || 1, 500);
          results = (data.results || []).map((m: any) => ({
            ...m,
            media_type: "movie",
            contentType: "movie",
          }));
        }
      } else if (activeTab === "animated_series") {
        // Global / Western Animated TV Series (Arcane, Invincible, Rick and Morty, Avatar, etc.)
        let url = `/api/tmdb/discover?type=tv&with_genres=16&without_original_language=ja&sort_by=${sortBy}&page=${page}`;
        if (selectedGenreId > 0) {
          url += getGenreQueryParam("tv");
        }
        if (sortBy === "vote_average.desc") {
          url += "&vote_count_gte=150";
        }
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          totalP = Math.min(data.total_pages || 1, 500);
          results = (data.results || []).map((t: any) => ({
            ...t,
            media_type: "tv",
            contentType: "tvshow",
          }));
        }
      } else if (activeTab === "animated_movies") {
        // Global Animated Movies (Spider-Verse, Pixar, DreamWorks, Disney, Ghibli, etc.)
        let url = `/api/tmdb/discover?type=movie&with_genres=16&sort_by=${sortBy}&page=${page}`;
        if (selectedGenreId > 0) {
          url += getGenreQueryParam("movie");
        }
        if (sortBy === "vote_average.desc") {
          url += "&vote_count_gte=250";
        }
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          totalP = Math.min(data.total_pages || 1, 500);
          results = (data.results || []).map((m: any) => ({
            ...m,
            media_type: "movie",
            contentType: "movie",
          }));
        }
      } else {
        // Trending Animation (top animated movies and series)
        const [tvRes, movieRes] = await Promise.all([
          fetch(`/api/tmdb/discover?type=tv&with_genres=16&sort_by=popularity.desc&page=${page}`),
          fetch(`/api/tmdb/discover?type=movie&with_genres=16&sort_by=popularity.desc&page=${page}`),
        ]);
        const tvData = tvRes.ok ? await tvRes.json() : { results: [] };
        const movieData = movieRes.ok ? await movieRes.json() : { results: [] };

        const taggedTV = (tvData.results || []).map((t: any) => ({
          ...t,
          media_type: "tv",
          contentType: "tvshow",
        }));
        const taggedMovie = (movieData.results || []).map((m: any) => ({
          ...m,
          media_type: "movie",
          contentType: "movie",
        }));

        results = [...taggedTV, ...taggedMovie].sort(
          (a, b) => (b.popularity || 0) - (a.popularity || 0)
        );
        totalP = Math.min(Math.max(tvData.total_pages || 1, movieData.total_pages || 1), 500);
      }

      // ─── FILTERING & STRICT DEDUPLICATION ───
      // If browsing (no search query) and hideWatched is true:
      // Filter out watched animation so user only discovers fresh, unwatched animation!
      if (!trimmedQuery && hideWatched) {
        results = results.filter((item: any) => !watchedIdsRef.current.has(item.id));
      }

      // Guarantee each title only appears once (no repeats across lists or pages)
      const seen = new Set<string>();
      const uniqueResults = results.filter((item: any) => {
        const key = `${item.media_type || item.contentType || "item"}-${item.id}`;
        if (!item.id || seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setItemsList(uniqueResults);
      setTotalPages(totalP);
    } catch (err) {
      console.error("Fetch animation error:", err);
      setItemsList([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, page, selectedGenreId, sortBy, searchQuery, hideWatched]);

  React.useEffect(() => {
    fetchAnimationContent();
  }, [fetchAnimationContent]);

  // Handle watched toggle on animation card
  const handleWatchedChange = (itemId: number, isWatched: boolean) => {
    setWatchedIds((prev) => {
      const next = new Set(prev);
      if (isWatched) {
        next.add(itemId);
      } else {
        next.delete(itemId);
      }
      return next;
    });

    // Note: Do NOT remove item immediately from view!
    // The card remains visible with its checkmark so users can select multiple titles at once.
    // It will be excluded automatically when they navigate to another page or tab.
  };

  // Handle watchlist toggle
  const handleWatchlistChange = (itemId: number, inWatchlist: boolean) => {
    setWatchlistIds((prev) => {
      const next = new Set(prev);
      if (inWatchlist) {
        next.add(itemId);
      } else {
        next.delete(itemId);
      }
      return next;
    });
  };

  // Page change handler
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== page) {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Tab change handler
  const handleTabChange = (newTab: AnimationTab) => {
    setActiveTab(newTab);
    setPage(1);
    setSelectedGenreId(0);
    setSearchQuery("");
    router.push(`/animation?tab=${newTab}`);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* ─── Header ─── */}
      <div className="border-b border-border/40 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-400 mb-1">
            <Sparkles className="h-4 w-4" />
            <span>Animation & Anime Universe</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Animation & Anime
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {hideWatched && !searchQuery.trim()
              ? "Showing unwatched anime & animated titles. Watched titles are hidden from discovery."
              : "Explore top anime series, anime movies, Western animation, and animated masterpieces."}
          </p>
        </div>

        {/* Watched Count Badge */}
        {watchedIds.size > 0 && (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-950/40 border border-purple-500/30 text-purple-300 text-xs font-semibold shrink-0">
            <span className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
            <span>{watchedIds.size} Watched in Vault</span>
          </div>
        )}
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
              {tab.badge && (
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider",
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                  )}
                >
                  {tab.badge}
                </span>
              )}
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
              placeholder="Search anime, animated series & movies (including watched)..."
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

          {/* Filters: Hide Watched Toggle & Sort */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
            {/* Hide/Show Watched Toggle Button */}
            {!searchQuery.trim() && (
              <button
                onClick={() => setHideWatched((prev) => !prev)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border shrink-0",
                  hideWatched
                    ? "bg-purple-600/20 border-purple-500/50 text-purple-300 hover:bg-purple-600/30 shadow-sm"
                    : "bg-background/80 border-border/80 text-muted-foreground hover:text-white"
                )}
                title={
                  hideWatched
                    ? "Currently hiding watched titles. Click to show all."
                    : "Currently showing all. Click to hide watched."
                }
              >
                {hideWatched ? (
                  <EyeOff className="h-3.5 w-3.5 text-purple-400" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
                <span>{hideWatched ? "Hiding Watched" : "Show All"}</span>
              </button>
            )}

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="rounded-xl bg-background/80 border border-border/80 px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:border-purple-500"
            >
              <option value="popularity.desc">Most Popular</option>
              <option value="vote_average.desc">Highest Rated</option>
              <option value="first_air_date.desc">Newest Release</option>
            </select>
          </div>
        </div>

        {/* Sub-Genre Selector Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none">
          <span className="text-xs font-semibold text-muted-foreground shrink-0 mr-1 flex items-center gap-1">
            <Filter className="h-3 w-3 text-purple-400" />
            Genre:
          </span>
          {ANIMATION_SUB_GENRES.map((g) => (
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

      {/* ─── Grid ─── */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
            <div
              key={i}
              className="aspect-[2/3] rounded-2xl bg-card border border-border/40 animate-pulse"
            />
          ))}
        </div>
      ) : itemsList.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
          {itemsList.map((item) => {
            const isItemWatched = watchedIds.has(item.id);
            const isItemWatchlisted = watchlistIds.has(item.id);
            const mediaType = item.media_type === "tv" || item.contentType === "tvshow" ? "tv" : "movie";

            return (
              <div
                key={`${mediaType}-${item.id}`}
                onClick={() => setSelectedItem({ id: item.id, type: mediaType })}
                className="cursor-pointer"
              >
                <MovieCard
                  item={item}
                  variant="grid"
                  isWatched={isItemWatched}
                  isWatchlisted={isItemWatchlisted}
                  onWatchedChange={(watched) => handleWatchedChange(item.id, watched)}
                  onWatchlistChange={(inList) => handleWatchlistChange(item.id, inList)}
                  onSelect={() => setSelectedItem({ id: item.id, type: mediaType })}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          preset="search"
          title={searchQuery ? "No animation or anime found" : "All animation watched in this category!"}
          description={
            searchQuery
              ? "We couldn't find any animation or anime matching your search. Try another title."
              : "You've watched the top animation here! Click 'Hiding Watched' to view them, or check another category."
          }
          action={{
            label: searchQuery ? "Clear Search" : (hideWatched ? "Show Watched Titles" : "Reset Filters"),
            onClick: () => {
              if (searchQuery) {
                setSearchQuery("");
              } else if (hideWatched) {
                setHideWatched(false);
              } else {
                setSelectedGenreId(0);
                setPage(1);
              }
            },
          }}
        />
      )}

      {/* ─── Centered Pagination Controls ─── */}
      {!isLoading && itemsList.length > 0 && totalPages > 1 && (
        <PaginationBar
          currentPage={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          maxPageButtons={10}
        />
      )}

      {/* ─── Detail Modal ─── */}
      {selectedItem && (
        <MovieDetailModal
          isOpen={Boolean(selectedItem)}
          onClose={() => setSelectedItem(null)}
          tmdbId={selectedItem.id}
          contentType={selectedItem.type === "tv" ? "tvshow" : "movie"}
          onWatchedChange={(watched) => handleWatchedChange(selectedItem.id, watched)}
          onWatchlistChange={(inList) => handleWatchlistChange(selectedItem.id, inList)}
        />
      )}
    </div>
  );
}

export default function AnimationPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-8 animate-pulse pb-16">
          <div className="h-10 w-64 bg-card rounded-xl" />
          <div className="h-12 w-full bg-card rounded-xl" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
              <div key={i} className="aspect-[2/3] rounded-2xl bg-card border border-border/40" />
            ))}
          </div>
        </div>
      }
    >
      <AnimationPageContent />
    </Suspense>
  );
}
