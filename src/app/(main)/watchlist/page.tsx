"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  Film,
  Tv,
  Search,
  Sparkles,
  LayoutGrid,
  List,
  Star,
  Clock,
  Calendar,
  Trash2,
  CheckCircle2,
  Edit3,
  Flame,
  ArrowUpDown,
  Filter,
  Shuffle,
  X,
  Play,
  RotateCcw,
  BookMarked,
  Layers,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Clapperboard,
} from "lucide-react";

import { cn, formatDate, formatYear, formatRuntime, getRatingColor } from "@/lib/utils";
import { isAnimeItem, isPureMovie, isPureSeries } from "@/lib/anime-detector";
import { WatchlistItemType } from "@/types";
import { PosterImage } from "@/components/poster-image";
import { GenreBadge } from "@/components/genre-badge";
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

interface EnrichedWatchlistItem extends WatchlistItemType {
  collectionId?: number | null;
  collectionName?: string | null;
  userRating?: number | null;
}

export default function WatchlistPage() {
  const [items, setItems] = React.useState<EnrichedWatchlistItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filters & Controls
  const [contentType, setContentType] = React.useState<"all" | "movie" | "tvshow" | "anime">("all");
  const [priorityFilter, setPriorityFilter] = React.useState<string>("all");
  const [selectedGenre, setSelectedGenre] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sortBy, setSortBy] = React.useState<"addedAt" | "priority" | "voteAverage" | "releaseDate" | "title">("addedAt");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");

  // Dialog States
  const [markWatchedItem, setMarkWatchedItem] = React.useState<EnrichedWatchlistItem | null>(null);
  const [editItem, setEditItem] = React.useState<EnrichedWatchlistItem | null>(null);
  const [deleteItem, setDeleteItem] = React.useState<EnrichedWatchlistItem | null>(null);

  // Mark Watched Form State
  const [watchDate, setWatchDate] = React.useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [watchRating, setWatchRating] = React.useState<number>(8);
  const [watchNotes, setWatchNotes] = React.useState<string>("");
  const [isSubmittingWatched, setIsSubmittingWatched] = React.useState(false);

  // Edit Priority & Notes State
  const [editPriority, setEditPriority] = React.useState<number>(0);
  const [editNotes, setEditNotes] = React.useState<string>("");
  const [isSubmittingEdit, setIsSubmittingEdit] = React.useState(false);

  // Random Pick Feature State
  const [isRandomModalOpen, setIsRandomModalOpen] = React.useState(false);
  const [randomFilterType, setRandomFilterType] = React.useState<"all" | "movie" | "tvshow">("all");
  const [randomCandidate, setRandomCandidate] = React.useState<EnrichedWatchlistItem | null>(null);
  const [isSpinning, setIsSpinning] = React.useState(false);
  const [spinCount, setSpinCount] = React.useState(0);

  // Fetch watchlist data
  const fetchWatchlist = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (contentType !== "all" && contentType !== "anime") params.set("contentType", contentType);
      if (priorityFilter !== "all") params.set("priority", priorityFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      params.set("sortBy", sortBy);
      params.set("order", sortOrder);

      const res = await fetch(`/api/watchlist?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Please log in to view your watchlist");
        }
        throw new Error("Failed to load watchlist");
      }

      const data = await res.json();
      setItems(data.items || []);
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [contentType, priorityFilter, searchQuery, sortBy, sortOrder]);

  React.useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  // Extract unique genres for filtering
  const allGenres = React.useMemo(() => {
    const genreSet = new Set<string>();
    items.forEach((item) => {
      if (item.genres) {
        try {
          const parsed = JSON.parse(item.genres);
          if (Array.isArray(parsed)) {
            parsed.forEach((g: any) => {
              const name = typeof g === "string" ? g : g.name;
              if (name) genreSet.add(name);
            });
          }
        } catch {
          item.genres.split(",").forEach((g) => {
            const trimmed = g.trim();
            if (trimmed) genreSet.add(trimmed);
          });
        }
      }
    });
    return Array.from(genreSet).sort();
  }, [items]);

  // Filter items by client-side content type & genre
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

    if (selectedGenre !== "all") {
      list = list.filter((item) => {
        if (!item.genres) return false;
        try {
          const parsed = JSON.parse(item.genres);
          if (Array.isArray(parsed)) {
            return parsed.some((g: any) => (typeof g === "string" ? g : g.name) === selectedGenre);
          }
        } catch {
          return item.genres.includes(selectedGenre);
        }
        return false;
      });
    }

    return list;
  }, [items, contentType, selectedGenre]);

  // Overall Statistics
  const stats = React.useMemo(() => {
    const totalItems = items.length;
    const moviesCount = items.filter((i) => isPureMovie(i)).length;
    const tvCount = items.filter((i) => isPureSeries(i)).length;
    const animeCount = items.filter((i) => isAnimeItem(i)).length;
    const totalMinutes = items.reduce((acc, i) => acc + (i.runtime || 0), 0);
    const highPriorityCount = items.filter((i) => i.priority >= 2).length;

    return {
      totalItems,
      moviesCount,
      tvCount,
      animeCount,
      totalMinutes,
      highPriorityCount,
    };
  }, [items]);

  // Handle Remove from Watchlist
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/watchlist/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove item");

      setItems((prev) => prev.filter((item) => item.id !== id));
      toast.success("Removed from watchlist", {
        icon: "🗑️",
        style: {
          borderRadius: "10px",
          background: "#18181b",
          color: "#fff",
          border: "1px solid rgba(255,255,255,0.1)",
        },
      });
      setDeleteItem(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove item");
    }
  };

  // Handle Mark as Watched
  const handleMarkWatchedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!markWatchedItem) return;

    try {
      setIsSubmittingWatched(true);
      const res = await fetch("/api/watched", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbId: markWatchedItem.tmdbId,
          contentType: markWatchedItem.contentType,
          title: markWatchedItem.title,
          posterPath: markWatchedItem.posterPath,
          backdropPath: markWatchedItem.backdropPath,
          releaseDate: markWatchedItem.releaseDate,
          voteAverage: markWatchedItem.voteAverage,
          genres: markWatchedItem.genres,
          runtime: markWatchedItem.runtime,
          watchedDate: watchDate,
          rating: watchRating,
          notes: watchNotes,
          removeFromWatchlist: true,
          collectionId: markWatchedItem.collectionId,
          collectionName: markWatchedItem.collectionName,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to mark as watched");
      }

      const responseData = await res.json();

      // Remove from local list
      setItems((prev) => prev.filter((i) => i.id !== markWatchedItem.id));
      setMarkWatchedItem(null);

      toast.success(
        <div>
          <p className="font-semibold text-white">Added to Watched History!</p>
          <p className="text-xs text-purple-300">
            Assigned Chrono Journey #{responseData.chronoPosition || "1"}
          </p>
        </div>,
        {
          icon: "🍿",
          duration: 4000,
          style: {
            borderRadius: "10px",
            background: "#18181b",
            color: "#fff",
            border: "1px solid rgba(168, 85, 247, 0.3)",
          },
        }
      );
    } catch (err: any) {
      toast.error(err?.message || "Could not mark as watched");
    } finally {
      setIsSubmittingWatched(false);
    }
  };

  // Handle Edit Priority and Notes Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;

    try {
      setIsSubmittingEdit(true);
      const res = await fetch(`/api/watchlist/${editItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priority: editPriority,
          notes: editNotes,
        }),
      });

      if (!res.ok) throw new Error("Failed to update item");

      const updated = await res.json();
      setItems((prev) =>
        prev.map((i) => (i.id === updated.id ? { ...i, priority: updated.priority, notes: updated.notes } : i))
      );

      toast.success("Watchlist item updated", {
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
      toast.error(err?.message || "Update failed");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (item: EnrichedWatchlistItem) => {
    setEditItem(item);
    setEditPriority(item.priority);
    setEditNotes(item.notes || "");
  };

  // Open Mark Watched Modal
  const openMarkWatchedModal = (item: EnrichedWatchlistItem) => {
    setMarkWatchedItem(item);
    setWatchDate(new Date().toISOString().split("T")[0]);
    setWatchRating(8);
    setWatchNotes(item.notes || "");
  };

  // Execute Random Spin
  const spinRandomPick = () => {
    let pool = items;
    if (randomFilterType !== "all") {
      pool = pool.filter((i) => i.contentType === randomFilterType);
    }

    if (pool.length === 0) {
      toast.error("No items match your filter criteria to spin!");
      return;
    }

    setIsSpinning(true);
    setSpinCount((c) => c + 1);

    // Pick a random candidate
    const randomIndex = Math.floor(Math.random() * pool.length);
    const chosen = pool[randomIndex];

    // Simulate cinematic spin delay
    setTimeout(() => {
      setRandomCandidate(chosen);
      setIsSpinning(false);
    }, 1100);
  };

  const openRandomModal = () => {
    setIsRandomModalOpen(true);
    setRandomCandidate(null);
    setTimeout(() => {
      spinRandomPick();
    }, 200);
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Background Cinematic Glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[350px] bg-purple-900/10 rounded-full blur-[120px]" />
        <div className="absolute top-40 right-1/4 w-[500px] h-[300px] bg-blue-900/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Header & Main Stats Banner */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-6 border-b border-white/5">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="p-2.5 rounded-xl bg-purple-600/10 border border-purple-500/20 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
                <BookMarked className="h-6 w-6" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-100 to-purple-300">
                My Watchlist
              </h1>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground">
              Your hand-curated vault of films and series queued for the silver screen.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={openRandomModal}
              disabled={items.length === 0}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium shadow-[0_0_20px_rgba(147,51,234,0.3)] transition-all duration-300 gap-2 h-10 px-5"
            >
              <Sparkles className="h-4 w-4 animate-pulse text-yellow-300" />
              Random Pick
            </Button>

            <div className="flex items-center bg-card border border-white/10 rounded-lg p-1">
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
              <button
                onClick={() => setViewMode("list")}
                aria-label="List View"
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  viewMode === "list"
                    ? "bg-purple-600 text-white shadow"
                    : "text-muted-foreground hover:text-white"
                )}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-card/40 backdrop-blur-md border border-white/5 rounded-2xl p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Total Titles
              </p>
              <p className="text-2xl font-bold text-white">{stats.totalItems}</p>
            </div>
          </div>

          <div className="bg-card/40 backdrop-blur-md border border-white/5 rounded-2xl p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400">
              <Film className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Movies
              </p>
              <p className="text-2xl font-bold text-white">{stats.moviesCount}</p>
            </div>
          </div>

          <div className="bg-card/40 backdrop-blur-md border border-white/5 rounded-2xl p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Tv className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                TV Series
              </p>
              <p className="text-2xl font-bold text-white">{stats.tvCount}</p>
            </div>
          </div>

          <div className="bg-card/40 backdrop-blur-md border border-white/5 rounded-2xl p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Watch Time
              </p>
              <p className="text-2xl font-bold text-white">
                {stats.totalMinutes > 0 ? formatRuntime(stats.totalMinutes) : "0m"}
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
                placeholder="Search your watchlist by title..."
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

            {/* Priority Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Priority:</span>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="bg-background/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-purple-500"
              >
                <option value="all">All Priorities</option>
                <option value="2">🔥 High Priority</option>
                <option value="1">⚡ Medium Priority</option>
                <option value="0">🌱 Normal</option>
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
                <option value="addedAt">Date Added</option>
                <option value="priority">Priority</option>
                <option value="voteAverage">Rating</option>
                <option value="releaseDate">Release Date</option>
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

          {/* Genre Filters Row */}
          {allGenres.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pt-2 pb-1 scrollbar-none">
              <span className="text-xs text-muted-foreground font-medium mr-1 shrink-0 flex items-center gap-1">
                <Filter className="h-3 w-3" /> Genres:
              </span>
              <button
                onClick={() => setSelectedGenre("all")}
                className={cn(
                  "text-xs px-2.5 py-1 rounded-full whitespace-nowrap font-medium transition-all",
                  selectedGenre === "all"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "bg-white/5 text-muted-foreground hover:text-white hover:bg-white/10 border border-white/5"
                )}
              >
                All Genres
              </button>
              {allGenres.map((g) => (
                <button
                  key={g}
                  onClick={() => setSelectedGenre(g)}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-full whitespace-nowrap font-medium transition-all",
                    selectedGenre === g
                      ? "bg-purple-600 text-white shadow-sm"
                      : "bg-white/5 text-muted-foreground hover:text-white hover:bg-white/10 border border-white/5"
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content Section */}
        {isLoading ? (
          <div
            className={cn(
              "grid gap-6",
              viewMode === "grid"
                ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
                : "grid-cols-1"
            )}
          >
            {Array.from({ length: 12 }).map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  "rounded-2xl border border-white/5 bg-card/40 overflow-hidden shimmer",
                  viewMode === "grid" ? "aspect-[2/3]" : "h-36 flex gap-4 p-4"
                )}
              />
            ))}
          </div>
        ) : error ? (
          <div className="bg-card/40 border border-destructive/20 rounded-2xl p-12 text-center max-w-md mx-auto space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <h3 className="text-lg font-bold text-white">Unable to Load Watchlist</h3>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={() => fetchWatchlist()} variant="outline" className="border-white/10">
              Try Again
            </Button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-card/20 border border-white/5 rounded-3xl p-16 text-center max-w-lg mx-auto space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-purple-600/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(168,85,247,0.15)]">
              <Film className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Your Watchlist is Empty</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {searchQuery || selectedGenre !== "all" || priorityFilter !== "all"
                  ? "No titles matched your active filters. Try resetting search criteria or clearing filters."
                  : "Start exploring trending movies, TV shows, and legendary franchises to curate your cinematic queue."}
              </p>
            </div>
            {searchQuery || selectedGenre !== "all" || priorityFilter !== "all" ? (
              <Button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedGenre("all");
                  setPriorityFilter("all");
                  setContentType("all");
                }}
                variant="outline"
                className="border-white/10 text-white"
              >
                Clear All Filters
              </Button>
            ) : (
              <Link href="/discover">
                <Button className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium shadow-lg hover:shadow-purple-500/20 gap-2">
                  <Sparkles className="h-4 w-4" />
                  Discover Movies & TV
                </Button>
              </Link>
            )}
          </div>
        ) : viewMode === "grid" ? (
          /* Grid View Mode */
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
                  transition={{ duration: 0.2 }}
                  className="group relative flex flex-col rounded-2xl bg-card/40 border border-white/5 hover:border-purple-500/40 transition-all duration-300 overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-purple-500/10 movie-card"
                >
                  {/* Poster Container */}
                  <div className="relative aspect-[2/3] w-full overflow-hidden bg-muted">
                    <PosterImage
                      src={item.posterPath}
                      alt={item.title}
                      size="w500"
                      aspectRatio="poster"
                      fallbackIcon={item.contentType === "tvshow" ? "tv" : "movie"}
                      showGradient={true}
                    />

                    {/* Priority Badge */}
                    <div className="absolute top-2.5 left-2.5 z-10">
                      {item.priority >= 2 ? (
                        <span className="flex items-center gap-1 bg-rose-500/90 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md">
                          <Flame className="h-3 w-3" /> High
                        </span>
                      ) : item.priority === 1 ? (
                        <span className="flex items-center gap-1 bg-amber-500/90 backdrop-blur-md text-black text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md">
                          Medium
                        </span>
                      ) : null}
                    </div>

                    {/* Rating Badge */}
                    {item.voteAverage !== null && item.voteAverage !== undefined && (
                      <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 bg-black/75 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 shadow-md">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span
                          className={cn(
                            "text-[11px] font-bold",
                            getRatingColor(item.voteAverage)
                          )}
                        >
                          {item.voteAverage.toFixed(1)}
                        </span>
                      </div>
                    )}

                    {/* Franchise Badge Overlay */}
                    {item.collectionName && (
                      <div className="absolute bottom-2.5 left-2.5 right-2.5 z-10 flex items-center gap-1 bg-purple-950/80 backdrop-blur-md px-2 py-0.5 rounded-md border border-purple-500/30 text-[10px] font-medium text-purple-200 truncate">
                        <Clapperboard className="h-3 w-3 shrink-0 text-purple-400" />
                        <span className="truncate">{item.collectionName}</span>
                      </div>
                    )}

                    {/* Hover Action Buttons Overlay */}
                    <div className="absolute inset-0 z-20 bg-black/70 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-3 gap-2">
                      <Button
                        size="sm"
                        onClick={() => openMarkWatchedModal(item)}
                        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-xs h-8 gap-1.5 shadow-md"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Mark Watched
                      </Button>

                      <div className="flex w-full gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openEditModal(item)}
                          className="flex-1 bg-white/10 hover:bg-white/20 text-white text-xs h-8 border border-white/10"
                        >
                          <Edit3 className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleteItem(item)}
                          className="px-2.5 h-8 bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 border border-rose-500/30"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      <Link
                        href={`/${item.contentType === "tvshow" ? "series" : "movies"}/${item.tmdbId}`}
                        className="text-[11px] text-purple-300 hover:text-white transition-colors flex items-center gap-1 mt-1"
                      >
                        Details <ChevronRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>

                  {/* Card Info */}
                  <div className="p-3.5 flex flex-col flex-1 justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-semibold text-white line-clamp-1 group-hover:text-purple-300 transition-colors">
                        {item.title}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span>{formatYear(item.releaseDate)}</span>
                        {item.runtime ? (
                          <>
                            <span>•</span>
                            <span>{formatRuntime(item.runtime)}</span>
                          </>
                        ) : null}
                      </div>
                    </div>

                    {/* Personal notes indicator if present */}
                    {item.notes && (
                      <p className="text-[11px] text-zinc-400 italic bg-white/5 rounded-lg p-1.5 line-clamp-2 border border-white/5">
                        "{item.notes}"
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          /* List View Mode */
          <motion.div layout className="space-y-3">
            <AnimatePresence>
              {filteredItems.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl bg-card/40 border border-white/5 hover:border-purple-500/30 transition-all gap-4"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="relative w-16 h-24 sm:w-20 sm:h-28 rounded-xl overflow-hidden shrink-0 bg-muted">
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
                        <h4 className="text-base font-bold text-white truncate">{item.title}</h4>
                        {item.priority >= 2 && (
                          <span className="flex items-center gap-1 bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            <Flame className="h-3 w-3" /> High
                          </span>
                        )}
                        {item.priority === 1 && (
                          <span className="bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Medium
                          </span>
                        )}
                        {item.collectionName && (
                          <span className="bg-purple-950/60 border border-purple-500/30 text-purple-300 text-[10px] font-medium px-2 py-0.5 rounded-md">
                            {item.collectionName}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="uppercase font-semibold text-purple-400">
                          {item.contentType}
                        </span>
                        <span>•</span>
                        <span>{formatYear(item.releaseDate)}</span>
                        {item.runtime ? (
                          <>
                            <span>•</span>
                            <span>{formatRuntime(item.runtime)}</span>
                          </>
                        ) : null}
                        {item.voteAverage && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-yellow-400 font-semibold">
                              <Star className="h-3 w-3 fill-yellow-400" />
                              {item.voteAverage.toFixed(1)}
                            </span>
                          </>
                        )}
                      </div>

                      {item.overview && (
                        <p className="text-xs text-muted-foreground/80 line-clamp-1 max-w-2xl">
                          {item.overview}
                        </p>
                      )}

                      {item.notes && (
                        <p className="text-xs text-purple-200 italic line-clamp-1">
                          Note: "{item.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <Button
                      size="sm"
                      onClick={() => openMarkWatchedModal(item)}
                      className="bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs gap-1.5 h-9 px-3"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Mark Watched
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditModal(item)}
                      className="border-white/10 hover:border-white/20 text-white text-xs h-9 px-3"
                    >
                      <Edit3 className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteItem(item)}
                      className="text-muted-foreground hover:text-rose-400 h-9 px-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* MARK AS WATCHED DIALOG */}
      <Dialog
        open={Boolean(markWatchedItem)}
        onOpenChange={(open) => !open && setMarkWatchedItem(null)}
      >
        <DialogContent className="max-w-md bg-card border-white/10 text-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-purple-400" />
              Log as Watched
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Record this viewing into your chronological journey and database history.
            </DialogDescription>
          </DialogHeader>

          {markWatchedItem && (
            <form onSubmit={handleMarkWatchedSubmit} className="space-y-4 pt-2">
              <div className="flex items-center gap-3.5 p-3 rounded-xl bg-white/5 border border-white/5">
                <div className="w-12 h-16 rounded-lg overflow-hidden shrink-0 bg-muted">
                  <PosterImage
                    src={markWatchedItem.posterPath}
                    alt={markWatchedItem.title}
                    size="w92"
                    aspectRatio="poster"
                  />
                </div>
                <div>
                  <h4 className="font-semibold text-white text-sm line-clamp-1">
                    {markWatchedItem.title}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {formatYear(markWatchedItem.releaseDate)} • {markWatchedItem.contentType.toUpperCase()}
                  </p>
                </div>
              </div>

              {/* Watched Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Date Watched</label>
                <Input
                  type="date"
                  value={watchDate}
                  onChange={(e) => setWatchDate(e.target.value)}
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
                    {watchRating} / 10
                  </span>
                </div>
                <div className="grid grid-cols-10 gap-1">
                  {Array.from({ length: 10 }).map((_, i) => {
                    const score = i + 1;
                    return (
                      <button
                        key={score}
                        type="button"
                        onClick={() => setWatchRating(score)}
                        className={cn(
                          "py-1.5 rounded-lg text-xs font-bold transition-all",
                          watchRating >= score
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

              {/* Personal Notes / Review */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Personal Review / Notes (Optional)</label>
                <textarea
                  value={watchNotes}
                  onChange={(e) => setWatchNotes(e.target.value)}
                  placeholder="What did you think of the cinematography, story, or performances?"
                  className="w-full h-20 bg-background/80 border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-muted-foreground/60 focus:outline-none focus:border-purple-500"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setMarkWatchedItem(null)}
                  className="text-muted-foreground hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingWatched}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium"
                >
                  {isSubmittingWatched ? "Recording..." : "Save to History"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* EDIT PRIORITY & NOTES DIALOG */}
      <Dialog
        open={Boolean(editItem)}
        onOpenChange={(open) => !open && setEditItem(null)}
      >
        <DialogContent className="max-w-md bg-card border-white/10 text-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-purple-400" />
              Edit Watchlist Priority
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Adjust how urgently you want to watch {editItem?.title}.
            </DialogDescription>
          </DialogHeader>

          {editItem && (
            <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
              {/* Priority Select */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Priority Level</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditPriority(2)}
                    className={cn(
                      "p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1",
                      editPriority === 2
                        ? "bg-rose-500/20 border-rose-500/60 text-rose-200"
                        : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"
                    )}
                  >
                    <Flame className="h-4 w-4 text-rose-400" />
                    <span className="text-xs font-bold">High</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditPriority(1)}
                    className={cn(
                      "p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1",
                      editPriority === 1
                        ? "bg-amber-500/20 border-amber-500/60 text-amber-200"
                        : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"
                    )}
                  >
                    <span className="text-xs font-bold">⚡ Medium</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditPriority(0)}
                    className={cn(
                      "p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1",
                      editPriority === 0
                        ? "bg-purple-500/20 border-purple-500/60 text-purple-200"
                        : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"
                    )}
                  >
                    <span className="text-xs font-bold">🌱 Normal</span>
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Queue Notes</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="e.g. Recommended by Sarah, watch before sequel drops..."
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

      {/* CONFIRM DELETE DIALOG */}
      <Dialog
        open={Boolean(deleteItem)}
        onOpenChange={(open) => !open && setDeleteItem(null)}
      >
        <DialogContent className="max-w-sm bg-card border-white/10 text-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-rose-400" />
              Remove from Watchlist?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to remove <span className="text-white font-semibold">{deleteItem?.title}</span>? You can re-add it at any time.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4 flex gap-2">
            <Button
              variant="ghost"
              onClick={() => setDeleteItem(null)}
              className="flex-1 text-muted-foreground hover:text-white"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteItem && handleDelete(deleteItem.id)}
              className="flex-1 bg-rose-600 hover:bg-rose-500 text-white"
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RANDOM PICK / SPIN THE VAULT MODAL WITH CARD-FLIP / SPIN ANIMATION */}
      <Dialog
        open={isRandomModalOpen}
        onOpenChange={(open) => !open && setIsRandomModalOpen(false)}
      >
        <DialogContent className="max-w-md bg-card/95 border-purple-500/30 text-foreground backdrop-blur-2xl shadow-[0_0_50px_rgba(147,51,234,0.25)]">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-center bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 via-purple-200 to-indigo-300 flex items-center justify-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-400 animate-spin" />
              Vault Randomizer
            </DialogTitle>
            <DialogDescription className="text-xs text-center text-muted-foreground">
              Can't decide what to watch tonight? Let the Movie Watched List decide your destiny.
            </DialogDescription>
          </DialogHeader>

          {/* Random Filter Tabs */}
          <div className="flex justify-center gap-2 py-2">
            <button
              onClick={() => setRandomFilterType("all")}
              className={cn(
                "text-xs px-3 py-1 rounded-full font-medium transition-all",
                randomFilterType === "all"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "bg-white/5 text-muted-foreground hover:text-white"
              )}
            >
              Any Format
            </button>
            <button
              onClick={() => setRandomFilterType("movie")}
              className={cn(
                "text-xs px-3 py-1 rounded-full font-medium transition-all flex items-center gap-1",
                randomFilterType === "movie"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "bg-white/5 text-muted-foreground hover:text-white"
              )}
            >
              <Film className="h-3 w-3" /> Movies Only
            </button>
            <button
              onClick={() => setRandomFilterType("tvshow")}
              className={cn(
                "text-xs px-3 py-1 rounded-full font-medium transition-all flex items-center gap-1",
                randomFilterType === "tvshow"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "bg-white/5 text-muted-foreground hover:text-white"
              )}
            >
              <Tv className="h-3 w-3" /> Series Only
            </button>
          </div>

          {/* Animated Card Spin Area */}
          <div className="py-6 flex flex-col items-center justify-center min-h-[360px]">
            {isSpinning ? (
              <div className="flex flex-col items-center justify-center gap-4 text-center">
                <div className="relative w-40 h-56 rounded-2xl border-2 border-purple-500/50 bg-gradient-to-br from-purple-900/60 to-indigo-900/60 random-spin shadow-[0_0_30px_rgba(168,85,247,0.4)] flex items-center justify-center">
                  <Sparkles className="h-10 w-10 text-yellow-300 animate-pulse" />
                </div>
                <p className="text-sm font-semibold text-purple-300 animate-pulse">
                  Selecting your next masterpiece...
                </p>
              </div>
            ) : randomCandidate ? (
              <motion.div
                key={randomCandidate.id + spinCount}
                initial={{ rotateY: 90, opacity: 0, scale: 0.8 }}
                animate={{ rotateY: 0, opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, type: "spring", stiffness: 120 }}
                className="w-full flex flex-col items-center text-center space-y-4"
              >
                <div className="relative w-44 h-64 rounded-2xl overflow-hidden border-2 border-purple-500/60 shadow-[0_0_35px_rgba(168,85,247,0.35)]">
                  <PosterImage
                    src={randomCandidate.posterPath}
                    alt={randomCandidate.title}
                    size="w500"
                    aspectRatio="poster"
                    showGradient={true}
                  />
                  {randomCandidate.voteAverage && (
                    <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 bg-black/80 px-2 py-0.5 rounded-full border border-white/10 text-xs font-bold text-yellow-400">
                      <Star className="h-3 w-3 fill-yellow-400" />
                      {randomCandidate.voteAverage.toFixed(1)}
                    </div>
                  )}
                </div>

                <div className="space-y-1 max-w-sm px-4">
                  <h3 className="text-lg font-bold text-white line-clamp-1">
                    {randomCandidate.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {formatYear(randomCandidate.releaseDate)} • {randomCandidate.contentType.toUpperCase()}
                    {randomCandidate.runtime ? ` • ${formatRuntime(randomCandidate.runtime)}` : ""}
                  </p>
                  {randomCandidate.overview && (
                    <p className="text-xs text-muted-foreground/80 line-clamp-2 pt-1">
                      {randomCandidate.overview}
                    </p>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="text-center text-muted-foreground text-xs">
                Click Spin to reveal your choice.
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isSpinning}
              onClick={spinRandomPick}
              className="border-purple-500/30 hover:border-purple-500 text-purple-200 hover:text-white gap-2 flex-1"
            >
              <RotateCcw className="h-4 w-4" />
              Spin Again
            </Button>

            {randomCandidate && !isSpinning && (
              <Button
                type="button"
                onClick={() => {
                  const candidate = randomCandidate;
                  setIsRandomModalOpen(false);
                  openMarkWatchedModal(candidate);
                }}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium flex-1 gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4" />
                Watch Now
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
