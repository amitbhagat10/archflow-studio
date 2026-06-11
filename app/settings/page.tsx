import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  CreditCard,
  LockKeyhole,
  Mail,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { updateWorkspace } from "@/app/actions/settings-actions";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Workspace = {
  id: string;
  name: string;
  plan_name: string;
  subscription_status: string;
  max_login_users: number;
  ai_enabled: boolean;
  trial_ends_at: string | null;
  created_at: string;
};

type AppUser = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
};

async function getWorkspace(): Promise<Workspace | null> {
  const result = await query(`
    SELECT
      id,
      name,
      plan_name,
      subscription_status,
      max_login_users,
      ai_enabled,
      trial_ends_at::text,
      created_at::text
    FROM workspaces
    ORDER BY created_at
    LIMIT 1
  `);

  const row = result.rows[0];

  if (!row) return null;

  return {
    id: String(row.id),
    name: String(row.name),
    plan_name: String(row.plan_name),
    subscription_status: String(row.subscription_status),
    max_login_users: Number(row.max_login_users),
    ai_enabled: Boolean(row.ai_enabled),
    trial_ends_at: row.trial_ends_at ? String(row.trial_ends_at) : null,
    created_at: String(row.created_at),
  };
}

async function getAppUsers(): Promise<AppUser[]> {
  const result = await query(`
    SELECT
      id,
      full_name,
      email,
      role,
      is_active,
      created_at::text
    FROM app_users
    ORDER BY is_active DESC, created_at DESC
  `);

  return result.rows.map((row) => ({
    id: String(row.id),
    full_name: String(row.full_name),
    email: String(row.email),
    role: String(row.role),
    is_active: Boolean(row.is_active),
    created_at: String(row.created_at),
  }));
}

function RoleBadge({ role }: { role: string }) {
  let style = "border-slate-400/20 bg-slate-500/15 text-slate-300";

  if (role === "admin") {
    style = "border-cyan-400/20 bg-cyan-500/15 text-cyan-300";
  }

  if (role === "director") {
    style = "border-violet-400/20 bg-violet-500/15 text-violet-300";
  }

  if (role === "project_manager") {
    style = "border-emerald-400/20 bg-emerald-500/15 text-emerald-300";
  }

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-medium capitalize ${style}`}>
      {role.replace("_", " ")}
    </span>
  );
}

function StatusBadge({ value }: { value: string }) {
  let style = "border-slate-400/20 bg-slate-500/15 text-slate-300";

  if (value === "active") {
    style = "border-emerald-400/20 bg-emerald-500/15 text-emerald-300";
  }

  if (value === "trial") {
    style = "border-amber-400/20 bg-amber-500/15 text-amber-300";
  }

  if (value === "cancelled" || value === "expired") {
    style = "border-rose-400/20 bg-rose-500/15 text-rose-300";
  }

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-medium capitalize ${style}`}>
      {value}
    </span>
  );
}

