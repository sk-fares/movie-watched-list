"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid, List, SlidersHorizontal, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { MovieCard } from "@/components/movie-card";
import { MovieGridSkeleton, MovieCardSkeleton } from "@/components/loading-skeleton";
import { EmptyState, type EmptyStateAction } from "@/components/empty-state";

export type ContentGridViewMode = "grid" | "list";

export interface PaginationConfig {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export interface ContentGridProps extends React.HTMLAttributes<HTMLDivElement> {
  items: any[];
  isLoading?: boolean;
  title?: string;
  subtitle?: string;
  showToolbar?: boolean;
  defaultView?: ContentGridViewMode;
  columns?: string;
  emptyPreset?: "search" | "watchlist" | "history" | "franchises" | "general";
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: EmptyStateAction;
  onItemRemove?: (item: any) => void;
  onItemSelect?: (item: any) => void;
  onItemWatchlistChange?: (inWatchlist: boolean, item: any) => void;
  onItemWatchedChange?: (watched: boolean, item: any) => void;
  pagination?: PaginationConfig;
}

export const ContentGrid = React.forwardRef<HTMLDivElement, ContentGridProps>(
  (
    {
      items,
      isLoading = false,
      title,
      subtitle,
      showToolbar = false,
      defaultView = "grid",
      columns = "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
      emptyPreset = "general",
      emptyTitle,
      emptyDescription,
      emptyAction,
      onItemRemove,
      onItemSelect,
      onItemWatchlistChange,
      onItemWatchedChange,
      pagination,
      className,
      ...props
    },
    ref
  ) => {
    const [viewMode, setViewMode] = React.useState<ContentGridViewMode>(defaultView);
    const [filterType, setFilterType] = React.useState<"all" | "movie" | "tvshow">("all");
    const [sortBy, setSortBy] = React.useState<"default" | "rating" | "date" | "title">("default");

    // Filter items
    const filteredItems = React.useMemo(() => {
      let list = [...items];

      if (filterType !== "all") {
        list = list.filter((item) => {
          const type =
            item.contentType ||
            (item.media_type === "tv" || (!item.media_type && item.first_air_date)
              ? "tvshow"
              : "movie");
          return filterType === "tvshow"
            ? type === "tvshow" || type === "tv"
            : type === "movie";
        });
      }

      if (sortBy === "rating") {
        list.sort((a, b) => (b.voteAverage || b.vote_average || 0) - (a.voteAverage || a.vote_average || 0));
      } else if (sortBy === "date") {
        list.sort((a, b) => {
          const dateA = new Date(a.releaseDate || a.release_date || a.first_air_date || 0).getTime();
          const dateB = new Date(b.releaseDate || b.release_date || b.first_air_date || 0).getTime();
          return dateB - dateA;
        });
      } else if (sortBy === "title") {
        list.sort((a, b) => {
          const titleA = (a.title || a.name || "").toLowerCase();
          const titleB = (b.title || b.name || "").toLowerCase();
          return titleA.localeCompare(titleB);
        });
      }

      return list;
    }, [items, filterType, sortBy]);

    // Loading State
    if (isLoading) {
      return (
        <div className={cn("space-y-6 w-full", className)} ref={ref} {...props}>
          {title && (
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {title}
              </h2>
              {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
          )}
          {viewMode === "grid" ? (
            <MovieGridSkeleton columns={columns} />
          ) : (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <MovieCardSkeleton key={i} variant="list" />
              ))}
            </div>
          )}
        </div>
      );
    }

