"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  History,
  Film,
  Tv,
  Search,
  Star,
  Clock,
  Calendar,
  Trash2,
  Edit3,
  BookmarkPlus,
  Clapperboard,
  Layers,
  ArrowUpDown,
  Filter,
  X,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Sparkles,
  LayoutGrid,
  List,
  Milestone,
  CheckCircle2,
  Award,
  Plus,
} from "lucide-react";

import { cn, formatDate, formatYear, formatRuntime, getRatingColor } from "@/lib/utils";
import { WatchedItemType } from "@/types";
import { PosterImage } from "@/components/poster-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  isAnimeItem,
  isPureMovie,
  isPureSeries,
  hasSeasons,
} from "@/lib/anime-detector";
import { SeasonSelectModal, WatchedSeriesItem } from "@/components/season-select-modal";

interface EnrichedWatchedItem extends WatchedItemType {
  franchiseName?: string | null;
  userReview?: string | null;
  createdAt?: string;
}

interface HistoryStats {
  totalWatched: number;
  totalMovies: number;
  totalSeries: number;
  totalAnime?: number;
  totalWatchTimeMinutes: number;
  averageRating: number;
}

type HistoryFilterType = "all" | "movie" | "tvshow" | "anime";

export default function HistoryPage() {
  const [items, setItems] = React.useState<EnrichedWatchedItem[]>([]);
  const [stats, setStats] = React.useState<HistoryStats>({
    totalWatched: 0,
    totalMovies: 0,
    totalSeries: 0,
    totalWatchTimeMinutes: 0,
    averageRating: 0,
  });
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filters & Controls
  const [contentType, setContentType] = React.useState<HistoryFilterType>("all");
  const [ratingFilter, setRatingFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sortBy, setSortBy] = React.useState<"chronoPosition" | "watchedDate" | "rating" | "releaseDate" | "title">("chronoPosition");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = React.useState<"timeline" | "franchise" | "grid">("timeline");

  // Season Selection Modal State
  const [selectedSeriesForSeasons, setSelectedSeriesForSeasons] =
    React.useState<WatchedSeriesItem | null>(null);

  // Dialog States
  const [editItem, setEditItem] = React.useState<EnrichedWatchedItem | null>(null);
  const [deleteItem, setDeleteItem] = React.useState<EnrichedWatchedItem | null>(null);
  const [isLogModalOpen, setIsLogModalOpen] = React.useState(false);

  // Edit Form State
  const [editWatchedDate, setEditWatchedDate] = React.useState("");
  const [editRating, setEditRating] = React.useState<number>(8);
  const [editNotes, setEditNotes] = React.useState("");
  const [isSubmittingEdit, setIsSubmittingEdit] = React.useState(false);

  // Manual Log Form State
  const [logTitle, setLogTitle] = React.useState("");
  const [logTmdbId, setLogTmdbId] = React.useState("");
  const [logType, setLogType] = React.useState<"movie" | "tvshow">("movie");
  const [logWatchedDate, setLogWatchedDate] = React.useState(() => new Date().toISOString().split("T")[0]);
  const [logRating, setLogRating] = React.useState<number>(8);
  const [logNotes, setLogNotes] = React.useState("");
  const [isSubmittingLog, setIsSubmittingLog] = React.useState(false);

  // Parse watched seasons from notes JSON
  const parseWatchedSeasons = React.useCallback((notesStr?: string | null): number[] => {
    if (!notesStr) return [];
    try {
      const parsed = JSON.parse(notesStr);
      if (Array.isArray(parsed.watchedSeasons)) {
        return parsed.watchedSeasons.map(Number);
      }
      if (Array.isArray(parsed)) {
        return parsed.map(Number);
      }
    } catch {}
    return [];
  }, []);

  const getSeasonProgressLabel = React.useCallback(
    (notesStr?: string | null): string => {
      const seasons = parseWatchedSeasons(notesStr);
      if (seasons.length > 0) {
        return `${seasons.length} Season${seasons.length > 1 ? "s" : ""} Watched`;
      }
      return "Track Seasons";
    },
    [parseWatchedSeasons]
  );

  const handleSeasonChange = (tmdbId: number, updatedSeasons: number[]) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.tmdbId === tmdbId) {
          return {
            ...item,
            notes: JSON.stringify({
              watchedSeasons: updatedSeasons,
              totalSeasons: updatedSeasons.length,
              updatedAt: new Date().toISOString(),
            }),
          };
        }
        return item;
      })
    );
  };

  // Fetch Watched History
  const fetchHistory = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (contentType !== "all") params.set("contentType", contentType);
      if (contentType === "tvshow") params.set("pureSeries", "true");
      if (contentType === "movie") params.set("pureMovie", "true");
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      params.set("sortBy", sortBy);
      params.set("order", sortOrder);

      const res = await fetch(`/api/watched?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Please log in to view your watched history");
        }
        throw new Error("Failed to load watched history");
      }

      const data = await res.json();
      setItems(data.items || []);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [contentType, searchQuery, sortBy, sortOrder]);

  React.useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Client Filter by Content Type & Rating
  const filteredItems = React.useMemo(() => {
    let list = items;

    // Strict classification: exclude anime from web series & movies; single list for anime
    if (contentType === "movie") {
      list = list.filter((i) => isPureMovie(i));
    } else if (contentType === "tvshow") {
      list = list.filter((i) => isPureSeries(i));
    } else if (contentType === "anime") {
      list = list.filter((i) => isAnimeItem(i));
    }

    if (ratingFilter === "masterpiece") {
      list = list.filter((i) => i.userRating !== null && i.userRating !== undefined && i.userRating >= 9);
    } else if (ratingFilter === "great") {
      list = list.filter(
        (i) => i.userRating !== null && i.userRating !== undefined && i.userRating >= 7 && i.userRating < 9
      );
    } else if (ratingFilter === "good") {
      list = list.filter(
        (i) => i.userRating !== null && i.userRating !== undefined && i.userRating >= 5 && i.userRating < 7
      );
    } else if (ratingFilter === "unrated") {
      list = list.filter((i) => !i.userRating);
    }
    return list;
  }, [items, contentType, ratingFilter]);

  // Group items by Franchise for Franchise View Mode
  const franchiseGroups = React.useMemo(() => {
    const map = new Map<string, { name: string; entries: EnrichedWatchedItem[] }>();
    const standalone: EnrichedWatchedItem[] = [];

    filteredItems.forEach((item) => {
      const fName = item.franchiseName || (item.franchiseId ? `Franchise #${item.franchiseId}` : null);
      if (fName) {
        if (!map.has(fName)) {
          map.set(fName, { name: fName, entries: [] });
        }
        map.get(fName)!.entries.push(item);
      } else {
        standalone.push(item);
      }
    });

    // Sort entries within each franchise by franchiseSeq if present, or releaseDate
    map.forEach((group) => {
      group.entries.sort((a, b) => {
        if (a.franchiseSeq !== null && b.franchiseSeq !== null && a.franchiseSeq !== undefined && b.franchiseSeq !== undefined) {
          return a.franchiseSeq - b.franchiseSeq;
        }
        return (a.releaseDate || "").localeCompare(b.releaseDate || "");
      });
    });

    return {
      franchises: Array.from(map.values()),
      standalone,
    };
  }, [filteredItems]);

  // Delete Watched Item
  const handleDelete = async (id: string, restoreToWatchlist: boolean = false) => {
    try {
      const res = await fetch(`/api/watched/${id}?restoreToWatchlist=${restoreToWatchlist}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove item");

      setItems((prev) => prev.filter((i) => i.id !== id));
      setDeleteItem(null);

      toast.success(
        restoreToWatchlist ? "Moved back to Watchlist" : "Removed from History",
        {
          icon: restoreToWatchlist ? "🔖" : "🗑️",
          style: {
            borderRadius: "10px",
            background: "#18181b",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.1)",
          },
        }
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove item");
    }
  };

  // Quick Rating Update
  const handleQuickRate = async (item: EnrichedWatchedItem, newRating: number) => {
    try {
      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: item.contentType,
          tmdbId: item.tmdbId,
          rating: newRating,
        }),
      });

      if (!res.ok) throw new Error("Failed to save rating");

      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, userRating: newRating } : i))
      );

      toast.success(`Rated ${newRating} / 10`, {
        icon: "⭐",
        duration: 2000,
        style: {
          borderRadius: "10px",
          background: "#18181b",
          color: "#fff",
          border: "1px solid rgba(234, 179, 8, 0.3)",
        },
      });
    } catch (err: any) {
      toast.error(err?.message || "Could not update rating");
    }
  };

  // Open Edit Modal
  const openEditModal = (item: EnrichedWatchedItem) => {
    setEditItem(item);
    setEditWatchedDate(item.watchedDate ? item.watchedDate.split("T")[0] : "");
    setEditRating(item.userRating || 8);
    setEditNotes(item.notes || "");
  };

  // Submit Edit Form
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;

    try {
      setIsSubmittingEdit(true);
      const res = await fetch(`/api/watched/${editItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          watchedDate: editWatchedDate,
          rating: editRating,
          notes: editNotes,
        }),
      });

      if (!res.ok) throw new Error("Failed to update history log");

      const updated = await res.json();
      setItems((prev) =>
        prev.map((i) =>
          i.id === updated.id
            ? {
                ...i,
                watchedDate: updated.watchedDate,
                userRating: updated.userRating,
                notes: updated.notes,
              }
            : i
        )
      );

      toast.success("History log updated", {
        icon: "✨",
        style: {
          borderRadius: "10px",
          background: "#18181b",
          color: "#fff",
          border: "1px solid rgba(255,255,255,0.1)",
        },
      });
      setEditItem(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update item");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Submit Manual Log Form
  const handleManualLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logTitle.trim()) return;

    try {
      setIsSubmittingLog(true);
      const numericTmdbId = logTmdbId.trim()
        ? parseInt(logTmdbId.trim(), 10)
        : Math.floor(100000 + Math.random() * 900000);

      const res = await fetch("/api/watched", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbId: numericTmdbId,
          contentType: logType,
          title: logTitle.trim(),
          watchedDate: logWatchedDate,
          rating: logRating,
          notes: logNotes.trim(),
          removeFromWatchlist: false,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to log viewing");
      }

      const newItem = await res.json();
      setItems((prev) => [newItem, ...prev]);
      setIsLogModalOpen(false);

      // Reset form
      setLogTitle("");
      setLogTmdbId("");
      setLogNotes("");

      toast.success(
        <div>
          <p className="font-semibold text-white">Viewing Logged Successfully!</p>
          <p className="text-xs text-purple-300">
            Journey #{newItem.chronoPosition} assigned to {newItem.title}
          </p>
        </div>,
        {
          icon: "🎬",
          style: {
            borderRadius: "10px",
            background: "#18181b",
            color: "#fff",
            border: "1px solid rgba(168,85,247,0.3)",
          },
        }
      );
    } catch (err: any) {
      toast.error(err?.message || "Could not log viewing");
    } finally {
      setIsSubmittingLog(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Background Cinematic Glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-1/4 w-[600px] h-[350px] bg-purple-900/10 rounded-full blur-[120px]" />
        <div className="absolute top-48 left-1/4 w-[500px] h-[300px] bg-blue-900/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Header & Main Stats Banner */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-6 border-b border-white/5">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="p-2.5 rounded-xl bg-purple-600/10 border border-purple-500/20 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
                <History className="h-6 w-6" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-100 to-purple-300">
                Watched History
              </h1>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground">
              Your chronological viewing journal, franchise storyline sequences, and ratings.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => setIsLogModalOpen(true)}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium shadow-[0_0_20px_rgba(147,51,234,0.3)] transition-all duration-300 gap-2 h-10 px-5"
            >
              <Plus className="h-4 w-4" />
              Log Viewing
            </Button>

            {/* View Mode Switcher */}
            <div className="flex items-center bg-card border border-white/10 rounded-lg p-1">
              <button
                onClick={() => setViewMode("timeline")}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors",
                  viewMode === "timeline"
                    ? "bg-purple-600 text-white shadow"
                    : "text-muted-foreground hover:text-white"
                )}
              >
                <Milestone className="h-3.5 w-3.5" />
                Chronological
              </button>
              <button
                onClick={() => setViewMode("franchise")}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors",
                  viewMode === "franchise"
                    ? "bg-purple-600 text-white shadow"
                    : "text-muted-foreground hover:text-white"
                )}
              >
                <Clapperboard className="h-3.5 w-3.5" />
                Franchises
              </button>
              <button
                onClick={() => setViewMode("grid")}
                aria-label="Grid View"
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  viewMode === "grid"
                    ? "bg-purple-600 text-white shadow"
                    : "text-muted-foreground hover:text-white"
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-card/40 backdrop-blur-md border border-white/5 rounded-2xl p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Total Watched
              </p>
              <p className="text-2xl font-bold text-white">{stats.totalWatched}</p>
            </div>
          </div>

          <div className="bg-card/40 backdrop-blur-md border border-white/5 rounded-2xl p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400">
              <Film className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Movies / Series / Anime
              </p>
              <p className="text-xl sm:text-2xl font-bold text-white">
                {stats.totalMovies} <span className="text-xs font-normal text-muted-foreground">/</span> {stats.totalSeries} <span className="text-xs font-normal text-muted-foreground">/</span> <span className="text-rose-400">{stats.totalAnime || 0}</span>
              </p>
            </div>
          </div>

          <div className="bg-card/40 backdrop-blur-md border border-white/5 rounded-2xl p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Screen Time
              </p>
              <p className="text-2xl font-bold text-white">
                {stats.totalWatchTimeMinutes > 0 ? formatRuntime(stats.totalWatchTimeMinutes) : "0m"}
              </p>
            </div>
          </div>

          <div className="bg-card/40 backdrop-blur-md border border-white/5 rounded-2xl p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-yellow-500/10 text-yellow-400">
              <Star className="h-5 w-5 fill-yellow-400/20" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Avg Rating
              </p>
              <p className="text-2xl font-bold text-white">
                {stats.averageRating > 0 ? `${stats.averageRating} / 10` : "Unrated"}
              </p>
            </div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-card/30 backdrop-blur-md border border-white/5 rounded-2xl p-4 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search history by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background/50 border-white/10 text-white placeholder:text-muted-foreground/60 h-10 rounded-xl focus:border-purple-500/50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Type Selector Tabs */}
            <div className="flex items-center gap-1.5 bg-background/60 p-1 rounded-xl border border-white/5 overflow-x-auto scrollbar-none">
              <button
                onClick={() => setContentType("all")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0",
                  contentType === "all"
                    ? "bg-purple-600 text-white shadow"
                    : "text-muted-foreground hover:text-white"
                )}
              >
                All
              </button>
              <button
                onClick={() => setContentType("movie")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0",
                  contentType === "movie"
                    ? "bg-purple-600 text-white shadow"
                    : "text-muted-foreground hover:text-white"
                )}
              >
                <Film className="h-3.5 w-3.5" />
                Movies
              </button>
              <button
                onClick={() => setContentType("tvshow")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0",
                  contentType === "tvshow"
                    ? "bg-purple-600 text-white shadow"
                    : "text-muted-foreground hover:text-white"
                )}
              >
                <Tv className="h-3.5 w-3.5" />
                Web Series
              </button>
              <button
                onClick={() => setContentType("anime")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0",
                  contentType === "anime"
                    ? "bg-rose-600 text-white shadow"
                    : "text-muted-foreground hover:text-white"
                )}
              >
                <Sparkles className="h-3.5 w-3.5 text-rose-400" />
                Anime
              </button>
            </div>

            {/* Rating Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">My Rating:</span>
              <select
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
                className="bg-background/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-purple-500"
              >
                <option value="all">All Ratings</option>
                <option value="masterpiece">⭐ 9 - 10 (Masterpieces)</option>
                <option value="great">⭐ 7 - 8 (Great)</option>
                <option value="good">⭐ 5 - 6 (Good)</option>
                <option value="unrated">Unrated</option>
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-background/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-purple-500"
              >
                <option value="chronoPosition">Journey Sequence (#)</option>
                <option value="watchedDate">Date Watched</option>
                <option value="rating">My Rating</option>
                <option value="releaseDate">Release Year</option>
                <option value="title">Title (A-Z)</option>
              </select>
              <button
                onClick={() => setSortOrder((o) => (o === "asc" ? "desc" : "asc"))}
                aria-label="Toggle sort order"
                className="p-2 rounded-xl bg-background/80 border border-white/10 hover:border-purple-500/50 text-muted-foreground hover:text-white transition-colors"
              >
                <ArrowUpDown className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Section */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div
                key={idx}
                className="h-28 rounded-2xl border border-white/5 bg-card/40 shimmer"
              />
            ))}
          </div>
        ) : error ? (
          <div className="bg-card/40 border border-destructive/20 rounded-2xl p-12 text-center max-w-md mx-auto space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <h3 className="text-lg font-bold text-white">Unable to Load History</h3>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={() => fetchHistory()} variant="outline" className="border-white/10">
              Try Again
            </Button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-card/20 border border-white/5 rounded-3xl p-16 text-center max-w-lg mx-auto space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-purple-600/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(168,85,247,0.15)]">
              <History className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">No Watched History Yet</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {searchQuery || ratingFilter !== "all"
                  ? "No viewing records match your filters."
                  : "Start logging the movies and series you have seen, or mark titles from your watchlist to begin your journey."}
              </p>
            </div>
            {searchQuery || ratingFilter !== "all" ? (
              <Button
                onClick={() => {
                  setSearchQuery("");
                  setRatingFilter("all");
                  setContentType("all");
                }}
                variant="outline"
                className="border-white/10 text-white"
              >
                Clear Filters
              </Button>
            ) : (
              <div className="flex justify-center gap-3">
                <Button
                  onClick={() => setIsLogModalOpen(true)}
                  className="bg-purple-600 hover:bg-purple-500 text-white gap-2"
                >
                  <Plus className="h-4 w-4" /> Log First Movie
                </Button>
                <Link href="/watchlist">
                  <Button variant="outline" className="border-white/10 text-white">
                    Go to Watchlist
                  </Button>
                </Link>
              </div>
            )}
          </div>
        ) : viewMode === "timeline" ? (
          /* CHRONOLOGICAL TIMELINE VIEW */
          <div className="relative pl-6 sm:pl-10 space-y-6 before:absolute before:left-3 sm:before:left-5 before:top-4 before:bottom-4 before:w-0.5 before:bg-gradient-to-b before:from-purple-500 before:via-indigo-500 before:to-purple-900/20">
            <AnimatePresence>
              {filteredItems.map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ delay: idx * 0.03 }}
                  className="relative group flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-5 rounded-2xl bg-card/40 border border-white/5 hover:border-purple-500/40 transition-all gap-4 shadow-lg hover:shadow-purple-500/5 backdrop-blur-md"
                >
                  {/* Timeline Node Badge */}
                  <div className="absolute -left-6 sm:-left-10 top-5 -translate-x-1/2 w-7 h-7 rounded-full bg-purple-600 text-white border-4 border-background flex items-center justify-center text-[10px] font-extrabold shadow-md shadow-purple-600/40 z-10">
                    #{item.chronoPosition}
                  </div>

                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="relative w-16 h-24 sm:w-20 sm:h-28 rounded-xl overflow-hidden shrink-0 bg-muted shadow-md">
                      <PosterImage
                        src={item.posterPath}
                        alt={item.title}
                        size="w185"
                        aspectRatio="poster"
                        fallbackIcon={item.contentType === "tvshow" ? "tv" : "movie"}
                      />
                    </div>

                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-purple-400 bg-purple-950/60 border border-purple-500/30 px-2 py-0.5 rounded-md">
                          Journey #{item.chronoPosition}
                        </span>
                        <h4 className="text-base font-bold text-white truncate">{item.title}</h4>
                        {item.franchiseName && (
                          <span className="bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 text-[10px] font-medium px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Clapperboard className="h-3 w-3" />
                            {item.franchiseName}
                            {item.franchiseSeq ? ` • Part ${item.franchiseSeq}` : ""}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1 text-zinc-300">
                          <Calendar className="h-3.5 w-3.5 text-purple-400" />
                          Watched: {formatDate(item.watchedDate)}
                        </span>
                        <span>•</span>
                        <span>Released: {formatYear(item.releaseDate)}</span>
                        {item.runtime ? (
                          <>
                            <span>•</span>
                            <span>{formatRuntime(item.runtime)}</span>
                          </>
                        ) : null}
                      </div>

                      {/* User Rating Star Selector */}
                      <div className="flex items-center gap-2 pt-1">
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 10 }).map((_, i) => {
                            const starVal = i + 1;
                            const isFilled = (item.userRating || 0) >= starVal;
                            return (
                              <button
                                key={starVal}
                                type="button"
                                title={`Rate ${starVal} / 10`}
                                onClick={() => handleQuickRate(item, starVal)}
                                className="p-0.5 transition-transform hover:scale-125 focus:outline-none"
                              >
                                <Star
                                  className={cn(
                                    "h-3.5 w-3.5",
                                    isFilled
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "text-zinc-600 hover:text-yellow-400/50"
                                  )}
                                />
                              </button>
                            );
                          })}
                        </div>
                        <span className="text-xs font-bold text-yellow-400">
                          {item.userRating ? `${item.userRating}/10` : "Unrated"}
                        </span>
                      </div>

                      {/* Season Progress for Anime Series & Web Series */}
                      {hasSeasons(item) && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedSeriesForSeasons({
                                id: item.id,
                                tmdbId: item.tmdbId,
                                title: item.title,
                                posterPath: item.posterPath,
                                backdropPath: item.backdropPath,
                                releaseDate: item.releaseDate,
                                notes: item.notes,
                              })
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-950/70 hover:bg-indigo-900 border border-indigo-500/40 hover:border-indigo-400 text-indigo-300 text-xs font-semibold transition-all shadow-sm"
                            title="Click to mark seasons you have watched"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                            <span>{getSeasonProgressLabel(item.notes)}</span>
                            <span className="text-[10px] text-indigo-400/80 underline ml-1">
                              • Mark Seasons
                            </span>
                          </button>
                        </div>
                      )}

                      {/* Notes / Thoughts snippet */}
                      {item.notes && !item.notes.startsWith('{"watchedSeasons"') && (
                        <p className="text-xs text-zinc-300 italic line-clamp-2 bg-white/5 border border-white/5 rounded-lg p-2 mt-1">
                          "{item.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {hasSeasons(item) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setSelectedSeriesForSeasons({
                            id: item.id,
                            tmdbId: item.tmdbId,
                            title: item.title,
                            posterPath: item.posterPath,
                            backdropPath: item.backdropPath,
                            releaseDate: item.releaseDate,
                            notes: item.notes,
                          })
                        }
                        className="border-indigo-500/40 hover:border-indigo-400 bg-indigo-950/50 hover:bg-indigo-900 text-indigo-200 text-xs h-9 px-3 gap-1.5 shadow-sm"
                        title="Mark what seasons you have seen"
                      >
                        <Layers className="h-3.5 w-3.5 text-indigo-400" />
                        Seasons
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditModal(item)}
                      className="border-white/10 hover:border-purple-500/50 text-white text-xs h-9 px-3 gap-1.5"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Edit Log
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      title="Move back to Watchlist"
                      onClick={() => handleDelete(item.id, true)}
                      className="text-muted-foreground hover:text-purple-300 h-9 px-2.5"
                    >
                      <BookmarkPlus className="h-4 w-4" />
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      title="Remove from history"
                      onClick={() => setDeleteItem(item)}
                      className="text-muted-foreground hover:text-rose-400 h-9 px-2.5"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : viewMode === "franchise" ? (
          /* FRANCHISE GROUPING VIEW (MOST IMPORTANT FEATURE) */
          <div className="space-y-8">
            {franchiseGroups.franchises.length === 0 && (
              <div className="bg-card/30 border border-white/5 rounded-2xl p-8 text-center text-muted-foreground text-sm">
                No franchise-linked viewings recorded yet. Titles belonging to TMDB collections (e.g. Marvel, Star Wars, Batman) will group automatically here.
              </div>
            )}

            {franchiseGroups.franchises.map((group) => {
              const count = group.entries.length;
              return (
                <div
                  key={group.name}
                  className="rounded-3xl bg-card/30 border border-purple-500/20 p-6 space-y-5 backdrop-blur-md shadow-xl"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-purple-600/20 text-purple-300 border border-purple-500/30">
                        <Clapperboard className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white tracking-tight">
                          {group.name}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {count} {count === 1 ? "entry" : "entries"} watched in your cinematic journey
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-3 py-1 rounded-full bg-purple-950/80 border border-purple-500/40 text-purple-300">
                        Franchise Order Sequence
                      </span>
                    </div>
                  </div>

                  {/* Sequential timeline within franchise */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.entries.map((item, fIdx) => (
                      <div
                        key={item.id}
                        className="relative flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-purple-500/40 transition-all group"
                      >
                        <div className="relative w-14 h-20 rounded-lg overflow-hidden shrink-0 bg-muted shadow">
                          <PosterImage
                            src={item.posterPath}
                            alt={item.title}
                            size="w185"
                            aspectRatio="poster"
                          />
                        </div>

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-purple-600 text-white">
                              Part {item.franchiseSeq || fIdx + 1}
                            </span>
                            <span className="text-[10px] text-zinc-400">
                              (Chrono #{item.chronoPosition})
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-white truncate group-hover:text-purple-300 transition-colors">
                            {item.title}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{formatYear(item.releaseDate)}</span>
                            {item.userRating && (
                              <span className="flex items-center gap-0.5 text-yellow-400 font-semibold">
                                <Star className="h-3 w-3 fill-yellow-400" />
                                {item.userRating}
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Standalone Section */}
            {franchiseGroups.standalone.length > 0 && (
              <div className="rounded-3xl bg-card/20 border border-white/5 p-6 space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Film className="h-5 w-5 text-purple-400" />
                  Standalone Films & Series
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {franchiseGroups.standalone.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-purple-500/40 transition-all group"
                    >
                      <div className="relative w-14 h-20 rounded-lg overflow-hidden shrink-0 bg-muted shadow">
                        <PosterImage
                          src={item.posterPath}
                          alt={item.title}
                          size="w185"
                          aspectRatio="poster"
                        />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <span className="text-[10px] text-purple-400 font-semibold">
                          Journey #{item.chronoPosition}
                        </span>
                        <h4 className="text-sm font-bold text-white truncate">{item.title}</h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatYear(item.releaseDate)}</span>
                          {item.userRating && (
                            <span className="flex items-center gap-0.5 text-yellow-400 font-semibold">
                              <Star className="h-3 w-3 fill-yellow-400" />
                              {item.userRating}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* GRID VIEW MODE */
          <motion.div
            layout
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5"
          >
            <AnimatePresence>
              {filteredItems.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="group relative flex flex-col rounded-2xl bg-card/40 border border-white/5 hover:border-purple-500/40 transition-all duration-300 overflow-hidden shadow-lg hover:shadow-purple-500/10 movie-card"
                >
                  <div className="relative aspect-[2/3] w-full overflow-hidden bg-muted">
                    <PosterImage
                      src={item.posterPath}
                      alt={item.title}
                      size="w500"
                      aspectRatio="poster"
                      fallbackIcon={item.contentType === "tvshow" ? "tv" : "movie"}
                      showGradient={true}
                    />

                    {/* Chrono Journey Badge */}
                    <div className="absolute top-2.5 left-2.5 z-10">
                      <span className="bg-purple-600/90 backdrop-blur-md text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-md">
                        #{item.chronoPosition}
                      </span>
                    </div>

                    {/* Rating Badge */}
                    {item.userRating && (
                      <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-full border border-yellow-500/30 shadow-md">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-[11px] font-bold text-yellow-400">
                          {item.userRating}
                        </span>
                      </div>
                    )}

                    {/* Franchise Badge */}
                    {item.franchiseName && (
                      <div className="absolute bottom-2.5 left-2.5 right-2.5 z-10 flex items-center gap-1 bg-indigo-950/80 backdrop-blur-md px-2 py-0.5 rounded-md border border-indigo-500/30 text-[10px] font-medium text-indigo-200 truncate">
                        <Clapperboard className="h-3 w-3 shrink-0 text-indigo-400" />
                        <span className="truncate">{item.franchiseName}</span>
                      </div>
                    )}

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 z-20 bg-black/75 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-3 gap-2">
                      {hasSeasons(item) && (
                        <Button
                          size="sm"
                          onClick={() =>
                            setSelectedSeriesForSeasons({
                              id: item.id,
                              tmdbId: item.tmdbId,
                              title: item.title,
                              posterPath: item.posterPath,
                              backdropPath: item.backdropPath,
                              releaseDate: item.releaseDate,
                              notes: item.notes,
                            })
                          }
                          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs h-8 gap-1.5 shadow-md"
                        >
                          <Layers className="h-3.5 w-3.5" />
                          Track Seasons
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() => openEditModal(item)}
                        className="w-full bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs h-8 gap-1.5"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Edit Log
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleDelete(item.id, true)}
                        className="w-full bg-white/10 hover:bg-white/20 text-white text-xs h-8 gap-1"
                      >
                        <BookmarkPlus className="h-3.5 w-3.5" />
                        To Watchlist
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setDeleteItem(item)}
                        className="w-full bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 text-xs h-8 border border-rose-500/30"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>

                  <div className="p-3.5 flex flex-col flex-1 justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-semibold text-white line-clamp-1 group-hover:text-purple-300 transition-colors">
                        {item.title}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span>{formatDate(item.watchedDate)}</span>
                      </div>
                      {hasSeasons(item) && (
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedSeriesForSeasons({
                              id: item.id,
                              tmdbId: item.tmdbId,
                              title: item.title,
                              posterPath: item.posterPath,
                              backdropPath: item.backdropPath,
                              releaseDate: item.releaseDate,
                              notes: item.notes,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-950/70 border border-indigo-500/30 text-indigo-300 text-[10px] font-semibold hover:bg-indigo-900 transition-colors mt-1.5 w-fit shadow-sm"
                          title="Click to mark seasons watched"
                        >
                          <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" />
                          <span className="truncate">{getSeasonProgressLabel(item.notes)}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* EDIT LOG MODAL */}
      <Dialog open={Boolean(editItem)} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent className="max-w-md bg-card border-white/10 text-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-purple-400" />
              Edit History Entry
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Update your watch date, star rating, and personal notes.
            </DialogDescription>
          </DialogHeader>

          {editItem && (
            <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
              <div className="flex items-center gap-3.5 p-3 rounded-xl bg-white/5 border border-white/5">
                <div className="w-12 h-16 rounded-lg overflow-hidden shrink-0 bg-muted">
                  <PosterImage
                    src={editItem.posterPath}
                    alt={editItem.title}
                    size="w92"
                    aspectRatio="poster"
                  />
                </div>
                <div>
                  <h4 className="font-semibold text-white text-sm line-clamp-1">
                    {editItem.title}
                  </h4>
                  <p className="text-xs text-purple-400 font-medium">
                    Journey #{editItem.chronoPosition}
                  </p>
                </div>
              </div>

              {/* Watched Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Date Watched</label>
                <Input
                  type="date"
                  value={editWatchedDate}
                  onChange={(e) => setEditWatchedDate(e.target.value)}
                  className="bg-background/80 border-white/10 text-white rounded-xl"
                  required
                />
              </div>

              {/* Rating Selector */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-zinc-300">Your Rating</label>
                  <span className="text-sm font-bold text-yellow-400 flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-yellow-400" />
                    {editRating} / 10
                  </span>
                </div>
                <div className="grid grid-cols-10 gap-1">
                  {Array.from({ length: 10 }).map((_, i) => {
                    const score = i + 1;
                    return (
                      <button
                        key={score}
                        type="button"
                        onClick={() => setEditRating(score)}
                        className={cn(
                          "py-1.5 rounded-lg text-xs font-bold transition-all",
                          editRating >= score
                            ? "bg-yellow-400/20 text-yellow-300 border border-yellow-400/50 shadow-sm"
                            : "bg-white/5 text-muted-foreground hover:bg-white/10"
                        )}
                      >
                        {score}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Personal Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Personal Notes / Review</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Record your thoughts or review..."
                  className="w-full h-24 bg-background/80 border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-muted-foreground/60 focus:outline-none focus:border-purple-500"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditItem(null)}
                  className="text-muted-foreground hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-medium"
                >
                  {isSubmittingEdit ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* CONFIRM DELETE MODAL */}
      <Dialog open={Boolean(deleteItem)} onOpenChange={(open) => !open && setDeleteItem(null)}>
        <DialogContent className="max-w-sm bg-card border-white/10 text-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-rose-400" />
              Remove from History?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to remove <span className="text-white font-semibold">{deleteItem?.title}</span> from your watched history?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4 flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => deleteItem && handleDelete(deleteItem.id, true)}
              className="border-purple-500/30 text-purple-200 hover:text-white"
            >
              Move to Watchlist
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteItem && handleDelete(deleteItem.id, false)}
              className="bg-rose-600 hover:bg-rose-500 text-white"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MANUAL LOG MODAL */}
      <Dialog open={isLogModalOpen} onOpenChange={setIsLogModalOpen}>
        <DialogContent className="max-w-md bg-card border-white/10 text-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Plus className="h-5 w-5 text-purple-400" />
              Log Watched Film or Series
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Record any movie or TV series you've seen directly into your history.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleManualLogSubmit} className="space-y-4 pt-2">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Title</label>
              <Input
                type="text"
                placeholder="e.g. Inception, Breaking Bad, The Dark Knight"
                value={logTitle}
                onChange={(e) => setLogTitle(e.target.value)}
                className="bg-background/80 border-white/10 text-white rounded-xl"
                required
              />
            </div>

            {/* Type & TMDB ID row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Content Type</label>
                <select
                  value={logType}
                  onChange={(e) => setLogType(e.target.value as any)}
                  className="w-full bg-background/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-purple-500"
                >
                  <option value="movie">Movie</option>
                  <option value="tvshow">TV Series</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">TMDB ID (Optional)</label>
                <Input
                  type="number"
                  placeholder="e.g. 27205"
                  value={logTmdbId}
                  onChange={(e) => setLogTmdbId(e.target.value)}
                  className="bg-background/80 border-white/10 text-white rounded-xl text-xs"
                />
              </div>
            </div>

            {/* Watched Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Date Watched</label>
              <Input
                type="date"
                value={logWatchedDate}
                onChange={(e) => setLogWatchedDate(e.target.value)}
                className="bg-background/80 border-white/10 text-white rounded-xl"
                required
              />
            </div>

            {/* Rating Selector */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-zinc-300">Your Rating</label>
                <span className="text-sm font-bold text-yellow-400 flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-yellow-400" />
                  {logRating} / 10
                </span>
              </div>
              <div className="grid grid-cols-10 gap-1">
                {Array.from({ length: 10 }).map((_, i) => {
                  const score = i + 1;
                  return (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setLogRating(score)}
                      className={cn(
                        "py-1.5 rounded-lg text-xs font-bold transition-all",
                        logRating >= score
                          ? "bg-yellow-400/20 text-yellow-300 border border-yellow-400/50 shadow-sm"
                          : "bg-white/5 text-muted-foreground hover:bg-white/10"
                      )}
                    >
                      {score}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Personal Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Review / Notes (Optional)</label>
              <textarea
                value={logNotes}
                onChange={(e) => setLogNotes(e.target.value)}
                placeholder="Memorable scenes, thoughts, or review..."
                className="w-full h-20 bg-background/80 border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-muted-foreground/60 focus:outline-none focus:border-purple-500"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsLogModalOpen(false)}
                className="text-muted-foreground hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingLog}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium"
              >
                {isSubmittingLog ? "Logging..." : "Log to History"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* SEASON SELECTION MODAL */}
      <SeasonSelectModal
        isOpen={Boolean(selectedSeriesForSeasons)}
        onClose={() => setSelectedSeriesForSeasons(null)}
        series={selectedSeriesForSeasons}
        onSeasonsChange={handleSeasonChange}
        onRemoveSeries={(tmdbId) => {
          const item = items.find((i) => i.tmdbId === tmdbId);
          if (item) handleDelete(item.id, false);
          setSelectedSeriesForSeasons(null);
        }}
      />
    </div>
  );
}