function InfoCard({
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

export default async function SettingsPage() {
  await requireRole(["admin", "director"]);

  const [workspace, users] = await Promise.all([
    getWorkspace(),
    getAppUsers(),
  ]);

  const activeUsers = users.filter((user) => user.is_active);
  const maxUsers = workspace?.max_login_users ?? 0;
  const usedPercent =
    maxUsers > 0 ? Math.min(100, Math.round((activeUsers.length / maxUsers) * 100)) : 0;
  const remainingSeats = Math.max(0, maxUsers - activeUsers.length);

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
              Settings
            </h1>
            <p className="mt-2 text-slate-400">
              Manage studio settings and view subscription-controlled login seats.
            </p>
          </div>

          <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-5">
            <p className="text-sm text-cyan-100/80">Subscription Control</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              Managed by Provider
            </p>
          </div>
        </div>

        <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoCard
            title="Plan"
            value={workspace?.plan_name ?? "Starter"}
            subtitle="Current subscription plan"
            icon={<CreditCard className="h-6 w-6" />}
          />

          <InfoCard
            title="Login Seats"
            value={`${activeUsers.length}/${maxUsers}`}
            subtitle={`${remainingSeats} seat${remainingSeats === 1 ? "" : "s"} remaining`}
            icon={<Users className="h-6 w-6" />}
          />

          <InfoCard
            title="AI Add-on"
            value={workspace?.ai_enabled ? "Enabled" : "Disabled"}
            subtitle="Can be enabled as paid upgrade"
            icon={<Sparkles className="h-6 w-6" />}
          />

          <InfoCard
            title="Status"
            value={workspace?.subscription_status ?? "trial"}
            subtitle={
              workspace?.trial_ends_at
                ? `Trial ends ${workspace.trial_ends_at}`
                : "Subscription status"
            }
            icon={<CheckCircle2 className="h-6 w-6" />}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.6fr]">
          <div className="space-y-6">
            <form
              action={updateWorkspace}
              className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl"
            >
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-2xl bg-cyan-400/10 p-3 text-cyan-200">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    Studio Workspace
                  </h2>
                  <p className="text-sm text-slate-400">
                    The client can update their studio display name.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <input
                  name="name"
                  required
                  defaultValue={workspace?.name ?? ""}
                  placeholder="Workspace name"
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60"
                />

                <button
                  type="submit"
                  className="w-full rounded-2xl bg-cyan-300 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-200"
                >
                  Save Workspace
                </button>
              </div>
            </form>

            <div className="rounded-3xl border border-amber-400/20 bg-amber-500/10 p-6 shadow-2xl">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-amber-300 p-3 text-slate-950">
                  <LockKeyhole className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-white">
                    Login Users Are Controlled
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-amber-100/80">
                    Staff and resources can be managed inside the app, but login
                    users are controlled by the subscription. To add more login
                    users, the client must contact support or upgrade their plan.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    Seat Usage
                  </h2>
                  <p className="text-sm text-slate-400">
                    Active login users compared to subscription limit.
                  </p>
                </div>

                <StatusBadge value={workspace?.subscription_status ?? "trial"} />
              </div>

              <div className="mb-2 flex justify-between text-sm text-slate-400">
                <span>{activeUsers.length} active users</span>
                <span>{maxUsers} allowed</span>
              </div>

              <div className="h-3 rounded-full bg-white/10">
                <div
                  className={`h-3 rounded-full ${
                    activeUsers.length >= maxUsers ? "bg-rose-300" : "bg-cyan-300"
                  }`}
                  style={{ width: `${usedPercent}%` }}
                />
              </div>

              <p className="mt-4 text-sm text-slate-500">
                For subscription billing, charge by active login seats, not by
                staff/resource records.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-2xl bg-white/10 p-3 text-white">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Login Users
                </h2>
                <p className="text-sm text-slate-400">
                  Read-only list. New login users are added by the software provider.
                </p>
              </div>
            </div>

            <div className="mb-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-400">
              To add or remove login access, contact support. This keeps billing
              controlled by subscription seats.
            </div>

            <div className="space-y-4">
              {users.map((user) => (
                <div
                  key={user.id}
                  className={`rounded-2xl border p-5 ${
                    user.is_active
                      ? "border-white/10 bg-black/20"
                      : "border-white/5 bg-black/10 opacity-60"
                  }`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <RoleBadge role={user.role} />

                        {user.is_active ? (
                          <span className="rounded-full border border-emerald-400/20 bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300">
                            active
                          </span>
                        ) : (
                          <span className="rounded-full border border-slate-400/20 bg-slate-500/15 px-3 py-1 text-xs font-medium text-slate-300">
                            inactive
                          </span>
                        )}
                      </div>

                      <h3 className="mt-3 text-lg font-semibold text-white">
                        {user.full_name}
                      </h3>

                      <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-400">
                        <span className="inline-flex items-center gap-2">
                          <Mail className="h-4 w-4 text-slate-500" />
                          {user.email}
                        </span>

                        <span className="inline-flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-slate-500" />
                          {user.role.replace("_", " ")}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Settings className="h-4 w-4 text-slate-500" />
                        Provider managed
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {users.length === 0 && (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-10 text-center text-slate-500">
                  No login users yet.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
