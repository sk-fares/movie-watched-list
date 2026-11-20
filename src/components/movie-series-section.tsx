"use client";

import * as React from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers,
  Sparkles,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Film,
  Search,
  X,
  RefreshCw,
  Check,
  Calendar,
  ExternalLink,
  Flame,
} from "lucide-react";
import toast from "react-hot-toast";

import { cn, formatYear, getImageUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { MovieSeriesData, SeriesMovieEntry } from "@/lib/movie-series-detector";

interface MovieSeriesSectionProps {
  seriesList: MovieSeriesData[];
  isLoading: boolean;
  onRefresh: () => void;
  onSelectMovie: (tmdbId: number) => void;
  onToggleWatchEntry?: (entry: SeriesMovieEntry, franchiseId: string) => Promise<void>;
}

export function MovieSeriesSection({
  seriesList,
  isLoading,
  onRefresh,
  onSelectMovie,
  onToggleWatchEntry,
}: MovieSeriesSectionProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterStatus, setFilterStatus] = React.useState<"all" | "completed" | "in_progress">("all");
  const [expandedSeriesIds, setExpandedSeriesIds] = React.useState<Set<string>>(new Set());
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [togglingEntryId, setTogglingEntryId] = React.useState<number | null>(null);
  const hasInitializedRef = React.useRef(false);

  // Automatically expand only the first franchise on initial data load
  React.useEffect(() => {
    if (seriesList.length > 0 && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      const initialIds = new Set<string>();
      if (seriesList[0]) {
        initialIds.add(seriesList[0].id);
      }
      setExpandedSeriesIds(initialIds);
    }
  }, [seriesList]);

  const toggleExpand = React.useCallback((id: string) => {
    setExpandedSeriesIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleExpandAll = React.useCallback(() => {
    const allIds = new Set(seriesList.map((s) => s.id));
    setExpandedSeriesIds(allIds);
  }, [seriesList]);

  const handleCollapseAll = React.useCallback(() => {
    setExpandedSeriesIds(new Set());
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/movie-series/sync", { method: "POST" });
      if (!res.ok) throw new Error("Sync failed");
      toast.success("Movie series sequences synced wisely!", { icon: "🎬" });
      onRefresh();
    } catch {
      toast.error("Failed to sync movie series");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleWatchToggle = async (
    e: React.MouseEvent,
    entry: SeriesMovieEntry,
    franchiseId: string
  ) => {
    e.stopPropagation();
    if (!onToggleWatchEntry) return;

    setTogglingEntryId(entry.tmdbId);
    try {
      await onToggleWatchEntry(entry, franchiseId);
    } finally {
      setTogglingEntryId(null);
    }
  };

  // Filter series according to search and status
  const filteredSeries = React.useMemo(() => {
    return seriesList.filter((s) => {
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesFilm = s.entries.some((e) => e.title.toLowerCase().includes(q));
        if (!matchesName && !matchesFilm) return false;
      }

      // Status filter
      if (filterStatus === "completed") return s.isCompleted;
      if (filterStatus === "in_progress") return !s.isCompleted && s.watchedCount > 0;
      return true; // "all"
    });
  }, [seriesList, searchQuery, filterStatus]);

  const completedCount = seriesList.filter((s) => s.isCompleted).length;
  const inProgressCount = seriesList.filter((s) => !s.isCompleted && s.watchedCount > 0).length;
  const totalWatchedFilmsInSeries = seriesList.reduce((acc, s) => acc + s.watchedCount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ─── Top Control Bar: Search, Filters & Sync Button ─── */}
      <div className="rounded-2xl bg-card/60 backdrop-blur-md border border-border/60 p-4 sm:p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search movie series (e.g. Fast & Furious, Mission: Impossible, Harry Potter)..."
              className="w-full rounded-xl bg-background/80 border border-border/80 pl-10 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-3 text-muted-foreground hover:text-white"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Sync Button & View toggles */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualSync}
              disabled={isSyncing || isLoading}
              className="gap-2 bg-purple-950/30 border-purple-500/40 hover:bg-purple-900/40 text-purple-300 hover:text-white shadow-sm"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", (isSyncing || isLoading) && "animate-spin text-purple-400")} />
              <span>{isSyncing ? "Sequencing..." : "Sync Series Sequence"}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={expandedSeriesIds.size === seriesList.length ? handleCollapseAll : handleExpandAll}
              className="text-xs bg-background/60 border-border/60 hover:bg-muted/40"
            >
              {expandedSeriesIds.size === seriesList.length ? "Collapse All" : "Expand All"}
            </Button>
          </div>
        </div>

        {/* Filter Pills & Summary Stats */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/30">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setFilterStatus("all")}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all border",
                filterStatus === "all"
                  ? "bg-purple-600 border-purple-500 text-white shadow-md shadow-purple-900/30"
                  : "bg-background/60 border-border/60 text-muted-foreground hover:text-white"
              )}
            >
              All Series ({seriesList.length})
            </button>
            <button
              onClick={() => setFilterStatus("completed")}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all border",
                filterStatus === "completed"
                  ? "bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-900/30"
                  : "bg-background/60 border-border/60 text-muted-foreground hover:text-emerald-300"
              )}
            >
              Completed ({completedCount})
            </button>
            <button
              onClick={() => setFilterStatus("in_progress")}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all border",
                filterStatus === "in_progress"
                  ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-900/30"
                  : "bg-background/60 border-border/60 text-muted-foreground hover:text-indigo-300"
              )}
            >
              In Progress ({inProgressCount})
            </button>
          </div>

          <div className="text-xs text-muted-foreground font-medium flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-purple-300 font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              {totalWatchedFilmsInSeries} franchise films watched
            </span>
          </div>
        </div>
      </div>

      {/* ─── Series List ─── */}
      {isLoading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 rounded-3xl bg-card border border-border/40 animate-pulse" />
          ))}
        </div>
      ) : filteredSeries.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border/60 p-12 text-center bg-card/30">
          <Layers className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">
            {searchQuery ? "No movie series found matching your search" : "No movie series detected yet"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
            {searchQuery
              ? "Try checking the title or clear your search to view all detected franchises."
              : "When you mark movies as watched from sagas like Mission: Impossible, Fast & Furious, Resident Evil, or Harry Potter, our automatic sequencing script organizes them chronologically here."}
          </p>
          <Button onClick={handleManualSync} className="gap-2 bg-purple-600 hover:bg-purple-700">
            <RefreshCw className="h-4 w-4" />
            <span>Run Series Sequence Detector</span>
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredSeries.map((series) => {
            const isExpanded = expandedSeriesIds.has(series.id);

            return (
              <motion.div
                key={series.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "rounded-3xl border overflow-hidden transition-all duration-300 bg-card/80 backdrop-blur-md shadow-xl",
                  series.isCompleted
                    ? "border-emerald-500/40 shadow-emerald-950/20"
                    : "border-border/60 hover:border-purple-500/40 shadow-purple-950/20"
                )}
              >
                {/* ── Franchise Header Card ── */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleExpand(series.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleExpand(series.id);
                    }
                  }}
                  className="p-5 sm:p-6 cursor-pointer select-none bg-gradient-to-r from-purple-950/40 via-card to-card hover:bg-purple-900/10 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Left: Thumbnail & Franchise Title */}
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="relative h-18 w-13 sm:h-20 sm:w-14 rounded-2xl overflow-hidden bg-muted shrink-0 border border-border/60 shadow-md">
                        {series.posterPath ? (
                          <Image
                            src={getImageUrl(series.posterPath, "w185")}
                            alt={series.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-purple-950/60 text-purple-400">
                            <Layers className="h-6 w-6" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-950/70 text-purple-300 border border-purple-500/30">
                            {series.category || "Movie Series"}
                          </span>
                          {series.releaseSpan && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                              <Calendar className="h-3 w-3 text-purple-400" />
                              {series.releaseSpan}
                            </span>
                          )}
                          {series.isCompleted ? (
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-950/70 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                              <Check className="h-2.5 w-2.5 stroke-[3]" />
                              <span>100% Complete</span>
                            </span>
                          ) : (
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-950/70 text-indigo-300 border border-indigo-500/40">
                              {series.watchedCount} of {series.totalFilms} Watched
                            </span>
                          )}
                        </div>

                        <h3 className="text-lg sm:text-xl font-extrabold text-white truncate group-hover:text-purple-300 transition-colors">
                          {series.name}
                        </h3>

                        {series.overview && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5 max-w-xl">
                            {series.overview}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: Progress percentage & Expand Arrow */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/30">
                      <div className="text-left sm:text-right">
                        <div className="text-base sm:text-lg font-mono font-extrabold text-white">
                          {series.progressPercentage}%
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {series.watchedCount} / {series.totalFilms} Films
                        </div>
                      </div>

                      <div
                        className={cn(
                          "h-9 w-9 rounded-full flex items-center justify-center border transition-all",
                          isExpanded
                            ? "bg-purple-600 text-white border-purple-400"
                            : "bg-background/80 text-muted-foreground border-border/80 hover:text-white"
                        )}
                      >
                        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-4 h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        series.isCompleted
                          ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                          : "bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500"
                      )}
                      style={{ width: `${series.progressPercentage}%` }}
                    />
                  </div>
                </div>

                {/* ── Chronological Sequence Entries List ── */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="border-t border-border/40 bg-background/50 divide-y divide-border/30 overflow-hidden"
                    >
                      <div className="px-5 py-2.5 bg-muted/20 flex items-center justify-between text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                        <span>Chronological Release Sequence</span>
                        <span>{series.entries.length} Sequenced Titles</span>
                      </div>

                      {series.entries.map((entry) => {
                        const isWatched = entry.watched;
                        const isToggling = togglingEntryId === entry.tmdbId;

                        return (
                          <div
                            key={entry.sequenceNumber}
                            onClick={() => onSelectMovie(entry.tmdbId)}
                            className={cn(
                              "group flex items-center justify-between p-3.5 sm:px-6 transition-all cursor-pointer select-none",
                              isWatched
                                ? "hover:bg-emerald-950/20"
                                : "hover:bg-purple-950/20"
                            )}
                          >
                            {/* Sequence number, Poster & Title */}
                            <div className="flex items-center gap-3.5 min-w-0">
                              {/* Sequence Badge */}
                              <div
                                className={cn(
                                  "flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl text-xs font-mono font-extrabold shrink-0 border",
                                  isWatched
                                    ? "bg-emerald-600 text-white border-emerald-400 shadow-sm"
                                    : "bg-card text-muted-foreground border-border/80"
                                )}
                              >
                                #{entry.sequenceNumber}
                              </div>

                              {/* Poster thumbnail */}
                              <div className="relative h-12 w-8 sm:h-14 sm:w-9 rounded-md overflow-hidden bg-muted shrink-0 border border-border/40 shadow-sm">
                                {entry.posterPath ? (
                                  <Image
                                    src={getImageUrl(entry.posterPath, "w92")}
                                    alt={entry.title}
                                    fill
                                    className="object-cover group-hover:scale-105 transition-transform"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-purple-950/30 text-purple-400 text-[10px]">
                                    Film
                                  </div>
                                )}
                              </div>

                              {/* Title and details */}
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors truncate">
                                    {entry.title}
                                  </h4>
                                  {entry.releaseDate && (
                                    <span className="text-xs text-muted-foreground font-mono">
                                      ({formatYear(entry.releaseDate)})
                                    </span>
                                  )}
                                  {entry.subSeries && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-purple-950/50 text-purple-300 border border-purple-500/30">
                                      {entry.subSeries}
                                    </span>
                                  )}
                                </div>

                                <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                                  <span>Part {entry.sequenceNumber} in Saga</span>
                                  {entry.releaseDate && (
                                    <>
                                      <span>•</span>
                                      <span>Released {entry.releaseDate}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Status badge & Quick Action */}
                            <div className="flex items-center gap-2.5 shrink-0 pl-3">
                              {isWatched ? (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-semibold shadow-sm">
                                  <Check className="h-3.5 w-3.5 stroke-[3] text-emerald-400" />
                                  <span className="hidden sm:inline">Watched</span>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isToggling}
                                  onClick={(e) => handleWatchToggle(e, entry, series.id)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card hover:bg-emerald-600 text-muted-foreground hover:text-white border border-border/80 hover:border-emerald-500 text-xs font-semibold transition-all shadow-sm"
                                  title="Mark as watched in sequence"
                                >
                                  <Clock className="h-3.5 w-3.5" />
                                  <span>{isToggling ? "Updating..." : "Mark Watched"}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
