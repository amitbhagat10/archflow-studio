"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";

async function getWorkspaceId() {
  const result = await query(`
    SELECT id
    FROM workspaces
    ORDER BY created_at
    LIMIT 1
  `);

  const workspaceId = result.rows[0]?.id;

  if (!workspaceId) {
    throw new Error("No workspace found");
  }

  return workspaceId;
}

export async function updateWorkspace(formData: FormData) {
  const workspaceId = await getWorkspaceId();

  const name = String(formData.get("name") || "").trim();

  if (!name) {
    throw new Error("Workspace name is required");
  }

  await query(
    `
    UPDATE workspaces
    SET name = $1
    WHERE id = $2
    `,
    [name, workspaceId]
  );

  revalidatePath("/");
  revalidatePath("/settings");
}
