"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function changePassword(formData: FormData) {
  const user = await requireUser();

  const currentPassword = String(formData.get("current_password") || "");
  const newPassword = String(formData.get("new_password") || "");
  const confirmPassword = String(formData.get("confirm_password") || "");

  if (!currentPassword || !newPassword || !confirmPassword) {
    redirect("/profile?error=missing");
  }

  if (newPassword.length < 8) {
    redirect("/profile?error=short");
  }

  if (newPassword !== confirmPassword) {
    redirect("/profile?error=mismatch");
  }

  const result = await query(
    `
    SELECT password_hash
    FROM app_users
    WHERE id = $1
      AND is_active = true
    LIMIT 1
    `,
    [user.id]
  );

  const row = result.rows[0];

  if (!row?.password_hash) {
    redirect("/profile?error=invalid");
  }

  const passwordOk = await bcrypt.compare(
    currentPassword,
    String(row.password_hash)
  );

  if (!passwordOk) {
    redirect("/profile?error=current");
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 10);

  await query(
    `
    UPDATE app_users
    SET password_hash = $1
    WHERE id = $2
    `,
    [newPasswordHash, user.id]
  );

  redirect("/profile?success=password");
}
