import { query } from "./db";

export type DashboardStats = {
  activeProjects: number;
  activeStaff: number;
  hoursThisWeek: number;
  pendingTimesheets: number;
  overdueTasks: number;
  overBudgetProjects: number;
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
  const result = await query(`
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
    activeProjects: toNumber(row.active_projects),
    activeStaff: toNumber(row.active_staff),
    hoursThisWeek: toNumber(row.hours_this_week),
    pendingTimesheets: toNumber(row.pending_timesheets),
    overdueTasks: toNumber(row.overdue_tasks),
    overBudgetProjects: toNumber(row.over_budget_projects),
  };
}

export async function getProjects(): Promise<ProjectSummary[]> {
  const result = await query(`
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
      COALESCE(SUM(t.hours), p.actual_hours, 0)::numeric AS actual_hours
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
      p.created_at
    ORDER BY p.created_at DESC
    LIMIT 10
  `);

  return result.rows.map((row) => ({
    id: String(row.id),
    project_name: String(row.project_name),
    project_code: row.project_code ? String(row.project_code) : null,
    client_name: row.client_name ? String(row.client_name) : null,
    project_manager: row.project_manager ? String(row.project_manager) : null,
    status: String(row.status),
    current_stage: row.current_stage ? String(row.current_stage) : null,
    priority: String(row.priority),
    budgeted_hours: row.budgeted_hours === null ? null : Number(row.budgeted_hours),
    actual_hours: Number(row.actual_hours),
  }));
}

export async function getStaffUtilisation(): Promise<StaffUtilisation[]> {
  const result = await query(`
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
    id: String(row.id),
    full_name: String(row.full_name),
    role_title: row.role_title ? String(row.role_title) : null,
    weekly_capacity_hours: Number(row.weekly_capacity_hours),
    allocated_hours: Number(row.allocated_hours),
    available_hours: Number(row.available_hours),
  }));
}
