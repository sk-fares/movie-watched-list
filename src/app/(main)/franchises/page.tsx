"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  Layers,
  Sparkles,
  Plus,
  Search,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  Trash2,
  ArrowUpDown,
  Calendar,
  Film,
  ExternalLink,
  Flame,
  Clock,
  Play,
  RotateCcw,
  Check,
  Compass,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PosterImage } from "@/components/poster-image";
import { useDebounce } from "@/hooks/use-debounce";
import { cn, formatDate, formatYear } from "@/lib/utils";

interface FranchiseEntry {
  id: string;
  franchiseId: string;
  sequenceNumber: number;
  contentType: string;
  tmdbId: number;
  title: string;
  releaseDate: string | null;
  posterPath: string | null;
  watched: boolean;
  watchedDate: string | null;
}

interface Franchise {
  id: string;
  tmdbCollectionId: number | null;
  name: string;
  overview: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  totalEntries: number;
  watchedCount: number;
  progressPercentage: number;
  isCompleted: boolean;
  releaseSpan: string;
  nextUnwatched: {
    id: string;
    sequenceNumber: number;
    tmdbId: number;
    title: string;
    releaseDate: string | null;
    posterPath: string | null;
  } | null;
  entries: FranchiseEntry[];
}

const POPULAR_PRESETS = [
  { id: 86311, name: "The Avengers / Marvel Cinematic Universe", count: 4, poster: "/yFSIUVTCvgYr05wtP0qdwuU3N2d.jpg" },
  { id: 10, name: "Star Wars Saga", count: 9, poster: "/r8Ph5qVLud39e4465YVo07neQUS.jpg" },
  { id: 1241, name: "Harry Potter Collection", count: 8, poster: "/eVPs2Y0LyvTLZn6AP5Z6O2rtiGB.jpg" },
  { id: 119, name: "The Lord of the Rings Collection", count: 3, poster: "/p4UebmvvgdnJz9pT4yY2vHkL3Z.jpg" },
  { id: 645, name: "James Bond Collection", count: 25, poster: "/horxC3W31r7N5H4Qe00EcxZ60a0.jpg" },
  { id: 9485, name: "Fast & Furious Collection", count: 10, poster: "/yK2kE12L8K2M9N6wU6b3h0i2v7M.jpg" },
  { id: 263, name: "The Dark Knight Trilogy", count: 3, poster: "/3bgtU2x3a4k9J31qX7P70eE31L0.jpg" },
  { id: 87359, name: "Mission: Impossible Collection", count: 7, poster: "/geu1T07Jm46sVfT4hO2lG6kM5p1.jpg" },
  { id: 2344, name: "The Matrix Collection", count: 4, poster: "/dXNAPwY7VrqMAo51EKhhCJfaGb5.jpg" },
  { id: 556, name: "Spider-Man (Original) Collection", count: 3, poster: "/rPVOJq703q6zX9vjJ9aZ35f60J5.jpg" },
];

