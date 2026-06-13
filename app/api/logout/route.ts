import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { SESSION_COOKIE } from "@/lib/auth";

function getBaseUrl(request: NextRequest) {
  const envBaseUrl = process.env.APP_BASE_URL?.replace(/\/$/, "");

  if (envBaseUrl) {
    return envBaseUrl;
  }

  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  const forwardedHost =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "localhost:3000";

  return `${forwardedProto}://${forwardedHost}`;
}

// GET must NOT logout because Next/link/browser prefetch can call GET routes.
export async function GET(request: NextRequest) {
  return NextResponse.redirect(
    new URL("/login", `${getBaseUrl(request)}/`),
    { status: 303 }
  );
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (token) {
    await query(
      `
      DELETE FROM app_sessions
      WHERE token = $1
      `,
      [token]
    );
  }

  const response = NextResponse.redirect(
    new URL("/login", `${getBaseUrl(request)}/`),
    { status: 303 }
  );

  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    expires: new Date(0),
    maxAge: 0,
  });

  return response;
}
