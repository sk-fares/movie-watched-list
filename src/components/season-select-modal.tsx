"use client";

import * as React from "react";
import Image from "next/image";
import {
  X,
  Check,
  CheckCircle2,
  Tv,
  Calendar,
  Layers,
  Sparkles,
  Loader2,
  Clock,
  Flame,
  Filter,
} from "lucide-react";
import toast from "react-hot-toast";

import { cn, getImageUrl, formatYear } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface SeasonInfo {
  id: number;
  season_number: number;
  name: string;
  episode_count: number;
  air_date?: string;
  poster_path?: string;
  overview?: string;
}

export interface WatchedSeriesItem {
  id?: string;
  tmdbId: number;
  title: string;
  posterPath?: string | null;
  backdropPath?: string | null;
  releaseDate?: string | null;
  notes?: string | null;
}

interface SeasonSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  series: WatchedSeriesItem | null;
  onSeasonsChange?: (tmdbId: number, watchedSeasons: number[]) => void;
}

type SeasonFilterTab = "all" | "watched" | "unwatched" | "newly_released";

export function SeasonSelectModal({
  isOpen,
  onClose,
  series,
  onSeasonsChange,
}: SeasonSelectModalProps) {
  const [isLoading, setIsLoading] = React.useState(true);
  const [seasons, setSeasons] = React.useState<SeasonInfo[]>([]);
  const [watchedSeasons, setWatchedSeasons] = React.useState<Set<number>>(new Set());
  const [seriesDetails, setSeriesDetails] = React.useState<any>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [filterTab, setFilterTab] = React.useState<SeasonFilterTab>("all");

  // Helper to determine if a season is newly released (released recently or upcoming)
  const isNewlyReleased = React.useCallback((season: SeasonInfo): boolean => {
    if (!season.air_date) return false;
    const airYear = new Date(season.air_date).getFullYear();
    const currentYear = new Date().getFullYear();
    // Released within the last 2 years (e.g. 2024+) or in the future
    return airYear >= currentYear - 1;
  }, []);

  // Parse existing watched seasons from notes
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
    } catch {
      // Plain text or unparsed
    }
    return [];
  }, []);

  // Fetch show details and seasons from TMDB
  React.useEffect(() => {
    if (!isOpen || !series) return;

    let isMounted = true;
    setIsLoading(true);
    setFilterTab("all");

    // Initial watched seasons from series.notes
    const initialList = parseWatchedSeasons(series.notes);
    setWatchedSeasons(new Set(initialList));

    async function loadSeriesData() {
      try {
        const res = await fetch(`/api/tmdb/tv/${series!.tmdbId}`);
        if (!res.ok) throw new Error("Failed to load seasons");
        const data = await res.json();
        if (isMounted) {
          setSeriesDetails(data);
          const rawSeasons: SeasonInfo[] = data.seasons || [];
          // Filter regular seasons (season_number > 0)
          const regularSeasons = rawSeasons.filter((s) => s.season_number > 0);
          // If no regular seasons, show whatever seasons exist
          const finalSeasons = regularSeasons.length > 0 ? regularSeasons : rawSeasons;
          setSeasons(finalSeasons);

          // If no seasons were previously marked in notes, default all current seasons as watched
          // since the series itself was marked watched!
          if (initialList.length === 0 && finalSeasons.length > 0) {
            const allSeasonNumbers = finalSeasons.map((s) => s.season_number);
            setWatchedSeasons(new Set(allSeasonNumbers));
            // Auto-persist default
            saveSeasons(allSeasonNumbers, false, finalSeasons.length);
          }
        }
      } catch (err) {
        console.error("Failed to load show seasons:", err);
        if (isMounted) {
          toast.error("Could not load series seasons");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadSeriesData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, series, parseWatchedSeasons]);

  // Save watched seasons to database via /api/watched
  const saveSeasons = async (
    newSeasonsList: number[],
    showToast: boolean = true,
    totalCountOverride?: number
  ) => {
    if (!series) return;
    setIsSaving(true);
    try {
      const totalToRecord = totalCountOverride ?? seasons.length;
      const res = await fetch("/api/watched", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbId: series.tmdbId,
          contentType: "tvshow",
          title: series.title,
          posterPath: series.posterPath,
          releaseDate: series.releaseDate,
          notes: JSON.stringify({
            watchedSeasons: newSeasonsList,
            totalSeasons: totalToRecord,
            updatedAt: new Date().toISOString(),
          }),
        }),
      });

      if (res.ok) {
        if (onSeasonsChange) {
          onSeasonsChange(series.tmdbId, newSeasonsList);
        }
        if (showToast) {
          toast.success("Watched seasons updated");
        }
      } else {
        throw new Error("Failed to save seasons");
      }
    } catch (err) {
      console.error("Save seasons error:", err);
      if (showToast) toast.error("Failed to update seasons");
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle single season
  const handleToggleSeason = (seasonNum: number) => {
    setWatchedSeasons((prev) => {
      const next = new Set(prev);
      if (next.has(seasonNum)) {
        next.delete(seasonNum);
      } else {
        next.add(seasonNum);
      }
      const list = Array.from(next);
      saveSeasons(list, true);
      return next;
    });
  };

  // Mark all seasons watched
  const handleSelectAll = () => {
    const all = seasons.map((s) => s.season_number);
    setWatchedSeasons(new Set(all));
    saveSeasons(all, true);
  };

  // Clear all seasons
  const handleClearAll = () => {
    setWatchedSeasons(new Set());
    saveSeasons([], true);
  };

  if (!isOpen || !series) return null;

  const totalCount = seasons.length;
  const watchedCount = watchedSeasons.size;
  const unwatchedCount = Math.max(0, totalCount - watchedCount);
  const newlyReleasedList = seasons.filter(isNewlyReleased);
  const newlyReleasedCount = newlyReleasedList.length;
  const progressPercent = totalCount > 0 ? Math.round((watchedCount / totalCount) * 100) : 0;

  // Filtered seasons list according to selected tab
  const displayedSeasons = seasons.filter((season) => {
    const isWatched = watchedSeasons.has(season.season_number);
    if (filterTab === "watched") return isWatched;
    if (filterTab === "unwatched") return !isWatched;
    if (filterTab === "newly_released") return isNewlyReleased(season);
    return true; // "all"
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      {/* Backdrop click to close */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-card border border-purple-500/40 shadow-2xl shadow-purple-950/70 z-10 overflow-hidden">
        {/* Header */}
        <div className="relative p-5 sm:p-6 border-b border-border/50 bg-gradient-to-r from-purple-950/50 via-card to-card">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {series.posterPath ? (
                <div className="relative h-18 w-12 rounded-xl overflow-hidden shrink-0 shadow-lg border border-border/60">
                  <Image
                    src={getImageUrl(series.posterPath, "w185")}
                    alt={series.title}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-18 w-12 rounded-xl bg-purple-950/50 border border-purple-800/40 items-center justify-center shrink-0">
                  <Tv className="h-6 w-6 text-purple-400" />
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-400 mb-0.5">
                  <Tv className="h-3.5 w-3.5" />
                  <span>Season Tracker</span>
                  {series.releaseDate && (
                    <span className="text-muted-foreground font-normal">
                      • {formatYear(series.releaseDate)}
                    </span>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white leading-tight">
                  {series.title}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Track how many seasons you have watched, what is unwatched, and new releases.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-muted-foreground hover:text-white hover:bg-muted/50 transition-colors"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* 3 Prominent Stat Boxes: Watched, Not Watched, Newly Released */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mt-4 pt-4 border-t border-border/40">
            {/* Box 1: Watched Seasons */}
            <button
              type="button"
              onClick={() => setFilterTab(filterTab === "watched" ? "all" : "watched")}
              className={cn(
                "flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl border transition-all text-center",
                filterTab === "watched"
                  ? "bg-emerald-950/60 border-emerald-500 shadow-md shadow-emerald-950/50 ring-1 ring-emerald-500"
                  : "bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/60"
              )}
            >
              <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Watched</span>
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-white mt-1">
                {watchedCount} <span className="text-xs font-normal text-emerald-300">/ {totalCount}</span>
              </div>
              <span className="text-[10px] text-emerald-400/80 font-medium mt-0.5">
                {progressPercent}% completed
              </span>
            </button>

            {/* Box 2: Not Watched Seasons */}
            <button
              type="button"
              onClick={() => setFilterTab(filterTab === "unwatched" ? "all" : "unwatched")}
              className={cn(
                "flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl border transition-all text-center",
                filterTab === "unwatched"
                  ? "bg-amber-950/60 border-amber-500 shadow-md shadow-amber-950/50 ring-1 ring-amber-500"
                  : "bg-amber-950/20 border-amber-500/30 hover:border-amber-500/60"
              )}
            >
              <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold uppercase tracking-wider">
                <Clock className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Not Watched</span>
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-white mt-1">
                {unwatchedCount}
              </div>
              <span className="text-[10px] text-amber-400/80 font-medium mt-0.5">
                Remaining to see
              </span>
            </button>

            {/* Box 3: Newly Released Seasons */}
            <button
              type="button"
              onClick={() => setFilterTab(filterTab === "newly_released" ? "all" : "newly_released")}
              className={cn(
                "flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl border transition-all text-center",
                filterTab === "newly_released"
                  ? "bg-purple-950/60 border-purple-500 shadow-md shadow-purple-950/50 ring-1 ring-purple-500"
                  : "bg-purple-950/20 border-purple-500/30 hover:border-purple-500/60"
              )}
            >
              <div className="flex items-center gap-1.5 text-purple-400 text-xs font-bold uppercase tracking-wider">
                <Flame className="h-3.5 w-3.5 text-orange-400" />
                <span className="hidden sm:inline">Newly Released</span>
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-white mt-1">
                {newlyReleasedCount}
              </div>
              <span className="text-[10px] text-purple-300 font-medium mt-0.5">
                Recent / New
              </span>
            </button>
          </div>

          {/* Quick Filter Tabs & Mass Select Buttons */}
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border/30">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <button
                type="button"
                onClick={() => setFilterTab("all")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors",
                  filterTab === "all"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-white bg-background/50 hover:bg-background"
                )}
              >
                All ({totalCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("watched")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors",
                  filterTab === "watched"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-emerald-300 bg-background/50 hover:bg-emerald-950/30"
                )}
              >
                Watched ({watchedCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("unwatched")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors",
                  filterTab === "unwatched"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-amber-300 bg-background/50 hover:bg-amber-950/30"
                )}
              >
                Not Watched ({unwatchedCount})
              </button>
              {newlyReleasedCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterTab("newly_released")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1",
                    filterTab === "newly_released"
                      ? "bg-purple-600 text-white shadow-sm"
                      : "text-purple-300 hover:text-white bg-background/50 hover:bg-purple-950/30"
                  )}
                >
                  <Sparkles className="h-3 w-3 text-amber-300" />
                  <span>New ({newlyReleasedCount})</span>
                </button>
              )}
            </div>

            {/* Mass actions */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={isLoading || isSaving}
                className="text-xs h-7 px-2.5 bg-background/60 border-border/60 hover:bg-purple-950/30 text-purple-300 hover:text-white"
              >
                Mark All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                disabled={isLoading || isSaving}
                className="text-xs h-7 px-2.5 bg-background/60 border-border/60 hover:bg-muted/40 text-muted-foreground hover:text-white"
              >
                Clear All
              </Button>
            </div>
          </div>
        </div>

        {/* Seasons List Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 scrollbar-thin">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
              <p className="text-sm text-muted-foreground">Loading seasons from TMDB...</p>
            </div>
          ) : displayedSeasons.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              {filterTab === "watched"
                ? "No seasons have been marked as watched yet."
                : filterTab === "unwatched"
                ? "Great job! All seasons are marked as watched."
                : filterTab === "newly_released"
                ? "No newly released seasons detected for this series."
                : "No seasons found for this series."}
            </div>
          ) : (
            displayedSeasons.map((season) => {
              const isWatched = watchedSeasons.has(season.season_number);
              const isNew = isNewlyReleased(season);

              return (
                <div
                  key={season.id}
                  onClick={() => handleToggleSeason(season.season_number)}
                  className={cn(
                    "group relative flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer select-none",
                    isWatched
                      ? "bg-emerald-950/20 border-emerald-500/40 shadow-sm shadow-emerald-950/30 hover:border-emerald-500/70"
                      : isNew
                      ? "bg-purple-950/20 border-purple-500/40 hover:border-purple-500/70"
                      : "bg-background/60 border-border/60 hover:bg-card hover:border-border"
                  )}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Season Poster / Placeholder */}
                    <div className="relative h-16 w-11 rounded-lg overflow-hidden bg-muted shrink-0 border border-border/40 shadow-sm">
                      {season.poster_path ? (
                        <Image
                          src={getImageUrl(season.poster_path, "w185")}
                          alt={season.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-purple-950/40 text-purple-400 text-xs font-extrabold">
                          S{season.season_number}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors truncate">
                          {season.name || `Season ${season.season_number}`}
                        </h4>

                        {/* Status badge */}
                        {isWatched ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-emerald-950/70 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                            <Check className="h-2.5 w-2.5 stroke-[3]" />
                            <span>Watched</span>
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-amber-950/40 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" />
                            <span>Not Watched</span>
                          </span>
                        )}

                        {/* Newly Released Tag */}
                        {isNew && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-sm flex items-center gap-1">
                            <Flame className="h-2.5 w-2.5" />
                            <span>Newly Released</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span>{season.episode_count || 0} Episodes</span>
                        {season.air_date && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {season.air_date}
                            </span>
                          </>
                        )}
                      </div>

                      {season.overview && (
                        <p className="text-[11px] text-muted-foreground line-clamp-1 mt-1 max-w-md">
                          {season.overview}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Toggle Button / Action */}
                  <div className="shrink-0 pl-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleSeason(season.season_number);
                      }}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border shadow-sm",
                        isWatched
                          ? "bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-700"
                          : "bg-card border-border text-muted-foreground hover:text-white hover:border-purple-500/60"
                      )}
                    >
                      {isWatched ? (
                        <>
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                          <span>Watched</span>
                        </>
                      ) : (
                        <span>Mark Watched</span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/50 bg-background/50 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {watchedCount} of {totalCount} seasons watched • {unwatchedCount} not watched
          </p>
          <Button size="sm" onClick={onClose} className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-5">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
