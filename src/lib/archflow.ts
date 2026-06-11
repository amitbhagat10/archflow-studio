import { query } from "./db";

export type DashboardStats = {
  active_projects: number;
  active_staff: number;
  hours_this_week: number;
  pending_timesheets: number;
  overdue_tasks: number;
  over_budget_projects: number;
};

export type ProjectSummary = {
  id: string;
  project_name: string;
  project_code: string | null;
  client_name: string | null;
  project_manager: string | null;
  status: string;
  current_stage: string | null;
  priority: string;
  budgeted_hours: number | null;
  actual_hours: number;
  target_completion_date: string | null;
};

export type StaffUtilisation = {
  id: string;
  full_name: string;
  role_title: string | null;
  weekly_capacity_hours: number;
  allocated_hours: number;
  available_hours: number;
};

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const result = await query<{
    active_projects: string;
    active_staff: string;
    hours_this_week: string;
    pending_timesheets: string;
    overdue_tasks: string;
    over_budget_projects: string;
  }>(`
    SELECT
      (SELECT COUNT(*) FROM projects WHERE status = 'active') AS active_projects,
      (SELECT COUNT(*) FROM staff WHERE is_active = true) AS active_staff,
      (
        SELECT COALESCE(SUM(hours), 0)
        FROM timesheets
        WHERE work_date >= date_trunc('week', CURRENT_DATE)::date
      ) AS hours_this_week,
      (
        SELECT COUNT(*)
        FROM timesheets
        WHERE approval_status = 'submitted'
      ) AS pending_timesheets,
      (
        SELECT COUNT(*)
        FROM project_tasks
        WHERE status NOT IN ('done', 'completed')
          AND due_date < CURRENT_DATE
      ) AS overdue_tasks,
      (
        SELECT COUNT(*)
        FROM projects
        WHERE COALESCE(actual_hours, 0) > COALESCE(budgeted_hours, 0)
      ) AS over_budget_projects
  `);

  const row = result.rows[0];

  return {
    active_projects: toNumber(row.active_projects),
    active_staff: toNumber(row.active_staff),
    hours_this_week: toNumber(row.hours_this_week),
    pending_timesheets: toNumber(row.pending_timesheets),
    overdue_tasks: toNumber(row.overdue_tasks),
    over_budget_projects: toNumber(row.over_budget_projects),
  };
}

export async function getProjects(): Promise<ProjectSummary[]> {
  const result = await query<ProjectSummary>(`
    SELECT
      p.id,
      p.project_name,
      p.project_code,
      c.client_name,
      s.full_name AS project_manager,
      p.status,
      p.current_stage,
      p.priority,
      p.budgeted_hours,
      COALESCE(SUM(t.hours), p.actual_hours, 0)::numeric AS actual_hours,
      p.target_completion_date::text
    FROM projects p
    LEFT JOIN clients c ON c.id = p.client_id
    LEFT JOIN staff s ON s.id = p.project_manager_id
    LEFT JOIN timesheets t ON t.project_id = p.id
    GROUP BY
      p.id,
      p.project_name,
      p.project_code,
      c.client_name,
      s.full_name,
      p.status,
      p.current_stage,
      p.priority,
      p.budgeted_hours,
      p.actual_hours,
      p.target_completion_date
    ORDER BY p.created_at DESC
    LIMIT 8
  `);

  return result.rows.map((row) => ({
    ...row,
    budgeted_hours: row.budgeted_hours === null ? null : Number(row.budgeted_hours),
    actual_hours: Number(row.actual_hours),
  }));
}

export async function getStaffUtilisation(): Promise<StaffUtilisation[]> {
  const result = await query<StaffUtilisation>(`
    SELECT
      s.id,
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
    LIMIT 10
  `);

  return result.rows.map((row) => ({
    ...row,
    weekly_capacity_hours: Number(row.weekly_capacity_hours),
    allocated_hours: Number(row.allocated_hours),
    available_hours: Number(row.available_hours),
  }));
}
