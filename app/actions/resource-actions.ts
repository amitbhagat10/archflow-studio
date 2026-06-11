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

export async function createStaff(formData: FormData) {
  const workspaceId = await getWorkspaceId();

  const fullName = String(formData.get("full_name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const roleTitle = String(formData.get("role_title") || "").trim();
  const weeklyCapacityHours = Number(formData.get("weekly_capacity_hours") || 38);
  const hourlyCostRate = Number(formData.get("hourly_cost_rate") || 0);
  const billableRate = Number(formData.get("billable_rate") || 0);

  if (!fullName) {
    throw new Error("Staff name is required");
  }

  await query(
    `
    INSERT INTO staff (
      workspace_id,
      full_name,
      email,
      role_title,
      weekly_capacity_hours,
      hourly_cost_rate,
      billable_rate,
      is_active
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, true)
    `,
    [
      workspaceId,
      fullName,
      email || null,
      roleTitle || null,
      weeklyCapacityHours,
      hourlyCostRate,
      billableRate,
    ]
  );

  revalidatePath("/");
  revalidatePath("/resources");
}

export async function createResourceAllocation(formData: FormData) {
  const workspaceId = await getWorkspaceId();

  const staffId = String(formData.get("staff_id") || "").trim();
  const projectId = String(formData.get("project_id") || "").trim();
  const weekStartDate = String(formData.get("week_start_date") || "").trim();
  const allocatedHours = Number(formData.get("allocated_hours") || 0);
  const notes = String(formData.get("notes") || "").trim();

  if (!staffId || !projectId || !weekStartDate || allocatedHours <= 0) {
    throw new Error("Staff, project, week start date and allocated hours are required");
  }

  await query(
    `
    INSERT INTO resource_allocations (
      workspace_id,
      staff_id,
      project_id,
      week_start_date,
      allocated_hours,
      notes
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [workspaceId, staffId, projectId, weekStartDate, allocatedHours, notes || null]
  );

  revalidatePath("/");
  revalidatePath("/resources");
}
