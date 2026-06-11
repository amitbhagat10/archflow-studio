import Link from "next/link";
import {
  ArrowLeft,
  KeyRound,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { changePassword } from "@/app/actions/profile-actions";
import { requireUser } from "@/lib/auth";

type PageProps = {
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
};

function getErrorMessage(error?: string) {
  if (error === "missing") return "Please complete all password fields.";
  if (error === "short") return "New password must be at least 8 characters.";
  if (error === "mismatch") return "New password and confirm password do not match.";
  if (error === "current") return "Current password is incorrect.";
  if (error === "invalid") return "Unable to update password. Please contact support.";
  return null;
}

export default async function ProfilePage({ searchParams }: PageProps) {
  const user = await requireUser();
  const params = searchParams ? await searchParams : {};
  const errorMessage = getErrorMessage(params?.error);
  const success = params?.success === "password";

  return (
    <main className="min-h-screen bg-[#070A12] px-6 py-8 text-slate-100">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>

          <h1 className="mt-4 text-4xl font-semibold text-white">
            My Profile
          </h1>
          <p className="mt-2 text-slate-400">
            View your login details and change your password.
          </p>
        </div>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-2xl bg-cyan-400/10 p-3 text-cyan-200">
                <UserRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Login Account
                </h2>
                <p className="text-sm text-slate-400">
                  Your subscription login identity.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-sm text-slate-500">Name</p>
                <p className="mt-1 font-medium text-white">{user.full_name}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-sm text-slate-500">Email</p>
                <p className="mt-1 inline-flex items-center gap-2 font-medium text-white">
                  <Mail className="h-4 w-4 text-slate-500" />
                  {user.email}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-sm text-slate-500">Role</p>
                <p className="mt-1 inline-flex items-center gap-2 font-medium capitalize text-white">
                  <ShieldCheck className="h-4 w-4 text-slate-500" />
                  {user.role.replace("_", " ")}
                </p>
              </div>
            </div>
          </div>

          <form
            action={changePassword}
            className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl"
          >
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-2xl bg-violet-400/10 p-3 text-violet-200">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Change Password
                </h2>
                <p className="text-sm text-slate-400">
                  Update your temporary password after first login.
                </p>
              </div>
            </div>

            {errorMessage && (
              <div className="mb-5 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-200">
                {errorMessage}
              </div>
            )}

            {success && (
              <div className="mb-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                Password updated successfully.
              </div>
            )}

            <div className="space-y-4">
              <input
                name="current_password"
                type="password"
                required
                placeholder="Current password"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60"
              />

              <input
                name="new_password"
                type="password"
                required
                placeholder="New password"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60"
              />

              <input
                name="confirm_password"
                type="password"
                required
                placeholder="Confirm new password"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60"
              />

              <button
                type="submit"
                className="w-full rounded-2xl bg-violet-300 px-5 py-3 font-semibold text-slate-950 transition hover:bg-violet-200"
              >
                Update Password
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
