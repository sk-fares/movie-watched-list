"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clapperboard,
  Film,
  Sparkles,
  ArrowRight,
  Play,
  Tv,
  CheckCircle2,
  Clock,
  Star,
  Shuffle,
  Compass,
  Layers,
  BarChart3,
  Shield,
  Zap,
  ChevronDown,
  ChevronRight,
  Flame,
  Bookmark,
  Eye,
  Check,
  RotateCw,
  Search,
  SlidersHorizontal,
  FolderTree,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Mock data for interactive hero & franchise preview
const sampleFranchiseEntries = [
  {
    id: "fe-1",
    seq: 1,
    title: "Iron Man",
    year: "2008",
    rating: 7.9,
    runtime: "2h 6m",
    watched: true,
    tagline: "Heroes aren't born. They're built.",
    backdrop: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "fe-2",
    seq: 2,
    title: "The Incredible Hulk",
    year: "2008",
    rating: 6.7,
    runtime: "1h 52m",
    watched: true,
    tagline: "This time it's personal.",
    backdrop: "https://images.unsplash.com/photo-1568832359672-e36cf5d74f54?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "fe-3",
    seq: 3,
    title: "Iron Man 2",
    year: "2010",
    rating: 7.0,
    runtime: "2h 4m",
    watched: true,
    tagline: "It's not about the armor.",
    backdrop: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "fe-4",
    seq: 4,
    title: "Thor",
    year: "2011",
    rating: 7.0,
    runtime: "1h 55m",
    watched: false,
    isCurrent: true,
    tagline: "Courage is immortal.",
    backdrop: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "fe-5",
    seq: 5,
    title: "Captain America: The First Avenger",
    year: "2011",
    rating: 6.9,
    runtime: "2h 4m",
    watched: false,
    tagline: "When patriots become heroes.",
    backdrop: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "fe-6",
    seq: 6,
    title: "The Avengers",
    year: "2012",
    rating: 8.0,
    runtime: "2h 23m",
    watched: false,
    tagline: "Some assembly required.",
    backdrop: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
  },
];

