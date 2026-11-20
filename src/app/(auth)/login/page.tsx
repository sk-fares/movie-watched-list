"use client";

import React, { useState, Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";
import {
  Film,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  Sparkles,
  Clapperboard,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  RotateCcw,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OtpInput } from "@/components/otp-input";
import { cn } from "@/lib/utils";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const urlError = searchParams.get("error");
  const wasVerified = searchParams.get("verified");

  const [authMethod, setAuthMethod] = useState<"password" | "otp">("password");

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // OTP login states
  const [otpStep, setOtpStep] = useState<"request" | "verify">("request");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(
    urlError === "OAuthSignin" || urlError === "OAuthCallback"
      ? "Google OAuth is not configured yet. Please sign in with Email or OTP."
      : urlError === "CredentialsSignin"
      ? "Invalid email or password."
      : ""
  );

  useEffect(() => {
    if (wasVerified) {
      toast.success("Account verified! You can now sign in.", { icon: "✅" });
    }
  }, [wasVerified]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Handle Standard Password Login
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!email || !password) {
      setErrorMessage("Please enter both email and password.");
      toast.error("Please enter both email and password.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: email.trim().toLowerCase(),
        password,
      });

      if (result?.error) {
        setErrorMessage("Invalid email or password. Please check and try again.");
        toast.error("Invalid email or password.");
        setIsLoading(false);
      } else if (result?.ok) {
        toast.success("Welcome back! Redirecting to your Vault...", {
          icon: "🎬",
          style: {
            borderRadius: "10px",
            background: "#1e1b4b",
            color: "#fff",
            border: "1px solid #4338ca",
          },
        });
        setTimeout(() => {
          router.push(callbackUrl);
          router.refresh();
        }, 600);
      }
    } catch (err: any) {
      console.error("Login submission error:", err);
      setErrorMessage("An unexpected error occurred. Please try again.");
      toast.error("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  // Handle Requesting OTP for Sign In
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!email.trim()) {
      setErrorMessage("Please enter your email address.");
      toast.error("Email is required.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          type: "signin",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send verification code.");
      }

      if (data.devOtp) setDevOtp(data.devOtp);
      setOtpStep("verify");
      setResendCooldown(60);
      toast.success(`Verification code sent to ${email}`, { icon: "✉️" });
    } catch (err: any) {
      console.error("Request OTP error:", err);
      setErrorMessage(err.message || "Failed to send code.");
      toast.error(err.message || "Failed to send code.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Verifying OTP and Signing In
  const handleVerifyOtpSubmit = async (codeToVerify?: string) => {
    const finalOtp = codeToVerify || otp;
    if (finalOtp.length !== 6) {
      toast.error("Please enter the complete 6-digit verification code.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: email.trim().toLowerCase(),
        otp: finalOtp,
      });

      if (result?.error) {
        setErrorMessage(result.error);
        toast.error("Invalid or expired verification code.");
        setIsLoading(false);
      } else if (result?.ok) {
        toast.success("Welcome back! Redirecting to your Vault...", { icon: "🎬" });
        setTimeout(() => {
          router.push(callbackUrl);
          router.refresh();
        }, 600);
      }
    } catch (err: any) {
      console.error("OTP login failed:", err);
      setErrorMessage(err.message || "Verification failed. Please try again.");
      toast.error(err.message || "Failed to verify code.");
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      setErrorMessage("");
      await signIn("google", { callbackUrl });
    } catch (err) {
      console.error("Google sign in error:", err);
      toast.error("Google OAuth is currently not active. Please sign in with Password or Email OTP code.");
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-black overflow-hidden selection:bg-purple-600 selection:text-white">
      <Toaster position="top-right" />

      {/* Cinematic Background Atmosphere */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[140px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-violet-900/10 rounded-full blur-[180px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/5 border border-purple-500/20 backdrop-blur-md mb-4 hover:border-purple-500/40 transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-600/30 group-hover:scale-105 transition-transform">
              <Clapperboard className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-purple-100 to-purple-300 bg-clip-text text-transparent">
              Movie Watched List
            </span>
          </Link>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Welcome back
          </h1>
          <p className="text-sm text-zinc-400 mt-1.5">
            Log in to manage your universes, history & watchlist
          </p>
        </div>

        {/* Card Box */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/80 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl shadow-purple-950/50">
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-red-300 text-sm"
            >
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </motion.div>
          )}

          {/* Google Sign-in */}
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isLoading}
            className="w-full h-11 bg-zinc-800/80 hover:bg-zinc-700/80 border-zinc-700/70 text-zinc-100 font-medium rounded-xl flex items-center justify-center gap-3 transition-all hover:border-purple-500/40 group"
          >
            {isGoogleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
            ) : (
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.3 8.9 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.7s.2-2 .4-2.7L1.6 6.4C.6 8.3 0 10.1 0 12s.6 3.7 1.6 5.6l3.7-2.9z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.3-6.7-5.3L1.6 16c1.9 3.8 5.8 7 10.4 7z"
                />
              </svg>
            )}
            <span>Continue with Google</span>
          </Button>

          {/* Divider */}
          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800" />
            </div>
            <span className="relative px-3 bg-zinc-900 text-xs font-medium uppercase tracking-wider text-zinc-500">
              Or sign in with email
            </span>
          </div>

          {/* Method Selector Tabs: Password vs Email OTP */}
          <div className="grid grid-cols-2 p-1 mb-5 rounded-xl bg-zinc-950/80 border border-zinc-800">
            <button
              type="button"
              onClick={() => {
                setAuthMethod("password");
                setErrorMessage("");
              }}
              className={cn(
                "py-2 text-xs font-semibold rounded-lg transition-all",
                authMethod === "password"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-900/30"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              Password Login
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMethod("otp");
                setErrorMessage("");
              }}
              className={cn(
                "py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5",
                authMethod === "otp"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-900/30"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Email OTP Code</span>
            </button>
          </div>

          <AnimatePresence mode="wait">
            {/* ─── TAB 1: Password Login Form ─── */}
            {authMethod === "password" ? (
              <motion.form
                key="form-password"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onSubmit={handlePasswordSubmit}
                className="space-y-4"
              >
                <div>
                  <label
                    htmlFor="email"
                    className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading || isGoogleLoading}
                      className="pl-10 h-11 bg-zinc-950/60 border-zinc-800 focus:border-purple-500 focus:ring-purple-500/20 text-white rounded-xl placeholder:text-zinc-600 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label
                      htmlFor="password"
                      className="text-xs font-semibold text-zinc-300 uppercase tracking-wider"
                    >
                      Password
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-xs text-purple-400 hover:text-purple-300 hover:underline transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading || isGoogleLoading}
                      className="pl-10 pr-10 h-11 bg-zinc-950/60 border-zinc-800 focus:border-purple-500 focus:ring-purple-500/20 text-white rounded-xl placeholder:text-zinc-600 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-zinc-800 bg-zinc-950 text-purple-600 focus:ring-purple-500/40 focus:ring-offset-0"
                    />
                    <span className="text-xs text-zinc-400">Remember me</span>
                  </label>
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={isLoading || isGoogleLoading}
                  className="w-full h-11 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition-all hover:shadow-purple-600/50 mt-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Signing In...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In with Password</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </motion.form>
            ) : (
              /* ─── TAB 2: Email OTP Login ─── */
              <motion.div
                key="form-otp"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                {otpStep === "request" ? (
                  <form onSubmit={handleRequestOtp} className="space-y-4">
                    <div>
                      <label
                        htmlFor="otp-email"
                        className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2"
                      >
                        Enter Your Email Address
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <Input
                          id="otp-email"
                          type="email"
                          required
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={isLoading}
                          className="pl-10 h-11 bg-zinc-950/60 border-zinc-800 focus:border-purple-500 focus:ring-purple-500/20 text-white rounded-xl placeholder:text-zinc-600 transition-all"
                        />
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-1.5">
                        We will send a 6-digit login verification code directly to your email.
                      </p>
                    </div>

                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-11 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition-all hover:shadow-purple-600/50"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Sending Code...</span>
                        </>
                      ) : (
                        <>
                          <span>Send Verification Code</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                  </form>
                ) : (
                  <div className="space-y-4 text-center">
                    <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-500/40 text-purple-300 flex items-center justify-center mx-auto shadow-md">
                      <KeyRound className="w-5 h-5 text-purple-400" />
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-white mb-0.5">Enter 6-Digit Code</h4>
                      <p className="text-xs text-zinc-400">
                        Sent to <span className="text-purple-300 font-semibold">{email}</span>
                      </p>
                    </div>

                    {devOtp && (
                      <div className="p-2.5 rounded-xl bg-purple-950/50 border border-purple-500/40 text-xs text-purple-200">
                        <span className="text-zinc-400">Dev Test Code:</span>{" "}
                        <span className="font-mono font-bold text-sm text-purple-300 tracking-widest">{devOtp}</span>
                      </div>
                    )}

                    <div className="py-2">
                      <OtpInput
                        value={otp}
                        onChange={setOtp}
                        disabled={isLoading}
                        onComplete={(code) => handleVerifyOtpSubmit(code)}
                      />
                    </div>

                    <Button
                      type="button"
                      onClick={() => handleVerifyOtpSubmit()}
                      disabled={otp.length !== 6 || isLoading}
                      className="w-full h-11 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition-all hover:shadow-purple-600/50"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Verifying & Signing In...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>Verify & Sign In</span>
                        </>
                      )}
                    </Button>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-zinc-800">
                      <button
                        type="button"
                        onClick={() => {
                          setOtpStep("request");
                          setOtp("");
                        }}
                        className="text-zinc-400 hover:text-white transition-colors"
                      >
                        ← Back
                      </button>

                      <button
                        type="button"
                        onClick={handleRequestOtp}
                        disabled={resendCooldown > 0 || isLoading}
                        className="text-purple-400 hover:text-purple-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}</span>
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Link */}
        <p className="text-center text-xs text-zinc-500 mt-6">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="text-purple-400 hover:text-purple-300 font-semibold hover:underline transition-colors"
          >
            Create an account
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-black text-purple-400">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
