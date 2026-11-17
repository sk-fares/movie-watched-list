"use client";

import * as React from "react";
import Image from "next/image";
import { cva, type VariantProps } from "class-variance-authority";
import { Film, Tv, Clapperboard, ImageOff } from "lucide-react";
import { cn, getImageUrl, getBackdropUrl } from "@/lib/utils";

const posterVariants = cva(
  "relative overflow-hidden bg-card/60 transition-all duration-300",
  {
    variants: {
      aspectRatio: {
        poster: "aspect-[2/3]",
        backdrop: "aspect-video",
        square: "aspect-square",
        wide: "aspect-[21/9]",
      },
      rounded: {
        none: "rounded-none",
        sm: "rounded-sm",
        md: "rounded-md",
        lg: "rounded-lg",
        xl: "rounded-xl",
        "2xl": "rounded-2xl",
      },
    },
    defaultVariants: {
      aspectRatio: "poster",
      rounded: "lg",
    },
  }
);

export interface PosterImageProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof posterVariants> {
  src?: string | null;
  alt: string;
  size?: "w92" | "w154" | "w185" | "w342" | "w500" | "w780" | "w1280" | "original";
  priority?: boolean;
  fill?: boolean;
  imageClassName?: string;
  fallbackIcon?: "movie" | "tv" | "franchise" | "default";
  showGradient?: boolean;
  zoomOnHover?: boolean;
}

export const PosterImage = React.forwardRef<HTMLDivElement, PosterImageProps>(
  (
    {
      src,
      alt,
      size = "w500",
      priority = false,
      aspectRatio = "poster",
      rounded = "lg",
      className,
      imageClassName,
      fallbackIcon = "movie",
      showGradient = false,
      zoomOnHover = true,
      children,
      ...props
    },
    ref
  ) => {
    const [hasError, setHasError] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(true);

    // Reset state if src changes
    React.useEffect(() => {
      setHasError(false);
      setIsLoading(true);
    }, [src]);

    // Compute valid image URL
    const imageUrl = React.useMemo(() => {
      if (!src) return null;
      if (src.startsWith("http://") || src.startsWith("https://")) {
        return src;
      }
      return aspectRatio === "backdrop" || aspectRatio === "wide"
        ? getBackdropUrl(src, size === "w500" ? "w1280" : size)
        : getImageUrl(src, size);
    }, [src, aspectRatio, size]);

    const renderFallbackIcon = () => {
      switch (fallbackIcon) {
        case "tv":
          return <Tv className="h-10 w-10 text-muted-foreground/50 mb-2" />;
        case "franchise":
          return <Clapperboard className="h-10 w-10 text-muted-foreground/50 mb-2" />;
        case "movie":
        default:
          return <Film className="h-10 w-10 text-muted-foreground/50 mb-2" />;
      }
    };

    return (
      <div
        ref={ref}
        className={cn(posterVariants({ aspectRatio, rounded }), "group/poster select-none", className)}
        {...props}
      >
        {imageUrl && !hasError ? (
          <>
            {/* Shimmer loading placeholder behind image */}
            {isLoading && (
              <div className="absolute inset-0 bg-muted/40 shimmer animate-pulse" />
            )}

            <Image
              src={imageUrl}
              alt={alt || "Media poster"}
              fill
              priority={priority}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              className={cn(
                "object-cover transition-all duration-500",
                zoomOnHover && "group-hover/poster:scale-105 group-hover:scale-105",
                isLoading ? "opacity-0 scale-95" : "opacity-100 scale-100",
                imageClassName
              )}
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setHasError(true);
                setIsLoading(false);
              }}
            />
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-card via-card/80 to-muted/30 p-4 text-center border border-border/40">
            {renderFallbackIcon()}
            <p className="text-xs font-medium text-muted-foreground line-clamp-2 px-1">
              {alt || "No image available"}
            </p>
            <span className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground/40 font-mono">
              ReelVault
            </span>
          </div>
        )}

        {/* Optional cinematic gradient overlay */}
        {showGradient && (
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent opacity-80" />
        )}

        {children}
      </div>
    );
  }
);

PosterImage.displayName = "PosterImage";

export { posterVariants };