export default function FranchisesPage() {
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [expandedFranchiseId, setExpandedFranchiseId] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "in-progress" | "completed">("all");
  const [sortBy, setSortBy] = useState<"updated" | "progress" | "title">("updated");

  // Add Franchise Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("presets");
  const [tmdbSearchInput, setTmdbSearchInput] = useState<string>("");
  const [tmdbSearchResults, setTmdbSearchResults] = useState<any[]>([]);
  const [isSearchingTmdb, setIsSearchingTmdb] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [previewCollection, setPreviewCollection] = useState<any | null>(null);

  // Custom Franchise inputs
  const [customName, setCustomName] = useState<string>("");
  const [customOverview, setCustomOverview] = useState<string>("");

  const debouncedTmdbSearch = useDebounce(tmdbSearchInput, 600);

  // Fetch user's franchises on mount
  const loadFranchises = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/franchise");
      const data = await res.json();
      if (res.ok && data.success) {
        setFranchises(data.franchises || []);
        // Automatically expand the first franchise if exists
        if (data.franchises?.length > 0 && !expandedFranchiseId) {
          setExpandedFranchiseId(data.franchises[0].id);
        }
      } else {
        toast.error(data.error || "Failed to load franchises");
      }
    } catch (err: any) {
      console.error("Load franchises error:", err);
      toast.error("Failed to connect to vault services");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFranchises();
  }, []);

  // TMDB Collection Search effect
  useEffect(() => {
    if (!debouncedTmdbSearch.trim()) {
      setTmdbSearchResults([]);
      return;
    }

    const searchCollections = async () => {
      setIsSearchingTmdb(true);
      try {
        const res = await fetch(
          `/api/franchise?searchTMDB=${encodeURIComponent(debouncedTmdbSearch.trim())}`
        );
        const data = await res.json();
        if (res.ok && data.success) {
          setTmdbSearchResults(data.results || []);
        }
      } catch (err) {
        console.error("TMDB search error:", err);
      } finally {
        setIsSearchingTmdb(false);
      }
    };

    searchCollections();
  }, [debouncedTmdbSearch]);

  // Import TMDB Collection by ID
  const handleImportCollection = async (collectionId: number) => {
    setIsImporting(true);
    const toastId = toast.loading("Importing franchise and sequencing entries...");

    try {
      const res = await fetch("/api/franchise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbCollectionId: collectionId }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          toast.error("You already have this franchise in your vault!", { id: toastId });
          setIsAddModalOpen(false);
          setExpandedFranchiseId(data.franchiseId);
          return;
        }
        throw new Error(data.error || "Failed to import collection");
      }

      toast.success(data.message || "Franchise imported successfully!", {
        id: toastId,
        icon: "🎬",
      });

      setIsAddModalOpen(false);
      setPreviewCollection(null);
      await loadFranchises();
      if (data.franchise?.id) {
        setExpandedFranchiseId(data.franchise.id);
      }
    } catch (err: any) {
      console.error("Import error:", err);
      toast.error(err.message || "Failed to import franchise", { id: toastId });
    } finally {
      setIsImporting(false);
    }
  };

  // Preview TMDB Collection before importing
  const handlePreviewCollection = async (collectionId: number) => {
    try {
      const res = await fetch(`/api/franchise?previewCollectionId=${collectionId}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setPreviewCollection(data.collection);
      } else {
        toast.error(data.error || "Could not preview collection");
      }
    } catch (err) {
      toast.error("Failed to fetch collection preview");
    }
  };

  // Toggle Entry Watched Status
  const handleToggleEntryWatched = async (
    franchiseId: string,
    entryId: string,
    currentWatched: boolean,
    title: string
  ) => {
    const newWatched = !currentWatched;

    // Optimistic UI update
    setFranchises((prev) =>
      prev.map((f) => {
        if (f.id !== franchiseId) return f;
        const updatedEntries = f.entries.map((e) =>
          e.id === entryId
            ? { ...e, watched: newWatched, watchedDate: newWatched ? new Date().toISOString() : null }
            : e
        );
        const watchedCount = updatedEntries.filter((e) => e.watched).length;
        const progressPercentage = Math.round((watchedCount / updatedEntries.length) * 100);
        const nextUnwatched = updatedEntries.find((e) => !e.watched) || null;

        return {
          ...f,
          entries: updatedEntries,
          watchedCount,
          progressPercentage,
          isCompleted: watchedCount === updatedEntries.length,
          nextUnwatched: nextUnwatched
            ? {
                id: nextUnwatched.id,
                sequenceNumber: nextUnwatched.sequenceNumber,
                tmdbId: nextUnwatched.tmdbId,
                title: nextUnwatched.title,
                releaseDate: nextUnwatched.releaseDate,
                posterPath: nextUnwatched.posterPath,
              }
            : null,
        };
      })
    );

    try {
      const res = await fetch(`/api/franchise/${franchiseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_watched",
          entryId,
          watched: newWatched,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update watched status");
      }

      toast.success(
        newWatched ? `Marked "${title}" as watched!` : `Marked "${title}" as unwatched.`,
        { icon: newWatched ? "✅" : "↩️" }
      );
    } catch (err: any) {
      console.error("Toggle watched error:", err);
      toast.error("Failed to update status. Reloading...");
      loadFranchises();
    }
  };

  // Delete Franchise
  const handleDeleteFranchise = async (franchiseId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove "${name}" from your vault?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/franchise/${franchiseId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Removed "${name}" from your vault.`);
        setFranchises((prev) => prev.filter((f) => f.id !== franchiseId));
      } else {
        toast.error(data.error || "Failed to delete franchise");
      }
    } catch (err) {
      toast.error("Failed to delete franchise");
    }
  };

  // Reorder sequence numbers (Move entry up or down)
  const handleReorderEntry = async (
    franchiseId: string,
    index: number,
    direction: "up" | "down"
  ) => {
    const franchise = franchises.find((f) => f.id === franchiseId);
    if (!franchise) return;

    const entries = [...franchise.entries];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= entries.length) return;

    // Swap sequence numbers
    const tempSeq = entries[index].sequenceNumber;
    entries[index].sequenceNumber = entries[targetIndex].sequenceNumber;
    entries[targetIndex].sequenceNumber = tempSeq;

    // Sort array
    entries.sort((a, b) => a.sequenceNumber - b.sequenceNumber);

    // Optimistically update
    setFranchises((prev) =>
      prev.map((f) => (f.id === franchiseId ? { ...f, entries } : f))
    );

    try {
      await fetch(`/api/franchise/${franchiseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reorder",
          entries: entries.map((e) => ({ id: e.id, sequenceNumber: e.sequenceNumber })),
        }),
      });
      toast.success("Sequence reordered", { duration: 1500 });
    } catch (err) {
      toast.error("Failed to save new order");
      loadFranchises();
    }
  };

  // Filtered and Sorted Franchises
  const filteredFranchises = franchises
    .filter((f) => {
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const matchesName = f.name.toLowerCase().includes(query);
        const matchesPart = f.entries.some((e) => e.title.toLowerCase().includes(query));
        if (!matchesName && !matchesPart) return false;
      }
      if (statusFilter === "in-progress") return !f.isCompleted;
      if (statusFilter === "completed") return f.isCompleted;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "progress") {
        return b.progressPercentage - a.progressPercentage;
      }
      if (sortBy === "title") {
        return a.name.localeCompare(b.name);
      }
      return 0; // Default: updated
    });

  // Global Statistics
  const totalUniverses = franchises.length;
  const totalEntriesInVault = franchises.reduce((acc, f) => acc + f.totalEntries, 0);
  const totalWatchedInVault = franchises.reduce((acc, f) => acc + f.watchedCount, 0);
  const globalCompletionRate =
    totalEntriesInVault > 0 ? Math.round((totalWatchedInVault / totalEntriesInVault) * 100) : 0;

  // Global "Next Up" recommendation across all active franchises
  const nextUpCandidate = franchises
    .filter((f) => !f.isCompleted && f.nextUnwatched)
    .map((f) => ({
      franchise: f,
      entry: f.nextUnwatched!,
    }))[0];

  return (
    <div className="relative min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Background ambient lighting */}
      <div className="absolute top-10 right-1/4 w-[600px] h-[300px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-950/60 border border-purple-800/50 text-purple-300 text-xs font-semibold mb-3 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            <span>Chronological & Sequential Universes</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2">
            Franchise <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-violet-300 to-indigo-400">Vaults</span>
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            Track vast cinematic storylines, multi-phase sagas, and collection series in their intended chronological order.
          </p>
        </div>

        {/* Add Franchise Button */}
        <Button
          size="lg"
          onClick={() => setIsAddModalOpen(true)}
          className="bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 font-semibold rounded-xl flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          <span>Add Universe / Collection</span>
        </Button>
      </div>

      {/* Global Stats Overview Banner */}
      {totalUniverses > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-card/70 border-border/60 backdrop-blur-md">
            <CardContent className="p-4 sm:p-5">
              <span className="text-xs font-medium text-muted-foreground">Franchises Tracked</span>
              <p className="text-2xl sm:text-3xl font-extrabold text-white mt-1">{totalUniverses}</p>
            </CardContent>
          </Card>

          <Card className="bg-card/70 border-border/60 backdrop-blur-md">
            <CardContent className="p-4 sm:p-5">
              <span className="text-xs font-medium text-muted-foreground">Total Universe Titles</span>
              <p className="text-2xl sm:text-3xl font-extrabold text-purple-300 mt-1">{totalEntriesInVault}</p>
            </CardContent>
          </Card>

          <Card className="bg-card/70 border-border/60 backdrop-blur-md">
            <CardContent className="p-4 sm:p-5">
              <span className="text-xs font-medium text-muted-foreground">Titles Watched</span>
              <p className="text-2xl sm:text-3xl font-extrabold text-emerald-400 mt-1">{totalWatchedInVault}</p>
            </CardContent>
          </Card>

          <Card className="bg-card/70 border-border/60 backdrop-blur-md">
            <CardContent className="p-4 sm:p-5">
              <span className="text-xs font-medium text-muted-foreground">Overall Completion</span>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-2xl sm:text-3xl font-extrabold text-white">{globalCompletionRate}%</p>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-700"
                    style={{ width: `${globalCompletionRate}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* "Next Up in Your Sagas" Spotlight Card */}
      {nextUpCandidate && (
        <div className="mb-8 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-950/50 via-card to-card/80 border border-purple-800/40 backdrop-blur-xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-20 rounded-lg overflow-hidden border border-purple-500/40 flex-shrink-0 bg-zinc-900 shadow-md">
              <PosterImage
                src={nextUpCandidate.entry.posterPath}
                alt={nextUpCandidate.entry.title}
                aspectRatio="poster"
                size="w154"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/50">
                  Next in Sequential Order
                </span>
                <span className="text-xs text-muted-foreground">
                  Part #{nextUpCandidate.entry.sequenceNumber}
                </span>
              </div>
              <h4 className="text-base sm:text-lg font-bold text-white leading-snug">
                {nextUpCandidate.entry.title}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                From <strong>{nextUpCandidate.franchise.name}</strong> • {formatYear(nextUpCandidate.entry.releaseDate)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              size="sm"
              onClick={() =>
                handleToggleEntryWatched(
                  nextUpCandidate.franchise.id,
                  nextUpCandidate.entry.id,
                  false,
                  nextUpCandidate.entry.title
                )
              }
              className="w-full sm:w-auto bg-purple-600 hover:bg-purple-500 text-white font-semibold shadow-md shadow-purple-600/30"
            >
              <Check className="w-4 h-4 mr-1.5" />
              <span>Mark as Watched</span>
            </Button>
            <Button size="sm" variant="outline" asChild className="border-border">
              <Link href={`/content/movie/${nextUpCandidate.entry.tmdbId}`}>
                <span>Details</span>
                <ExternalLink className="w-3.5 h-3.5 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Search and Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search franchises or movie titles..."
            className="pl-9 bg-card/60 border-border/60 text-xs sm:text-sm"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* Status Filter */}
          <div className="flex items-center p-1 bg-muted/50 rounded-lg border border-border/40 text-xs">
            {(["all", "in-progress", "completed"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={cn(
                  "px-3 py-1.5 rounded-md font-medium capitalize transition-all",
                  statusFilter === filter
                    ? "bg-purple-900/60 text-purple-200 border border-purple-600/40 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {filter === "all" ? "All" : filter === "in-progress" ? "In Progress" : "Completed"}
              </button>
            ))}
          </div>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="bg-card/60 border border-border/60 text-xs rounded-lg py-1.5 px-2.5 text-foreground focus:outline-none"
          >
            <option value="updated">Recently Updated</option>
            <option value="progress">Highest Progress</option>
            <option value="title">Alphabetical</option>
          </select>
        </div>
      </div>

      {/* Franchise List Content */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 rounded-2xl bg-card/50 shimmer animate-pulse border border-border/40" />
          ))}
        </div>
      ) : filteredFranchises.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-border/70 bg-card/30">
          <Layers className="w-12 h-12 text-purple-400/60 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">
            {searchQuery ? "No matching franchises found" : "No Franchise Universes Tracked Yet"}
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto mb-6">
            {searchQuery
              ? "Try tweaking your search term or clear filters to see your franchises."
              : "Import a popular saga like the Marvel Cinematic Universe or Star Wars to begin your sequential watch tracking."}
          </p>
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30"
          >
            <Plus className="w-4 h-4 mr-2" />
            <span>Add Your First Franchise</span>
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredFranchises.map((franchise) => {
            const isExpanded = expandedFranchiseId === franchise.id;

            return (
              <Card
                key={franchise.id}
                className={cn(
                  "overflow-hidden transition-all duration-300 border bg-card/80 backdrop-blur-xl",
                  isExpanded
                    ? "border-purple-600/60 shadow-[0_10px_35px_-10px_rgba(147,51,234,0.25)]"
                    : "border-border/60 hover:border-purple-800/50"
                )}
              >
                {/* Header Banner */}
                <div className="relative">
                  {/* Backdrop Background Image */}
                  <div className="h-32 sm:h-40 w-full overflow-hidden bg-zinc-950 relative">
                    <PosterImage
                      src={franchise.backdropPath || franchise.posterPath}
                      alt={franchise.name}
                      aspectRatio="backdrop"
                      size="w1280"
                      zoomOnHover={false}
                      className="w-full h-full object-cover opacity-35"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-card/80 to-transparent" />
                  </div>

                  {/* Header details overlaid */}
                  <div className="absolute inset-0 p-4 sm:p-6 flex flex-col justify-end">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                      <div className="flex items-center gap-4">
                        {/* Poster Thumbnail */}
                        <div className="w-14 sm:w-20 rounded-lg overflow-hidden border border-purple-500/40 shadow-xl flex-shrink-0 bg-card">
                          <PosterImage
                            src={franchise.posterPath}
                            alt={franchise.name}
                            aspectRatio="poster"
                            size="w185"
                          />
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant="secondary"
                              className="text-[10px] bg-purple-950/60 text-purple-300 border-purple-800/40"
                            >
                              {franchise.totalEntries} Sequential Titles
                            </Badge>
                            {franchise.releaseSpan !== "N/A" && (
                              <span className="text-xs text-muted-foreground">
                                {franchise.releaseSpan}
                              </span>
                            )}
                          </div>
                          <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
                            {franchise.name}
                          </h3>
                          {franchise.nextUnwatched && (
                            <p className="text-xs text-purple-300/80 mt-1 flex items-center gap-1.5">
                              <Play className="w-3 h-3 text-purple-400 fill-current" />
                              <span>Next to watch: #{franchise.nextUnwatched.sequenceNumber} {franchise.nextUnwatched.title}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Progress summary & Expand Button */}
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-xs font-bold text-white">
                            {franchise.watchedCount} / {franchise.totalEntries} Watched
                          </div>
                          <div className="w-32 h-2 bg-muted rounded-full overflow-hidden mt-1.5">
                            <div
                              className="h-full bg-gradient-to-r from-purple-500 to-emerald-400 rounded-full transition-all duration-500"
                              style={{ width: `${franchise.progressPercentage}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground mt-0.5 block">
                            {franchise.progressPercentage}% Completed
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setExpandedFranchiseId(isExpanded ? null : franchise.id)
                            }
                            className="rounded-full bg-muted/60 hover:bg-purple-950/60 text-purple-200"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5" />
                            ) : (
                              <ChevronDown className="w-5 h-5" />
                            )}
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              handleDeleteFranchise(franchise.id, franchise.name)
                            }
                            className="rounded-full hover:bg-rose-950/40 text-muted-foreground hover:text-rose-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Collapsible Ordered Entries Timeline */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="border-t border-border/50 bg-black/30 p-4 sm:p-6"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-purple-400" />
                          <span>Chronological Release Timeline</span>
                        </h4>
                        <span className="text-xs text-muted-foreground">
                          Tap any title to mark as watched or inspect details
                        </span>
                      </div>

                      {/* Entries List */}
                      <div className="space-y-2.5">
                        {franchise.entries.map((entry, index) => (
                          <div
                            key={entry.id}
                            className={cn(
                              "flex items-center justify-between gap-3 p-3 rounded-xl border transition-all duration-200",
                              entry.watched
                                ? "bg-purple-950/20 border-purple-900/30 text-white"
                                : "bg-card/60 border-border/50 hover:border-purple-500/40"
                            )}
                          >
                            {/* Sequence Number & Thumbnail */}
                            <div className="flex items-center gap-3">
                              <span
                                className={cn(
                                  "w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold flex-shrink-0",
                                  entry.watched
                                    ? "bg-purple-600/30 text-purple-300 border border-purple-500/50"
                                    : "bg-muted text-muted-foreground"
                                )}
                              >
                                #{entry.sequenceNumber}
                              </span>

                              <div className="w-10 h-14 rounded-md overflow-hidden bg-card flex-shrink-0 border border-border/60">
                                <PosterImage
                                  src={entry.posterPath}
                                  alt={entry.title}
                                  aspectRatio="poster"
                                  size="w92"
                                />
                              </div>

                              <div>
                                <Link
                                  href={`/content/movie/${entry.tmdbId}`}
                                  className="text-sm font-semibold hover:text-purple-300 transition-colors line-clamp-1"
                                >
                                  {entry.title}
                                </Link>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                  <span>{formatYear(entry.releaseDate)}</span>
                                  {entry.watchedDate && (
                                    <span className="text-[11px] text-emerald-400">
                                      • Watched {formatDate(entry.watchedDate)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Actions: Reorder & Watched Toggle */}
                            <div className="flex items-center gap-2">
                              {/* Reorder Arrows */}
                              <div className="flex flex-col gap-0.5 sm:flex-row">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled={index === 0}
                                  onClick={() =>
                                    handleReorderEntry(franchise.id, index, "up")
                                  }
                                  className="h-7 w-7 text-muted-foreground hover:text-white"
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled={index === franchise.entries.length - 1}
                                  onClick={() =>
                                    handleReorderEntry(franchise.id, index, "down")
                                  }
                                  className="h-7 w-7 text-muted-foreground hover:text-white"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </Button>
                              </div>

                              {/* Toggle Watched Button */}
                              <Button
                                size="sm"
                                variant={entry.watched ? "secondary" : "outline"}
                                onClick={() =>
                                  handleToggleEntryWatched(
                                    franchise.id,
                                    entry.id,
                                    entry.watched,
                                    entry.title
                                  )
                                }
                                className={cn(
                                  "h-8 px-3 text-xs font-semibold rounded-lg transition-all",
                                  entry.watched
                                    ? "bg-emerald-950/60 text-emerald-300 border border-emerald-600/40 hover:bg-emerald-900/60"
                                    : "border-border hover:border-purple-500 hover:text-purple-300"
                                )}
                              >
                                {entry.watched ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                                    <span>Watched</span>
                                  </>
                                ) : (
                                  <>
                                    <Circle className="w-3.5 h-3.5 mr-1.5 opacity-60" />
                                    <span>Mark Watched</span>
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Franchise Dialog */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-card/95 border-purple-900/40 backdrop-blur-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-400" />
              <span>Add Universe / Franchise</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Import official TMDB franchise collections or assemble your own custom cinematic universe.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid grid-cols-2 bg-muted/60 p-1 rounded-xl">
              <TabsTrigger value="presets" className="text-xs">
                Popular Sagas
              </TabsTrigger>
              <TabsTrigger value="search" className="text-xs">
                Search TMDB
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: Popular Sagas Presets */}
            <TabsContent value="presets" className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {POPULAR_PRESETS.map((preset) => (
                  <div
                    key={preset.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/30 hover:border-purple-500/50 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-14 rounded overflow-hidden bg-card flex-shrink-0">
                        <PosterImage
                          src={preset.poster}
                          alt={preset.name}
                          aspectRatio="poster"
                          size="w92"
                        />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white line-clamp-1">
                          {preset.name}
                        </h4>
                        <span className="text-[11px] text-muted-foreground">
                          {preset.count} Official Parts
                        </span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleImportCollection(preset.id)}
                      disabled={isImporting}
                      className="bg-purple-600 hover:bg-purple-500 text-white text-xs h-8 px-3"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      <span>Add</span>
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* TAB 2: Search TMDB Collections */}
            <TabsContent value="search" className="space-y-4 pt-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={tmdbSearchInput}
                  onChange={(e) => setTmdbSearchInput(e.target.value)}
                  placeholder="e.g. Star Wars, Batman, Fast & Furious, Alien, Shrek..."
                  className="pl-9 bg-muted/40 text-xs sm:text-sm"
                />
              </div>

              {isSearchingTmdb && (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  Searching TMDB collections database...
                </div>
              )}

              {!isSearchingTmdb && tmdbSearchResults.length > 0 && (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {tmdbSearchResults.map((result) => (
                    <div
                      key={result.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/20 hover:border-purple-500/50 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-16 rounded overflow-hidden bg-card flex-shrink-0">
                          <PosterImage
                            src={result.poster_path}
                            alt={result.name}
                            aspectRatio="poster"
                            size="w92"
                          />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white leading-tight">
                            {result.name}
                          </h4>
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {result.overview || "Official TMDB Franchise Collection"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePreviewCollection(result.id)}
                          className="text-xs h-8 px-2.5 border-border"
                        >
                          Preview
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleImportCollection(result.id)}
                          disabled={isImporting}
                          className="bg-purple-600 hover:bg-purple-500 text-white text-xs h-8 px-3"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" />
                          <span>Import</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Preview Drawer if user clicked preview */}
              {previewCollection && (
                <div className="p-4 rounded-xl border border-purple-600/40 bg-purple-950/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white">
                      Preview: {previewCollection.name} ({previewCollection.partsCount} entries)
                    </h4>
                    <Button
                      size="sm"
                      onClick={() => handleImportCollection(previewCollection.id)}
                      disabled={isImporting}
                      className="bg-purple-600 hover:bg-purple-500 text-white text-xs h-7 px-3"
                    >
                      Import All
                    </Button>
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {previewCollection.entries.map((entry: any) => (
                      <div
                        key={entry.tmdbId}
                        className="text-xs flex items-center justify-between py-1 border-b border-border/30"
                      >
                        <span className="text-muted-foreground">
                          #{entry.sequenceNumber} {entry.title} ({formatYear(entry.releaseDate)})
                        </span>
                        {entry.watched && (
                          <Badge variant="secondary" className="text-[10px] text-emerald-400">
                            Already Watched
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
