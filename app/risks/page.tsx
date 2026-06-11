import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Briefcase,
  CalendarClock,
  Clock3,
  UserRound,
  Users,
} from "lucide-react";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

type RiskProject = {
  id: string;
  project_name: string;
  project_code: string | null;
  client_name: string | null;
  project_manager: string | null;
  current_stage: string | null;
  budgeted_hours: number;
  actual_hours: number;
  usage_percent: number;
};

type OverdueTask = {
  id: string;
  task_title: string;
  due_date: string | null;
  priority: string;
  project_name: string;
  project_code: string | null;
  assigned_to_name: string | null;
};

type PendingTimesheet = {
  id: string;
  work_date: string;
  full_name: string;
  project_name: string;
  project_code: string | null;
  hours: number;
};

type ResourceRisk = {
  id: string;
  full_name: string;
  role_title: string | null;
  weekly_capacity_hours: number;
  allocated_hours: number;
  available_hours: number;
};

async function getRiskProjects(): Promise<RiskProject[]> {
  const result = await query(`
    SELECT
      p.id,
      p.project_name,
      p.project_code,
      c.client_name,
      s.full_name AS project_manager,
      p.current_stage,
      COALESCE(p.budgeted_hours, 0)::numeric AS budgeted_hours,
      COALESCE((
        SELECT SUM(t.hours)
        FROM timesheets t
        WHERE t.project_id = p.id
      ), p.actual_hours, 0)::numeric AS actual_hours,
      CASE
        WHEN COALESCE(p.budgeted_hours, 0) > 0
        THEN ROUND(
          (
            COALESCE((
              SELECT SUM(t.hours)
              FROM timesheets t
              WHERE t.project_id = p.id
            ), p.actual_hours, 0)
            / p.budgeted_hours
          ) * 100,
          1
        )
        ELSE 0
      END::numeric AS usage_percent
    FROM projects p
    LEFT JOIN clients c ON c.id = p.client_id
    LEFT JOIN staff s ON s.id = p.project_manager_id
    WHERE p.status = 'active'
      AND COALESCE(p.budgeted_hours, 0) > 0
      AND (
        COALESCE((
          SELECT SUM(t.hours)
          FROM timesheets t
          WHERE t.project_id = p.id
        ), p.actual_hours, 0) >= p.budgeted_hours * 0.8
      )
    ORDER BY usage_percent DESC
  `);

  return result.rows.map((row) => ({
    id: String(row.id),
    project_name: String(row.project_name),
    project_code: row.project_code ? String(row.project_code) : null,
    client_name: row.client_name ? String(row.client_name) : null,
    project_manager: row.project_manager ? String(row.project_manager) : null,
    current_stage: row.current_stage ? String(row.current_stage) : null,
    budgeted_hours: Number(row.budgeted_hours),
    actual_hours: Number(row.actual_hours),
    usage_percent: Number(row.usage_percent),
  }));
}

async function getOverdueTasks(): Promise<OverdueTask[]> {
  const result = await query(`
    SELECT
      pt.id,
      pt.task_title,
      pt.due_date::text,
      pt.priority,
      p.project_name,
      p.project_code,
      s.full_name AS assigned_to_name
    FROM project_tasks pt
    JOIN projects p ON p.id = pt.project_id
    LEFT JOIN staff s ON s.id = pt.assigned_to
    WHERE pt.due_date < CURRENT_DATE
      AND pt.status NOT IN ('done', 'completed')
    ORDER BY pt.due_date ASC
  `);

  return result.rows.map((row) => ({
    id: String(row.id),
    task_title: String(row.task_title),
    due_date: row.due_date ? String(row.due_date) : null,
    priority: String(row.priority),
    project_name: String(row.project_name),
    project_code: row.project_code ? String(row.project_code) : null,
    assigned_to_name: row.assigned_to_name ? String(row.assigned_to_name) : null,
  }));
}

