import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  Briefcase,
  Clock3,
  DollarSign,
  Layers3,
  Percent,
  Users,
} from "lucide-react";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Summary = {
  total_projects: number;
  total_fee_budget: number;
  total_budgeted_hours: number;
  total_actual_hours: number;
  billable_hours: number;
  non_billable_hours: number;
};

type ProjectReport = {
  id: string;
  project_name: string;
  project_code: string | null;
  client_name: string | null;
  fee_budget: number;
  budgeted_hours: number;
  actual_hours: number;
  estimated_cost: number;
  estimated_margin: number;
  hours_variance: number;
};

type StaffReport = {
  id: string;
  full_name: string;
  role_title: string | null;
  weekly_capacity_hours: number;
  timesheet_hours: number;
  billable_hours: number;
  utilisation_percent: number;
};

type StageReport = {
  stage_name: string;
  project_count: number;
  budgeted_hours: number;
  actual_hours: number;
};

async function getSummary(): Promise<Summary> {
  const result = await query(`
    SELECT
      (SELECT COUNT(*) FROM projects)::int AS total_projects,
      COALESCE((SELECT SUM(fee_budget) FROM projects), 0)::numeric AS total_fee_budget,
      COALESCE((SELECT SUM(budgeted_hours) FROM projects), 0)::numeric AS total_budgeted_hours,
      COALESCE((SELECT SUM(hours) FROM timesheets), 0)::numeric AS total_actual_hours,
      COALESCE((SELECT SUM(hours) FROM timesheets WHERE is_billable = true), 0)::numeric AS billable_hours,
      COALESCE((SELECT SUM(hours) FROM timesheets WHERE is_billable = false), 0)::numeric AS non_billable_hours
  `);

  const row = result.rows[0];

  return {
    total_projects: Number(row.total_projects),
    total_fee_budget: Number(row.total_fee_budget),
    total_budgeted_hours: Number(row.total_budgeted_hours),
    total_actual_hours: Number(row.total_actual_hours),
    billable_hours: Number(row.billable_hours),
    non_billable_hours: Number(row.non_billable_hours),
  };
}

async function getProjectReports(): Promise<ProjectReport[]> {
  const result = await query(`
    SELECT
      p.id,
      p.project_name,
      p.project_code,
      c.client_name,
      COALESCE(p.fee_budget, 0)::numeric AS fee_budget,
      COALESCE(p.budgeted_hours, 0)::numeric AS budgeted_hours,
      COALESCE(SUM(t.hours), 0)::numeric AS actual_hours,
      COALESCE(SUM(t.hours * COALESCE(s.hourly_cost_rate, 0)), 0)::numeric AS estimated_cost,
      (
        COALESCE(p.fee_budget, 0)
        - COALESCE(SUM(t.hours * COALESCE(s.hourly_cost_rate, 0)), 0)
      )::numeric AS estimated_margin,
      (
        COALESCE(p.budgeted_hours, 0)
        - COALESCE(SUM(t.hours), 0)
      )::numeric AS hours_variance
    FROM projects p
    LEFT JOIN clients c ON c.id = p.client_id
    LEFT JOIN timesheets t ON t.project_id = p.id
    LEFT JOIN staff s ON s.id = t.staff_id
    GROUP BY
      p.id,
      p.project_name,
      p.project_code,
      c.client_name,
      p.fee_budget,
      p.budgeted_hours,
      p.created_at
    ORDER BY p.created_at DESC
  `);

  return result.rows.map((row) => ({
    id: String(row.id),
    project_name: String(row.project_name),
    project_code: row.project_code ? String(row.project_code) : null,
    client_name: row.client_name ? String(row.client_name) : null,
    fee_budget: Number(row.fee_budget),
    budgeted_hours: Number(row.budgeted_hours),
    actual_hours: Number(row.actual_hours),
    estimated_cost: Number(row.estimated_cost),
    estimated_margin: Number(row.estimated_margin),
    hours_variance: Number(row.hours_variance),
  }));
}

