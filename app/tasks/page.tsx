import type { ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  PlayCircle,
  Plus,
  UserRound,
} from "lucide-react";
import { createTask, updateTaskStatus } from "@/app/actions/task-actions";
import { query } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Project = {
  id: string;
  project_name: string;
  project_code: string | null;
};

type StageOption = {
  id: string;
  project_name: string;
  project_code: string | null;
  stage_name: string;
};

type Staff = {
  id: string;
  full_name: string;
};

type Task = {
  id: string;
  task_title: string;
  task_description: string | null;
  due_date: string | null;
  priority: string;
  status: string;
  project_name: string;
  project_code: string | null;
  stage_name: string | null;
  assigned_to_name: string | null;
  is_overdue: boolean;
};

type Summary = {
  open_tasks: number;
  in_progress_tasks: number;
  overdue_tasks: number;
  done_tasks: number;
};

async function getProjects(): Promise<Project[]> {
  const result = await query(`
    SELECT id, project_name, project_code
    FROM projects
    WHERE status = 'active'
    ORDER BY project_name
  `);

  return result.rows.map((row) => ({
    id: String(row.id),
    project_name: String(row.project_name),
    project_code: row.project_code ? String(row.project_code) : null,
  }));
}

async function getStages(): Promise<StageOption[]> {
  const result = await query(`
    SELECT
      ps.id,
      p.project_name,
      p.project_code,
      ps.stage_name
    FROM project_stages ps
    JOIN projects p ON p.id = ps.project_id
    WHERE p.status = 'active'
    ORDER BY p.project_name, ps.sort_order
  `);

  return result.rows.map((row) => ({
    id: String(row.id),
    project_name: String(row.project_name),
    project_code: row.project_code ? String(row.project_code) : null,
    stage_name: String(row.stage_name),
  }));
}

async function getStaff(): Promise<Staff[]> {
  const result = await query(`
    SELECT id, full_name
    FROM staff
    WHERE is_active = true
    ORDER BY full_name
  `);

  return result.rows.map((row) => ({
    id: String(row.id),
    full_name: String(row.full_name),
  }));
}

async function getTasks(): Promise<Task[]> {
  const result = await query(`
    SELECT
      pt.id,
      pt.task_title,
      pt.task_description,
      pt.due_date::text,
      pt.priority,
      pt.status,
      p.project_name,
      p.project_code,
      ps.stage_name,
      s.full_name AS assigned_to_name,
      CASE
        WHEN pt.due_date IS NOT NULL
          AND pt.due_date < CURRENT_DATE
          AND pt.status NOT IN ('done', 'completed')
        THEN true
        ELSE false
      END AS is_overdue
    FROM project_tasks pt
    JOIN projects p ON p.id = pt.project_id
    LEFT JOIN project_stages ps ON ps.id = pt.stage_id
    LEFT JOIN staff s ON s.id = pt.assigned_to
    ORDER BY
      CASE
        WHEN pt.due_date IS NOT NULL
          AND pt.due_date < CURRENT_DATE
          AND pt.status NOT IN ('done', 'completed')
        THEN 0
        ELSE 1
      END,
      pt.due_date ASC NULLS LAST,
      pt.created_at DESC
    LIMIT 100
  `);

  return result.rows.map((row) => ({
    id: String(row.id),
    task_title: String(row.task_title),
    task_description: row.task_description ? String(row.task_description) : null,
    due_date: row.due_date ? String(row.due_date) : null,
    priority: String(row.priority),
    status: String(row.status),
    project_name: String(row.project_name),
    project_code: row.project_code ? String(row.project_code) : null,
    stage_name: row.stage_name ? String(row.stage_name) : null,
    assigned_to_name: row.assigned_to_name ? String(row.assigned_to_name) : null,
    is_overdue: Boolean(row.is_overdue),
  }));
}

async function getSummary(): Promise<Summary> {
  const result = await query(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'open')::int AS open_tasks,
      COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress_tasks,
      COUNT(*) FILTER (
        WHERE due_date < CURRENT_DATE
          AND status NOT IN ('done', 'completed')
      )::int AS overdue_tasks,
      COUNT(*) FILTER (WHERE status IN ('done', 'completed'))::int AS done_tasks
    FROM project_tasks
  `);

  const row = result.rows[0];

  return {
    open_tasks: Number(row.open_tasks),
    in_progress_tasks: Number(row.in_progress_tasks),
    overdue_tasks: Number(row.overdue_tasks),
    done_tasks: Number(row.done_tasks),
  };
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl">
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

function StatusBadge({ status }: { status: string }) {
  let style = "border-slate-400/20 bg-slate-500/15 text-slate-300";
  let label = status;

  if (status === "open") {
    style = "border-amber-400/20 bg-amber-500/15 text-amber-300";
    label = "Open";
  }

  if (status === "in_progress") {
    style = "border-cyan-400/20 bg-cyan-500/15 text-cyan-300";
    label = "In Progress";
  }

  if (status === "done") {
    style = "border-emerald-400/20 bg-emerald-500/15 text-emerald-300";
    label = "Done";
  }

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  let style = "border-violet-400/20 bg-violet-500/15 text-violet-300";

  if (priority === "high") {
    style = "border-rose-400/20 bg-rose-500/15 text-rose-300";
  }

  if (priority === "low") {
    style = "border-slate-400/20 bg-slate-500/15 text-slate-300";
  }

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${style}`}>
      {priority}
    </span>
  );
}

