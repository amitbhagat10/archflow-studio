import Link from "next/link";
import { LockKeyhole } from "lucide-react";

export default function NoAccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#070A12] px-6 py-10 text-slate-100">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/[0.06] p-8 text-center shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-500/10 text-rose-300">
          <LockKeyhole className="h-8 w-8" />
        </div>

        <h1 className="mt-6 text-3xl font-semibold text-white">
          No Access
        </h1>

        <p className="mt-3 text-slate-400">
          Your login role does not have permission to open this page.
        </p>

        <Link
          href="/"
          className="mt-6 inline-flex rounded-2xl bg-cyan-300 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-200"
        >
          Back to Dashboard
        </Link>
      </div>
    </main>
  );
}
