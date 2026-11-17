"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Film,
  Search,
  BookmarkPlus,
  History,
  Layers,
  Sparkles,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: LucideIcon;
  variant?: "primary" | "secondary" | "outline";
}

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon;
  title: string;
  description?: string;
  preset?: "search" | "watchlist" | "history" | "franchises" | "general";
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
}

const PRESET_CONFIG: Record<
  string,
  {
    icon: LucideIcon;
    title: string;
    description: string;
    action?: EmptyStateAction;
  }
> = {
  search: {
    icon: Search,
    title: "No results found",
    description:
      "We couldn't find any movies or TV series matching your search. Try different keywords or check your spelling.",
    action: {
      label: "Discover Trending",
      href: "/discover",
      icon: Sparkles,
      variant: "primary",
    },
  },
  watchlist: {
    icon: BookmarkPlus,
    title: "Your watchlist is empty",
    description:
      "Save movies and TV shows you want to watch later. Explore trending titles and tap the bookmark button.",
    action: {
      label: "Browse Movies & Shows",
      href: "/discover",
      icon: Film,
      variant: "primary",
    },
  },
  history: {
    icon: History,
    title: "No watch history recorded",
    description:
      "Start logging what you've watched to track your chronological viewing order, stats, and personal ratings.",
    action: {
      label: "Start Logging",
      href: "/discover",
      icon: Sparkles,
      variant: "primary",
    },
  },
  franchises: {
    icon: Layers,
    title: "No franchises tracked yet",
    description:
      "Follow complete cinematic universes like Marvel, Star Wars, or Batman in strict chronological sequence.",
    action: {
      label: "Explore Franchises",
      href: "/franchises",
      icon: ArrowRight,
      variant: "primary",
    },
  },
  general: {
    icon: Film,
    title: "No items here yet",
    description: "There are no movies or TV shows to display in this view.",
  },
};

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    {
      icon,
      title,
      description,
      preset,
      action,
      secondaryAction,
      className,
      ...props
    },
    ref
  ) => {
    const config = preset ? PRESET_CONFIG[preset] : null;

    const IconComponent = icon || config?.icon || Film;
    const finalTitle = title || config?.title || "Nothing here yet";
    const finalDescription = description || config?.description;
    const finalAction = action || config?.action;

    const renderActionButton = (act: EmptyStateAction, isSecondary = false) => {
      const ActionIcon = act.icon;
      const baseClass = cn(
        "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 active:scale-95 shadow-sm",
        isSecondary || act.variant === "outline"
          ? "bg-secondary/70 hover:bg-secondary text-foreground border border-border/80"
          : "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/30 shadow-lg hover:shadow-purple-700/40"
      );

      const content = (
        <>
          {ActionIcon && <ActionIcon className="h-4 w-4 shrink-0" />}
          <span>{act.label}</span>
        </>
      );

      if (act.href) {
        return (
          <Link href={act.href} className={baseClass}>
            {content}
          </Link>
        );
      }

      return (
        <button
          type="button"
          onClick={act.onClick}
          className={baseClass}
        >
          {content}
        </button>
      );
    };

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-2xl border border-dashed border-border/60 bg-card/20 backdrop-blur-sm overflow-hidden",
          className
        )}
        {...props}
      >
        {/* Subtle purple gradient background glow */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-30">
          <div className="h-48 w-48 rounded-full bg-purple-600/20 blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative z-10 flex flex-col items-center max-w-md mx-auto"
        >
          {/* Icon Circle */}
          <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-b from-purple-500/20 to-purple-900/10 border border-purple-500/30 text-purple-400 shadow-[0_0_25px_rgba(168,85,247,0.15)]">
            <IconComponent className="h-10 w-10" />
            <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-purple-500 animate-ping opacity-75" />
          </div>

          <h3 className="text-xl font-bold tracking-tight text-foreground mb-2">
            {finalTitle}
          </h3>

          {finalDescription && (
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              {finalDescription}
            </p>
          )}

          {(finalAction || secondaryAction) && (
            <div className="flex flex-wrap items-center justify-center gap-3 w-full">
              {finalAction && renderActionButton(finalAction)}
              {secondaryAction &&
                renderActionButton(secondaryAction, true)}
            </div>
          )}
        </motion.div>
      </div>
    );
  }
);

EmptyState.displayName = "EmptyState";
