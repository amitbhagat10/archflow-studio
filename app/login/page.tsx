import { LockKeyhole, Sparkles } from "lucide-react";
import { loginAction } from "@/app/actions/auth-actions";

type PageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

function getErrorMessage(error?: string) {
  if (error === "missing") return "Please enter your email and password.";
  if (error === "subscription") return "Subscription is not active. Please contact support.";
  if (error === "trial_expired") return "Trial has expired. Please contact support to continue.";
  if (error === "workspace") return "Workspace is not configured. Please contact support.";
  if (error === "invalid") return "Invalid email or password.";
  return null;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const errorMessage = getErrorMessage(params?.error);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#070A12] px-6 py-10 text-slate-100">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.06] p-8 shadow-2xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="rounded-2xl bg-cyan-300 p-3 text-slate-950">
            <Sparkles className="h-6 w-6" />
          </div>

          <div>
            <h1 className="text-2xl font-semibold text-white">
              ArchFlow Studio
            </h1>
            <p className="text-sm text-slate-400">
              Sign in to your project studio
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-5 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-200">
            {errorMessage}
          </div>
        )}

        <form action={loginAction} className="space-y-4">
          <input
            name="email"
            type="email"
            required
            placeholder="Email"
            className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60"
          />

          <input
            name="password"
            type="password"
            required
            placeholder="Password"
            className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60"
          />

          <button
            type="submit"
            className="w-full rounded-2xl bg-cyan-300 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-200"
          >
            Sign In
          </button>
        </form>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-400">
          <div className="flex items-start gap-3">
            <LockKeyhole className="mt-0.5 h-4 w-4 text-slate-500" />
            <p>
              Login access is controlled by your subscription. Contact support if
              you need additional users or password assistance.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
