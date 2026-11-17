"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  X,
  Filter,
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

interface UniversePreset {
  id: number;
  name: string;
  count: number;
  category: "Superhero" | "Sci-Fi & Fantasy" | "Action & Crime" | "Animation" | "Horror & Thriller" | "Classic Sagas";
  poster?: string;
}

// ─── HUGE PRESET CATALOG (50+ Popular Universes) ──────────────────────────
const POPULAR_UNIVERSES: UniversePreset[] = [
  // ── Superhero ──
  { id: 86311, name: "The Avengers / Marvel Cinematic Universe", count: 4, category: "Superhero", poster: "/yFSIUVTCvgYr05wtP0qdwuU3N2d.jpg" },
  { id: 556, name: "Spider-Man (Sam Raimi Trilogy)", count: 3, category: "Superhero", poster: "/rPVOJq703q6zX9vjJ9aZ35f60J5.jpg" },
  { id: 173710, name: "The Amazing Spider-Man Collection", count: 2, category: "Superhero", poster: "/bU3Nq6a4wX4uB1wX4uB1wX4uB1w.jpg" },
  { id: 531241, name: "Spider-Man (MCU Homecoming Trilogy)", count: 3, category: "Superhero", poster: "/t3bhkrUX31QnZ51J8U6gT1z0kF5.jpg" },
  { id: 952726, name: "Spider-Verse (Animated)", count: 2, category: "Superhero", poster: "/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg" },
  { id: 263, name: "The Dark Knight Trilogy", count: 3, category: "Superhero", poster: "/3bgtU2x3a4k9J31qX7P70eE31L0.jpg" },
  { id: 120794, name: "Batman (Original Anthology 1989-1997)", count: 4, category: "Superhero", poster: "/2bXGZLkuq61asKveaHkYxI8817.jpg" },
  { id: 748, name: "X-Men Collection", count: 7, category: "Superhero", poster: "/1c2a1f11e93895e6f6630f0f49.jpg" },
  { id: 93345, name: "The Wolverine Collection", count: 3, category: "Superhero", poster: "/9Dk3B0hW713dK7g9J4K2L6u5y2X.jpg" },
  { id: 448150, name: "Deadpool Collection", count: 3, category: "Superhero", poster: "/yFSIUVTCvgYr05wtP0qdwuU3N2d.jpg" },
  { id: 131296, name: "Iron Man Collection", count: 3, category: "Superhero", poster: "/7vAEN9l0AevX5n4L22hX9F1k4c.jpg" },
  { id: 131295, name: "Captain America Collection", count: 3, category: "Superhero", poster: "/q4L8D8eT4o3k9W6b4u2X7y6j0m.jpg" },
  { id: 131292, name: "Thor Collection", count: 4, category: "Superhero", poster: "/prSfAi1xGrhLQNxVSUFh61x940w.jpg" },
  { id: 284433, name: "Guardians of the Galaxy Collection", count: 3, category: "Superhero", poster: "/nLBRD7UPR6GjmRiipVo2O1pa400.jpg" },

  // ── Sci-Fi & Fantasy ──
  { id: 10, name: "Star Wars Saga", count: 9, category: "Sci-Fi & Fantasy", poster: "/r8Ph5qVLud39e4465YVo07neQUS.jpg" },
  { id: 1241, name: "Harry Potter & Wizarding World", count: 8, category: "Sci-Fi & Fantasy", poster: "/eVPs2Y0LyvTLZn6AP5Z6O2rtiGB.jpg" },
  { id: 119, name: "The Lord of the Rings Collection", count: 3, category: "Sci-Fi & Fantasy", poster: "/p4UebmvvgdnJz9pT4yY2vHkL3Z.jpg" },
  { id: 121938, name: "The Hobbit Collection", count: 3, category: "Sci-Fi & Fantasy", poster: "/1g0dhYtq4irTY1GPXvft6k4IRKS.jpg" },
  { id: 2344, name: "The Matrix Collection", count: 4, category: "Sci-Fi & Fantasy", poster: "/dXNAPwY7VrqMAo51EKhhCJfaGb5.jpg" },
  { id: 328, name: "Jurassic Park & World Collection", count: 6, category: "Sci-Fi & Fantasy", poster: "/qIm2nHUQYHG9UJ19qoRBnWtEvk0.jpg" },
  { id: 8650, name: "Transformers Collection", count: 7, category: "Sci-Fi & Fantasy", poster: "/7t0lC15F3iA6fG7jX8L4y3M1q9.jpg" },
  { id: 391854, name: "Planet of the Apes (Reboot Saga)", count: 4, category: "Sci-Fi & Fantasy", poster: "/afk1i68Hl3qT8d0A1b6k7U5Y2v.jpg" },
  { id: 8091, name: "Alien Collection", count: 6, category: "Sci-Fi & Fantasy", poster: "/2b3F3X1W8J4K7L5y9U6a2v0m1q.jpg" },
  { id: 399, name: "Predator Collection", count: 5, category: "Sci-Fi & Fantasy", poster: "/4jV9lT4b2hX6y7U8w1m5k0q3a9.jpg" },
  { id: 131635, name: "The Hunger Games Collection", count: 5, category: "Sci-Fi & Fantasy", poster: "/yK2kE12L8K2M9N6wU6b3h0i2v7M.jpg" },
  { id: 33514, name: "The Twilight Saga", count: 5, category: "Sci-Fi & Fantasy", poster: "/p4UebmvvgdnJz9pT4yY2vHkL3Z.jpg" },
  { id: 264, name: "Back to the Future Trilogy", count: 3, category: "Sci-Fi & Fantasy", poster: "/7t0lC15F3iA6fG7jX8L4y3M1q9.jpg" },
  { id: 528, name: "Terminator Collection", count: 6, category: "Sci-Fi & Fantasy", poster: "/2bXGZLkuq61asKveaHkYxI8817.jpg" },
  { id: 86036, name: "Men in Black Collection", count: 4, category: "Sci-Fi & Fantasy", poster: "/dXNAPwY7VrqMAo51EKhhCJfaGb5.jpg" },
  { id: 535313, name: "MonsterVerse (Godzilla & Kong)", count: 5, category: "Sci-Fi & Fantasy", poster: "/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg" },

  // ── Action & Crime ──
  { id: 87359, name: "Mission: Impossible Collection", count: 7, category: "Action & Crime", poster: "/geu1T07Jm46sVfT4hO2lG6kM5p1.jpg" },
  { id: 645, name: "James Bond 007 Collection", count: 25, category: "Action & Crime", poster: "/horxC3W31r7N5H4Qe00EcxZ60a0.jpg" },
  { id: 9485, name: "Fast & Furious Collection", count: 10, category: "Action & Crime", poster: "/yK2kE12L8K2M9N6wU6b3h0i2v7M.jpg" },
  { id: 404609, name: "John Wick Universe", count: 4, category: "Action & Crime", poster: "/p4UebmvvgdnJz9pT4yY2vHkL3Z.jpg" },
  { id: 295, name: "Pirates of the Caribbean Collection", count: 5, category: "Action & Crime", poster: "/4jV9lT4b2hX6y7U8w1m5k0q3a9.jpg" },
  { id: 84, name: "Indiana Jones Collection", count: 5, category: "Action & Crime", poster: "/2b3F3X1W8J4K7L5y9U6a2v0m1q.jpg" },
  { id: 2150, name: "Jason Bourne Collection", count: 5, category: "Action & Crime", poster: "/q4L8D8eT4o3k9W6b4u2X7y6j0m.jpg" },
  { id: 8945, name: "Mad Max Collection", count: 5, category: "Action & Crime", poster: "/3bgtU2x3a4k9J31qX7P70eE31L0.jpg" },
  { id: 1570, name: "Die Hard Collection", count: 5, category: "Action & Crime", poster: "/dXNAPwY7VrqMAo51EKhhCJfaGb5.jpg" },
  { id: 1575, name: "Rocky & Creed Collection", count: 9, category: "Action & Crime", poster: "/7t0lC15F3iA6fG7jX8L4y3M1q9.jpg" },

  // ── Animation ──
  { id: 10194, name: "Toy Story Collection", count: 4, category: "Animation", poster: "/7G9Z1Iq2L2q6a4wX4uB1wX4uB1w.jpg" },
  { id: 12, name: "Shrek Collection", count: 4, category: "Animation", poster: "/eVPs2Y0LyvTLZn6AP5Z6O2rtiGB.jpg" },
  { id: 86066, name: "Despicable Me & Minions", count: 6, category: "Animation", poster: "/yFSIUVTCvgYr05wtP0qdwuU3N2d.jpg" },
  { id: 77816, name: "Kung Fu Panda Collection", count: 4, category: "Animation", poster: "/r8Ph5qVLud39e4465YVo07neQUS.jpg" },
  { id: 89163, name: "How to Train Your Dragon", count: 3, category: "Animation", poster: "/p4UebmvvgdnJz9pT4yY2vHkL3Z.jpg" },
  { id: 8354, name: "Ice Age Collection", count: 5, category: "Animation", poster: "/3bgtU2x3a4k9J31qX7P70eE31L0.jpg" },

  // ── Horror & Thriller ──
  { id: 313086, name: "The Conjuring Universe", count: 8, category: "Horror & Thriller", poster: "/2bXGZLkuq61asKveaHkYxI8817.jpg" },
  { id: 91361, name: "Halloween Collection", count: 13, category: "Horror & Thriller", poster: "/dXNAPwY7VrqMAo51EKhhCJfaGb5.jpg" },
  { id: 2599, name: "Scream Collection", count: 6, category: "Horror & Thriller", poster: "/7t0lC15F3iA6fG7jX8L4y3M1q9.jpg" },
  { id: 125570, name: "Saw Collection", count: 10, category: "Horror & Thriller", poster: "/4jV9lT4b2hX6y7U8w1m5k0q3a9.jpg" },

  // ── Classic Sagas ──
  { id: 230, name: "The Godfather Trilogy", count: 3, category: "Classic Sagas", poster: "/2b3F3X1W8J4K7L5y9U6a2v0m1q.jpg" },
];

