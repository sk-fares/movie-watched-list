"use client";

import * as React from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import {
  Menu,
  Dices,
  Sparkles,
  Bookmark,
  History,
  Layers,
  Settings,
  LogOut,
  User as UserIcon,
  Film,
  Tv,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Tooltip from "@radix-ui/react-tooltip";

import { cn } from "@/lib/utils";
import { SearchBar } from "@/components/search-bar";

interface HeaderProps {
  onMenuClick?: () => void;
  className?: string;
}

export function Header({ onMenuClick, className }: HeaderProps) {
  const { data: session } = useSession();
  const user = session?.user;
  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : "U";

  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" });
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-16 w-full items-center justify-between gap-4 border-b border-border/50 bg-background/80 px-4 sm:px-6 backdrop-blur-md",
        className
      )}
    >
      {/* Left side: Mobile hamburger menu & branding shortcut */}
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 bg-secondary/50 text-foreground hover:bg-secondary transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        {/* Mobile brand text */}
        <Link
          href="/dashboard"
          className="md:hidden flex items-center gap-1.5 font-bold text-base tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-r from-purple-300 to-indigo-300"
        >
          <span>Movie Watched List</span>
        </Link>
      </div>

      {/* Middle: Integrated Quick Search Bar */}
      <div className="flex-1 max-w-xl mx-auto">
        <SearchBar variant="default" />
      </div>

      {/* Right side: Quick actions & User menu */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Random Pick shortcut button */}
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <Link
              href="/random"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-purple-500/30 bg-purple-950/40 text-purple-200 hover:bg-purple-900/50 hover:border-purple-500/60 transition-all active:scale-95 text-xs font-semibold shadow-sm"
            >
              <Dices className="h-4 w-4 text-purple-400" />
              <span className="hidden sm:inline">Spin Pick</span>
            </Link>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              side="bottom"
              sideOffset={6}
              className="z-50 rounded-lg bg-card px-2.5 py-1 text-xs font-semibold text-foreground border border-border shadow-xl backdrop-blur-md"
            >
              Pick what to watch randomly from your watchlist
              <Tooltip.Arrow className="fill-border" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>

        {/* User Account Dropdown */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className="relative flex h-9 w-9 items-center justify-center rounded-full border border-purple-500/40 bg-purple-950/60 text-purple-200 hover:border-purple-500/80 hover:ring-2 hover:ring-purple-500/20 transition-all focus:outline-none"
              aria-label="User account menu"
            >
              {user?.image ? (
                <img
                  src={user.image}
                  alt={user.name || "User"}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <span className="font-bold text-xs">{userInitial}</span>
              )}
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="z-50 min-w-[220px] overflow-hidden rounded-2xl border border-border bg-card/95 p-1.5 text-foreground shadow-2xl backdrop-blur-xl animate-in fade-in-0 zoom-in-95"
              sideOffset={8}
              align="end"
            >
              {/* User header info */}
              <div className="px-3 py-2 border-b border-border/50 mb-1">
                <p className="text-sm font-semibold truncate text-foreground">
                  {user?.name || "Viewer"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email || "viewer@moviewatchedlist.app"}
                </p>
              </div>

              {/* Menu items */}
              <DropdownMenu.Item asChild>
                <Link
                  href="/dashboard"
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium outline-none hover:bg-purple-950/40 hover:text-purple-300 transition-colors"
                >
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  <span>Dashboard</span>
                </Link>
              </DropdownMenu.Item>

              <DropdownMenu.Item asChild>
                <Link
                  href="/watchlist"
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium outline-none hover:bg-purple-950/40 hover:text-purple-300 transition-colors"
                >
                  <Bookmark className="h-4 w-4 text-purple-400" />
                  <span>Watchlist</span>
                </Link>
              </DropdownMenu.Item>

              <DropdownMenu.Item asChild>
                <Link
                  href="/history"
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium outline-none hover:bg-purple-950/40 hover:text-purple-300 transition-colors"
                >
                  <History className="h-4 w-4 text-purple-400" />
                  <span>Watch History</span>
                </Link>
              </DropdownMenu.Item>

              <DropdownMenu.Item asChild>
                <Link
                  href="/franchises"
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium outline-none hover:bg-purple-950/40 hover:text-purple-300 transition-colors"
                >
                  <Layers className="h-4 w-4 text-purple-400" />
                  <span>Franchises</span>
                </Link>
              </DropdownMenu.Item>

              <DropdownMenu.Item asChild>
                <Link
                  href="/settings"
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium outline-none hover:bg-purple-950/40 hover:text-purple-300 transition-colors"
                >
                  <Settings className="h-4 w-4 text-purple-400" />
                  <span>Settings</span>
                </Link>
              </DropdownMenu.Item>

              <DropdownMenu.Separator className="my-1 h-px bg-border/50" />

              <DropdownMenu.Item
                onClick={handleSignOut}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-red-400 outline-none hover:bg-red-950/30 hover:text-red-300 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
