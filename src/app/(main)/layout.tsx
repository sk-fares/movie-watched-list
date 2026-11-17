"use client";

import * as React from "react";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  return (
    <div className="relative min-h-screen bg-background text-foreground flex flex-col md:flex-row overflow-x-hidden">
      {/* Cinematic Ambient Glow Background Highlights */}
      <div className="pointer-events-none fixed top-0 right-0 -z-10 h-[500px] w-[500px] rounded-full bg-purple-600/10 blur-[130px] opacity-60" />
      <div className="pointer-events-none fixed bottom-0 left-0 md:left-64 -z-10 h-[400px] w-[400px] rounded-full bg-blue-600/8 blur-[140px] opacity-50" />

      {/* Main Navigation Sidebar */}
      <Sidebar
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:pl-64 min-w-0 transition-all duration-300">
        <Header onMenuClick={() => setIsMobileMenuOpen(true)} />

        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
