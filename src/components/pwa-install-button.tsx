"use client";

import React, { useEffect, useState } from "react";
import { Download, Smartphone, Share, PlusSquare, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function PwaInstallButton({ className = "" }: { className?: string }) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Check if already running in standalone mode (already installed)
    const checkStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (checkStandalone) {
      setIsStandalone(true);
      return;
    }

    // Check if iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Standard Chromium install prompt listener
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIosModal(true);
      return;
    }

    if (!deferredPrompt) {
      setShowIosModal(true);
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setInstalled(true);
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  if (isStandalone || installed) {
    return null;
  }

  // Show if Chromium prompt is ready OR if on iOS/mobile
  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        className={`flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600/30 to-indigo-600/30 hover:from-purple-600/50 hover:to-indigo-600/50 border border-purple-500/40 text-purple-200 transition-all shadow-sm ${className}`}
        title="Install Movie Watched List on your device"
      >
        <Smartphone className="h-4 w-4 text-purple-400 shrink-0" />
        <span className="truncate">Install App on Phone</span>
        <Download className="h-3.5 w-3.5 ml-auto text-purple-400 shrink-0" />
      </button>

      {/* iOS & Manual Install Modal Guide */}
      <Dialog open={showIosModal} onOpenChange={setShowIosModal}>
        <DialogContent className="max-w-sm rounded-2xl bg-zinc-950 border border-zinc-800 text-white p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-purple-400" />
              <span>Install Web App</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Install Movie Watched List on your phone for full-screen mode and faster access:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-3 text-xs text-zinc-300">
            {isIOS ? (
              <>
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-600/20 text-purple-400 font-bold shrink-0">
                    1
                  </div>
                  <p>
                    Open this website in <strong>Safari</strong> on your iPhone or iPad.
                  </p>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-600/20 text-purple-400 font-bold shrink-0">
                    2
                  </div>
                  <div className="space-y-1">
                    <p>Tap the <strong>Share</strong> button at the bottom of your screen.</p>
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[11px]">
                      <Share className="h-3.5 w-3.5 text-blue-400" />
                      <span>Share</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-600/20 text-purple-400 font-bold shrink-0">
                    3
                  </div>
                  <div className="space-y-1">
                    <p>Scroll down and select <strong>Add to Home Screen</strong>.</p>
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[11px]">
                      <PlusSquare className="h-3.5 w-3.5 text-purple-400" />
                      <span>Add to Home Screen</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-600/20 text-purple-400 font-bold shrink-0">
                    1
                  </div>
                  <p>
                    Tap the <strong>three dots (⋮)</strong> in Chrome at the top-right corner.
                  </p>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-600/20 text-purple-400 font-bold shrink-0">
                    2
                  </div>
                  <p>
                    Tap <strong>Install App</strong> or <strong>Add to Home screen</strong>.
                  </p>
                </div>
              </>
            )}
          </div>

          <Button
            type="button"
            onClick={() => setShowIosModal(false)}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold py-2"
          >
            Got it!
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
