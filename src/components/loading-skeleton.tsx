"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-md bg-muted/40 shimmer animate-pulse",
        className
      )}
      {...props}
    />
  );
}

export function MovieCardSkeleton({
  className,
  variant = "grid",
}: {
  className?: string;
  variant?: "grid" | "list" | "compact";
}) {
  if (variant === "list") {
    return (
      <div
        className={cn(
          "flex flex-col sm:flex-row gap-4 p-3 rounded-xl bg-card/40 border border-border/40 shimmer",
          className
        )}
      >
        <Skeleton className="w-24 sm:w-28 aspect-[2/3] rounded-lg shrink-0" />
        <div className="flex-1 flex flex-col justify-between py-1 space-y-2">
          <div className="space-y-2">
            <Skeleton className="h-5 w-3/4 rounded" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-12 rounded" />
              <Skeleton className="h-4 w-16 rounded" />
              <Skeleton className="h-4 w-14 rounded-full" />
            </div>
            <Skeleton className="h-12 w-full rounded" />
          </div>
          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-1.5">
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={cn("space-y-2 w-32 shrink-0", className)}>
        <Skeleton className="w-full aspect-[2/3] rounded-lg" />
        <Skeleton className="h-3.5 w-4/5 rounded" />
        <Skeleton className="h-3 w-1/2 rounded" />
      </div>
    );
  }

  // Default Grid variant
  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl bg-card/40 border border-border/40 p-2 space-y-2.5",
        className
      )}
    >
      <div className="relative aspect-[2/3] w-full rounded-lg overflow-hidden">
        <Skeleton className="h-full w-full" />
        <div className="absolute top-2 left-2 flex gap-1">
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
        <div className="absolute top-2 right-2">
          <Skeleton className="h-5 w-10 rounded-md" />
        </div>
      </div>
      <div className="space-y-1.5 px-1 pb-1">
        <Skeleton className="h-4 w-4/5 rounded" />
        <div className="flex items-center justify-between pt-0.5">
          <Skeleton className="h-3.5 w-12 rounded" />
          <Skeleton className="h-3.5 w-16 rounded" />
        </div>
        <div className="flex gap-1 pt-1">
          <Skeleton className="h-4 w-12 rounded-full" />
          <Skeleton className="h-4 w-14 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function MovieGridSkeleton({
  count = 12,
  columns = "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
  className,
}: {
  count?: number;
  columns?: string;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-4 sm:gap-6", columns, className)}>
      {Array.from({ length: count }).map((_, i) => (
        <MovieCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ContentDetailSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-8 animate-fade-in", className)}>
      {/* Backdrop Hero skeleton */}
      <div className="relative h-[320px] md:h-[420px] w-full rounded-2xl overflow-hidden bg-card/30">
        <Skeleton className="h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      </div>

      {/* Main Info Header */}
      <div className="relative -mt-24 sm:-mt-32 max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row gap-6 md:gap-8 items-start">
        <Skeleton className="w-48 sm:w-64 aspect-[2/3] rounded-xl shadow-2xl shrink-0 border-2 border-border/60" />
        <div className="flex-1 space-y-4 pt-4 md:pt-16 w-full">
          <div className="space-y-2">
            <Skeleton className="h-8 sm:h-10 w-3/4 rounded-lg" />
            <Skeleton className="h-5 w-1/2 rounded" />
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-14 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <div className="flex gap-3 pt-2">
            <Skeleton className="h-10 w-36 rounded-lg" />
            <Skeleton className="h-10 w-36 rounded-lg" />
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
          <div className="space-y-2 pt-2">
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-3/4 rounded" />
          </div>
        </div>
      </div>

      {/* Cast row skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-3 pt-4">
        <Skeleton className="h-6 w-32 rounded" />
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-28 shrink-0 space-y-2">
              <Skeleton className="w-28 h-28 rounded-full" />
              <Skeleton className="h-3.5 w-full rounded" />
              <Skeleton className="h-3 w-3/4 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function StatsCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "p-5 rounded-xl bg-card/60 border border-border/50 space-y-3",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28 rounded" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="h-8 w-20 rounded" />
      <Skeleton className="h-3 w-32 rounded" />
    </div>
  );
}

export function FranchiseCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/50 bg-card/50 overflow-hidden p-5 space-y-4",
        className
      )}
    >
      <div className="flex gap-4 items-center">
        <Skeleton className="h-16 w-16 rounded-xl shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-6 w-1/2 rounded" />
          <Skeleton className="h-4 w-1/3 rounded" />
        </div>
      </div>
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="w-24 aspect-[2/3] rounded-lg shrink-0" />
        ))}
      </div>
    </div>
  );
}
