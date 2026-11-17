"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Compass,
  Film,
  Tv,
  Bookmark,
  History,
  Layers,
  Dices,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sparkles,
  Clapperboard,
  X,
  User as UserIcon,
} from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

interface SidebarProps {
  className?: string;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  important?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Discover",
    href: "/discover",
    icon: Compass,
  },
  {
    label: "Movies",
    href: "/movies",
    icon: Film,
  },
  {
    label: "TV Series",
    href: "/series",
    icon: Tv,
  },
  {
    label: "Watchlist",
    href: "/watchlist",
    icon: Bookmark,
  },
  {
    label: "Watch History",
    href: "/history",
    icon: History,
  },
  {
    label: "Franchises",
    href: "/franchises",
    icon: Layers,
    badge: "Key",
    important: true,
  },
  {
    label: "Random Pick",
    href: "/random-pick",
    icon: Dices,
    badge: "Spin",
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function Sidebar({ className, isMobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  // Auto close mobile drawer on route navigation
  React.useEffect(() => {
    if (isMobileOpen && onMobileClose) {
      onMobileClose();
    }
  }, [pathname]);

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => !prev);
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" });
  };

  const user = session?.user;
  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : "U";

  const renderNavLinks = () => (
    <nav className="flex-1 space-y-1.5 px-3 py-4">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));

        const linkContent = (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 select-none",
              isActive
                ? "bg-purple-600/15 text-purple-300 font-semibold shadow-sm shadow-purple-950/30"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
              item.important && !isActive && "text-purple-300/80 hover:text-purple-200",
              isCollapsed && "justify-center px-2"
            )}
          >
            {/* Active left indicator pill */}
            {isActive && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
            )}

            <Icon
              className={cn(
                "h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110",
                isActive
                  ? "text-purple-400"
                  : "text-muted-foreground group-hover:text-foreground",
                item.important && "text-purple-400"
              )}
            />

            {!isCollapsed && (
              <span className="flex-1 truncate">{item.label}</span>
            )}

            {!isCollapsed && item.badge && (
              <span
                className={cn(
                  "ml-auto rounded-full px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider font-semibold",
                  item.important
                    ? "bg-purple-600/30 text-purple-300 border border-purple-500/40"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {item.badge}
              </span>
            )}
          </Link>
        );

        if (isCollapsed) {
          return (
            <Tooltip.Root key={item.href}>
              <Tooltip.Trigger asChild>{linkContent}</Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  side="right"
                  sideOffset={10}
                  className="z-50 rounded-lg bg-card px-2.5 py-1 text-xs font-semibold text-foreground border border-border shadow-xl backdrop-blur-md animate-in fade-in-0 zoom-in-95"
                >
                  {item.label}
                  {item.badge && ` (${item.badge})`}
                  <Tooltip.Arrow className="fill-border" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          );
        }

        return linkContent;
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-md md:hidden transition-opacity"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Container */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 flex flex-col border-r border-border/60 bg-card/85 backdrop-blur-xl transition-all duration-300 ease-in-out",
          // Desktop collapsed vs expanded width
          isCollapsed ? "w-18" : "w-64",
          // Mobile open vs closed transform
          isMobileOpen
            ? "translate-x-0"
            : "-translate-x-full md:translate-x-0",
          className
        )}
      >
        {/* Brand / Logo Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-border/50">
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center gap-2.5 transition-transform hover:scale-105",
              isCollapsed && "mx-auto justify-center"
            )}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30">
              <Clapperboard className="h-5 w-5" />
            </div>

            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="font-extrabold text-base tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-r from-purple-200 via-purple-400 to-indigo-300">
                  Movie Watched List
                </span>
                <span className="text-[10px] uppercase font-mono tracking-widest text-muted-foreground font-semibold">
                  Universe Tracker
                </span>
              </div>
            )}
          </Link>

          {/* Mobile close button */}
          <button
            type="button"
            onClick={onMobileClose}
            className="md:hidden rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Desktop collapse toggle */}
          <button
            type="button"
            onClick={toggleCollapsed}
            className={cn(
              "hidden md:flex h-7 w-7 items-center justify-center rounded-lg border border-border/80 bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors",
              isCollapsed && "hidden"
            )}
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        {/* Collapsed Expand Button */}
        {isCollapsed && (
          <div className="hidden md:flex justify-center py-2 border-b border-border/40">
            <button
              type="button"
              onClick={toggleCollapsed}
              className="h-7 w-7 flex items-center justify-center rounded-lg border border-border/80 bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Navigation links scroll area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-none py-2">
          {renderNavLinks()}

          {/* Franchise Highlight Box (Expanded only) */}
          {!isCollapsed && (
            <div className="mx-3 my-4 p-3.5 rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-950/40 via-purple-900/10 to-transparent">
              <div className="flex items-center gap-2 text-purple-300 text-xs font-bold mb-1">
                <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                <span>Sequential Tracking</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed mb-2.5">
                Track full storylines like MCU, Star Wars, or DC in exact release or chronological timeline order.
              </p>
              <Link
                href="/franchises"
                className="inline-flex items-center justify-center w-full py-1.5 rounded-lg text-xs font-semibold bg-purple-600/80 hover:bg-purple-600 text-white transition-colors shadow-sm"
              >
                Browse Universes
              </Link>
            </div>
          )}
        </div>

        {/* User Profile Footer */}
        <div className="border-t border-border/50 p-3 bg-card/60">
          <div
            className={cn(
              "flex items-center gap-3 rounded-xl p-2 transition-colors",
              isCollapsed ? "justify-center" : "justify-between"
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {user?.image ? (
                <img
                  src={user.image}
                  alt={user.name || "User"}
                  className="h-8 w-8 rounded-full object-cover border border-purple-500/40 shrink-0"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-700/50 border border-purple-500/40 text-purple-200 font-bold text-xs shrink-0">
                  {userInitial}
                </div>
              )}

              {!isCollapsed && (
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-foreground truncate">
                    {user?.name || "Movie Fan"}
                  </span>
                  <span className="text-[11px] text-muted-foreground truncate">
                    {user?.email || "viewer@moviewatchedlist.app"}
                  </span>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-950/30 hover:text-red-400 transition-colors"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
