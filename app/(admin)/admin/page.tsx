import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export default async function AdminDashboardPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const [
    pendingCount,
    openRequirementsCount,
    activeBidCount,
    totalUserCount,
    pendingUsers,
    openRequirements,
    recentAudit,
    awardedCount,
  ] = await Promise.all([
    db.user.count({ where: { role: { not: "ADMIN" }, status: "PENDING" } }),
    db.requirement.count({ where: { status: "OPEN" } }),
    db.bid.count({ where: { status: { notIn: ["WITHDRAWN", "NOT_SELECTED"] } } }),
    db.user.count({ where: { role: { not: "ADMIN" } } }),
    db.user.findMany({
      where: { role: { not: "ADMIN" }, status: "PENDING" },
      include: { builderProfile: true, vendorProfile: true },
      orderBy: { createdAt: "asc" },
      take: 5,
    }),
    db.requirement.findMany({
      where: { status: "OPEN" },
      select: {
        id: true,
        anonCode: true,
        createdAt: true,
        category: { select: { name: true } },
        project: { select: { name: true } },
        _count: { select: { bids: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 7,
    }),
    db.auditLog.findMany({
      select: {
        id: true,
        action: true,
        entity: true,
        ts: true,
        actor: { select: { phone: true, role: true } },
      },
      orderBy: { ts: "desc" },
      take: 8,
    }),
    db.requirement.count({ where: { status: "AWARDED" } }),
  ]);

  const stats = [
    {
      label: "Pending Verifications",
      value: pendingCount,
      href: "/admin/users?status=PENDING",
      urgent: pendingCount > 0,
      iconBg: pendingCount > 0 ? "bg-amber-100 text-amber-600" : "bg-zinc-100 text-zinc-500",
      valueCls: pendingCount > 0 ? "text-amber-700 dark:text-amber-400" : undefined,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <polyline points="16 11 18 13 22 9" />
        </svg>
      ),
    },
    {
      label: "Open Requirements",
      value: openRequirementsCount,
      href: "/admin/requirements",
      urgent: false,
      iconBg: "bg-blue-100 text-blue-600",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
          <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
          <path d="M7 7h.01" />
        </svg>
      ),
    },
    {
      label: "Active Bids",
      value: activeBidCount,
      href: "/admin/requirements",
      urgent: false,
      iconBg: "bg-green-100 text-green-600",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
          <path d="m14.5 12.5-8 8a2.119 2.119 0 0 1-3-3l8-8" />
          <path d="m16 16 6-6" />
          <path d="m8 8 6-6" />
          <path d="m9 7 8 8" />
          <path d="m21 11-8-8" />
        </svg>
      ),
    },
    {
      label: "Registered Users",
      value: totalUserCount,
      href: "/admin/users",
      urgent: false,
      iconBg: "bg-purple-100 text-purple-600",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-8 p-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {pendingCount > 0
              ? `${pendingCount} verification${pendingCount !== 1 ? "s" : ""} need your attention.`
              : "Everything's up to date."}
          </p>
        </div>
        {awardedCount > 0 && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-center dark:border-green-900/40 dark:bg-green-950/20">
            <p className="text-xs text-green-600 dark:text-green-400">Awarded</p>
            <p className="text-xl font-bold text-green-700 dark:text-green-300">{awardedCount}</p>
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="group relative flex flex-col gap-4 overflow-hidden rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
          >
            <div className="flex items-start justify-between">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.iconBg}`}>
                {stat.icon}
              </div>
              {stat.urgent && (
                <span className="flex h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-amber-100 dark:ring-amber-900/40" />
              )}
            </div>
            <div>
              <p className={`text-3xl font-bold tracking-tight ${stat.valueCls ?? "text-zinc-900 dark:text-zinc-100"}`}>
                {stat.value}
              </p>
              <p className="mt-0.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                {stat.label}
              </p>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-0.5 scale-x-0 bg-brand-accent transition-transform group-hover:scale-x-100 origin-left" />
          </Link>
        ))}
      </div>

      {/* Main grid: attention items + recent activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Left column (3/5) */}
        <div className="flex flex-col gap-6 lg:col-span-3">

          {/* Pending verifications */}
          {pendingCount > 0 && (
            <Section
              title="Awaiting Verification"
              badge={`${pendingCount} pending`}
              badgeCls="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
              href="/admin/users?status=PENDING"
              linkLabel="View all"
            >
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {pendingUsers.map((user) => {
                  const profile = user.role === "BUILDER" ? user.builderProfile : user.vendorProfile;
                  return (
                    <li key={user.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            {profile?.name ?? "Unnamed"}
                          </span>
                          <span
                            className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                              user.role === "BUILDER"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                                : "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                            }`}
                          >
                            {user.role}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                          {profile?.company ?? "—"} · {user.phone}
                        </p>
                      </div>
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="shrink-0 rounded-lg bg-brand-accent px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-accent-h"
                      >
                        Review
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Section>
          )}

          {/* Open requirements */}
          <Section
            title="Open Requirements"
            badge={openRequirementsCount > 0 ? `${openRequirementsCount} open` : undefined}
            badgeCls="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
            href="/admin/requirements"
            linkLabel="View all"
          >
            {openRequirements.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-sm text-zinc-400 dark:text-zinc-500">No open requirements.</p>
              </div>
            ) : (
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {openRequirements.map((req) => (
                  <li key={req.id}>
                    <Link
                      href={`/admin/requirements/${req.id}`}
                      className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
                            {req.anonCode}
                          </span>
                          <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            {req.category.name}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                          {req.project.name}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            req._count.bids > 0
                              ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                              : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                          }`}
                        >
                          {req._count.bids} bid{req._count.bids !== 1 ? "s" : ""}
                        </span>
                        <span className="text-zinc-300 dark:text-zinc-600">›</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        {/* Right column (2/5): recent activity */}
        <div className="lg:col-span-2">
          <Section
            title="Recent Activity"
            href="/admin/audit"
            linkLabel="Full log"
          >
            {recentAudit.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-sm text-zinc-400 dark:text-zinc-500">No activity yet.</p>
              </div>
            ) : (
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {recentAudit.map((log) => (
                  <li key={log.id} className="px-5 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-block rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        {log.action}
                      </span>
                      <time className="shrink-0 text-[10px] tabular-nums text-zinc-400 dark:text-zinc-500">
                        {new Date(log.ts).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="capitalize">{log.entity.toLowerCase()}</span>
                      {log.actor ? ` · ${log.actor.phone}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* Quick navigation shortcuts */}
          <div className="mt-6">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              Quick Actions
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { href: "/admin/users?status=PENDING", label: "Verify Users" },
                { href: "/admin/forms", label: "Manage Forms" },
                { href: "/admin/requirements", label: "Review Bids" },
                { href: "/admin/audit", label: "Audit Log" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Section card wrapper ─────────────────────────────────────── */
function Section({
  title,
  badge,
  badgeCls,
  href,
  linkLabel,
  children,
}: {
  title: string;
  badge?: string;
  badgeCls?: string;
  href: string;
  linkLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      {/* Card header */}
      <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
          {badge && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${badgeCls}`}>
              {badge}
            </span>
          )}
        </div>
        <Link
          href={href}
          className="text-xs font-medium text-brand-accent transition-colors hover:text-brand-accent-h"
        >
          {linkLabel} →
        </Link>
      </div>
      {children}
    </div>
  );
}
