import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function POST() {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    if (!apiKey || apiKey.includes("paste-your-openai-api-key-here")) {
      return NextResponse.json(
        {
          ok: false,
          error: "OPENAI_API_KEY is missing in .env.local",
        },
        { status: 400 }
      );
    }

    const projectsResult = await query(`
      SELECT
        p.project_name,
        p.project_code,
        p.status,
        p.current_stage,
        p.priority,
        p.target_completion_date::text,
        COALESCE(p.fee_budget, 0)::numeric AS fee_budget,
        COALESCE(p.budgeted_hours, 0)::numeric AS budgeted_hours,
        COALESCE((
          SELECT SUM(t.hours)
          FROM timesheets t
          WHERE t.project_id = p.id
        ), p.actual_hours, 0)::numeric AS actual_hours,
        c.client_name,
        s.full_name AS project_manager
      FROM projects p
      LEFT JOIN clients c ON c.id = p.client_id
      LEFT JOIN staff s ON s.id = p.project_manager_id
      WHERE p.status = 'active'
      ORDER BY p.priority DESC, p.created_at DESC
      LIMIT 20
    `);

    const taskResult = await query(`
      SELECT
        pt.task_title,
        pt.status,
        pt.priority,
        pt.due_date::text,
        p.project_name,
        s.full_name AS assigned_to,
        CASE
          WHEN pt.due_date IS NOT NULL
            AND pt.due_date < CURRENT_DATE
            AND pt.status NOT IN ('done', 'completed')
          THEN true
          ELSE false
        END AS is_overdue
      FROM project_tasks pt
      JOIN projects p ON p.id = pt.project_id
      LEFT JOIN staff s ON s.id = pt.assigned_to
      WHERE pt.status NOT IN ('done', 'completed')
      ORDER BY
        CASE
          WHEN pt.due_date IS NOT NULL
            AND pt.due_date < CURRENT_DATE
            AND pt.status NOT IN ('done', 'completed')
          THEN 0
          ELSE 1
        END,
        pt.due_date ASC NULLS LAST
      LIMIT 30
    `);

    const timesheetResult = await query(`
      SELECT
        t.work_date::text,
        st.full_name,
        p.project_name,
        ps.stage_name,
        t.hours,
        t.is_billable,
        t.approval_status,
        t.description
      FROM timesheets t
      JOIN staff st ON st.id = t.staff_id
      JOIN projects p ON p.id = t.project_id
      LEFT JOIN project_stages ps ON ps.id = t.stage_id
      WHERE t.work_date >= date_trunc('week', CURRENT_DATE)::date
      ORDER BY t.work_date DESC, t.created_at DESC
      LIMIT 40
    `);

    const resourceResult = await query(`
      SELECT
        s.full_name,
        s.role_title,
        s.weekly_capacity_hours,
        COALESCE(SUM(ra.allocated_hours), 0)::numeric AS allocated_hours,
        (s.weekly_capacity_hours - COALESCE(SUM(ra.allocated_hours), 0))::numeric AS available_hours
      FROM staff s
      LEFT JOIN resource_allocations ra
        ON ra.staff_id = s.id
        AND ra.week_start_date = date_trunc('week', CURRENT_DATE)::date
      WHERE s.is_active = true
      GROUP BY s.id, s.full_name, s.role_title, s.weekly_capacity_hours
      ORDER BY s.full_name
    `);

    const summaryData = {
      activeProjects: projectsResult.rows,
      openTasks: taskResult.rows,
      currentWeekTimesheets: timesheetResult.rows,
      currentWeekResources: resourceResult.rows,
    };

    const prompt = `
You are an AI operations assistant for an architecture studio.

Create a concise weekly studio brief for the director using only the data provided.

Return the answer in this structure:

Studio Snapshot:
- Short summary of overall studio/project health.

Project Risks:
- Highlight projects that are over budget, close to budget, delayed, high priority, or missing ownership.

Resource Capacity:
- Highlight staff who look overallocated or underutilised.

Timesheets:
- Mention pending timesheets, current week effort, and billable/non-billable patterns.

Accountability:
- Highlight overdue or high priority open tasks and who owns them.

Recommended Actions:
- Give 5 clear actions the director/project manager should take this week.

Keep it professional, practical, and easy to read.

Studio data:
${JSON.stringify(summaryData, null, 2)}
`;

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are a concise operations assistant for architecture studios.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();

      return NextResponse.json(
        {
          ok: false,
          error: errorText,
        },
        { status: 500 }
      );
    }

    const data = await aiResponse.json();
    const brief =
      data?.choices?.[0]?.message?.content || "No AI studio brief was returned.";

    return NextResponse.json({
      ok: true,
      brief,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
