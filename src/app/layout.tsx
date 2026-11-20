import type { Metadata, Viewport } from "next";
import "@/app/globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: {
    default: "Movie Watched List | Cinematic Universe Tracker & Watchlist",
    template: "%s | Movie Watched List",
  },
  description:
    "Your ultimate cinematic universe tracker. Curate watchlists, trace chronological watch history, follow franchise storylines sequentially, and discover movie magic.",
  keywords: [
    "movies",
    "tv series",
    "watchlist",
    "franchise tracker",
    "chronological order",
    "movie tracker",
    "TMDB",
    "cinematic universe",
    "Movie Watched List",
  ],
  authors: [{ name: "Movie Watched List Team" }],
  creator: "Movie Watched List",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Movie Watched List",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://moviewatchedlist.app",
    title: "Movie Watched List | Cinematic Universe Tracker & Watchlist",
    description:
      "Manage watchlists, track chronological watch history, and explore movie franchises with ease.",
    siteName: "Movie Watched List",
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head />
      <body className="min-h-screen bg-background font-sans text-foreground antialiased selection:bg-purple-500/30 selection:text-purple-200 overflow-x-hidden">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
