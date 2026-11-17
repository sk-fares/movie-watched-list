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
  RotateCcw,
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
          setSeasons(regularSeasons.length > 0 ? regularSeasons : rawSeasons);

          // If no seasons were previously marked in notes, default all current seasons as watched
          // since the series itself was marked watched!
          if (initialList.length === 0 && regularSeasons.length > 0) {
            const allSeasonNumbers = regularSeasons.map((s) => s.season_number);
            setWatchedSeasons(new Set(allSeasonNumbers));
            // Auto-persist default
            saveSeasons(allSeasonNumbers, false);
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
  const saveSeasons = async (newSeasonsList: number[], showToast: boolean = true) => {
    if (!series) return;
    setIsSaving(true);
    try {
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
            totalSeasons: seasons.length,
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

  const watchedCount = watchedSeasons.size;
  const totalCount = seasons.length;
  const progressPercent = totalCount > 0 ? Math.round((watchedCount / totalCount) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      {/* Backdrop click to close */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-card border border-purple-500/40 shadow-2xl shadow-purple-950/60 z-10 overflow-hidden">
        {/* Header */}
        <div className="relative p-6 border-b border-border/50 bg-gradient-to-r from-purple-950/40 via-card to-card">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {series.posterPath ? (
                <div className="relative h-16 w-11 rounded-lg overflow-hidden shrink-0 shadow-md border border-border/60">
                  <Image
                    src={getImageUrl(series.posterPath, "w185")}
                    alt={series.title}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-16 w-11 rounded-lg bg-purple-950/50 border border-purple-800/40 items-center justify-center shrink-0">
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
                  Select which seasons you have watched.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-muted/50 transition-colors"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Progress bar and Quick Actions */}
          <div className="mt-4 pt-4 border-t border-border/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs font-medium mb-1.5">
                <span className="text-purple-300 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  {watchedCount} of {totalCount} Seasons Watched
                </span>
                <span className="text-muted-foreground font-mono">{progressPercent}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-purple-500 to-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={isLoading || isSaving}
                className="text-xs h-8 px-2.5 bg-background/60 border-border/60 hover:bg-purple-950/30 text-purple-300 hover:text-white"
              >
                Mark All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                disabled={isLoading || isSaving}
                className="text-xs h-8 px-2.5 bg-background/60 border-border/60 hover:bg-muted/40 text-muted-foreground hover:text-white"
              >
                Clear All
              </Button>
            </div>
          </div>
        </div>

        {/* Seasons List Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 scrollbar-thin">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
              <p className="text-sm text-muted-foreground">Loading seasons from TMDB...</p>
            </div>
          ) : seasons.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              No seasons found for this series.
            </div>
          ) : (
            seasons.map((season) => {
              const isWatched = watchedSeasons.has(season.season_number);
              return (
                <div
                  key={season.id}
                  onClick={() => handleToggleSeason(season.season_number)}
                  className={cn(
                    "group relative flex items-center justify-between p-3.5 rounded-xl border transition-all duration-200 cursor-pointer select-none",
                    isWatched
                      ? "bg-purple-950/25 border-purple-500/50 shadow-sm shadow-purple-950/30"
                      : "bg-background/60 border-border/60 hover:bg-card hover:border-border"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Season Poster / Placeholder */}
                    <div className="relative h-14 w-10 rounded-md overflow-hidden bg-muted shrink-0 border border-border/40">
                      {season.poster_path ? (
                        <Image
                          src={getImageUrl(season.poster_path, "w185")}
                          alt={season.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-purple-950/30 text-purple-400 text-xs font-bold">
                          S{season.season_number}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors truncate">
                          {season.name || `Season ${season.season_number}`}
                        </h4>
                        {isWatched && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-emerald-950/50 text-emerald-400 border border-emerald-500/30">
                            Watched
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>{season.episode_count || 0} Episodes</span>
                        {season.air_date && (
                          <>
                            <span>•</span>
                            <span>{formatYear(season.air_date)}</span>
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

                  {/* Toggle Button / Checkmark */}
                  <div className="shrink-0 pl-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleSeason(season.season_number);
                      }}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border",
                        isWatched
                          ? "bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-900/30"
                          : "bg-card border-border/80 text-muted-foreground hover:text-white hover:border-purple-500/50"
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
        <div className="p-4 border-t border-border/50 bg-background/40 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Changes save automatically to your watch history.
          </p>
          <Button size="sm" onClick={onClose} className="bg-purple-600 hover:bg-purple-700">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
