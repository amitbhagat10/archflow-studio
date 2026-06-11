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

export async function createClient(formData: FormData) {
  const workspaceId = await getWorkspaceId();

  const clientName = String(formData.get("client_name") || "").trim();
  const contactName = String(formData.get("contact_name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const address = String(formData.get("address") || "").trim();
  const notes = String(formData.get("notes") || "").trim();

  if (!clientName) {
    throw new Error("Client name is required");
  }

  await query(
    `
    INSERT INTO clients (
      workspace_id,
      client_name,
      contact_name,
      email,
      phone,
      address,
      notes
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
    [
      workspaceId,
      clientName,
      contactName || null,
      email || null,
      phone || null,
      address || null,
      notes || null,
    ]
  );

  revalidatePath("/clients");
  revalidatePath("/projects");
}
