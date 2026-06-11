"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { createSession } from "@/lib/auth";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    redirect("/login?error=missing");
  }

  const workspaceResult = await query(`
    SELECT
      subscription_status,
      trial_ends_at::text
    FROM workspaces
    ORDER BY created_at
    LIMIT 1
  `);

  const workspace = workspaceResult.rows[0];

  if (!workspace) {
    redirect("/login?error=workspace");
  }

  const status = String(workspace.subscription_status);
  const trialEndsAt = workspace.trial_ends_at ? new Date(String(workspace.trial_ends_at)) : null;
  const today = new Date();

  if (["cancelled", "expired", "suspended"].includes(status)) {
    redirect("/login?error=subscription");
  }

  if (status === "trial" && trialEndsAt && trialEndsAt < today) {
    redirect("/login?error=trial_expired");
  }

  const result = await query(
    `
    SELECT
      id,
      email,
      password_hash,
      is_active
    FROM app_users
    WHERE lower(email) = lower($1)
    LIMIT 1
    `,
    [email]
  );

  const user = result.rows[0];

  if (!user || !user.is_active || !user.password_hash) {
    redirect("/login?error=invalid");
  }

  const passwordOk = await bcrypt.compare(password, String(user.password_hash));

  if (!passwordOk) {
    redirect("/login?error=invalid");
  }

  await query(
    `
    UPDATE app_users
    SET last_login_at = now()
    WHERE id = $1
    `,
    [user.id]
  );

  await createSession(String(user.id));

  redirect("/");
}
