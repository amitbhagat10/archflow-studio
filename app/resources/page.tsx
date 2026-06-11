import Link from "next/link";
import {
  ArrowLeft,
  Briefcase,
  CalendarDays,
  Plus,
  UserPlus,
  Users,
} from "lucide-react";
import {
  createResourceAllocation,
  createStaff,
} from "@/app/actions/resource-actions";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Staff = {
  id: string;
  full_name: string;
  email: string | null;
  role_title: string | null;
  weekly_capacity_hours: number;
  hourly_cost_rate: number | null;
  billable_rate: number | null;
};

type Project = {
  id: string;
  project_name: string;
  project_code: string | null;
};

type ResourceRow = {
  staff_id: string;
  full_name: string;
  role_title: string | null;
  weekly_capacity_hours: number;
  allocated_hours: number;
  available_hours: number;
};

type Allocation = {
  id: string;
  full_name: string;
  project_name: string;
  project_code: string | null;
  week_start_date: string;
  allocated_hours: number;
  notes: string | null;
};

async function getStaff(): Promise<Staff[]> {
  const result = await query(`
    SELECT
      id,
      full_name,
      email,
      role_title,
      weekly_capacity_hours,
      hourly_cost_rate,
      billable_rate
    FROM staff
    WHERE is_active = true
    ORDER BY full_name
  `);

  return result.rows.map((row) => ({
    id: String(row.id),
    full_name: String(row.full_name),
    email: row.email ? String(row.email) : null,
    role_title: row.role_title ? String(row.role_title) : null,
    weekly_capacity_hours: Number(row.weekly_capacity_hours),
    hourly_cost_rate:
      row.hourly_cost_rate === null ? null : Number(row.hourly_cost_rate),
    billable_rate: row.billable_rate === null ? null : Number(row.billable_rate),
  }));
}

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

