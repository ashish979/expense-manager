import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const sessionToken =
    req.cookies.get("__Secure-authjs.session-token")?.value ||
    req.cookies.get("authjs.session-token")?.value;

  const isLoggedIn = !!sessionToken;
  const { pathname } = req.nextUrl;

  const isAppRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/friends") ||
    pathname.startsWith("/groups") ||
    pathname.startsWith("/expenses") ||
    pathname.startsWith("/settlements") ||
    pathname.startsWith("/activity") ||
    pathname.startsWith("/profile");

  if (isAppRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/signin", req.url));
  }

  if (isLoggedIn && (pathname === "/signin" || pathname === "/")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
