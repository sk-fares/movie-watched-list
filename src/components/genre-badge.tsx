"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const genreBadgeVariants = cva(
  "inline-flex items-center justify-center font-medium transition-colors select-none",
  {
    variants: {
      variant: {
        default:
          "bg-purple-950/60 text-purple-200 border border-purple-800/40 hover:bg-purple-900/70 hover:border-purple-600/60",
        secondary:
          "bg-secondary/70 text-secondary-foreground border border-border hover:bg-secondary",
        outline:
          "bg-transparent text-muted-foreground border border-border/80 hover:text-foreground hover:border-purple-500/50",
        glow:
          "bg-purple-900/40 text-purple-300 border border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.25)] hover:bg-purple-900/60",
        glass:
          "bg-white/5 backdrop-blur-md text-foreground/90 border border-white/10 hover:bg-white/10",
        subtle:
          "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
      },
      size: {
        xs: "text-[10px] px-1.5 py-0.5 rounded",
        sm: "text-xs px-2.5 py-0.5 rounded-full",
        md: "text-xs px-3 py-1 rounded-full",
        lg: "text-sm px-3.5 py-1.5 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "sm",
    },
  }
);

// Map genres to customized color accents when desired
const GENRE_COLORS: Record<string, string> = {
  Action: "border-red-500/30 text-red-300 bg-red-950/30 hover:border-red-500/50",
  Adventure: "border-amber-500/30 text-amber-300 bg-amber-950/30 hover:border-amber-500/50",
  Animation: "border-emerald-500/30 text-emerald-300 bg-emerald-950/30 hover:border-emerald-500/50",
  Comedy: "border-yellow-500/30 text-yellow-300 bg-yellow-950/30 hover:border-yellow-500/50",
  Crime: "border-zinc-500/30 text-zinc-300 bg-zinc-950/40 hover:border-zinc-500/50",
  Documentary: "border-teal-500/30 text-teal-300 bg-teal-950/30 hover:border-teal-500/50",
  Drama: "border-blue-500/30 text-blue-300 bg-blue-950/30 hover:border-blue-500/50",
  Family: "border-lime-500/30 text-lime-300 bg-lime-950/30 hover:border-lime-500/50",
  Fantasy: "border-fuchsia-500/30 text-fuchsia-300 bg-fuchsia-950/30 hover:border-fuchsia-500/50",
  History: "border-stone-500/30 text-stone-300 bg-stone-950/30 hover:border-stone-500/50",
  Horror: "border-rose-600/40 text-rose-300 bg-rose-950/40 hover:border-rose-500/60",
  Music: "border-pink-500/30 text-pink-300 bg-pink-950/30 hover:border-pink-500/50",
  Mystery: "border-indigo-500/30 text-indigo-300 bg-indigo-950/30 hover:border-indigo-500/50",
  Romance: "border-pink-500/30 text-pink-200 bg-pink-950/30 hover:border-pink-500/50",
  "Sci-Fi": "border-purple-500/40 text-purple-200 bg-purple-950/40 hover:border-purple-500/60",
  "Science Fiction": "border-purple-500/40 text-purple-200 bg-purple-950/40 hover:border-purple-500/60",
  Thriller: "border-violet-500/30 text-violet-300 bg-violet-950/30 hover:border-violet-500/50",
  War: "border-orange-500/30 text-orange-300 bg-orange-950/30 hover:border-orange-500/50",
  Western: "border-amber-600/30 text-amber-200 bg-amber-950/30 hover:border-amber-600/50",
};

export interface GenreBadgeProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "id" | "onSelect">,
    VariantProps<typeof genreBadgeVariants> {
  name: string;
  id?: number;
  useGenreColor?: boolean;
  clickable?: boolean;
  onSelect?: (name: string, id?: number) => void;
}

export const GenreBadge = React.forwardRef<HTMLSpanElement, GenreBadgeProps>(
  (
    {
      name,
      id,
      variant,
      size,
      useGenreColor = false,
      clickable = false,
      onSelect,
      className,
      onClick,
      ...props
    },
    ref
  ) => {
    const genreColorClass = useGenreColor ? GENRE_COLORS[name] : undefined;

    const handleClick = (e: React.MouseEvent<HTMLSpanElement>) => {
      if (onClick) {
        onClick(e);
      }
      if (onSelect) {
        onSelect(name, id);
      }
    };

    return (
      <span
        ref={ref}
        role={clickable || onClick || onSelect ? "button" : undefined}
        tabIndex={clickable || onClick || onSelect ? 0 : undefined}
        onClick={handleClick}
        onKeyDown={(e) => {
          if ((clickable || onSelect) && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            handleClick(e as any);
          }
        }}
        className={cn(
          genreBadgeVariants({ variant, size }),
          genreColorClass,
          (clickable || onClick || onSelect) &&
            "cursor-pointer active:scale-95 hover:shadow-sm",
          className
        )}
        {...props}
      >
        {name}
      </span>
    );
  }
);

GenreBadge.displayName = "GenreBadge";

export { genreBadgeVariants };
