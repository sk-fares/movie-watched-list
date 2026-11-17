"use client";

import React, { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  User,
  Settings,
  Download,
  Palette,
  Shield,
  Bell,
  Film,
  Tv,
  Sparkles,
  Check,
  Save,
  LogOut,
  Moon,
  Sun,
  Laptop,
  FileJson,
  FileSpreadsheet,
  AlertTriangle,
  Info,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, formatDate } from "@/lib/utils";

const ALL_GENRES = [
  "Action",
  "Adventure",
  "Animation",
  "Comedy",
  "Crime",
  "Documentary",
  "Drama",
  "Family",
  "Fantasy",
  "History",
  "Horror",
  "Music",
  "Mystery",
  "Romance",
  "Sci-Fi",
  "Thriller",
  "War",
  "Western",
];

const THEME_OPTIONS = [
  {
    id: "dark",
    name: "Dark Cinematic",
    description: "Deep obsidian backdrop with glowing purple neon accents (Default)",
    previewClass: "bg-zinc-950 border-purple-600 text-purple-400",
  },
  {
    id: "amoled",
    name: "AMOLED Midnight",
    description: "True pure black #000000 with violet highlights for OLED displays",
    previewClass: "bg-black border-violet-500 text-violet-300",
  },
  {
    id: "indigo",
    name: "Cyberpunk Indigo",
    description: "Deep space blue and electric indigo high-contrast styling",
    previewClass: "bg-slate-950 border-indigo-500 text-indigo-400",
  },
];

