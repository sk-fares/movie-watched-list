"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  X,
  Star,
  Clock,
  Calendar,
  Film,
  Tv,
  Bookmark,
  Check,
  Play,
  Share2,
  ExternalLink,
  Layers,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  cn,
  getImageUrl,
  getBackdropUrl,
  formatDate,
  formatYear,
  formatRuntime,
  getRatingColor,
} from "@/lib/utils";
import { GenreBadge } from "@/components/genre-badge";
import { RatingStars } from "@/components/rating-stars";
import { Button } from "@/components/ui/button";
import { UniverseRelatedModal } from "@/components/universe-related-modal";

export interface MovieDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  tmdbId: number | null;
  contentType?: "movie" | "tv" | "tvshow";
  onWatchlistChange?: (inWatchlist: boolean, item: any) => void;
  onWatchedChange?: (isWatched: boolean, item: any) => void;
}

export function MovieDetailModal({
  isOpen,
  onClose,
  tmdbId,
  contentType = "movie",
  onWatchlistChange,
  onWatchedChange,
}: MovieDetailModalProps) {
  const [data, setData] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [inWatchlist, setInWatchlist] = React.useState(false);
  const [inWatched, setInWatched] = React.useState(false);
  const [userRating, setUserRating] = React.useState<number | null>(null);
  const [showRatingInput, setShowRatingInput] = React.useState(false);
  const [inputRating, setInputRating] = React.useState<number>(8);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showTrailer, setShowTrailer] = React.useState(false);

  // Active item inside modal (allows navigating between related franchise parts)
  const [activeTmdbId, setActiveTmdbId] = React.useState<number | null>(tmdbId);
  const [activeContentType, setActiveContentType] = React.useState<"movie" | "tv" | "tvshow">(contentType);
  const [isUniverseModalOpen, setIsUniverseModalOpen] = React.useState(false);

  React.useEffect(() => {
    setActiveTmdbId(tmdbId);
    setActiveContentType(contentType);
  }, [tmdbId, contentType, isOpen]);

  const isTv = activeContentType === "tv" || activeContentType === "tvshow";

  // Fetch full details whenever modal opens or active ID changes
  React.useEffect(() => {
    if (!isOpen || !activeTmdbId) {
      setData(null);
      setShowTrailer(false);
      setShowRatingInput(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const endpoint = isTv
      ? `/api/tmdb/tv/${activeTmdbId}`
      : `/api/tmdb/movie/${activeTmdbId}`;

    fetch(endpoint)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load details");
        return res.json();
      })
      .then((json) => {
        if (!isMounted) return;
        setData(json);
        setInWatchlist(Boolean(json.inWatchlist));
        setInWatched(Boolean(json.inWatched));
        setUserRating(json.userRating ?? null);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error("Error fetching detail:", err);
        toast.error("Could not load details");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, tmdbId, isTv]);

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

  const title = data?.title || data?.name || "Loading...";
  const releaseDate = data?.release_date || data?.first_air_date;
  const runtime = data?.runtime || data?.episode_run_time?.[0];
  const voteAverage = data?.vote_average ?? 0;
  const genres = data?.genres || [];
  const cast = data?.credits?.cast?.slice(0, 8) || [];
  const trailer = data?.videos?.results?.find(
    (v: any) => v.type === "Trailer" && v.site === "YouTube"
  );
  const franchise = data?.franchiseProgress;

  // Toggle watchlist
  const handleWatchlistToggle = async () => {
    if (!data || isSubmitting) return;
    setIsSubmitting(true);
    const nextState = !inWatchlist;

    try {
      if (nextState) {
        const res = await fetch("/api/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tmdbId: data.id,
            contentType: isTv ? "tvshow" : "movie",
            title,
            posterPath: data.poster_path,
            backdropPath: data.backdrop_path,
            overview: data.overview,
            releaseDate,
            voteAverage,
            genres: JSON.stringify(genres),
            runtime: runtime || null,
          }),
        });
        if (res.ok) {
          setInWatchlist(true);
          toast.success(`Added "${title}" to your Watchlist`);
          onWatchlistChange?.(true, data);
        } else {
          toast.error("Could not add to watchlist");
        }
      } else {
        const res = await fetch(
          `/api/watchlist?tmdbId=${data.id}&contentType=${isTv ? "tvshow" : "movie"}`,
          { method: "DELETE" }
        );
        if (res.ok) {
          setInWatchlist(false);
          toast.success(`Removed "${title}" from Watchlist`);
          onWatchlistChange?.(false, data);
        }
      }
    } catch {
      toast.error("Failed to update watchlist");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mark watched
  const handleMarkWatched = async (ratingVal?: number) => {
    if (!data || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/watched", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbId: data.id,
          contentType: isTv ? "tvshow" : "movie",
          title,
          posterPath: data.poster_path,
          backdropPath: data.backdrop_path,
          overview: data.overview,
          releaseDate,
          voteAverage,
          genres: JSON.stringify(genres),
          runtime: runtime || null,
          userRating: ratingVal ?? inputRating,
          franchiseId: franchise?.collectionId ? String(franchise.collectionId) : null,
          franchiseSeq: franchise?.sequenceNumber || null,
        }),
      });

      if (res.ok) {
        setInWatched(true);
        if (ratingVal) setUserRating(ratingVal);
        setShowRatingInput(false);
        toast.success(`Marked "${title}" as watched!`);
        onWatchedChange?.(true, data);
      } else {
        toast.error("Failed to mark as watched");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Unmark watched
  const handleUnmarkWatched = async () => {
    if (!data || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(
        `/api/watched?tmdbId=${data.id}&contentType=${isTv ? "tvshow" : "movie"}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        setInWatched(false);
        setUserRating(null);
        setShowRatingInput(false);
        toast.success(`Unmarked "${title}" as watched`);
        onWatchedChange?.(false, data);
      } else {
        toast.error("Failed to unmark as watched");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto bg-black/80 backdrop-blur-md animate-fade-in">
      {/* Click outside backdrop */}
      <div className="fixed inset-0 -z-10" onClick={onClose} />

      <div
        className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl bg-card border border-border/70 shadow-2xl shadow-purple-950/40 text-foreground"
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white/80 hover:text-white hover:bg-black/90 transition-all border border-white/10"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-28 gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
            <p className="text-sm text-muted-foreground animate-pulse">
              Loading cinematic details...
            </p>
          </div>
        ) : data ? (
          <div>
            {/* Backdrop Header */}
            <div className="relative h-64 sm:h-80 md:h-96 w-full overflow-hidden rounded-t-2xl bg-zinc-900">
              {showTrailer && trailer ? (
                <iframe
                  className="w-full h-full"
                  src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1`}
                  title={`${title} Trailer`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <>
                  {data.backdrop_path ? (
                    <Image
                      src={getBackdropUrl(data.backdrop_path, "w1280")}
                      alt={title}
                      fill
                      className="object-cover object-center"
                      priority
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-950/40 to-background">
                      {isTv ? (
                        <Tv className="h-20 w-20 text-muted-foreground/30" />
                      ) : (
                        <Film className="h-20 w-20 text-muted-foreground/30" />
                      )}
                    </div>
                  )}

                  {/* Top and Bottom Gradients */}
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-r from-card/80 via-transparent to-transparent" />

                  {/* Play Trailer Floating Button */}
                  {trailer && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <button
                        onClick={() => setShowTrailer(true)}
                        className="group flex items-center gap-3 px-5 py-2.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white font-medium hover:bg-purple-600 hover:border-purple-500 hover:scale-105 transition-all shadow-xl"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black group-hover:bg-white transition-colors">
                          <Play className="h-4 w-4 fill-black translate-x-0.5" />
                        </div>
                        <span>Watch Trailer</span>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Content Container */}
            <div className="relative px-5 sm:px-8 pb-8 pt-2 -mt-16 sm:-mt-24">
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                {/* Poster Thumbnail */}
                <div className="relative w-32 sm:w-44 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl border-2 border-border/80 shrink-0 bg-muted">
                  <Image
                    src={getImageUrl(data.poster_path, "w500")}
                    alt={title}
                    fill
                    className="object-cover"
                  />
                </div>

                {/* Main Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-950/80 text-purple-300 border border-purple-800/50">
                      {isTv ? (
                        <>
                          <Tv className="h-3 w-3" /> TV Series
                        </>
                      ) : (
                        <>
                          <Film className="h-3 w-3" /> Movie
                        </>
                      )}
                    </span>

                    {releaseDate && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatYear(releaseDate)}
                      </span>
                    )}

                    {runtime ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {formatRuntime(runtime)}
                      </span>
                    ) : data.number_of_seasons ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {data.number_of_seasons} Season
                        {data.number_of_seasons > 1 ? "s" : ""}
                      </span>
                    ) : null}

                    {voteAverage > 0 && (
                      <RatingStars
                        rating={voteAverage}
                        variant="badge"
                        size="xs"
                        className="ml-auto"
                      />
                    )}
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-1">
                    {title}
                  </h2>

                  {data.tagline && (
                    <p className="text-sm italic text-purple-300/80 mb-3">
                      &ldquo;{data.tagline}&rdquo;
                    </p>
                  )}

                  {/* Genres */}
                  {genres.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {genres.map((g: any) => (
                        <GenreBadge
                          key={g.id || g.name}
                          name={g.name}
                          size="sm"
                          variant="glow"
                        />
                      ))}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      onClick={handleWatchlistToggle}
                      disabled={isSubmitting}
                      variant={inWatchlist ? "secondary" : "default"}
                      className={cn(
                        "gap-2",
                        inWatchlist &&
                          "border-purple-500/50 text-purple-300 bg-purple-950/40"
                      )}
                    >
                      <Bookmark
                        className={cn(
                          "h-4 w-4",
                          inWatchlist && "fill-purple-400 text-purple-400"
                        )}
                      />
                      {inWatchlist ? "In Watchlist" : "Add to Watchlist"}
                    </Button>

                    {inWatched ? (
                      <>
                        <Button
                          onClick={() => setShowRatingInput(!showRatingInput)}
                          disabled={isSubmitting}
                          variant="secondary"
                          className="gap-2 border-emerald-500/50 text-emerald-300 bg-emerald-950/40"
                        >
                          <Check className="h-4 w-4 text-emerald-400" />
                          Watched
                        </Button>

                        <Button
                          onClick={handleUnmarkWatched}
                          disabled={isSubmitting}
                          variant="outline"
                          className="gap-2 border-red-500/30 text-red-400 hover:bg-red-950/30 hover:text-red-300"
                        >
                          <X className="h-4 w-4" />
                          Unmark Watched
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={() => handleMarkWatched()}
                        disabled={isSubmitting}
                        variant="outline"
                        className="gap-2 hover:border-emerald-500/50 hover:text-emerald-300"
                      >
                        <Check className="h-4 w-4" />
                        Mark as Watched
                      </Button>
                    )}

                    {userRating && (
                      <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-950/40 border border-amber-600/40 text-amber-300 text-xs font-semibold">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        Your Rating: {userRating}/10
                      </div>
                    )}
                  </div>

                  {/* Rating Input Modal/Bar */}
                  {showRatingInput && (
                    <div className="mt-4 p-4 rounded-xl bg-purple-950/30 border border-purple-800/40 animate-fade-in">
                      <p className="text-xs font-semibold text-purple-200 mb-2">
                        Rate this {isTv ? "show" : "movie"} (1 - 10):
                      </p>
                      <div className="flex items-center gap-3">
                        <RatingStars
                          rating={inputRating}
                          interactive
                          maxRating={10}
                          onChange={(val) => setInputRating(val)}
                        />
                        <Button
                          size="sm"
                          onClick={() => handleMarkWatched(inputRating)}
                          className="ml-auto bg-purple-600 hover:bg-purple-700"
                        >
                          Confirm & Save
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Franchise / Collection Banner (Rule 14 Highlight) */}
              {franchise && (
                <div className="mt-6 space-y-3">
                  <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950/60 via-purple-900/30 to-card border border-purple-700/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600/20 border border-purple-500/40 text-purple-300 shrink-0">
                        <Layers className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-400">
                            Part of Franchise
                          </span>
                          {franchise.sequenceNumber && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-800/60 text-purple-200 font-mono">
                              Part #{franchise.sequenceNumber}
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-white text-base">
                          {franchise.name}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {franchise.watchedCount} of {franchise.totalParts} watched (
                          {franchise.progressPercentage}%)
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar & Explore Button */}
                    <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <div className="w-full sm:w-40 flex flex-col gap-1.5">
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
                            style={{
                              width: `${franchise.progressPercentage}%`,
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground text-right">
                          {franchise.progressPercentage}% Completed
                        </span>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => setIsUniverseModalOpen(true)}
                        className="gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs h-8 whitespace-nowrap"
                      >
                        <Layers className="h-3.5 w-3.5" />
                        <span>All {franchise.totalParts} Titles</span>
                      </Button>
                    </div>
                  </div>

                  {/* Horizontal Strip of Related Installments */}
                  {franchise.items && franchise.items.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
                          Connected Universe & Related Titles ({franchise.items.length})
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsUniverseModalOpen(true)}
                          className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-medium transition-colors"
                        >
                          <span>Explore Sagas & Spin-Offs</span>
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>

                      <div className="flex items-stretch gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-thin">
                        {franchise.items.map((it: any) => {
                          const itId = it.tmdbId || it.id;
                          const isCurrent = itId === activeTmdbId;
                          const poster = it.posterPath || it.poster_path;
                          return (
                            <div
                              key={itId}
                              onClick={() => {
                                setActiveTmdbId(itId);
                                setActiveContentType(it.media_type === "tv" ? "tv" : "movie");
                              }}
                              className={cn(
                                "relative flex flex-col w-28 shrink-0 rounded-xl overflow-hidden border p-1.5 transition-all cursor-pointer group",
                                isCurrent
                                  ? "bg-purple-950/60 border-purple-500 shadow-md shadow-purple-950/30"
                                  : "bg-card/70 hover:bg-card border-border/60 hover:border-purple-500/50"
                              )}
                            >
                              <div className="relative aspect-[2/3] w-full rounded-lg overflow-hidden bg-muted mb-1.5">
                                {poster ? (
                                  <Image
                                    src={getImageUrl(poster, "w185")}
                                    alt={it.title}
                                    fill
                                    className="object-cover group-hover:scale-105 transition-transform"
                                  />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
                                    {it.media_type === "tv" ? <Tv className="h-5 w-5" /> : <Film className="h-5 w-5" />}
                                  </div>
                                )}
                                {it.isWatched && (
                                  <div className="absolute top-1 right-1 h-4 w-4 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow">
                                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                                  </div>
                                )}
                                <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-sm text-[9px] font-mono text-purple-200">
                                  #{it.sequence}
                                </span>
                              </div>
                              <p className="text-[11px] font-semibold text-white line-clamp-1 group-hover:text-purple-300">
                                {it.title}
                              </p>
                              <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-0.5">
                                <span>{it.year}</span>
                                <span className="text-[9px] px-1 rounded bg-secondary/80 text-purple-300 font-medium truncate max-w-[55px]">
                                  {it.role || "Sequel"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Overview */}
              <div className="mt-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Storyline
                </h3>
                <p className="text-sm sm:text-base leading-relaxed text-zinc-300">
                  {data.overview || "No overview available for this title."}
                </p>
              </div>

              {/* Top Cast */}
              {cast.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
                    Top Billed Cast
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {cast.map((c: any) => (
                      <div
                        key={c.id}
                        className="flex items-center gap-3 p-2 rounded-lg bg-card/60 border border-border/40"
                      >
                        <div className="relative h-11 w-11 rounded-full overflow-hidden shrink-0 bg-muted border border-border/60">
                          {c.profile_path ? (
                            <Image
                              src={getImageUrl(c.profile_path, "w185")}
                              alt={c.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-xs font-bold text-muted-foreground">
                              {c.name.slice(0, 2)}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">
                            {c.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {c.character}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Universe & Related Titles Modal */}
      {isUniverseModalOpen && (
        <UniverseRelatedModal
          isOpen={isUniverseModalOpen}
          onClose={() => setIsUniverseModalOpen(false)}
          universeId={franchise?.universeId}
          tmdbId={activeTmdbId}
          title={franchise?.name || title}
          initialUniverse={
            franchise
              ? {
                  id: franchise.universeId || "universe",
                  name: franchise.name,
                  category: franchise.category || "movie",
                  items: franchise.items || [],
                }
              : null
          }
          onSelectTitle={(selectedId, mediaType) => {
            setActiveTmdbId(selectedId);
            setActiveContentType(mediaType === "tv" ? "tv" : "movie");
            setIsUniverseModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
