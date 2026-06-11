import Link from "next/link";
import {
  ArrowLeft,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  DollarSign,
  MapPin,
  UserRound,
} from "lucide-react";
import { updateStageStatus } from "@/app/actions/stage-actions";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type ProjectDetail = {
  id: string;
  project_name: string;
  project_code: string | null;
  project_address: string | null;
  client_name: string | null;
  project_manager: string | null;
  status: string;
  current_stage: string | null;
  priority: string;
  start_date: string | null;
  target_completion_date: string | null;
  fee_budget: number | null;
  budgeted_hours: number | null;
  actual_hours: number;
};

type Stage = {
  id: string;
  stage_name: string;
  stage_owner: string | null;
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  budgeted_hours: number | null;
  actual_hours: number;
  status: string;
  sort_order: number;
};

type Timesheet = {
  id: string;
  work_date: string;
  full_name: string;
  stage_name: string | null;
  hours: number;
  is_billable: boolean;
  approval_status: string;
  description: string | null;
};

type Task = {
  id: string;
  task_title: string;
  due_date: string | null;
  priority: string;
  status: string;
  assigned_to_name: string | null;
  stage_name: string | null;
  is_overdue: boolean;
};

async function getProject(projectId: string): Promise<ProjectDetail | null> {
  const result = await query(
    `
    SELECT
      p.id,
      p.project_name,
      p.project_code,
      p.project_address,
      c.client_name,
      s.full_name AS project_manager,
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
      ), p.actual_hours, 0)::numeric AS actual_hours
    FROM projects p
    LEFT JOIN clients c ON c.id = p.client_id
    LEFT JOIN staff s ON s.id = p.project_manager_id
    WHERE p.id = $1
    LIMIT 1
    `,
    [projectId]
  );

  const row = result.rows[0];

  if (!row) return null;

  return {
    id: String(row.id),
    project_name: String(row.project_name),
    project_code: row.project_code ? String(row.project_code) : null,
    project_address: row.project_address ? String(row.project_address) : null,
    client_name: row.client_name ? String(row.client_name) : null,
    project_manager: row.project_manager ? String(row.project_manager) : null,
    status: String(row.status),
    current_stage: row.current_stage ? String(row.current_stage) : null,
    priority: String(row.priority),
    start_date: row.start_date ? String(row.start_date) : null,
    target_completion_date: row.target_completion_date
      ? String(row.target_completion_date)
      : null,
    fee_budget: row.fee_budget === null ? null : Number(row.fee_budget),
    budgeted_hours: row.budgeted_hours === null ? null : Number(row.budgeted_hours),
    actual_hours: Number(row.actual_hours),
  };
}

async function getStages(projectId: string): Promise<Stage[]> {
  const result = await query(
    `
    SELECT
      ps.id,
      ps.stage_name,
      s.full_name AS stage_owner,
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
      ps.status,
      ps.sort_order
    FROM project_stages ps
    LEFT JOIN staff s ON s.id = ps.stage_owner_id
    WHERE ps.project_id = $1
    ORDER BY ps.sort_order
    `,
    [projectId]
  );

  return result.rows.map((row) => ({
    id: String(row.id),
    stage_name: String(row.stage_name),
    stage_owner: row.stage_owner ? String(row.stage_owner) : null,
    planned_start_date: row.planned_start_date ? String(row.planned_start_date) : null,
    planned_end_date: row.planned_end_date ? String(row.planned_end_date) : null,
    actual_start_date: row.actual_start_date ? String(row.actual_start_date) : null,
    actual_end_date: row.actual_end_date ? String(row.actual_end_date) : null,
    budgeted_hours: row.budgeted_hours === null ? null : Number(row.budgeted_hours),
    actual_hours: Number(row.actual_hours),
    status: String(row.status),
    sort_order: Number(row.sort_order),
  }));
}

async function getTimesheets(projectId: string): Promise<Timesheet[]> {
  const result = await query(
    `
    SELECT
      t.id,
      t.work_date::text,
      s.full_name,
      ps.stage_name,
      t.hours,
      t.is_billable,
      t.approval_status,
      t.description
    FROM timesheets t
    JOIN staff s ON s.id = t.staff_id
    LEFT JOIN project_stages ps ON ps.id = t.stage_id
    WHERE t.project_id = $1
    ORDER BY t.work_date DESC, t.created_at DESC
    LIMIT 20
    `,
    [projectId]
  );

  return result.rows.map((row) => ({
    id: String(row.id),
    work_date: String(row.work_date),
    full_name: String(row.full_name),
    stage_name: row.stage_name ? String(row.stage_name) : null,
    hours: Number(row.hours),
    is_billable: Boolean(row.is_billable),
    approval_status: String(row.approval_status),
    description: row.description ? String(row.description) : null,
  }));
}

