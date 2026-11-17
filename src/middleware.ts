import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const { pathname, search } = request.nextUrl;

  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password");

  const isProtectedPage =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/watchlist") ||
    pathname.startsWith("/history") ||
    pathname.startsWith("/random") ||
    pathname.startsWith("/random-pick") ||
    pathname.startsWith("/franchises") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/movies") ||
    pathname.startsWith("/series") ||
    pathname.startsWith("/content");

  const isProtectedApi =
    pathname.startsWith("/api/watchlist") ||
    pathname.startsWith("/api/watched") ||
    pathname.startsWith("/api/franchises") ||
    pathname.startsWith("/api/user");

  // Redirect authenticated users away from auth pages
  if (isAuthPage && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Redirect unauthenticated users trying to access protected pages to login
  if (isProtectedPage && !token) {
    const callbackUrl = encodeURIComponent(`${pathname}${search}`);
    return NextResponse.redirect(
      new URL(`/login?callbackUrl=${callbackUrl}`, request.url)
    );
  }

  // Reject unauthenticated API requests to protected endpoints
  if (isProtectedApi && !token) {
    return NextResponse.json(
      { error: "Unauthorized access. Please log in." },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/watchlist/:path*",
    "/history/:path*",
    "/random/:path*",
    "/random-pick/:path*",
    "/franchises/:path*",
    "/settings/:path*",
    "/movies/:path*",
    "/series/:path*",
    "/content/:path*",
    "/login",
    "/register",
    "/forgot-password",
    "/api/watchlist/:path*",
    "/api/watched/:path*",
    "/api/franchises/:path*",
    "/api/user/:path*",
  ],
};
