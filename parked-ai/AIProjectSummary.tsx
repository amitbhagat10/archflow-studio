"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";

export default function AIProjectSummary({ projectId }: { projectId: string }) {
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generateSummary() {
    try {
      setLoading(true);
      setError("");
      setSummary("");

      const response = await fetch(`/api/projects/${projectId}/ai-summary`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to generate AI summary");
      }

      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mb-8 rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-6 shadow-2xl">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-cyan-300 p-3 text-slate-950">
              <Sparkles className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-xl font-semibold text-white">
                AI Project Summary
              </h2>
              <p className="text-sm text-cyan-100/70">
                Generate a director-ready summary using project stages, timesheets and tasks.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={generateSummary}
          disabled={loading}
          className="rounded-2xl bg-cyan-300 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Generating..." : "Generate AI Summary"}
        </button>
      </div>

      {error && (
        <div className="mt-5 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error}
        </div>
      )}

      {summary && (
        <div className="mt-5 whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/30 p-5 text-sm leading-7 text-slate-200">
          {summary}
        </div>
      )}
    </section>
  );
}
