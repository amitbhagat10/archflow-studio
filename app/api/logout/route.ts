import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { SESSION_COOKIE } from "@/lib/auth";

export async function GET(request: NextRequest) {
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

  const response = NextResponse.redirect(new URL("/login", request.url), {
    status: 303,
  });

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
