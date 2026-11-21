"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  X,
  Layers,
  Sparkles,
  Check,
  Bookmark,
  Calendar,
  Film,
  Tv,
  Search,
  ExternalLink,
  ChevronRight,
  Eye,
  Filter,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getImageUrl, cn, formatYear } from "@/lib/utils";

export interface UniverseItem {
  id?: number;
  tmdbId: number;
  title: string;
  year?: string;
  role?: string;
  media_type?: "movie" | "tv";
  posterPath?: string | null;
  poster_path?: string | null;
  sequence?: number;
  isWatched?: boolean;
  isInWatchlist?: boolean;
}

export interface UniverseData {
  id: string;
  name: string;
  category: string;
  section?: string;
  overview?: string;
  posterPath?: string | null;
  items: UniverseItem[];
}

export interface UniverseRelatedModalProps {
  isOpen: boolean;
  onClose: () => void;
  universeId?: string | null;
  tmdbId?: number | null;
  title?: string | null;
  initialUniverse?: UniverseData | null;
  onSelectTitle?: (tmdbId: number, mediaType: "movie" | "tv") => void;
}

const ROLE_COLORS: Record<string, string> = {
  Core: "bg-blue-900/50 text-blue-300 border-blue-600/40",
  Sequel: "bg-emerald-900/50 text-emerald-300 border-emerald-600/40",
  Prequel: "bg-amber-900/50 text-amber-300 border-amber-600/40",
  "Spin-Off": "bg-purple-900/50 text-purple-300 border-purple-600/40",
  Movie: "bg-rose-900/50 text-rose-300 border-rose-600/40",
  Adaptation: "bg-cyan-900/50 text-cyan-300 border-cyan-600/40",
  Anthology: "bg-violet-900/50 text-violet-300 border-violet-600/40",
  Reboot: "bg-orange-900/50 text-orange-300 border-orange-600/40",
};

