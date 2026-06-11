import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { query } from "@/lib/db";
import { SESSION_COOKIE } from "@/lib/auth";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await query(
      `
      DELETE FROM app_sessions
      WHERE token = $1
      `,
      [token]
    );
  }

  const url = new URL("/login", request.url);
  const response = NextResponse.redirect(url);

  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    expires: new Date(0),
  });

  return response;
}
