"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Star, StarHalf } from "lucide-react";
import { cn, getRatingColor } from "@/lib/utils";

const ratingVariants = cva("inline-flex items-center gap-1.5 select-none", {
  variants: {
    size: {
      xs: "text-xs",
      sm: "text-xs",
      md: "text-sm",
      lg: "text-base",
      xl: "text-lg font-semibold",
    },
  },
  defaultVariants: {
    size: "sm",
  },
});

export interface RatingStarsProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange">,
    VariantProps<typeof ratingVariants> {
  rating: number | null | undefined; // 0 to 10 or 0 to 5
  maxRating?: 5 | 10;
  interactive?: boolean;
  showScore?: boolean;
  showMax?: boolean;
  showStars?: boolean;
  voteCount?: number | null;
  onChange?: (rating: number) => void;
  variant?: "badge" | "stars" | "compact" | "detailed" | "interactive";
}

export const RatingStars = React.forwardRef<HTMLDivElement, RatingStarsProps>(
  (
    {
      rating = 0,
      maxRating = 10,
      interactive = false,
      showScore = true,
      showMax = false,
      showStars = true,
      voteCount,
      onChange,
      variant = "stars",
      size = "sm",
      className,
      ...props
    },
    ref
  ) => {
    const [hoverValue, setHoverValue] = React.useState<number | null>(null);

    const safeRating = Math.max(0, Math.min(maxRating, Number(rating) || 0));
    const activeRating = hoverValue !== null ? hoverValue : safeRating;

    // Normalize to 5-star visual representation
    const fiveStarScore =
      maxRating === 10 ? activeRating / 2 : activeRating;

    const starSizeMap = {
      xs: "h-3 w-3",
      sm: "h-3.5 w-3.5",
      md: "h-4 w-4",
      lg: "h-5 w-5",
      xl: "h-6 w-6",
    };

    const iconSize = starSizeMap[size || "sm"];

    const handleStarClick = (value: number) => {
      if (interactive && onChange) {
        onChange(value);
      }
    };

    const formatVotes = (count: number): string => {
      if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
      if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
      return count.toString();
    };

    // Render Badge Variant (Compact pill with star + score)
    if (variant === "badge") {
      const colorClass = getRatingColor(safeRating);
      return (
        <div
          ref={ref}
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-2 py-0.5 bg-background/80 backdrop-blur-md border border-border/60 shadow-sm",
            ratingVariants({ size }),
            className
          )}
          {...props}
        >
          <Star className={cn(iconSize, "fill-amber-400 text-amber-400 shrink-0")} />
          <span className={cn("font-semibold tabular-nums", colorClass)}>
            {safeRating > 0 ? safeRating.toFixed(1) : "NR"}
          </span>
          {showMax && <span className="text-muted-foreground/60 text-[10px]">/{maxRating}</span>}
        </div>
      );
    }

    // Interactive or Standard Stars rendering
    return (
      <div
        ref={ref}
        className={cn(ratingVariants({ size }), className)}
        onMouseLeave={() => interactive && setHoverValue(null)}
        {...props}
      >
        {showStars && (
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((index) => {
              const starTargetValue =
                maxRating === 10 ? index * 2 : index;
              const isFull = fiveStarScore >= index;
              const isHalf =
                !isFull &&
                fiveStarScore >= index - 0.5 &&
                fiveStarScore < index;

              return (
                <button
                  key={index}
                  type="button"
                  disabled={!interactive}
                  onClick={() => handleStarClick(starTargetValue)}
                  onMouseEnter={() =>
                    interactive && setHoverValue(starTargetValue)
                  }
                  className={cn(
                    "relative focus:outline-none transition-transform",
                    interactive &&
                      "cursor-pointer hover:scale-125 active:scale-95 p-0.5"
                  )}
                  aria-label={`Rate ${starTargetValue} out of ${maxRating}`}
                >
                  {isHalf ? (
                    <div className="relative">
                      <Star
                        className={cn(iconSize, "text-muted/60")}
                      />
                      <StarHalf
                        className={cn(
                          iconSize,
                          "absolute inset-0 fill-amber-400 text-amber-400"
                        )}
                      />
                    </div>
                  ) : (
                    <Star
                      className={cn(
                        iconSize,
                        isFull
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted/60",
                        interactive &&
                          hoverValue !== null &&
                          starTargetValue <= hoverValue &&
                          "fill-amber-400 text-amber-400"
                      )}
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {showScore && (
          <span
            className={cn(
              "font-medium tabular-nums",
              getRatingColor(safeRating)
            )}
          >
            {safeRating > 0 ? safeRating.toFixed(1) : "—"}
            {showMax && (
              <span className="text-muted-foreground text-[10px] font-normal">
                /{maxRating}
              </span>
            )}
          </span>
        )}

        {voteCount !== undefined && voteCount !== null && (
          <span className="text-xs text-muted-foreground">
            ({formatVotes(voteCount)})
          </span>
        )}
      </div>
    );
  }
);

RatingStars.displayName = "RatingStars";

export { ratingVariants };