    // Empty State
    if (!isLoading && filteredItems.length === 0) {
      return (
        <div className={cn("w-full space-y-6", className)} ref={ref} {...props}>
          {title && (
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {title}
              </h2>
              {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
          )}
          <EmptyState
            preset={emptyPreset}
            title={emptyTitle || "No titles found"}
            description={emptyDescription}
            action={emptyAction}
          />
        </div>
      );
    }

    return (
      <div className={cn("space-y-6 w-full", className)} ref={ref} {...props}>
        {/* Header and Toolbar */}
        {(title || showToolbar) && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
            {title && (
              <div className="space-y-0.5">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <span>{title}</span>
                  <span className="text-xs font-mono font-normal text-muted-foreground px-2 py-0.5 rounded-full bg-muted/60">
                    {filteredItems.length}
                  </span>
                </h2>
                {subtitle && (
                  <p className="text-sm text-muted-foreground">{subtitle}</p>
                )}
              </div>
            )}

            {showToolbar && (
              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                {/* Type Filter Buttons */}
                <div className="inline-flex items-center rounded-lg border border-border/80 bg-muted/40 p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setFilterType("all")}
                    className={cn(
                      "px-2.5 py-1 rounded-md font-medium transition-colors",
                      filterType === "all"
                        ? "bg-purple-600 text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType("movie")}
                    className={cn(
                      "px-2.5 py-1 rounded-md font-medium transition-colors",
                      filterType === "movie"
                        ? "bg-purple-600 text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Movies
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType("tvshow")}
                    className={cn(
                      "px-2.5 py-1 rounded-md font-medium transition-colors",
                      filterType === "tvshow"
                        ? "bg-purple-600 text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Series
                  </button>
                </div>

                {/* Sort Dropdown */}
                <div className="relative inline-flex items-center">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="h-8 rounded-lg border border-border/80 bg-muted/40 px-2.5 text-xs font-medium text-foreground focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    <option value="default">Default Sort</option>
                    <option value="rating">Top Rated</option>
                    <option value="date">Release Date</option>
                    <option value="title">Title (A-Z)</option>
                  </select>
                </div>

                {/* View Mode Toggle: Grid vs List */}
                <div className="inline-flex items-center rounded-lg border border-border/80 bg-muted/40 p-0.5 text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={cn(
                      "p-1.5 rounded-md transition-colors",
                      viewMode === "grid"
                        ? "bg-background text-foreground shadow-sm"
                        : "hover:text-foreground"
                    )}
                    title="Grid view"
                    aria-label="Grid view"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={cn(
                      "p-1.5 rounded-md transition-colors",
                      viewMode === "list"
                        ? "bg-background text-foreground shadow-sm"
                        : "hover:text-foreground"
                    )}
                    title="List view"
                    aria-label="List view"
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Content Render: Grid or List */}
        <AnimatePresence mode="wait">
          {viewMode === "grid" ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={cn("grid gap-4 sm:gap-6", columns)}
            >
              {filteredItems.map((item, index) => (
                <MovieCard
                  key={item.id || item.tmdbId || index}
                  item={item}
                  variant="grid"
                  priority={index < 6}
                  onRemove={onItemRemove}
                  onSelect={onItemSelect}
                  onWatchlistChange={onItemWatchlistChange}
                  onWatchedChange={onItemWatchedChange}
                />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              {filteredItems.map((item, index) => (
                <MovieCard
                  key={item.id || item.tmdbId || index}
                  item={item}
                  variant="list"
                  priority={index < 4}
                  onRemove={onItemRemove}
                  onSelect={onItemSelect}
                  onWatchlistChange={onItemWatchlistChange}
                  onWatchedChange={onItemWatchedChange}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Optional Pagination Footer */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-6 border-t border-border/50">
            <button
              type="button"
              disabled={pagination.currentPage <= 1}
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border/80 bg-secondary/40 text-xs font-medium text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous</span>
            </button>

            <span className="text-xs text-muted-foreground font-mono">
              Page <span className="text-foreground font-bold">{pagination.currentPage}</span> of{" "}
              {pagination.totalPages}
            </span>

            <button
              type="button"
              disabled={pagination.currentPage >= pagination.totalPages}
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border/80 bg-secondary/40 text-xs font-medium text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    );
  }
);

ContentGrid.displayName = "ContentGrid";
