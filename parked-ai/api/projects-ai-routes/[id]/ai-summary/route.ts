import { NextResponse } from "next/server";
import { query } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

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

    const projectResult = await query(
      `
      SELECT
        p.id,
        p.project_name,
        p.project_code,
        p.project_address,
        p.status,
        p.current_stage,
        p.priority,
        p.start_date::text,
        p.target_completion_date::text,
        p.fee_budget,
        p.budgeted_hours,
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
      WHERE p.id = $1
      LIMIT 1
      `,
      [id]
    );

    const project = projectResult.rows[0];

    if (!project) {
      return NextResponse.json(
        {
          ok: false,
          error: "Project not found",
        },
        { status: 404 }
      );
    }

    const stagesResult = await query(
      `
      SELECT
        ps.stage_name,
        ps.status,
        ps.planned_start_date::text,
        ps.planned_end_date::text,
        ps.actual_start_date::text,
        ps.actual_end_date::text,
        ps.budgeted_hours,
        COALESCE((
          SELECT SUM(t.hours)
          FROM timesheets t
          WHERE t.stage_id = ps.id
        ), ps.actual_hours, 0)::numeric AS actual_hours,
        s.full_name AS stage_owner
      FROM project_stages ps
      LEFT JOIN staff s ON s.id = ps.stage_owner_id
      WHERE ps.project_id = $1
      ORDER BY ps.sort_order
      `,
      [id]
    );

    const timesheetsResult = await query(
      `
      SELECT
        t.work_date::text,
        st.full_name,
        ps.stage_name,
        t.hours,
        t.is_billable,
        t.approval_status,
        t.description
      FROM timesheets t
      JOIN staff st ON st.id = t.staff_id
      LEFT JOIN project_stages ps ON ps.id = t.stage_id
      WHERE t.project_id = $1
      ORDER BY t.work_date DESC
      LIMIT 20
      `,
      [id]
    );

    const tasksResult = await query(
      `
      SELECT
        pt.task_title,
        pt.status,
        pt.priority,
        pt.due_date::text,
        s.full_name AS assigned_to,
        ps.stage_name,
        CASE
          WHEN pt.due_date IS NOT NULL
            AND pt.due_date < CURRENT_DATE
            AND pt.status NOT IN ('done', 'completed')
          THEN true
          ELSE false
        END AS is_overdue
      FROM project_tasks pt
      LEFT JOIN staff s ON s.id = pt.assigned_to
      LEFT JOIN project_stages ps ON ps.id = pt.stage_id
      WHERE pt.project_id = $1
      ORDER BY pt.due_date ASC NULLS LAST
      LIMIT 30
      `,
      [id]
    );

    const inputData = {
      project,
      stages: stagesResult.rows,
      recentTimesheets: timesheetsResult.rows,
      tasks: tasksResult.rows,
    };

    const prompt = `
You are an AI project delivery assistant for an architecture studio.

Create a clear professional project summary for the director/project manager.

Use the supplied project data only.

Return the response in this exact structure:

Project Health:
- Give a short status summary.

Budget and Hours:
- Compare budgeted hours vs actual hours.
- Highlight whether the project is healthy, approaching risk, or over budget.

Stage Progress:
- Summarise current stage and stage movement.

Risks:
- List key delivery risks, overdue tasks, missing owners, or budget pressure.

Recommended Actions:
- Give practical next actions for the project manager.

Accountability:
- Mention who appears responsible for key items where data is available.

Keep it concise, professional, and useful.

Project data:
${JSON.stringify(inputData, null, 2)}
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
              "You are a concise project delivery assistant for architecture practices.",
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
    const summary =
      data?.choices?.[0]?.message?.content ||
      "No AI summary was returned.";

    return NextResponse.json({
      ok: true,
      summary,
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
