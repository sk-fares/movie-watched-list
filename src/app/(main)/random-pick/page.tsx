"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  Sparkles,
  Dices,
  RotateCcw,
  CheckCircle2,
  BookmarkCheck,
  Film,
  Tv,
  Star,
  Clock,
  Calendar,
  Layers,
  ArrowRight,
  Filter,
  Check,
  ChevronRight,
  ExternalLink,
  Flame,
  Info,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PosterImage } from "@/components/poster-image";
import { GenreBadge } from "@/components/genre-badge";
import {
  cn,
  formatDate,
  formatYear,
  formatRuntime,
  getRatingColor,
  parseGenres,
  truncateText,
} from "@/lib/utils";

interface PickItem {
  id: string;
  tmdbId: number;
  contentType: "movie" | "tvshow" | "season";
  title: string;
  posterPath: string | null;
  backdropPath?: string | null;
  overview: string | null;
  releaseDate: string | null;
  voteAverage: number | null;
  genres: string | null;
  runtime?: number | null;
  priority?: number;
  notes?: string | null;
  addedAt?: string;
  collectionId?: number | null;
  collectionName?: string | null;
}

const GENRE_OPTIONS = [
  { id: "all", name: "All Genres" },
  { id: "28", name: "Action" },
  { id: "12", name: "Adventure" },
  { id: "16", name: "Animation" },
  { id: "35", name: "Comedy" },
  { id: "80", name: "Crime" },
  { id: "18", name: "Drama" },
  { id: "14", name: "Fantasy" },
  { id: "27", name: "Horror" },
  { id: "878", name: "Sci-Fi" },
  { id: "53", name: "Thriller" },
  { id: "9648", name: "Mystery" },
];

