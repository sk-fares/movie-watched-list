"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  Film,
  Tv,
  Star,
  Clock,
  Calendar,
  BookmarkPlus,
  BookmarkCheck,
  CheckCircle2,
  Play,
  Share2,
  Layers,
  ArrowLeft,
  Heart,
  MessageSquare,
  Users,
  Video,
  DollarSign,
  Globe,
  ExternalLink,
  ChevronRight,
  ListPlus,
  Sparkles,
  Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PosterImage } from "@/components/poster-image";
import { GenreBadge } from "@/components/genre-badge";
import { RatingStars } from "@/components/rating-stars";
import { UniverseRelatedModal } from "@/components/universe-related-modal";
import {
  cn,
  formatDate,
  formatYear,
  formatRuntime,
  getRatingColor,
  truncateText,
} from "@/lib/utils";

export default function ContentDetailPage() {
  const params = useParams();
  const router = useRouter();

  const rawType = Array.isArray(params.type) ? params.type[0] : params.type;
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;

  const isMovie = rawType === "movie";
  const contentType = isMovie ? "movie" : "tvshow";
  const tmdbId = parseInt(rawId || "0", 10);

  // Data states
  const [data, setData] = useState<any>(null);
  const [userState, setUserState] = useState<any>({
    isAuthenticated: false,
    isInWatchlist: false,
    isWatched: false,
    watchedDate: null,
    userRating: null,
    userReview: null,
    notes: null,
    franchiseInfo: null,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Interaction states
  const [isUpdatingWatchlist, setIsUpdatingWatchlist] = useState<boolean>(false);
  const [isUpdatingWatched, setIsUpdatingWatched] = useState<boolean>(false);
  const [isTrailerModalOpen, setIsTrailerModalOpen] = useState<boolean>(false);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState<boolean>(false);
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [userNote, setUserNote] = useState<string>("");
  const [isSavingNote, setIsSavingNote] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [isUniverseModalOpen, setIsUniverseModalOpen] = useState<boolean>(false);

  // Fetch title details from internal API
  useEffect(() => {
    if (!tmdbId) return;

    const fetchDetails = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const res = await fetch(`/api/content/${contentType}/${tmdbId}`);
        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.error || "Failed to load title details");
        }

        setData(json.data);
        if (json.userState) {
          setUserState(json.userState);
          setSelectedRating(json.userState.userRating || 0);
          setUserNote(json.userState.notes || "");
        }
      } catch (err: any) {
        console.error("Content details error:", err);
        setError(err.message || "An error occurred while loading this title.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [contentType, tmdbId]);

  // Toggle Watchlist
  const handleToggleWatchlist = async () => {
    if (!data || isUpdatingWatchlist) return;

    setIsUpdatingWatchlist(true);
    const inWatchlist = userState.isInWatchlist;

    try {
      if (inWatchlist) {
        // DELETE from watchlist
        const res = await fetch(
          `/api/watchlist?tmdbId=${tmdbId}&contentType=${contentType}`,
          { method: "DELETE" }
        );
        if (!res.ok) throw new Error("Failed to remove from watchlist");

        setUserState((prev: any) => ({ ...prev, isInWatchlist: false }));
        toast.success(`Removed "${title}" from your watchlist.`);
      } else {
        // POST to watchlist
        const res = await fetch("/api/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tmdbId,
            contentType,
            title,
            posterPath: data.poster_path,
            backdropPath: data.backdrop_path,
            overview: data.overview,
            releaseDate,
            voteAverage: data.vote_average,
            genres: data.genres ? JSON.stringify(data.genres) : null,
            runtime: isMovie ? data.runtime : null,
          }),
        });

        const resData = await res.json();
        if (!res.ok) {
          if (res.status === 409) {
            setUserState((prev: any) => ({ ...prev, isInWatchlist: true }));
            toast("Already in your watchlist", { icon: "ℹ️" });
            return;
          }
          throw new Error(resData.error || "Failed to add to watchlist");
        }

        setUserState((prev: any) => ({ ...prev, isInWatchlist: true }));
        toast.success(`Added "${title}" to your watchlist!`, { icon: "🔖" });
      }
    } catch (err: any) {
      toast.error(err.message || "Watchlist update failed");
    } finally {
      setIsUpdatingWatchlist(false);
    }
  };

  // Toggle Watched
  const handleToggleWatched = async () => {
    if (!data || isUpdatingWatched) return;

    setIsUpdatingWatched(true);
    const currentlyWatched = userState.isWatched;

    try {
      if (currentlyWatched) {
        // Remove from watched
        const res = await fetch(
          `/api/watched?tmdbId=${tmdbId}&contentType=${contentType}`,
          { method: "DELETE" }
        );
        if (!res.ok) throw new Error("Failed to remove from watch history");

        setUserState((prev: any) => ({
          ...prev,
          isWatched: false,
          watchedDate: null,
        }));
        toast.success(`Marked "${title}" as unwatched.`);
      } else {
        // Add to watched
        const res = await fetch("/api/watched", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tmdbId,
            contentType,
            title,
            posterPath: data.poster_path,
            backdropPath: data.backdrop_path,
            releaseDate,
            voteAverage: data.vote_average,
            genres: data.genres ? JSON.stringify(data.genres) : null,
            runtime: isMovie ? data.runtime : null,
            rating: selectedRating > 0 ? selectedRating : undefined,
            removeFromWatchlist: true,
          }),
        });

        const resData = await res.json();
        if (!res.ok) throw new Error(resData.error || "Failed to mark as watched");

        setUserState((prev: any) => ({
          ...prev,
          isWatched: true,
          watchedDate: new Date().toISOString(),
          isInWatchlist: false,
        }));
        toast.success(`Marked "${title}" as watched!`, { icon: "🎬" });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update watched status");
    } finally {
      setIsUpdatingWatched(false);
    }
  };

  // Submit User Rating
  const handleSaveRating = async (ratingVal: number) => {
    setSelectedRating(ratingVal);
    try {
      // POST to watched endpoint with rating
      await fetch("/api/watched", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbId,
          contentType,
          title,
          posterPath: data.poster_path,
          backdropPath: data.backdrop_path,
          releaseDate,
          voteAverage: data.vote_average,
          rating: ratingVal,
        }),
      });

      setUserState((prev: any) => ({
        ...prev,
        userRating: ratingVal,
        isWatched: true,
      }));
      setIsRatingModalOpen(false);
      toast.success(`You rated "${title}" ${ratingVal}/10 ★!`, { icon: "⭐" });
    } catch (err) {
      toast.error("Failed to save rating");
    }
  };

  // Import collection into franchises
  const handleTrackFranchise = async () => {
    if (!data?.belongs_to_collection) return;
    const toastId = toast.loading("Adding collection to Franchise Vaults...");

    try {
      const res = await fetch("/api/franchise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbCollectionId: data.belongs_to_collection.id,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          toast.success("Franchise is already in your vaults!", { id: toastId });
          router.push("/franchises");
          return;
        }
        throw new Error(resData.error || "Failed to add franchise");
      }

      toast.success(`"${data.belongs_to_collection.name}" added to Franchises!`, {
        id: toastId,
        icon: "🌌",
      });
      router.push("/franchises");
    } catch (err: any) {
      toast.error(err.message || "Failed to import franchise", { id: toastId });
    }
  };

  // Save personal notes
  const handleSaveNotes = async () => {
    setIsSavingNote(true);
    try {
      const res = await fetch("/api/watchlist", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbId,
          contentType,
          notes: userNote,
        }),
      });
      if (!res.ok) throw new Error("Failed to save note");
      toast.success("Personal notes saved!", { icon: "📝" });
    } catch (err) {
      toast.error("Failed to save note");
    } finally {
      setIsSavingNote(false);
    }
  };

  // Loading Skeleton
  if (isLoading) {
    return (
      <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
        <div className="h-80 sm:h-96 rounded-3xl bg-card/60 shimmer animate-pulse border border-border/40" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="h-60 rounded-2xl bg-card/40 shimmer animate-pulse" />
          <div className="md:col-span-3 h-60 rounded-2xl bg-card/40 shimmer animate-pulse" />
        </div>
      </div>
    );
  }

  // Error State
  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <Film className="w-16 h-16 text-purple-400/50 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Title Not Found</h2>
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          {error || "We could not find the movie or TV show requested."}
        </p>
        <Button asChild className="bg-purple-600 hover:bg-purple-500">
          <Link href="/discover">
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span>Back to Discover</span>
          </Link>
        </Button>
      </div>
    );
  }

  // Derived Title Attributes
  const title = isMovie ? data.title || data.original_title : data.name || data.original_name;
  const originalTitle = isMovie ? data.original_title : data.original_name;
  const releaseDate = isMovie ? data.release_date : data.first_air_date;
  const runtimeDisplay = isMovie
    ? formatRuntime(data.runtime)
    : `${data.number_of_seasons || 1} Season${
        (data.number_of_seasons || 1) > 1 ? "s" : ""
      } • ${data.number_of_episodes || 0} Ep`;

  // Videos (Find official YouTube trailer)
  const trailerVideo =
    data.videos?.results?.find(
      (v: any) =>
        v.site === "YouTube" &&
        (v.type === "Trailer" || v.type === "Teaser") &&
        v.official
    ) ||
    data.videos?.results?.find((v: any) => v.site === "YouTube");

  // Cast members
  const castList = (data.credits?.cast || []).slice(0, 14);

  // Crew highlights
  const directors = (data.credits?.crew || []).filter(
    (c: any) => c.job === "Director" || c.job === "Series Director"
  );
  const writers = (data.credits?.crew || []).filter(
    (c: any) =>
      c.job === "Screenplay" || c.job === "Writer" || c.job === "Creator"
  );

  return (
    <div className="relative min-h-screen pb-16">
      {/* ─── HERO BACKDROP ──────────────────────────────────────────────────────── */}
      <div className="relative w-full h-[380px] sm:h-[480px] lg:h-[540px] overflow-hidden bg-black select-none">
        <PosterImage
          src={data.backdrop_path || data.poster_path}
          alt={title}
          aspectRatio="backdrop"
          size="original"
          zoomOnHover={false}
          className="w-full h-full object-cover opacity-45"
        />
        {/* Cinematic Vignette Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent" />

        {/* Back navigation button */}
        <div className="absolute top-6 left-6 z-20">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="rounded-full bg-black/60 backdrop-blur-md text-white hover:bg-black/80 border border-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            <span>Back</span>
          </Button>
        </div>
      </div>

      {/* ─── CONTENT WRAPPER ────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-44 sm:-mt-64 relative z-10">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* 1. Floating Poster Card */}
          <div className="w-48 sm:w-64 lg:w-72 flex-shrink-0 mx-auto md:mx-0 rounded-2xl overflow-hidden border-2 border-purple-500/40 shadow-[0_20px_50px_rgba(0,0,0,0.8)] bg-card">
            <PosterImage
              src={data.poster_path}
              alt={title}
              aspectRatio="poster"
              size="w780"
              priority
            />
          </div>

          {/* 2. Primary Information Block */}
          <div className="flex-1 space-y-4 text-center md:text-left">
            {/* Meta Tags: Type, Year, Runtime, Status */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <Badge variant="secondary" className="capitalize">
                {isMovie ? (
                  <Film className="w-3 h-3 mr-1 text-purple-400" />
                ) : (
                  <Tv className="w-3 h-3 mr-1 text-indigo-400" />
                )}
                {isMovie ? "Movie" : "TV Series"}
              </Badge>

              {releaseDate && (
                <span className="text-xs text-muted-foreground flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  {formatYear(releaseDate)}
                </span>
              )}

              <span className="text-xs text-muted-foreground flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                {runtimeDisplay}
              </span>

              {data.status && (
                <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                  {data.status}
                </Badge>
              )}
            </div>

            {/* Title */}
            <div>
              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                {title}
              </h1>
              {originalTitle && originalTitle !== title && (
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Original title: {originalTitle}
                </p>
              )}
              {data.tagline && (
                <p className="text-sm sm:text-base italic text-purple-300/90 mt-1 font-serif">
                  "{data.tagline}"
                </p>
              )}
            </div>

            {/* Rating Stars & Badges */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
              {data.vote_average > 0 && (
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex items-center gap-1 font-extrabold text-base px-2.5 py-1 rounded-lg bg-card/80 border border-border shadow-sm",
                      getRatingColor(data.vote_average)
                    )}
                  >
                    <Star className="w-4 h-4 fill-current" />
                    <span>{data.vote_average.toFixed(1)}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    ({data.vote_count?.toLocaleString()} votes)
                  </span>
                </div>
              )}

              {/* User Rating Display */}
              {userState.userRating && (
                <div className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-purple-950/60 border border-purple-600/40 text-purple-200">
                  <Heart className="w-3.5 h-3.5 text-purple-400 fill-current" />
                  <span>Your Rating: {userState.userRating}/10</span>
                </div>
              )}
            </div>

            {/* Genre Pills */}
            {data.genres && data.genres.length > 0 && (
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
                {data.genres.map((g: any) => (
                  <GenreBadge key={g.id} name={g.name} size="sm" />
                ))}
              </div>
            )}

            {/* ─── ACTION TOOLBAR ───────────────────────────────────────────────── */}
            <div className="pt-3 flex flex-wrap items-center justify-center md:justify-start gap-3">
              {/* Add / In Watchlist Button */}
              <Button
                onClick={handleToggleWatchlist}
                disabled={isUpdatingWatchlist}
                className={cn(
                  "font-semibold rounded-xl transition-all shadow-md",
                  userState.isInWatchlist
                    ? "bg-purple-900/70 border border-purple-500/50 text-purple-200 hover:bg-purple-900"
                    : "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30"
                )}
              >
                {userState.isInWatchlist ? (
                  <>
                    <BookmarkCheck className="w-4 h-4 mr-2 text-purple-400" />
                    <span>In Watchlist</span>
                  </>
                ) : (
                  <>
                    <BookmarkPlus className="w-4 h-4 mr-2" />
                    <span>Add to Watchlist</span>
                  </>
                )}
              </Button>

              {/* Mark Watched Button */}
              <Button
                variant={userState.isWatched ? "secondary" : "outline"}
                onClick={handleToggleWatched}
                disabled={isUpdatingWatched}
                className={cn(
                  "font-semibold rounded-xl transition-all",
                  userState.isWatched
                    ? "bg-emerald-950/60 text-emerald-300 border border-emerald-600/40 hover:bg-emerald-900/60"
                    : "border-border hover:border-purple-500"
                )}
              >
                {userState.isWatched ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-400" />
                    <span>Watched</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    <span>Mark as Watched</span>
                  </>
                )}
              </Button>

              {/* Rate Title Button */}
              <Button
                variant="outline"
                onClick={() => setIsRatingModalOpen(true)}
                className="rounded-xl border-border hover:border-purple-500"
              >
                <Star className="w-4 h-4 mr-2 text-yellow-400 fill-yellow-400/30" />
                <span>{userState.userRating ? `Rate (${userState.userRating}★)` : "Rate"}</span>
              </Button>

              {/* Play Trailer Button */}
              {trailerVideo && (
                <Button
                  variant="outline"
                  onClick={() => setIsTrailerModalOpen(true)}
                  className="rounded-xl border-border hover:border-purple-500 text-white"
                >
                  <Video className="w-4 h-4 mr-2 text-purple-400" />
                  <span>Trailer</span>
                </Button>
              )}
            </div>

            {/* Franchise / Universe Banner */}
            {(userState.franchiseInfo || data.belongs_to_collection) && (
              <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-purple-950/60 via-purple-900/30 to-card border border-purple-700/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600/20 border border-purple-500/40 text-purple-300 shrink-0">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-400">
                        Connected Universe
                      </span>
                      {userState.franchiseInfo?.sequenceNumber && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-800/60 text-purple-200 font-mono">
                          Part #{userState.franchiseInfo.sequenceNumber}
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-white text-base">
                      {userState.franchiseInfo?.franchiseName || data.belongs_to_collection?.name}
                    </h4>
                    {userState.franchiseInfo?.totalParts ? (
                      <p className="text-xs text-muted-foreground">
                        {userState.franchiseInfo.watchedCount} of {userState.franchiseInfo.totalParts} watched ({userState.franchiseInfo.progressPercentage}%)
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => setIsUniverseModalOpen(true)}
                    className="text-xs h-8 px-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                  >
                    <Layers className="w-3.5 h-3.5 mr-1.5" />
                    <span>View All Connected Titles</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── MULTI-TAB DETAILED CONTENT SECTION ───────────────────────────── */}
        <div className="mt-12">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-muted/60 p-1 rounded-xl flex-wrap justify-start border border-border/50">
              <TabsTrigger value="overview" className="text-xs sm:text-sm">
                Overview & Story
              </TabsTrigger>
              {userState.franchiseInfo?.items && userState.franchiseInfo.items.length > 0 && (
                <TabsTrigger value="universe" className="text-xs sm:text-sm">
                  <Layers className="w-3.5 h-3.5 mr-1 text-purple-400" />
                  Universe & Spin-Offs ({userState.franchiseInfo.items.length})
                </TabsTrigger>
              )}
              <TabsTrigger value="cast" className="text-xs sm:text-sm">
                Cast & Crew
              </TabsTrigger>
              {trailerVideo && (
                <TabsTrigger value="trailers" className="text-xs sm:text-sm">
                  Trailers
                </TabsTrigger>
              )}
              {!isMovie && data.seasons && (
                <TabsTrigger value="seasons" className="text-xs sm:text-sm">
                  Seasons ({data.seasons.length})
                </TabsTrigger>
              )}
              {data.similar?.results?.length > 0 && (
                <TabsTrigger value="similar" className="text-xs sm:text-sm">
                  Similar Titles
                </TabsTrigger>
              )}
              <TabsTrigger value="notes" className="text-xs sm:text-sm">
                Personal Notes
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: Overview & Story */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Synopsis */}
                <div className="lg:col-span-2 space-y-4">
                  <h3 className="text-lg font-bold text-white">Storyline</h3>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed whitespace-pre-line">
                    {data.overview || "No detailed synopsis available for this title."}
                  </p>

                  {/* Key Directors & Writers */}
                  {(directors.length > 0 || writers.length > 0) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border/50">
                      {directors.length > 0 && (
                        <div>
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Director{directors.length > 1 ? "s" : ""}
                          </span>
                          <p className="text-sm font-medium text-white mt-0.5">
                            {directors.map((d: any) => d.name).join(", ")}
                          </p>
                        </div>
                      )}

                      {writers.length > 0 && (
                        <div>
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Writer{writers.length > 1 ? "s" : ""} / Creators
                          </span>
                          <p className="text-sm font-medium text-white mt-0.5">
                            {writers
                              .slice(0, 3)
                              .map((w: any) => w.name)
                              .join(", ")}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Related Universe Titles Strip */}
                  {userState.franchiseInfo?.items && userState.franchiseInfo.items.length > 0 && (
                    <div className="pt-4 border-t border-border/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
                          Connected Universe & Sequels ({userState.franchiseInfo.items.length})
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveTab("universe")}
                          className="h-7 text-xs text-purple-400 hover:text-purple-300"
                        >
                          View Full Saga
                          <ChevronRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </div>
                      <div className="flex items-stretch gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
                        {userState.franchiseInfo.items.map((it: any) => {
                          const itId = it.tmdbId || it.id;
                          const isCurrent = itId === tmdbId;
                          const itHref = `/content/${it.media_type === "tv" ? "tvshow" : "movie"}/${itId}`;
                          return (
                            <Link
                              key={itId}
                              href={itHref}
                              className={cn(
                                "relative flex flex-col w-28 shrink-0 rounded-xl overflow-hidden border p-1.5 transition-all group",
                                isCurrent
                                  ? "bg-purple-950/60 border-purple-500 shadow-md shadow-purple-950/30"
                                  : "bg-card/70 hover:bg-card border-border/60 hover:border-purple-500/50"
                              )}
                            >
                              <div className="relative aspect-[2/3] w-full rounded-lg overflow-hidden bg-muted mb-1.5">
                                <PosterImage
                                  src={it.posterPath || it.poster_path}
                                  alt={it.title}
                                  aspectRatio="poster"
                                  size="w185"
                                />
                                {it.isWatched && (
                                  <div className="absolute top-1 right-1 h-4 w-4 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow">
                                    <CheckCircle2 className="h-2.5 w-2.5" />
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
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Facts Sidebar */}
                <div className="space-y-4 p-5 rounded-2xl bg-card/60 border border-border/60">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400">
                    Production Facts
                  </h4>
                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">Original Language</span>
                      <p className="font-semibold text-white uppercase mt-0.5">
                        {data.original_language || "en"}
                      </p>
                    </div>

                    {data.budget > 0 && (
                      <div>
                        <span className="text-muted-foreground">Budget</span>
                        <p className="font-semibold text-white mt-0.5">
                          ${data.budget.toLocaleString()}
                        </p>
                      </div>
                    )}

                    {data.revenue > 0 && (
                      <div>
                        <span className="text-muted-foreground">Box Office Revenue</span>
                        <p className="font-semibold text-white mt-0.5">
                          ${data.revenue.toLocaleString()}
                        </p>
                      </div>
                    )}

                    {data.production_companies?.length > 0 && (
                      <div>
                        <span className="text-muted-foreground">Production Studios</span>
                        <p className="font-semibold text-white mt-0.5">
                          {data.production_companies.map((p: any) => p.name).join(", ")}
                        </p>
                      </div>
                    )}

                    {data.imdb_id && (
                      <div className="pt-2">
                        <a
                          href={`https://www.imdb.com/title/${data.imdb_id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-yellow-400 hover:underline"
                        >
                          <span>View on IMDb</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB: Universe & Spin-Offs */}
            {userState.franchiseInfo?.items && (
              <TabsContent value="universe" className="space-y-6">
                <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-950/60 via-background to-card border border-purple-600/40">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-900/80 text-purple-200 uppercase tracking-wider">
                          Complete Saga Order
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {userState.franchiseInfo.totalParts} Total Parts
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-white">
                        {userState.franchiseInfo.franchiseName}
                      </h3>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-xs font-semibold text-purple-200">
                          {userState.franchiseInfo.watchedCount} of {userState.franchiseInfo.totalParts} Watched ({userState.franchiseInfo.progressPercentage}%)
                        </span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setIsUniverseModalOpen(true)}
                        className="bg-purple-600 hover:bg-purple-500 text-white text-xs"
                      >
                        <Layers className="w-3.5 h-3.5 mr-1" />
                        Interactive Tracker
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {userState.franchiseInfo.items.map((it: any) => {
                    const itId = it.tmdbId || it.id;
                    const isCurrent = itId === tmdbId;
                    const itHref = `/content/${it.media_type === "tv" ? "tvshow" : "movie"}/${itId}`;
                    return (
                      <Link
                        key={itId}
                        href={itHref}
                        className={cn(
                          "group rounded-xl overflow-hidden border p-2 transition-all hover:scale-[1.02]",
                          isCurrent
                            ? "bg-purple-950/50 border-purple-500 shadow-lg shadow-purple-950/40 ring-1 ring-purple-500/50"
                            : "bg-card/60 hover:bg-card border-border/60 hover:border-purple-500/50"
                        )}
                      >
                        <div className="relative aspect-[2/3] w-full rounded-lg overflow-hidden bg-muted mb-2">
                          <PosterImage
                            src={it.posterPath || it.poster_path}
                            alt={it.title}
                            aspectRatio="poster"
                            size="w342"
                          />
                          <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-black/85 backdrop-blur-md text-xs font-mono font-bold text-purple-200 border border-purple-500/40">
                            #{it.sequence}
                          </div>
                          {it.isWatched && (
                            <div className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center gap-1 shadow">
                              <CheckCircle2 className="w-3 h-3" />
                              WATCHED
                            </div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-purple-300">
                              {it.role || "Core"}
                            </span>
                            <span className="text-muted-foreground">{it.year}</span>
                          </div>
                          <p className="text-xs font-bold text-white line-clamp-1 group-hover:text-purple-300">
                            {it.title}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </TabsContent>
            )}

            {/* TAB 2: Cast & Crew */}
            <TabsContent value="cast" className="space-y-4">
              <h3 className="text-lg font-bold text-white">Top Billed Cast</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-3">
                {castList.map((member: any) => (
                  <div
                    key={member.id}
                    className="rounded-xl overflow-hidden bg-card/60 border border-border/60 p-2 text-center space-y-1.5"
                  >
                    <div className="aspect-square rounded-lg overflow-hidden bg-muted mx-auto relative">
                      <PosterImage
                        src={member.profile_path}
                        alt={member.name}
                        aspectRatio="square"
                        size="w185"
                      />
                    </div>
                    <p className="text-xs font-bold text-white line-clamp-1">{member.name}</p>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">
                      {member.character}
                    </p>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* TAB 3: Trailers & Videos */}
            {trailerVideo && (
              <TabsContent value="trailers" className="space-y-4">
                <h3 className="text-lg font-bold text-white">Official Video Showcase</h3>
                <div className="aspect-video max-w-4xl rounded-2xl overflow-hidden border border-purple-500/30 shadow-2xl bg-black">
                  <iframe
                    src={`https://www.youtube.com/embed/${trailerVideo.key}?rel=0`}
                    title={trailerVideo.name}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
              </TabsContent>
            )}

            {/* TAB 4: TV Seasons */}
            {!isMovie && data.seasons && (
              <TabsContent value="seasons" className="space-y-4">
                <h3 className="text-lg font-bold text-white">Seasons Breakdown</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {data.seasons.map((season: any) => (
                    <div
                      key={season.id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-card/60"
                    >
                      <div className="w-14 h-20 rounded-md overflow-hidden bg-muted flex-shrink-0">
                        <PosterImage
                          src={season.poster_path}
                          alt={season.name}
                          aspectRatio="poster"
                          size="w92"
                        />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{season.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {season.episode_count} Episodes • {formatYear(season.air_date)}
                        </p>
                        <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                          {season.overview || "Official Season Release"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            )}

            {/* TAB 5: Similar Titles */}
            {data.similar?.results?.length > 0 && (
              <TabsContent value="similar" className="space-y-4">
                <h3 className="text-lg font-bold text-white">You Might Also Like</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {data.similar.results.slice(0, 12).map((item: any) => (
                    <Link
                      key={item.id}
                      href={`/content/${isMovie ? "movie" : "tvshow"}/${item.id}`}
                      className="group rounded-xl overflow-hidden border border-border/60 bg-card/60 hover:border-purple-500/50 transition-all hover:scale-[1.03]"
                    >
                      <PosterImage
                        src={item.poster_path}
                        alt={item.title || item.name}
                        aspectRatio="poster"
                        size="w342"
                      />
                      <div className="p-2">
                        <p className="text-xs font-bold text-white line-clamp-1 group-hover:text-purple-300">
                          {item.title || item.name}
                        </p>
                        <span className="text-[10px] text-muted-foreground">
                          {formatYear(item.release_date || item.first_air_date)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </TabsContent>
            )}

            {/* TAB 6: Personal Notes */}
            <TabsContent value="notes" className="space-y-4 max-w-2xl">
              <h3 className="text-lg font-bold text-white">Your Personal Vault Notes</h3>
              <p className="text-xs text-muted-foreground">
                Write private reminders, thoughts, favorite quotes, or watch parties details.
              </p>
              <textarea
                value={userNote}
                onChange={(e) => setUserNote(e.target.value)}
                rows={5}
                placeholder="Add notes about where you watched it, favorite scenes, or recommendations..."
                className="w-full bg-card/80 border border-border/60 rounded-xl p-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
              <Button
                onClick={handleSaveNotes}
                disabled={isSavingNote}
                className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs"
              >
                {isSavingNote ? "Saving Notes..." : "Save Personal Notes"}
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* ─── TRAILER MODAL ────────────────────────────────────────────────────── */}
      {trailerVideo && (
        <Dialog open={isTrailerModalOpen} onOpenChange={setIsTrailerModalOpen}>
          <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black border-purple-900/50">
            <div className="aspect-video w-full">
              <iframe
                src={`https://www.youtube.com/embed/${trailerVideo.key}?autoplay=1&rel=0`}
                title={trailerVideo.name}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── RATING MODAL ─────────────────────────────────────────────────────── */}
      <Dialog open={isRatingModalOpen} onOpenChange={setIsRatingModalOpen}>
        <DialogContent className="max-w-sm bg-card/95 border-purple-900/40 backdrop-blur-2xl p-6 text-center">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white">
              Rate "{title}"
            </DialogTitle>
          </DialogHeader>

          <div className="py-6 flex flex-col items-center justify-center gap-4">
            <div className="text-4xl font-black text-purple-300">
              {selectedRating > 0 ? `${selectedRating} ★` : "Select Score"}
            </div>

            <div className="grid grid-cols-5 gap-2 w-full max-w-xs">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                <button
                  key={score}
                  type="button"
                  onClick={() => setSelectedRating(score)}
                  className={cn(
                    "h-10 rounded-lg text-sm font-bold border transition-all",
                    selectedRating === score
                      ? "bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-600/40"
                      : "bg-muted/40 border-border/60 text-muted-foreground hover:text-white hover:border-purple-500/50"
                  )}
                >
                  {score}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRatingModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={selectedRating === 0}
              onClick={() => handleSaveRating(selectedRating)}
              className="bg-purple-600 hover:bg-purple-500 text-white font-semibold"
            >
              Save Rating
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── UNIVERSE & RELATED MODAL ────────────────────────────────────────── */}
      {isUniverseModalOpen && (
        <UniverseRelatedModal
          isOpen={isUniverseModalOpen}
          onClose={() => setIsUniverseModalOpen(false)}
          universeId={userState.franchiseInfo?.franchiseId}
          tmdbId={tmdbId}
          title={userState.franchiseInfo?.franchiseName || title}
          initialUniverse={
            userState.franchiseInfo
              ? {
                  id: userState.franchiseInfo.franchiseId || "universe",
                  name: userState.franchiseInfo.franchiseName || "Universe",
                  category: userState.franchiseInfo.category || contentType,
                  items: userState.franchiseInfo.items || [],
                }
              : null
          }
          onSelectTitle={(selectedId, mediaType) => {
            setIsUniverseModalOpen(false);
            router.push(`/content/${mediaType === "tv" ? "tvshow" : "movie"}/${selectedId}`);
          }}
        />
      )}
    </div>
  );
}
