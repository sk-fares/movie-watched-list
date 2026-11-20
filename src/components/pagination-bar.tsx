"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface PaginationBarProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  maxPageButtons?: number; // Defaults to 10 (8-10 buttons)
  className?: string;
}

export function PaginationBar({
  currentPage,
  totalPages,
  onPageChange,
  maxPageButtons = 10,
  className,
}: PaginationBarProps) {
  if (totalPages <= 1) return null;

  // Calculate sliding window of 8 to 10 page buttons
  const pageNumbers = React.useMemo(() => {
    const limit = Math.min(maxPageButtons, totalPages);
    if (totalPages <= limit) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const half = Math.floor(limit / 2);
    let start = currentPage - half;
    let end = currentPage + (limit - half - 1);

    if (start < 1) {
      start = 1;
      end = limit;
    } else if (end > totalPages) {
      end = totalPages;
      start = totalPages - limit + 1;
    }

    const pages: number[] = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }, [currentPage, totalPages, maxPageButtons]);

  const hasPrevious = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3.5 border-t border-border/40 pt-8 pb-12 w-full max-w-4xl mx-auto select-none",
        className
      )}
    >
      {/* ─── Top Middle Controls: Previous, Page Status, Next Button ─── */}
      <div className="flex items-center justify-center gap-2.5 sm:gap-4 flex-wrap">
        {/* Jump to first page if far ahead */}
        {currentPage > 5 && totalPages > 10 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(1)}
            className="h-9 px-2.5 bg-card/60 border-border/70 hover:bg-purple-950/40 text-muted-foreground hover:text-white rounded-xl text-xs"
            title="First Page"
          >
            <ChevronsLeft className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">First</span>
          </Button>
        )}

        {/* Previous Button */}
        <Button
          variant="outline"
          size="sm"
          disabled={!hasPrevious}
          onClick={() => onPageChange(currentPage - 1)}
          className={cn(
            "h-9 px-3.5 sm:px-4 rounded-xl gap-1.5 text-xs sm:text-sm font-semibold border transition-all",
            hasPrevious
              ? "bg-card/80 border-border/80 hover:bg-purple-950/40 hover:border-purple-500/50 text-foreground hover:text-white shadow-sm"
              : "opacity-40 cursor-not-allowed bg-card/40 border-border/40 text-muted-foreground"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Previous</span>
        </Button>

        {/* Page status in the center */}
        <div className="px-3 py-1.5 rounded-xl bg-card/60 border border-border/60 text-xs text-muted-foreground font-mono flex items-center gap-1.5 shadow-inner">
          <span>Page</span>
          <span className="font-extrabold text-white text-sm">{currentPage}</span>
          <span>of</span>
          <span className="font-bold text-white text-sm">{totalPages}</span>
        </div>

        {/* Next Button */}
        <Button
          variant="outline"
          size="sm"
          disabled={!hasNext}
          onClick={() => onPageChange(currentPage + 1)}
          className={cn(
            "h-9 px-4 sm:px-5 rounded-xl gap-1.5 text-xs sm:text-sm font-bold border transition-all",
            hasNext
              ? "bg-purple-600 hover:bg-purple-500 text-white border-purple-500 shadow-md shadow-purple-900/30 hover:shadow-purple-900/50 hover:scale-[1.02]"
              : "opacity-40 cursor-not-allowed bg-card/40 border-border/40 text-muted-foreground"
          )}
        >
          <span>Next</span>
          <ChevronRight className="h-4 w-4 stroke-[2.5]" />
        </Button>

        {/* Jump to last page if far behind */}
        {currentPage < totalPages - 4 && totalPages > 10 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            className="h-9 px-2.5 bg-card/60 border-border/70 hover:bg-purple-950/40 text-muted-foreground hover:text-white rounded-xl text-xs"
            title="Last Page"
          >
            <span className="hidden sm:inline mr-1">Last</span>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* ─── 8 to 10 Direct Page Number Buttons Under It ─── */}
      <div className="flex items-center justify-center gap-1 sm:gap-1.5 flex-wrap pt-1 max-w-full">
        {pageNumbers.map((p) => {
          const isActive = p === currentPage;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={cn(
                "h-8 w-8 sm:h-9 sm:w-9 rounded-xl text-xs sm:text-sm font-bold transition-all border flex items-center justify-center",
                isActive
                  ? "bg-purple-600 text-white border-purple-400 shadow-lg shadow-purple-900/50 scale-105 pointer-events-none ring-2 ring-purple-400/30"
                  : "bg-card/70 text-muted-foreground hover:text-white hover:bg-purple-950/40 border-border/70 hover:border-purple-500/50"
              )}
              aria-label={`Go to page ${p}`}
              aria-current={isActive ? "page" : undefined}
            >
              {p}
            </button>
          );
        })}
      </div>
    </div>
  );
}