const PRESET_CATEGORIES = [
  "All",
  "Superhero",
  "Sci-Fi & Fantasy",
  "Action & Crime",
  "Animation",
  "Horror & Thriller",
  "Classic Sagas",
] as const;

export default function FranchisesPage() {
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [expandedFranchiseId, setExpandedFranchiseId] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "in-progress" | "completed">("all");
  const [sortBy, setSortBy] = useState<"updated" | "progress" | "title">("updated");

  // Add Universe Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("presets");
  const [presetCategory, setPresetCategory] = useState<string>("All");
  const [tmdbSearchInput, setTmdbSearchInput] = useState<string>("");
  const [tmdbSearchResults, setTmdbSearchResults] = useState<any[]>([]);
  const [isSearchingTmdb, setIsSearchingTmdb] = useState<boolean>(false);

  // Multi-Selection state
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<Set<number>>(new Set());
  const [addedCollectionIds, setAddedCollectionIds] = useState<Set<number>>(new Set());
  const [isBatchImporting, setIsBatchImporting] = useState<boolean>(false);
  const [hasAddedAny, setHasAddedAny] = useState<boolean>(false);

  const debouncedTmdbSearch = useDebounce(tmdbSearchInput, 500);

  // Set of already-imported collection IDs in user's vault
  const existingVaultCollectionIds = useMemo(() => {
    return new Set<number>(
      franchises
        .map((f) => f.tmdbCollectionId)
        .filter((id): id is number => typeof id === "number" && id > 0)
    );
  }, [franchises]);

  // Load user's franchises
  const loadFranchises = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/franchise");
      const data = await res.json();
      if (res.ok && data.success) {
        setFranchises(data.franchises || []);
        if (data.franchises?.length > 0 && !expandedFranchiseId) {
          setExpandedFranchiseId(data.franchises[0].id);
        }
      } else {
        toast.error(data.error || "Failed to load universes");
      }
    } catch (err: any) {
      console.error("Load franchises error:", err);
      toast.error("Failed to connect to universe vault");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFranchises();
  }, []);

  // When Add Modal closes, refresh vault if any new universes were added
  const handleModalOpenChange = (open: boolean) => {
    setIsAddModalOpen(open);
    if (!open) {
      if (hasAddedAny) {
        loadFranchises();
        setHasAddedAny(false);
        toast.success("Universe Vault updated!", { icon: "✨" });
      }
      setSelectedCollectionIds(new Set());
    }
  };

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

  // Toggle selection for a collection
  const toggleSelectCollection = (collectionId: number) => {
    if (existingVaultCollectionIds.has(collectionId) || addedCollectionIds.has(collectionId)) {
      return; // Already added
    }
    setSelectedCollectionIds((prev) => {
      const next = new Set(prev);
      if (next.has(collectionId)) {
        next.delete(collectionId);
      } else {
        next.add(collectionId);
      }
      return next;
    });
  };

  // Single import without closing modal
  const handleImportSingle = async (collectionId: number, name: string) => {
    try {
      const res = await fetch("/api/franchise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbCollectionId: collectionId }),
      });
      const data = await res.json();

      if (!res.ok && res.status !== 409) {
        throw new Error(data.error || "Failed to add universe");
      }

      setAddedCollectionIds((prev) => new Set(prev).add(collectionId));
      setSelectedCollectionIds((prev) => {
        const next = new Set(prev);
        next.delete(collectionId);
        return next;
      });
      setHasAddedAny(true);
      toast.success(`Added "${name}" to your vault!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to add universe");
    }
  };

  // Batch import all selected collections
  const handleBatchImport = async () => {
    if (selectedCollectionIds.size === 0) return;

    setIsBatchImporting(true);
    const count = selectedCollectionIds.size;
    const toastId = toast.loading(`Importing ${count} universes into your vault...`);

    try {
      const ids = Array.from(selectedCollectionIds);
      const results = await Promise.allSettled(
        ids.map((id) =>
          fetch("/api/franchise", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tmdbCollectionId: id }),
          })
        )
      );

      let successCount = 0;
      const newlyAdded = new Set(addedCollectionIds);

      results.forEach((res, i) => {
        if (res.status === "fulfilled" && (res.value.ok || res.value.status === 409)) {
          successCount++;
          newlyAdded.add(ids[i]);
        }
      });

      setAddedCollectionIds(newlyAdded);
      setSelectedCollectionIds(new Set());
      setHasAddedAny(true);

      toast.success(
        `Added ${successCount} universe${successCount === 1 ? "" : "s"}! Select more or close (✕) to view.`,
        { id: toastId, icon: "🎉" }
      );
    } catch (err: any) {
      toast.error("Some universes could not be imported", { id: toastId });
    } finally {
      setIsBatchImporting(false);
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
        const isCompleted = watchedCount === updatedEntries.length;
        const nextUnwatched = updatedEntries.find((e) => !e.watched) || null;

        return {
          ...f,
          entries: updatedEntries,
          watchedCount,
          progressPercentage,
          isCompleted,
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
          entryId,
          watched: newWatched,
        }),
      });

      if (!res.ok) throw new Error("Could not update watched status");

      toast.success(
        newWatched ? `Marked "${title}" as watched!` : `Unmarked "${title}" as watched`,
        { icon: newWatched ? "✅" : "↩️" }
      );
    } catch (err) {
      toast.error("Failed to update status on server");
      loadFranchises(); // Rollback
    }
  };

  // Reorder franchise entries
  const handleReorderEntry = async (franchiseId: string, index: number, direction: "up" | "down") => {
    const franchise = franchises.find((f) => f.id === franchiseId);
    if (!franchise) return;

    const newEntries = [...franchise.entries];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newEntries.length) return;

    // Swap sequence numbers
    const temp = newEntries[index];
    newEntries[index] = newEntries[targetIndex];
    newEntries[targetIndex] = temp;

    const updatedWithSeq = newEntries.map((e, idx) => ({
      ...e,
      sequenceNumber: idx + 1,
    }));

    // Optimistic UI update
    setFranchises((prev) =>
      prev.map((f) => (f.id === franchiseId ? { ...f, entries: updatedWithSeq } : f))
    );

    try {
      const res = await fetch(`/api/franchise/${franchiseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reorderEntries: updatedWithSeq.map((e) => ({
            id: e.id,
            sequenceNumber: e.sequenceNumber,
          })),
        }),
      });

      if (!res.ok) throw new Error("Failed to reorder sequence");
      toast.success("Chronological sequence updated!");
    } catch (err) {
      toast.error("Failed to persist new sequence order");
      loadFranchises();
    }
  };

  // Delete Universe
  const handleDeleteFranchise = async (franchiseId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove the "${name}" universe from your vault?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/franchise/${franchiseId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete universe");

      setFranchises((prev) => prev.filter((f) => f.id !== franchiseId));
      if (expandedFranchiseId === franchiseId) {
        setExpandedFranchiseId(null);
      }
      toast.success(`Removed "${name}" from your vault`);
    } catch (err) {
      toast.error("Could not remove universe");
    }
  };

  // Filtered presets based on category pill
  const filteredPresets = useMemo(() => {
    if (presetCategory === "All") return POPULAR_UNIVERSES;
    return POPULAR_UNIVERSES.filter((p) => p.category === presetCategory);
  }, [presetCategory]);

  // Filtered & Sorted user franchises
  const filteredFranchises = franchises
    .filter((f) => {
      const matchesSearch =
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.entries.some((e) => e.title.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;
      if (statusFilter === "completed") return f.isCompleted;
      if (statusFilter === "in-progress") return !f.isCompleted;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "progress") return b.progressPercentage - a.progressPercentage;
      if (sortBy === "title") return a.name.localeCompare(b.name);
      return 0;
    });

  // Global Statistics
  const totalUniverses = franchises.length;
  const totalEntriesInVault = franchises.reduce((acc, f) => acc + f.totalEntries, 0);
  const totalWatchedInVault = franchises.reduce((acc, f) => acc + f.watchedCount, 0);
  const globalCompletionRate =
    totalEntriesInVault > 0 ? Math.round((totalWatchedInVault / totalEntriesInVault) * 100) : 0;

  return (
    <div className="relative min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Background ambient lighting */}
      <div className="absolute top-10 right-1/4 w-[600px] h-[300px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-950/60 border border-purple-800/50 text-purple-300 text-xs font-semibold mb-3 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            <span>Storyline & Universe Tracker</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2">
            Cinematic <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-violet-300 to-indigo-400">Universes</span>
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            Track vast multi-film storylines, superhero sagas, and epic franchises in their intended chronological order.
          </p>
        </div>

        {/* Add Universe Button */}
        <Button
          size="lg"
          onClick={() => setIsAddModalOpen(true)}
          className="bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 font-semibold rounded-xl flex items-center gap-2 shrink-0"
        >
          <Plus className="w-5 h-5" />
          <span>Add Universe</span>
        </Button>
      </div>

      {/* Global Stats Overview Banner */}
      {totalUniverses > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-card/70 border-border/60 backdrop-blur-md">
            <CardContent className="p-4 sm:p-5">
              <span className="text-xs font-medium text-muted-foreground">Universes Tracked</span>
              <p className="text-2xl sm:text-3xl font-extrabold text-white mt-1">{totalUniverses}</p>
            </CardContent>
          </Card>

          <Card className="bg-card/70 border-border/60 backdrop-blur-md">
            <CardContent className="p-4 sm:p-5">
              <span className="text-xs font-medium text-muted-foreground">Total Storyline Movies</span>
              <p className="text-2xl sm:text-3xl font-extrabold text-purple-300 mt-1">{totalEntriesInVault}</p>
            </CardContent>
          </Card>

          <Card className="bg-card/70 border-border/60 backdrop-blur-md">
            <CardContent className="p-4 sm:p-5">
              <span className="text-xs font-medium text-muted-foreground">Movies Watched</span>
              <p className="text-2xl sm:text-3xl font-extrabold text-emerald-400 mt-1">{totalWatchedInVault}</p>
            </CardContent>
          </Card>

          <Card className="bg-card/70 border-border/60 backdrop-blur-md">
            <CardContent className="p-4 sm:p-5">
              <span className="text-xs font-medium text-muted-foreground">Universe Completion</span>
              <p className="text-2xl sm:text-3xl font-extrabold text-indigo-400 mt-1">{globalCompletionRate}%</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search added universes or movies..."
            className="pl-9 bg-card/60 border-border/60 text-sm rounded-xl"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-1">
          <div className="flex items-center p-1 rounded-xl bg-card/60 border border-border/60 shrink-0">
            <button
              onClick={() => setStatusFilter("all")}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                statusFilter === "all" ? "bg-purple-600 text-white" : "text-muted-foreground hover:text-white"
              )}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter("in-progress")}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                statusFilter === "in-progress" ? "bg-purple-600 text-white" : "text-muted-foreground hover:text-white"
              )}
            >
              In Progress
            </button>
            <button
              onClick={() => setStatusFilter("completed")}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                statusFilter === "completed" ? "bg-purple-600 text-white" : "text-muted-foreground hover:text-white"
              )}
            >
              Completed
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-card/60 border border-border/60 px-3 py-2 rounded-xl shrink-0">
            <ArrowUpDown className="w-3.5 h-3.5 text-purple-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-xs text-foreground font-semibold focus:outline-none"
            >
              <option value="updated">Recently Updated</option>
              <option value="progress">Highest Progress</option>
              <option value="title">Alphabetical</option>
            </select>
          </div>
        </div>
      </div>

      {/* Universes List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 rounded-2xl bg-card/50 border border-border/40 animate-pulse" />
          ))}
        </div>
      ) : filteredFranchises.length === 0 ? (
        <div className="py-16 text-center space-y-4 rounded-3xl border border-dashed border-border/60 bg-card/30">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-purple-950/50 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Layers className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">No Universes Added Yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
              Select and add popular cinematic universes like the MCU, Star Wars, or Dark Knight in one click!
            </p>
          </div>
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl"
          >
            <Plus className="w-4 h-4 mr-2" />
            <span>Add Universe</span>
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredFranchises.map((franchise) => {
            const isExpanded = expandedFranchiseId === franchise.id;

            return (
              <Card
                key={franchise.id}
                className="overflow-hidden border-border/70 bg-card/60 backdrop-blur-md rounded-2xl transition-all shadow-md"
              >
                {/* Universe Card Summary Header */}
                <div
                  onClick={() => setExpandedFranchiseId(isExpanded ? null : franchise.id)}
                  className="p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 cursor-pointer hover:bg-muted/10 transition-colors select-none"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-14 h-20 sm:w-16 sm:h-24 rounded-xl overflow-hidden bg-muted/40 shrink-0 border border-border/60 shadow-md">
                      <PosterImage
                        src={franchise.posterPath}
                        alt={franchise.name}
                        aspectRatio="poster"
                        size="w185"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h2 className="text-lg sm:text-xl font-extrabold text-white truncate">
                          {franchise.name}
                        </h2>
                        {franchise.isCompleted ? (
                          <Badge className="bg-emerald-600/30 text-emerald-300 border-emerald-500/40 text-[10px]">
                            Completed ✓
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] border-purple-500/40 text-purple-300">
                            {franchise.watchedCount} of {franchise.totalEntries} Watched
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground line-clamp-1 max-w-xl">
                        {franchise.overview || "Official Cinematic Universe Order"}
                      </p>

                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 font-mono">
                          <Calendar className="w-3.5 h-3.5 text-purple-400" />
                          {franchise.releaseSpan}
                        </span>
                        <span className="flex items-center gap-1 font-mono">
                          <Film className="w-3.5 h-3.5 text-indigo-400" />
                          {franchise.totalEntries} Movies
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Progress & Expansion Indicator */}
                  <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end border-t md:border-0 border-border/40 pt-3 md:pt-0">
                    <div className="flex flex-col items-end min-w-[120px]">
                      <div className="flex items-center justify-between w-full text-xs font-semibold mb-1">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="text-purple-300">{franchise.progressPercentage}%</span>
                      </div>
                      <div className="w-32 h-2 rounded-full bg-muted/60 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
                          style={{ width: `${franchise.progressPercentage}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFranchise(franchise.id, franchise.name);
                        }}
                        className="h-9 w-9 text-muted-foreground hover:text-red-400 hover:bg-red-950/20 rounded-xl"
                        title="Remove universe from vault"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>

                      <div className="p-2 rounded-xl bg-muted/40 text-muted-foreground">
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-white" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Storyline Timeline Entries */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-border/60 bg-background/50 p-5 sm:p-6"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-400">
                          <Layers className="w-4 h-4" />
                          <span>Sequential Storyline Order</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          Use arrows to customize chronological viewing sequence
                        </span>
                      </div>

                      <div className="space-y-3">
                        {franchise.entries.map((entry, index) => (
                          <div
                            key={entry.id}
                            className={cn(
                              "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border transition-all",
                              entry.watched
                                ? "bg-emerald-950/20 border-emerald-900/30"
                                : "bg-card/40 border-border/40 hover:border-purple-500/30"
                            )}
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              {/* Order Badge */}
                              <div
                                className={cn(
                                  "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-mono font-bold shrink-0 shadow-sm",
                                  entry.watched
                                    ? "bg-emerald-600 text-white"
                                    : "bg-purple-950/80 text-purple-300 border border-purple-500/40"
                                )}
                              >
                                #{entry.sequenceNumber}
                              </div>

                              <div className="w-9 h-12 rounded overflow-hidden bg-muted/40 shrink-0 border border-border/40">
                                <PosterImage
                                  src={entry.posterPath}
                                  alt={entry.title}
                                  aspectRatio="poster"
                                  size="w92"
                                />
                              </div>

                              <div className="min-w-0">
                                <h4 className="text-sm font-bold text-white truncate">
                                  {entry.title}
                                </h4>
                                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                                  <span>{formatYear(entry.releaseDate)}</span>
                                  {entry.watched && entry.watchedDate && (
                                    <span className="text-emerald-400 font-medium">
                                      Watched {formatDate(entry.watchedDate)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Actions: Reorder & Watched Toggle */}
                            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                              <div className="flex items-center">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled={index === 0}
                                  onClick={() => handleReorderEntry(franchise.id, index, "up")}
                                  className="h-7 w-7 text-muted-foreground hover:text-white"
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled={index === franchise.entries.length - 1}
                                  onClick={() => handleReorderEntry(franchise.id, index, "down")}
                                  className="h-7 w-7 text-muted-foreground hover:text-white"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </Button>
                              </div>

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

      {/* ─── ADD UNIVERSE MODAL (MULTI-SELECTION & HUGE PRESETS) ─── */}
      <Dialog open={isAddModalOpen} onOpenChange={handleModalOpenChange}>
        <DialogContent className="max-w-3xl max-h-[88vh] flex flex-col bg-card/95 border-purple-900/40 backdrop-blur-2xl p-0 overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-border/40 shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-extrabold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-400" />
                <span>Add Universes to Vault</span>
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Select as many universes as you want below, or search the full TMDB database. Click the ✕ cross when done to view your collection.
            </DialogDescription>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
              <TabsList className="grid grid-cols-2 bg-muted/60 p-1 rounded-xl">
                <TabsTrigger value="presets" className="text-xs font-semibold">
                  Popular Universes ({POPULAR_UNIVERSES.length})
                </TabsTrigger>
                <TabsTrigger value="search" className="text-xs font-semibold">
                  Search All TMDB
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Category Pills for Presets */}
            {activeTab === "presets" && (
              <div className="flex items-center gap-1.5 overflow-x-auto pt-3 pb-1 scrollbar-none">
                {PRESET_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setPresetCategory(cat)}
                    className={cn(
                      "px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all border shrink-0",
                      presetCategory === cat
                        ? "bg-purple-600 border-purple-500 text-white shadow-md shadow-purple-900/40"
                        : "bg-muted/40 border-border/60 text-muted-foreground hover:text-white hover:border-purple-500/30"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Modal Content Scroll Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {activeTab === "presets" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredPresets.map((preset) => {
                  const isAlreadyInVault =
                    existingVaultCollectionIds.has(preset.id) || addedCollectionIds.has(preset.id);
                  const isSelected = selectedCollectionIds.has(preset.id);

                  return (
                    <div
                      key={preset.id}
                      onClick={() => toggleSelectCollection(preset.id)}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none",
                        isAlreadyInVault
                          ? "bg-emerald-950/20 border-emerald-800/40 opacity-75 cursor-default"
                          : isSelected
                          ? "bg-purple-950/40 border-purple-500 ring-1 ring-purple-500/50 shadow-md shadow-purple-900/30"
                          : "bg-muted/30 border-border/60 hover:border-purple-500/40 hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Checkbox circle indicator */}
                        <div
                          className={cn(
                            "w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-all",
                            isAlreadyInVault
                              ? "bg-emerald-600 border-emerald-500 text-white"
                              : isSelected
                              ? "bg-purple-600 border-purple-500 text-white"
                              : "border-border/80 bg-background/50"
                          )}
                        >
                          {(isAlreadyInVault || isSelected) && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>

                        <div className="w-10 h-14 rounded-lg overflow-hidden bg-card shrink-0 border border-border/40">
                          <PosterImage
                            src={preset.poster}
                            alt={preset.name}
                            aspectRatio="poster"
                            size="w92"
                          />
                        </div>

                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white truncate">
                            {preset.name}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {preset.count} Parts
                            </span>
                            <span className="text-[10px] text-purple-300 font-semibold px-1.5 py-0.2 rounded bg-purple-950/60 border border-purple-800/40">
                              {preset.category}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Quick Add Button or Status Badge */}
                      <div className="shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                        {isAlreadyInVault ? (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-1 rounded-md border border-emerald-700/40 flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Added
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant={isSelected ? "default" : "outline"}
                            onClick={() => handleImportSingle(preset.id, preset.name)}
                            className={cn(
                              "text-xs h-8 px-2.5 rounded-lg",
                              isSelected
                                ? "bg-purple-600 hover:bg-purple-500 text-white"
                                : "border-border hover:border-purple-500 text-foreground"
                            )}
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            <span>Add</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* TAB 2: Search TMDB Collections */
              <div className="space-y-4">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={tmdbSearchInput}
                    onChange={(e) => setTmdbSearchInput(e.target.value)}
                    placeholder="Search any saga, e.g. Godzilla, Hunger Games, Bourne, Mad Max, Rocky, Saw..."
                    className="pl-9 bg-muted/40 text-xs sm:text-sm rounded-xl"
                  />
                  {tmdbSearchInput && (
                    <button
                      onClick={() => setTmdbSearchInput("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {isSearchingTmdb && (
                  <div className="text-center py-10 text-xs text-muted-foreground flex items-center justify-center gap-2">
                    <Sparkles className="w-4 h-4 animate-spin text-purple-400" />
                    <span>Searching TMDB collections database...</span>
                  </div>
                )}

                {!isSearchingTmdb && tmdbSearchResults.length > 0 && (
                  <div className="space-y-2.5">
                    {tmdbSearchResults.map((result) => {
                      const isAlreadyInVault =
                        existingVaultCollectionIds.has(result.id) || addedCollectionIds.has(result.id);
                      const isSelected = selectedCollectionIds.has(result.id);

                      return (
                        <div
                          key={result.id}
                          onClick={() => toggleSelectCollection(result.id)}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none",
                            isAlreadyInVault
                              ? "bg-emerald-950/20 border-emerald-800/40 opacity-75 cursor-default"
                              : isSelected
                              ? "bg-purple-950/40 border-purple-500 ring-1 ring-purple-500/50 shadow-md shadow-purple-900/30"
                              : "bg-muted/30 border-border/60 hover:border-purple-500/40 hover:bg-muted/50"
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={cn(
                                "w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-all",
                                isAlreadyInVault
                                  ? "bg-emerald-600 border-emerald-500 text-white"
                                  : isSelected
                                  ? "bg-purple-600 border-purple-500 text-white"
                                  : "border-border/80 bg-background/50"
                              )}
                            >
                              {(isAlreadyInVault || isSelected) && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>

                            <div className="w-10 h-14 rounded-lg overflow-hidden bg-card shrink-0 border border-border/40">
                              <PosterImage
                                src={result.poster_path}
                                alt={result.name}
                                aspectRatio="poster"
                                size="w92"
                              />
                            </div>

                            <div className="min-w-0">
                              <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                                {result.name}
                              </h4>
                              <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                                {result.overview || "Official TMDB Franchise Collection"}
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                            {isAlreadyInVault ? (
                              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-1 rounded-md border border-emerald-700/40 flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                Added
                              </span>
                            ) : (
                              <Button
                                size="sm"
                                variant={isSelected ? "default" : "outline"}
                                onClick={() => handleImportSingle(result.id, result.name)}
                                className={cn(
                                  "text-xs h-8 px-2.5 rounded-lg",
                                  isSelected
                                    ? "bg-purple-600 hover:bg-purple-500 text-white"
                                    : "border-border hover:border-purple-500 text-foreground"
                                )}
                              >
                                <Plus className="w-3.5 h-3.5 mr-1" />
                                <span>Add</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sticky Bottom Action Bar for Multi-Selection */}
          <div className="p-4 border-t border-border/40 bg-card/90 backdrop-blur-md flex items-center justify-between gap-4 shrink-0">
            <div className="text-xs">
              {selectedCollectionIds.size > 0 ? (
                <span className="font-semibold text-purple-300">
                  {selectedCollectionIds.size} universe{selectedCollectionIds.size === 1 ? "" : "s"} selected
                </span>
              ) : (
                <span className="text-muted-foreground">
                  Click any universe to select, or click Add
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {selectedCollectionIds.size > 0 && (
                <Button
                  size="sm"
                  onClick={handleBatchImport}
                  disabled={isBatchImporting}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-lg shadow-purple-600/30"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  <span>
                    {isBatchImporting
                      ? "Importing..."
                      : `Add Selected (${selectedCollectionIds.size})`}
                  </span>
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleModalOpenChange(false)}
                className="text-xs h-9 px-3.5 rounded-xl border-border hover:bg-muted"
              >
                Done / Close (✕)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
