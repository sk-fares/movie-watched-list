import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "Unknown";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatYear(dateString: string | null | undefined): string {
  if (!dateString) return "N/A";
  return new Date(dateString).getFullYear().toString();
}

export function formatRuntime(minutes: number | null | undefined): string {
  if (!minutes) return "N/A";
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins}m`;
  return `${hrs}h ${mins}m`;
}

export function getImageUrl(
  path: string | null | undefined,
  size: string = "w500"
): string {
  if (!path) return "/placeholder-poster.svg";
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export function getBackdropUrl(
  path: string | null | undefined,
  size: string = "w1280"
): string {
  if (!path) return "";
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

export function parseGenres(genres: string | null | undefined): { id: number; name: string }[] {
  if (!genres) return [];
  try {
    return JSON.parse(genres);
  } catch {
    return [];
  }
}

export function getRatingColor(rating: number): string {
  if (rating >= 7.5) return "text-green-400";
  if (rating >= 6) return "text-yellow-400";
  if (rating >= 4) return "text-orange-400";
  return "text-red-400";
}