export function UniverseRelatedModal({
  isOpen,
  onClose,
  universeId,
  tmdbId,
  title,
  initialUniverse,
  onSelectTitle,
}: UniverseRelatedModalProps) {
  const [universe, setUniverse] = React.useState<UniverseData | null>(initialUniverse || null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedRole, setSelectedRole] = React.useState<string>("all");

  // User state
  const [watchedSet, setWatchedSet] = React.useState<Set<number>>(new Set());
  const [watchlistSet, setWatchlistSet] = React.useState<Set<number>>(new Set());
  const [mutatingId, setMutatingId] = React.useState<number | null>(null);

  // Load user's watched & watchlist status
  React.useEffect(() => {
    if (!isOpen) return;

    const loadUserStatus = async () => {
      try {
        const [watchedRes, watchlistRes] = await Promise.all([
          fetch("/api/watched?limit=2000"),
          fetch("/api/watchlist?limit=2000"),
        ]);
        if (watchedRes.ok) {
          const data = await watchedRes.json();
          setWatchedSet(new Set((data.items || []).map((i: any) => Number(i.tmdbId))));
        }
        if (watchlistRes.ok) {
          const data = await watchlistRes.json();
          setWatchlistSet(new Set((data.items || []).map((i: any) => Number(i.tmdbId))));
        }
      } catch (err) {
        console.error("Failed to load user universe status:", err);
      }
    };

    loadUserStatus();
  }, [isOpen]);

  // Fetch universe if not provided
  React.useEffect(() => {
    if (!isOpen) {
      setUniverse(null);
      setSearchQuery("");
      setSelectedRole("all");
      return;
    }

    if (initialUniverse) {
      setUniverse(initialUniverse);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    let url = "";
    if (universeId) {
      url = `/api/curated?universeId=${encodeURIComponent(universeId)}`;
    } else if (tmdbId) {
      url = `/api/curated?tmdbId=${tmdbId}`;
    }

    if (!url) {
      setIsLoading(false);
      return;
    }

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("Universe not found");
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;
        if (data.universe) {
          setUniverse(data.universe);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error("Universe fetch error:", err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, universeId, tmdbId, initialUniverse]);

  // Handle escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const items = universe?.items || [];
  const watchedCount = items.filter((it) => watchedSet.has(it.tmdbId || it.id || 0)).length;
  const progressPercent = items.length > 0 ? Math.round((watchedCount / items.length) * 100) : 0;

  // Filter items
  const filteredItems = items.filter((it) => {
    const matchesSearch =
      !searchQuery.trim() ||
      it.title.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      (it.year && it.year.includes(searchQuery.trim()));
    const matchesRole =
      selectedRole === "all" ||
      (selectedRole === "Core" && it.role === "Core") ||
      (selectedRole === "Sequel/Prequel" && (it.role === "Sequel" || it.role === "Prequel")) ||
      (selectedRole === "Spin-Off" && (it.role === "Spin-Off" || it.role === "Adaptation" || it.role === "Anthology")) ||
      (selectedRole === "Movie" && it.role === "Movie");
    return matchesSearch && matchesRole;
  });

  // Watchlist toggle
  const handleToggleWatchlist = async (it: UniverseItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const itemId = it.tmdbId || it.id || 0;
    if (mutatingId === itemId) return;
    setMutatingId(itemId);

    const isInList = watchlistSet.has(itemId);
    const mediaType = it.media_type || "movie";
    const contentType = mediaType === "tv" ? "tvshow" : "movie";

    try {
      if (isInList) {
        const res = await fetch(`/api/watchlist?tmdbId=${itemId}&contentType=${contentType}`, {
          method: "DELETE",
        });
        if (res.ok) {
          setWatchlistSet((prev) => {
            const next = new Set(prev);
            next.delete(itemId);
            return next;
          });
          toast.success(`Removed "${it.title}" from watchlist`);
        }
      } else {
        const res = await fetch("/api/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tmdbId: itemId,
            contentType,
            title: it.title,
            posterPath: it.posterPath || it.poster_path || null,
            releaseDate: it.year ? `${it.year}-01-01` : null,
          }),
        });
        if (res.ok) {
          setWatchlistSet((prev) => new Set(prev).add(itemId));
          toast.success(`Added "${it.title}" to watchlist!`);
        }
      }
    } catch {
      toast.error("Failed to update watchlist");
    } finally {
      setMutatingId(null);
    }
  };

  // Watched toggle
  const handleToggleWatched = async (it: UniverseItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const itemId = it.tmdbId || it.id || 0;
    if (mutatingId === itemId) return;
    setMutatingId(itemId);

    const isWatched = watchedSet.has(itemId);
    const mediaType = it.media_type || "movie";
    const contentType = mediaType === "tv" ? "tvshow" : "movie";

    try {
      if (isWatched) {
        const res = await fetch(`/api/watched?tmdbId=${itemId}&contentType=${contentType}`, {
          method: "DELETE",
        });
        if (res.ok) {
          setWatchedSet((prev) => {
            const next = new Set(prev);
            next.delete(itemId);
            return next;
          });
          toast.success(`Unmarked "${it.title}" as watched`);
        }
      } else {
        const res = await fetch("/api/watched", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tmdbId: itemId,
            contentType,
            title: it.title,
            posterPath: it.posterPath || it.poster_path || null,
            releaseDate: it.year ? `${it.year}-01-01` : null,
          }),
        });
        if (res.ok) {
          setWatchedSet((prev) => new Set(prev).add(itemId));
          toast.success(`Marked "${it.title}" as watched!`);
        }
      }
    } catch {
      toast.error("Failed to update watch status");
    } finally {
      setMutatingId(null);
    }
  };

  const handleItemClick = (it: UniverseItem) => {
    const itemId = it.tmdbId || it.id || 0;
    const mediaType = it.media_type || "movie";
    if (onSelectTitle) {
      onSelectTitle(itemId, mediaType);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-card/95 border border-purple-500/30 shadow-2xl shadow-purple-950/40 overflow-hidden z-10 backdrop-blur-xl">
        {/* Header Bar */}
        <div className="relative p-5 sm:p-6 border-b border-border/60 bg-gradient-to-r from-purple-950/60 via-background to-card flex items-start justify-between gap-4">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-purple-900/60 text-purple-200 border border-purple-700/50">
                <Layers className="h-3 w-3 text-purple-400" />
                Complete Universe & Related Titles
              </span>
              {universe?.category && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-secondary/80 text-muted-foreground uppercase">
                  {universe.category}
                </span>
              )}
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-950 border border-purple-800 text-purple-300 font-mono font-bold">
                {items.length} Connected Titles
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
              {universe?.name || title || "Franchise Universe"}
            </h2>

            {universe?.overview && (
              <p className="text-xs sm:text-sm text-zinc-300 line-clamp-2 leading-relaxed">
                {universe.overview}
              </p>
            )}

            {/* Franchise Progress Bar */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 bg-muted/60 h-2.5 rounded-full overflow-hidden border border-border/40">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-400 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="text-xs font-semibold text-purple-200 shrink-0 flex items-center gap-2">
                <span>
                  {watchedCount} of {items.length} watched ({progressPercent}%)
                </span>
                {progressPercent === 100 && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-600 text-emerald-300 font-bold">
                    <Check className="h-3 w-3" /> Universe Completed!
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-secondary/60 hover:bg-secondary border border-border/60 text-muted-foreground hover:text-white transition-all shrink-0 active:scale-95"
            title="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filter & Search Controls */}
        <div className="px-5 py-3 border-b border-border/50 bg-background/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search sequels, spin-offs, parts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-xs bg-background/80 border-border/60 rounded-lg"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
            {["all", "Core", "Sequel/Prequel", "Spin-Off", "Movie"].map((roleKey) => (
              <button
                key={roleKey}
                onClick={() => setSelectedRole(roleKey)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-medium transition-all whitespace-nowrap border",
                  selectedRole === roleKey
                    ? "bg-purple-600 border-purple-500 text-white shadow-sm"
                    : "bg-background/40 border-border/50 text-muted-foreground hover:text-white"
                )}
              >
                {roleKey === "all" ? "All Entries" : roleKey}
              </button>
            ))}
          </div>
        </div>

        {/* Chronological List of Related Items */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 scrollbar-thin">
          {isLoading ? (
            <div className="space-y-3 py-8">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-20 rounded-xl bg-card/60 border border-border/40 animate-pulse"
                />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 text-center">
              <Layers className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-muted-foreground">
                No related titles matching your filter.
              </p>
            </div>
          ) : (
            filteredItems.map((it, idx) => {
              const itemId = it.tmdbId || it.id || 0;
              const isWatched = watchedSet.has(itemId);
              const inWatchlist = watchlistSet.has(itemId);
              const isCurrent = Boolean(tmdbId && itemId === tmdbId);
              const poster = it.posterPath || it.poster_path || null;
              const roleTag = it.role || "Core";
              const roleColorClass = ROLE_COLORS[roleTag] || ROLE_COLORS.Core;
              const isTv = it.media_type === "tv";

              return (
                <div
                  key={itemId || idx}
                  onClick={() => handleItemClick(it)}
                  className={cn(
                    "group relative flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-xl border transition-all duration-200 cursor-pointer",
                    isCurrent
                      ? "bg-purple-950/40 border-purple-500/70 shadow-md shadow-purple-950/30"
                      : "bg-card/60 hover:bg-card border-border/50 hover:border-purple-500/40"
                  )}
                >
                  {/* Sequence Position & Poster */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-background/80 border border-border/70 text-purple-300 font-mono font-bold text-xs shrink-0 shadow-sm">
                      #{it.sequence || idx + 1}
                    </span>

                    <div className="relative w-12 sm:w-14 aspect-[2/3] rounded-lg overflow-hidden bg-muted shrink-0 border border-border/60">
                      {poster ? (
                        <Image
                          src={getImageUrl(poster, "w185")}
                          alt={it.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-purple-950/30 text-purple-300">
                          {isTv ? <Tv className="h-5 w-5" /> : <Film className="h-5 w-5" />}
                        </div>
                      )}
                      {isWatched && (
                        <div className="absolute top-1 right-1 h-4 w-4 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-sm">
                          <Check className="h-2.5 w-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-semibold border uppercase tracking-wider",
                            roleColorClass
                          )}
                        >
                          {roleTag}
                        </span>

                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-secondary/80 text-muted-foreground font-medium">
                          {isTv ? (
                            <>
                              <Tv className="h-2.5 w-2.5 text-blue-400" /> Series
                            </>
                          ) : (
                            <>
                              <Film className="h-2.5 w-2.5 text-purple-400" /> Movie
                            </>
                          )}
                        </span>

                        {isCurrent && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-600 text-white">
                            Current Title
                          </span>
                        )}
                      </div>

                      <h4 className="font-semibold text-sm sm:text-base text-white group-hover:text-purple-300 transition-colors truncate">
                        {it.title}
                      </h4>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        {it.year && (
                          <span className="flex items-center gap-1 font-mono">
                            <Calendar className="h-3 w-3" />
                            {it.year}
                          </span>
                        )}
                        <span className="text-[11px] text-purple-300/80">
                          Part #{it.sequence || idx + 1} in order
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={(e) => handleToggleWatchlist(it, e)}
                      disabled={mutatingId === itemId}
                      className={cn(
                        "p-2 rounded-lg border transition-all active:scale-95",
                        inWatchlist
                          ? "bg-purple-600/30 border-purple-500/70 text-purple-200 hover:bg-purple-600/40"
                          : "bg-secondary/40 border-border/80 text-muted-foreground hover:text-white hover:bg-secondary"
                      )}
                      title={inWatchlist ? "Remove from watchlist" : "Add to watchlist"}
                    >
                      <Bookmark
                        className={cn("h-4 w-4", inWatchlist && "fill-purple-400 text-purple-400")}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleToggleWatched(it, e)}
                      disabled={mutatingId === itemId}
                      className={cn(
                        "p-2 rounded-lg border transition-all active:scale-95",
                        isWatched
                          ? "bg-emerald-600/30 border-emerald-500/70 text-emerald-200 hover:bg-emerald-600/40"
                          : "bg-secondary/40 border-border/80 text-muted-foreground hover:text-white hover:bg-secondary"
                      )}
                      title={isWatched ? "Watched" : "Mark as watched"}
                    >
                      <Check
                        className={cn("h-4 w-4", isWatched && "stroke-[3] text-emerald-400")}
                      />
                    </button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleItemClick(it)}
                      className="hidden sm:inline-flex h-8 px-2 text-xs text-muted-foreground hover:text-white"
                    >
                      <span>Details</span>
                      <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border/60 bg-card flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-purple-500" />
            <span>Click any title to view synopsis, cast, and trailers</span>
          </div>

          <Button size="sm" variant="outline" onClick={onClose} className="h-8 text-xs">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
