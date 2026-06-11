import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";

export const SESSION_COOKIE = "archflow_session";

export type UserRole = "admin" | "director" | "project_manager" | "staff";

export type CurrentUser = {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
};

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await query(
    `
    INSERT INTO app_sessions (token, user_id, expires_at)
    VALUES ($1, $2, $3)
    `,
    [token, userId, expiresAt]
  );

  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    expires: expiresAt,
  });
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const result = await query(
    `
    SELECT
      u.id,
      u.full_name,
      u.email,
      u.role
    FROM app_sessions s
    JOIN app_users u ON u.id = s.user_id
    WHERE s.token = $1
      AND s.expires_at > now()
      AND u.is_active = true
    LIMIT 1
    `,
    [token]
  );

  const user = result.rows[0];

  if (!user) {
    return null;
  }

  return {
    id: String(user.id),
    full_name: String(user.full_name),
    email: String(user.email),
    role: String(user.role) as UserRole,
  };
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireRole(allowedRoles: UserRole[]) {
  const user = await requireUser();

  if (!allowedRoles.includes(user.role)) {
    redirect("/no-access");
  }

  return user;
}
