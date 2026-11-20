"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Bookmark,
  Check,
  Star,
  Clock,
  Film,
  Tv,
  MoreVertical,
  Share2,
  Trash2,
  Calendar,
  Layers,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

import {
  cn,
  formatYear,
  formatRuntime,
  parseGenres,
  truncateText,
} from "@/lib/utils";
import { PosterImage } from "@/components/poster-image";
import { GenreBadge } from "@/components/genre-badge";
import { RatingStars } from "@/components/rating-stars";
import type { ContentItem, WatchlistItemType, WatchedItemType } from "@/types";

export interface MovieCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onAnimationStart" | "onDrag" | "onDragEnd" | "onDragStart"> {
  item: ContentItem | WatchlistItemType | WatchedItemType | any;
  variant?: "grid" | "list" | "compact" | "history";
  priority?: boolean;
  showActions?: boolean;
  isWatchlisted?: boolean;
  isWatched?: boolean;
  userRating?: number | null;
  chronoPosition?: number | null;
  franchiseSeq?: number | null;
  franchiseName?: string | null;
  onWatchlistChange?: (inWatchlist: boolean, item: any) => void;
  onWatchedChange?: (watched: boolean, item: any) => void;
  onRemove?: (item: any) => void;
  onSelect?: (item: any) => void;
}

