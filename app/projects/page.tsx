import Link from "next/link";
import { ArrowLeft, Building2, CalendarDays, Plus, UserRound } from "lucide-react";
import { createProject } from "@/app/actions/project-actions";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Client = {
  id: string;
  client_name: string;
};

type Staff = {
  id: string;
  full_name: string;
};

type Project = {
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
  start_date: string | null;
  target_completion_date: string | null;
};

async function getClients(): Promise<Client[]> {
  const result = await query(`
    SELECT id, client_name
    FROM clients
    ORDER BY client_name
  `);

  return result.rows.map((row) => ({
    id: String(row.id),
    client_name: String(row.client_name),
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

async function getProjects(): Promise<Project[]> {
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
      COALESCE(SUM(t.hours), p.actual_hours, 0)::numeric AS actual_hours,
      p.start_date::text,
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
      p.start_date,
      p.target_completion_date,
      p.created_at
    ORDER BY p.created_at DESC
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
    start_date: row.start_date ? String(row.start_date) : null,
    target_completion_date: row.target_completion_date
      ? String(row.target_completion_date)
      : null,
  }));
}

export default async function ProjectsPage() {
  await requireRole(["admin", "director", "project_manager"]);

  const [clients, staff, projects] = await Promise.all([
    getClients(),
    getStaff(),
    getProjects(),
  ]);

  return (
    <main className="min-h-screen bg-[#070A12] px-6 py-8 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to dashboard
            </Link>

            <h1 className="mt-4 text-4xl font-semibold text-white">Projects</h1>
            <p className="mt-2 text-slate-400">
              Create architecture projects, assign managers and track budgeted hours.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
            <p className="text-sm text-slate-400">Total Projects</p>
            <p className="mt-2 text-3xl font-semibold text-white">{projects.length}</p>
          </div>
        </div>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.6fr]">
          <form
            action={createProject}
            className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl"
          >
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-2xl bg-cyan-400/10 p-3 text-cyan-200">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">New Project</h2>
                <p className="text-sm text-slate-400">
                  Add a project and auto-create default architecture stages.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <input
                name="project_name"
                required
                placeholder="Project name"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60"
              />

              <input
                name="project_code"
                placeholder="Project code, e.g. AR-002"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60"
              />

              <input
                name="project_address"
                placeholder="Project address"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60"
              />

              <select
                name="client_id"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300/60"
              >
                <option value="">Select client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.client_name}
                  </option>
                ))}
              </select>

              <select
                name="project_manager_id"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300/60"
              >
                <option value="">Select project manager</option>
                {staff.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name}
                  </option>
                ))}
              </select>

              <div className="grid gap-4 md:grid-cols-2">
                <input
                  name="start_date"
                  type="date"
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300/60"
                />

                <input
                  name="target_completion_date"
                  type="date"
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300/60"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <input
                  name="fee_budget"
                  type="number"
                  placeholder="Fee budget"
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60"
                />

                <input
                  name="budgeted_hours"
                  type="number"
                  placeholder="Budgeted hours"
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60"
                />
              </div>

              <select
                name="priority"
                defaultValue="medium"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300/60"
              >
                <option value="low">Low priority</option>
                <option value="medium">Medium priority</option>
                <option value="high">High priority</option>
              </select>

              <button
                type="submit"
                className="w-full rounded-2xl bg-cyan-300 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-200"
              >
                Create Project
              </button>
            </div>
          </form>

          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl">
            <h2 className="text-xl font-semibold text-white">Project Register</h2>
            <p className="mt-1 text-sm text-slate-400">
              Live projects from AWS Postgres.
            </p>

            <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/10 text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Project</th>
                    <th className="px-4 py-3">Client</th>
                    <th className="px-4 py-3">Manager</th>
                    <th className="px-4 py-3">Dates</th>
                    <th className="px-4 py-3">Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {projects.map((project) => {
                    const budget = Number(project.budgeted_hours ?? 0);
                    const actual = Number(project.actual_hours ?? 0);
                    const percent =
                      budget > 0 ? Math.min(100, Math.round((actual / budget) * 100)) : 0;

                    return (
                      <tr key={project.id} className="hover:bg-white/[0.04]">
                        <td className="px-4 py-4">
                          <div className="flex items-start gap-3">
                            <Building2 className="mt-1 h-4 w-4 text-cyan-300" />
                            <div>
                              <Link
                                href={`/projects/${project.id}`}
                                className="font-medium text-white hover:text-cyan-300"
                              >
                                {project.project_name}
                              </Link>
                              <p className="text-xs text-slate-500">
                                {project.project_code ?? "No code"} · {project.current_stage ?? "-"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-slate-300">
                          {project.client_name ?? "-"}
                        </td>
                        <td className="px-4 py-4 text-slate-300">
                          <span className="inline-flex items-center gap-2">
                            <UserRound className="h-4 w-4 text-slate-500" />
                            {project.project_manager ?? "-"}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-slate-300">
                          <span className="inline-flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-slate-500" />
                            {project.start_date ?? "-"} →{" "}
                            {project.target_completion_date ?? "-"}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="min-w-28">
                            <div className="mb-1 flex justify-between text-xs text-slate-400">
                              <span>{actual}h</span>
                              <span>{budget}h</span>
                            </div>
                            <div className="h-2 rounded-full bg-white/10">
                              <div
                                className="h-2 rounded-full bg-cyan-300"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {projects.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                        No projects yet. Create your first project from the form.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