async function getStaffReports(): Promise<StaffReport[]> {
  const result = await query(`
    SELECT
      s.id,
      s.full_name,
      s.role_title,
      s.weekly_capacity_hours,
      COALESCE(SUM(t.hours), 0)::numeric AS timesheet_hours,
      COALESCE(SUM(t.hours) FILTER (WHERE t.is_billable = true), 0)::numeric AS billable_hours,
      CASE
        WHEN s.weekly_capacity_hours > 0
        THEN ROUND((COALESCE(SUM(t.hours), 0) / s.weekly_capacity_hours) * 100, 1)
        ELSE 0
      END::numeric AS utilisation_percent
    FROM staff s
    LEFT JOIN timesheets t
      ON t.staff_id = s.id
      AND t.work_date >= date_trunc('week', CURRENT_DATE)::date
    WHERE s.is_active = true
    GROUP BY
      s.id,
      s.full_name,
      s.role_title,
      s.weekly_capacity_hours
    ORDER BY s.full_name
  `);

  return result.rows.map((row) => ({
    id: String(row.id),
    full_name: String(row.full_name),
    role_title: row.role_title ? String(row.role_title) : null,
    weekly_capacity_hours: Number(row.weekly_capacity_hours),
    timesheet_hours: Number(row.timesheet_hours),
    billable_hours: Number(row.billable_hours),
    utilisation_percent: Number(row.utilisation_percent),
  }));
}

async function getStageReports(): Promise<StageReport[]> {
  const result = await query(`
    SELECT
      ps.stage_name,
      COUNT(DISTINCT ps.project_id)::int AS project_count,
      COALESCE(SUM(ps.budgeted_hours), 0)::numeric AS budgeted_hours,
      COALESCE(SUM(t.hours), 0)::numeric AS actual_hours
    FROM project_stages ps
    LEFT JOIN timesheets t ON t.stage_id = ps.id
    GROUP BY ps.stage_name
    ORDER BY MIN(ps.sort_order)
  `);

  return result.rows.map((row) => ({
    stage_name: String(row.stage_name),
    project_count: Number(row.project_count),
    budgeted_hours: Number(row.budgeted_hours),
    actual_hours: Number(row.actual_hours),
  }));
}

