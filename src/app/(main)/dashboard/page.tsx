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
  X,
  Filter,
  Check,
} from "lucide-react";
import toast from "react-hot-toast";

import { cn, formatYear, formatRuntime, getRatingColor, getImageUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MovieCard } from "@/components/movie-card";
import { EmptyState } from "@/components/empty-state";
import { MovieDetailModal } from "@/components/movie-detail-modal";
import { SeasonSelectModal, WatchedSeriesItem } from "@/components/season-select-modal";
import type { DashboardStats } from "@/types";

interface YearGroup<T> {
  year: string;
  numericYear: number;
  items: T[];
}

function parseWatchedSeasons(notes?: string | null): number[] {
  if (!notes) return [];
  try {
    const parsed = JSON.parse(notes);
    if (Array.isArray(parsed.watchedSeasons)) {
      return parsed.watchedSeasons.map(Number);
    }
    if (Array.isArray(parsed)) {
      return parsed.map(Number);
    }
  } catch {
    // Non-JSON notes
  }
  return [];
}

export default function DashboardPage() {
  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [extraStats, setExtraStats] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Active section: "movies" (Movie Watched) or "series" (Watched Series)
  const [activeSection, setActiveSection] = React.useState<"movies" | "series">("movies");

  // Watched lists
  const [watchedMovies, setWatchedMovies] = React.useState<any[]>([]);
  const [watchedSeries, setWatchedSeries] = React.useState<any[]>([]);
  const [isLoadingContent, setIsLoadingContent] = React.useState(true);

  // Filter & Search state within watched lists
  const [searchFilter, setSearchFilter] = React.useState<string>("");
  const [selectedYear, setSelectedYear] = React.useState<string>("all");

  // Season Selection Modal state
  const [selectedSeriesForSeasons, setSelectedSeriesForSeasons] =
    React.useState<WatchedSeriesItem | null>(null);

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
  const [quickSearchQuery, setQuickSearchQuery] = React.useState("");
  const [quickSearchResults, setQuickSearchResults] = React.useState<any[]>([]);
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
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch full watched lists for movies and series
  const fetchWatchedLists = React.useCallback(async () => {
    setIsLoadingContent(true);
    try {
      const [moviesRes, seriesRes] = await Promise.all([
        fetch("/api/watched?contentType=movie&limit=1000&sortBy=releaseDate&order=desc"),
        fetch("/api/watched?contentType=tvshow&limit=1000&sortBy=releaseDate&order=desc"),
      ]);

      if (moviesRes.ok) {
        const mData = await moviesRes.json();
        setWatchedMovies(mData.items || []);
      }
      if (seriesRes.ok) {
        const sData = await seriesRes.json();
        setWatchedSeries(sData.items || []);
      }
    } catch (err) {
      console.error("Failed to load watched items:", err);
    } finally {
      setIsLoadingContent(false);
    }
  }, []);

  React.useEffect(() => {
    fetchStats();
    fetchWatchedLists();
  }, [fetchStats, fetchWatchedLists]);

  // Handle season updates from SeasonSelectModal
  const handleSeasonChange = (tmdbId: number, updatedSeasons: number[]) => {
    setWatchedSeries((prev) =>
      prev.map((item) => {
        if (item.tmdbId === tmdbId) {
          return {
            ...item,
            notes: JSON.stringify({
              watchedSeasons: updatedSeasons,
              updatedAt: new Date().toISOString(),
            }),
          };
        }
        return item;
      })
    );
  };

  // Group items by release year (sorted from latest year at top down to oldest at bottom)
  const groupItemsYearWise = <T extends { releaseDate?: string | null; firstAirDate?: string | null; title?: string }>(
    items: T[]
  ): YearGroup<T>[] => {
    const map = new Map<string, T[]>();

    for (const item of items) {
      const rawDate = item.releaseDate || item.firstAirDate;
      let yearStr = "Unknown Year";
      if (rawDate) {
        const match = String(rawDate).match(/^(\d{4})/);
        if (match) {
          yearStr = match[1];
        }
      }
      if (!map.has(yearStr)) {
        map.set(yearStr, []);
      }
      map.get(yearStr)!.push(item);
    }

    const groups: YearGroup<T>[] = [];
    map.forEach((groupItems, year) => {
      const numericYear = year === "Unknown Year" ? -1 : parseInt(year, 10);
      // Sort items inside each year by date descending
      groupItems.sort((a: T, b: T) => {
        const dateA = a.releaseDate || a.firstAirDate || "";
        const dateB = b.releaseDate || b.firstAirDate || "";
        return dateB.localeCompare(dateA);
      });
      groups.push({ year, numericYear, items: groupItems });
    });

    // Sort year groups: latest year (e.g. 2025, 2024...) on top, down to oldest (e.g. 1990...) at bottom
    groups.sort((a, b) => {
      if (a.numericYear === -1) return 1;
      if (b.numericYear === -1) return -1;
      return b.numericYear - a.numericYear;
    });

    return groups;
  };

  // Filtered watched movies
  const filteredMovies = React.useMemo(() => {
    let list = watchedMovies;
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      list = list.filter((m) => m.title?.toLowerCase().includes(q));
    }
    if (selectedYear !== "all") {
      list = list.filter((m) => {
        const raw = m.releaseDate;
        return raw && String(raw).startsWith(selectedYear);
      });
    }
    return list;
  }, [watchedMovies, searchFilter, selectedYear]);

  // Filtered watched series
  const filteredSeries = React.useMemo(() => {
    let list = watchedSeries;
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      list = list.filter((s) => s.title?.toLowerCase().includes(q));
    }
    if (selectedYear !== "all") {
      list = list.filter((s) => {
        const raw = s.releaseDate;
        return raw && String(raw).startsWith(selectedYear);
      });
    }
    return list;
  }, [watchedSeries, searchFilter, selectedYear]);

  // Year groups for active section
  const movieYearGroups = React.useMemo(
    () => groupItemsYearWise(filteredMovies),
    [filteredMovies]
  );
  const seriesYearGroups = React.useMemo(
    () => groupItemsYearWise(filteredSeries),
    [filteredSeries]
  );

  // Available unique years for quick pills
  const availableYears = React.useMemo(() => {
    const rawList = activeSection === "movies" ? watchedMovies : watchedSeries;
    const set = new Set<string>();
    rawList.forEach((item) => {
      const raw = item.releaseDate;
      if (raw) {
        const m = String(raw).match(/^(\d{4})/);
        if (m) set.add(m[1]);
      }
    });
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [activeSection, watchedMovies, watchedSeries]);

  // Handle Random Pick with Spin Animation
  const handleRandomPick = async () => {
    setIsRandomModalOpen(true);
    setIsSpinning(true);
    setRandomItem(null);

    try {
      if (stats?.recentlyAdded && stats.recentlyAdded.length > 0) {
        const pool = stats.recentlyAdded;
        const picked = pool[Math.floor(Math.random() * pool.length)];
        setTimeout(() => {
          setRandomItem(picked);
          setIsSpinning(false);
        }, 1200);
      } else {
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
    if (!quickSearchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(
        `/api/tmdb/search?q=${encodeURIComponent(quickSearchQuery.trim())}&type=multi`
      );
      if (res.ok) {
        const data = await res.json();
        setQuickSearchResults((data.results || []).slice(0, 5));
      }
    } catch {
      toast.error("Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const formatWatchTimeDisplay = (totalMinutes: number) => {
    const hours = Math.round(totalMinutes / 60);
    if (hours >= 24) {
      const days = (hours / 24).toFixed(1);
      return `${days} Days`;
    }
    return `${hours} Hours`;
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16">
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
            Track your movies and web series year-wise, explore seasons, and conquer franchises.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchStats();
              fetchWatchedLists();
            }}
            disabled={isLoading || isLoadingContent}
            className="gap-2 bg-card/60 backdrop-blur-sm border-border/60 hover:bg-purple-950/30"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", (isLoading || isLoadingContent) && "animate-spin")}
            />
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
          onClick={() => {
            setActiveSection("movies");
            setSelectedYear("all");
          }}
          className={cn(
            "relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-950/40 via-card to-card border p-5 shadow-lg cursor-pointer transition-all duration-300 group",
            activeSection === "movies"
              ? "border-purple-500 shadow-purple-950/50 ring-1 ring-purple-500"
              : "border-purple-800/30 hover:border-purple-600/50"
          )}
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
              {isLoadingContent ? (
                <div className="h-8 w-16 bg-muted/60 animate-pulse rounded" />
              ) : (
                watchedMovies.length
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-emerald-400" />
              <span>Click to view year-wise</span>
            </p>
          </div>
        </motion.div>

        {/* Web Series Watched */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          onClick={() => {
            setActiveSection("series");
            setSelectedYear("all");
          }}
          className={cn(
            "relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-950/40 via-card to-card border p-5 shadow-lg cursor-pointer transition-all duration-300 group",
            activeSection === "series"
              ? "border-blue-500 shadow-blue-950/50 ring-1 ring-blue-500"
              : "border-blue-800/30 hover:border-blue-600/50"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Watched Series
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Tv className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-white">
              {isLoadingContent ? (
                <div className="h-8 w-16 bg-muted/60 animate-pulse rounded" />
              ) : (
                watchedSeries.length
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-emerald-400" />
              <span>With season-by-season tracking</span>
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
            <Link
              href="/watchlist"
              className="text-xs text-purple-400 hover:text-purple-300 mt-1 inline-flex items-center gap-1"
            >
              <span>View watchlist</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
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
            <p className="text-xs text-muted-foreground mt-1">Dedicated to the screen</p>
          </div>
        </motion.div>
      </div>

      {/* ─── DUAL OPTIONS: Movie Watched & Watched Series ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Option 1: Movie Watched */}
        <button
          onClick={() => {
            setActiveSection("movies");
            setSelectedYear("all");
            setSearchFilter("");
          }}
          className={cn(
            "relative flex items-center justify-between p-5 rounded-2xl border text-left transition-all duration-300 group shadow-md",
            activeSection === "movies"
              ? "bg-gradient-to-r from-purple-950/70 via-purple-900/30 to-card border-purple-500 shadow-purple-950/50 ring-1 ring-purple-500/60"
              : "bg-card/60 backdrop-blur-sm border-border/60 hover:bg-card hover:border-purple-500/40"
          )}
        >
          <div className="flex items-center gap-4 min-w-0">
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-2xl border transition-all shrink-0",
                activeSection === "movies"
                  ? "bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-900/50"
                  : "bg-purple-600/20 text-purple-400 border-purple-500/30 group-hover:scale-105"
              )}
            >
              <Film className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-white group-hover:text-purple-300 transition-colors">
                  Movie Watched
                </h3>
                <span
                  className={cn(
                    "text-xs px-2.5 py-0.5 rounded-full font-bold",
                    activeSection === "movies"
                      ? "bg-purple-500 text-white"
                      : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                  )}
                >
                  {watchedMovies.length}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                Feature films arranged year-wise (latest on top to oldest)
              </p>
            </div>
          </div>

          <div
            className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-transform",
              activeSection === "movies"
                ? "bg-purple-500 text-white"
                : "text-muted-foreground group-hover:text-white"
            )}
          >
            <ChevronRight className="h-5 w-5" />
          </div>
        </button>

        {/* Option 2: Watched Series */}
        <button
          onClick={() => {
            setActiveSection("series");
            setSelectedYear("all");
            setSearchFilter("");
          }}
          className={cn(
            "relative flex items-center justify-between p-5 rounded-2xl border text-left transition-all duration-300 group shadow-md",
            activeSection === "series"
              ? "bg-gradient-to-r from-blue-950/70 via-indigo-900/30 to-card border-blue-500 shadow-blue-950/50 ring-1 ring-blue-500/60"
              : "bg-card/60 backdrop-blur-sm border-border/60 hover:bg-card hover:border-blue-500/40"
          )}
        >
          <div className="flex items-center gap-4 min-w-0">
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-2xl border transition-all shrink-0",
                activeSection === "series"
                  ? "bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-900/50"
                  : "bg-blue-600/20 text-blue-400 border-blue-500/30 group-hover:scale-105"
              )}
            >
              <Tv className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-white group-hover:text-blue-300 transition-colors">
                  Watched Series
                </h3>
                <span
                  className={cn(
                    "text-xs px-2.5 py-0.5 rounded-full font-bold",
                    activeSection === "series"
                      ? "bg-blue-500 text-white"
                      : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                  )}
                >
                  {watchedSeries.length}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                Web series year-wise with season-by-season selection
              </p>
            </div>
          </div>

          <div
            className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-transform",
              activeSection === "series"
                ? "bg-blue-500 text-white"
                : "text-muted-foreground group-hover:text-white"
            )}
          >
            <ChevronRight className="h-5 w-5" />
          </div>
        </button>
      </div>

      {/* ─── Search & Year Filters Bar for Active Watched Section ─── */}
      <div className="rounded-2xl bg-card/60 backdrop-blur-md border border-border/60 p-4 sm:p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder={
                activeSection === "movies"
                  ? "Filter your watched movies..."
                  : "Filter your watched web series..."
              }
              className="w-full rounded-xl bg-background/80 border border-border/80 pl-10 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500"
            />
            {searchFilter && (
              <button
                onClick={() => setSearchFilter("")}
                className="absolute right-3.5 top-3 text-muted-foreground hover:text-white"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Catalog count badge */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-muted-foreground">
              {activeSection === "movies"
                ? `${filteredMovies.length} of ${watchedMovies.length} Movies`
                : `${filteredSeries.length} of ${watchedSeries.length} Series`}
            </span>
          </div>
        </div>

        {/* Year jump selector pills */}
        {availableYears.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none">
            <span className="text-xs font-semibold text-muted-foreground shrink-0 mr-1 flex items-center gap-1">
              <Calendar className="h-3 w-3 text-purple-400" />
              Year:
            </span>

            <button
              onClick={() => setSelectedYear("all")}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all border shrink-0",
                selectedYear === "all"
                  ? "bg-purple-600 border-purple-500 text-white shadow-md shadow-purple-900/40"
                  : "bg-background/60 border-border/60 text-muted-foreground hover:text-white"
              )}
            >
              All Years ({activeSection === "movies" ? watchedMovies.length : watchedSeries.length})
            </button>

            {availableYears.map((yr) => {
              const count = (activeSection === "movies" ? watchedMovies : watchedSeries).filter(
                (item) => item.releaseDate && String(item.releaseDate).startsWith(yr)
              ).length;

              return (
                <button
                  key={yr}
                  onClick={() => setSelectedYear(yr)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all border shrink-0",
                    selectedYear === yr
                      ? "bg-purple-600 border-purple-500 text-white shadow-md shadow-purple-900/40"
                      : "bg-background/60 border-border/60 text-muted-foreground hover:text-white hover:border-purple-500/40"
                  )}
                >
                  {yr} ({count})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── YEAR-WISE CONTENT DISPLAY ─── */}
      <div className="space-y-10">
        {isLoadingContent ? (
          <div className="space-y-8 animate-pulse">
            <div className="h-8 w-40 bg-card rounded-xl" />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="aspect-[2/3] rounded-2xl bg-card border border-border/40"
                />
              ))}
            </div>
          </div>
        ) : activeSection === "movies" ? (
          /* ─── MOVIES YEAR-WISE ─── */
          movieYearGroups.length > 0 ? (
            movieYearGroups.map((group) => (
              <div key={group.year} className="space-y-4">
                {/* Year Header */}
                <div className="flex items-center gap-3 pb-2 border-b border-border/40">
                  <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-purple-950/60 border border-purple-500/40 text-purple-300 font-extrabold text-sm tracking-wide shadow-sm">
                    <Calendar className="h-3.5 w-3.5 text-purple-400" />
                    <span>{group.year}</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-semibold">
                    {group.items.length} {group.items.length === 1 ? "Movie" : "Movies"}
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-r from-purple-500/30 via-border/40 to-transparent" />
                </div>

                {/* Movies Grid for this year */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
                  {group.items.map((movie) => (
                    <div
                      key={movie.id}
                      onClick={() =>
                        setSelectedItem({
                          id: movie.tmdbId,
                          type: "movie",
                        })
                      }
                      className="cursor-pointer group relative"
                    >
                      <MovieCard
                        item={movie}
                        variant="grid"
                        isWatched={true}
                        chronoPosition={movie.chronoPosition}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              preset="history"
              title={searchFilter ? "No movies match your search" : "No watched movies yet"}
              description={
                searchFilter
                  ? "Try searching for a different movie title or reset the year filter."
                  : "When you browse movies and mark them as watched, they will automatically appear here organized year-wise."
              }
              action={{
                label: searchFilter ? "Clear Filter" : "Browse Movies",
                href: searchFilter ? undefined : "/movies",
                onClick: searchFilter
                  ? () => {
                      setSearchFilter("");
                      setSelectedYear("all");
                    }
                  : undefined,
              }}
            />
          )
        ) : (
          /* ─── WEB SERIES YEAR-WISE WITH SEASON SELECTION ─── */
          seriesYearGroups.length > 0 ? (
            seriesYearGroups.map((group) => (
              <div key={group.year} className="space-y-4">
                {/* Year Header */}
                <div className="flex items-center gap-3 pb-2 border-b border-border/40">
                  <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-950/60 border border-blue-500/40 text-blue-300 font-extrabold text-sm tracking-wide shadow-sm">
                    <Calendar className="h-3.5 w-3.5 text-blue-400" />
                    <span>{group.year}</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-semibold">
                    {group.items.length} {group.items.length === 1 ? "Series" : "Series"}
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-r from-blue-500/30 via-border/40 to-transparent" />
                </div>

                {/* Series Grid for this year */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
                  {group.items.map((series) => {
                    const watchedSeasonsList = parseWatchedSeasons(series.notes);
                    const seasonsLabel =
                      watchedSeasonsList.length > 0
                        ? `${watchedSeasonsList.length} Season${watchedSeasonsList.length > 1 ? "s" : ""} Watched`
                        : "Click to select seasons";

                    return (
                      <div
                        key={series.id}
                        onClick={() =>
                          setSelectedSeriesForSeasons({
                            id: series.id,
                            tmdbId: series.tmdbId,
                            title: series.title,
                            posterPath: series.posterPath,
                            backdropPath: series.backdropPath,
                            releaseDate: series.releaseDate,
                            notes: series.notes,
                          })
                        }
                        className="group relative cursor-pointer flex flex-col rounded-2xl overflow-hidden bg-card/60 border border-border/60 hover:border-blue-500/60 hover:shadow-xl hover:shadow-blue-950/40 transition-all duration-300"
                      >
                        {/* Poster */}
                        <div className="relative aspect-[2/3] w-full bg-muted overflow-hidden">
                          {series.posterPath ? (
                            <Image
                              src={getImageUrl(series.posterPath, "w342")}
                              alt={series.title}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-blue-950/30 text-blue-400">
                              <Tv className="h-10 w-10" />
                            </div>
                          )}

                          {/* Top badge: Watched series checkmark */}
                          <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-600/90 backdrop-blur-md text-white text-[10px] font-bold shadow-md">
                            <Check className="h-3 w-3 stroke-[3]" />
                            <span>WATCHED</span>
                          </div>

                          {/* Rating badge if present */}
                          {series.voteAverage && (
                            <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-1 rounded-md bg-black/70 backdrop-blur-md text-amber-300 text-[10px] font-bold">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                              <span>{series.voteAverage.toFixed(1)}</span>
                            </div>
                          )}

                          {/* Hover Overlay: Manage Seasons button */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center p-3 text-center">
                            <div className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg mb-2 transform group-hover:scale-110 transition-transform">
                              <Layers className="h-5 w-5" />
                            </div>
                            <span className="text-xs font-bold text-white leading-tight">
                              Select Seasons
                            </span>
                            <span className="text-[10px] text-zinc-300 mt-1">
                              Tap to track season progress
                            </span>
                          </div>
                        </div>

                        {/* Series Info & Season Pill */}
                        <div className="p-3 flex flex-col flex-1 justify-between gap-2">
                          <div>
                            <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-blue-300 transition-colors line-clamp-1">
                              {series.title}
                            </h4>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {series.releaseDate ? formatYear(series.releaseDate) : "Series"}
                            </p>
                          </div>

                          {/* Watched Season Progress Pill */}
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-950/50 border border-blue-500/30 text-blue-300 text-[10px] font-semibold">
                            <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                            <span className="truncate">{seasonsLabel}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              preset="history"
              title={searchFilter ? "No series match your search" : "No watched web series yet"}
              description={
                searchFilter
                  ? "Try searching for a different show title or reset the year filter."
                  : "When you browse web series and mark them as watched, they will show up here with season-by-season tracking."
              }
              action={{
                label: searchFilter ? "Clear Filter" : "Browse Web Series",
                href: searchFilter ? undefined : "/series",
                onClick: searchFilter
                  ? () => {
                      setSearchFilter("");
                      setSelectedYear("all");
                    }
                  : undefined,
              }}
            />
          )
        )}
      </div>

      {/* ─── SIDEBAR & DISCOVERY WIDGETS (GENRES & QUICK SEARCH) ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-border/40">
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
              value={quickSearchQuery}
              onChange={(e) => setQuickSearchQuery(e.target.value)}
              placeholder="Find any movie or TV series..."
              className="w-full rounded-xl bg-background/80 border border-border/80 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="absolute right-2 top-2 p-1 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors"
            >
              <Search className="h-3.5 w-3.5" />
            </button>
          </form>

          {quickSearchResults.length > 0 && (
            <div className="mt-3 space-y-2 border-t border-border/40 pt-3">
              {quickSearchResults.map((result) => (
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
                      {result.media_type === "tv" ? "Web Series" : "Movie"}
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
              {stats.favoriteGenres.slice(0, 5).map((genre) => {
                const maxCount = stats.favoriteGenres[0].count || 1;
                const percentage = Math.round((genre.count / maxCount) * 100);

                return (
                  <div key={genre.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-zinc-300">{genre.name}</span>
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
              Watch movies and web series to unlock your genre analytics!
            </p>
          )}
        </div>
      </div>

      {/* ─── Season Selection Modal (for Watched Series) ─── */}
      {selectedSeriesForSeasons && (
        <SeasonSelectModal
          isOpen={Boolean(selectedSeriesForSeasons)}
          onClose={() => setSelectedSeriesForSeasons(null)}
          series={selectedSeriesForSeasons}
          onSeasonsChange={handleSeasonChange}
        />
      )}

      {/* ─── Movie / Series Detail Modal ─── */}
      {selectedItem && (
        <MovieDetailModal
          isOpen={Boolean(selectedItem)}
          onClose={() => setSelectedItem(null)}
          tmdbId={selectedItem.id}
          contentType={selectedItem.type === "tv" ? "tvshow" : "movie"}
          onWatchlistChange={() => {
            fetchStats();
            fetchWatchedLists();
          }}
          onWatchedChange={() => {
            fetchStats();
            fetchWatchedLists();
          }}
        />
      )}

      {/* ─── Random Pick 3D Spin Modal ─── */}
      {isRandomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="fixed inset-0" onClick={() => setIsRandomModalOpen(false)} />

          <div className="relative w-full max-w-md rounded-2xl bg-card border border-purple-600/40 p-6 shadow-2xl shadow-purple-950/60 z-10 text-center">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center justify-center gap-2">
              <Shuffle className="h-5 w-5 text-purple-400" />
              <span>Random Title Picker</span>
            </h3>
            <p className="text-xs text-muted-foreground mb-6">
              Let fate decide your next watch!
            </p>

            <div className="flex justify-center my-6">
              {isSpinning ? (
                <div className="relative w-44 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl border-2 border-purple-500 flex flex-col items-center justify-center bg-purple-950/40 random-spin">
                  <Film className="h-12 w-12 text-purple-400 animate-pulse" />
                  <span className="text-xs text-purple-300 font-semibold mt-2">Spinning...</span>
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
                        randomItem.contentType === "tvshow" || randomItem.media_type === "tv"
                          ? "tv"
                          : "movie",
                    });
                  }}
                >
                  <Image
                    src={getImageUrl(randomItem.posterPath || randomItem.poster_path, "w500")}
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
              <Button variant="outline" size="sm" onClick={() => setIsRandomModalOpen(false)}>
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
