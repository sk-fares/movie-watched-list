import type { Metadata, Viewport } from "next";
import "@/app/globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: {
    default: "ReelVault | Cinematic Universe Tracker & Watchlist",
    template: "%s | ReelVault",
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
    "ReelVault",
  ],
  authors: [{ name: "ReelVault Team" }],
  creator: "ReelVault",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://reelvault.app",
    title: "ReelVault | Cinematic Universe Tracker & Watchlist",
    description:
      "Manage watchlists, track chronological watch history, and explore movie franchises with ease.",
    siteName: "ReelVault",
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