export default async function TasksPage() {
  await requireUser();

  const [projects, stages, staff, tasks, summary] = await Promise.all([
    getProjects(),
    getStages(),
    getStaff(),
    getTasks(),
    getSummary(),
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
            Tasks & Accountability
          </h1>
          <p className="mt-2 text-slate-400">
            Assign responsibility, track due dates and keep every project stage accountable.
          </p>
        </div>

        <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Open Tasks"
            value={summary.open_tasks}
            subtitle="Waiting to start"
            icon={<ClipboardList className="h-6 w-6" />}
          />
          <SummaryCard
            title="In Progress"
            value={summary.in_progress_tasks}
            subtitle="Currently being worked on"
            icon={<PlayCircle className="h-6 w-6" />}
          />
          <SummaryCard
            title="Overdue"
            value={summary.overdue_tasks}
            subtitle="Past due date"
            icon={<AlertTriangle className="h-6 w-6" />}
          />
          <SummaryCard
            title="Done"
            value={summary.done_tasks}
            subtitle="Completed tasks"
            icon={<CheckCircle2 className="h-6 w-6" />}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.6fr]">
          <form
            action={createTask}
            className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl"
          >
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-2xl bg-cyan-400/10 p-3 text-cyan-200">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">New Task</h2>
                <p className="text-sm text-slate-400">
                  Create a responsibility item for a project or stage.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <select
                name="project_id"
                required
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300/60"
              >
                <option value="">Select project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.project_code
                      ? `${project.project_code} - ${project.project_name}`
                      : project.project_name}
                  </option>
                ))}
              </select>

              <select
                name="stage_id"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300/60"
              >
                <option value="">Optional: select stage</option>
                {stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.project_code
                      ? `${stage.project_code} - ${stage.project_name} / ${stage.stage_name}`
                      : `${stage.project_name} / ${stage.stage_name}`}
                  </option>
                ))}
              </select>

              <select
                name="assigned_to"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300/60"
              >
                <option value="">Assign to staff</option>
                {staff.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name}
                  </option>
                ))}
              </select>

              <input
                name="task_title"
                required
                placeholder="Task title, e.g. Submit planning drawings"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60"
              />

              <textarea
                name="task_description"
                rows={4}
                placeholder="Task notes or instructions"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60"
              />

              <div className="grid gap-4 md:grid-cols-2">
                <input
                  name="due_date"
                  type="date"
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300/60"
                />

                <select
                  name="priority"
                  defaultValue="medium"
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300/60"
                >
                  <option value="low">Low priority</option>
                  <option value="medium">Medium priority</option>
                  <option value="high">High priority</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full rounded-2xl bg-cyan-300 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-200"
              >
                Create Task
              </button>
            </div>
          </form>

          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl">
            <h2 className="text-xl font-semibold text-white">
              Accountability Register
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Live task ownership across projects and stages.
            </p>

            <div className="mt-6 space-y-4">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={`rounded-2xl border p-4 ${
                    task.is_overdue
                      ? "border-rose-400/20 bg-rose-500/10"
                      : "border-white/10 bg-black/20"
                  }`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={task.status} />
                        <PriorityBadge priority={task.priority} />
                        {task.is_overdue && (
                          <span className="rounded-full border border-rose-400/20 bg-rose-500/15 px-3 py-1 text-xs font-medium text-rose-300">
                            Overdue
                          </span>
                        )}
                      </div>

                      <h3 className="mt-3 text-lg font-semibold text-white">
                        {task.task_title}
                      </h3>

                      {task.task_description && (
                        <p className="mt-1 text-sm text-slate-400">
                          {task.task_description}
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-400">
                        <span className="inline-flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-slate-500" />
                          {task.project_code
                            ? `${task.project_code} - ${task.project_name}`
                            : task.project_name}
                        </span>

                        <span className="inline-flex items-center gap-2">
                          <ClipboardList className="h-4 w-4 text-slate-500" />
                          {task.stage_name ?? "No stage"}
                        </span>

                        <span className="inline-flex items-center gap-2">
                          <UserRound className="h-4 w-4 text-slate-500" />
                          {task.assigned_to_name ?? "Unassigned"}
                        </span>

                        <span className="inline-flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-slate-500" />
                          {task.due_date ?? "No due date"}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {task.status !== "open" && (
                        <form action={updateTaskStatus}>
                          <input type="hidden" name="task_id" value={task.id} />
                          <input type="hidden" name="status" value="open" />
                          <button
                            type="submit"
                            className="rounded-xl bg-slate-300 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-slate-200"
                          >
                            Open
                          </button>
                        </form>
                      )}

                      {task.status !== "in_progress" && (
                        <form action={updateTaskStatus}>
                          <input type="hidden" name="task_id" value={task.id} />
                          <input type="hidden" name="status" value="in_progress" />
                          <button
                            type="submit"
                            className="rounded-xl bg-cyan-300 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-200"
                          >
                            Start
                          </button>
                        </form>
                      )}

                      {task.status !== "done" && (
                        <form action={updateTaskStatus}>
                          <input type="hidden" name="task_id" value={task.id} />
                          <input type="hidden" name="status" value="done" />
                          <button
                            type="submit"
                            className="rounded-xl bg-emerald-300 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-200"
                          >
                            Done
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {tasks.length === 0 && (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-10 text-center text-slate-500">
                  No tasks yet. Create the first accountability item from the form.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
