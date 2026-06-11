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

export async function createTimesheet(formData: FormData) {
  const workspaceId = await getWorkspaceId();

  const staffId = String(formData.get("staff_id") || "").trim();
  const stageId = String(formData.get("stage_id") || "").trim();
  const workDate = String(formData.get("work_date") || "").trim();
  const hours = Number(formData.get("hours") || 0);
  const isBillable = String(formData.get("is_billable") || "true") === "true";
  const description = String(formData.get("description") || "").trim();

  if (!staffId || !stageId || !workDate || hours <= 0) {
    throw new Error("Staff, stage, work date and hours are required");
  }

  const stageResult = await query(
    `
    SELECT project_id
    FROM project_stages
    WHERE id = $1
    LIMIT 1
    `,
    [stageId]
  );

  const projectId = stageResult.rows[0]?.project_id;

  if (!projectId) {
    throw new Error("Project stage not found");
  }

  await query(
    `
    INSERT INTO timesheets (
      workspace_id,
      staff_id,
      project_id,
      stage_id,
      work_date,
      hours,
      is_billable,
      description,
      approval_status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'submitted')
    `,
    [
      workspaceId,
      staffId,
      projectId,
      stageId,
      workDate,
      hours,
      isBillable,
      description || null,
    ]
  );

  await query(
    `
    UPDATE project_stages ps
    SET actual_hours = COALESCE((
      SELECT SUM(t.hours)
      FROM timesheets t
      WHERE t.stage_id = ps.id
    ), 0)
    WHERE ps.id = $1
    `,
    [stageId]
  );

  await query(
    `
    UPDATE projects p
    SET actual_hours = COALESCE((
      SELECT SUM(t.hours)
      FROM timesheets t
      WHERE t.project_id = p.id
    ), 0)
    WHERE p.id = $1
    `,
    [projectId]
  );

  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath("/timesheets");
}

export async function approveTimesheet(formData: FormData) {
  const timesheetId = String(formData.get("timesheet_id") || "").trim();

  if (!timesheetId) {
    throw new Error("Timesheet id is required");
  }

  await query(
    `
    UPDATE timesheets
    SET approval_status = 'approved',
        approved_at = now()
    WHERE id = $1
    `,
    [timesheetId]
  );

  revalidatePath("/");
  revalidatePath("/timesheets");
}

export async function rejectTimesheet(formData: FormData) {
  const timesheetId = String(formData.get("timesheet_id") || "").trim();

  if (!timesheetId) {
    throw new Error("Timesheet id is required");
  }

  await query(
    `
    UPDATE timesheets
    SET approval_status = 'rejected',
        approved_at = now()
    WHERE id = $1
    `,
    [timesheetId]
  );

  revalidatePath("/");
  revalidatePath("/timesheets");
}
