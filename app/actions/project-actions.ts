"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";

const defaultStages = [
  ["Initial Consultation", 1, 10],
  ["Feasibility", 2, 20],
  ["Concept Design", 3, 60],
  ["Design Development", 4, 55],
  ["Planning / Permit", 5, 45],
  ["Documentation", 6, 70],
  ["Tender", 7, 25],
  ["Construction Support", 8, 35],
  ["Completion / Handover", 9, 10],
];

export async function createProject(formData: FormData) {
  const workspaceResult = await query(`
    SELECT id
    FROM workspaces
    ORDER BY created_at
    LIMIT 1
  `);

  const workspaceId = workspaceResult.rows[0]?.id;

  if (!workspaceId) {
    throw new Error("No workspace found");
  }

  const projectName = String(formData.get("project_name") || "").trim();
  const projectCode = String(formData.get("project_code") || "").trim();
  const projectAddress = String(formData.get("project_address") || "").trim();
  const clientId = String(formData.get("client_id") || "").trim() || null;
  const projectManagerId =
    String(formData.get("project_manager_id") || "").trim() || null;
  const startDate = String(formData.get("start_date") || "").trim() || null;
  const targetCompletionDate =
    String(formData.get("target_completion_date") || "").trim() || null;
  const feeBudget = Number(formData.get("fee_budget") || 0);
  const budgetedHours = Number(formData.get("budgeted_hours") || 0);
  const priority = String(formData.get("priority") || "medium");

  if (!projectName) {
    throw new Error("Project name is required");
  }

  const projectResult = await query(
    `
    INSERT INTO projects (
      workspace_id,
      client_id,
      project_name,
      project_code,
      project_address,
      project_manager_id,
      status,
      current_stage,
      start_date,
      target_completion_date,
      fee_budget,
      budgeted_hours,
      priority
    )
    VALUES (
      $1, $2, $3, $4, $5, $6,
      'active',
      'Initial Consultation',
      $7, $8, $9, $10, $11
    )
    RETURNING id
    `,
    [
      workspaceId,
      clientId,
      projectName,
      projectCode || null,
      projectAddress || null,
      projectManagerId,
      startDate,
      targetCompletionDate,
      feeBudget,
      budgetedHours,
      priority,
    ]
  );

  const projectId = projectResult.rows[0].id;

  for (const [stageName, sortOrder, hours] of defaultStages) {
    await query(
      `
      INSERT INTO project_stages (
        workspace_id,
        project_id,
        stage_name,
        budgeted_hours,
        status,
        sort_order
      )
      VALUES ($1, $2, $3, $4, 'not_started', $5)
      `,
      [workspaceId, projectId, stageName, hours, sortOrder]
    );
  }

  revalidatePath("/");
  revalidatePath("/projects");
}
