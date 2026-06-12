import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "archflow_session";

const publicPaths = [
  "/login",
  "/api/login",
  "/api/logout",
  "/api/me",
  "/api/debug-session",
];

function getBaseUrl(request: NextRequest) {
  const envBaseUrl = process.env.APP_BASE_URL?.replace(/\/$/, "");

  if (envBaseUrl) {
    return envBaseUrl;
  }

  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  const forwardedHost =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    request.nextUrl.host;

  return `${forwardedProto}://${forwardedHost}`;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/icons") ||
    publicPaths.includes(pathname)
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthenticated",
        },
        { status: 401 }
      );
    }

    return NextResponse.redirect(new URL("/login", `${getBaseUrl(request)}/`));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