async function getResourceRows(): Promise<ResourceRow[]> {
  const result = await query(`
    SELECT
      s.id AS staff_id,
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

  return result.rows.map((row) => ({
    staff_id: String(row.staff_id),
    full_name: String(row.full_name),
    role_title: row.role_title ? String(row.role_title) : null,
    weekly_capacity_hours: Number(row.weekly_capacity_hours),
    allocated_hours: Number(row.allocated_hours),
    available_hours: Number(row.available_hours),
  }));
}

async function getAllocations(): Promise<Allocation[]> {
  const result = await query(`
    SELECT
      ra.id,
      s.full_name,
      p.project_name,
      p.project_code,
      ra.week_start_date::text,
      ra.allocated_hours,
      ra.notes
    FROM resource_allocations ra
    JOIN staff s ON s.id = ra.staff_id
    JOIN projects p ON p.id = ra.project_id
    ORDER BY ra.week_start_date DESC, s.full_name
    LIMIT 20
  `);

  return result.rows.map((row) => ({
    id: String(row.id),
    full_name: String(row.full_name),
    project_name: String(row.project_name),
    project_code: row.project_code ? String(row.project_code) : null,
    week_start_date: String(row.week_start_date),
    allocated_hours: Number(row.allocated_hours),
    notes: row.notes ? String(row.notes) : null,
  }));
}

export default async function ResourcesPage() {
  await requireRole(["admin", "director", "project_manager"]);

  const [staff, projects, resourceRows, allocations] = await Promise.all([
    getStaff(),
    getProjects(),
    getResourceRows(),
    getAllocations(),
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

            <h1 className="mt-4 text-4xl font-semibold text-white">
              Resources
            </h1>
            <p className="mt-2 text-slate-400">
              Manage staff capacity and allocate team members to architecture projects.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
            <p className="text-sm text-slate-400">Active Staff</p>
            <p className="mt-2 text-3xl font-semibold text-white">{staff.length}</p>
          </div>
        </div>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.4fr]">
          <div className="space-y-6">
            <form
              action={createStaff}
              className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl"
            >
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-2xl bg-cyan-400/10 p-3 text-cyan-200">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Add Staff</h2>
                  <p className="text-sm text-slate-400">
                    Add architects, graduates, designers or admin staff.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <input
                  name="full_name"
                  required
                  placeholder="Full name"
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60"
                />

                <input
                  name="email"
                  type="email"
                  placeholder="Email"
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60"
                />

                <input
                  name="role_title"
                  placeholder="Role, e.g. Project Architect"
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60"
                />

                <div className="grid gap-4 md:grid-cols-3">
                  <input
                    name="weekly_capacity_hours"
                    type="number"
                    defaultValue="38"
                    placeholder="Capacity"
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60"
                  />

                  <input
                    name="hourly_cost_rate"
                    type="number"
                    placeholder="Cost rate"
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60"
                  />

                  <input
                    name="billable_rate"
                    type="number"
                    placeholder="Bill rate"
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-2xl bg-cyan-300 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-200"
                >
                  Add Staff
                </button>
              </div>
            </form>

            <form
              action={createResourceAllocation}
              className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl"
            >
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-2xl bg-violet-400/10 p-3 text-violet-200">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    Allocate Hours
                  </h2>
                  <p className="text-sm text-slate-400">
                    Assign weekly project capacity to staff.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <select
                  name="staff_id"
                  required
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300/60"
                >
                  <option value="">Select staff member</option>
                  {staff.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.full_name}
                    </option>
                  ))}
                </select>

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

                <div className="grid gap-4 md:grid-cols-2">
                  <input
                    name="week_start_date"
                    type="date"
                    required
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300/60"
                  />

                  <input
                    name="allocated_hours"
                    type="number"
                    required
                    placeholder="Allocated hours"
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60"
                  />
                </div>

                <textarea
                  name="notes"
                  placeholder="Notes"
                  rows={3}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60"
                />

                <button
                  type="submit"
                  className="w-full rounded-2xl bg-violet-300 px-5 py-3 font-semibold text-slate-950 transition hover:bg-violet-200"
                >
                  Allocate Hours
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl">
              <div className="mb-5 flex items-center gap-3">
                <Users className="h-5 w-5 text-cyan-300" />
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    Weekly Capacity
                  </h2>
                  <p className="text-sm text-slate-400">
                    Current week allocation versus staff capacity.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {resourceRows.map((row) => {
                  const percent =
                    row.weekly_capacity_hours > 0
                      ? Math.min(
                          100,
                          Math.round(
                            (row.allocated_hours / row.weekly_capacity_hours) * 100
                          )
                        )
                      : 0;

                  return (
                    <div
                      key={row.staff_id}
                      className="rounded-2xl border border-white/10 bg-black/20 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-white">{row.full_name}</p>
                          <p className="text-sm text-slate-500">
                            {row.role_title ?? "Staff"}
                          </p>
                        </div>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-medium ${
                            row.available_hours < 0
                              ? "border-rose-400/20 bg-rose-500/15 text-rose-300"
                              : "border-emerald-400/20 bg-emerald-500/15 text-emerald-300"
                          }`}
                        >
                          {row.available_hours < 0 ? "Overallocated" : "Available"}
                        </span>
                      </div>

                      <div className="mt-4">
                        <div className="mb-1 flex justify-between text-xs text-slate-400">
                          <span>{row.allocated_hours}h allocated</span>
                          <span>{row.weekly_capacity_hours}h capacity</span>
                        </div>

                        <div className="h-2 rounded-full bg-white/10">
                          <div
                            className={`h-2 rounded-full ${
                              row.available_hours < 0
                                ? "bg-rose-300"
                                : "bg-emerald-300"
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>

                        <p className="mt-2 text-sm text-slate-500">
                          {row.available_hours}h available this week
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl">
              <div className="mb-5 flex items-center gap-3">
                <Briefcase className="h-5 w-5 text-violet-300" />
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    Recent Allocations
                  </h2>
                  <p className="text-sm text-slate-400">
                    Latest staff-to-project allocations.
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-white/10">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/10 text-xs uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Staff</th>
                      <th className="px-4 py-3">Project</th>
                      <th className="px-4 py-3">Week</th>
                      <th className="px-4 py-3">Hours</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/10">
                    {allocations.map((allocation) => (
                      <tr key={allocation.id} className="hover:bg-white/[0.04]">
                        <td className="px-4 py-4 text-white">
                          {allocation.full_name}
                        </td>
                        <td className="px-4 py-4 text-slate-300">
                          {allocation.project_code
                            ? `${allocation.project_code} - ${allocation.project_name}`
                            : allocation.project_name}
                        </td>
                        <td className="px-4 py-4 text-slate-300">
                          <span className="inline-flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-slate-500" />
                            {allocation.week_start_date}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-slate-300">
                          {allocation.allocated_hours}h
                        </td>
                      </tr>
                    ))}

                    {allocations.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                          No allocations yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
