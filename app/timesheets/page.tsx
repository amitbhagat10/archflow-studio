import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  TimerReset,
  XCircle,
} from "lucide-react";
import {
  approveTimesheet,
  createTimesheet,
  rejectTimesheet,
} from "@/app/actions/timesheet-actions";
import { query } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Staff = {
  id: string;
  full_name: string;
};

type StageOption = {
  stage_id: string;
  project_name: string;
  project_code: string | null;
  stage_name: string;
};

type Timesheet = {
  id: string;
  work_date: string;
  full_name: string;
  project_name: string;
  project_code: string | null;
  stage_name: string | null;
  hours: number;
  is_billable: boolean;
  description: string | null;
  approval_status: string;
};

type Summary = {
  hours_this_week: number;
  pending_count: number;
  approved_count: number;
  billable_hours: number;
};

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

async function getStageOptions(): Promise<StageOption[]> {
  const result = await query(`
    SELECT
      ps.id AS stage_id,
      p.project_name,
      p.project_code,
      ps.stage_name
    FROM project_stages ps
    JOIN projects p ON p.id = ps.project_id
    WHERE p.status = 'active'
    ORDER BY p.project_name, ps.sort_order
  `);

  return result.rows.map((row) => ({
    stage_id: String(row.stage_id),
    project_name: String(row.project_name),
    project_code: row.project_code ? String(row.project_code) : null,
    stage_name: String(row.stage_name),
  }));
}

async function getTimesheets(): Promise<Timesheet[]> {
  const result = await query(`
    SELECT
      t.id,
      t.work_date::text,
      s.full_name,
      p.project_name,
      p.project_code,
      ps.stage_name,
      t.hours,
      t.is_billable,
      t.description,
      t.approval_status
    FROM timesheets t
    JOIN staff s ON s.id = t.staff_id
    JOIN projects p ON p.id = t.project_id
    LEFT JOIN project_stages ps ON ps.id = t.stage_id
    ORDER BY t.work_date DESC, t.created_at DESC
    LIMIT 50
  `);

  return result.rows.map((row) => ({
    id: String(row.id),
    work_date: String(row.work_date),
    full_name: String(row.full_name),
    project_name: String(row.project_name),
    project_code: row.project_code ? String(row.project_code) : null,
    stage_name: row.stage_name ? String(row.stage_name) : null,
    hours: Number(row.hours),
    is_billable: Boolean(row.is_billable),
    description: row.description ? String(row.description) : null,
    approval_status: String(row.approval_status),
  }));
}

async function getSummary(): Promise<Summary> {
  const result = await query(`
    SELECT
      COALESCE(SUM(hours) FILTER (
        WHERE work_date >= date_trunc('week', CURRENT_DATE)::date
      ), 0)::numeric AS hours_this_week,
      COUNT(*) FILTER (
        WHERE approval_status = 'submitted'
      )::int AS pending_count,
      COUNT(*) FILTER (
        WHERE approval_status = 'approved'
      )::int AS approved_count,
      COALESCE(SUM(hours) FILTER (
        WHERE is_billable = true
      ), 0)::numeric AS billable_hours
    FROM timesheets
  `);

  const row = result.rows[0];

  return {
    hours_this_week: Number(row.hours_this_week),
    pending_count: Number(row.pending_count),
    approved_count: Number(row.approved_count),
    billable_hours: Number(row.billable_hours),
  };
}

