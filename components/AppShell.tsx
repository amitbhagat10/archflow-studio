"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Briefcase,
  Building2,
  ClipboardList,
  Clock3,
  LayoutDashboard,
  LogOut,
  Settings,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";

type UserRole = "admin" | "director" | "project_manager" | "staff";

type CurrentUser = {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
};

const navItems = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    roles: ["admin", "director", "project_manager", "staff"],
  },
  {
    label: "Projects",
    href: "/projects",
    icon: Briefcase,
    roles: ["admin", "director", "project_manager"],
  },
  {
    label: "Clients",
    href: "/clients",
    icon: Building2,
    roles: ["admin", "director", "project_manager"],
  },
  {
    label: "Resources",
    href: "/resources",
    icon: Users,
    roles: ["admin", "director", "project_manager"],
  },
  {
    label: "Timesheets",
    href: "/timesheets",
    icon: Clock3,
    roles: ["admin", "director", "project_manager", "staff"],
  },
  {
    label: "Tasks",
    href: "/tasks",
    icon: ClipboardList,
    roles: ["admin", "director", "project_manager", "staff"],
  },
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
    roles: ["admin", "director", "project_manager"],
  },
  {
    label: "Risk Centre",
    href: "/risks",
    icon: AlertTriangle,
    roles: ["admin", "director", "project_manager"],
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    roles: ["admin", "director"],
  },
  {
    label: "Profile",
    href: "/profile",
    icon: UserRound,
    roles: ["admin", "director", "project_manager", "staff"],
  },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    if (pathname === "/login") return;

    fetch("/api/me")
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (data?.ok && data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {
        setUser(null);
      });
  }, [pathname]);

  const visibleNavItems = useMemo(() => {
    if (!user) {
      return navItems.filter((item) => item.href === "/");
    }

    return navItems.filter((item) => item.roles.includes(user.role));
  }, [user]);

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#070A12] text-slate-100">
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-72 flex-col border-r border-white/10 bg-[#080B14]/95 p-5 backdrop-blur-xl lg:flex">
        <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.06] p-4">
          <div className="rounded-2xl bg-cyan-300 p-3 text-slate-950">
            <Sparkles className="h-6 w-6" />
          </div>

          <div>
            <p className="text-lg font-semibold text-white">ArchFlow Studio</p>
            <p className="text-xs text-slate-500">Studio command centre</p>
          </div>
        </div>

        {user && (
          <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-sm font-medium text-white">{user.full_name}</p>
            <p className="mt-1 truncate text-xs text-slate-500">{user.email}</p>
            <p className="mt-3 inline-flex rounded-full border border-cyan-400/20 bg-cyan-500/15 px-3 py-1 text-xs font-medium capitalize text-cyan-300">
              {user.role.replace("_", " ")}
            </p>
          </div>
        )}

        <nav className="mt-6 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                  isActive
                    ? "bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-950/30"
                    : "text-slate-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 shrink-0 border-t border-white/10 pt-4">
          <Link
            href="/api/logout"
            className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Link>
        </div>
      </aside>

      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#080B14]/95 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Link href="/" className="flex items-center gap-3">
          <div className="rounded-2xl bg-cyan-300 p-2 text-slate-950">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-white">ArchFlow Studio</p>
            <p className="text-xs text-slate-500">
              {user
                ? `${user.full_name} · ${user.role.replace("_", " ")}`
                : "Architecture studio"}
            </p>
          </div>
        </Link>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-medium ${
                  isActive
                    ? "bg-cyan-300 text-slate-950"
                    : "bg-white/10 text-slate-300"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </header>

      <div className="lg:pl-72">{children}</div>
    </div>
  );
}
