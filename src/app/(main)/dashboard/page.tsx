"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Film,
  Tv,
  Bookmark,
  Clock,
  Sparkles,
  TrendingUp,
  Compass,
  Shuffle,
  ChevronRight,
  Plus,
  Star,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  RefreshCw,
  Search,
} from "lucide-react";
import toast from "react-hot-toast";

import { cn, formatYear, formatRuntime, getRatingColor, getImageUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MovieCard } from "@/components/movie-card";
import { GenreBadge } from "@/components/genre-badge";
import { RatingStars } from "@/components/rating-stars";
import { EmptyState } from "@/components/empty-state";
import { MovieDetailModal } from "@/components/movie-detail-modal";
import type { DashboardStats, WatchlistItemType, WatchedItemType } from "@/types";

export default function DashboardPage() {
  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [extraStats, setExtraStats] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<"watched" | "watchlist">("watched");

  // Detail Modal state
  const [selectedItem, setSelectedItem] = React.useState<{
    id: number;
    type: "movie" | "tv";
  } | null>(null);

  // Random Pick Modal state
  const [isRandomModalOpen, setIsRandomModalOpen] = React.useState(false);
  const [randomItem, setRandomItem] = React.useState<any>(null);
  const [isSpinning, setIsSpinning] = React.useState(false);

  // Quick search in sidebar
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<any[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);

  // Fetch stats from API
  const fetchStats = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/stats");
      if (!res.ok) throw new Error("Failed to load dashboard stats");
      const data = await res.json();
      setStats(data);
      if (data.extra) setExtraStats(data.extra);
    } catch (err: any) {
      console.error("Dashboard stats fetch error:", err);
      toast.error("Could not load dashboard data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Handle Random Pick with Spin Animation
  const handleRandomPick = async () => {
    setIsRandomModalOpen(true);
    setIsSpinning(true);
    setRandomItem(null);

    try {
      // First check if user has items in watchlist
      if (stats?.recentlyAdded && stats.recentlyAdded.length > 0) {
        const pool = stats.recentlyAdded;
        const picked = pool[Math.floor(Math.random() * pool.length)];
        setTimeout(() => {
          setRandomItem(picked);
          setIsSpinning(false);
        }, 1200);
      } else {
        // Fallback to TMDB trending / popular
        const res = await fetch("/api/tmdb/trending?type=all&timeWindow=week");
        if (res.ok) {
          const json = await res.json();
          const results = json.results || [];
          const picked = results[Math.floor(Math.random() * results.length)];
          setTimeout(() => {
            setRandomItem(picked);
            setIsSpinning(false);
          }, 1200);
        } else {
          setIsSpinning(false);
        }
      }
    } catch {
      setIsSpinning(false);
      toast.error("Failed to pick random title");
    }
  };

  // Quick sidebar search
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(
        `/api/tmdb/search?q=${encodeURIComponent(searchQuery.trim())}&type=multi`
      );
      if (res.ok) {
        const data = await res.json();
        setSearchResults((data.results || []).slice(0, 5));
      }
    } catch {
      toast.error("Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  // Format watch time into days or hours
  const formatWatchTimeDisplay = (totalMinutes: number) => {
    const hours = Math.round(totalMinutes / 60);
    if (hours >= 24) {
      const days = (hours / 24).toFixed(1);
      return `${days} Days`;
    }
    return `${hours} Hours`;
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* ─── Header Section ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-400 mb-1">
            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            <span>Cinematic Dashboard</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Welcome to Movie Watched List
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your film journey, discover masterpieces, and conquer franchises.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStats}
            disabled={isLoading}
            className="gap-2 bg-card/60 backdrop-blur-sm border-border/60 hover:bg-purple-950/30"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            <span>Refresh</span>
          </Button>

          <Button
            onClick={handleRandomPick}
            className="gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-900/30"
          >
            <Shuffle className="h-4 w-4" />
            <span>Spin Random Pick</span>
          </Button>
        </div>
      </div>

      {/* ─── Stats Cards Grid ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Movies Watched */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-950/40 via-card to-card border border-purple-800/30 p-5 shadow-lg group hover:border-purple-600/50 transition-all duration-300"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Movies Watched
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Film className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-white">
              {isLoading ? (
                <div className="h-8 w-16 bg-muted/60 animate-pulse rounded" />
              ) : (
                stats?.totalMoviesWatched ?? 0
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-emerald-400" />
              <span>Full feature films</span>
            </p>
          </div>
        </motion.div>

        {/* TV Series Watched */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-950/40 via-card to-card border border-blue-800/30 p-5 shadow-lg group hover:border-blue-600/50 transition-all duration-300"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Series & Seasons
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Tv className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-white">
              {isLoading ? (
                <div className="h-8 w-16 bg-muted/60 animate-pulse rounded" />
              ) : (
                stats?.totalSeriesWatched ?? 0
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-emerald-400" />
              <span>Episodes & seasons</span>
            </p>
          </div>
        </motion.div>

        {/* Watchlist Count */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950/40 via-card to-card border border-indigo-800/30 p-5 shadow-lg group hover:border-indigo-600/50 transition-all duration-300"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              In Watchlist
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Bookmark className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-white">
              {isLoading ? (
                <div className="h-8 w-16 bg-muted/60 animate-pulse rounded" />
              ) : (
                stats?.totalWatchlistItems ?? 0
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Compass className="h-3 w-3 text-purple-400" />
              <span>Saved to watch later</span>
            </p>
          </div>
        </motion.div>

        {/* Watch Time */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-950/40 via-card to-card border border-violet-800/30 p-5 shadow-lg group hover:border-violet-600/50 transition-all duration-300"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Watch Time
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-white">
              {isLoading ? (
                <div className="h-8 w-24 bg-muted/60 animate-pulse rounded" />
              ) : (
                formatWatchTimeDisplay(stats?.totalWatchTime ?? 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {extraStats?.watchedThisMonth
                ? `${extraStats.watchedThisMonth} watched this month`
                : "Dedicated to the screen"}
            </p>
          </div>
        </motion.div>
      </div>

      {/* ─── Quick Navigation Jump Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/discover"
          className="group flex items-center justify-between p-4 rounded-xl bg-card/60 backdrop-blur-sm border border-border/60 hover:border-purple-500/50 hover:bg-purple-950/20 transition-all shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600/20 text-purple-400">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-semibold text-white group-hover:text-purple-300 transition-colors">
                Discover Catalog
              </h4>
              <p className="text-xs text-muted-foreground">Trending & popular picks</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-white group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          href="/movies"
          className="group flex items-center justify-between p-4 rounded-xl bg-card/60 backdrop-blur-sm border border-border/60 hover:border-blue-500/50 hover:bg-blue-950/20 transition-all shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400">
              <Film className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-semibold text-white group-hover:text-blue-300 transition-colors">
                Browse Movies
              </h4>
              <p className="text-xs text-muted-foreground">In theaters & top rated</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-white group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          href="/series"
          className="group flex items-center justify-between p-4 rounded-xl bg-card/60 backdrop-blur-sm border border-border/60 hover:border-indigo-500/50 hover:bg-indigo-950/20 transition-all shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400">
              <Tv className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-semibold text-white group-hover:text-indigo-300 transition-colors">
                Browse TV Series
              </h4>
              <p className="text-xs text-muted-foreground">Seasons & on-air shows</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-white group-hover:translate-x-1 transition-all" />
        </Link>
      </div>

      {/* ─── Main Content Split: Left (2/3) & Right (1/3) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Watchlist & Recently Watched */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section Switcher Tabs */}
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab("watched")}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                  activeTab === "watched"
                    ? "bg-purple-600/20 text-purple-300 border border-purple-500/40"
                    : "text-muted-foreground hover:text-white"
                )}
              >
                Recently Watched
              </button>
              <button
                onClick={() => setActiveTab("watchlist")}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                  activeTab === "watchlist"
                    ? "bg-purple-600/20 text-purple-300 border border-purple-500/40"
                    : "text-muted-foreground hover:text-white"
                )}
              >
                Recently Added to Watchlist
              </button>
            </div>

            <Link
              href={activeTab === "watched" ? "/history" : "/watchlist"}
              className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-medium transition-colors"
            >
              <span>View all</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Recently Watched Grid / List */}
          {activeTab === "watched" && (
            <div>
              {isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className="aspect-[2/3] rounded-xl bg-card border border-border/40 animate-pulse"
                    />
                  ))}
                </div>
              ) : stats?.recentlyWatched && stats.recentlyWatched.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {stats.recentlyWatched.map((item) => (
                    <div
                      key={item.id}
                      onClick={() =>
                        setSelectedItem({
                          id: item.tmdbId,
                          type: item.contentType === "tvshow" ? "tv" : "movie",
                        })
                      }
                      className="cursor-pointer"
                    >
                      <MovieCard
                        item={item}
                        variant="grid"
                        isWatched={true}
                        chronoPosition={item.chronoPosition}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  preset="history"
                  title="No watched titles yet"
                  description="When you mark movies and series as watched, they will show up here along with your ratings."
                  action={{
                    label: "Discover Titles",
                    href: "/discover",
                  }}
                />
              )}
            </div>
          )}

          {/* Recently Added to Watchlist */}
          {activeTab === "watchlist" && (
            <div>
              {isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="aspect-[2/3] rounded-xl bg-card border border-border/40 animate-pulse"
                    />
                  ))}
                </div>
              ) : stats?.recentlyAdded && stats.recentlyAdded.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {stats.recentlyAdded.map((item) => (
                    <div
                      key={item.id}
                      onClick={() =>
                        setSelectedItem({
                          id: item.tmdbId,
                          type: item.contentType === "tvshow" ? "tv" : "movie",
                        })
                      }
                      className="cursor-pointer"
                    >
                      <MovieCard
                        item={item}
                        variant="grid"
                        isWatchlisted={true}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  preset="watchlist"
                  title="Your watchlist is empty"
                  description="Explore trending movies and popular TV shows to start building your personal watchlist."
                  action={{
                    label: "Explore Discover",
                    href: "/discover",
                  }}
                />
              )}
            </div>
          )}
        </div>

        {/* Right Column: Favorite Genres & Quick TMDB Search */}
        <div className="space-y-6">
          {/* Quick TMDB Search Widget */}
          <div className="rounded-2xl bg-card/60 backdrop-blur-md border border-border/60 p-5 shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <Search className="h-4 w-4 text-purple-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Quick Search & Add
              </h3>
            </div>
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Find any movie or TV show..."
                className="w-full rounded-xl bg-background/80 border border-border/80 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="absolute right-2 top-2 p-1 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors"
              >
                <Search className="h-3.5 w-3.5" />
              </button>
            </form>

            {/* Quick search dropdown results */}
            {searchResults.length > 0 && (
              <div className="mt-3 space-y-2 border-t border-border/40 pt-3">
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    onClick={() =>
                      setSelectedItem({
                        id: result.id,
                        type: result.media_type === "tv" ? "tv" : "movie",
                      })
                    }
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-purple-950/30 cursor-pointer transition-colors"
                  >
                    <div className="relative h-10 w-7 rounded overflow-hidden bg-muted shrink-0">
                      <Image
                        src={getImageUrl(result.poster_path, "w92")}
                        alt={result.title || result.name || "Poster"}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-white truncate">
                        {result.title || result.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatYear(result.release_date || result.first_air_date)} •{" "}
                        {result.media_type === "tv" ? "TV Show" : "Movie"}
                      </p>
                    </div>
                    <Plus className="h-4 w-4 text-purple-400 shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Favorite Genres Breakdown */}
          <div className="rounded-2xl bg-card/60 backdrop-blur-md border border-border/60 p-5 shadow-lg">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-4">
              Top Watched Genres
            </h3>

            {stats?.favoriteGenres && stats.favoriteGenres.length > 0 ? (
              <div className="space-y-3">
                {stats.favoriteGenres.map((genre, idx) => {
                  const maxCount = stats.favoriteGenres[0].count || 1;
                  const percentage = Math.round((genre.count / maxCount) * 100);

                  return (
                    <div key={genre.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-zinc-300">
                          {genre.name}
                        </span>
                        <span className="text-muted-foreground font-mono">
                          {genre.count} {genre.count === 1 ? "title" : "titles"}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-4 text-center">
                Watch movies to unlock your genre preferences!
              </p>
            )}
          </div>

          {/* Franchise Tracker Feature Promo Card */}
          <div className="rounded-2xl bg-gradient-to-br from-purple-950/60 via-purple-900/20 to-card border border-purple-700/40 p-5 shadow-lg">
            <div className="flex items-center gap-2 mb-2 text-purple-300 text-xs font-semibold">
              <Layers className="h-4 w-4" />
              <span>Franchise System</span>
            </div>
            <h4 className="font-bold text-white text-base mb-1">
              Sequential Movie Collections
            </h4>
            <p className="text-xs text-zinc-300 mb-4 leading-relaxed">
              Track Marvel, Star Wars, Harry Potter, and Lord of the Rings in
              canonical order with completion progress bars.
            </p>
            <Link href="/franchises">
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 border-purple-500/40 text-purple-300 hover:bg-purple-950/40"
              >
                <span>Explore Franchises</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ─── Detail Modal ─── */}
      {selectedItem && (
        <MovieDetailModal
          isOpen={Boolean(selectedItem)}
          onClose={() => setSelectedItem(null)}
          tmdbId={selectedItem.id}
          contentType={selectedItem.type}
          onWatchlistChange={fetchStats}
          onWatchedChange={fetchStats}
        />
      )}

      {/* ─── Random Pick 3D Spin Modal (Rule 15 Highlight) ─── */}
      {isRandomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div
            className="fixed inset-0"
            onClick={() => setIsRandomModalOpen(false)}
          />

          <div className="relative w-full max-w-md rounded-2xl bg-card border border-purple-600/40 p-6 shadow-2xl shadow-purple-950/60 z-10 text-center">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center justify-center gap-2">
              <Shuffle className="h-5 w-5 text-purple-400" />
              <span>Random Movie Picker</span>
            </h3>
            <p className="text-xs text-muted-foreground mb-6">
              Let fate decide your movie night tonight!
            </p>

            <div className="flex justify-center my-6">
              {isSpinning ? (
                <div className="relative w-44 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl border-2 border-purple-500 flex flex-col items-center justify-center bg-purple-950/40 random-spin">
                  <Film className="h-12 w-12 text-purple-400 animate-pulse" />
                  <span className="text-xs text-purple-300 font-semibold mt-2">
                    Spinning...
                  </span>
                </div>
              ) : randomItem ? (
                <motion.div
                  initial={{ rotateY: 90, scale: 0.8 }}
                  animate={{ rotateY: 0, scale: 1 }}
                  transition={{ duration: 0.6, type: "spring" }}
                  className="relative w-48 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl border-2 border-purple-500 bg-muted cursor-pointer group"
                  onClick={() => {
                    setIsRandomModalOpen(false);
                    setSelectedItem({
                      id: randomItem.tmdbId || randomItem.id,
                      type:
                        randomItem.contentType === "tvshow" ||
                        randomItem.media_type === "tv"
                          ? "tv"
                          : "movie",
                    });
                  }}
                >
                  <Image
                    src={getImageUrl(
                      randomItem.posterPath || randomItem.poster_path,
                      "w500"
                    )}
                    alt={randomItem.title || randomItem.name || "Picked title"}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex flex-col justify-end p-3 text-left">
                    <span className="text-[10px] font-bold uppercase text-purple-400">
                      Tonight&apos;s Pick
                    </span>
                    <h4 className="text-sm font-bold text-white leading-tight">
                      {randomItem.title || randomItem.name}
                    </h4>
                  </div>
                </motion.div>
              ) : null}
            </div>

            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRandomModalOpen(false)}
              >
                Close
              </Button>
              <Button
                size="sm"
                onClick={handleRandomPick}
                disabled={isSpinning}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Shuffle className="h-3.5 w-3.5 mr-1" />
                Spin Again
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
