"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, X, Loader2, Film, Tv, ArrowRight, CornerDownLeft } from "lucide-react";
import { cn, formatYear, getRatingColor } from "@/lib/utils";
import { PosterImage } from "@/components/poster-image";

export interface SearchResultItem {
  id: number;
  title?: string;
  name?: string;
  media_type?: string;
  poster_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  overview?: string;
}

export interface SearchBarProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "onSelect"> {
  variant?: "default" | "hero" | "compact";
  onSelectResult?: (result: SearchResultItem) => void;
  showShortcut?: boolean;
}

export const SearchBar = React.forwardRef<HTMLInputElement, SearchBarProps>(
  (
    {
      variant = "default",
      placeholder = "Search movies, TV shows, franchises...",
      className,
      showShortcut = true,
      onSelectResult,
      ...props
    },
    ref
  ) => {
    const router = useRouter();
    const [query, setQuery] = React.useState("");
    const [results, setResults] = React.useState<SearchResultItem[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [isOpen, setIsOpen] = React.useState(false);
    const [selectedIndex, setSelectedIndex] = React.useState<number>(-1);
    const [isMac, setIsMac] = React.useState(false);

    const containerRef = React.useRef<HTMLDivElement>(null);
    const internalInputRef = React.useRef<HTMLInputElement>(null);

    // Merge forwarded ref with internal ref
    React.useImperativeHandle(ref, () => internalInputRef.current as HTMLInputElement);

    // Detect OS for shortcut symbol (⌘K on macOS, Ctrl+K on Windows/Linux)
    React.useEffect(() => {
      if (typeof window !== "undefined") {
        setIsMac(navigator.platform.toUpperCase().indexOf("MAC") >= 0);
      }
    }, []);

    // Global keyboard shortcut to focus search: Ctrl+K / Cmd+K
    React.useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
          e.preventDefault();
          internalInputRef.current?.focus();
          setIsOpen(true);
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Handle outside clicks to close dropdown
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Debounced search query
    React.useEffect(() => {
      const trimmedQuery = query.trim();
      if (!trimmedQuery || trimmedQuery.length < 2) {
        setResults([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const timer = setTimeout(async () => {
        try {
          const res = await fetch(
            `/api/search?q=${encodeURIComponent(trimmedQuery)}`
          );
          if (res.ok) {
            const data = await res.json();
            const items = data.results || (Array.isArray(data) ? data : []);
            setResults(items.slice(0, 7));
            setIsOpen(true);
          } else {
            setResults([]);
          }
        } catch {
          setResults([]);
        } finally {
          setIsLoading(false);
        }
      }, 280);

      return () => clearTimeout(timer);
    }, [query]);

    const handleClear = () => {
      setQuery("");
      setResults([]);
      setIsOpen(false);
      setSelectedIndex(-1);
      internalInputRef.current?.focus();
    };

    const handleItemSelect = (item: SearchResultItem) => {
      setIsOpen(false);
      setSelectedIndex(-1);

      if (onSelectResult) {
        onSelectResult(item);
        return;
      }

      const isTv =
        item.media_type === "tv" ||
        (!item.media_type && Boolean(item.first_air_date));
      const targetUrl = isTv ? `/tv/${item.id}` : `/movies/${item.id}`;
      router.push(targetUrl);
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = query.trim();
      if (!trimmed) return;

      if (selectedIndex >= 0 && results[selectedIndex]) {
        handleItemSelect(results[selectedIndex]);
        return;
      }

      setIsOpen(false);
      router.push(`/discover?q=${encodeURIComponent(trimmed)}`);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen || results.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
      } else if (e.key === "Escape") {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    const isHero = variant === "hero";

    return (
      <div
        ref={containerRef}
        className={cn("relative w-full", isHero ? "max-w-2xl mx-auto" : "max-w-md")}
      >
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <div className="pointer-events-none absolute left-3.5 flex items-center justify-center text-muted-foreground">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
            ) : (
              <Search className={cn("h-4 w-4", isHero && "h-5 w-5 text-purple-400")} />
            )}
          </div>

          <input
            ref={internalInputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!isOpen && e.target.value.trim().length >= 2) {
                setIsOpen(true);
              }
            }}
            onFocus={() => {
              if (results.length > 0 || query.trim().length >= 2) {
                setIsOpen(true);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={cn(
              "w-full rounded-xl bg-secondary/50 border border-border/80 pl-10 pr-20 text-sm text-foreground placeholder:text-muted-foreground/70 transition-all duration-200",
              "focus:outline-none focus:border-purple-500 focus:bg-background/90 focus:ring-2 focus:ring-purple-500/20",
              isHero
                ? "h-13 py-3.5 pl-12 pr-28 text-base shadow-xl border-purple-500/30 bg-card/60 backdrop-blur-md"
                : "h-10 py-2",
              className
            )}
            {...props}
          />

          {/* Right actions: Clear button and keyboard shortcut */}
          <div className="absolute right-2.5 flex items-center gap-1.5">
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}

            {showShortcut && !query && (
              <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border/80 bg-muted/50 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground select-none">
                {isMac ? "⌘" : "Ctrl"}K
              </kbd>
            )}
          </div>
        </form>

        {/* Live Search Suggestions Dropdown */}
        {isOpen && results.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-2 z-50 overflow-hidden rounded-xl border border-purple-500/20 bg-card/95 backdrop-blur-xl shadow-2xl animate-in fade-in-0 zoom-in-95 duration-150">
            <div className="p-1.5 space-y-1">
              <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 flex items-center justify-between">
                <span>Top Results</span>
                <span className="flex items-center gap-1 text-[10px] lowercase text-purple-400">
                  <span>enter to view</span>
                  <CornerDownLeft className="h-2.5 w-2.5" />
                </span>
              </div>

              {results.map((item, index) => {
                const title = item.title || item.name || "Untitled";
                const isTv =
                  item.media_type === "tv" ||
                  (!item.media_type && Boolean(item.first_air_date));
                const date = item.release_date || item.first_air_date;
                const year = formatYear(date);
                const isSelected = selectedIndex === index;

                return (
                  <div
                    key={`${item.id}-${index}`}
                    onClick={() => handleItemSelect(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors duration-150",
                      isSelected
                        ? "bg-purple-600/20 text-foreground border border-purple-500/30"
                        : "hover:bg-muted/60 text-foreground/90"
                    )}
                  >
                    <div className="relative h-12 w-8 shrink-0 rounded overflow-hidden">
                      <PosterImage
                        src={item.poster_path}
                        alt={title}
                        size="w92"
                        aspectRatio="poster"
                        zoomOnHover={false}
                        className="h-full w-full"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {title}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-muted/70 text-muted-foreground shrink-0">
                          {isTv ? (
                            <>
                              <Tv className="h-2.5 w-2.5 text-blue-400" /> TV
                            </>
                          ) : (
                            <>
                              <Film className="h-2.5 w-2.5 text-purple-400" /> Movie
                            </>
                          )}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span>{year}</span>
                        {item.vote_average !== undefined && item.vote_average > 0 && (
                          <span
                            className={cn(
                              "font-semibold",
                              getRatingColor(item.vote_average)
                            )}
                          >
                            ★ {item.vote_average.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>

                    <ArrowRight className="h-4 w-4 text-muted-foreground/40 shrink-0 pr-1" />
                  </div>
                );
              })}
            </div>

            {/* View all results button */}
            <div className="border-t border-border/50 p-2 bg-muted/20">
              <button
                type="button"
                onClick={handleSubmit}
                className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-purple-400 hover:text-purple-300 hover:bg-purple-950/30 rounded-lg transition-colors"
              >
                <span>View all results for &ldquo;{query}&rdquo;</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
);

SearchBar.displayName = "SearchBar";
