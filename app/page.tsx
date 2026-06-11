import type { ReactNode } from "react";
import {
  AlertTriangle,
  BarChart3,
  Briefcase,
  CalendarClock,
  Clock3,
  Users,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import {
  getDashboardStats,
  getProjects,
  getStaffUtilisation,
} from "@/lib/archflow";

export const dynamic = "force-dynamic";

function StatCard({
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
    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl backdrop-blur">
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

function Badge({ value }: { value: string }) {
  const lower = value.toLowerCase();

  let style = "border-slate-400/20 bg-slate-500/15 text-slate-300";

  if (lower === "active") style = "border-emerald-400/20 bg-emerald-500/15 text-emerald-300";
  if (lower === "completed") style = "border-blue-400/20 bg-blue-500/15 text-blue-300";
  if (lower === "high") style = "border-rose-400/20 bg-rose-500/15 text-rose-300";
  if (lower === "medium") style = "border-violet-400/20 bg-violet-500/15 text-violet-300";
  if (lower === "low") style = "border-slate-400/20 bg-slate-500/15 text-slate-300";

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${style}`}>
      {value}
    </span>
  );
}

export default async function Home() {
  await requireUser();

  const [stats, projects, staffUtilisation] = await Promise.all([
    getDashboardStats(),
    getProjects(),
    getStaffUtilisation(),
  ]);

  return (
    <main className="min-h-screen bg-[#070A12] text-slate-100">
      <section className="relative overflow-hidden">
        <div className="absolute left-[-10%] top-[-20%] h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute right-[-10%] top-[10%] h-96 w-96 rounded-full bg-violet-500/20 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 py-8">
          <header className="flex flex-col gap-6 border-b border-white/10 pb-8 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200">
                Architecture Project Intelligence
              </div>

              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white md:text-6xl">
                ArchFlow Studio
              </h1>

              <p className="mt-4 max-w-2xl text-slate-400">
                Projects, stages, timesheets, staff capacity and accountability
                in one clean architecture studio dashboard.
              </p>
            </div>


          </header>

          <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <StatCard
              title="Active Projects"
              value={stats.activeProjects}
              subtitle="Currently in progress"
              icon={<Briefcase className="h-6 w-6" />}
            />
            <StatCard
              title="Active Staff"
              value={stats.activeStaff}
              subtitle="Available team members"
              icon={<Users className="h-6 w-6" />}
            />
            <StatCard
              title="Hours This Week"
              value={stats.hoursThisWeek}
              subtitle="Submitted hours"
              icon={<Clock3 className="h-6 w-6" />}
            />
            <StatCard
              title="Pending Timesheets"
              value={stats.pendingTimesheets}
              subtitle="Waiting for approval"
              icon={<CalendarClock className="h-6 w-6" />}
            />
            <StatCard
              title="Overdue Tasks"
              value={stats.overdueTasks}
              subtitle="Need attention"
              icon={<AlertTriangle className="h-6 w-6" />}
            />
            <StatCard
              title="Over Budget"
              value={stats.overBudgetProjects}
              subtitle="Actual over budget"
              icon={<BarChart3 className="h-6 w-6" />}
            />
          </section>

          <section className="mt-8 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur">
              <div className="mb-5">
                <h2 className="text-xl font-semibold text-white">
                  Project Command Centre
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Current architecture projects and delivery status.
                </p>
              </div>

              <div className="overflow-hidden rounded-2xl border border-white/10">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/10 text-xs uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Project</th>
                      <th className="px-4 py-3">Client</th>
                      <th className="px-4 py-3">Manager</th>
                      <th className="px-4 py-3">Stage</th>
                      <th className="px-4 py-3">Hours</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/10">
                    {projects.map((project) => {
                      const budget = Number(project.budgeted_hours ?? 0);
                      const actual = Number(project.actual_hours ?? 0);
                      const percent =
                        budget > 0
                          ? Math.min(100, Math.round((actual / budget) * 100))
                          : 0;

                      return (
                        <tr key={project.id} className="hover:bg-white/[0.04]">
                          <td className="px-4 py-4">
                            <p className="font-medium text-white">{project.project_name}</p>
                            <p className="text-xs text-slate-500">{project.project_code}</p>
                          </td>
                          <td className="px-4 py-4 text-slate-300">
                            {project.client_name ?? "-"}
                          </td>
                          <td className="px-4 py-4 text-slate-300">
                            {project.project_manager ?? "-"}
                          </td>
                          <td className="px-4 py-4 text-slate-300">
                            {project.current_stage ?? "-"}
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
                          <td className="px-4 py-4">
                            <div className="flex gap-2">
                              <Badge value={project.status} />
                              <Badge value={project.priority} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur">
              <h2 className="text-xl font-semibold text-white">Resource Capacity</h2>
              <p className="mt-1 text-sm text-slate-400">
                Weekly staff capacity versus allocated work.
              </p>

              <div className="mt-6 space-y-4">
                {staffUtilisation.map((staff) => {
                  const percent =
                    staff.weekly_capacity_hours > 0
                      ? Math.min(
                          100,
                          Math.round(
                            (staff.allocated_hours / staff.weekly_capacity_hours) * 100
                          )
                        )
                      : 0;

                  return (
                    <div
                      key={staff.id}
                      className="rounded-2xl border border-white/10 bg-black/20 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-white">{staff.full_name}</p>
                          <p className="text-sm text-slate-500">
                            {staff.role_title ?? "Staff"}
                          </p>
                        </div>

                        <p
                          className={`text-sm font-medium ${
                            staff.available_hours < 0
                              ? "text-rose-300"
                              : "text-emerald-300"
                          }`}
                        >
                          {staff.available_hours}h available
                        </p>
                      </div>

                      <div className="mt-4">
                        <div className="mb-1 flex justify-between text-xs text-slate-400">
                          <span>{staff.allocated_hours}h allocated</span>
                          <span>{staff.weekly_capacity_hours}h capacity</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/10">
                          <div
                            className={`h-2 rounded-full ${
                              staff.available_hours < 0
                                ? "bg-rose-300"
                                : "bg-emerald-300"
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
