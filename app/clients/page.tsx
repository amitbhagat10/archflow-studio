import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Mail,
  MapPin,
  Phone,
  Plus,
  UserRound,
} from "lucide-react";
import { createClient } from "@/app/actions/client-actions";
import { query } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Client = {
  id: string;
  client_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  project_count: number;
  total_fee_budget: number;
};

async function getClients(): Promise<Client[]> {
  const result = await query(`
    SELECT
      c.id,
      c.client_name,
      c.contact_name,
      c.email,
      c.phone,
      c.address,
      c.notes,
      COUNT(p.id)::int AS project_count,
      COALESCE(SUM(p.fee_budget), 0)::numeric AS total_fee_budget
    FROM clients c
    LEFT JOIN projects p ON p.client_id = c.id
    GROUP BY
      c.id,
      c.client_name,
      c.contact_name,
      c.email,
      c.phone,
      c.address,
      c.notes,
      c.created_at
    ORDER BY c.created_at DESC
  `);

  return result.rows.map((row) => ({
    id: String(row.id),
    client_name: String(row.client_name),
    contact_name: row.contact_name ? String(row.contact_name) : null,
    email: row.email ? String(row.email) : null,
    phone: row.phone ? String(row.phone) : null,
    address: row.address ? String(row.address) : null,
    notes: row.notes ? String(row.notes) : null,
    project_count: Number(row.project_count),
    total_fee_budget: Number(row.total_fee_budget),
  }));
}

export default async function ClientsPage() {
  await requireUser();

  const clients = await getClients();

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

            <h1 className="mt-4 text-4xl font-semibold text-white">Clients</h1>
            <p className="mt-2 text-slate-400">
              Manage client records, contacts and project value.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
            <p className="text-sm text-slate-400">Total Clients</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {clients.length}
            </p>
          </div>
        </div>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.6fr]">
          <form
            action={createClient}
            className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl"
          >
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-2xl bg-cyan-400/10 p-3 text-cyan-200">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">New Client</h2>
                <p className="text-sm text-slate-400">
                  Add an architecture client or organisation.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <input
                name="client_name"
                required
                placeholder="Client name"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60"
              />

              <input
                name="contact_name"
                placeholder="Contact person"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60"
              />

              <input
                name="email"
                type="email"
                placeholder="Email"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60"
              />

              <input
                name="phone"
                placeholder="Phone"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60"
              />

              <textarea
                name="address"
                rows={3}
                placeholder="Client address"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60"
              />

              <textarea
                name="notes"
                rows={4}
                placeholder="Notes"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60"
              />

              <button
                type="submit"
                className="w-full rounded-2xl bg-cyan-300 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-200"
              >
                Create Client
              </button>
            </div>
          </form>

          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl">
            <h2 className="text-xl font-semibold text-white">Client Register</h2>
            <p className="mt-1 text-sm text-slate-400">
              Client list connected to AWS Postgres.
            </p>

            <div className="mt-6 grid gap-4">
              {clients.map((client) => (
                <div
                  key={client.id}
                  className="rounded-2xl border border-white/10 bg-black/20 p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-white/10 p-3 text-cyan-300">
                          <Building2 className="h-5 w-5" />
                        </div>

                        <div>
                          <h3 className="text-lg font-semibold text-white">
                            {client.client_name}
                          </h3>
                          <p className="text-sm text-slate-500">
                            {client.project_count} project
                            {client.project_count === 1 ? "" : "s"} · $
                            {client.total_fee_budget.toLocaleString()} fee value
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 text-sm text-slate-400 md:grid-cols-2">
                        <p className="inline-flex items-center gap-2">
                          <UserRound className="h-4 w-4 text-slate-500" />
                          {client.contact_name ?? "No contact person"}
                        </p>

                        <p className="inline-flex items-center gap-2">
                          <Mail className="h-4 w-4 text-slate-500" />
                          {client.email ?? "No email"}
                        </p>

                        <p className="inline-flex items-center gap-2">
                          <Phone className="h-4 w-4 text-slate-500" />
                          {client.phone ?? "No phone"}
                        </p>

                        <p className="inline-flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-slate-500" />
                          {client.address ?? "No address"}
                        </p>
                      </div>

                      {client.notes && (
                        <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm text-slate-400">
                          {client.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {clients.length === 0 && (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-10 text-center text-slate-500">
                  No clients yet. Create the first client from the form.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