async function getPendingTimesheets(): Promise<PendingTimesheet[]> {
  const result = await query(`
    SELECT
      t.id,
      t.work_date::text,
      s.full_name,
      p.project_name,
      p.project_code,
      t.hours
    FROM timesheets t
    JOIN staff s ON s.id = t.staff_id
    JOIN projects p ON p.id = t.project_id
    WHERE t.approval_status = 'submitted'
    ORDER BY t.work_date DESC
    LIMIT 30
  `);

  return result.rows.map((row) => ({
    id: String(row.id),
    work_date: String(row.work_date),
    full_name: String(row.full_name),
    project_name: String(row.project_name),
    project_code: row.project_code ? String(row.project_code) : null,
    hours: Number(row.hours),
  }));
}

async function getResourceRisks(): Promise<ResourceRisk[]> {
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
    HAVING (s.weekly_capacity_hours - COALESCE(SUM(ra.allocated_hours), 0)) < 0
    ORDER BY available_hours ASC
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

function RiskBadge({ label, type }: { label: string; type: "high" | "medium" | "ok" }) {
  const style =
    type === "high"
      ? "border-rose-400/20 bg-rose-500/15 text-rose-300"
      : type === "medium"
      ? "border-amber-400/20 bg-amber-500/15 text-amber-300"
      : "border-emerald-400/20 bg-emerald-500/15 text-emerald-300";

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  risk,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  risk: "high" | "medium" | "ok";
}) {
  const border =
    risk === "high"
      ? "border-rose-400/20"
      : risk === "medium"
      ? "border-amber-400/20"
      : "border-white/10";

  return (
    <div className={`rounded-3xl border ${border} bg-white/[0.06] p-5 shadow-2xl`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
          <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="rounded-2xl bg-white/10 p-3 text-white">{icon}</div>
      </div>
    </div>
  );
}

export default async function RisksPage() {
  await requireRole(["admin", "director", "project_manager"]);

  const [riskProjects, overdueTasks, pendingTimesheets, resourceRisks] =
    await Promise.all([
      getRiskProjects(),
      getOverdueTasks(),
      getPendingTimesheets(),
      getResourceRisks(),
    ]);

  return (
    <main className="min-h-screen bg-[#070A12] px-6 py-8 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>

          <h1 className="mt-4 text-4xl font-semibold text-white">
            Risk Centre
          </h1>
          <p className="mt-2 text-slate-400">
            Monitor project budget pressure, overdue accountability, pending approvals and resource overload.
          </p>
        </div>

        <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Budget Risks"
            value={riskProjects.length}
            subtitle="Projects over 80% hour usage"
            icon={<BarChart3 className="h-6 w-6" />}
            risk={riskProjects.length > 0 ? "medium" : "ok"}
          />
          <SummaryCard
            title="Overdue Tasks"
            value={overdueTasks.length}
            subtitle="Past due and not completed"
            icon={<AlertTriangle className="h-6 w-6" />}
            risk={overdueTasks.length > 0 ? "high" : "ok"}
          />
          <SummaryCard
            title="Pending Timesheets"
            value={pendingTimesheets.length}
            subtitle="Submitted but not approved"
            icon={<CalendarClock className="h-6 w-6" />}
            risk={pendingTimesheets.length > 0 ? "medium" : "ok"}
          />
          <SummaryCard
            title="Resource Overload"
            value={resourceRisks.length}
            subtitle="Staff overallocated this week"
            icon={<Users className="h-6 w-6" />}
            risk={resourceRisks.length > 0 ? "high" : "ok"}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl">
            <h2 className="text-xl font-semibold text-white">Project Budget Risks</h2>
            <p className="mt-1 text-sm text-slate-400">
              Projects that have used 80% or more of budgeted hours.
            </p>

            <div className="mt-6 space-y-4">
              {riskProjects.map((project) => {
                const riskType = project.usage_percent >= 100 ? "high" : "medium";

                return (
                  <div
                    key={project.id}
                    className="rounded-2xl border border-white/10 bg-black/20 p-4"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <Link
                          href={`/projects/${project.id}`}
                          className="font-semibold text-white hover:text-cyan-300"
                        >
                          {project.project_name}
                        </Link>
                        <p className="mt-1 text-sm text-slate-500">
                          {project.project_code ?? "No code"} · {project.client_name ?? "No client"}
                        </p>
                        <p className="mt-2 inline-flex items-center gap-2 text-sm text-slate-400">
                          <UserRound className="h-4 w-4 text-slate-500" />
                          {project.project_manager ?? "No manager"} · {project.current_stage ?? "-"}
                        </p>
                      </div>

                      <RiskBadge
                        label={`${project.usage_percent}% used`}
                        type={riskType}
                      />
                    </div>

                    <div className="mt-4">
                      <div className="mb-1 flex justify-between text-xs text-slate-400">
                        <span>{project.actual_hours}h actual</span>
                        <span>{project.budgeted_hours}h budget</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/10">
                        <div
                          className={`h-2 rounded-full ${
                            riskType === "high" ? "bg-rose-300" : "bg-amber-300"
                          }`}
                          style={{ width: `${Math.min(100, project.usage_percent)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              {riskProjects.length === 0 && (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-8 text-center text-slate-500">
                  No project budget risks detected.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl">
            <h2 className="text-xl font-semibold text-white">Overdue Tasks</h2>
            <p className="mt-1 text-sm text-slate-400">
              Accountability items past due date.
            </p>

            <div className="mt-6 space-y-4">
              {overdueTasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-semibold text-white">{task.task_title}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {task.project_code
                          ? `${task.project_code} - ${task.project_name}`
                          : task.project_name}
                      </p>
                      <p className="mt-2 inline-flex items-center gap-2 text-sm text-slate-400">
                        <UserRound className="h-4 w-4 text-slate-500" />
                        {task.assigned_to_name ?? "Unassigned"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <RiskBadge label={task.priority} type="high" />
                      <RiskBadge label={task.due_date ?? "No date"} type="high" />
                    </div>
                  </div>
                </div>
              ))}

              {overdueTasks.length === 0 && (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-8 text-center text-slate-500">
                  No overdue tasks.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl">
            <h2 className="text-xl font-semibold text-white">Pending Timesheets</h2>
            <p className="mt-1 text-sm text-slate-400">
              Submitted timesheets waiting for approval.
            </p>

            <div className="mt-6 space-y-4">
              {pendingTimesheets.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-semibold text-white">{entry.full_name}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {entry.project_code
                          ? `${entry.project_code} - ${entry.project_name}`
                          : entry.project_name}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <RiskBadge label={entry.work_date} type="medium" />
                      <RiskBadge label={`${entry.hours}h`} type="medium" />
                    </div>
                  </div>
                </div>
              ))}

              {pendingTimesheets.length === 0 && (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-8 text-center text-slate-500">
                  No pending timesheets.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl">
            <h2 className="text-xl font-semibold text-white">Resource Overload</h2>
            <p className="mt-1 text-sm text-slate-400">
              Staff allocated beyond weekly capacity.
            </p>

            <div className="mt-6 space-y-4">
              {resourceRisks.map((staff) => (
                <div
                  key={staff.id}
                  className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-semibold text-white">{staff.full_name}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {staff.role_title ?? "Staff"}
                      </p>
                    </div>

                    <RiskBadge
                      label={`${Math.abs(staff.available_hours)}h over`}
                      type="high"
                    />
                  </div>

                  <div className="mt-4">
                    <div className="mb-1 flex justify-between text-xs text-slate-400">
                      <span>{staff.allocated_hours}h allocated</span>
                      <span>{staff.weekly_capacity_hours}h capacity</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10">
                      <div className="h-2 rounded-full bg-rose-300" style={{ width: "100%" }} />
                    </div>
                  </div>
                </div>
              ))}

              {resourceRisks.length === 0 && (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-8 text-center text-slate-500">
                  No resource overload detected.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