function MetricCard({
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

function money(value: number) {
  return `$${Math.round(value).toLocaleString()}`;
}

export default async function ReportsPage() {
  await requireRole(["admin", "director", "project_manager"]);

  const [summary, projects, staff, stages] = await Promise.all([
    getSummary(),
    getProjectReports(),
    getStaffReports(),
    getStageReports(),
  ]);

  const billablePercent =
    summary.total_actual_hours > 0
      ? Math.round((summary.billable_hours / summary.total_actual_hours) * 100)
      : 0;

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
            Reports
          </h1>
          <p className="mt-2 text-slate-400">
            Project performance, staff utilisation and architecture stage reporting.
          </p>
        </div>

        <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <MetricCard
            title="Projects"
            value={summary.total_projects}
            subtitle="Total project records"
            icon={<Briefcase className="h-6 w-6" />}
          />
          <MetricCard
            title="Fee Budget"
            value={money(summary.total_fee_budget)}
            subtitle="Total project fees"
            icon={<DollarSign className="h-6 w-6" />}
          />
          <MetricCard
            title="Budgeted Hours"
            value={`${summary.total_budgeted_hours}h`}
            subtitle="Approved effort"
            icon={<Clock3 className="h-6 w-6" />}
          />
          <MetricCard
            title="Actual Hours"
            value={`${summary.total_actual_hours}h`}
            subtitle="Timesheet effort"
            icon={<BarChart3 className="h-6 w-6" />}
          />
          <MetricCard
            title="Billable"
            value={`${billablePercent}%`}
            subtitle={`${summary.billable_hours}h billable`}
            icon={<Percent className="h-6 w-6" />}
          />
          <MetricCard
            title="Non-Billable"
            value={`${summary.non_billable_hours}h`}
            subtitle="Internal / admin time"
            icon={<Layers3 className="h-6 w-6" />}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl">
            <h2 className="text-xl font-semibold text-white">
              Project Profitability & Hours
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Fee budget, estimated staff cost, margin and hour variance.
            </p>

            <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/10 text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Project</th>
                    <th className="px-4 py-3">Fee</th>
                    <th className="px-4 py-3">Cost</th>
                    <th className="px-4 py-3">Margin</th>
                    <th className="px-4 py-3">Hours</th>
                    <th className="px-4 py-3">Variance</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/10">
                  {projects.map((project) => {
                    const budget = Number(project.budgeted_hours);
                    const actual = Number(project.actual_hours);
                    const percent =
                      budget > 0 ? Math.min(100, Math.round((actual / budget) * 100)) : 0;

                    return (
                      <tr key={project.id} className="hover:bg-white/[0.04]">
                        <td className="px-4 py-4">
                          <Link
                            href={`/projects/${project.id}`}
                            className="font-medium text-white hover:text-cyan-300"
                          >
                            {project.project_name}
                          </Link>
                          <p className="text-xs text-slate-500">
                            {project.project_code ?? "No code"} ·{" "}
                            {project.client_name ?? "No client"}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-slate-300">
                          {money(project.fee_budget)}
                        </td>

                        <td className="px-4 py-4 text-slate-300">
                          {money(project.estimated_cost)}
                        </td>

                        <td
                          className={`px-4 py-4 font-medium ${
                            project.estimated_margin < 0
                              ? "text-rose-300"
                              : "text-emerald-300"
                          }`}
                        >
                          {money(project.estimated_margin)}
                        </td>

                        <td className="px-4 py-4">
                          <div className="min-w-28">
                            <div className="mb-1 flex justify-between text-xs text-slate-400">
                              <span>{actual}h</span>
                              <span>{budget}h</span>
                            </div>
                            <div className="h-2 rounded-full bg-white/10">
                              <div
                                className={`h-2 rounded-full ${
                                  actual > budget && budget > 0
                                    ? "bg-rose-300"
                                    : "bg-cyan-300"
                                }`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td
                          className={`px-4 py-4 font-medium ${
                            project.hours_variance < 0
                              ? "text-rose-300"
                              : "text-emerald-300"
                          }`}
                        >
                          {project.hours_variance}h
                        </td>
                      </tr>
                    );
                  })}

                  {projects.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                        No project report data yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl">
              <div className="mb-5 flex items-center gap-3">
                <Users className="h-5 w-5 text-cyan-300" />
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    Staff Utilisation
                  </h2>
                  <p className="text-sm text-slate-400">
                    Current week submitted hours.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {staff.map((member) => {
                  const percent = Math.min(100, Math.round(member.utilisation_percent));

                  return (
                    <div
                      key={member.id}
                      className="rounded-2xl border border-white/10 bg-black/20 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-white">{member.full_name}</p>
                          <p className="text-sm text-slate-500">
                            {member.role_title ?? "Staff"}
                          </p>
                        </div>

                        <p className="text-sm font-medium text-cyan-300">
                          {member.utilisation_percent}%
                        </p>
                      </div>

                      <div className="mt-4">
                        <div className="mb-1 flex justify-between text-xs text-slate-400">
                          <span>{member.timesheet_hours}h logged</span>
                          <span>{member.weekly_capacity_hours}h capacity</span>
                        </div>

                        <div className="h-2 rounded-full bg-white/10">
                          <div
                            className="h-2 rounded-full bg-cyan-300"
                            style={{ width: `${percent}%` }}
                          />
                        </div>

                        <p className="mt-2 text-xs text-slate-500">
                          {member.billable_hours}h billable this week
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl">
              <div className="mb-5 flex items-center gap-3">
                <Layers3 className="h-5 w-5 text-violet-300" />
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    Stage Hours
                  </h2>
                  <p className="text-sm text-slate-400">
                    Hours grouped by architecture stage.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {stages.map((stage) => {
                  const percent =
                    stage.budgeted_hours > 0
                      ? Math.min(
                          100,
                          Math.round((stage.actual_hours / stage.budgeted_hours) * 100)
                        )
                      : 0;

                  return (
                    <div
                      key={stage.stage_name}
                      className="rounded-2xl border border-white/10 bg-black/20 p-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium text-white">{stage.stage_name}</p>
                          <p className="text-xs text-slate-500">
                            {stage.project_count} project
                            {stage.project_count === 1 ? "" : "s"}
                          </p>
                        </div>

                        <p className="text-sm text-slate-400">
                          {stage.actual_hours}h / {stage.budgeted_hours}h
                        </p>
                      </div>

                      <div className="mt-3 h-2 rounded-full bg-white/10">
                        <div
                          className="h-2 rounded-full bg-violet-300"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
