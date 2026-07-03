import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { COOKIE_NAME } from "./lib/auth";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "default_super_secure_secret_key_12345!",
);

const protectedRoutes = [
  "/dashboard",
  "/accounts",
  "/video-compress",
  "/video-pooler",
  "/file-compress",
  "/cctv-encode",
  "/api-docs",
];

const authRoutes = ["/login"];
const publicRoutes = ["/"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Exclude static files, _next, api routes (except auth/me might need it, but API routes can use auth helpers directly)
  if (
    pathname.startsWith("/_next") ||
    pathname.match(/\.(.*)$/) ||
    pathname.startsWith("/api/")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  let isAuthenticated = false;

  if (token) {
    try {
      await jwtVerify(token, JWT_SECRET);
      isAuthenticated = true;
    } catch (error) {
      // Token is invalid/expired
      isAuthenticated = false;
    }
  }

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route),
  );
  const isAuthRoute = authRoutes.some((route) => pathname === route);

  // 1. If accessing a protected route without a valid token
  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    // Optional: add a callbackUrl to return to the original page
    loginUrl.searchParams.set("callbackUrl", pathname);
    const response = NextResponse.redirect(loginUrl);

    // Clear the invalid token
    if (token) {
      response.cookies.delete(COOKIE_NAME);
    }

    return response;
  }

  // 2. If accessing login while already authenticated
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const response = NextResponse.next();

  // Clear the invalid token on any other route if it's invalid
  if (token && !isAuthenticated) {
    response.cookies.delete(COOKIE_NAME);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