// Mock items for Random Picker Roulette
const rouletteItems = [
  {
    title: "Dune: Part Two",
    year: "2024",
    genre: "Sci-Fi / Adventure",
    rating: 8.6,
    runtime: "2h 46m",
    color: "from-amber-600 to-orange-800",
    overview: "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.",
  },
  {
    title: "Oppenheimer",
    year: "2023",
    genre: "Biography / Drama",
    rating: 8.9,
    runtime: "3h 0m",
    color: "from-orange-600 to-red-900",
    overview: "The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.",
  },
  {
    title: "Spider-Man: Across the Spider-Verse",
    year: "2023",
    genre: "Animation / Action",
    rating: 8.7,
    runtime: "2h 20m",
    color: "from-purple-600 to-pink-700",
    overview: "Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People charged with protecting its existence.",
  },
  {
    title: "Interstellar",
    year: "2014",
    genre: "Sci-Fi / Mystery",
    rating: 8.7,
    runtime: "2h 49m",
    color: "from-blue-600 to-indigo-900",
    overview: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
  },
  {
    title: "Blade Runner 2049",
    year: "2017",
    genre: "Sci-Fi / Noir",
    rating: 8.0,
    runtime: "2h 44m",
    color: "from-cyan-600 to-blue-900",
    overview: "Young Blade Runner K's discovery of a long-buried secret leads him to track down former Blade Runner Rick Deckard.",
  },
  {
    title: "The Dark Knight",
    year: "2008",
    genre: "Action / Crime",
    rating: 9.0,
    runtime: "2h 32m",
    color: "from-zinc-600 to-zinc-900",
    overview: "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest tests.",
  },
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Franchise interactive preview state
  const [timelineMode, setTimelineMode] = useState<"chrono" | "release">("chrono");
  const [franchiseList, setFranchiseList] = useState(sampleFranchiseEntries);

  const toggleWatched = (id: string) => {
    setFranchiseList((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, watched: !item.watched } : item
      )
    );
  };

  const watchedCount = franchiseList.filter((item) => item.watched).length;
  const progressPercent = Math.round((watchedCount / franchiseList.length) * 100);

  // Random Pick Roulette state
  const [selectedPick, setSelectedPick] = useState(rouletteItems[0]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinIndex, setSpinIndex] = useState(0);

  const handleSpinRoulette = () => {
    if (isSpinning) return;
    setIsSpinning(true);

    let counter = 0;
    const totalSpins = 16;
    const interval = setInterval(() => {
      counter++;
      const nextIdx = Math.floor(Math.random() * rouletteItems.length);
      setSpinIndex(nextIdx);

      if (counter >= totalSpins) {
        clearInterval(interval);
        setSelectedPick(rouletteItems[nextIdx]);
        setIsSpinning(false);
      }
    }, 100);
  };

  // FAQ Accordion state
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: "How does the Franchise & Sequential tracking system work?",
      a: "Movie Watched List connects related movies and TV series into curated cinematic universes (like Marvel, Star Wars, or Tolkien). You can switch between strictly in-universe Chronological order or theatrical Release order. Every entry tracks its sequence number, completion date, and automatically highlights your next film.",
    },
    {
      q: "What makes Movie Watched List different from standard watchlist apps?",
      a: "Most watchlist tools give you a giant, unorganized pile of titles. Movie Watched List organizes movies and shows by chronological storylines, franchise universes, priority tiers, and includes an animated Random Picker roulette to eliminate decision paralysis.",
    },
    {
      q: "Is Movie Watched List free to use?",
      a: "Yes! 100% free with unlimited watchlist items, full franchise collections, rating histories, and analytics. You can sign in with your Google account or standard email.",
    },
    {
      q: "Where does Movie Watched List get movie metadata and posters?",
      a: "All metadata, 4K posters, cast details, ratings, and trailers are powered by The Movie Database (TMDB) API, ensuring accurate, real-time data for over 1,000,000 titles worldwide.",
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white selection:bg-purple-600 selection:text-white font-sans antialiased overflow-x-hidden">
      {/* ─── Ambient Glow Gradients ───────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-gradient-to-b from-purple-700/25 via-indigo-800/15 to-transparent rounded-full blur-[160px]" />
        <div className="absolute top-[35%] -left-48 w-[600px] h-[600px] bg-purple-900/15 rounded-full blur-[140px]" />
        <div className="absolute top-[60%] -right-48 w-[600px] h-[600px] bg-blue-900/15 rounded-full blur-[140px]" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* ─── Navigation Header ─────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/75 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-600/30 group-hover:scale-105 transition-transform">
              <Clapperboard className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-purple-100 to-purple-300 bg-clip-text text-transparent">
                Movie Watched List
              </span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              PRO
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-300">
            <a href="#features" className="hover:text-purple-400 transition-colors">
              Features
            </a>
            <a href="#franchises" className="hover:text-purple-400 transition-colors">
              Franchise Engine
            </a>
            <a href="#roulette" className="hover:text-purple-400 transition-colors">
              Random Picker
            </a>
            <a href="#faq" className="hover:text-purple-400 transition-colors">
              FAQ
            </a>
          </nav>

          {/* Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            <Link href="/login">
              <Button
                variant="ghost"
                className="text-zinc-300 hover:text-white hover:bg-zinc-800/80 rounded-xl px-4 text-sm"
              >
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl px-5 py-2 shadow-lg shadow-purple-600/30 transition-all hover:shadow-purple-600/50">
                Get Started
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
            aria-label="Toggle menu"
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-white/10 bg-zinc-950/95 backdrop-blur-2xl px-6 py-4 space-y-3">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm text-zinc-300 hover:text-purple-400"
            >
              Features
            </a>
            <a
              href="#franchises"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm text-zinc-300 hover:text-purple-400"
            >
              Franchise Engine
            </a>
            <a
              href="#roulette"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm text-zinc-300 hover:text-purple-400"
            >
              Random Picker
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm text-zinc-300 hover:text-purple-400"
            >
              FAQ
            </a>
            <div className="pt-3 border-t border-zinc-800 flex flex-col gap-2">
              <Link href="/login" className="w-full">
                <Button variant="outline" className="w-full justify-center">
                  Sign In
                </Button>
              </Link>
              <Link href="/register" className="w-full">
                <Button className="w-full justify-center bg-purple-600 hover:bg-purple-500 text-white">
                  Get Started Free
                </Button>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ─── Hero Section ─────────────────────────────────────────── */}
      <section className="relative z-10 pt-16 sm:pt-24 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Glowing Badge */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs sm:text-sm font-medium backdrop-blur-md mb-6 shadow-inner"
        >
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span>The Next-Generation Cinematic Watchlist</span>
          <span className="hidden sm:inline text-purple-400/50">•</span>
          <span className="hidden sm:inline text-purple-200">Chronological Timelines Built-In</span>
        </motion.div>

        {/* Hero Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-5xl mx-auto leading-[1.1]"
        >
          Master Your Movie Universe.{" "}
          <span className="bg-gradient-to-r from-purple-400 via-violet-300 to-indigo-400 bg-clip-text text-transparent">
            In Perfect Sequence.
          </span>
        </motion.h1>

        {/* Hero Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6 text-base sm:text-lg lg:text-xl text-zinc-400 max-w-3xl mx-auto leading-relaxed"
        >
          Never wonder what comes next. Track movies, TV shows, and entire cinematic universes in
          exact chronological or release order. Spin the wheel on indecisive movie nights, and
          visualize your true watch history.
        </motion.p>

        {/* Hero CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto"
        >
          <Link href="/register" className="w-full sm:w-auto">
            <Button
              size="lg"
              className="w-full sm:w-auto h-13 px-8 bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-xl shadow-purple-600/30 transition-all hover:scale-105"
            >
              Start Your Free Vault
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
          <Link href="/login" className="w-full sm:w-auto">
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto h-13 px-7 bg-zinc-900/80 hover:bg-zinc-800 border-zinc-700 text-zinc-200 font-semibold rounded-xl backdrop-blur-md"
            >
              <Eye className="w-4 h-4 mr-2 text-purple-400" />
              Sign In to Vault
            </Button>
          </Link>
        </motion.div>

        {/* Trust Points */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs sm:text-sm text-zinc-400"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-purple-400" />
            <span>1,000,000+ TMDB Titles</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-purple-400" />
            <span>500+ Curated Franchises</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-purple-400" />
            <span>100% Free Forever</span>
          </div>
        </motion.div>
      </section>

      {/* ─── Interactive Franchise Engine Showcase ──────────────────── */}
      <section id="franchises" className="relative z-10 py-16 sm:py-24 border-t border-zinc-900 bg-zinc-950/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-3">
              <FolderTree className="w-3.5 h-3.5" />
              The Core Feature
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              The Chronological Franchise Engine
            </h2>
            <p className="mt-3 text-zinc-400 text-sm sm:text-base">
              Try clicking the cards below! Toggle movies as watched, switch order modes, and watch
              the progress bar adapt instantly.
            </p>
          </div>

          {/* Interactive Franchise Preview Card */}
          <div className="rounded-2xl border border-white/10 bg-zinc-900/90 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl shadow-purple-950/40 max-w-5xl mx-auto">
            {/* Header with Title and Mode Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-purple-500 animate-pulse" />
                  <span className="text-xs uppercase font-bold tracking-wider text-purple-400">
                    Live Interactive Demo
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mt-1">
                  Marvel Cinematic Universe: Phase One
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                  6-Part Sequential Saga • Official Timeline
                </p>
              </div>

              {/* Progress and Toggle */}
              <div className="flex flex-col sm:items-end gap-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400">Sequence Order:</span>
                  <div className="inline-flex rounded-lg bg-zinc-950 p-1 border border-zinc-800">
                    <button
                      onClick={() => setTimelineMode("chrono")}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                        timelineMode === "chrono"
                          ? "bg-purple-600 text-white shadow-sm"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Chronological
                    </button>
                    <button
                      onClick={() => setTimelineMode("release")}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                        timelineMode === "release"
                          ? "bg-purple-600 text-white shadow-sm"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Release Date
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="flex items-center gap-3 w-full sm:w-56">
                  <div className="h-2 flex-1 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                  <span className="text-xs font-bold text-purple-300 min-w-[42px] text-right">
                    {progressPercent}%
                  </span>
                </div>
              </div>
            </div>

            {/* Movie Sequence Grid */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {franchiseList.map((movie, index) => (
                <motion.div
                  key={movie.id}
                  whileHover={{ y: -3 }}
                  onClick={() => toggleWatched(movie.id)}
                  className={`cursor-pointer rounded-xl p-4 border transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${
                    movie.watched
                      ? "bg-purple-950/20 border-purple-500/40 shadow-lg shadow-purple-950/30"
                      : movie.isCurrent
                      ? "bg-zinc-800/80 border-purple-400 shadow-md ring-1 ring-purple-500/50"
                      : "bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-300">
                        #{timelineMode === "chrono" ? movie.seq : index + 1}
                      </span>
                      {movie.isCurrent && !movie.watched && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-300 border border-purple-400/40 animate-pulse">
                          Next Up
                        </span>
                      )}
                    </div>

                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                        movie.watched
                          ? "bg-purple-600 text-white"
                          : "border border-zinc-600 text-transparent hover:border-purple-400"
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  <div className="my-3">
                    <h4 className="text-base font-bold text-white line-clamp-1">
                      {movie.title}
                    </h4>
                    <p className="text-xs text-zinc-400 italic line-clamp-1 mt-0.5">
                      &quot;{movie.tagline}&quot;
                    </p>
                  </div>

                  <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-400">
                    <div className="flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                      <span className="font-semibold text-zinc-200">{movie.rating}</span>
                    </div>
                    <span>{movie.year}</span>
                    <span>{movie.runtime}</span>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-purple-400" />
                {watchedCount} of {franchiseList.length} movies watched in sequence
              </span>
              <span className="text-purple-400 font-medium">
                💡 Tip: Click any movie to mark watched/unwatched
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Interactive Random Roulette Showcase ──────────────────── */}
      <section id="roulette" className="relative z-10 py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold uppercase tracking-wider mb-3">
              <Shuffle className="w-3.5 h-3.5" />
              Decision Paralysis Solved
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              The Smart Random Watch Roulette
            </h2>
            <p className="mt-3 text-zinc-400 text-sm sm:text-base">
              Can&apos;t agree on what to watch? Spin your personal watchlist and let the card-flip roulette decide your night.
            </p>
          </div>

          <div className="max-w-3xl mx-auto rounded-2xl border border-white/10 bg-zinc-900/90 backdrop-blur-2xl p-6 sm:p-10 shadow-2xl shadow-purple-950/50">
            {/* Animated Card Spin / Flip display */}
            <div className="relative min-h-[220px] rounded-xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 border border-zinc-800 p-6 sm:p-8 flex flex-col justify-between overflow-hidden">
              <div
                className={`absolute inset-0 opacity-15 bg-gradient-to-r ${
                  rouletteItems[spinIndex].color
                } transition-all duration-300`}
              />

              <AnimatePresence mode="wait">
                <motion.div
                  key={spinIndex}
                  initial={{ rotateY: 90, opacity: 0, scale: 0.95 }}
                  animate={{ rotateY: 0, opacity: 1, scale: 1 }}
                  exit={{ rotateY: -90, opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="relative z-10"
                >
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <span className="text-xs uppercase tracking-wider font-bold text-purple-400 bg-purple-500/10 border border-purple-500/30 px-2.5 py-1 rounded-md">
                      {rouletteItems[spinIndex].genre}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-yellow-400 font-bold">
                      <Star className="w-4 h-4 fill-yellow-400" />
                      <span>{rouletteItems[spinIndex].rating} / 10</span>
                    </div>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
                    {rouletteItems[spinIndex].title}
                  </h3>

                  <p className="text-sm text-zinc-300 mt-2 line-clamp-2 leading-relaxed">
                    {rouletteItems[spinIndex].overview}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-zinc-400 mt-4 pt-3 border-t border-zinc-800/80">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-purple-400" />
                      {rouletteItems[spinIndex].runtime}
                    </span>
                    <span>Released: {rouletteItems[spinIndex].year}</span>
                    <span className="text-green-400 font-medium">✓ Unwatched in your Vault</span>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Spinner Button */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-zinc-400 text-center sm:text-left">
                <span>Filter by: </span>
                <span className="font-semibold text-zinc-200">Sci-Fi, Action, Drama (Watchlist)</span>
              </div>

              <Button
                onClick={handleSpinRoulette}
                disabled={isSpinning}
                className="w-full sm:w-auto px-6 h-12 bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 group transition-all"
              >
                <RotateCw
                  className={`w-4 h-4 ${isSpinning ? "animate-spin text-purple-200" : "group-hover:rotate-180 transition-transform duration-500"}`}
                />
                <span>{isSpinning ? "Spinning Reel..." : "Spin Random Pick"}</span>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Core Features Grid ───────────────────────────────────── */}
      <section id="features" className="relative z-10 py-16 sm:py-24 border-t border-zinc-900 bg-zinc-950/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold uppercase tracking-wider mb-3">
              <Zap className="w-3.5 h-3.5" />
              Engineered for Cinephiles
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Everything Your Watchlist Was Missing
            </h2>
            <p className="mt-3 text-zinc-400 text-sm sm:text-base">
              Purpose-built tools designed to make discovering, organizing, and tracking cinematic
              experiences effortless.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 sm:p-8 hover:border-purple-500/40 transition-all hover:shadow-xl hover:shadow-purple-950/20 group">
              <div className="w-12 h-12 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center mb-5 text-purple-400 group-hover:scale-110 transition-transform">
                <FolderTree className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Sequential Franchise Timelines</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Organize convoluted movie sagas in chronological or release order. Automatic sequence
                numbering, completion badges, and spoiler-free progress tracking.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 sm:p-8 hover:border-purple-500/40 transition-all hover:shadow-xl hover:shadow-purple-950/20 group">
              <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mb-5 text-indigo-400 group-hover:scale-110 transition-transform">
                <Shuffle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Animated Decision Roulette</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Stuck on movie night? The card-flipping roulette randomly selects unwatched movies
                from your priority list with genre and runtime filters.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 sm:p-8 hover:border-purple-500/40 transition-all hover:shadow-xl hover:shadow-purple-950/20 group">
              <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mb-5 text-blue-400 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Detailed Watch Analytics</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Track cumulative watch time in days and hours, genre distribution charts, chronological
                milestones, and custom star ratings with private reviews.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 sm:p-8 hover:border-purple-500/40 transition-all hover:shadow-xl hover:shadow-purple-950/20 group">
              <div className="w-12 h-12 rounded-xl bg-pink-600/20 border border-pink-500/30 flex items-center justify-center mb-5 text-pink-400 group-hover:scale-110 transition-transform">
                <Tv className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Granular TV & Series Tracking</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Track full series, individual seasons, or specific episodes. Movie Watched List keeps tabs on
                where you left off with one-click next episode markers.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 sm:p-8 hover:border-purple-500/40 transition-all hover:shadow-xl hover:shadow-purple-950/20 group">
              <div className="w-12 h-12 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center mb-5 text-amber-400 group-hover:scale-110 transition-transform">
                <Film className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Full TMDB Database Integration</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                High-definition 4K backdrops, official trailers, full cast dossiers, release calendars,
                and TMDB audience ratings updated constantly.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 sm:p-8 hover:border-purple-500/40 transition-all hover:shadow-xl hover:shadow-purple-950/20 group">
              <div className="w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center mb-5 text-emerald-400 group-hover:scale-110 transition-transform">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Seamless Multi-Device Sync</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Your database is backed up and synchronized across phone, tablet, and PC. Sign in with
                one click using Google or secure credentials.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Comparison Table ─────────────────────────────────────── */}
      <section className="relative z-10 py-16 sm:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Why Cinephiles Switch to Movie Watched List
            </h2>
            <p className="mt-2 text-zinc-400 text-sm">
              See how Movie Watched List compares to traditional tracking apps and spreadsheets.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-900/80 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950/80 text-zinc-400">
                    <th className="py-4 px-6 font-semibold">Capability</th>
                    <th className="py-4 px-6 font-bold text-purple-400">Movie Watched List</th>
                    <th className="py-4 px-6 font-medium text-zinc-500">Generic Watchlist Apps</th>
                    <th className="py-4 px-6 font-medium text-zinc-500">Spreadsheets / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                  <tr>
                    <td className="py-4 px-6 font-medium text-white">Chronological Franchise Ordering</td>
                    <td className="py-4 px-6 text-purple-400 font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-purple-400" /> Native & Curated
                    </td>
                    <td className="py-4 px-6 text-zinc-500">✕ Flat Lists Only</td>
                    <td className="py-4 px-6 text-zinc-500">Manual Entry</td>
                  </tr>
                  <tr>
                    <td className="py-4 px-6 font-medium text-white">Animated Decision Roulette</td>
                    <td className="py-4 px-6 text-purple-400 font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-purple-400" /> Yes, with Filters
                    </td>
                    <td className="py-4 px-6 text-zinc-500">✕ None</td>
                    <td className="py-4 px-6 text-zinc-500">✕ None</td>
                  </tr>
                  <tr>
                    <td className="py-4 px-6 font-medium text-white">Automated TMDB Metadata</td>
                    <td className="py-4 px-6 text-purple-400 font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-purple-400" /> Real-time 4K
                    </td>
                    <td className="py-4 px-6 text-zinc-400">Partial</td>
                    <td className="py-4 px-6 text-zinc-500">✕ None</td>
                  </tr>
                  <tr>
                    <td className="py-4 px-6 font-medium text-white">Series & Season Granularity</td>
                    <td className="py-4 px-6 text-purple-400 font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-purple-400" /> Episode Level
                    </td>
                    <td className="py-4 px-6 text-zinc-400">Series Only</td>
                    <td className="py-4 px-6 text-zinc-500">Manual</td>
                  </tr>
                  <tr>
                    <td className="py-4 px-6 font-medium text-white">Ad-Free Dark Cinematic UI</td>
                    <td className="py-4 px-6 text-purple-400 font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-purple-400" /> 100% Free & Clean
                    </td>
                    <td className="py-4 px-6 text-zinc-500">Ad Heavy / Subscriptions</td>
                    <td className="py-4 px-6 text-zinc-500">Boring Grid</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ Section ─────────────────────────────────────────── */}
      <section id="faq" className="relative z-10 py-16 sm:py-24 border-t border-zinc-900 bg-zinc-950/60">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="mt-2 text-zinc-400 text-sm">
              Everything you need to know about Movie Watched List.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-white/10 bg-zinc-900/70 overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full py-4 px-6 text-left font-semibold text-white flex items-center justify-between gap-4 hover:text-purple-300 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-purple-400 transition-transform duration-200 shrink-0 ${
                      openFaq === idx ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {openFaq === idx && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="px-6 pb-4 pt-1 text-sm text-zinc-400 leading-relaxed border-t border-zinc-800/60"
                  >
                    {faq.a}
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ───────────────────────────────────────────── */}
      <section className="relative z-10 py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="rounded-3xl border border-purple-500/30 bg-gradient-to-b from-purple-950/40 via-zinc-900/80 to-zinc-950 p-8 sm:p-14 relative overflow-hidden shadow-2xl shadow-purple-950/60">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center mx-auto mb-6 text-purple-300 shadow-lg shadow-purple-600/30">
              <Clapperboard className="w-6 h-6" />
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Begin Your Cinematic Odyssey Today
            </h2>

            <p className="mt-3 text-zinc-400 text-sm sm:text-base leading-relaxed">
              Create your account in 30 seconds. Track your watchlist, conquer franchises in order,
              and never ask &quot;what should we watch?&quot; again.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto h-12 px-8 bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-xl shadow-purple-600/30 hover:scale-105 transition-all"
                >
                  Create Your Free Vault
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link href="/login" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto h-12 px-7 bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white rounded-xl"
                >
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-zinc-900 bg-black py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-md shadow-purple-600/30">
              <Clapperboard className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-base font-bold bg-gradient-to-r from-white via-purple-100 to-purple-300 bg-clip-text text-transparent">
              Movie Watched List
            </span>
            <span className="text-xs text-zinc-500">© {new Date().getFullYear()}</span>
          </div>

          <div className="flex items-center gap-6 text-xs text-zinc-400">
            <Link href="/login" className="hover:text-purple-400 transition-colors">
              Sign In
            </Link>
            <Link href="/register" className="hover:text-purple-400 transition-colors">
              Create Account
            </Link>
            <Link href="/forgot-password" className="hover:text-purple-400 transition-colors">
              Reset Password
            </Link>
          </div>

          <p className="text-xs text-zinc-500 text-center md:text-right max-w-sm">
            Powered by The Movie Database (TMDB). This product uses the TMDB API but is not
            endorsed or certified by TMDB.
          </p>
        </div>
      </footer>
    </div>
  );
}
