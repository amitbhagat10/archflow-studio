"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";

export async function updateStageStatus(formData: FormData) {
  const stageId = String(formData.get("stage_id") || "").trim();
  const projectId = String(formData.get("project_id") || "").trim();
  const status = String(formData.get("status") || "").trim();

  const allowedStatuses = ["not_started", "in_progress", "completed"];

  if (!stageId || !projectId || !allowedStatuses.includes(status)) {
    throw new Error("Valid stage, project and status are required");
  }

  await query(
    `
    UPDATE project_stages
    SET
      status = $1,
      actual_start_date = CASE
        WHEN $1 = 'in_progress' AND actual_start_date IS NULL THEN CURRENT_DATE
        ELSE actual_start_date
      END,
      actual_end_date = CASE
        WHEN $1 = 'completed' THEN CURRENT_DATE
        ELSE actual_end_date
      END
    WHERE id = $2
    `,
    [status, stageId]
  );

  const currentStageResult = await query(
    `
    SELECT stage_name
    FROM project_stages
    WHERE project_id = $1
      AND status IN ('in_progress', 'not_started')
    ORDER BY sort_order
    LIMIT 1
    `,
    [projectId]
  );

  const currentStage = currentStageResult.rows[0]?.stage_name ?? "Completed";

  await query(
    `
    UPDATE projects
    SET current_stage = $1
    WHERE id = $2
    `,
    [currentStage, projectId]
  );

  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
}