async function getTasks(projectId: string): Promise<Task[]> {
  const result = await query(
    `
    SELECT
      pt.id,
      pt.task_title,
      pt.due_date::text,
      pt.priority,
      pt.status,
      s.full_name AS assigned_to_name,
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
    ORDER BY pt.due_date ASC NULLS LAST, pt.created_at DESC
    LIMIT 20
    `,
    [projectId]
  );

  return result.rows.map((row) => ({
    id: String(row.id),
    task_title: String(row.task_title),
    due_date: row.due_date ? String(row.due_date) : null,
    priority: String(row.priority),
    status: String(row.status),
    assigned_to_name: row.assigned_to_name ? String(row.assigned_to_name) : null,
    stage_name: row.stage_name ? String(row.stage_name) : null,
    is_overdue: Boolean(row.is_overdue),
  }));
}

function StatusBadge({ value }: { value: string }) {
  let style = "border-slate-400/20 bg-slate-500/15 text-slate-300";
  let label = value;

  if (value === "active" || value === "completed" || value === "done") {
    style = "border-emerald-400/20 bg-emerald-500/15 text-emerald-300";
  }

  if (value === "in_progress") {
    style = "border-cyan-400/20 bg-cyan-500/15 text-cyan-300";
    label = "in progress";
  }

  if (value === "not_started" || value === "open" || value === "submitted") {
    style = "border-amber-400/20 bg-amber-500/15 text-amber-300";
    label = value.replace("_", " ");
  }

  if (value === "high" || value === "overdue") {
    style = "border-rose-400/20 bg-rose-500/15 text-rose-300";
  }

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-medium capitalize ${style}`}>
      {label}
    </span>
  );
}

function MetricCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
          <p className="mt-2 text-sm text-slate-500">{sub}</p>
        </div>
        <div className="rounded-2xl bg-white/10 p-3 text-white">{icon}</div>
      </div>
    </div>
  );
}

export default async function ProjectDetailPage({ params }: PageProps) {
  await requireRole(["admin", "director", "project_manager"]);

  const { id } = await params;

  const [project, stages, timesheets, tasks] = await Promise.all([
    getProject(id),
    getStages(id),
    getTimesheets(id),
    getTasks(id),
  ]);

  if (!project) {
    return (
      <main className="min-h-screen bg-[#070A12] px-6 py-8 text-slate-100">
        <div className="mx-auto max-w-7xl">
          <Link href="/projects" className="text-slate-400 hover:text-white">
            Back to projects
          </Link>
          <h1 className="mt-6 text-3xl font-semibold text-white">
            Project not found
          </h1>
        </div>
      </main>
    );
  }

  const budgetedHours = Number(project.budgeted_hours ?? 0);
  const actualHours = Number(project.actual_hours ?? 0);
  const hoursPercent =
    budgetedHours > 0 ? Math.min(100, Math.round((actualHours / budgetedHours) * 100)) : 0;

  const completedStages = stages.filter((stage) => stage.status === "completed").length;
  const stageProgress =
    stages.length > 0 ? Math.round((completedStages / stages.length) * 100) : 0;

  return (
    <main className="min-h-screen bg-[#070A12] px-6 py-8 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to projects
          </Link>

          <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge value={project.status} />
                <StatusBadge value={project.priority} />
              </div>

              <h1 className="mt-4 text-4xl font-semibold text-white">
                {project.project_name}
              </h1>

              <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-400">
                <span className="inline-flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-slate-500" />
                  {project.project_code ?? "No project code"}
                </span>

                <span className="inline-flex items-center gap-2">
                  <UserRound className="h-4 w-4 text-slate-500" />
                  {project.project_manager ?? "No manager"}
                </span>

                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-500" />
                  {project.project_address ?? "No address"}
                </span>
              </div>
            </div>

            <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-5">
              <p className="text-sm text-cyan-200">Current Stage</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {project.current_stage ?? "-"}
              </p>
            </div>
          </div>
        </div>

        <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Client"
            value={project.client_name ?? "-"}
            sub="Project client"
            icon={<Briefcase className="h-6 w-6" />}
          />
          <MetricCard
            label="Fee Budget"
            value={`$${Number(project.fee_budget ?? 0).toLocaleString()}`}
            sub="Approved fee"
            icon={<DollarSign className="h-6 w-6" />}
          />
          <MetricCard
            label="Hours Used"
            value={`${actualHours}h`}
            sub={`${budgetedHours}h budgeted`}
            icon={<Clock3 className="h-6 w-6" />}
          />
          <MetricCard
            label="Stage Progress"
            value={`${stageProgress}%`}
            sub={`${completedStages} of ${stages.length} stages completed`}
            icon={<CheckCircle2 className="h-6 w-6" />}
          />
        </section>

        <section className="mb-8 rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">
                Budget vs Actual Hours
              </h2>
              <p className="text-sm text-slate-400">
                Tracks project effort against the approved hour budget.
              </p>
            </div>
            <p className="text-sm text-slate-400">
              {actualHours}h / {budgetedHours}h
            </p>
          </div>

          <div className="h-3 rounded-full bg-white/10">
            <div
              className={`h-3 rounded-full ${
                actualHours > budgetedHours && budgetedHours > 0
                  ? "bg-rose-300"
                  : "bg-cyan-300"
              }`}
              style={{ width: `${hoursPercent}%` }}
            />
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl">
              <h2 className="text-xl font-semibold text-white">Project Stages</h2>
              <p className="mt-1 text-sm text-slate-400">
                Update stage progress and monitor stage-level hours.
              </p>

              <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/10 text-xs uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Stage</th>
                      <th className="px-4 py-3">Dates</th>
                      <th className="px-4 py-3">Hours</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/10">
                    {stages.map((stage) => {
                      const stageBudget = Number(stage.budgeted_hours ?? 0);
                      const stageActual = Number(stage.actual_hours ?? 0);
                      const stagePercent =
                        stageBudget > 0
                          ? Math.min(100, Math.round((stageActual / stageBudget) * 100))
                          : 0;

                      return (
                        <tr key={stage.id} className="hover:bg-white/[0.04]">
                          <td className="px-4 py-4">
                            <p className="font-medium text-white">
                              {stage.sort_order}. {stage.stage_name}
                            </p>
                            <p className="text-xs text-slate-500">
                              Owner: {stage.stage_owner ?? "Unassigned"}
                            </p>
                          </td>

                          <td className="px-4 py-4 text-slate-300">
                            <span className="inline-flex items-center gap-2">
                              <CalendarDays className="h-4 w-4 text-slate-500" />
                              {stage.planned_start_date ?? "-"} →{" "}
                              {stage.planned_end_date ?? "-"}
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            <div className="min-w-28">
                              <div className="mb-1 flex justify-between text-xs text-slate-400">
                                <span>{stageActual}h</span>
                                <span>{stageBudget}h</span>
                              </div>
                              <div className="h-2 rounded-full bg-white/10">
                                <div
                                  className="h-2 rounded-full bg-cyan-300"
                                  style={{ width: `${stagePercent}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <StatusBadge value={stage.status} />
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex flex-wrap gap-2">
                              {stage.status !== "in_progress" && (
                                <form action={updateStageStatus}>
                                  <input type="hidden" name="stage_id" value={stage.id} />
                                  <input type="hidden" name="project_id" value={project.id} />
                                  <input type="hidden" name="status" value="in_progress" />
                                  <button
                                    type="submit"
                                    className="rounded-xl bg-cyan-300 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-200"
                                  >
                                    Start
                                  </button>
                                </form>
                              )}

                              {stage.status !== "completed" && (
                                <form action={updateStageStatus}>
                                  <input type="hidden" name="stage_id" value={stage.id} />
                                  <input type="hidden" name="project_id" value={project.id} />
                                  <input type="hidden" name="status" value="completed" />
                                  <button
                                    type="submit"
                                    className="rounded-xl bg-emerald-300 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-200"
                                  >
                                    Complete
                                  </button>
                                </form>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl">
              <h2 className="text-xl font-semibold text-white">Project Timesheets</h2>
              <p className="mt-1 text-sm text-slate-400">
                Latest time submitted against this project.
              </p>

              <div className="mt-6 space-y-3">
                {timesheets.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-2xl border border-white/10 bg-black/20 p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="font-medium text-white">{entry.full_name}</p>
                        <p className="text-sm text-slate-400">
                          {entry.stage_name ?? "No stage"} · {entry.work_date}
                        </p>
                        {entry.description && (
                          <p className="mt-1 text-sm text-slate-500">
                            {entry.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <StatusBadge value={entry.approval_status} />
                        <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-slate-300">
                          {entry.hours}h
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {timesheets.length === 0 && (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-8 text-center text-slate-500">
                    No timesheets have been logged for this project yet.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl">
            <h2 className="text-xl font-semibold text-white">Project Accountability</h2>
            <p className="mt-1 text-sm text-slate-400">
              Tasks linked to this project.
            </p>

            <div className="mt-6 space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={`rounded-2xl border p-4 ${
                    task.is_overdue
                      ? "border-rose-400/20 bg-rose-500/10"
                      : "border-white/10 bg-black/20"
                  }`}
                >
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge value={task.status} />
                    <StatusBadge value={task.priority} />
                    {task.is_overdue && <StatusBadge value="overdue" />}
                  </div>

                  <h3 className="mt-3 font-semibold text-white">{task.task_title}</h3>

                  <div className="mt-3 space-y-2 text-sm text-slate-400">
                    <p className="inline-flex items-center gap-2">
                      <UserRound className="h-4 w-4 text-slate-500" />
                      {task.assigned_to_name ?? "Unassigned"}
                    </p>

                    <p className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-slate-500" />
                      {task.stage_name ?? "No stage"}
                    </p>

                    <p className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-slate-500" />
                      {task.due_date ?? "No due date"}
                    </p>
                  </div>
                </div>
              ))}

              {tasks.length === 0 && (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-8 text-center text-slate-500">
                  No tasks have been created for this project yet.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