function StatusBadge({ status }: { status: string }) {
  let style = "border-slate-400/20 bg-slate-500/15 text-slate-300";

  if (status === "submitted") {
    style = "border-amber-400/20 bg-amber-500/15 text-amber-300";
  }

  if (status === "approved") {
    style = "border-emerald-400/20 bg-emerald-500/15 text-emerald-300";
  }

  if (status === "rejected") {
    style = "border-rose-400/20 bg-rose-500/15 text-rose-300";
  }

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${style}`}>
      {status}
    </span>
  );
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
  icon: React.ReactNode;
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

export default async function TimesheetsPage() {
  await requireUser();

  const [staff, stages, timesheets, summary] = await Promise.all([
    getStaff(),
    getStageOptions(),
    getTimesheets(),
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
            Timesheets
          </h1>
          <p className="mt-2 text-slate-400">
            Capture staff time against architecture projects and project stages.
          </p>
        </div>

        <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Hours This Week"
            value={`${summary.hours_this_week}h`}
            subtitle="Logged from Monday"
            icon={<Clock3 className="h-6 w-6" />}
          />
          <SummaryCard
            title="Pending"
            value={summary.pending_count}
            subtitle="Waiting for approval"
            icon={<TimerReset className="h-6 w-6" />}
          />
          <SummaryCard
            title="Approved"
            value={summary.approved_count}
            subtitle="Approved records"
            icon={<CheckCircle2 className="h-6 w-6" />}
          />
          <SummaryCard
            title="Billable Hours"
            value={`${summary.billable_hours}h`}
            subtitle="Total billable time"
            icon={<FileText className="h-6 w-6" />}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.6fr]">
          <form
            action={createTimesheet}
            className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl"
          >
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-2xl bg-cyan-400/10 p-3 text-cyan-200">
                <Clock3 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Log Time</h2>
                <p className="text-sm text-slate-400">
                  Submit time against a project stage.
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
                name="stage_id"
                required
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300/60"
              >
                <option value="">Select project stage</option>
                {stages.map((stage) => (
                  <option key={stage.stage_id} value={stage.stage_id}>
                    {stage.project_code
                      ? `${stage.project_code} - ${stage.project_name} / ${stage.stage_name}`
                      : `${stage.project_name} / ${stage.stage_name}`}
                  </option>
                ))}
              </select>

              <div className="grid gap-4 md:grid-cols-2">
                <input
                  name="work_date"
                  type="date"
                  required
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300/60"
                />

                <input
                  name="hours"
                  type="number"
                  step="0.25"
                  min="0.25"
                  required
                  placeholder="Hours"
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60"
                />
              </div>

              <select
                name="is_billable"
                defaultValue="true"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300/60"
              >
                <option value="true">Billable</option>
                <option value="false">Non-billable</option>
              </select>

              <textarea
                name="description"
                rows={4}
                placeholder="Work description, e.g. Concept design revisions and client markups"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60"
              />

              <button
                type="submit"
                className="w-full rounded-2xl bg-cyan-300 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-200"
              >
                Submit Timesheet
              </button>
            </div>
          </form>

          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl">
            <h2 className="text-xl font-semibold text-white">
              Timesheet Register
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Latest submitted project time.
            </p>

            <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/10 text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Staff</th>
                    <th className="px-4 py-3">Project / Stage</th>
                    <th className="px-4 py-3">Hours</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/10">
                  {timesheets.map((entry) => (
                    <tr key={entry.id} className="hover:bg-white/[0.04]">
                      <td className="px-4 py-4 text-slate-300">
                        <span className="inline-flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-slate-500" />
                          {entry.work_date}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-white">
                        {entry.full_name}
                      </td>

                      <td className="px-4 py-4">
                        <p className="text-white">
                          {entry.project_code
                            ? `${entry.project_code} - ${entry.project_name}`
                            : entry.project_name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {entry.stage_name ?? "-"} ·{" "}
                          {entry.is_billable ? "Billable" : "Non-billable"}
                        </p>
                        {entry.description && (
                          <p className="mt-1 max-w-md text-xs text-slate-500">
                            {entry.description}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-4 text-slate-300">
                        {entry.hours}h
                      </td>

                      <td className="px-4 py-4">
                        <StatusBadge status={entry.approval_status} />
                      </td>

                      <td className="px-4 py-4">
                        {entry.approval_status === "submitted" ? (
                          <div className="flex gap-2">
                            <form action={approveTimesheet}>
                              <input
                                type="hidden"
                                name="timesheet_id"
                                value={entry.id}
                              />
                              <button
                                type="submit"
                                className="rounded-xl bg-emerald-300 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-200"
                              >
                                Approve
                              </button>
                            </form>

                            <form action={rejectTimesheet}>
                              <input
                                type="hidden"
                                name="timesheet_id"
                                value={entry.id}
                              />
                              <button
                                type="submit"
                                className="rounded-xl bg-rose-300 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-rose-200"
                              >
                                Reject
                              </button>
                            </form>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                            {entry.approval_status === "approved" ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                            ) : (
                              <XCircle className="h-4 w-4 text-rose-300" />
                            )}
                            Closed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}

                  {timesheets.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                        No timesheets yet. Submit the first timesheet from the form.
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
