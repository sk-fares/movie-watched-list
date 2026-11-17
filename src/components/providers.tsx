"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { Toaster } from "react-hot-toast";

interface ProvidersProps {
  children: React.ReactNode;
  session?: any;
}

export function Providers({ children, session }: ProvidersProps) {
  return (
    <SessionProvider session={session}>
      <NextThemesProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        disableTransitionOnChange
      >
        <TooltipProvider delayDuration={150}>
          {children}
          <Toaster
            position="bottom-right"
            gutter={12}
            containerClassName="!z-[99999]"
            toastOptions={{
              duration: 3500,
              className: "movie-watched-list-toast",
              style: {
                background: "#0d0d12",
                color: "#f3f4f6",
                border: "1px solid rgba(139, 92, 246, 0.25)",
                borderRadius: "0.75rem",
                boxShadow:
                  "0 20px 35px -10px rgba(0, 0, 0, 0.8), 0 0 20px rgba(139, 92, 246, 0.15)",
                padding: "12px 16px",
                fontSize: "0.875rem",
                maxWidth: "420px",
              },
              success: {
                iconTheme: {
                  primary: "#a855f7",
                  secondary: "#ffffff",
                },
                style: {
                  borderColor: "rgba(168, 85, 247, 0.4)",
                },
              },
              error: {
                iconTheme: {
                  primary: "#ef4444",
                  secondary: "#ffffff",
                },
                style: {
                  borderColor: "rgba(239, 68, 68, 0.4)",
                },
              },
              loading: {
                iconTheme: {
                  primary: "#8b5cf6",
                  secondary: "#1f1f2e",
                },
              },
            }}
          />
        </TooltipProvider>
      </NextThemesProvider>
    </SessionProvider>
  );
}