export const MovieCard = React.forwardRef<HTMLDivElement, MovieCardProps>(
  (
    {
      item,
      variant = "grid",
      priority = false,
      showActions = true,
      isWatchlisted: initialWatchlisted,
      isWatched: initialWatched,
      userRating: initialUserRating,
      chronoPosition,
      franchiseSeq,
      franchiseName,
      onWatchlistChange,
      onWatchedChange,
      onRemove,
      onSelect,
      className,
      ...props
    },
    ref
  ) => {
    // Normalize data from ContentItem or TMDB raw object
    const tmdbId = item.tmdbId ?? item.id;
    const title = item.title ?? item.name ?? "Untitled";
    const contentType =
      item.contentType ??
      (item.media_type === "tv" || (!item.media_type && Boolean(item.first_air_date))
        ? "tvshow"
        : "movie");
    const isTv = contentType === "tvshow" || contentType === "tv";
    const posterPath = item.posterPath ?? item.poster_path ?? null;
    const releaseDate =
      item.releaseDate ?? item.release_date ?? item.first_air_date ?? null;
    const voteAverage = item.voteAverage ?? item.vote_average ?? null;
    const runtime = item.runtime ?? item.episode_run_time?.[0] ?? null;
    const overview = item.overview ?? "";

    // Parse genres
    const genresList = React.useMemo(() => {
      if (Array.isArray(item.genres)) {
        return item.genres;
      }
      if (typeof item.genres === "string") {
        return parseGenres(item.genres);
      }
      return [];
    }, [item.genres]);

    // Internal state for interactive actions
    const [inWatchlist, setInWatchlist] = React.useState<boolean>(
      initialWatchlisted ?? Boolean((item as WatchlistItemType)?.priority !== undefined)
    );
    const [isWatched, setIsWatched] = React.useState<boolean>(
      initialWatched ?? Boolean((item as WatchedItemType)?.watchedDate !== undefined)
    );
    const [isMutatingWatchlist, setIsMutatingWatchlist] = React.useState(false);
    const [isMutatingWatched, setIsMutatingWatched] = React.useState(false);

    // Sync if props change
    React.useEffect(() => {
      if (initialWatchlisted !== undefined) setInWatchlist(initialWatchlisted);
    }, [initialWatchlisted]);

    React.useEffect(() => {
      if (initialWatched !== undefined) setIsWatched(initialWatched);
    }, [initialWatched]);

    const detailHref = isTv ? `/content/tv/${tmdbId}` : `/content/movie/${tmdbId}`;

    const handleSelectClick = (e: React.MouseEvent) => {
      if (onSelect) {
        e.preventDefault();
        e.stopPropagation();
        onSelect(item);
      }
    };

    // Handle Watchlist toggle
    const handleWatchlistToggle = async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (isMutatingWatchlist) return;
      setIsMutatingWatchlist(true);

      const nextState = !inWatchlist;
      setInWatchlist(nextState);

      try {
        if (nextState) {
          const res = await fetch("/api/watchlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tmdbId,
              contentType: isTv ? "tvshow" : "movie",
              title,
              posterPath,
              backdropPath: item.backdropPath ?? item.backdrop_path ?? null,
              overview,
              releaseDate,
              voteAverage,
              genres: JSON.stringify(genresList),
              runtime,
            }),
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || "Failed to add to watchlist");
          }
          toast.success(`Added "${title}" to your watchlist`);
        } else {
          const res = await fetch(`/api/watchlist?tmdbId=${tmdbId}`, {
            method: "DELETE",
          });
          if (!res.ok) throw new Error("Failed to remove from watchlist");
          toast.success(`Removed "${title}" from watchlist`);
        }

        onWatchlistChange?.(nextState, item);
      } catch (err: any) {
        setInWatchlist(!nextState); // Rollback
        toast.error(err.message || "Watchlist update failed");
      } finally {
        setIsMutatingWatchlist(false);
      }
    };

    // Handle Watched toggle
    const handleWatchedToggle = async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (isMutatingWatched) return;
      setIsMutatingWatched(true);

      const nextState = !isWatched;
      setIsWatched(nextState);

      try {
        if (nextState) {
          const res = await fetch("/api/watched", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tmdbId,
              contentType: isTv ? "tvshow" : "movie",
              title,
              posterPath,
              backdropPath: item.backdropPath ?? item.backdrop_path ?? null,
              overview,
              releaseDate,
              voteAverage,
              genres: JSON.stringify(genresList),
              runtime,
              userRating: initialUserRating || null,
            }),
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || "Failed to mark as watched");
          }
          toast.success(`Marked "${title}" as watched!`);
        } else {
          const res = await fetch(`/api/watched?tmdbId=${tmdbId}`, {
            method: "DELETE",
          });
          if (!res.ok) throw new Error("Failed to unmark watched");
          toast.success(`Unmarked "${title}" as watched`);
        }

        onWatchedChange?.(nextState, item);
      } catch (err: any) {
        setIsWatched(!nextState); // Rollback
        toast.error(err.message || "Failed to update watched status");
      } finally {
        setIsMutatingWatched(false);
      }
    };

    // Copy link / share
    const handleShare = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const url = `${window.location.origin}${detailHref}`;
      navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    };

    // Remove handler (e.g. from watchlist / history page)
    const handleRemove = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onRemove?.(item);
    };

    // ─── Compact Variant (For carousels, continue watching, sidebars) ────
    if (variant === "compact") {
      return (
        <div
          ref={ref}
          className={cn(
            "group relative flex flex-col w-32 shrink-0 transition-transform duration-200 hover:-translate-y-1",
            className
          )}
          {...props}
        >
          {onSelect ? (
            <div onClick={handleSelectClick} className="cursor-pointer block relative aspect-[2/3] w-full rounded-lg overflow-hidden border border-border/50 bg-card">
              <PosterImage
                src={posterPath}
                alt={title}
                size="w185"
                aspectRatio="poster"
                priority={priority}
                fallbackIcon={isTv ? "tv" : "movie"}
              />
              {voteAverage && voteAverage > 0 && (
                <div className="absolute top-1.5 right-1.5">
                  <RatingStars
                    rating={voteAverage}
                    variant="badge"
                    size="xs"
                  />
                </div>
              )}
            </div>
          ) : (
            <Link href={detailHref} className="block relative aspect-[2/3] w-full rounded-lg overflow-hidden border border-border/50 bg-card">
              <PosterImage
                src={posterPath}
                alt={title}
                size="w185"
                aspectRatio="poster"
                priority={priority}
                fallbackIcon={isTv ? "tv" : "movie"}
              />
              {voteAverage && voteAverage > 0 && (
                <div className="absolute top-1.5 right-1.5">
                  <RatingStars
                    rating={voteAverage}
                    variant="badge"
                    size="xs"
                  />
                </div>
              )}
            </Link>
          )}
          <div className="pt-1.5 px-0.5">
            {onSelect ? (
              <button
                type="button"
                onClick={handleSelectClick}
                className="text-left text-xs font-medium text-foreground hover:text-purple-400 line-clamp-1 transition-colors w-full"
                title={title}
              >
                {title}
              </button>
            ) : (
              <Link
                href={detailHref}
                className="text-xs font-medium text-foreground hover:text-purple-400 line-clamp-1 transition-colors"
                title={title}
              >
                {title}
              </Link>
            )}
            <p className="text-[10px] text-muted-foreground">
              {formatYear(releaseDate)}
            </p>
          </div>
        </div>
      );
    }

    // ─── List / History Variant ──────────────────────────────────────────
    if (variant === "list" || variant === "history") {
      const positionNumber = chronoPosition ?? franchiseSeq;

      return (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "group relative flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3 sm:p-4 rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm hover:border-purple-500/40 hover:bg-card/90 transition-all duration-300 hover:shadow-lg hover:shadow-purple-950/20",
            className
          )}
          {...props}
        >
          {/* Chrono position index if present */}
          {positionNumber !== undefined && positionNumber !== null && (
            <div className="flex sm:flex-col items-center justify-center shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-purple-950/60 border border-purple-800/40 text-purple-300 font-mono text-sm font-bold">
              #{positionNumber}
            </div>
          )}

          {/* Poster image thumbnail */}
          {onSelect ? (
            <div
              onClick={handleSelectClick}
              className="cursor-pointer relative w-20 sm:w-24 aspect-[2/3] rounded-lg overflow-hidden shrink-0 border border-border/40 shadow-sm"
            >
              <PosterImage
                src={posterPath}
                alt={title}
                size="w185"
                aspectRatio="poster"
                priority={priority}
                fallbackIcon={isTv ? "tv" : "movie"}
              />
              {isWatched && (
                <div className="absolute bottom-1 right-1 bg-purple-600 text-white p-0.5 rounded shadow">
                  <Check className="h-3 w-3 stroke-[3]" />
                </div>
              )}
            </div>
          ) : (
            <Link
              href={detailHref}
              className="relative w-20 sm:w-24 aspect-[2/3] rounded-lg overflow-hidden shrink-0 border border-border/40 shadow-sm"
            >
              <PosterImage
                src={posterPath}
                alt={title}
                size="w185"
                aspectRatio="poster"
                priority={priority}
                fallbackIcon={isTv ? "tv" : "movie"}
              />
              {isWatched && (
                <div className="absolute bottom-1 right-1 bg-purple-600 text-white p-0.5 rounded shadow">
                  <Check className="h-3 w-3 stroke-[3]" />
                </div>
              )}
            </Link>
          )}

          {/* Details column */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              {onSelect ? (
                <button
                  type="button"
                  onClick={handleSelectClick}
                  className="text-left text-base sm:text-lg font-bold text-foreground hover:text-purple-400 transition-colors line-clamp-1"
                >
                  {title}
                </button>
              ) : (
                <Link
                  href={detailHref}
                  className="text-base sm:text-lg font-bold text-foreground hover:text-purple-400 transition-colors line-clamp-1"
                >
                  {title}
                </Link>
              )}

              <span className="inline-flex items-center gap-1 text-[11px] font-mono uppercase px-2 py-0.5 rounded-full bg-muted/80 text-muted-foreground">
                {isTv ? <Tv className="h-3 w-3 text-blue-400" /> : <Film className="h-3 w-3 text-purple-400" />}
                {isTv ? "Series" : "Movie"}
              </span>

              {franchiseName && (
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-300 border border-purple-600/30">
                  <Layers className="h-3 w-3" />
                  {franchiseName}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatYear(releaseDate)}
              </span>
              {runtime && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {formatRuntime(runtime)}
                </span>
              )}
              {voteAverage && voteAverage > 0 && (
                <RatingStars
                  rating={voteAverage}
                  variant="badge"
                  size="xs"
                />
              )}
            </div>

            {overview && (
              <p className="text-xs text-muted-foreground/80 line-clamp-2 leading-relaxed">
                {overview}
              </p>
            )}

            {genresList.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {genresList.slice(0, 3).map((g: any) => (
                  <GenreBadge
                    key={g.id || g.name}
                    name={g.name}
                    id={g.id}
                    size="xs"
                    variant="outline"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Action buttons */}
          {showActions && (
            <div className="flex sm:flex-col items-center gap-1.5 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={handleWatchlistToggle}
                disabled={isMutatingWatchlist}
                className={cn(
                  "p-2 rounded-lg border transition-all active:scale-95",
                  inWatchlist
                    ? "bg-purple-600/20 border-purple-500/50 text-purple-300 hover:bg-purple-600/30"
                    : "bg-secondary/40 border-border/80 text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
                title={inWatchlist ? "Remove from watchlist" : "Add to watchlist"}
              >
                <Bookmark
                  className={cn("h-4 w-4", inWatchlist && "fill-purple-400 text-purple-400")}
                />
              </button>

              <button
                type="button"
                onClick={handleWatchedToggle}
                disabled={isMutatingWatched}
                className={cn(
                  "p-2 rounded-lg border transition-all active:scale-95",
                  isWatched
                    ? "bg-green-600/20 border-green-500/50 text-green-300 hover:bg-green-600/30"
                    : "bg-secondary/40 border-border/80 text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
                title={isWatched ? "Watched" : "Mark as watched"}
              >
                <Check
                  className={cn("h-4 w-4", isWatched && "stroke-[3] text-green-400")}
                />
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="p-2 rounded-lg border border-border/60 bg-secondary/30 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95"
                title="Share link"
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </motion.div>
      );
    }

    // ─── Default Vertical Grid Card ──────────────────────────────────────
    const positionBadge = chronoPosition ?? franchiseSeq;

    return (
      <div
        ref={ref}
        className={cn(
          "movie-card group relative flex flex-col rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden",
          className
        )}
        {...props}
      >
        {/* Main Poster Container */}
        <div
          className="relative aspect-[2/3] w-full overflow-hidden bg-muted/20 cursor-pointer"
          onClick={handleSelectClick}
        >
          {onSelect ? (
            <div className="block h-full w-full">
              <PosterImage
                src={posterPath}
                alt={title}
                size="w500"
                aspectRatio="poster"
                priority={priority}
                fallbackIcon={isTv ? "tv" : "movie"}
                className="h-full w-full"
              />
            </div>
          ) : (
            <Link href={detailHref} className="block h-full w-full">
              <PosterImage
                src={posterPath}
                alt={title}
                size="w500"
                aspectRatio="poster"
                priority={priority}
                fallbackIcon={isTv ? "tv" : "movie"}
                className="h-full w-full"
              />
            </Link>
          )}

          {/* Top Badges Overlay */}
          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-10">
            {/* Content Type badge or Franchise Chrono */}
            {positionBadge !== undefined && positionBadge !== null ? (
              <span className="pointer-events-auto inline-flex items-center gap-1 rounded-md bg-purple-950/80 backdrop-blur-md px-2 py-0.5 text-xs font-mono font-bold text-purple-200 border border-purple-500/40 shadow-md">
                #{positionBadge}
              </span>
            ) : (
              <span className="pointer-events-auto inline-flex items-center gap-1 rounded-md bg-background/80 backdrop-blur-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/90 border border-border/60 shadow-md">
                {isTv ? <Tv className="h-2.5 w-2.5 text-blue-400" /> : <Film className="h-2.5 w-2.5 text-purple-400" />}
                {isTv ? "Series" : "Movie"}
              </span>
            )}

            {/* Right Badges: Watched & Rating */}
            <div className="flex items-center gap-1.5 pointer-events-auto">
              {isWatched && (
                <span className="inline-flex items-center gap-1 rounded-md bg-green-600/90 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-white shadow-md">
                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                  <span>WATCHED</span>
                </span>
              )}
              {voteAverage !== null && voteAverage > 0 && (
                <RatingStars
                  rating={voteAverage}
                  variant="badge"
                  size="xs"
                />
              )}
            </div>
          </div>

          {/* Hover Overlay with Quick Action Buttons */}
          {showActions && (
            <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 pointer-events-none z-20">
              <div className="flex items-center justify-between gap-2 pointer-events-auto">
                <button
                  type="button"
                  onClick={handleWatchlistToggle}
                  disabled={isMutatingWatchlist}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold backdrop-blur-md transition-all active:scale-95 shadow-lg",
                    inWatchlist
                      ? "bg-purple-600 text-white hover:bg-purple-500"
                      : "bg-background/90 text-foreground hover:bg-background border border-border/80 hover:border-purple-500/50"
                  )}
                  title={inWatchlist ? "Remove from watchlist" : "Add to watchlist"}
                >
                  <Bookmark
                    className={cn(
                      "h-3.5 w-3.5",
                      inWatchlist && "fill-current"
                    )}
                  />
                  <span>{inWatchlist ? "Saved" : "Watchlist"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleWatchedToggle}
                  disabled={isMutatingWatched}
                  className={cn(
                    "flex items-center justify-center p-2 rounded-lg text-xs font-semibold backdrop-blur-md transition-all active:scale-95 shadow-lg",
                    isWatched
                      ? "bg-green-600 text-white hover:bg-green-500"
                      : "bg-background/90 text-foreground hover:bg-background border border-border/80 hover:border-green-500/50"
                  )}
                  title={isWatched ? "Marked Watched" : "Mark as Watched"}
                >
                  <Check
                    className={cn(
                      "h-3.5 w-3.5",
                      isWatched && "stroke-[3]"
                    )}
                  />
                </button>

                {/* More options dropdown */}
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button
                      type="button"
                      className="p-2 rounded-lg bg-background/90 text-foreground hover:bg-background border border-border/80 transition-all active:scale-95 shadow-lg"
                      title="More options"
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenu.Trigger>

                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      className="z-50 min-w-[160px] overflow-hidden rounded-xl border border-border bg-card/95 p-1 text-foreground shadow-2xl backdrop-blur-xl animate-in fade-in-0 zoom-in-95"
                      sideOffset={5}
                      align="end"
                    >
                      <DropdownMenu.Item
                        onClick={handleShare}
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs outline-none hover:bg-purple-950/50 hover:text-purple-300 transition-colors"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                        <span>Share link</span>
                      </DropdownMenu.Item>

                      <DropdownMenu.Item
                        onClick={(e) => {
                          if (onSelect) {
                            e.preventDefault();
                            onSelect(item);
                          }
                        }}
                        asChild={!onSelect}
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs outline-none hover:bg-purple-950/50 hover:text-purple-300 transition-colors"
                      >
                        {onSelect ? (
                          <>
                            <Film className="h-3.5 w-3.5" />
                            <span>View Details</span>
                          </>
                        ) : (
                          <Link
                            href={detailHref}
                            className="flex cursor-pointer items-center gap-2"
                          >
                            <Film className="h-3.5 w-3.5" />
                            <span>View Details</span>
                          </Link>
                        )}
                      </DropdownMenu.Item>

                      {onRemove && (
                        <>
                          <DropdownMenu.Separator className="my-1 h-px bg-border/60" />
                          <DropdownMenu.Item
                            onClick={handleRemove}
                            className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-red-400 outline-none hover:bg-red-950/40 hover:text-red-300 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Remove</span>
                          </DropdownMenu.Item>
                        </>
                      )}
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </div>
            </div>
          )}
        </div>

        {/* Card Metadata / Body */}
        <div className="flex flex-1 flex-col justify-between p-3">
          <div className="space-y-1">
            {onSelect ? (
              <button
                type="button"
                onClick={handleSelectClick}
                className="block text-left font-semibold text-sm text-foreground hover:text-purple-400 transition-colors line-clamp-1 w-full"
                title={title}
              >
                {title}
              </button>
            ) : (
              <Link
                href={detailHref}
                className="block font-semibold text-sm text-foreground hover:text-purple-400 transition-colors line-clamp-1"
                title={title}
              >
                {title}
              </Link>
            )}

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-0.5">
              <span>{formatYear(releaseDate)}</span>
              {runtime ? (
                <span className="text-[11px] font-mono">{formatRuntime(runtime)}</span>
              ) : null}
            </div>
          </div>

          {/* Genre tags */}
          {genresList.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-2">
              {genresList.slice(0, 2).map((g: any) => (
                <GenreBadge
                  key={g.id || g.name}
                  name={g.name}
                  id={g.id}
                  size="xs"
                  variant="subtle"
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }
);

MovieCard.displayName = "MovieCard";
