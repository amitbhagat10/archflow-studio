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

export async function createTask(formData: FormData) {
  const workspaceId = await getWorkspaceId();

  const projectId = String(formData.get("project_id") || "").trim();
  const stageId = String(formData.get("stage_id") || "").trim() || null;
  const assignedTo = String(formData.get("assigned_to") || "").trim() || null;
  const taskTitle = String(formData.get("task_title") || "").trim();
  const taskDescription = String(formData.get("task_description") || "").trim();
  const dueDate = String(formData.get("due_date") || "").trim() || null;
  const priority = String(formData.get("priority") || "medium").trim();

  if (!projectId || !taskTitle) {
    throw new Error("Project and task title are required");
  }

  await query(
    `
    INSERT INTO project_tasks (
      workspace_id,
      project_id,
      stage_id,
      assigned_to,
      task_title,
      task_description,
      due_date,
      priority,
      status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open')
    `,
    [
      workspaceId,
      projectId,
      stageId,
      assignedTo,
      taskTitle,
      taskDescription || null,
      dueDate,
      priority,
    ]
  );

  revalidatePath("/");
  revalidatePath("/tasks");
}

export async function updateTaskStatus(formData: FormData) {
  const taskId = String(formData.get("task_id") || "").trim();
  const status = String(formData.get("status") || "").trim();

  const allowedStatuses = ["open", "in_progress", "done"];

  if (!taskId || !allowedStatuses.includes(status)) {
    throw new Error("Valid task id and status are required");
  }

  await query(
    `
    UPDATE project_tasks
    SET status = $1
    WHERE id = $2
    `,
    [status, taskId]
  );

  revalidatePath("/");
  revalidatePath("/tasks");
}