export default function RandomPickPage() {
  // Filter states
  const [source, setSource] = useState<"watchlist" | "discover">("watchlist");
  const [contentType, setContentType] = useState<"all" | "movie" | "tvshow">("all");
  const [selectedGenre, setSelectedGenre] = useState<string>("all");
  const [minRating, setMinRating] = useState<number>(0);

  // Animation & Selection states
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [hasSpun, setHasSpun] = useState<boolean>(false);
  const [currentItem, setCurrentItem] = useState<PickItem | null>(null);
  const [candidates, setCandidates] = useState<PickItem[]>([]);
  const [cyclingCandidate, setCyclingCandidate] = useState<PickItem | null>(null);
  const [spinCount, setSpinCount] = useState<number>(0);
  const [pickHistory, setPickHistory] = useState<PickItem[]>([]);
  const [isWatched, setIsWatched] = useState<boolean>(false);
  const [isMarkingWatched, setIsMarkingWatched] = useState<boolean>(false);
  const [emptyWatchlist, setEmptyWatchlist] = useState<boolean>(false);
  const [totalPool, setTotalPool] = useState<number>(0);

  const cycleIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (cycleIntervalRef.current) clearInterval(cycleIntervalRef.current);
    };
  }, []);

  // Main spin handler
  const handleSpin = async () => {
    if (isSpinning) return;

    setIsSpinning(true);
    setIsWatched(false);
    setEmptyWatchlist(false);

    try {
      // 1. Fetch random pick and candidates from API
      const params = new URLSearchParams({
        source,
        contentType,
        count: "16",
        fallback: "true",
      });

      if (selectedGenre !== "all") {
        params.append("genre", selectedGenre);
      }
      if (minRating > 0) {
        params.append("minRating", String(minRating));
      }

      const res = await fetch(`/api/random?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        if (source === "watchlist") {
          setEmptyWatchlist(true);
          toast.error(
            data.error || "No matching items in your watchlist. Try TMDB Discover!"
          );
        } else {
          toast.error(data.error || "Failed to discover titles.");
        }
        setIsSpinning(false);
        return;
      }

      const fetchedCandidates: PickItem[] = data.candidates || [];
      const winningItem: PickItem = data.item;
      setCandidates(fetchedCandidates);
      setTotalPool(data.totalPool || fetchedCandidates.length);

      // 2. Start rapid cycling animation (slot machine effect)
      let cycleIndex = 0;
      const cyclePool = fetchedCandidates.length > 0 ? fetchedCandidates : [winningItem];

      cycleIntervalRef.current = setInterval(() => {
        cycleIndex = (cycleIndex + 1) % cyclePool.length;
        setCyclingCandidate(cyclePool[cycleIndex]);
      }, 90);

      // 3. Complete the spin after 2.4 seconds with flip & dramatic reveal
      setTimeout(() => {
        if (cycleIntervalRef.current) {
          clearInterval(cycleIntervalRef.current);
          cycleIntervalRef.current = null;
        }

        setCurrentItem(winningItem);
        setIsSpinning(false);
        setHasSpun(true);
        setSpinCount((prev) => prev + 1);

        // Add to session pick history (prevent immediate duplicates)
        setPickHistory((prev) => {
          const exists = prev.some((p) => p.tmdbId === winningItem.tmdbId);
          if (exists) return prev;
          return [winningItem, ...prev.slice(0, 7)];
        });

        toast.success(`Vault rolled: "${winningItem.title}"!`, {
          icon: "🎲",
          duration: 3000,
        });
      }, 2400);
    } catch (err: any) {
      console.error("Spin error:", err);
      toast.error("Something went wrong while rolling the vault.");
      setIsSpinning(false);
      if (cycleIntervalRef.current) clearInterval(cycleIntervalRef.current);
    }
  };

  // Mark currently picked item as watched
  const handleMarkWatched = async () => {
    if (!currentItem || isWatched || isMarkingWatched) return;

    setIsMarkingWatched(true);
    const toastId = toast.loading(`Marking "${currentItem.title}" as watched...`);

    try {
      const res = await fetch("/api/watched", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbId: currentItem.tmdbId,
          contentType: currentItem.contentType,
          title: currentItem.title,
          posterPath: currentItem.posterPath,
          backdropPath: currentItem.backdropPath,
          releaseDate: currentItem.releaseDate,
          voteAverage: currentItem.voteAverage,
          genres: currentItem.genres,
          runtime: currentItem.runtime,
          removeFromWatchlist: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to mark as watched");
      }

      setIsWatched(true);
      toast.success(`"${currentItem.title}" added to your Watched History!`, {
        id: toastId,
        icon: "🎬",
      });
    } catch (err: any) {
      console.error("Mark watched error:", err);
      toast.error(err.message || "Failed to mark as watched", { id: toastId });
    } finally {
      setIsMarkingWatched(false);
    }
  };

  const currentGenres = currentItem ? parseGenres(currentItem.genres) : [];

  return (
    <div className="relative min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Background ambient gradient glow */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none -z-10" />

      {/* Page Header */}
      <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-950/60 border border-purple-800/50 text-purple-300 text-xs font-semibold mb-4 backdrop-blur-md shadow-[0_0_15px_rgba(168,85,247,0.2)]">
          <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
          <span>Cinematic Watch Roulette</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-3">
          Random <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-violet-300 to-indigo-400">Vault Pick</span>
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          Can’t decide what to watch tonight? Let the Movie Watched List algorithm roll a high-priority title from your personal watchlist or uncover a hidden gem.
        </p>
      </div>

      {/* Filter and Control Panel */}
      <div className="mb-10 max-w-4xl mx-auto">
        <Card className="bg-card/70 backdrop-blur-xl border-purple-900/30 shadow-2xl">
          <CardContent className="p-4 sm:p-6 space-y-5">
            {/* Source Toggle */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-semibold text-foreground">Pool Source:</span>
              </div>
              <div className="grid grid-cols-2 p-1 bg-muted/60 rounded-xl w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setSource("watchlist")}
                  className={cn(
                    "flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all",
                    source === "watchlist"
                      ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <BookmarkCheck className="w-4 h-4" />
                  <span>My Watchlist</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSource("discover")}
                  className={cn(
                    "flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all",
                    source === "discover"
                      ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Flame className="w-4 h-4" />
                  <span>TMDB Discover</span>
                </button>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Content Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Type</label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-muted/40 rounded-lg border border-border/40">
                  {(["all", "movie", "tvshow"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setContentType(t)}
                      className={cn(
                        "py-1.5 text-xs font-medium rounded-md transition-all text-center capitalize",
                        contentType === t
                          ? "bg-purple-900/60 text-purple-200 border border-purple-600/50 shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {t === "all" ? "All" : t === "movie" ? "Movies" : "Series"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Genre Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Genre</label>
                <select
                  value={selectedGenre}
                  onChange={(e) => setSelectedGenre(e.target.value)}
                  className="w-full bg-muted/40 border border-border/40 rounded-lg py-2 px-3 text-xs sm:text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  {GENRE_OPTIONS.map((g) => (
                    <option key={g.id} value={g.id} className="bg-zinc-900 text-foreground">
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Minimum Rating */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Min Rating: {minRating > 0 ? `${minRating}+ ★` : "Any"}
                </label>
                <div className="grid grid-cols-4 gap-1 p-1 bg-muted/40 rounded-lg border border-border/40">
                  {[0, 6, 7, 8].map((score) => (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setMinRating(score)}
                      className={cn(
                        "py-1.5 text-xs font-medium rounded-md transition-all text-center",
                        minRating === score
                          ? "bg-purple-900/60 text-purple-200 border border-purple-600/50 shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {score === 0 ? "Any" : `${score}+`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Launch Spin Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                onClick={handleSpin}
                disabled={isSpinning}
                className={cn(
                  "relative w-full sm:w-auto px-8 py-6 rounded-xl font-bold text-base text-white transition-all duration-300",
                  "bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500",
                  "shadow-[0_0_25px_rgba(147,51,234,0.4)] hover:shadow-[0_0_35px_rgba(147,51,234,0.6)]",
                  "disabled:opacity-60 disabled:cursor-not-allowed group active:scale-95"
                )}
              >
                <Dices
                  className={cn(
                    "w-5 h-5 mr-2.5 transition-transform duration-700",
                    isSpinning ? "animate-spin" : "group-hover:rotate-180"
                  )}
                />
                <span>{isSpinning ? "Rolling the Vault..." : hasSpun ? "Spin Again" : "Spin the Vault"}</span>
                <span className="absolute -inset-0.5 rounded-xl bg-purple-500/20 blur opacity-0 group-hover:opacity-100 transition duration-500 pointer-events-none" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Empty Watchlist Notification Banner */}
      {emptyWatchlist && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto mb-8 p-4 rounded-xl bg-purple-950/40 border border-purple-800/40 text-center"
        >
          <Info className="w-5 h-5 text-purple-400 mx-auto mb-2" />
          <h4 className="text-sm font-semibold text-white mb-1">Watchlist Filter Empty</h4>
          <p className="text-xs text-muted-foreground mb-3">
            You don’t have any watchlist titles matching the selected filters. Switch to TMDB Discover mode to randomly roll from thousands of popular titles!
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSource("discover");
              setSelectedGenre("all");
              setMinRating(0);
              setTimeout(() => handleSpin(), 50);
            }}
            className="border-purple-600 text-purple-200 hover:bg-purple-900/50"
          >
            Switch to TMDB Discover & Roll
          </Button>
        </motion.div>
      )}

      {/* Main Showcase / Card Presentation Area */}
      <div className="max-w-3xl mx-auto mb-12">
        <AnimatePresence mode="wait">
          {/* STATE 1: Actively Spinning (3D Flip / Shuffling Card Effect) */}
          {isSpinning && (
            <motion.div
              key="spinning-card"
              initial={{ opacity: 0, scale: 0.9, rotateY: -90 }}
              animate={{
                opacity: 1,
                scale: 1,
                rotateY: [0, 180, 360, 540, 720],
              }}
              exit={{ opacity: 0, scale: 0.9, rotateY: 90 }}
              transition={{
                duration: 2.2,
                ease: "easeInOut",
                repeat: 0,
              }}
              style={{ transformStyle: "preserve-3d" }}
              className="relative aspect-[16/10] sm:aspect-[21/9] rounded-2xl overflow-hidden border-2 border-purple-500/60 bg-gradient-to-br from-card via-purple-950/30 to-black shadow-[0_0_50px_rgba(168,85,247,0.35)] flex items-center justify-center p-6 text-center"
            >
              {/* Shimmer line & glowing rings */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-600/20 via-transparent to-transparent animate-pulse" />
              <div className="absolute inset-0 shimmer pointer-events-none" />

              <div className="relative z-10 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-purple-600/30 border border-purple-400/50 flex items-center justify-center mx-auto text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.5)] animate-bounce">
                  <Dices className="w-8 h-8 animate-spin" />
                </div>
                <div className="space-y-1">
                  <span className="text-xs uppercase tracking-widest text-purple-400 font-mono font-semibold">
                    Vault Selecting
                  </span>
                  <h3 className="text-xl sm:text-2xl font-bold text-white truncate max-w-md mx-auto">
                    {cyclingCandidate ? cyclingCandidate.title : "Shuffling Cinematic Archives..."}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Analyzing ratings, genre preferences, and watchlist chronology...
                </p>
              </div>
            </motion.div>
          )}

          {/* STATE 2: Winner Revealed Card */}
          {!isSpinning && hasSpun && currentItem && (
            <motion.div
              key={`winner-${currentItem.tmdbId}`}
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="relative rounded-2xl overflow-hidden border border-purple-500/40 bg-card/90 backdrop-blur-2xl shadow-[0_20px_50px_-15px_rgba(147,51,234,0.3)] group"
            >
              {/* Backdrop Image Banner with Gradient */}
              <div className="relative h-44 sm:h-56 w-full overflow-hidden bg-zinc-950">
                <PosterImage
                  src={currentItem.backdropPath || currentItem.posterPath}
                  alt={currentItem.title}
                  aspectRatio="backdrop"
                  size="w1280"
                  zoomOnHover={false}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/70 to-transparent" />
                <div className="absolute top-4 right-4">
                  <Badge className="bg-purple-900/80 text-purple-200 border-purple-500/40 backdrop-blur-md px-3 py-1 font-mono text-xs">
                    Winner #{spinCount}
                  </Badge>
                </div>
              </div>

              {/* Card Details Content */}
              <div className="relative px-6 pb-6 pt-0 sm:-mt-20">
                <div className="flex flex-col sm:flex-row gap-6 items-start">
                  {/* Floating Poster */}
                  <div className="w-32 sm:w-40 flex-shrink-0 mx-auto sm:mx-0 -mt-16 sm:mt-0 rounded-xl overflow-hidden border-2 border-purple-500/50 shadow-2xl z-10 bg-card">
                    <PosterImage
                      src={currentItem.posterPath}
                      alt={currentItem.title}
                      aspectRatio="poster"
                      size="w500"
                    />
                  </div>

                  {/* Info Column */}
                  <div className="flex-1 space-y-3 w-full">
                    {/* Meta Row: ContentType, Year, Rating, Runtime */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <Badge variant="secondary" className="capitalize">
                        {currentItem.contentType === "movie" ? (
                          <Film className="w-3 h-3 mr-1 text-purple-400" />
                        ) : (
                          <Tv className="w-3 h-3 mr-1 text-indigo-400" />
                        )}
                        {currentItem.contentType === "movie" ? "Movie" : "Series"}
                      </Badge>

                      {currentItem.releaseDate && (
                        <span className="flex items-center text-muted-foreground">
                          <Calendar className="w-3 h-3 mr-1" />
                          {formatYear(currentItem.releaseDate)}
                        </span>
                      )}

                      {currentItem.runtime && (
                        <span className="flex items-center text-muted-foreground">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatRuntime(currentItem.runtime)}
                        </span>
                      )}

                      {currentItem.voteAverage !== null && currentItem.voteAverage > 0 && (
                        <span
                          className={cn(
                            "flex items-center font-bold px-2 py-0.5 rounded bg-muted/60",
                            getRatingColor(currentItem.voteAverage)
                          )}
                        >
                          <Star className="w-3 h-3 mr-1 fill-current" />
                          {currentItem.voteAverage.toFixed(1)}
                        </span>
                      )}

                      {currentItem.collectionName && (
                        <Badge
                          variant="outline"
                          className="border-purple-600/40 text-purple-300 bg-purple-950/30"
                        >
                          <Layers className="w-3 h-3 mr-1" />
                          {currentItem.collectionName}
                        </Badge>
                      )}
                    </div>

                    {/* Title */}
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                      {currentItem.title}
                    </h2>

                    {/* Genres */}
                    {currentGenres.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {currentGenres.slice(0, 4).map((g) => (
                          <GenreBadge key={g.id || g.name} name={g.name} size="xs" />
                        ))}
                      </div>
                    )}

                    {/* Overview description */}
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                      {currentItem.overview || "No synopsis available for this selection."}
                    </p>

                    {/* Actions Toolbar */}
                    <div className="pt-3 flex flex-wrap items-center gap-3">
                      {/* Mark as Watched button */}
                      <Button
                        onClick={handleMarkWatched}
                        disabled={isWatched || isMarkingWatched}
                        className={cn(
                          "transition-all",
                          isWatched
                            ? "bg-emerald-600/80 hover:bg-emerald-600 text-white"
                            : "bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30"
                        )}
                      >
                        {isWatched ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-1.5" />
                            <span>Watched!</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4 mr-1.5" />
                            <span>{isMarkingWatched ? "Saving..." : "Mark as Watched"}</span>
                          </>
                        )}
                      </Button>

                      {/* View Details Link */}
                      <Button variant="outline" asChild className="border-border hover:border-purple-500">
                        <Link
                          href={`/content/${
                            currentItem.contentType === "tvshow" ? "tvshow" : "movie"
                          }/${currentItem.tmdbId}`}
                        >
                          <span>Full Details</span>
                          <ExternalLink className="w-3.5 h-3.5 ml-1.5 opacity-70" />
                        </Link>
                      </Button>

                      {/* Reroll Button */}
                      <Button
                        variant="ghost"
                        onClick={handleSpin}
                        className="text-muted-foreground hover:text-white hover:bg-purple-950/40"
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                        <span>Reroll</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STATE 3: Initial Empty State before first spin */}
          {!isSpinning && !hasSpun && (
            <motion.div
              key="initial-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16 px-6 rounded-2xl border border-dashed border-border/70 bg-card/40 backdrop-blur-md"
            >
              <div className="w-16 h-16 rounded-2xl bg-purple-950/50 border border-purple-800/40 flex items-center justify-center mx-auto mb-4 text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.15)]">
                <Dices className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Ready for Tonight’s Pick?</h3>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto mb-6">
                Adjust your filter preferences above and tap <strong>Spin the Vault</strong> to activate the cinematic roulette wheel.
              </p>
              <Button
                onClick={handleSpin}
                className="bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                <span>Launch First Pick</span>
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Session Pick History Drawer / Carousel */}
      {pickHistory.length > 0 && (
        <div className="max-w-4xl mx-auto mt-12 pt-8 border-t border-border/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-purple-400" />
              <span>Rolled in This Session</span>
              <Badge variant="secondary" className="text-[10px] ml-1">
                {pickHistory.length}
              </Badge>
            </h3>
            <span className="text-xs text-muted-foreground">Click any card to inspect</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {pickHistory.map((item) => (
              <div
                key={item.tmdbId}
                onClick={() => {
                  setCurrentItem(item);
                  setIsWatched(false);
                }}
                className={cn(
                  "cursor-pointer group rounded-lg overflow-hidden border transition-all duration-300",
                  currentItem?.tmdbId === item.tmdbId
                    ? "border-purple-500 ring-2 ring-purple-500/50 scale-[1.02]"
                    : "border-border/60 hover:border-purple-500/50 hover:scale-105"
                )}
              >
                <div className="relative aspect-[2/3] bg-card">
                  <PosterImage
                    src={item.posterPath}
                    alt={item.title}
                    aspectRatio="poster"
                    size="w185"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                    <span className="text-[11px] font-bold text-white line-clamp-1">
                      {item.title}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