export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession();
  const { theme, setTheme } = useTheme();

  // Profile Form States
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);

  // Preference States
  const [defaultContentType, setDefaultContentType] = useState<string>("all");
  const [favoriteGenres, setFavoriteGenres] = useState<string[]>([]);
  const [enableNotifications, setEnableNotifications] = useState<boolean>(true);
  const [isSavingPreferences, setIsSavingPreferences] = useState<boolean>(false);

  // Appearance State
  const [selectedThemeStyle, setSelectedThemeStyle] = useState<string>("dark");

  // Export States
  const [isExportingJson, setIsExportingJson] = useState<boolean>(false);
  const [isExportingCsv, setIsExportingCsv] = useState<boolean>(false);

  // Load User Data & Preferences on Mount
  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || "");
      setEmail(session.user.email || "");
    }

    const loadPreferences = async () => {
      try {
        const res = await fetch("/api/user/preferences");
        if (res.ok) {
          const json = await res.json();
          if (json.user) {
            if (json.user.name) setName(json.user.name);
            if (json.user.email) setEmail(json.user.email);
            if (json.user.preferences) {
              const pref = json.user.preferences;
              if (pref.defaultContentType) setDefaultContentType(pref.defaultContentType);
              if (pref.theme) setSelectedThemeStyle(pref.theme);
              if (pref.enableNotifications !== undefined) {
                setEnableNotifications(pref.enableNotifications);
              }
              if (pref.favoriteGenres) {
                try {
                  const parsed = JSON.parse(pref.favoriteGenres);
                  if (Array.isArray(parsed)) setFavoriteGenres(parsed);
                } catch {
                  // Ignore parse error
                }
              }
            }
          }
        }
      } catch (err) {
        console.error("Preferences load error:", err);
      }
    };

    loadPreferences();
  }, [session]);

  // Handle Save Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    setIsSavingProfile(true);
    try {
      const res = await fetch("/api/user/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!res.ok) throw new Error("Failed to update profile");

      toast.success("Profile updated successfully!");
      if (updateSession) {
        updateSession({ name: name.trim() });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Toggle Favorite Genre Pill
  const toggleGenre = (genre: string) => {
    setFavoriteGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  // Handle Save Preferences
  const handleSavePreferences = async () => {
    setIsSavingPreferences(true);
    try {
      const res = await fetch("/api/user/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultContentType,
          favoriteGenres,
          enableNotifications,
          theme: selectedThemeStyle,
        }),
      });

      if (!res.ok) throw new Error("Failed to save preferences");

      toast.success("Vault preferences saved!", { icon: "⚙️" });
    } catch (err: any) {
      toast.error(err.message || "Failed to save preferences");
    } finally {
      setIsSavingPreferences(false);
    }
  };

  // Trigger Data Export Download
  const handleTriggerExport = async (format: "json" | "csv", type: string = "all") => {
    if (format === "json") setIsExportingJson(true);
    else setIsExportingCsv(true);

    const toastId = toast.loading(`Generating ${format.toUpperCase()} export...`);

    try {
      const response = await fetch(`/api/export?format=${format}&type=${type}`);
      if (!response.ok) throw new Error("Export request failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reelvault-export-${new Date().toISOString().split("T")[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`${format.toUpperCase()} export downloaded!`, { id: toastId, icon: "📥" });
    } catch (err: any) {
      toast.error(err.message || "Failed to export data", { id: toastId });
    } finally {
      if (format === "json") setIsExportingJson(false);
      else setIsExportingCsv(false);
    }
  };

  const userInitials =
    name
      ? name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : "RV";

  return (
    <div className="relative min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      {/* Background glow */}
      <div className="absolute top-10 left-1/3 w-[500px] h-[300px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-950/60 border border-purple-800/50 text-purple-300 text-xs font-semibold mb-3">
          <Settings className="w-3.5 h-3.5 text-purple-400" />
          <span>System & Account Configuration</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2">
          Settings & <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-violet-300 to-indigo-400">Vault Preferences</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your account profile, personalized discovery preferences, cinematic appearance, and offline data backups.
        </p>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-card/70 border border-border/50 p-1 rounded-xl grid grid-cols-2 sm:grid-cols-4 w-full">
          <TabsTrigger value="profile" className="text-xs sm:text-sm">
            <User className="w-3.5 h-3.5 mr-1.5" />
            <span>Profile</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="text-xs sm:text-sm">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            <span>Preferences</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="text-xs sm:text-sm">
            <Palette className="w-3.5 h-3.5 mr-1.5" />
            <span>Appearance</span>
          </TabsTrigger>
          <TabsTrigger value="export" className="text-xs sm:text-sm">
            <Download className="w-3.5 h-3.5 mr-1.5" />
            <span>Export Data</span>
          </TabsTrigger>
        </TabsList>

        {/* ─── TAB 1: Profile Settings ──────────────────────────────────────── */}
        <TabsContent value="profile">
          <Card className="bg-card/80 border-border/60 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-white">Profile Information</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Your public vault identity and sign-in credentials.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-6 max-w-xl">
                {/* Avatar Preview */}
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16 border-2 border-purple-500/50">
                    <AvatarImage src={session?.user?.image || undefined} alt={name} />
                    <AvatarFallback className="bg-purple-950 text-purple-200 font-bold text-lg">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="text-sm font-bold text-white">{name || "Vault Curator"}</h4>
                    <p className="text-xs text-muted-foreground">{email}</p>
                    <Badge variant="secondary" className="text-[10px] mt-1 bg-purple-950/60 text-purple-300">
                      Active Member
                    </Badge>
                  </div>
                </div>

                {/* Name Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Display Name</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="bg-muted/40 border-border/60 text-sm"
                  />
                </div>

                {/* Email (Read Only) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Email Address</label>
                  <Input
                    value={email}
                    disabled
                    className="bg-muted/20 border-border/40 text-sm text-muted-foreground cursor-not-allowed"
                  />
                  <span className="text-[11px] text-muted-foreground">
                    Email cannot be changed directly as it is bound to your account login.
                  </span>
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={isSavingProfile}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs"
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  <span>{isSavingProfile ? "Saving Profile..." : "Save Changes"}</span>
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 2: Vault Preferences ─────────────────────────────────────── */}
        <TabsContent value="preferences">
          <Card className="bg-card/80 border-border/60 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-white">Discovery & Watch Preferences</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Fine-tune algorithmic recommendations, default view filters, and genre prioritization.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 max-w-2xl">
              {/* Default Content Type */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">
                  Default View Filter
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "all", label: "All Content", icon: Sparkles },
                    { id: "movie", label: "Movies Only", icon: Film },
                    { id: "tvshow", label: "Series Only", icon: Tv },
                  ].map((option) => {
                    const Icon = option.icon;
                    const isSelected = defaultContentType === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setDefaultContentType(option.id)}
                        className={cn(
                          "flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all",
                          isSelected
                            ? "bg-purple-900/60 border-purple-500 text-purple-200 shadow-md shadow-purple-600/30"
                            : "bg-muted/30 border-border/50 text-muted-foreground hover:text-white hover:border-purple-500/40"
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Favorite Genres Pills */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Favorite Genres ({favoriteGenres.length} selected)
                  </label>
                  {favoriteGenres.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setFavoriteGenres([])}
                      className="text-[11px] text-purple-400 hover:underline"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {ALL_GENRES.map((genre) => {
                    const isSelected = favoriteGenres.includes(genre);
                    return (
                      <button
                        key={genre}
                        type="button"
                        onClick={() => toggleGenre(genre)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 border",
                          isSelected
                            ? "bg-purple-600 text-white border-purple-400 shadow-sm shadow-purple-600/40"
                            : "bg-muted/40 border-border/50 text-muted-foreground hover:border-purple-500/50 hover:text-foreground"
                        )}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                        <span>{genre}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notifications Toggle */}
              <div className="flex items-center justify-between pt-4 border-t border-border/50">
                <div className="space-y-0.5">
                  <span className="text-sm font-semibold text-white flex items-center gap-2">
                    <Bell className="w-4 h-4 text-purple-400" />
                    <span>Watchlist Reminders & Alerts</span>
                  </span>
                  <p className="text-xs text-muted-foreground">
                    Receive notifications when franchise sequels or upcoming movies in your watchlist premiere.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={enableNotifications}
                  onChange={(e) => setEnableNotifications(e.target.checked)}
                  className="h-5 w-5 accent-purple-600 rounded cursor-pointer"
                />
              </div>

              {/* Save Preferences Button */}
              <Button
                onClick={handleSavePreferences}
                disabled={isSavingPreferences}
                className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs"
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                <span>{isSavingPreferences ? "Saving..." : "Save Preferences"}</span>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 3: Appearance & Theme ────────────────────────────────────── */}
        <TabsContent value="appearance">
          <Card className="bg-card/80 border-border/60 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-white">Cinematic Atmosphere</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Customize the visual tone and contrast of ReelVault's dark cinematic experience.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {THEME_OPTIONS.map((themeOpt) => {
                  const isSelected = selectedThemeStyle === themeOpt.id;
                  return (
                    <div
                      key={themeOpt.id}
                      onClick={() => {
                        setSelectedThemeStyle(themeOpt.id);
                        toast.success(`Theme set to ${themeOpt.name}`, { duration: 1500 });
                      }}
                      className={cn(
                        "cursor-pointer p-4 rounded-2xl border-2 transition-all relative space-y-3 group",
                        isSelected
                          ? "border-purple-500 bg-purple-950/30 shadow-lg shadow-purple-600/20"
                          : "border-border/60 bg-card/60 hover:border-purple-500/40"
                      )}
                    >
                      {/* Theme Palette Preview Block */}
                      <div
                        className={cn(
                          "h-20 rounded-xl border flex items-center justify-center font-mono text-xs font-bold",
                          themeOpt.previewClass
                        )}
                      >
                        {themeOpt.name}
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center justify-between">
                          <span>{themeOpt.name}</span>
                          {isSelected && <Check className="w-4 h-4 text-purple-400" />}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {themeOpt.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 4: Export Data ───────────────────────────────────────────── */}
        <TabsContent value="export">
          <Card className="bg-card/80 border-border/60 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-white">Vault Data Portability</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Download and backup your entire watch history, franchise progressions, and watchlists.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full JSON Export */}
                <div className="p-5 rounded-2xl border border-border/60 bg-muted/20 space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-800/40 flex items-center justify-center text-purple-300 mb-3">
                      <FileJson className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold text-white">Full Vault Backup (JSON)</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Includes complete records of your watchlist items, watched chronology, ratings, personal reviews, and franchise timelines.
                    </p>
                  </div>
                  <Button
                    onClick={() => handleTriggerExport("json", "all")}
                    disabled={isExportingJson}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs h-9 mt-4"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    <span>{isExportingJson ? "Generating..." : "Download Complete JSON"}</span>
                  </Button>
                </div>

                {/* CSV Spreadsheets */}
                <div className="p-5 rounded-2xl border border-border/60 bg-muted/20 space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-800/40 flex items-center justify-center text-purple-300 mb-3">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold text-white">Watch History Spreadsheet (CSV)</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Export your chronological watch log as an Excel/Sheets-compatible CSV table for personal analytics and data tracking.
                    </p>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      onClick={() => handleTriggerExport("csv", "watched")}
                      disabled={isExportingCsv}
                      className="flex-1 text-xs h-9 border-border hover:border-purple-500"
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      <span>Watched Log</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleTriggerExport("csv", "watchlist")}
                      disabled={isExportingCsv}
                      className="flex-1 text-xs h-9 border-border hover:border-purple-500"
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      <span>Watchlist</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Account Sign Out / Danger Zone */}
              <div className="pt-6 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span className="text-sm font-bold text-white block">Sign Out of ReelVault</span>
                  <p className="text-xs text-muted-foreground">
                    End your active session securely on this browser.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="border-rose-900/50 text-rose-300 hover:bg-rose-950/40 text-xs font-semibold"
                >
                  <LogOut className="w-3.5 h-3.5 mr-1.5" />
                  <span>Sign Out</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
