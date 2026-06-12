import crypto from "crypto";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { SESSION_COOKIE } from "@/lib/auth";

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url), { status: 303 });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    return redirectTo(request, "/login?error=missing");
  }

  const result = await query(
    `
    SELECT
      u.id,
      u.email,
      u.full_name,
      u.role,
      u.password_hash,
      u.is_active,
      w.subscription_status,
      w.trial_ends_at
    FROM app_users u
    LEFT JOIN workspaces w ON w.id = u.workspace_id
    WHERE lower(u.email) = lower($1)
      AND u.is_active = true
    LIMIT 1
    `,
    [email]
  );

  const user = result.rows[0];

  if (!user?.password_hash) {
    return redirectTo(request, "/login?error=invalid");
  }

  if (!user.subscription_status) {
    return redirectTo(request, "/login?error=workspace");
  }

  if (["cancelled", "expired", "suspended"].includes(String(user.subscription_status))) {
    return redirectTo(request, "/login?error=subscription");
  }

  if (
    String(user.subscription_status) === "trial" &&
    user.trial_ends_at &&
    new Date(String(user.trial_ends_at)) < new Date()
  ) {
    return redirectTo(request, "/login?error=trial_expired");
  }

  const passwordOk = await bcrypt.compare(password, String(user.password_hash));

  if (!passwordOk) {
    return redirectTo(request, "/login?error=invalid");
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await query(
    `
    INSERT INTO app_sessions (token, user_id, expires_at)
    VALUES ($1, $2, $3)
    `,
    [token, user.id, expiresAt]
  );

  await query(
    `
    UPDATE app_users
    SET last_login_at = now()
    WHERE id = $1
    `,
    [user.id]
  );

  const response = NextResponse.redirect(new URL("/", request.url), {
    status: 303,
  });

  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    expires: expiresAt,
  });

  return response;
}
